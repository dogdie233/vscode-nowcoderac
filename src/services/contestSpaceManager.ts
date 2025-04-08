import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ContestService } from './contestService';

export class ContestSpaceManager extends vscode.Disposable {
    private static instance: ContestSpaceManager | undefined = undefined;
    private readonly _onContestSpaceChanged = new vscode.EventEmitter<ContestService | undefined>();
    private readonly _textEditorChangedListener: vscode.Disposable;
    private currentContest: ContestService | undefined = undefined;

    readonly onContestSpaceChanged = this._onContestSpaceChanged.event;

    private constructor(context: vscode.ExtensionContext) {
        super(() => {
            this._textEditorChangedListener.dispose();
            ContestSpaceManager.instance = undefined;
        });
        
        this.currentContest = undefined;

        this._textEditorChangedListener = vscode.window.onDidChangeActiveTextEditor(this.handleActiveEditorChange, this);
    }

    private async handleActiveEditorChange(editor: vscode.TextEditor | undefined): Promise<void> {
        if (!editor || editor.document.uri.scheme !== 'file') {
            return;
        }

        // 查找配置文件
        const documentDir = path.dirname(editor.document.uri.fsPath);
        const potentialConfigPath = path.join(documentDir, 'nowcoderac.json');

        // 已经是当前配置文件了，或者不存在配置文件
        if (this.currentContest?.getContestFolderPath() === documentDir || !fs.existsSync(potentialConfigPath)) {
            return;
        }
        
        // 检查配置文件是否存在
        const result = await vscode.window.showInformationMessage(`检测到新的比赛配置文件: ${potentialConfigPath}，是否打开？`, { modal: true }, { title: '是' });
        if (result?.title === '是') {
            try {
                this.openContestSpace(potentialConfigPath);
            } catch (error) {
                vscode.window.showErrorMessage(`打开比赛空间失败: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    }

    /**
     * 打开比赛空间，此举会更新当前打开的比赛配置文件
     * @param contestConfigPath 比赛配置文件路径
     */
    openContestSpace(contestConfigPath: string): ContestService {
        if (!fs.existsSync(contestConfigPath)) {
            throw new Error(`比赛配置文件不存在: ${contestConfigPath}`);
        }

        contestConfigPath = fs.realpathSync(contestConfigPath);
        const contestDir = path.dirname(contestConfigPath);
        this.currentContest = ContestService.open(contestDir, contestConfigPath);
        this._onContestSpaceChanged.fire(this.currentContest);
        return this.currentContest;
    }

    /**
     * 创建比赛空间，如果已经存在，则覆盖，此举会更新当前打开的比赛配置文件
     * @param contestId 比赛ID
     * @param contestFolderPath 比赛文件夹路径
     * @returns ContestService实例
     */
    createContestSpace(contestId: number, contestFolderPath: string): ContestService {
        if (!fs.existsSync(contestFolderPath)) {
            fs.mkdirSync(contestFolderPath, { recursive: true });
        }
        contestFolderPath = fs.realpathSync(contestFolderPath);
        const configPath = path.join(contestFolderPath, 'nowcoderac.json');

        this.currentContest = ContestService.create(contestFolderPath, configPath, contestId);
        this._onContestSpaceChanged.fire(this.currentContest);
        return this.currentContest;
    }

    /**
     * 获取当前比赛的ContestManager示例
     * @returns 当前的ContestManager实例
     */
    getContestService() : ContestService | undefined {
        return this.currentContest;
    }

    /**
     * 创建ContestSpaceManager实例，如果已经存在，则返回现有实例
     * @param context 插件上下文
     * @returns ContestSpaceManager实例
     */
    static createInstance(context: vscode.ExtensionContext) : ContestSpaceManager {
        if (!ContestSpaceManager.instance) {
            ContestSpaceManager.instance = new ContestSpaceManager(context);
        }
        return ContestSpaceManager.instance;
    }

    /**
     * 获取ContestSpaceManager实例
     * @throws Error 如果在createInstance之前调用了getInstance，则会抛出错误
     * @returns ContestSpaceManager实例
     */
    static getInstance() : ContestSpaceManager {
        if (!ContestSpaceManager.instance) {
            throw new Error("ContestSpaceManager instance not created. Call createInstance() first.");
        }
        return ContestSpaceManager.instance;
    }
}