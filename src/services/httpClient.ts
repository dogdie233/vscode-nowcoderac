import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import * as vscode from 'vscode';

/**
 * HTTP客户端
 */
export class HttpClient {
    private client: AxiosInstance;
    private token: string | undefined;

    constructor() {
        this.client = axios.create({
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
    }

    /**
     * 设置身份验证Token
     * @param token 认证令牌
     */
    setToken(token: string) {
        this.token = token;
    }

    /**
     * 获取身份验证Token
     */
    async getToken(): Promise<string | undefined> {
        if (this.token) {
            return this.token;
        }

        try {
            const session = await vscode.authentication.getSession('nowcoderac', [], { createIfNone: true });
            if (session) {
                this.token = session.accessToken;
                return this.token;
            }
        } catch (error) {
            console.error('Failed to get authentication session:', error);
        }

        return undefined;
    }

    /**
     * 发送GET请求
     * @param url 请求URL
     * @param config 请求配置
     * @returns 响应数据
     */
    async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const token = await this.getToken();
        if (!token) {
            throw new Error('未授权，请先登录NowCoder账号');
        }

        const requestConfig: AxiosRequestConfig = {
            ...config,
            headers: {
                ...config?.headers,
                Cookie: `t=${token}`
            }
        };

        try {
            const response = await this.client.get<T>(url, requestConfig);
            return response.data;
        } catch (error) {
            console.error(`GET request to ${url} failed:`, error);
            throw new Error(`请求失败: ${(error as Error).message}`);
        }
    }

    /**
     * 发送POST请求
     * @param url 请求URL
     * @param data 请求数据
     * @param config 请求配置
     * @returns 响应数据
     */
    async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        const token = await this.getToken();
        if (!token) {
            throw new Error('未授权，请先登录NowCoder账号');
        }

        const requestConfig: AxiosRequestConfig = {
            ...config,
            headers: {
                ...config?.headers,
                Cookie: `t=${token}`
            }
        };

        try {
            const response = await this.client.post<T>(url, data, requestConfig);
            return response.data;
        } catch (error) {
            console.error(`POST request to ${url} failed:`, error);
            throw new Error(`请求失败: ${(error as Error).message}`);
        }
    }

    /**
     * 发送表单数据POST请求
     * @param url 请求URL
     * @param formData 表单数据
     * @returns 响应数据
     */
    async postForm<T>(url: string, formData: Record<string, any>): Promise<T> {
        const token = await this.getToken();
        if (!token) {
            throw new Error('未授权，请先登录NowCoder账号');
        }

        const params = new URLSearchParams();
        Object.entries(formData).forEach(([key, value]) => {
            params.append(key, String(value));
        });

        const config: AxiosRequestConfig = {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                Cookie: `t=${token}`
            }
        };

        try {
            const response = await this.client.post<T>(url, params.toString(), config);
            return response.data;
        } catch (error) {
            console.error(`POST form request to ${url} failed:`, error);
            throw new Error(`请求失败: ${(error as Error).message}`);
        }
    }

    /**
     * 获取HTML内容
     * @param url 请求URL
     * @returns HTML字符串
     */
    async getHtml(url: string): Promise<string> {
        const token = await this.getToken();
        if (!token) {
            throw new Error('未授权，请先登录NowCoder账号');
        }

        const config: AxiosRequestConfig = {
            headers: {
                Cookie: `t=${token}`,
                Accept: 'text/html',
                "User-Agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 NowCoderAC/1.0.0'
            },
            responseType: 'text'
        };

        try {
            const response = await this.client.get(url, config);
            return response.data;
        } catch (error) {
            console.error(`GET HTML request to ${url} failed:`, error);
            throw new Error(`请求失败: ${(error as Error).message}`);
        }
    }
}

// 单例
export const httpClient = new HttpClient();
