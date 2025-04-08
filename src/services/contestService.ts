import * as vscode from 'vscode';
import * as fs from 'fs';
import { nowcoderService } from './nowcoderService';
import { Problem, SubmissionStatus, NowcoderCompiler, ProblemInfo, ProblemExtra, SubmissionListItem, RealtimeRank, NowcoderConfig, ContestInfo } from '../models/models';
import { CphService } from './cphService';
import { IContestDataProvider } from './contestDataProvider.interface';

/**
 * 管理NowCoder比赛、题目和提交
 */
export class ContestService implements IContestDataProvider {
    private readonly _onProblemsUpdated = new vscode.EventEmitter<Problem[]>();
    private readonly _onSubmissionStatusChanged = new vscode.EventEmitter<SubmissionStatus>();
    private readonly _onSubmissionsUpdated = new vscode.EventEmitter<SubmissionListItem[]>();
    private readonly _onRankUpdated = new vscode.EventEmitter<RealtimeRank | undefined>();

    // 公开事件
    readonly onProblemsUpdated = this._onProblemsUpdated.event;
    readonly onSubmissionStatusChanged = this._onSubmissionStatusChanged.event;
    readonly onSubmissionsUpdated = this._onSubmissionsUpdated.event;
    readonly onRankUpdated = this._onRankUpdated.event;

    readonly cphService: CphService;

    private submissionsCache: SubmissionListItem[] = [];
    private realtimeRankCache: RealtimeRank | undefined = undefined;
    private contestInfoCache: ContestInfo | undefined = undefined;

    private constructor(private readonly contestFolderPath: string, private readonly configPath: string, private readonly config: NowcoderConfig) {
        this.cphService = new CphService(this);
    }

    /**
     * 打开比赛config文件
     * @param contestFolderPath 比赛文件夹路径
     * @param configPath 配置文件路径
     * @returns ContestService实例
     */
    static open(contestFolderPath: string, configPath: string): ContestService {
        contestFolderPath = fs.realpathSync(contestFolderPath);
        configPath = fs.realpathSync(configPath);

        const configData = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(configData) as NowcoderConfig;
        if (!config.contestId) {
            throw new Error('无效的配置文件：配置文件中缺少contestId');
        }
        return new ContestService(contestFolderPath, configPath, config);
    }

    /**
     * 创建比赛config文件（存在覆盖）
     * @param contestFolderPath 比赛文件夹路径
     * @param configPath 配置文件路径
     * @param contestId 比赛ID
     * @returns ContestService实例
     */
    static create(contestFolderPath: string, configPath: string, contestId: number): ContestService {
        if (!fs.existsSync(configPath)) {
            fs.mkdirSync(contestFolderPath, { recursive: true });
        }
        const config: NowcoderConfig = {
            contestId: contestId,
            problems: []
        };
        const configData = JSON.stringify(config, null, 4);
        fs.writeFileSync(configPath, configData, 'utf-8');
        contestFolderPath = fs.realpathSync(contestFolderPath);
        configPath = fs.realpathSync(configPath);
        return new ContestService(contestFolderPath, configPath, config);
    }

    getContestFolderPath(): string {
        return this.contestFolderPath;
    }

    getConfig(): NowcoderConfig {
        return this.config;
    }

    saveConfig(): void {
        const configData = JSON.stringify(this.config, null, 4);
        fs.writeFileSync(this.configPath, configData, 'utf-8');
    }

    /**
     * 获取题目列表，如果没有缓存则刷新（可能不包含extra信息）
     * @param noCache 是否不使用缓存
     * @returns 题目列表，如果失败则是null
     */
    async getProblems(noCache: boolean = false) : Promise<Problem[]> {
        if (noCache || !this.config.problems || this.config.problems.length === 0) {
            // 如果没有题目缓存，尝试刷新题目列表
            const problemListResult = await nowcoderService.getProblemList(this.config.contestId);
            if (!problemListResult.success) {
                throw new Error(`获取题目列表失败: ${problemListResult.error}`);
            }
            const problemList = problemListResult.data!;

            this.config.problems = problemList.data.map((info: ProblemInfo) => {
                const problem: Problem = {
                    info: info,
                    extra: this.config.problems?.find(p => p.info.index === info.index)?.extra
                };
                return problem;
            });
            this.saveConfig();
            this._onProblemsUpdated.fire(this.config.problems);
        }
        
        return this.config.problems;
    }

    /**
     * 获取题目列表信息
     * @param index 题目索引
     * @param noCache 是否不使用缓存
     * @returns 题目详情，如果失败则是null
     */
    async getProblem(index: string, noCache: boolean = false): Promise<Problem | null> {
        const problems = await this.getProblems(noCache);
        const problem = problems.find(p => p.info.index === index);
        if (!problem) {
            return null;
        }
        return problem;
    }

    /**
     * 获取题目的Extra信息
     * @param index 题目索引
     * @param noCache 是否不使用缓存
     * @returns 题目详情，如果失败则是null
     */
    async getProblemExtra(index: string, noCache: boolean = false) : Promise<ProblemExtra> {
        const problem = this.config.problems?.find(p => p.info.index === index);
        if (!problem) {
            throw new Error(`题目"${index}"不存在`);
        }
        if (problem.extra && !noCache) {
            return problem.extra;
        }

        const extraResult = await nowcoderService.getProblemExtra(this.config.contestId, index);
        if (!extraResult.success) {
            throw new Error(`获取题目"${index}"详情失败: ${extraResult.error}`);
        }

        problem.extra = extraResult.data!;
        this.saveConfig();
        this._onProblemsUpdated.fire(this.config.problems!);
        return problem.extra;
    }

    /**
     * 提交解答
     * @param code 代码
     * @param problemIndex 题目索引
     * @param compiler 编程语言
     * @returns 提交的Id，如果失败则是null
     */
    async submitSolution(code: string, problemIndex: string, compiler: NowcoderCompiler): Promise<number> {
        const problem = await this.getProblem(problemIndex);
        if (!problem) {
            throw new Error(`题目"${problemIndex}"不存在`);
        }
        problem.extra ??= await this.getProblemExtra(problemIndex) ?? undefined;
        if (!problem.extra) {
            throw new Error(`获取题目"${problemIndex}"详情失败`);
        }

        const responseResult = await nowcoderService.submitSolution(
            problem.extra.questionId,
            problem.extra.tagId,
            problem.extra.subTagId,
            problem.extra.doneQuestionId,
            code,
            compiler
        );

        if (!responseResult.success) {
            throw new Error(`${responseResult.error}`);
        }

        return responseResult.data!.data;
    }

    /**
     * 确认提交状态，用来触发提交状态更新事件
     * @param status 提交状态
     */
    confirmSubmissionStatus(status: SubmissionStatus) {
        this._onSubmissionStatusChanged.fire(status);
    }

    /**
     * 获取提交记录
     * @param noCache 是否不使用缓存
     * @returns 提交记录列表，如果失败则是null
     */
    async getSubmissions(noCache: boolean = false): Promise<SubmissionListItem[]> {
        if (noCache || !this.submissionsCache) {
            const submissionsResult = await nowcoderService.getSubmissions(this.config.contestId);
            if (!submissionsResult.success) {
                throw new Error(`获取提交记录失败: ${submissionsResult.error}`);
            }
            this.submissionsCache = submissionsResult.data!.data;
            this._onSubmissionsUpdated.fire(this.submissionsCache);
        }

        return this.submissionsCache;
    }

    /**
     * 获取实时排名数据
     * @param noCache 是否不使用缓存
     * @returns 实时排名数据，如果失败则是null
     */
    async getRealtimeRank(noCache: boolean = false): Promise<RealtimeRank> {
        if (noCache || !this.realtimeRankCache) {
            const rankResult = await nowcoderService.getRealtimeRank(this.config.contestId);
            if (!rankResult.success) {
                throw new Error(`获取实时排名失败: ${rankResult.error}`);
            }
            this.realtimeRankCache = rankResult.data!;
            this._onRankUpdated.fire(this.realtimeRankCache);
        }

        return this.realtimeRankCache;
    }

    async getContestInfo(noCache: boolean = false): Promise<ContestInfo | undefined> {
        if (noCache || !this.contestInfoCache) {
            const contestInfoResult = await nowcoderService.getContestInfo(this.config.contestId);
            if (!contestInfoResult.success) {
                throw new Error(`获取比赛信息失败: ${contestInfoResult.error}`);
            }
            this.contestInfoCache = contestInfoResult.data!;
        }
        
        return this.contestInfoCache;
    }
}