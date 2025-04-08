import * as vscode from 'vscode';
import { ContestSpaceManager } from '../services/contestSpaceManager';

export class ContestCountdownTimer implements vscode.Disposable {
    private statusBarItem: vscode.StatusBarItem;
    private updateInterval: NodeJS.Timeout | undefined;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.command = 'nowcoderac.createContestSpace';
        this.statusBarItem.show();
        this.update();

        // Start update interval
        this.updateInterval = setInterval(() => this.update(), 1000);
    }

    private async update(): Promise<void> {
        const contestService = ContestSpaceManager.getInstance().getContestService();
        if (!contestService) {
            this.statusBarItem.text = '$(debug-disconnect) 未打开比赛';
            this.statusBarItem.tooltip = '点击创建比赛工作空间';
            return;
        }

        try {
            const contestInfo = await contestService.getContestInfo(false);
            if (!contestInfo) {
                this.statusBarItem.text = '$(debug-disconnect) 网络错误';
                this.statusBarItem.tooltip = '无法获取比赛信息';
                return;
            }

            const now = Date.now();
            const startTime = contestInfo.startTime;
            const endTime = contestInfo.endTime;
            
            if (now > endTime) {
                this.statusBarItem.text = '$(check) 比赛已结束';
                this.statusBarItem.tooltip = '比赛已经结束';
                return;
            }

            let remainingTime: number;
            let prefix = '';
            if (now < startTime) {
                remainingTime = startTime - now;
                prefix = '-';
            } else {
                remainingTime = endTime - now;
            }

            const hours = Math.floor(remainingTime / (1000 * 60 * 60));
            const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);

            this.statusBarItem.text = `$(watch) ${prefix}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            this.statusBarItem.tooltip = now < startTime ? 
                `距离比赛开始: ${hours}小时${minutes}分${seconds}秒` :
                `比赛倒计时: ${hours}小时${minutes}分${seconds}秒`;
        } catch (error) {
            console.error('Error updating contest countdown:', error);
            this.statusBarItem.text = '$(error) 发生错误';
            this.statusBarItem.tooltip = '更新倒计时时发生错误';
        }
    }

    dispose(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = undefined;
        }
        this.statusBarItem.dispose();
    }
}
