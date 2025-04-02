import * as vscode from 'vscode';
import { NowcoderCompiler, COMPILER_CONFIG } from "../models/models";

export class UserInteractiveHelper {
    static async askCompiler() : Promise<NowcoderCompiler | null> {
        const compilerOptions = Object.entries(COMPILER_CONFIG).map(([key, value]) => {
            return { 
                label: value.name, 
                value: key 
            };
        });
        
        const selectedCompiler = await vscode.window.showQuickPick(
            compilerOptions,
            { placeHolder: '请选择编译器' }
        );

        return selectedCompiler ? selectedCompiler.value as NowcoderCompiler : null;
    }
}