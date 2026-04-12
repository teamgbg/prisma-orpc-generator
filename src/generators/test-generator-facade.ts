/**
 * Generates Vitest tests for oRPC routers.
 *
 * Produces unit and integration tests for model procedures, ensuring reliability
 * of scala-hub ORPC endpoints in AI tool execution flows.
 */

import type { PrismaModel } from "../types/generator-types";
import type { ProjectManager } from "../utils/project-manager";
import { UnitTestGenerator } from "./unit-test-generator";
import { IntegrationTestGenerator } from "./integration-test-generator";
import { TestUtilsGenerator } from "./test-utils-generator";

export class TestGeneratorFacade {
	constructor(
		private outputDir: string,
		private projectManager: ProjectManager,
	) {}

	async generateTests(models: PrismaModel[]): Promise<void> {
		const unitTestGenerator = new UnitTestGenerator(this.outputDir, this.projectManager);
		const integrationTestGenerator = new IntegrationTestGenerator(this.outputDir, this.projectManager);
		const testUtilsGenerator = new TestUtilsGenerator(this.outputDir, this.projectManager);
		await Promise.all([
			unitTestGenerator.generate(models),
			integrationTestGenerator.generate(models),
			testUtilsGenerator.generate(models),
		]);
	}
}
