import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { nowcoderService } from './nowcoderService';
import { Problem, SubmissionStatus, ProgrammingLanguage, ProblemInfo, ProblemExtra, SubmissionListItem, SubmissionList } from '../models/models';
import { ContestConfigurationService } from './contestConfigurationService';

/**
 * 管理NowCoder比赛、题目和提交
 */
export class ContestManager {
    private readonly _onProblemsUpdated = new vscode.EventEmitter<Problem[] | undefined>();
    private readonly _onSubmissionStatusChanged = new vscode.EventEmitter<SubmissionStatus>();
    private readonly _onSubmissionsUpdated = new vscode.EventEmitter<SubmissionListItem[] | undefined>();

    // 公开事件
    readonly onProblemsUpdated = this._onProblemsUpdated.event;
    readonly onSubmissionStatusChanged = this._onSubmissionStatusChanged.event;
    readonly onSubmissionsUpdated = this._onSubmissionsUpdated.event;

    private configService: ContestConfigurationService;
    private submissionsCache: SubmissionListItem[] | undefined = [];

    constructor(private context: vscode.ExtensionContext) {
        this.configService = new ContestConfigurationService();

        // 监听编辑器变化
        vscode.window.onDidChangeActiveTextEditor(this.handleActiveEditorChange, this);

        // 初始化获取当前编辑器
        if (vscode.window.activeTextEditor) {
            this.handleActiveEditorChange(vscode.window.activeTextEditor);
        }
    }

    /**
     * 处理活动编辑器变化
     * @param editor 活动编辑器
     */
    private async handleActiveEditorChange(editor: vscode.TextEditor | undefined): Promise<void> {
        if (!editor) {
            return;
        }

        // 查找配置文件
        const documentDir = path.dirname(editor.document.uri.fsPath);
        const potentialConfigPath = path.join(documentDir, 'nowcoderac.json');

        // 已经是当前配置文件了
        if (this.configService.getConfigPath() === potentialConfigPath) {
            return;
        }
        const config = await this.configService.load(potentialConfigPath);

        // 检查配置文件是否存在
        if (config) {
            this._onProblemsUpdated.fire(config.problems || undefined); // 更新题目列表
            this._onSubmissionsUpdated.fire([]);  // 之后获取提交记录
            if (!config.problems) {
                await this.getProblems(true);  // 如果没有题目列表，则刷新
            }
        } else {
            await this.configService.load(null);
            this._onProblemsUpdated.fire(undefined); // 清空题目列表
            this._onSubmissionsUpdated.fire(undefined);  // 清空提交记录
        }
    }

    /**
     * 获取题目列表，如果没有缓存则刷新（可能不包含extra信息）
     * @param noCache 是否不使用缓存
     * @returns 题目列表，如果失败则是null
     */
    async getProblems(noCache: boolean = false) : Promise<Problem[] | null> {
        const config = this.configService.getConfig();
        if (!config || !config.contestId) {
            return null;
        }

        if (noCache || !config.problems || config.problems.length === 0) {
            // 如果没有题目缓存，尝试刷新题目列表
            const problemListResult = await nowcoderService.getProblemList(config.contestId);
            if (!problemListResult.success) {
                vscode.window.showErrorMessage(`获取题目列表失败: ${problemListResult.error}`);
                return null;
            }
            const problemList = problemListResult.data!;

            config.problems = problemList.data.map((info: ProblemInfo) => {
                const problem: Problem = {
                    info: info,
                    extra: config.problems?.find(p => p.info.index === info.index)?.extra
                };
                return problem;
            });
            await this.configService.save();
            this._onProblemsUpdated.fire(config.problems);
        }
        
        return config.problems;
    }

    /**
     * 获取题目的Extra信息
     * @param index 题目索引
     * @param noCache 是否不使用缓存
     * @returns 题目详情，如果失败则是null
     */
    async getProblemExtra(index: string, noCache: boolean = false) : Promise<ProblemExtra | null> {
        const config = this.configService.getConfig();
        if (!config || !config.contestId) {
            vscode.window.showInformationMessage('当前不在比赛环境中，创建比赛空间先');
            return null;
        }

        const problem = config.problems?.find(p => p.info.index === index);
        if (!problem) {
            vscode.window.showErrorMessage(`题目"${index}"不存在`);
            return null;
        }
        if (problem.extra && !noCache) {
            return problem.extra;
        }

        const extraResult = await nowcoderService.getProblemExtra(config.contestId, index);
        if (!extraResult.success) {
            vscode.window.showErrorMessage(`获取题目"${index}"详情失败：${extraResult.error}`);
            return null;
        }

        problem.extra = extraResult.data!;
        await this.configService.save();
        this._onProblemsUpdated.fire(config.problems!);
        return problem.extra;
    }

    /**
     * 打开题目
     * @param problem 题目
     */
    async openProblem(problem: Problem): Promise<void> {
        // 获取详情
        if (!problem.extra) {
            const extra = await this.getProblemExtra(problem.info.index);
            if (!extra) {
                vscode.window.showErrorMessage(`打开题目"${problem.info.index}"失败`);
                return;
            }
            problem.extra = extra;
            await this.configService.save();
            this._onProblemsUpdated.fire(this.configService.getConfig()?.problems || []);
        }
        
        // 创建Markdown文件
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('请先打开一个工作区');
            return;
        }

        const configPath = this.configService.getConfigPath();
        if (!configPath) {
            console.error('配置文件路径未设置');
            return;
        }

        const contestFolderPath = path.dirname(configPath);

        // 创建MD文件
        const fileName = `${problem.info.index}.md`;
        const filePath = path.join(contestFolderPath, fileName);

        // 生成Markdown内容
        let content = `# ${problem.info.index}. ${problem.info.title}\n\n`;
        content += problem.extra.content;

        // 添加样例
        if (problem.extra.examples && problem.extra.examples.length > 0) {
            content += '## 样例\n\n';

            problem.extra.examples.forEach((example, index) => {
                content += `### 样例 ${index + 1}\n`;
                content += `**输入**:\n\`\`\`\n${example.input}\n\`\`\`\n\n`;
                content += `**输出**:\n\`\`\`\n${example.output}\n\`\`\`\n\n`;
                if (example.tips) {
                    content += `**说明**:  \n\n${example.tips}\n\n`;
                }
            });
        }

        // 写入文件
        fs.writeFileSync(filePath, content);

        // 打开文件
        const uri = vscode.Uri.file(filePath);
        const doc = await vscode.workspace.openTextDocument(uri);

        // 打开预览
        await vscode.commands.executeCommand('markdown.showPreview', doc.uri);
    }

    /**
     * 提交解答
     * @param problem 题目
     * @param language 编程语言
     */
    async submitSolution(problem: Problem, language: ProgrammingLanguage): Promise<boolean> {
        if (!problem.extra) {
            const extra = await this.getProblemExtra(problem.info.index);
            if (!extra) {
                vscode.window.showErrorMessage(`获取题目"${problem.info.index}"详情失败`);
                return false;
            }
            problem.extra = extra;
            await this.configService.save();
            this._onProblemsUpdated.fire(this.configService.getConfig()?.problems || []);
        }

        // 获取当前编辑器中的代码
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('请先打开代码文件');
            return false;
        }

        const code = editor.document.getText();
        if (!code.trim()) {
            vscode.window.showErrorMessage('代码不能为空');
            return false;
        }

        try {
            // 提交代码
            const responseResult = await nowcoderService.submitSolution(
                problem.extra.questionId,
                problem.extra.tagId,
                problem.extra.subTagId,
                problem.extra.doneQuestionId,
                code,
                language
            );

            if (!responseResult.success) {
                vscode.window.showErrorMessage(`提交失败：${responseResult.error}`);
                return false;
            }

            const response = responseResult.data!;
            if (response.code !== 0) {
                vscode.window.showErrorMessage(`提交失败: ${response.msg}`);
                return false;
            }

            const submissionId = responseResult.data!.data;
            const extra = problem.extra;
            // 轮询判题结果
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
                        extra.tagId.toString(),
                        extra.subTagId
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

                    // 提交完成后，触发提交状态变更事件以刷新提交列表
                    this._onSubmissionStatusChanged.fire(status);
                    
                    // 不使用缓存获取提交记录，然后刷新
                    await this.getSubmissions(true);

                    return true;
                }

                if (!isComplete) {
                    vscode.window.showWarningMessage('获取判题结果超时，请前往牛客查看结果');
                }

                return true;
            });

            return true;
        } catch (error) {
            console.error('Failed to submit solution:', error);
            vscode.window.showErrorMessage(`提交失败: ${(error as Error).message}`);
            return false;
        }
    }

    /**
     * 获取提交记录
     * @param [noCache=false] 是否不使用缓存
     * @returns 提交记录列表，如果失败则是null
     */
    async getSubmissions(noCache: boolean = false): Promise<SubmissionListItem[] | null> {
        const config = this.configService.getConfig();
        if (!config || !config.contestId) {
            return null;
        }

        if (noCache || !this.submissionsCache) {
            const submissionsResult = await nowcoderService.getSubmissions(config.contestId);
            if (!submissionsResult.success) {
                vscode.window.showErrorMessage(`获取提交记录失败: ${submissionsResult.error}`);
                return null;
            }
            this.submissionsCache = submissionsResult.data!.data;
            this._onSubmissionsUpdated.fire(this.submissionsCache);
        }

        return this.submissionsCache;
    }
}

// 全局单例
let contestManagerInstance: ContestManager | undefined;

export function getContestManager(context: vscode.ExtensionContext): ContestManager {
    if (!contestManagerInstance) {
        contestManagerInstance = new ContestManager(context);
    }
    return contestManagerInstance;
}
