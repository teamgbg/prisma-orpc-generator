/**
 * @system prisma-orpc-generator
 * @status handwritten
 * @edit edit directly

 * Handles output directory setup, directory structure creation, and schema drift advisory.
 */

import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { GeneratorOptions } from "@prisma/generator-helper";
import type { Logger } from "../utils/logger";
import type { ProjectManager } from "../utils/project-manager";
import type { SpinnerLike } from "../utils/spinner";

export class SchemaSetupStrategy {
	constructor(
		private options: GeneratorOptions,
		private outputDir: string,
		private projectManager: ProjectManager,
		private logger: Logger,
		private spinner: SpinnerLike,
	) {}

	async setup(): Promise<void> {
		this.spinner.text = "Setting up output directory...";

		await fs.mkdir(this.outputDir, { recursive: true });

		await this.projectManager.cleanOutputDirectory();

		const baseDirs = ["routers", "routers/models", "routers/helpers"];

		await this.projectManager.createDirectoryStructure(baseDirs);

		this.logger.debug("Output directory structure created");

		await this.writeSchemaDriftHash();
	}

	private async writeSchemaDriftHash(): Promise<void> {
		try {
			const datamodel = this.options.datamodel || "";
			const currentHash = crypto.createHash("sha256").update(datamodel).digest("hex");
			const hashFile = path.join(this.outputDir, ".schema-hash");
			let previousHash: string | null = null;
			try {
				previousHash = await fs.readFile(hashFile, "utf8");
			} catch {
				// ignore - first run
			}
			if (previousHash && previousHash !== currentHash) {
				this.logger.info(
					"⚠️  Schema drift advisory: detected Prisma schema change since last generation.",
				);
			}
			await fs.writeFile(hashFile, currentHash, "utf8");
		} catch (e) {
			this.logger.debug("Schema drift advisory skipped:", e);
		}
	}
}
