"use strict";
/**
 * Generates Vitest tests for oRPC routers.
 *
 * Produces unit and integration tests for model procedures, ensuring reliability
 * of scala-hub ORPC endpoints in AI tool execution flows.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestGeneratorFacade = void 0;
const unit_test_generator_1 = require("./unit-test-generator");
const integration_test_generator_1 = require("./integration-test-generator");
const test_utils_generator_1 = require("./test-utils-generator");
class TestGeneratorFacade {
    constructor(outputDir, projectManager) {
        this.outputDir = outputDir;
        this.projectManager = projectManager;
    }
    async generateTests(models) {
        const unitTestGenerator = new unit_test_generator_1.UnitTestGenerator(this.outputDir, this.projectManager);
        const integrationTestGenerator = new integration_test_generator_1.IntegrationTestGenerator(this.outputDir, this.projectManager);
        const testUtilsGenerator = new test_utils_generator_1.TestUtilsGenerator(this.outputDir, this.projectManager);
        await Promise.all([
            unitTestGenerator.generate(models),
            integrationTestGenerator.generate(models),
            testUtilsGenerator.generate(models),
        ]);
    }
}
exports.TestGeneratorFacade = TestGeneratorFacade;
//# sourceMappingURL=test-generator-facade.js.map