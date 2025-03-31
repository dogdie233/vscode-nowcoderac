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
     * 设置配置文件路径。
     * @param configPath 配置文件路径。
     */
    setConfigPath(configPath: string | null) {
        this.configPath = configPath;
    }

    /**
     * 加载指定路径的配置文件。
     * @param configPath 配置文件路径。
     * @returns 加载的配置信息，如果加载失败则返回null。
     */
    async loadConfig(configPath: string): Promise<NowCoderConfig | null> {
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
     * 获取当前配置信息。
     * @returns 当前配置信息。
     */
    getConfig(): NowCoderConfig | null {
        return this.config;
    }

    /**
     * 更新配置文件。
     * @param newConfig 新的配置信息。
     */
    async updateConfig(newConfig: NowCoderConfig): Promise<void> {
        this.config = newConfig;

        if (this.configPath) {
            try {
                fs.writeFileSync(this.configPath, JSON.stringify(newConfig, null, 2));
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
