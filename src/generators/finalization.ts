/**
 * @system prisma-orpc-generator
 * @status handwritten
 * @edit edit directly

 * Handles finalization: saving project, generating barrel exports, package info, and config.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import type { Config } from "../config/schema";
import type { Logger } from "../utils/logger";
import type { ProjectManager } from "../utils/project-manager";
import type { SpinnerLike } from "../utils/spinner";

export class FinalizationStrategy {
	constructor(
		private config: Config,
		private outputDir: string,
		private projectManager: ProjectManager,
		private logger: Logger,
		private spinner: SpinnerLike,
	) {}

	async finalize(): Promise<void> {
		this.spinner.text = "Finalizing generation...";

		await this.projectManager.saveProject();

		if (this.config.useBarrelExports) {
			await this.projectManager.generateBarrelExports();
		}

		await this.projectManager.generatePackageInfo(this.config);

		this.logger.debug("Generation finalization completed");

		await this.writeEffectiveConfig();
	}

	private async writeEffectiveConfig(): Promise<void> {
		try {
			const effectivePath = path.join(this.outputDir, "config-effective.json");
			await fs.writeFile(effectivePath, JSON.stringify(this.config, null, 2), "utf8");
		} catch (e) {
			this.logger.error("Failed to write config-effective.json", e);
		}
	}
}
