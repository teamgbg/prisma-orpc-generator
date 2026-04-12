"use strict";
/**
 * @system prisma-orpc-generator
 * @status handwritten
 * @edit edit directly

 * Generates integration tests for the complete API.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationTestGenerator = void 0;
const node_path_1 = __importDefault(require("node:path"));
class IntegrationTestGenerator {
    constructor(outputDir, projectManager) {
        this.outputDir = outputDir;
        this.projectManager = projectManager;
    }
    async generate(models) {
        const integrationTestFile = this.projectManager.createSourceFile(node_path_1.default.join(this.outputDir, "tests", "integration", "api.test.ts"), undefined, { overwrite: true });
        integrationTestFile.addStatements(`
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createORPCClient } from '@orpc/client';
import { appRouter, type AppRouter } from '../../routers';
import { createTestServer, type TestServer } from '../utils/test-server';
import type { NestedClient } from '@orpc/client';

describe('API Integration Tests', () => {
  let server: TestServer;
  let client: NestedClient<AppRouter>;
  let baseUrl: string;

  beforeAll(async () => {
    server = await createTestServer(appRouter);
    baseUrl = \`http://localhost:\${server.port}\`;
    client = createORPCClient({
      call: async (path, input) => {
        const response = await fetch(\`\${baseUrl}/\${path.join('/')}\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input)
        });
        return response.json();
      }
    });
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    // await cleanupDatabase();
  });

${models
            .map((model) => `
  describe('${model.name} API', () => {
    it('should create, read, update, and delete ${model.name}', async () => {
      // Create
      const createData = ${JSON.stringify(this.generateTestData(model), null, 6)};
      
      // TODO: Implement actual integration test
      // const created = await client.${model.name.charAt(0).toLowerCase() + model.name.slice(1)}.create(createData);
      // expect(created.success).toBe(true);
      // expect(created.data).toMatchObject(createData);
      
      // Read
      // const found = await client.${model.name.charAt(0).toLowerCase() + model.name.slice(1)}.findUnique({ id: created.data.id });
      // expect(found.success).toBe(true);
      // expect(found.data).toMatchObject(createData);
      
      // Update
      // TODO: Implement update test
      // const updateData = { /* sample data */ };
      // const updated = await client.${model.name.charAt(0).toLowerCase() + model.name.slice(1)}.update({ 
      //   where: { id: created.data.id },
      //   data: updateData 
      // });
      // expect(updated.success).toBe(true);
      // expect(updated.data).toMatchObject(updateData);
      
      // Delete
      // const deleted = await client.${model.name.charAt(0).toLowerCase() + model.name.slice(1)}.delete({ id: created.data.id });
      // expect(deleted.success).toBe(true);
    });

    it('should handle list operations with pagination', async () => {
      // TODO: Implement pagination test
      // const result = await client.${model.name.charAt(0).toLowerCase() + model.name.slice(1)}.findMany({ take: 10, skip: 0 });
      // expect(result.success).toBe(true);
      // expect(result.meta.pagination).toBeDefined();
    });
  });`)
            .join("\n")}

  describe('Error Handling', () => {
    it('should return proper error format for validation errors', async () => {
      // TODO: Implement error handling test
    });

    it('should return proper error format for not found errors', async () => {
      // TODO: Implement not found test
    });


  });
});
`);
        integrationTestFile.formatText({ indentSize: 2 });
    }
    generateTestData(model, seed = 1) {
        const data = {};
        for (const field of model.fields) {
            if (field.isId)
                continue;
            if (field.isReadOnly)
                continue;
            switch (field.type) {
                case "String":
                    if (field.name.toLowerCase().includes("email")) {
                        data[field.name] = `test${seed}@example.com`;
                    }
                    else if (field.name.toLowerCase().includes("name")) {
                        data[field.name] = `Test ${field.name} ${seed}`;
                    }
                    else {
                        data[field.name] = `test_${field.name}_${seed}`;
                    }
                    break;
                case "Int":
                    data[field.name] = seed;
                    break;
                case "Float":
                case "Decimal":
                    data[field.name] = seed * 1.5;
                    break;
                case "Boolean":
                    data[field.name] = seed % 2 === 0;
                    break;
                case "DateTime":
                    data[field.name] = new Date().toISOString();
                    break;
                default:
                    if (!field.isOptional) {
                        data[field.name] = `test_${field.name}_${seed}`;
                    }
            }
        }
        return data;
    }
}
exports.IntegrationTestGenerator = IntegrationTestGenerator;
//# sourceMappingURL=integration-test-generator.js.map