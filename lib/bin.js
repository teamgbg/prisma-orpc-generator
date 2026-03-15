"use strict";
/**
 * Entry point for the Prisma oRPC generator binary in scala-hub.
 *
 * Handles CLI flags and invokes generation of ORPC routers from Prisma schema,
 * powering AI tool CRUD operations delegated to scala-hub-tool-mcp.
 */
Object.defineProperty(exports, "__esModule", { value: true });
!/usr/bin / env;
node;
const generator_helper_1 = require("@prisma/generator-helper");
const orpc_generator_1 = require("./generators/orpc-generator");
const index_1 = require("./index");
// Show generator info
if (process.argv.includes('--version') || process.argv.includes('-v')) {
    (0, index_1.displayInfo)();
    process.exit(0);
}
if (process.argv.includes('--check')) {
    const compatibility = (0, index_1.checkCompatibility)();
    if (compatibility.compatible) {
        console.log('✅ Environment is compatible');
    }
    else {
        console.log('❌ Compatibility issues found:');
        compatibility.issues.forEach(issue => console.log(`  - ${issue}`));
    }
    if (compatibility.recommendations.length > 0) {
        console.log('💡 Recommendations:');
        compatibility.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }
    process.exit(compatibility.compatible ? 0 : 1);
}
// Main generator handler
(0, generator_helper_1.generatorHandler)({
    onManifest() {
        return {
            version: '0.0.1',
            defaultOutput: './src/generated/orpc',
            prettyName: 'Prisma oRPC Generator',
            requiresGenerators: ['prisma-client-js'],
        };
    },
    onGenerate: orpc_generator_1.generate,
});
//# sourceMappingURL=bin.js.map