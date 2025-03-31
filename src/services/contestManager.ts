import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { nowcoderService } from './nowcoderService';
import { Problem, NowCoderConfig, SubmissionStatus, ProgrammingLanguage } from '../models/models';
import { ContestConfigurationService } from './ContestConfigurationService';
import { ContestDataManager } from './ContestDataManager';

/**
 * 管理NowCoder比赛、题目和提交
 */
export class ContestManager {
    private readonly _onProblemsUpdated = new vscode.EventEmitter<Problem[]>();
    private readonly _onSubmissionStatusChanged = new vscode.EventEmitter<SubmissionStatus>();

    // 公开事件
    readonly onProblemsUpdated = this._onProblemsUpdated.event;
    readonly onSubmissionStatusChanged = this._onSubmissionStatusChanged.event;

    private configService: ContestConfigurationService;
    private dataManager: ContestDataManager;

    constructor(private context: vscode.ExtensionContext) {
        this.configService = new ContestConfigurationService();
        this.dataManager = new ContestDataManager(this.configService);

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

        // 检查配置文件是否存在
        if (fs.existsSync(potentialConfigPath)) {
            this.configService.setConfigPath(potentialConfigPath);
            const config = await this.configService.loadConfig(potentialConfigPath);
            if (config) {
                // 如果配置文件有更新，尝试加载题目
                await this.refreshProblems();
            }
        } else {
            this.configService.setConfigPath(null);
            this._onProblemsUpdated.fire([]); // 清空题目列表
        }
    }

    /**
     * 刷新题目列表
     * @param noCache 是否不使用缓存
     */
    async refreshProblems(noCache: boolean = false): Promise<Problem[]> {
        const config = this.configService.getConfig();
        if (!config || !config.contestId) {
            vscode.window.showInformationMessage('请先设置比赛ID');
            return [];
        }

        const problems = (noCache ? null : config.problems) || await this.fetchAllProblems();

        // 更新配置文件中的题目缓存
        await this.updateConfig({
            ...config,
            problems: problems,
        });

        // 触发事件
        this._onProblemsUpdated.fire(problems);
        return problems;
    }

    /**
     * 获取所有题目
     */
    async fetchAllProblems(): Promise<Problem[]> {
        const config = this.configService.getConfig();
        if (!config || !config.contestId) {
            console.log('Contest ID is not set in the configuration.');
            return [];
        }

        return await this.dataManager.fetchAllProblems(config.contestId);
    }

    /**
     * 获取题目列表
     */
    async getProblems(): Promise<Problem[]> {
        const config = this.configService.getConfig();
        if (!config) {
            return [];
        }

        if (config.problems && config.problems.length > 0) {
            return config.problems;
        }

        return await this.refreshProblems();
    }

    /**
     * 获取题目详情
     * @param problemIndex 题目索引
     */
    async getProblemDetail(problemIndex: string): Promise<Problem | null> {
        const config = this.configService.getConfig();
        if (!config || !config.contestId) {
            vscode.window.showInformationMessage('请先设置比赛ID');
            return null;
        }

        // 先从缓存找
        if (config.problems) {
            const cachedProblem = config.problems.find(p => p.info.index === problemIndex);
            if (cachedProblem && cachedProblem.extra.content) {
                return cachedProblem;
            }
        }

        const problem = await this.dataManager.getProblemDetail(config.contestId, problemIndex);

        if (problem) {
            // 更新缓存
            if (!config.problems) {
                config.problems = [];
            }

            const index = config.problems.findIndex(p => p.info.index === problemIndex);
            config.problems.push(problem);
            await this.updateConfig(config);

            return problem;
        }

        return null;
    }

    /**
     * 打开题目
     * @param problem 题目
     */
    async openProblem(problem: Problem): Promise<void> {
        // 获取详情
        const problemDetail = await this.getProblemDetail(problem.info.index);
        if (!problemDetail || !problemDetail.extra.content) {
            return;
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
        content += problemDetail.extra.content;

        // 添加样例
        if (problemDetail.extra.examples && problemDetail.extra.examples.length > 0) {
            content += '## 样例\n\n';

            problemDetail.extra.examples.forEach((example, index) => {
                content += `### 样例 ${index + 1}\n`;
                content += `输入:\n\`\`\`\n${example.input}\n\`\`\`\n\n`;
                content += `输出:\n\`\`\`\n${example.output}\n\`\`\`\n\n`;
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
            // 如果详情不完整，尝试获取详情
            const updatedProblem = await this.getProblemDetail(problem.info.index);
            if (!updatedProblem || !updatedProblem.extra) {
                vscode.window.showErrorMessage('无法获取题目详情，请先打开题目');
                return false;
            }
            problem = updatedProblem;
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
            const response = await nowcoderService.submitSolution(
                problem.extra.questionId,
                problem.extra.tagId,
                problem.extra.subTagId,
                problem.extra.doneQuestionId,
                code,
                language
            );

            if (response.code === 0 && response.data) {
                // 轮询判题结果
                vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: `提交中: ${problem.info.index} - ${problem.info.title}`,
                    cancellable: false
                }, async (progress) => {
                    let isComplete = false;
                    let count = 0;

                    while (!isComplete && count < 60) {
                        // 每秒查询一次，最多60秒
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        count++;

                        progress.report({ message: `${count}秒... 检查判题结果中` });

                        try {
                            const status = await nowcoderService.getSubmissionStatus(
                                response.data,
                                problem.extra.tagId.toString(),
                                problem.extra.subTagId
                            );

                            // 判断是否完成
                            if (status.status !== 0) { // 0表示"等待判题"
                                isComplete = true;

                                // 显示结果
                                if (status.status === 5) { // 5表示"答案正确"
                                    vscode.window.showInformationMessage(`提交成功: ${status.judgeReplyDesc}`);
                                } else {
                                    vscode.window.showErrorMessage(`提交结果: ${status.judgeReplyDesc}\n${status.desc}`);

                                    // 如果是编译错误，显示错误消息
                                    if (status.status === 12 && status.memo) {
                                        vscode.window.showErrorMessage(`编译错误: ${status.memo}`);
                                    }
                                }

                                // 提交完成后，触发提交状态变更事件以刷新提交列表
                                this._onSubmissionStatusChanged.fire(status);

                                return true;
                            }
                        } catch (error) {
                            console.error('Failed to get submission status:', error);
                        }
                    }

                    if (!isComplete) {
                        vscode.window.showWarningMessage('获取判题结果超时，请前往NowCoder网站查看结果');
                    }

                    return true;
                });

                return true;
            } else {
                vscode.window.showErrorMessage(`提交失败: ${response.msg}`);
                return false;
            }
        } catch (error) {
            console.error('Failed to submit solution:', error);
            vscode.window.showErrorMessage(`提交失败: ${(error as Error).message}`);
            return false;
        }
    }

    /**
     * 获取提交记录
     */
    async getSubmissions(): Promise<any[]> {
        const config = this.configService.getConfig();
        if (!config || !config.contestId) {
            return [];
        }

        return await this.dataManager.getSubmissions(config.contestId);
    }

    /**
     * 刷新提交记录
     */
    async refreshSubmissions(): Promise<any[]> {
        const config = this.configService.getConfig();
        if (!config || !config.contestId) {
            return [];
        }

        try {
            const submissions = await this.dataManager.getSubmissions(config.contestId);
            this._onSubmissionStatusChanged.fire(null!);
            return submissions;
        } catch (error) {
            console.error('Failed to refresh submissions:', error);
            vscode.window.showErrorMessage(`刷新提交记录失败: ${(error as Error).message}`);
            return [];
        }
    }

    /**
     * 更新配置文件
     * @param newConfig 新的配置
     */
    private async updateConfig(newConfig: NowCoderConfig): Promise<void> {
        await this.configService.updateConfig(newConfig);
    }

    /**
     * 获取当前配置
     */
    getConfig(): NowCoderConfig | null {
        return this.configService.getConfig();
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
