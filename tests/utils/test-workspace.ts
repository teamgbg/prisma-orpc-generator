import { spawnSync } from 'child_process';
import crypto from 'crypto';
import { promises as fs, rmSync } from 'fs';
import path from 'path';

/**
 * Creates isolated test workspaces to avoid test collisions
 */
export class TestWorkspace {
  private workspaceId: string;
  private workspacePath: string;
  private projectRoot: string;

  constructor(testName: string) {
    this.projectRoot = path.resolve(__dirname, '../..');
    this.workspaceId = `test-${testName.replace(/[^a-zA-Z0-9]/g, '-')}-${crypto.randomBytes(4).toString('hex')}`;
    this.workspacePath = path.join(this.projectRoot, 'test-workspaces', this.workspaceId);
  }

  async setup(): Promise<string> {
    // Create isolated workspace directory
    await fs.mkdir(this.workspacePath, { recursive: true });
    
    // Create isolated output directories
    await fs.mkdir(path.join(this.workspacePath, 'generated'), { recursive: true });
    await fs.mkdir(path.join(this.workspacePath, 'node_modules'), { recursive: true });
    
    return this.workspacePath;
  }

  async cleanup(): Promise<void> {
    try {
      await fs.rm(this.workspacePath, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
      console.warn(`Failed to cleanup test workspace ${this.workspaceId}:`, error);
    }
  }

  cleanupSync(): void {
    try {
      rmSync(this.workspacePath, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to cleanup test workspace ${this.workspaceId}:`, error);
    }
  }

  async writeSchema(schema: string): Promise<string> {
    const schemaPath = path.join(this.workspacePath, 'schema.prisma');
    await fs.writeFile(schemaPath, schema, 'utf8');
    return schemaPath;
  }

  async writeConfig(options: { datasourceUrl: string }): Promise<string> {
    const configPath = path.join(this.workspacePath, 'prisma.config.ts');
    const contents = `import { defineConfig } from '@prisma/config';

export default defineConfig({
  schema: './schema.prisma',
  datasource: {
    url: '${options.datasourceUrl}',
  },
});
`;
    await fs.writeFile(configPath, contents, 'utf8');
    return configPath;
  }

  async generatePrismaClient(configPath: string): Promise<void> {
    const result = spawnSync('npx', ['prisma', 'generate', '--config', configPath], {
      cwd: this.projectRoot,
      stdio: 'pipe',
      encoding: 'utf8'
    });

    if (result.status !== 0) {
      throw new Error(`Prisma generate failed: ${result.stderr}`);
    }
  }

  async createDatabase(configPath: string): Promise<string> {
    const dbPath = path.join(this.workspacePath, 'test.db');
    
    // Create empty SQLite database
    await fs.writeFile(dbPath, '');
    
    // Push schema to create tables
    const result = spawnSync('npx', ['prisma', 'db', 'push', '--config', configPath], {
      cwd: this.projectRoot,
      stdio: 'pipe',
      encoding: 'utf8'
    });

    if (result.status !== 0) {
      throw new Error(`Prisma db push failed: ${result.stderr}`);
    }
    
    return dbPath;
  }

  getGeneratedPath(): string {
    return path.join(this.workspacePath, 'generated');
  }

  getWorkspacePath(): string {
    return this.workspacePath;
  }

  getWorkspaceId(): string {
    return this.workspaceId;
  }

  /**
   * Dynamically import CommonJS or ES modules from the workspace
   */
  async importModule(modulePath: string): Promise<any> {
    const fullPath = path.resolve(this.workspacePath, modulePath);
    
    try {
      // Try dynamic import first (works for both ESM and CJS in Node.js)
      const module = await import(fullPath);
      return module;
    } catch (importError) {
      try {
        // Fallback to require for CommonJS
        delete require.cache[fullPath];
        return require(fullPath);
      } catch (requireError) {
        throw new Error(
          `Failed to import module ${modulePath}: ` +
          `Import error: ${importError.message}, ` +
          `Require error: ${requireError.message}`
        );
      }
    }
  }
}

/**
 * Global test workspace cleanup on process exit
 */
const activeWorkspaces = new Set<TestWorkspace>();

export function registerWorkspace(workspace: TestWorkspace): void {
  activeWorkspaces.add(workspace);
}

export function unregisterWorkspace(workspace: TestWorkspace): void {
  activeWorkspaces.delete(workspace);
}

// Cleanup on process exit
process.on('exit', () => {
  for (const workspace of activeWorkspaces) {
    try {
      workspace.cleanupSync();
    } catch {
      // Ignore errors during exit cleanup
    }
  }
});

process.on('SIGINT', () => {
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});
