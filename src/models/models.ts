/**
 * 比赛信息
 */
export interface Contest {
    id: number;
    name?: string;
}

export interface Response<T> {
    msg: string;
    code: number;
    data: T;
}

/**
 * 通用结果包装类型
 */
export interface ApiResult<T> {
    data: T | null;
    error?: string;
    success: boolean;
}

/**
 * Result工厂方法
 */
export const ApiResult = {
    /**
     * 创建成功结果
     */
    success<T>(data: T): ApiResult<T> {
        return {
            success: true,
            data,
            error: undefined
        };
    },

    /**
     * 创建失败结果
     */
    failure<T>(error: string): ApiResult<T> {
        return {
            success: false,
            data: null,
            error
        };
    }
};

/**
 * 比赛题目列表
 */
export interface ContestProblemList {
    data: ProblemInfo[];
    basicInfo: ContestBasicInfo;
}

/**
 * 比赛基本信息
 */
export interface ContestBasicInfo {
    contestId: number;
    pageCount: number;
    problemCount: number;
    pageSize: number;
    pageCurrent: number;
}

/**
 * 完整题目信息
 */
export interface Problem {
    extra?: ProblemExtra;
    info: ProblemInfo;
}

/**
 * 题目的额外信息
 */
export interface ProblemExtra {
    tagId: string;
    questionId: string;
    subTagId: string;
    doneQuestionId: string;
    content: string;
    examples: ProblemExample[];
}

/**
 * 题目基本信息
 */
export interface ProblemInfo {
    score: number;
    acceptedCount: number;
    submitCount: number;
    tagId: number;
    index: string;
    myStatus: string;
    problemId: number;
    title: string;
    info: Record<string, any>;
}

/**
 * 题目样例
 */
export interface ProblemExample {
    input: string;
    output: string;
    tips: string | null;
}

/**
 * 提交响应
 */
export interface SubmissionResponse {
    msg: string;
    code: number;
    data: number; // submissionId
}

/**
 * 提交状态
 */
export interface SubmissionStatus {
    rightHundredRate: number;
    code: number;
    memo: string;
    allCaseNum?: number;
    language?: string;
    rightCaseNum?: number;
    isSelfTest: boolean;
    judgeReplyDesc: string;
    timeConsumption: number;
    memoryConsumption: number;
    place: number;
    id: number;
    isShowTestCase: boolean;
    desc: string;
    status: number;
    testcaseresults?: string;
    isComplete?: boolean;
}

/**
 * 提交列表API响应
 */
export interface SubmissionList {
    data: SubmissionListItem[];
    isContestFinished: boolean;
    basicInfo: {
        basicUid: number;
        contestId: number;
        pageCount: number;
        pageSize: number;
        statusCount: number;
        searchUserName: string;
        pageCurrent: number;
    }
}

/**
 * 提交列表项目
 */
export interface SubmissionListItem {
    memory?: number;
    length?: number;
    index: string;
    languageCategoryName: string;
    language: string;
    userName: string;
    userId: number;
    colorLevel: number;
    languageName: string;
    isTeam: boolean;
    statusMessage: string;
    submissionId: number;
    submitTime: number;
    time?: number;
    problemId: number;
}

/**
 * 配置文件内容
 */
export interface NowCoderConfig {
    contestId: number;
    problems?: Problem[];
}

/**
 * 支持的编程语言
 */
export enum NowcoderCompiler {
    CPP_CLANG = '2',
    CPP_GCC = '38',
    C_GCC = '39',
    JAVA = '4',
    C = '1',
    PYTHON2 = '5',
    PYTHON3 = '11',
    PYPY2 = '24',
    PYPY3 = '25',
    CSHARP = '9',
    PHP = '8',
    JAVASCRIPT_V8 = '14',
    JAVASCRIPT_NODE = '13',
    R = '16',
    GO = '17',
    RUBY = '19',
    RUST = '27',
    SWIFT = '20',
    OBJC = '10',
    PASCAL = '3',
    MATLAB = '21',
    BASH = '23',
    SCALA = '28',
    KOTLIN = '29',
    GROOVY = '30',
    TYPESCRIPT = '31'
}

/**
 * 语言配置
 */
export interface CompilerConfig {
    id: string;
    name: string;
    ext: string;
    commentToken: string;
    languageId: string;
}

/**
 * 语言配置映射
 */
export const COMPILER_CONFIG: Record<NowcoderCompiler, CompilerConfig> = {
    [NowcoderCompiler.CPP_CLANG]: { id: '2', name: 'C++（clang++18）', ext: 'cpp', commentToken: '//', languageId: 'cpp' },
    [NowcoderCompiler.CPP_GCC]: { id: '38', name: 'C++(g++ 13)', ext: 'cpp', commentToken: '//', languageId: 'cpp' },
    [NowcoderCompiler.C_GCC]: { id: '39', name: 'C(gcc 10)', ext: 'c', commentToken: '//', languageId: 'c' },
    [NowcoderCompiler.JAVA]: { id: '4', name: 'Java', ext: 'java', commentToken: '//', languageId: 'java' },
    [NowcoderCompiler.C]: { id: '1', name: 'C', ext: 'c', commentToken: '//', languageId: 'c' },
    [NowcoderCompiler.PYTHON2]: { id: '5', name: 'Python2', ext: 'py', commentToken: '#', languageId: 'python' },
    [NowcoderCompiler.PYTHON3]: { id: '11', name: 'Python3', ext: 'py', commentToken: '#', languageId: 'python' },
    [NowcoderCompiler.PYPY2]: { id: '24', name: 'pypy2', ext: 'py', commentToken: '#', languageId: 'python' },
    [NowcoderCompiler.PYPY3]: { id: '25', name: 'pypy3', ext: 'py', commentToken: '#', languageId: 'python' },
    [NowcoderCompiler.CSHARP]: { id: '9', name: 'C#', ext: 'cs', commentToken: '//', languageId: 'csharp' },
    [NowcoderCompiler.PHP]: { id: '8', name: 'PHP', ext: 'php', commentToken: '//', languageId: 'php' },
    [NowcoderCompiler.JAVASCRIPT_V8]: { id: '14', name: 'JavaScript V8', ext: 'js', commentToken: '//', languageId: 'javascript' },
    [NowcoderCompiler.JAVASCRIPT_NODE]: { id: '13', name: 'JavaScript Node', ext: 'js', commentToken: '//', languageId: 'javascript' },
    [NowcoderCompiler.R]: { id: '16', name: 'R', ext: 'r', commentToken: '#', languageId: 'r' },
    [NowcoderCompiler.GO]: { id: '17', name: 'Go', ext: 'go', commentToken: '//', languageId: 'go' },
    [NowcoderCompiler.RUBY]: { id: '19', name: 'Ruby', ext: 'rb', commentToken: '#', languageId: 'ruby' },
    [NowcoderCompiler.RUST]: { id: '27', name: 'Rust', ext: 'rs', commentToken: '//', languageId: 'rust' },
    [NowcoderCompiler.SWIFT]: { id: '20', name: 'Swift', ext: 'swift', commentToken: '//', languageId: 'swift' },
    [NowcoderCompiler.OBJC]: { id: '10', name: 'ObjC', ext: 'm', commentToken: '//', languageId: 'objectivec' },
    [NowcoderCompiler.PASCAL]: { id: '3', name: 'Pascal', ext: 'pas', commentToken: '//', languageId: 'pascal' },
    [NowcoderCompiler.MATLAB]: { id: '21', name: 'matlab', ext: 'm', commentToken: '%', languageId: 'matlab' },
    [NowcoderCompiler.BASH]: { id: '23', name: 'bash', ext: 'sh', commentToken: '#', languageId: 'shellscript' },
    [NowcoderCompiler.SCALA]: { id: '28', name: 'Scala', ext: 'scala', commentToken: '//', languageId: 'scala' },
    [NowcoderCompiler.KOTLIN]: { id: '29', name: 'Kotlin', ext: 'kt', commentToken: '//', languageId: 'kotlin' },
    [NowcoderCompiler.GROOVY]: { id: '30', name: 'Groovy', ext: 'groovy', commentToken: '//', languageId: 'groovy' },
    [NowcoderCompiler.TYPESCRIPT]: { id: '31', name: 'TypeScript', ext: 'ts', commentToken: '//', languageId: 'typescript' }
};

/**
 * 提交状态代码
 */
export enum SubmissionStatusCode {
    WAITING = 0,
    RIGHT_ANSWER = 5,
    WRONG_ANSWER = 4,
    COMPILE_ERROR = 12
}

export interface CphProb {
    name: string;
    url: string;
    tests: CphTest[];
    interactive: boolean;
    memoryLimit: number;
    timeLimit: number;
    srcPath: string;
    group: string;
    local: boolean;
}

export interface CphTest {
    id: number;
    input: string;
    output: string;
}

export enum CphSupportedLanguage {
    C = 'C',
    CPP = 'CPP_CLANG',
    CSHARP = 'CSHARP',
    RUST = 'RUST',
    GO = 'GO',
    HASKELL = 'HASKELL',
    PYTHON = 'PYTHON3',
    RUBY = 'RUBY',
    JAVA = 'JAVA',
    JAVASCRIPT = 'JAVASCRIPT_NODE'
}