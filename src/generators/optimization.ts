/**
 * @system prisma-orpc-generator
 * @status handwritten
 * @edit edit directly

 * Handles output optimization such as code formatting.
 */

import type { Config } from "../config/schema";
import type { Logger } from "../utils/logger";
import type { ProjectManager } from "../utils/project-manager";
import type { SpinnerLike } from "../utils/spinner";

export class OptimizationStrategy {
	constructor(
		private config: Config,
		private projectManager: ProjectManager,
		private spinner: SpinnerLike,
		_logger: Logger,
	) {}

	async optimize(): Promise<void> {
		if (this.config.codeStyle === "prettier") {
			this.spinner.text = "Formatting generated code...";
			await this.projectManager.formatCode();
		}
	}
}
