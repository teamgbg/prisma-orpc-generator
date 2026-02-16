import { Project, SourceFile } from 'ts-morph';
import { Config } from '../config/schema';
export declare class ProjectManager {
    private outputDir;
    private project;
    private fileHashes;
    private skipped;
    constructor(outputDir: string);
    cleanOutputDirectory(): Promise<void>;
    private removeDirectory;
    createDirectoryStructure(directories: string[]): Promise<void>;
    createSourceFile(filePath: string, sourceText?: string, options?: {
        overwrite?: boolean;
    }): SourceFile;
    getSourceFile(filePath: string): SourceFile | undefined;
    saveProject(): Promise<void>;
    formatCode(): Promise<void>;
    generateBarrelExports(): Promise<void>;
    private generateBarrelExport;
    generatePackageInfo(_config: Config): Promise<void>;
    getProject(): Project;
    getGenerationStats(): {
        totalFiles: number;
        totalLines: number;
        routerFiles: number;
        schemaFiles: number;
        typeFiles: number;
        skippedWrites?: number;
    };
}
//# sourceMappingURL=project-manager.d.ts.map