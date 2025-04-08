import * as vscode from 'vscode';
import { NowCoderAuthenticationProvider } from './nowcoderAuthenticationProvider';
import { ProblemsProvider } from './views/problemsProvider';
import { SubmissionsProvider } from './views/submissionsProvider';
import { RankingsProvider } from './views/rankingsProvider';
import { ContestSpaceManager } from './services/contestSpaceManager';
import { createCodeFile, openProblem, createContestSpace, refreshProblemList, submitSolution, refreshSubmissionList, refreshRealtimeRank } from './services/commands';
import { ContestServiceEventWrapper } from './utils/contestServiceEventWrapper';
import { ContestCountdownTimer } from './utils/contestCountdownTimer';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    console.log('牛客竞赛扩展已激活');
    
    // 初始化视图提供者
    const contestSpaceManager = ContestSpaceManager.createInstance(context);
    const contestServiceEventWrapper = new ContestServiceEventWrapper(contestSpaceManager);
    const problemsProvider = new ProblemsProvider(contestServiceEventWrapper);
    const submissionsProvider = new SubmissionsProvider(contestServiceEventWrapper);
    const rankingsProvider = new RankingsProvider(contestServiceEventWrapper);
    
    // 初始化倒计时
    const countdownTimer = new ContestCountdownTimer();
    context.subscriptions.push(countdownTimer);

    context.subscriptions.push(contestSpaceManager);
    
    // 注册视图
    const problemsTreeView = vscode.window.createTreeView('nowcoderac-problems', {
        treeDataProvider: problemsProvider
    });
    context.subscriptions.push(problemsTreeView);
    
    const submissionsTreeView = vscode.window.createTreeView('nowcoderac-submissions', {
        treeDataProvider: submissionsProvider
    });
    context.subscriptions.push(submissionsTreeView);
    
    const rankingsTreeView = vscode.window.createTreeView('nowcoderac-rankings', {
        treeDataProvider: rankingsProvider
    });
    context.subscriptions.push(rankingsTreeView);
    
    // 注册身份验证提供者
    const authProvider = new NowCoderAuthenticationProvider(context);
    context.subscriptions.push(
        vscode.authentication.registerAuthenticationProvider(
            "nowcoderac",
            "NowCoder",
            authProvider
        )
    );

    // 注册创建比赛工作空间命令
    const createWorkspaceDisposable = vscode.commands.registerCommand('nowcoderac.createContestSpace', createContestSpace);
    context.subscriptions.push(createWorkspaceDisposable);
    
    // 刷新题目列表命令
    const refreshProblemListDisposable = vscode.commands.registerCommand('nowcoderac.refreshProblemList', refreshProblemList);
    context.subscriptions.push(refreshProblemListDisposable);

    // 打开题目命令
    const openProblemDisposable = vscode.commands.registerCommand('nowcoderac.openProblem', openProblem);
    context.subscriptions.push(openProblemDisposable);

    // 创建代码文件命令
    const createCodeFileDisposable = vscode.commands.registerCommand('nowcoderac.createCodeFile', createCodeFile);
    context.subscriptions.push(createCodeFileDisposable);
    
    // 提交解答命令
    const submitSolutionDisposable = vscode.commands.registerCommand('nowcoderac.submitSolution', submitSolution);
    context.subscriptions.push(submitSolutionDisposable);
    
    // 刷新提交记录命令
    const refreshSubmissionListDisposable = vscode.commands.registerCommand('nowcoderac.refreshSubmissionList', refreshSubmissionList);
    context.subscriptions.push(refreshSubmissionListDisposable);

    // 刷新排名命令
    const refreshRankingsDisposable = vscode.commands.registerCommand('nowcoderac.refreshRealtimeRank', refreshRealtimeRank);
    context.subscriptions.push(refreshRankingsDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {
    console.log('NowCoder AC Extension has been deactivated.');
}
