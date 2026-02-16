"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShieldGenerator = void 0;
const path_1 = __importDefault(require("path"));
class ShieldGenerator {
    constructor(config, outputDir, projectManager, logger) {
        this.config = config;
        this.outputDir = outputDir;
        this.projectManager = projectManager;
        this.logger = logger;
    }
    async generateShield(models) {
        if (!this.config.generateShield) {
            this.logger.debug('Shield generation disabled, skipping...');
            return;
        }
        // If user provided a custom shield path, skip auto-generation
        if (this.config.shieldPath) {
            this.logger.debug(`Using custom shield from: ${this.config.shieldPath}`);
            return;
        }
        try {
            this.logger.debug('Generating oRPC Shield rules...');
            const shieldFile = this.projectManager.createSourceFile(path_1.default.resolve(this.outputDir, 'shield.ts'), undefined, { overwrite: true });
            await this.generateShieldContent(shieldFile, models);
            shieldFile.formatText({ indentSize: 2 });
            this.logger.debug('Shield rules generated successfully');
        }
        catch (error) {
            this.logger.error(`Failed to generate shield file: ${error instanceof Error ? error.message : error}`);
            throw error;
        }
    }
    async generateShieldContent(sourceFile, models) {
        // Add imports
        sourceFile.addImportDeclaration({
            moduleSpecifier: 'orpc-shield',
            namedImports: ['rule', 'allow', 'deny', 'shield'],
        });
        sourceFile.addImportDeclaration({
            moduleSpecifier: './routers/helpers/createRouter',
            isTypeOnly: true,
            namedImports: ['Context'],
        });
        // Generate built-in rules
        const builtInRules = this.generateBuiltInRules();
        sourceFile.addStatements(builtInRules);
        // Generate model-specific rules
        const modelRules = this.generateModelRules(models);
        sourceFile.addStatements(modelRules);
        // Generate the shield configuration
        const shieldConfig = this.generateShieldConfig(models);
        sourceFile.addStatements(shieldConfig);
    }
    generateBuiltInRules() {
        const rules = [];
        // Only include basic authentication rule - no assumptions about user data structure
        rules.push(`/**
 * Rule that requires user authentication
 * This is the only built-in rule - customize others based on your app's needs
 */
const isAuthenticated = rule<Context>()(({ ctx }) => !!ctx.user);`);
        return rules.join('\n\n');
    }
    generateModelRules(models) {
        const rules = [];
        for (const model of models) {
            const modelRules = this.generateRulesForModel(model);
            if (modelRules) {
                rules.push(modelRules);
            }
        }
        return rules.join('\n\n');
    }
    generateRulesForModel(model) {
        const rules = [];
        // Read operations rule - explicit handling with secure default
        if (this.config.defaultReadRule === 'auth') {
            rules.push(`const canRead${model.name} = isAuthenticated;`);
        }
        else if (this.config.defaultReadRule === 'deny') {
            rules.push(`const canRead${model.name} = deny;`);
        }
        else if (this.config.defaultReadRule === 'allow') {
            rules.push(`const canRead${model.name} = allow;`);
        }
        else {
            // Secure default for unrecognized values
            rules.push(`const canRead${model.name} = deny;`);
        }
        // Write operations rule - explicit handling with secure default
        if (this.config.defaultWriteRule === 'auth') {
            rules.push(`const canWrite${model.name} = isAuthenticated;`);
        }
        else if (this.config.defaultWriteRule === 'deny') {
            rules.push(`const canWrite${model.name} = deny;`);
        }
        else if (this.config.defaultWriteRule === 'allow') {
            rules.push(`const canWrite${model.name} = allow;`);
        }
        else {
            // Secure default for unrecognized values
            rules.push(`const canWrite${model.name} = deny;`);
        }
        return rules.length > 0 ? `// Rules for ${model.name} model\n${rules.join('\n')}` : '';
    }
    generateShieldConfig(models) {
        const shieldRules = [];
        for (const model of models) {
            const modelShield = this.generateModelShieldConfig(model);
            if (modelShield) {
                shieldRules.push(modelShield);
            }
        }
        const shieldOptions = this.generateShieldOptions();
        return `
/**
 * Main shield configuration with rules for all models
 * Generated based on Prisma schema and configuration
 */
export const permissions = shield<Context>({
${shieldRules.join(',\n')}
}${shieldOptions});

/**
 * Type definition for the shield permissions
 */
export type Permissions = typeof permissions;
`;
    }
    toLowerCamelCase(name) {
        return name ? name.charAt(0).toLowerCase() + name.slice(1) : name;
    }
    generateModelShieldConfig(model) {
        const modelName = this.toLowerCamelCase(model.name);
        const operations = [];
        // Map Prisma operations to shield rules
        const operationMappings = {
            findMany: 'list',
            findUnique: 'findUnique',
            findFirst: 'findFirst',
            create: 'create',
            createMany: 'createMany',
            update: 'update',
            updateMany: 'updateMany',
            upsert: 'upsert',
            delete: 'delete',
            deleteMany: 'deleteMany',
            count: 'count',
            aggregate: 'aggregate',
            groupBy: 'groupBy',
        };
        // Generate rules for each operation
        for (const [prismaOp, shieldOp] of Object.entries(operationMappings)) {
            if (this.isWriteOperation(prismaOp)) {
                operations.push(`    ${shieldOp}: canWrite${model.name}`);
            }
            else {
                operations.push(`    ${shieldOp}: canRead${model.name}`);
            }
        }
        return `  ${modelName}: {
${operations.join(',\n')}
  }`;
    }
    isWriteOperation(operation) {
        const writeOps = [
            'create',
            'createMany',
            'update',
            'updateMany',
            'upsert',
            'delete',
            'deleteMany',
        ];
        return writeOps.includes(operation);
    }
    generateShieldOptions() {
        const options = [];
        if (this.config.denyErrorCode !== 'FORBIDDEN') {
            options.push(`denyErrorCode: '${this.config.denyErrorCode}'`);
        }
        if (this.config.debug) {
            options.push('debug: true');
        }
        if (this.config.allowExternalErrors) {
            options.push('allowExternalErrors: true');
        }
        return options.length > 0 ? `, {\n  ${options.join(',\n  ')}\n}` : '';
    }
}
exports.ShieldGenerator = ShieldGenerator;
//# sourceMappingURL=shield-generator.js.map