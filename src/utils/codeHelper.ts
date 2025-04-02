import { NowcoderCompiler, COMPILER_CONFIG } from "../models/models";

export class CodeHelper {
    static tryParseComplierInCode(code: string, languageId: string | undefined | null): NowcoderCompiler | undefined {
        languageId = languageId === 'plaintext' ? undefined : languageId;
        
        // Get all unique comment tokens
        const commentTokens = new Set(
            Object.values(COMPILER_CONFIG)
                .filter(config => !languageId || config.languageId === languageId)
                .map(config => config.commentToken)
        );
        
        // Check each line at the beginning of the code
        const lines = code.split('\n');
        for (const line of lines) {
            const trimmedLine = line.trim();
            // Skip empty lines
            if (!trimmedLine) {
                continue;
            }
            
            // Check if the line starts with any comment token
            var isComment = false;
            for (const token of commentTokens) {
                if (!trimmedLine.startsWith(token)) {
                    continue;
                }
                
                // Extract potential compiler name using regex
                const match = trimmedLine.match(new RegExp(`^${token}\\s*Nowcoder Compiler: (.+)$`));
                if (!match || !match[1]) {
                    continue;
                }

                const potentialCompiler = match[1].trim();
                    
                // Look up the compiler name in COMPILER_CONFIG
                for (const [compiler, config] of Object.entries(COMPILER_CONFIG)) {
                    if (config.name.toLowerCase() === potentialCompiler.toLowerCase()) {
                        return compiler as NowcoderCompiler;
                    }
                }
                isComment = true;
                break; // We found a comment token but no matching compiler
            }
            
            // If we've processed a non-comment line, stop checking
            if (!isComment) {
                break;
            }
        }
        
        return undefined;
    }
}

