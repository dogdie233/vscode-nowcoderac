import path from "path";
import crypto from 'crypto';
import fs from 'fs';
import { CphProb, CphTest, Problem } from "../models/models";
import { ContestManager } from "./contestManager";

export class CphService {
    private contestManager: ContestManager;

    constructor(contestManager: ContestManager) {
        this.contestManager = contestManager;
    }

    /**
     * 获取prob文件路径
     * @param srcFileName 源文件名
     * @returns prob文件路径
     */
    private getProbPath(srcFileName: string) : string | null {
        const contestPath = this.contestManager.getContestFolderPath();
        if (!contestPath) {
            return null;
        }

        const srcPath = path.join(contestPath, srcFileName);
        const hash = crypto
            .createHash('md5')
            .update(srcPath)
            .digest('hex')
            .substr(0);
        const baseProbName = `.${srcFileName}_${hash}.prob`;
        const cphFolder = path.join(contestPath, '.cph');
        return path.join(cphFolder, baseProbName);
    }

    /**
     * 读取现有的prob文件
     * @param srcFileName 源文件名
     * @returns prob模型
     */
    readExistingProb(srcFileName: string) : CphProb | undefined {
        const probPath = this.getProbPath(srcFileName);
        if (!probPath) {
            return undefined;
        }
        try {
            const prob = fs.readFileSync(probPath, 'utf-8');
            const probObj = JSON.parse(prob) as CphProb;
            return probObj;
        } catch (error) {
            console.error(`Error reading prob file: ${error}`);
            return undefined;
        }
    }

    /**
     * 保存prob文件
     * @param srcFileName 源文件名
     * @param prob prob模型
     * @returns 是否成功保存
     */
    saveProb(srcFileName: string, prob: CphProb) : boolean {
        const probPath = this.getProbPath(srcFileName);
        if (!probPath) {
            return false;
        }
        try {
            const probDir = path.dirname(probPath);
            if (!fs.existsSync(probDir)) {
                fs.mkdirSync(probDir, { recursive: true });
            }
            fs.writeFileSync(probPath, JSON.stringify(prob), 'utf-8');
            return true;
        } catch (error) {
            console.error(`Error saving prob file: ${error}`);
            return false;
        }
    }

    /**
     * 创建新的prob文件
     * @param srcFileName 源文件名
     * @param problem 题目模型
     * @returns prob模型
     */
    createProb(srcFileName: string, problem: Problem) : CphProb | null {
        const basePath = this.contestManager.getContestFolderPath();
        if (!basePath) {
            return null;
        }
        const srcPath = path.join(basePath, srcFileName);
        const prob: CphProb = {
            name: problem.info.index + '. ' + problem.info.title,
            url: srcPath,
            tests: [],
            interactive: false,
            timeLimit: 3000,
            memoryLimit: 1024,
            srcPath: srcPath,
            group: "local",
            local: true
        };
        
        if (!problem.extra) {
            return prob;
        }

        const timestamp = new Date().getTime();
        prob.tests = problem.extra.examples.map((example, idx) => {
            const test: CphTest = {
                id: timestamp + idx,
                input: example.input,
                output: example.output
            };
            return test;
        });

        return prob;
    }
}