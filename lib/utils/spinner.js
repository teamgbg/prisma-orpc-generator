"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSpinner = createSpinner;
function createSpinner(enabled = false) {
    const rawLevel = (process.env.ORPC_LOG_LEVEL || process.env.ORPC_LOG || "")
        .toString()
        .toLowerCase();
    const dbg = (process.env.ORPC_DEBUG || process.env.DEBUG || "").toString().toLowerCase();
    const spinnerEnv = (process.env.ORPC_SPINNER || "").toString().toLowerCase();
    const explicitlyDisable = spinnerEnv === "false" ||
        rawLevel === "silent" ||
        rawLevel === "none" ||
        rawLevel === "0" ||
        rawLevel === "off";
    const explicitlyEnable = spinnerEnv === "true" ||
        dbg.includes("orpc") ||
        rawLevel === "info" ||
        rawLevel === "debug" ||
        rawLevel === "warn" ||
        rawLevel === "1" ||
        rawLevel === "true";
    const canLog = explicitlyDisable ? false : enabled || explicitlyEnable;
    let text = "";
    let state = "idle";
    const log = (prefix, t) => {
        if (!canLog)
            return;
        const msg = t ?? text;
        if (msg) {
            console.log(`${prefix} ${msg}`);
        }
    };
    return {
        get text() {
            return text;
        },
        set text(v) {
            text = v;
            if (state === "running")
                log("⏳");
        },
        start(t) {
            state = "running";
            if (t)
                text = t;
            log("⏳", t);
        },
        stop() {
            state = "stopped";
        },
        succeed(t) {
            state = "stopped";
            log("✅", t);
        },
        fail(t) {
            state = "stopped";
            log("❌", t);
        },
    };
}
//# sourceMappingURL=spinner.js.map