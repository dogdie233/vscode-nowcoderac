import * as vscode from 'vscode';
import { nowcoderService } from './nowcoderService';
import { Problem, SubmissionListItem, SubmissionListResponse } from '../models/models';
import { ContestConfigurationService } from './ContestConfigurationService';
import { httpClient } from './httpClient';

/**
 * 负责从NowCoder API获取比赛相关的数据，如题目列表、题目详情和提交记录。
 */
export class ContestDataManager {
    constructor(private configService: ContestConfigurationService) { }

    /**
     * 获取指定比赛ID的所有题目。
     * @param contestId 比赛ID。
     * @returns 题目列表。
     */
    async fetchAllProblems(contestId: number): Promise<Problem[]> {
        try {
            const response = await nowcoderService.getProblemList(contestId);
            if (response.code === 0 && response.data && response.data.data) {
                const problemInfos = response.data.data;
                const problems: Problem[] = [];
                for (const problemInfo of problemInfos) {
                    const problemExtra = await nowcoderService.getProblemExtra(contestId, problemInfo.index);
                    if (problemExtra) {
                        problems.push({
                            info: problemInfo,
                            extra: problemExtra,
                        });
                    }
                }
                return problems;
            } else {
                vscode.window.showErrorMessage(`获取题目列表失败: ${response.msg}`);
                return [];
            }
        } catch (error) {
            console.error('Failed to refresh problems:', error);
            vscode.window.showErrorMessage(`获取题目列表失败: ${(error as Error).message}`);
            return [];
        }
    }

    /**
     * 获取指定比赛ID和题目索引的题目详情。
     * @param contestId 比赛ID。
     * @param problemIndex 题目索引。
     * @returns 题目详情，如果获取失败则返回null。
     */
    async getProblemDetail(contestId: number, problemIndex: string): Promise<Problem | null> {
        try {
            const problemList = await nowcoderService.getProblemList(contestId);
            if (!problemList || problemList.code !== 0) {
                vscode.window.showErrorMessage(`获取题目"${problemIndex}"详情失败`);
                return null;
            }

            const problemInfoIndex = problemList.data.data.findIndex(p => p.info.index === problemIndex);
            if (problemInfoIndex === -1) {
                vscode.window.showErrorMessage(`题目"${problemIndex}"不存在`);
                return null;
            }

            const problemInfo = problemList.data.data[problemInfoIndex];

            const problemExtra = await nowcoderService.getProblemExtra(contestId, problemIndex);
            if (!problemExtra) {
                vscode.window.showErrorMessage(`获取题目"${problemIndex}"详情失败`);
                return null;
            }

            const problem: Problem = {
                info: problemInfo,
                extra: problemExtra,
            };

            return problem;
        } catch (error) {
            console.error(`Failed to get problem detail for ${problemIndex}:`, error);
            vscode.window.showErrorMessage(`获取题目"${problemIndex}"详情失败: ${(error as Error).message}`);
            return null;
        }
    }

    /**
     * 获取指定比赛ID的提交记录。
     * @param contestId 比赛ID。
     * @returns 提交记录列表。
     */
    async getSubmissions(contestId: number): Promise<SubmissionListItem[]> {
        try {
            const url = `https://ac.nowcoder.com/acm-heavy/acm/contest/status-list?id=${contestId}&pageSize=50&onlyMyStatusFilter=true`;
            const response = await httpClient.get<SubmissionListResponse>(url);

            if (response && response.code === 0 && response.data && response.data.data) {
                return response.data.data;
            } else {
                console.error('Failed to get submissions:', response?.msg);
                vscode.window.showErrorMessage(`获取提交记录失败: ${response?.msg}`);
                return [];
            }
        } catch (error) {
            console.error('Failed to get submissions:', error);
            vscode.window.showErrorMessage(`获取提交记录失败: ${(error as Error).message}`);
            return [];
        }
    }
}
