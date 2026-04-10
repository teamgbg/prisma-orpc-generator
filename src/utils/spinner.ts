type SpinnerState = "idle" | "running" | "stopped";

export interface SpinnerLike {
	start(_text?: string): void;
	stop(): void;
	succeed(_text?: string): void;
	fail(_text?: string): void;
	text: string;
}

export function createSpinner(enabled: boolean = false): SpinnerLike {
	const rawLevel = (process.env.ORPC_LOG_LEVEL || process.env.ORPC_LOG || "")
		.toString()
		.toLowerCase();
	const dbg = (process.env.ORPC_DEBUG || process.env.DEBUG || "").toString().toLowerCase();
	const spinnerEnv = (process.env.ORPC_SPINNER || "").toString().toLowerCase();

	const explicitlyDisable =
		spinnerEnv === "false" ||
		rawLevel === "silent" ||
		rawLevel === "none" ||
		rawLevel === "0" ||
		rawLevel === "off";

	const explicitlyEnable =
		spinnerEnv === "true" ||
		dbg.includes("orpc") ||
		rawLevel === "info" ||
		rawLevel === "debug" ||
		rawLevel === "warn" ||
		rawLevel === "1" ||
		rawLevel === "true";

	const canLog = explicitlyDisable ? false : enabled || explicitlyEnable;

	let text = "";
	let state: SpinnerState = "idle";
	const log = (prefix: string, t?: string) => {
		if (!canLog) return;
		const msg = t ?? text;
		if (msg) {
			console.log(`${prefix} ${msg}`);
		}
	};
	return {
		get text() {
			return text;
		},
		set text(v: string) {
			text = v;
			if (state === "running") log("⏳");
		},
		start(t?: string) {
			state = "running";
			if (t) text = t;
			log("⏳", t);
		},
		stop() {
			state = "stopped";
		},
		succeed(t?: string) {
			state = "stopped";
			log("✅", t);
		},
		fail(t?: string) {
			state = "stopped";
			log("❌", t);
		},
	};
}
