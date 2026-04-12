/**
 * @system prisma-orpc-generator
 * @status handwritten
 * @edit edit directly

 * Analyzes Prisma schema using DMMF to extract models and their metadata.
 */

import type { DMMF, GeneratorOptions } from "@prisma/generator-helper";
import { getDMMF, parseEnvValue } from "@prisma/internals";
import type { Logger } from "../utils/logger";
import type { SpinnerLike } from "../utils/spinner";

export class SchemaAnalysisStrategy {
	constructor(
		private options: GeneratorOptions,
		private logger: Logger,
		private spinner: SpinnerLike,
	) {}

	async analyze(): Promise<DMMF.Document> {
		this.spinner.text = "Analyzing Prisma schema...";

		const prismaClientProvider = this.options.otherGenerators.find((generator) => {
			const provider = parseEnvValue(generator.provider);
			return provider === "prisma-client-js" || provider === "prisma-client";
		});

		const dmmf = await getDMMF({
			datamodel: this.options.datamodel,
			previewFeatures: prismaClientProvider?.previewFeatures || [],
		});

		this.logger.debug(`Analyzed ${dmmf.datamodel.models.length} models from Prisma schema`);
		return dmmf;
	}
}
