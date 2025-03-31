import * as vscode from 'vscode';

class NowCoderAuthenticationProvider implements vscode.AuthenticationProvider {
    private sessions: vscode.AuthenticationSession[] = [];
    private readonly sessionChangeEmitter = new vscode.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>();

    onDidChangeSessions = this.sessionChangeEmitter.event;

    constructor(private readonly context: vscode.ExtensionContext) {}

    async getSessions(scopes?: string[]): Promise<vscode.AuthenticationSession[]> {
        return this.sessions;
    }

    async createSession(scopes: string[]): Promise<vscode.AuthenticationSession> {
        const cookie = await vscode.window.showInputBox({
            prompt: '请输入NowCoder的cookie值',
            ignoreFocusOut: true,
            password: true
        });

        if (!cookie) {
            throw new Error('Cookie不能为空');
        }

        const session: vscode.AuthenticationSession = {
            id: Date.now().toString(),
            accessToken: cookie,
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

        await this.context.secrets.store(`nowcoderac-${session.id}`, cookie);
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

export { NowCoderAuthenticationProvider };