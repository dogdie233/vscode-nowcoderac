import * as vscode from 'vscode';
import { ProblemRankData, RankBasicInfo, RankData } from '../models/models';
import { ContestManager } from '../services/contestManager';

export class RankingsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
    
    constructor(private contestManager: ContestManager) {
        contestManager.onRankUpdated(() => {
            this.refresh();
        });
        contestManager.onSubmissionStatusChanged(() => {
            this.refresh();
        });
    }
    
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
    
    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }
    
    async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
        if (element) {
            return [];
        }

        const rankings = await this.contestManager.getRealtimeRank();
        if (!rankings) {
            return [new vscode.TreeItem('暂无排名信息', vscode.TreeItemCollapsibleState.None)];
        }

        const myRankItem = rankings.myRankData ? new RankItem(rankings.myRankData, rankings.problemData, rankings.basicInfo) : null;
        const rankItems = rankings.rankData.map((rankData) => new RankItem(rankData, rankings.problemData, rankings.basicInfo));
        return [myRankItem, ...rankItems].filter(item => item !== null) as RankItem[];
    }
}

export class RankItem extends vscode.TreeItem {
    constructor(public readonly rankData: RankData, public readonly problems: ProblemRankData[], public readonly basicInfo: RankBasicInfo) {
        super(
            `${rankData.ranking}. ${rankData.userName} | ${rankData.acceptedCount} | `,
            vscode.TreeItemCollapsibleState.None
        );
        this.contextValue = "rankItem";
        
        var description = "";
        var tooltip = `过题数: ${rankData.acceptedCount}\n罚时: ${(rankData.penaltyTime / 60000).toFixed(0)}分钟`;
        for (var i = 0; i < problems.length; i++) {
            const problem = problems[i];
            const score = rankData.scoreList[i];

            description += score.accepted ? "✔️" : (score.submit ? "❌" : "    ");

            tooltip += `\n题${problem.name}: ${score.submit ? (score.accepted ? "通过" : "未通过") : "未提交"}`;
            if (score.failedCount > 0) {
                tooltip += ` -${score.failedCount}`;
            }

            const acceptedAfter = (score.acceptedTime - basicInfo.contestBeginTime) / 1000;
            if (acceptedAfter > 0) {
                const minutes = Math.floor(acceptedAfter / 60);
                const seconds = Math.floor(acceptedAfter % 60);
                tooltip += ` ${minutes.toString().padStart(2, '0')}分${seconds.toString().padStart(2, '0')}秒`;
            }
            if (score.firstBlood) {
                tooltip += " (首杀)";
            }
        }

        this.tooltip = tooltip;
        this.description = description;
    }
}