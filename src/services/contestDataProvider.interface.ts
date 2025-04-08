import * as vscode from "vscode";
import { Problem, ProblemExtra, RealtimeRank, SubmissionListItem, SubmissionStatus } from "../models/models";

export interface IContestDataProvider {
    readonly onProblemsUpdated: vscode.Event<Problem[]>;
    readonly onSubmissionStatusChanged: vscode.Event<SubmissionStatus>;
    readonly onSubmissionsUpdated: vscode.Event<SubmissionListItem[]>;
    readonly onRankUpdated: vscode.Event<RealtimeRank | undefined>;

    getProblems(noCache?: boolean): Promise<Problem[]>;
    getProblem(index: string, noCache?: boolean): Promise<Problem | null>;
    getProblemExtra(index: string, noCache?: boolean): Promise<ProblemExtra | undefined>;
    getSubmissions(noCache?: boolean): Promise<SubmissionListItem[]>;
    getRealtimeRank(noCache?: boolean): Promise<RealtimeRank | undefined>;
}