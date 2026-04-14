export interface SpinnerLike {
    start(_text?: string): void;
    stop(): void;
    succeed(_text?: string): void;
    fail(_text?: string): void;
    text: string;
}
export declare function createSpinner(enabled?: boolean): SpinnerLike;
//# sourceMappingURL=spinner.d.ts.map