import * as vscode from 'vscode';
import * as fs from 'fs';
import { NowCoderConfig } from '../models/models';

/**
 * 负责管理NowCoder配置文件的加载、更新和访问。
 */
export class ContestConfigurationService {
    private config: NowCoderConfig | null = null;
    private configPath: string | null = null;

    /**
     * 获取当前配置信息。
     * @returns 当前配置信息。
     */
    getConfig(): NowCoderConfig | null {
        return this.config;
    }

    /**
     * 加载指定路径的配置文件。
     * @param configPath 配置文件路径。
     * @returns 加载的配置信息，如果加载失败则返回null。
     */
    async load(configPath: string | null): Promise<NowCoderConfig | null> {
        if (configPath === null) {
            this.configPath = null;
            this.config = null;
            return null;
        }

        if (!fs.existsSync(configPath)) {
            return null;
        }
        
        try {
            const configContent = fs.readFileSync(configPath, 'utf-8');
            this.config = JSON.parse(configContent) as NowCoderConfig;
            this.configPath = configPath;
            return this.config;
        } catch (error) {
            console.error('Failed to parse config file:', error);
            vscode.window.showErrorMessage('NowCoder配置文件格式错误');
            return null;
        }
    }
    /**
     * 保存当前配置信息到配置文件。
     */
    async save(): Promise<void> {
        if (this.configPath) {
            try {
                fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
            } catch (error) {
                console.error('Failed to write config file:', error);
                vscode.window.showErrorMessage('保存配置文件失败');
            }
        }
    }

    /**
     * 获取配置文件路径。
     * @returns 配置文件路径。
     */
    getConfigPath(): string | null {
        return this.configPath;
    }
}
