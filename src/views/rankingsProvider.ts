import * as vscode from 'vscode';

export class RankingsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
    
    constructor() {}
    
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
    
    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }
    
    async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
        // 暂未实现排名功能
        return [new vscode.TreeItem('排名功能暂未实现', vscode.TreeItemCollapsibleState.None)];
    }
}
