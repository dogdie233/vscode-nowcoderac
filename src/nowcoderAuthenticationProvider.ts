import * as vscode from 'vscode';

class NowcoderAuthenticationProvider implements vscode.AuthenticationProvider {
    private sessions: vscode.AuthenticationSession[] = [];
    private readonly sessionChangeEmitter = new vscode.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>();

    onDidChangeSessions = this.sessionChangeEmitter.event;

    constructor(private readonly context: vscode.ExtensionContext) {}

    async getSessions(scopes?: string[]): Promise<vscode.AuthenticationSession[]> {
        return this.sessions;
    }

    async createSession(scopes: string[]): Promise<vscode.AuthenticationSession> {
        const cookieStr = await vscode.window.showInputBox({
            prompt: '请输入NowCoder的cookie值',
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

        console.log('NowCoder token:', token);

        const session: vscode.AuthenticationSession = {
            id: Date.now().toString(),
            accessToken: token,
            account: {
                label: 'NowCoder User',
                id: Date.now().toString()
            },
            scopes: []
        };

        this.sessions.push(session);
        this.sessionChangeEmitter.fire({
            added: [session],
            removed: [],
            changed: []
        });

        await this.context.secrets.store(`nowcoderac-${session.id}`, token);
        return session;
    }

    async removeSession(sessionId: string): Promise<void> {
        const sessionIndex = this.sessions.findIndex(s => s.id === sessionId);
        if (sessionIndex > -1) {
            const session = this.sessions[sessionIndex];
            this.sessions.splice(sessionIndex, 1);
            this.sessionChangeEmitter.fire({
                added: [],
                removed: [session],
                changed: []
            });
            await this.context.secrets.delete(`nowcoderac-${sessionId}`);
        }
    }
}

export { NowcoderAuthenticationProvider as NowCoderAuthenticationProvider };