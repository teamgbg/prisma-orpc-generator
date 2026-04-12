/**
 * @system prisma-orpc-generator
 * @status handwritten
 * @edit edit directly

 * Generates unit tests for individual model routers.
 */

import path from "node:path";
import pluralize from "pluralize";
import type { PrismaModel } from "../types/generator-types";
import type { ProjectManager } from "../utils/project-manager";

export class UnitTestGenerator {
	constructor(
		private outputDir: string,
		private projectManager: ProjectManager,
	) {}

	async generate(models: PrismaModel[]): Promise<void> {
		for (const model of models) {
			await this.generateModelUnitTests(model);
		}
	}

	private async generateModelUnitTests(model: PrismaModel): Promise<void> {
		const testFile = this.projectManager.createSourceFile(
			path.join(this.outputDir, "tests", "unit", `${model.name}.test.ts`),
			undefined,
			{ overwrite: true },
		);

		testFile.addStatements(`
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ${pluralize(model.name.toLowerCase())}Router as modelRouter } from '../../routers/models/${model.name}.router';
import { createMockContext, MockContext } from '../utils/mock-context';

describe('${model.name} Router', () => {
  let mockContext: MockContext;
  let router: any;

  beforeEach(() => {
    mockContext = createMockContext();
    router = modelRouter;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new ${model.name}', async () => {
      const input = ${JSON.stringify(this.generateTestData(model, 1, false, true), null, 6)};
      
      const expectedResult = { id: '1', ...input, ${this.generateTimestampFields()} };
      mockContext.prisma.${model.name.charAt(0).toLowerCase() + model.name.slice(1)}.create.mockResolvedValue(expectedResult);

      const result = await router.${model.name.charAt(0).toLowerCase() + model.name.slice(1)}Create['~orpc'].handler({ input, context: mockContext });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expectedResult);
      expect(mockContext.prisma.${model.name.charAt(0).toLowerCase() + model.name.slice(1)}.create).toHaveBeenCalledWith({
        data: input
      });
    });

  });

  describe('findMany', () => {
    it('should return paginated results', async () => {
      const mockData = [
        { id: '1', ...${JSON.stringify(this.generateTestData(model, 1, false, true), null, 8)}, ${this.generateTimestampFields()} },
        { id: '2', ...${JSON.stringify(this.generateTestData(model, 2, false, true), null, 8)}, ${this.generateTimestampFields()} }
      ];

      mockContext.prisma.${model.name.charAt(0).toLowerCase() + model.name.slice(1)}.findMany.mockResolvedValue(mockData);
      mockContext.prisma.${model.name.charAt(0).toLowerCase() + model.name.slice(1)}.count.mockResolvedValue(2);

      const result = await router.${model.name.charAt(0).toLowerCase() + model.name.slice(1)}FindMany['~orpc'].handler({ 
        input: { take: 10, skip: 0 }, 
        context: mockContext 
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(mockContext.prisma.${model.name.charAt(0).toLowerCase() + model.name.slice(1)}.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0
      });
    });
  });

  describe('findUnique', () => {
    it('should return a single ${model.name}', async () => {
      const mockData = { id: '1', ...${JSON.stringify(this.generateTestData(model, 1, false, true), null, 6)}, ${this.generateTimestampFields()} };
      
      mockContext.prisma.${model.name.charAt(0).toLowerCase() + model.name.slice(1)}.findUnique.mockResolvedValue(mockData);

      const result = await router.${model.name.charAt(0).toLowerCase() + model.name.slice(1)}FindById['~orpc'].handler({ 
        input: { id: '1' }, 
        context: mockContext 
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(mockContext.prisma.${model.name.charAt(0).toLowerCase() + model.name.slice(1)}.findUnique).toHaveBeenCalledWith({
        where: { id: '1' }
      });
    });

    it('should throw NOT_FOUND when ${model.name} does not exist', async () => {
      mockContext.prisma.${model.name.charAt(0).toLowerCase() + model.name.slice(1)}.findUnique.mockResolvedValue(null);

      await expect(
        router.${model.name.charAt(0).toLowerCase() + model.name.slice(1)}FindById['~orpc'].handler({ 
          input: { id: 'non-existent' }, 
          context: mockContext 
        })
      ).rejects.toThrow(/NOT_FOUND|Not Found/);
    });
  });

  describe('update', () => {
    it('should update an existing ${model.name}', async () => {
      const updateData = ${JSON.stringify(this.generateTestData(model, 1, true, true), null, 6)};
      const updatedResult = { id: '1', ...updateData, ${this.generateTimestampFields()} };
      
      mockContext.prisma.${model.name.charAt(0).toLowerCase() + model.name.slice(1)}.update.mockResolvedValue(updatedResult);

      const result = await router.${model.name.charAt(0).toLowerCase() + model.name.slice(1)}Update['~orpc'].handler({ 
        input: { where: { id: '1' }, data: updateData }, 
        context: mockContext 
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedResult);
      expect(mockContext.prisma.${model.name.charAt(0).toLowerCase() + model.name.slice(1)}.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateData
      });
    });
  });

});
`);

		testFile.formatText({ indentSize: 2 });
	}

	private generateTimestampFields(): string {
		return "createdAt: new Date(), updatedAt: new Date()";
	}

	private generateTestData(
		model: PrismaModel,
		seed: number = 1,
		isUpdate: boolean = false,
		skipTimestamps: boolean = false,
	): Record<string, unknown> {
		const data: Record<string, unknown> = {};

		for (const field of model.fields) {
			if (field.isId && !isUpdate) continue;
			if (field.isReadOnly) continue;
			if (isUpdate && field.isId) continue;
			if (skipTimestamps && (field.name === "createdAt" || field.name === "updatedAt")) continue;

			switch (field.type) {
				case "String":
					if (field.name.toLowerCase().includes("email")) {
						data[field.name] = `test${seed}@example.com`;
					} else if (field.name.toLowerCase().includes("name")) {
						data[field.name] = `Test ${field.name} ${seed}`;
					} else {
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
