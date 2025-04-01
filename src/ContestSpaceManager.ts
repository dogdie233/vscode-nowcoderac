import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 创建比赛空间
 */
export async function createContestSpace() {
    try {
        // 获取用户输入的contestId
        const contestId = await vscode.window.showInputBox({
            prompt: '请输入比赛ID (contestId)',
            placeHolder: '例如: 12345',
            ignoreFocusOut: true
        });

        if (!contestId) {
            vscode.window.showInformationMessage('未提供比赛ID，操作已取消');
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
            vscode.window.showInformationMessage('未选择保存位置，操作已取消');
            return;
        }

        // 创建比赛文件夹
        const contestFolderPath = path.join(folderUri[0].fsPath, contestId);
        if (!fs.existsSync(contestFolderPath)) {
            fs.mkdirSync(contestFolderPath);
        }

        // 创建nowcoderac.json文件
        const jsonContent = JSON.stringify({
            contestId: contestId,
            problems: []
        }, null, 2);

        const jsonFilePath = path.join(contestFolderPath, 'nowcoderac.json');
        fs.writeFileSync(jsonFilePath, jsonContent);
        
        // 打开JSON文件作为活动编辑器
        const jsonFileUri = vscode.Uri.file(jsonFilePath);
        const document = await vscode.workspace.openTextDocument(jsonFileUri);
        await vscode.window.showTextDocument(document);

        vscode.window.showInformationMessage(`成功创建比赛工作空间: ${contestId}`);

    } catch (error) {
        console.error('创建比赛工作空间失败:', error);
        vscode.window.showErrorMessage(`创建比赛工作空间失败: ${error instanceof Error ? error.message : String(error)}`);
    }
}
