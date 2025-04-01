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
    memory: number;
    length: number;
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
    time: number;
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
export enum ProgrammingLanguage {
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
export interface LanguageConfig {
    id: string;
    name: string;
}

/**
 * 语言配置映射
 */
export const LANGUAGE_CONFIG: Record<ProgrammingLanguage, LanguageConfig> = {
    [ProgrammingLanguage.CPP_CLANG]: { id: '2', name: 'C++（clang++18）' },
    [ProgrammingLanguage.CPP_GCC]: { id: '38', name: 'C++(g++ 13)' },
    [ProgrammingLanguage.C_GCC]: { id: '39', name: 'C(gcc 10)' },
    [ProgrammingLanguage.JAVA]: { id: '4', name: 'Java' },
    [ProgrammingLanguage.C]: { id: '1', name: 'C' },
    [ProgrammingLanguage.PYTHON2]: { id: '5', name: 'Python2' },
    [ProgrammingLanguage.PYTHON3]: { id: '11', name: 'Python3' },
    [ProgrammingLanguage.PYPY2]: { id: '24', name: 'pypy2' },
    [ProgrammingLanguage.PYPY3]: { id: '25', name: 'pypy3' },
    [ProgrammingLanguage.CSHARP]: { id: '9', name: 'C#' },
    [ProgrammingLanguage.PHP]: { id: '8', name: 'PHP' },
    [ProgrammingLanguage.JAVASCRIPT_V8]: { id: '14', name: 'JavaScript V8' },
    [ProgrammingLanguage.JAVASCRIPT_NODE]: { id: '13', name: 'JavaScript Node' },
    [ProgrammingLanguage.R]: { id: '16', name: 'R' },
    [ProgrammingLanguage.GO]: { id: '17', name: 'Go' },
    [ProgrammingLanguage.RUBY]: { id: '19', name: 'Ruby' },
    [ProgrammingLanguage.RUST]: { id: '27', name: 'Rust' },
    [ProgrammingLanguage.SWIFT]: { id: '20', name: 'Swift' },
    [ProgrammingLanguage.OBJC]: { id: '10', name: 'ObjC' },
    [ProgrammingLanguage.PASCAL]: { id: '3', name: 'Pascal' },
    [ProgrammingLanguage.MATLAB]: { id: '21', name: 'matlab' },
    [ProgrammingLanguage.BASH]: { id: '23', name: 'bash' },
    [ProgrammingLanguage.SCALA]: { id: '28', name: 'Scala' },
    [ProgrammingLanguage.KOTLIN]: { id: '29', name: 'Kotlin' },
    [ProgrammingLanguage.GROOVY]: { id: '30', name: 'Groovy' },
    [ProgrammingLanguage.TYPESCRIPT]: { id: '31', name: 'TypeScript' }
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
