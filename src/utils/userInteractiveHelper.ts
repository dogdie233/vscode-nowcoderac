import * as vscode from 'vscode';
import { NowcoderCompiler, COMPILER_CONFIG, Problem, SubmissionStatus } from "../models/models";
import { ContestSpaceManager } from '../services/contestSpaceManager';
import { nowcoderService } from '../services/nowcoderService';

export class UserInteractiveHelper {
    static async askCompiler() : Promise<NowcoderCompiler | null> {
        const compilerOptions = Object.entries(COMPILER_CONFIG).map(([key, value]) => {
            return { 
                label: value.name, 
                value: key 
            };
        });
        
        const selectedCompiler = await vscode.window.showQuickPick(
            compilerOptions,
            { placeHolder: '请选择编译器' }
        );

        return selectedCompiler ? selectedCompiler.value as NowcoderCompiler : null;
    }

    /**
     * 显示判题进度
     * @param submissionId 提交ID
     * @param problem 题目
     * @param onStatusUpdated 判题状态更新时的回调函数
     */
    static async showJudgementProgress(
        submissionId: number, 
        problem: Problem,
        onStatusUpdated?: (status: SubmissionStatus) => any
    ): Promise<void> {
        problem.extra = problem.extra ?? await ContestSpaceManager.getInstance().getContestService()?.getProblemExtra(problem.info.index, false);
        if (!problem.extra) {
            throw new Error(`获取题目"${problem.info.index}"详情失败`);
        }
        
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `判题中: ${problem.info.index} - ${problem.info.title}`,
            cancellable: false
        }, async (progress) => {
            let isComplete = false;
            let count = 0;

            while (!isComplete && count < 60) {
                // 每秒查询一次，最多60秒
                await new Promise(resolve => setTimeout(resolve, 1000));
                count++;

                progress.report({ message: `${count}秒... 检查判题结果中` });

                const statusResult = await nowcoderService.getSubmissionStatus(
                    submissionId,
                    problem.extra!.tagId.toString(),
                    problem.extra!.subTagId
                );

                if (!statusResult.success) {
                    vscode.window.showErrorMessage(`获取判题状态失败: ${statusResult.error}`);
                    continue;
                }

                const status = statusResult.data!;
                if (status.status === 0) { // 0表示"等待判题"
                    continue;
                }

                isComplete = true;
                if (status.status === 5) { // 5表示"答案正确"
                    vscode.window.showInformationMessage(`判题成功: ${status.judgeReplyDesc}`);
                } else {
                    vscode.window.showWarningMessage(`提交结果: ${status.judgeReplyDesc}\n${status.desc}`);

                    // 如果是编译错误，显示错误消息
                    if (status.status === 12) {
                        vscode.window.showErrorMessage(`编译错误: ${status.memo}`);
                    }
                }

                // 触发回调函数
                if (onStatusUpdated) {
                    const result = onStatusUpdated(status);
                    if (result instanceof Promise) {
                        await result;
                    }
                }

                return true;
            }

            if (!isComplete) {
                vscode.window.showWarningMessage('获取判题结果超时，请前往牛客查看结果');
            }

            return true;
        });
    }
}