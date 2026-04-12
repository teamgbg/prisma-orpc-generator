"use strict";
/**
 * @system prisma-orpc-generator
 * @status handwritten
 * @edit edit directly

 * Generates test utilities: mock context, test server, vitest config, tsconfig, and setup files.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestUtilsGenerator = void 0;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
class TestUtilsGenerator {
    constructor(outputDir, projectManager) {
        this.outputDir = outputDir;
        this.projectManager = projectManager;
    }
    async generate(models) {
        await this.generateMockContext(models);
        await this.generateTestServer();
        await this.generateVitestConfig();
        await this.generateTsProjectConfig();
        await this.generateTestTypes();
        await this.generateTestSetup();
    }
    async generateMockContext(models) {
        const mockContextFile = this.projectManager.createSourceFile(node_path_1.default.join(this.outputDir, "tests", "utils", "mock-context.ts"), undefined, { overwrite: true });
        mockContextFile.addStatements(`
import { vi } from 'vitest';

export interface MockPrismaClient {
  [key: string]: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    aggregate: ReturnType<typeof vi.fn>;
    groupBy: ReturnType<typeof vi.fn>;
  };
}

export interface MockContext {
  prisma: MockPrismaClient;
  user?: { id: string; [key: string]: unknown } | null;
  request?: {
    ip?: string;
    headers?: Record<string, string>;
    requestId?: string;
    correlationId?: string;
  };
}

/**
 * Create a mock context for testing
 */
export function createMockContext(): MockContext {
  return {
    prisma: createMockPrisma(),
    user: null,
    request: {
      ip: '127.0.0.1',
      headers: {},
    },
  };
}

/**
 * Create a mock Prisma client
 */
function createMockPrisma(): MockPrismaClient {
  const models = [${models.map((m) => `'${m.name.toLowerCase()}'`).join(", ")}];
  const mockPrisma: MockPrismaClient = {};
  
  for (const model of models) {
    mockPrisma[model] = {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    };
  }
  
  return mockPrisma;
}
`);
    }
    async generateTestServer() {
        const testServerFile = this.projectManager.createSourceFile(node_path_1.default.join(this.outputDir, "tests", "utils", "test-server.ts"), undefined, { overwrite: true });
        testServerFile.addStatements(`
import { createServer } from 'http';
 
/**
 * Create a minimal test server for integration testing
 * Note: We intentionally avoid external deps here since integration tests
 * currently don't perform real RPC calls (requests are commented out).
 */
export interface TestServer {
  server: import('http').Server;
  port: number;
  close: () => Promise<void>;
}
export async function createTestServer(_router: any): Promise<TestServer> {
  const server = createServer(async (_req, res) => {
    // Always return 404 for now; integration tests don't make requests yet.
    res.statusCode = 404;
    res.end('Not Found');
  });
 
  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to start test server'));
        return;
      }
 
      resolve({
        server,
        port: address.port,
        close: () => new Promise<void>((resolveClose) => {
          server.close(() => resolveClose());
        })
      });
    });
  });
}
`);
    }
    async generateVitestConfig() {
        const vitestConfig = `import { defineConfig } from 'vitest/config';
 import path from 'path';
 import { fileURLToPath } from 'url';
 
 const root = path.dirname(fileURLToPath(import.meta.url));
 
 export default defineConfig({
   root,
   test: {
     environment: 'node',
     include: ['tests/**/*.test.ts'],
     coverage: {
       include: ['routers/**/*.ts'],
       exclude: ['routers/**/*.test.ts', 'routers/**/index.ts'],
       reporter: ['text', 'lcov', 'html']
     },
     setupFiles: ['tests/setup.ts']
   }
 });`;
        await node_fs_1.promises.writeFile(node_path_1.default.join(this.outputDir, "vitest.config.ts"), vitestConfig);
    }
    async generateTsProjectConfig() {
        const tsconfig = `{
   "compilerOptions": {
     "target": "ES2022",
     "module": "ESNext",
     "moduleResolution": "Bundler",
     "lib": ["ES2022"],
     "strict": true,
     "skipLibCheck": true,
     "esModuleInterop": true,
     "forceConsistentCasingInFileNames": true,
     "resolveJsonModule": true,
     "types": ["vitest", "node"],
     "composite": true
   },
   "include": [
     "routers/**/*.ts",
     "tests/**/*.ts",
     "types/**/*.ts",
     "utils/**/*.ts",
   ]
  }`;
        await node_fs_1.promises.writeFile(node_path_1.default.join(this.outputDir, "tsconfig.json"), tsconfig);
    }
    async generateTestTypes() {
        const file = this.projectManager.createSourceFile(node_path_1.default.join(this.outputDir, "tests", "global.d.ts"), undefined, { overwrite: true });
        file.addStatements(`export {};
declare global {
  // eslint-disable-next-line no-var
  var testUtils: { [key: string]: unknown };
}
`);
    }
    async generateTestSetup() {
        const setupFile = this.projectManager.createSourceFile(node_path_1.default.join(this.outputDir, "tests", "setup.ts"), undefined, { overwrite: true });
        setupFile.addStatements(`export {};
/**
 * Vitest test setup
 */
// Set test environment
process.env.NODE_ENV = 'test';
 
// Initialize global test utils container at runtime
(globalThis as any).testUtils = (globalThis as any).testUtils ?? {};
 
// Mock console methods in tests if needed
// global.console = {
//   ...console,
//   log: vi.fn(),
//   debug: vi.fn(),
//   info: vi.fn(),
//   warn: vi.fn(),
//   error: vi.fn(),
// };
`);
    }
}
exports.TestUtilsGenerator = TestUtilsGenerator;
//# sourceMappingURL=test-utils-generator.js.map