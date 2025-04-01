import * as vscode from 'vscode';
import { Problem } from '../models/models';
import { ContestManager } from '../services/contestManager';

export class ProblemsProvider implements vscode.TreeDataProvider<ProblemItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<ProblemItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
    
    constructor(private contestManager: ContestManager) {
        // 监听题目更新
        contestManager.onProblemsUpdated(() => {
            this.refresh();
        });
    }
    
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
    
    getTreeItem(element: ProblemItem): vscode.TreeItem {
        return element;
    }
    
    async getChildren(element?: ProblemItem): Promise<ProblemItem[]> {
        if (element) {
            return [];
        }
        
        const problems = await this.contestManager.getProblems();
        if (!problems || problems.length === 0) {
            return [];
        }
        
        return problems.map(problem => new ProblemItem(problem));
    }
}

export class ProblemItem extends vscode.TreeItem {
    constructor(public readonly problem: Problem) {
        super(
            `${problem.info.index}. ${problem.info.title}`,
            vscode.TreeItemCollapsibleState.None
        );
        
        const acceptedRate = (problem.info.acceptedCount / Math.max(1, problem.info.submitCount) * 100).toFixed(2);

        this.tooltip = `${problem.info.title}
通过率: ${problem.info.acceptedCount}/${problem.info.submitCount}(${acceptedRate})%
状态: ${problem.info.myStatus || '未提交'}`;
        
        this.description = `通过率: ${(problem.info.acceptedCount / Math.max(1, problem.info.submitCount) * 100).toFixed(2)}% | ${problem.info.myStatus || '未提交'}`;
        
        this.contextValue = 'problem';
        
        // 设置图标
        if (problem.info.myStatus === '通过') {
            this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
        } else if (problem.info.myStatus === '未通过') {
            this.iconPath = new vscode.ThemeIcon('x', new vscode.ThemeColor('testing.iconFailed'));
        } else {
            this.iconPath = new vscode.ThemeIcon('circle-outline');
        }
    }
}

export class MessageItem extends vscode.TreeItem {
    constructor(title: string, message: string) {
        super(title, vscode.TreeItemCollapsibleState.None);
        this.description = message;
        this.contextValue = 'message';
    }
}
