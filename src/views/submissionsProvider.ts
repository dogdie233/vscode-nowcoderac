import * as vscode from 'vscode';
import { SubmissionListItem } from '../models/models';
import { IContestDataProvider } from '../services/contestDataProvider.interface';

export class SubmissionsProvider implements vscode.TreeDataProvider<SubmissionItem | MessageItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<SubmissionItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
    
    constructor(private dataProvider: IContestDataProvider) {
        // 监听提交状态更新
        dataProvider.onSubmissionStatusChanged(() => {
            this.refresh();
        });
        dataProvider.onSubmissionsUpdated(() => {
            this.refresh();
        });
    }
    
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
    
    getTreeItem(element: SubmissionItem | MessageItem): vscode.TreeItem {
        return element;
    }
    
    async getChildren(element?: SubmissionItem): Promise<(SubmissionItem | MessageItem)[]> {
        if (element) {
            return [];
        }
        
        try {
            const submissions = await this.dataProvider.getSubmissions(true);
            if (!submissions || submissions.length === 0) {
                return [new MessageItem('暂无提交记录', '交一发先')];
            }
            
            return submissions.map(submission => new SubmissionItem(submission));
        } catch (error) {
            console.error('Failed to get submissions:', error);
            return [new MessageItem('获取提交记录失败', (error as Error).message)];
        }
    }
}

export class SubmissionItem extends vscode.TreeItem {
    constructor(public readonly submission: SubmissionListItem) {
        super(
            `${submission.index} - ${submission.statusMessage}`,
            vscode.TreeItemCollapsibleState.None
        );
        
        const submitTime = new Date(submission.submitTime);
        const formattedTime = submitTime.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).replace(/\//g, '-').replace(/,/, '');

        this.tooltip = `状态: ${submission.statusMessage}
运行时间: ${submission.time ?? '---'}ms
内存: ${submission.memory ?? '---'}KB
语言: ${submission.languageName}
提交时间: ${formattedTime}`;
        
        this.description = `语言:${submission.language} | 时间:${submission.time ?? '---'}ms | 内存:${submission.memory ?? '---'}KB | ${formattedTime}`;
        
        this.contextValue = 'submission';
        
        // 设置图标
        if (submission.statusMessage === '答案正确') {
            this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
        } else if (submission.statusMessage === '答案错误' || submission.statusMessage === '段错误') {
            this.iconPath = new vscode.ThemeIcon('x', new vscode.ThemeColor('testing.iconFailed'));
        } else if (submission.statusMessage === '编译错误') {
            this.iconPath = new vscode.ThemeIcon('alert', new vscode.ThemeColor('errorForeground'));
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
