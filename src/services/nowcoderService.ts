import { httpClient } from './httpClient';
import { HtmlParser } from '../utils/htmlParser';
import { SubmissionResponse, SubmissionStatus, NowcoderCompiler, COMPILER_CONFIG, ProblemExtra, SubmissionListItem, ContestProblemList, Response, SubmissionList, ApiResult } from '../models/models';

/**
 * NowCoder服务，封装与NowCoder平台的API交互
 */
export class NowcoderService {
    private static readonly BASE_URL = 'https://ac.nowcoder.com';
    
    /**
     * 获取比赛的题目列表
     * @param contestId 比赛ID
     * @returns 题目列表响应
     */
    async getProblemList(contestId: number): Promise<ApiResult<ContestProblemList>> {
        try {
            const url = `${NowcoderService.BASE_URL}/acm/contest/problem-list?id=${contestId}`;
            const response = await httpClient.get<Response<ContestProblemList>>(url);
            if (response && response.code === 0 && response.data) {
                return ApiResult.success(response.data);
            }
            console.error('Failed to get problem list:', response?.msg);
            return ApiResult.failure(response?.msg || '未知错误');
        } catch (error) {
            console.error('Error fetching problem list:', error);
            return ApiResult.failure('网络错误: ' + (error instanceof Error ? error.message : String(error)));
        }
    }
    
    /**
     * 获取题目详情
     * @param contestId 比赛ID
     * @param questionIndex 题目索引（例如: 'A', 'B'）
     * @returns 题目详情
     */
    async getProblemExtra(contestId: number, questionIndex: string): Promise<ApiResult<ProblemExtra>> {
        try {
            const url = `${NowcoderService.BASE_URL}/acm/contest/${contestId}/${questionIndex}`;
            const html = await httpClient.getHtml(url);
            
            const parsedData = HtmlParser.parseProblemPage(html);
            
            return ApiResult.success(parsedData);
        } catch (error) {
            console.error(`Error fetching problem detail for ${contestId}/${questionIndex}:`, error);
            return ApiResult.failure('网络错误: ' + (error instanceof Error ? error.message : String(error)));
        }
    }
    
    /**
     * 提交代码
     * @param questionId 题目ID
     * @param tagId 标签ID
     * @param subTagId 子标签ID
     * @param doneQuestionId 完成的题目ID
     * @param content 代码内容
     * @param compiler 编译器
     * @returns 提交响应
     */
    async submitSolution(
        questionId: string, 
        tagId: string, 
        subTagId: string, 
        doneQuestionId: string, 
        content: string, 
        compiler: NowcoderCompiler
    ): Promise<ApiResult<SubmissionResponse>> {
        try {
            const url = `${NowcoderService.BASE_URL}/nccommon/submit_cd`;
            const languageConfig = COMPILER_CONFIG[compiler];
            
            const formData = {
                questionId,
                tagId,
                subTagId,
                content,
                language: languageConfig.id,
                languageName: languageConfig.name,
                doneQuestionId
            };
            
            const response = await httpClient.postForm<SubmissionResponse>(url, formData);
            return ApiResult.success(response);
        } catch (error) {
            console.error(`Error submitting solution for ${questionId}:`, error);
            return ApiResult.failure('网络错误: ' + (error instanceof Error ? error.message : String(error)));
        }
    }
    
    /**
     * 获取提交状态
     * @param submissionId 提交ID
     * @param tagId 标签ID
     * @param subTagId 子标签ID
     * @returns 提交状态
     */
    async getSubmissionStatus(submissionId: number, tagId: string, subTagId: string): Promise<ApiResult<SubmissionStatus>> {
        try {
            const url = `${NowcoderService.BASE_URL}/nccommon/status?submissionId=${submissionId}&tagId=${tagId}&subTagId=${subTagId}`;
            const status = await httpClient.get<SubmissionStatus>(url);
            return ApiResult.success(status);
        } catch (error) {
            console.error(`Error fetching submission status for ${submissionId}:`, error);
            return ApiResult.failure('网络错误: ' + (error instanceof Error ? error.message : String(error)));
        }
    }

    /**
     * 获取指定比赛ID的提交记录。
     * @param contestId 比赛ID。
     * @returns 提交记录列表。
     */
    async getSubmissions(contestId: number): Promise<ApiResult<SubmissionList>> {
        try {
            const url = `${NowcoderService.BASE_URL}/acm-heavy/acm/contest/status-list?id=${contestId}&pageSize=50&onlyMyStatusFilter=true`;
            const response = await httpClient.get<Response<SubmissionList>>(url);

            if (response && response.code === 0 && response.data) {
                return ApiResult.success(response.data);
            } else {
                console.error('Failed to get submissions:', response?.msg);
                return ApiResult.failure(response?.msg || '未知错误');
            }
        } catch (error) {
            console.error('Error fetching submissions:', error);
            return ApiResult.failure('网络错误: ' + (error instanceof Error ? error.message : String(error)));
        }
    }
}

// 导出单例
export const nowcoderService = new NowcoderService();
