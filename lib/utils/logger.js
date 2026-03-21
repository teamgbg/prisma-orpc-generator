"use strict";
/**
 * Structured logger for oRPC generator with chalk formatting.
 *
 * Provides leveled logging during generation of scala-hub ORPC routers,
 * respecting ORPC_LOG_LEVEL environment variables.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.LogLevel = void 0;
const chalk_1 = __importDefault(require("chalk"));
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["ERROR"] = 0] = "ERROR";
    LogLevel[LogLevel["WARN"] = 1] = "WARN";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 3] = "DEBUG";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    constructor(enableDebugLogging = false) {
        // Performance timing
        this.timers = new Map();
        this.level = this.resolveLevel(enableDebugLogging);
    }
    setLevel(level) {
        this.level = level;
    }
    getLevel() {
        return this.level;
    }
    resolveLevel(enableDebugLogging) {
        // Env-based overrides (quiet by default unless explicitly enabled)
        const raw = (process.env.ORPC_LOG_LEVEL || process.env.ORPC_LOG || "").toString().toLowerCase();
        const dbg = (process.env.ORPC_DEBUG || process.env.DEBUG || "").toString().toLowerCase();
        if (raw) {
            switch (raw) {
                case "silent":
                case "none":
                    return (LogLevel.ERROR - 1); // below ERROR = effectively silent for this logger
                case "error":
                    return LogLevel.ERROR;
                case "warn":
                case "warning":
                    return LogLevel.WARN;
                case "info":
                    return LogLevel.INFO;
                case "debug":
                    return LogLevel.DEBUG;
                case "1":
                case "true":
                    return LogLevel.INFO; // ORPC_LOG=1 enables info
                default:
                    break;
            }
        }
        if (dbg.includes("orpc"))
            return LogLevel.DEBUG;
        if (enableDebugLogging)
            return LogLevel.DEBUG;
        // Default: be quiet (only errors)
        return LogLevel.ERROR;
    }
    error(message, ...args) {
        if (this.level >= LogLevel.ERROR) {
            console.error(chalk_1.default.red("❌ [ERROR]"), message, ...args);
        }
    }
    warn(message, ...args) {
        if (this.level >= LogLevel.WARN) {
            console.warn(chalk_1.default.yellow("⚠️  [WARN]"), message, ...args);
        }
    }
    info(message, ...args) {
        if (this.level >= LogLevel.INFO) {
            console.log(chalk_1.default.blue("ℹ️  [INFO]"), message, ...args);
        }
    }
    debug(message, ...args) {
        if (this.level >= LogLevel.DEBUG) {
            console.log(chalk_1.default.gray("🐛 [DEBUG]"), message, ...args);
        }
    }
    success(message, ...args) {
        if (this.level >= LogLevel.INFO) {
            console.log(chalk_1.default.green("✅ [SUCCESS]"), message, ...args);
        }
    }
    // Special formatting methods
    logGenerationStart(feature) {
        this.info(chalk_1.default.cyan(`🚀 Generating ${feature}...`));
    }
    logGenerationComplete(feature, duration) {
        const durationText = duration ? ` (${duration}ms)` : "";
        this.success(chalk_1.default.green(`✨ ${feature} generated${durationText}`));
    }
    logStats(stats) {
        this.info(chalk_1.default.cyan("📊 Generation Statistics:"));
        Object.entries(stats).forEach(([key, value]) => {
            this.info(chalk_1.default.gray(`   ${key}: ${value}`));
        });
    }
    // Pretty print JSON objects
    logObject(label, obj) {
        if (this.level >= LogLevel.DEBUG) {
            console.log(chalk_1.default.blue(`🔍 [${label}]`));
            console.log(JSON.stringify(obj, null, 2));
        }
    }
    // Progress tracking
    logProgress(current, total, item) {
        const percentage = Math.round((current / total) * 100);
        const itemText = item ? ` (${item})` : "";
        this.info(chalk_1.default.cyan(`⏳ Progress: ${current}/${total} (${percentage}%)${itemText}`));
    }
    // Error with suggestions
    errorWithSuggestion(message, suggestion) {
        this.error(message);
        console.log(chalk_1.default.yellow("💡 Suggestion:"), suggestion);
    }
    startTimer(label) {
        this.timers.set(label, Date.now());
        this.debug(`⏱️  Started timer: ${label}`);
    }
    endTimer(label) {
        const startTime = this.timers.get(label);
        if (!startTime) {
            this.warn(`Timer '${label}' was not started`);
            return 0;
        }
        const duration = Date.now() - startTime;
        this.timers.delete(label);
        this.debug(`⏱️  Timer '${label}' completed: ${duration}ms`);
        return duration;
    }
    // Box formatting for important messages
    logBox(title, content) {
        const maxLength = Math.max(title.length, ...content.map((line) => line.length));
        const boxWidth = Math.max(50, maxLength + 4);
        const border = "═".repeat(boxWidth - 2);
        const emptyLine = " ".repeat(boxWidth - 2);
        console.log(chalk_1.default.cyan(`╔${border}╗`));
        console.log(chalk_1.default.cyan(`║${title.padStart((boxWidth - title.length) / 2 + title.length).padEnd(boxWidth - 2)}║`));
        console.log(chalk_1.default.cyan(`║${emptyLine}║`));
        content.forEach((line) => {
            console.log(chalk_1.default.cyan(`║ ${line.padEnd(boxWidth - 4)} ║`));
        });
        console.log(chalk_1.default.cyan(`╚${border}╝`));
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map