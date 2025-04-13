import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ContestSpaceManager } from "./contestSpaceManager";
import { UserInteractiveHelper } from '../utils/userInteractiveHelper';
import { COMPILER_CONFIG, Problem } from '../models/models';
import { CodeHelper } from '../utils/codeHelper';
import { ContestService } from './contestService';
import { ProblemItem } from '../views/problemsProvider';
import { NowcoderAuthenticationProvider } from '../nowcoderAuthenticationProvider';

async function ensureInContest(callback: (currentContest: ContestService) => Promise<void>) {
    const contestManager = ContestSpaceManager.getInstance().getContestService();
    if (!contestManager) {
        vscode.window.showErrorMessage('请先打开比赛文件夹');
        return;
    }
    await callback(contestManager);
}

export const createContestSpace = async () => {
    try {
        // 获取用户输入的contestId
        const contestIdStr = await vscode.window.showInputBox({
            prompt: '请输入比赛ID (contestId)',
            placeHolder: '例如: 12345',
            ignoreFocusOut: true
        });

        const contestId = parseInt(contestIdStr ?? '', 10);
        if (!contestIdStr) {
            return;
        }
        if (isNaN(contestId)) {
            vscode.window.showErrorMessage('比赛ID无效，请输入数字');
            return;
        }

        // 让用户选择目标文件夹
        const folderUri = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: '选择保存位置'
        });

        if (!folderUri || folderUri.length === 0) {
            return;
        }

        // 创建比赛文件夹
        const contestFolderPath = path.join(folderUri[0].fsPath, contestIdStr);
        ContestSpaceManager.getInstance().createContestSpace(contestId, contestFolderPath);
        vscode.window.showInformationMessage(`成功创建比赛工作空间: ${contestIdStr}`);
    } catch (error) {
        console.error('创建比赛工作空间失败:', error);
        vscode.window.showErrorMessage(`创建比赛工作空间失败: ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const refreshProblemList = async () => {
    ensureInContest(async (currentContest) => {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "正在刷新题目列表...",
            cancellable: false
        }, async () => {
            await currentContest.getProblems(true);
        });
    });
};

export const openProblem = async (problemItem: ProblemItem | undefined): Promise<void> => {
    if (!problemItem) {
        return;
    }
    const problem = problemItem.problem;
    ensureInContest(async (currentContest) => {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `正在打开题目 ${problem.info.index}...`,
            cancellable: false
        }, async () => {
            const extra = await currentContest.getProblemExtra(problem.info.index, true);
            if (!extra) {
                vscode.window.showErrorMessage(`获取题目${problem.info.index}详情失败`);
                return;
            }

            const contestFolderPath = currentContest.getContestFolderPath();
            const fileName = `${problem.info.index}.md`;
            const filePath = path.join(contestFolderPath, fileName);

            // 生成Markdown内容
            let content = `# ${problem.info.index}. ${problem.info.title}\n\n`;
            content += extra.content;

            // 添加样例
            if (extra.examples && extra.examples.length > 0) {
                content += '## 样例\n\n';

                extra.examples.forEach((example, index) => {
                    content += `### 样例 ${index + 1}\n`;
                    content += `**输入**:\n\`\`\`\n${example.input}\n\`\`\`\n\n`;
                    content += `**输出**:\n\`\`\`\n${example.output}\n\`\`\`\n\n`;
                    if (example.tips) {
                        content += `**说明**:  \n\n${example.tips}\n\n`;
                    }
                });
            }

            // 写入文件
            fs.mkdirSync(contestFolderPath, { recursive: true });
            fs.writeFileSync(filePath, content);
            
            // 打开文件
            const document = await vscode.workspace.openTextDocument(filePath);
            vscode.commands.executeCommand('markdown.showPreviewToSide', document.uri);
        });
    });
};

export const createCodeFile = async (problemItem: ProblemItem | undefined, generateCphProb: boolean = true): Promise<void> => {
    if (!problemItem) {
        return;
    }
    const problem = problemItem.problem;
    ensureInContest(async (currentContest) => {
        const compiler = await UserInteractiveHelper.askCompiler();
        if (!compiler) {
            return;
        }
        
        const contestFolderPath = currentContest.getContestFolderPath();
        const compilerInfo = COMPILER_CONFIG[compiler];
        const fileName = `${problem.info.index}.${compilerInfo.ext}`;
        const filePath = path.join(contestFolderPath, fileName);
        const compilerMarkText = COMPILER_CONFIG[compiler].commentToken + ' Nowcoder Compiler: ' + COMPILER_CONFIG[compiler].name + '\n';
        
        fs.mkdirSync(contestFolderPath, { recursive: true });
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, compilerMarkText, 'utf-8');
        }

        if (generateCphProb) {
            console.info('Creating prob file...');
            const cphService = currentContest.cphService;
            if (!cphService.readExistingProb(fileName)) {
                const prob = cphService.createProb(fileName, problem);
                if (prob) {
                    cphService.saveProb(fileName, prob);
                } else {
                    console.error('Failed to create prob file');
                }
            }
        }

        await vscode.window.showTextDocument(vscode.Uri.file(filePath), {
            preview: false
        });
    });
};

export const submitSolution = async (problemItem: ProblemItem | undefined): Promise<void> => {
    if (!problemItem) {
        return;
    }
    const problem = problemItem.problem;
    ensureInContest(async (currentContest) => {
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
        
        const submissionId = await currentContest.submitSolution(code, problem.info.index, compiler);
        await UserInteractiveHelper.showJudgementProgress(submissionId, problem, status => {
            return currentContest.confirmSubmissionStatus(status);
        });
        await currentContest.getSubmissions(true);  // 刷新提交记录
        await currentContest.getRealtimeRank(true);  // 刷新实时排行榜
    });
};

export const refreshSubmissionList = async () => {
    ensureInContest(async (currentContest) => {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "正在刷新提交记录...",
            cancellable: false
        }, async () => {
            await currentContest.getSubmissions(true);
        });
    });
};

export const refreshRealtimeRank = async () => {
    ensureInContest(async (currentContest) => {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "正在刷新实时排行榜...",
            cancellable: false
        }, async () => {
            await currentContest.getRealtimeRank(true);
        });
    });
};

export const login = async (context: vscode.ExtensionContext) => {
    NowcoderAuthenticationProvider.clearToken(context);
    vscode.authentication.getSession('nowcoderac', [], { createIfNone: true });  
};

export const logout = async (context: vscode.ExtensionContext) => {
    NowcoderAuthenticationProvider.clearToken(context);
};