import * as vscode from "vscode";
import { IContestDataProvider } from "../services/contestDataProvider.interface";
import { ContestService } from "../services/contestService";
import { ContestSpaceManager } from "../services/contestSpaceManager";
import { Problem, RealtimeRank, SubmissionListItem, SubmissionStatus, ProblemExtra, NowcoderCompiler } from "../models/models";

export class ContestServiceEventWrapper implements IContestDataProvider {
    private readonly _onProblemsUpdated = new vscode.EventEmitter<Problem[]>();
    private readonly _onSubmissionStatusChanged = new vscode.EventEmitter<SubmissionStatus>();
    private readonly _onSubmissionsUpdated = new vscode.EventEmitter<SubmissionListItem[]>();
    private readonly _onRankUpdated = new vscode.EventEmitter<RealtimeRank | undefined>();

    readonly onProblemsUpdated = this._onProblemsUpdated.event;
    readonly onSubmissionStatusChanged = this._onSubmissionStatusChanged.event;
    readonly onSubmissionsUpdated = this._onSubmissionsUpdated.event;
    readonly onRankUpdated = this._onRankUpdated.event;

    private problemUpdatedDisposer: vscode.Disposable | undefined;
    private submissionStatusChangedDisposer: vscode.Disposable | undefined;
    private submissionsUpdatedDisposer: vscode.Disposable | undefined;
    private rankUpdatedDisposer: vscode.Disposable | undefined;

    private service: ContestService | undefined;

    constructor(contestSpaceManager: ContestSpaceManager) {
        contestSpaceManager.onContestSpaceChanged((contestService) => {
            this.rebind(contestService);
        });
        this.rebind(contestSpaceManager.getContestService());
    }

    private rebind(contestService: ContestService | undefined) {
        this.service = contestService;
        this.problemUpdatedDisposer?.dispose();
        this.submissionStatusChangedDisposer?.dispose();
        this.submissionsUpdatedDisposer?.dispose();
        this.rankUpdatedDisposer?.dispose();

        if (contestService) {
            this.problemUpdatedDisposer = contestService.onProblemsUpdated((problems) => {
                this._onProblemsUpdated.fire(problems);
            });

            this.submissionStatusChangedDisposer = contestService.onSubmissionStatusChanged((status) => {
                this._onSubmissionStatusChanged.fire(status);
            });

            this.submissionsUpdatedDisposer = contestService.onSubmissionsUpdated((submissions) => {
                this._onSubmissionsUpdated.fire(submissions);
            });

            this.rankUpdatedDisposer = contestService.onRankUpdated((rank) => {
                this._onRankUpdated.fire(rank);
            });
        }
        this.refireAllEvents();
    }

    private async refireAllEvents() {
        if (this.service) {
            const problems = await this.service.getProblems(true);
            this._onProblemsUpdated.fire(problems);

            const submissions = await this.service.getSubmissions(true);
            this._onSubmissionsUpdated.fire(submissions);

            const rank = await this.service.getRealtimeRank(true);
            this._onRankUpdated.fire(rank);
        } else {
            this._onProblemsUpdated.fire([]);
            this._onSubmissionsUpdated.fire([]);
            this._onRankUpdated.fire(undefined);
        }
    }

    async getProblems(noCache: boolean = false): Promise<Problem[]> {
        return this.service ? await this.service.getProblems(noCache) : [];
    }

    async getProblem(index: string, noCache: boolean = false): Promise<Problem | null> {
        return this.service ? await this.service.getProblem(index, noCache) : null;
    }

    async getProblemExtra(index: string, noCache: boolean = false): Promise<ProblemExtra> {
        if (!this.service) {
            throw new Error("No contest service available");
        }
        return await this.service.getProblemExtra(index, noCache);
    }

    async getSubmissions(noCache: boolean = false): Promise<SubmissionListItem[]> {
        return this.service ? await this.service.getSubmissions(noCache) : [];
    }

    async getRealtimeRank(noCache: boolean = false): Promise<RealtimeRank> {
        if (!this.service) {
            throw new Error("No contest service available");
        }
        return await this.service.getRealtimeRank(noCache);
    }
}