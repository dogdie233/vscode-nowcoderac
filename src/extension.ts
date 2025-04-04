// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { NowCoderAuthenticationProvider } from './nowcoderAuthenticationProvider';
import { getContestManager } from './services/contestManager';
import { ProblemsProvider, ProblemItem } from './views/problemsProvider';
import { SubmissionsProvider } from './views/submissionsProvider';
import { RankingsProvider } from './views/rankingsProvider';
import { NowcoderCompiler, COMPILER_CONFIG } from './models/models';
import { createContestSpace } from './services/contestSpaceManager';
import { UserInteractiveHelper } from './utils/userInteractiveHelper';
import { CodeHelper } from './utils/codeHelper';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    console.log('牛客竞赛扩展已激活');

    // 初始化ContestManager
    const contestManager = getContestManager(context);
    
    // 初始化视图提供者
    const problemsProvider = new ProblemsProvider(contestManager);
    const submissionsProvider = new SubmissionsProvider(contestManager);
    const rankingsProvider = new RankingsProvider(contestManager);
    
    // 注册视图
    vscode.window.createTreeView('nowcoderac-problems', {
        treeDataProvider: problemsProvider
    });
    
    vscode.window.createTreeView('nowcoderac-submissions', {
        treeDataProvider: submissionsProvider
    });
    
    vscode.window.createTreeView('nowcoderac-rankings', {
        treeDataProvider: rankingsProvider
    });
    
    // 注册身份验证提供者
    const authProvider = new NowCoderAuthenticationProvider(context);
    context.subscriptions.push(
        vscode.authentication.registerAuthenticationProvider(
            "nowcoderac",
            "NowCoder",
            authProvider
        )
    );
    
    // 刷新题目列表命令
    const refreshProblemsDisposable = vscode.commands.registerCommand('nowcoderac.refreshProblemList', async () => {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "正在刷新题目列表...",
            cancellable: false
        }, async () => {
            await contestManager.getProblems(true);
        });
    });
    context.subscriptions.push(refreshProblemsDisposable);

    // 刷新题目内容命令
    const refreshProblemDisposable = vscode.commands.registerCommand('nowcoderac.refreshProblemContent', async (problemItem: ProblemItem) => {
        if (problemItem) {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "正在刷新题目...",
                cancellable: false
            }, async () => {
                await contestManager.getProblemExtra(problemItem.problem.info.index, true);
            });
        }
    });
    context.subscriptions.push(refreshProblemDisposable);
    
    // 打开题目命令
    const openProblemDisposable = vscode.commands.registerCommand('nowcoderac.openProblem', async (problemItem: ProblemItem) => {
        if (problemItem) {
            await contestManager.openProblem(problemItem.problem);
        }
    });
    context.subscriptions.push(openProblemDisposable);

    // 创建代码文件命令
    const createCodeFileDisposable = vscode.commands.registerCommand('nowcoderac.createCodeFile', async (problemItem: ProblemItem) => {
        if (problemItem) {
            const compiler = await UserInteractiveHelper.askCompiler();
            if (!compiler) {
                return;
            }
            const filePath = await contestManager.createCodeFile(problemItem.problem, compiler, true);
            if (filePath) {
                await vscode.window.showTextDocument(vscode.Uri.file(filePath), {
                    preview: false
                });
            }
        }
    });
    context.subscriptions.push(createCodeFileDisposable);
    
    // 提交解答命令
    const submitSolutionDisposable = vscode.commands.registerCommand('nowcoderac.submitSolution', async (problemItem: ProblemItem) => {
        if (!problemItem) {
            return;
        }
        
        const document = vscode.window.activeTextEditor?.document;
        const code = document?.getText();
        if (!document || !code) {
            vscode.window.showErrorMessage("当前没有打开的代码文件或代码为空，请先创建代码文件。");
            return;
        }

        const compiler = CodeHelper.tryParseComplierInCode(code, document.languageId) ?? await UserInteractiveHelper.askCompiler();
        if (!compiler) {
            return;
        }
        
        await contestManager.submitSolution(code, problemItem.problem, compiler);
    });
    context.subscriptions.push(submitSolutionDisposable);
    
    // 刷新提交记录命令
    context.subscriptions.push(
        vscode.commands.registerCommand('nowcoderac.refreshSubmissionList', async () => {
            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "正在刷新提交记录...",
                cancellable: false
            }, async () => {
                await contestManager.getSubmissions(true);
            });
        })
    );

    // 刷新排名命令
    const refreshRankingsDisposable = vscode.commands.registerCommand('nowcoderac.refreshRealtimeRank', async () => {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "正在刷新排名...",
            cancellable: false
        }, async () => {
            await contestManager.getRealtimeRank(true);
        });
    });
    context.subscriptions.push(refreshRankingsDisposable);

    // 注册创建比赛工作空间命令
    const createWorkspaceCommand = vscode.commands.registerCommand(
        'nowcoderac.createContestWorkspace',
        createContestSpace
    );
    context.subscriptions.push(createWorkspaceCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {
    console.log('NowCoder AC Extension has been deactivated.');
}
