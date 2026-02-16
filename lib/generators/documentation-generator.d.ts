import { Config } from '../config/schema';
import { Logger } from '../utils/logger';
interface DocumentationField {
    name: string;
    type: string;
    isList?: boolean;
    isOptional?: boolean;
    isId?: boolean;
    isUnique?: boolean;
    isReadOnly?: boolean;
    hasDefaultValue?: boolean;
    isUpdatedAt?: boolean;
    relationName?: string;
    kind?: string;
    documentation?: string;
}
interface DocumentationModel {
    name: string;
    documentation?: string;
    fields: DocumentationField[];
}
export declare class DocumentationGenerator {
    private config;
    private outputDir;
    private logger;
    constructor(config: Config, outputDir: string, logger: Logger);
    generateDocumentation(models: DocumentationModel[]): Promise<void>;
    private generateReadme;
    private generateAPIReference;
    private generateSampleData;
    private generateExampleFields;
    private generateConfigDocumentation;
    private generateSecurityDocumentation;
}
export {};
//# sourceMappingURL=documentation-generator.d.ts.map