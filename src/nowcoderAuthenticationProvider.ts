import * as vscode from 'vscode';

export class NowcoderAuthenticationProvider implements vscode.AuthenticationProvider {
    private readonly sessionChangeEmitter = new vscode.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>();
    static readonly id = 'nowcoderac-token';

    onDidChangeSessions = this.sessionChangeEmitter.event;

    constructor(private readonly context: vscode.ExtensionContext) {}

    async getSessions(scopes?: string[]): Promise<vscode.AuthenticationSession[]> {
        const token = await this.context.secrets.get(NowcoderAuthenticationProvider.id);
        if (!token) {
            return [];
        }
        return [this.token2Session(token)];
    }

    async createSession(scopes: string[]): Promise<vscode.AuthenticationSession> {
        const cookieStr = await vscode.window.showInputBox({
            prompt: '请输入cookie',
            ignoreFocusOut: true,
            password: false
        });

        if (!cookieStr) {
            throw new Error('Cookie不能为空');
        }

        var token;
        if (cookieStr.indexOf('=') === -1) {
            token = cookieStr;
        } else {
            const cookieParts = cookieStr.split(';').map(part => part.split('='));
            const cookieObj: { [key: string]: string } = {};
            for (const [key, value] of cookieParts) {
                cookieObj[key.trim()] = value.trim();
            }
            token = cookieObj['t'];
        }
        if (!token) {
            throw new Error('无效的cookie/token值');
        }
        token.replaceAll('\'', '');
        token.replaceAll('"', '');

        const session: vscode.AuthenticationSession = {
            id: Date.now().toString(),
            accessToken: token,
            account: {
                label: 'NowCoder User',
                id: Date.now().toString()
            },
            scopes: []
        };

        this.sessionChangeEmitter.fire({
            added: [session],
            removed: [],
            changed: []
        });

        await this.context.secrets.store(NowcoderAuthenticationProvider.id, token);
        return session;
    }

    async removeSession(sessionId: string): Promise<void> {
        const token = await this.context.secrets.get(NowcoderAuthenticationProvider.id);
        if (!token) {
            return;
        }
        await this.context.secrets.delete(NowcoderAuthenticationProvider.id);
        const session = this.token2Session(token);
        this.sessionChangeEmitter.fire({
            added: [],
            removed: [session],
            changed: []
        });
    }

    private token2Session(token: string): vscode.AuthenticationSession {
        return {
            id: NowcoderAuthenticationProvider.id,
            accessToken: token,
            account: {
                label: NowcoderAuthenticationProvider.id,
                id: NowcoderAuthenticationProvider.id
            },
            scopes: []
        };
    }

    static async clearToken(context: vscode.ExtensionContext) {
        await context.secrets.delete(NowcoderAuthenticationProvider.id);
    };
}