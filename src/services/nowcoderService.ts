import { httpClient } from './httpClient';
import { HtmlParser } from '../utils/htmlParser';
import { SubmissionResponse, SubmissionStatus, ProgrammingLanguage, LANGUAGE_CONFIG, ProblemExtra, SubmissionListItem, ContestProblemList, Response, SubmissionList } from '../models/models';

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
    async getProblemList(contestId: number): Promise<ContestProblemList | null> {
        try {
            const url = `${NowcoderService.BASE_URL}/acm/contest/problem-list?id=${contestId}`;
            const response = await httpClient.get<Response<ContestProblemList>>(url);
            if (response && response.code === 0 && response.data) {
                return response.data;
            }
            console.error('Failed to get problem list:', response?.msg);
            return null;
        } catch (error) {
            console.error('Error fetching problem list:', error);
            return null;
        }
    }
    
    /**
     * 获取题目详情
     * @param contestId 比赛ID
     * @param questionIndex 题目索引（例如: 'A', 'B'）
     * @returns 题目详情
     */
    async getProblemExtra(contestId: number, questionIndex: string): Promise<ProblemExtra | null> {
        try {
            const url = `${NowcoderService.BASE_URL}/acm/contest/${contestId}/${questionIndex}`;
            const html = await httpClient.getHtml(url);
            
            const parsedData = HtmlParser.parseProblemPage(html);
            
            return parsedData;
        } catch (error) {
            console.error(`Error fetching problem detail for ${contestId}/${questionIndex}:`, error);
            return null;
        }
    }
    
    /**
     * 提交代码
     * @param questionId 题目ID
     * @param tagId 标签ID
     * @param subTagId 子标签ID
     * @param doneQuestionId 完成的题目ID
     * @param content 代码内容
     * @param language 编程语言
     * @returns 提交响应
     */
    async submitSolution(
        questionId: string, 
        tagId: string, 
        subTagId: string, 
        doneQuestionId: string, 
        content: string, 
        language: ProgrammingLanguage
    ): Promise<SubmissionResponse | null> {
        try {
            const url = `${NowcoderService.BASE_URL}/nccommon/submit_cd`;
            const languageConfig = LANGUAGE_CONFIG[language];
            
            const formData = {
                questionId,
                tagId,
                subTagId,
                content,
                language: languageConfig.id,
                languageName: languageConfig.name,
                doneQuestionId
            };
            
            return await httpClient.postForm<SubmissionResponse>(url, formData);
        } catch (error) {
            console.error(`Error submitting solution for ${questionId}:`, error);
            return null;
        }
    }
    
    /**
     * 获取提交状态
     * @param submissionId 提交ID
     * @param tagId 标签ID
     * @param subTagId 子标签ID
     * @returns 提交状态
     */
    async getSubmissionStatus(submissionId: number, tagId: string, subTagId: string): Promise<SubmissionStatus | null> {
        try {
            const url = `${NowcoderService.BASE_URL}/nccommon/status?submissionId=${submissionId}&tagId=${tagId}&subTagId=${subTagId}`;
            return await httpClient.get<SubmissionStatus>(url);
        } catch (error) {
            console.error(`Error fetching submission status for ${submissionId}:`, error);
            return null;
        }
    }

    /**
     * 获取指定比赛ID的提交记录。
     * @param contestId 比赛ID。
     * @returns 提交记录列表。
     */
    async getSubmissions(contestId: number): Promise<SubmissionList | null> {
        try {
            const url = `${NowcoderService.BASE_URL}/acm-heavy/acm/contest/status-list?id=${contestId}&pageSize=50&onlyMyStatusFilter=true`;
            const response = await httpClient.get<Response<SubmissionList>>(url);

            if (response && response.code === 0 && response.data) {
                return response.data;
            } else {
                console.error('Failed to get submissions:', response?.msg);
                return null;
            }
        } catch (error) {
            console.error('Error fetching submissions:', error);
            return null;
        }
    }
}

// 导出单例
export const nowcoderService = new NowcoderService();
