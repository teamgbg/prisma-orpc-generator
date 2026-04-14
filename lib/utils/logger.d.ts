/**
 * Structured logger for oRPC generator with chalk formatting.
 *
 * Provides leveled logging during generation of scala-hub ORPC routers,
 * respecting ORPC_LOG_LEVEL environment variables.
 */
export declare enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3
}
type LoggableValue = string | number | boolean | null | undefined | object | unknown;
export declare class Logger {
    private level;
    constructor(enableDebugLogging?: boolean);
    setLevel(level: LogLevel): void;
    getLevel(): LogLevel;
    private resolveLevel;
    error(message: string, ...args: LoggableValue[]): void;
    warn(message: string, ...args: LoggableValue[]): void;
    info(message: string, ...args: LoggableValue[]): void;
    debug(message: string, ...args: LoggableValue[]): void;
    success(message: string, ...args: LoggableValue[]): void;
    logGenerationStart(feature: string): void;
    logGenerationComplete(feature: string, duration?: number): void;
    logStats(stats: Record<string, LoggableValue>): void;
    logObject(label: string, obj: Record<string, LoggableValue> | LoggableValue): void;
    logProgress(current: number, total: number, item?: string): void;
    errorWithSuggestion(message: string, suggestion: string): void;
    private timers;
    startTimer(label: string): void;
    endTimer(label: string): number;
    logBox(title: string, content: string[]): void;
}
export {};
//# sourceMappingURL=logger.d.ts.map