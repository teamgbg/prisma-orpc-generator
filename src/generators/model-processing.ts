/**
 * @system prisma-orpc-generator
 * @status handwritten
 * @edit edit directly

 * Processes Prisma models: resolves comments, enhances with metadata, filters hidden models.
 */

import type { DMMF } from "@prisma/generator-helper";
import type { Config } from "../config/schema";
import type { PrismaModel } from "../types/generator-types";
import type { Logger } from "../utils/logger";
import type { SpinnerLike } from "../utils/spinner";
import {
	convertDMMFModelsToPrismaModels,
	enhanceModelsWithMetadata,
	resolveModelsComments,
} from "../utils/model-utils";

export class ModelProcessingStrategy {
	constructor(
		private config: Config,
		private logger: Logger,
		private spinner: SpinnerLike,
	) {}

	process(dmmf: DMMF.Document): PrismaModel[] {
		this.spinner.text = "Processing Prisma models...";

		const models = [...dmmf.datamodel.models];
		const hiddenModels: string[] = [];

		resolveModelsComments(models, hiddenModels);
		const enhancedModels = enhanceModelsWithMetadata(models, this.config);

		const visibleModels = enhancedModels.filter((model) => !hiddenModels.includes(model.name));

		const convertedModels = convertDMMFModelsToPrismaModels(visibleModels);

		this.logger.debug(
			`Processed ${convertedModels.length} visible models (${hiddenModels.length} hidden)`,
		);
		return convertedModels;
	}
}
