#!/usr/bin/env node
/**
 * Entry point for the Prisma oRPC generator binary in scala-hub.
 *
 * Handles CLI flags and invokes generation of ORPC routers from Prisma schema,
 * powering AI tool CRUD operations delegated to scala-hub-tool-mcp.
 */

import { generatorHandler } from "@prisma/generator-helper";
import { generate } from "./generators/orpc-generator";
import { checkCompatibility, displayInfo } from "./index";

// Show generator info
if (process.argv.includes("--version") || process.argv.includes("-v")) {
	displayInfo();
	process.exit(0);
}

if (process.argv.includes("--check")) {
	const compatibility = checkCompatibility();

	if (compatibility.compatible) {
		console.log("✅ Environment is compatible");
	} else {
		console.log("❌ Compatibility issues found:");
		for (const issue of compatibility.issues) {
			console.log(`  - ${issue}`);
		}
	}

	if (compatibility.recommendations.length > 0) {
		console.log("💡 Recommendations:");
		for (const rec of compatibility.recommendations) {
			console.log(`  - ${rec}`);
		}
	}

	process.exit(compatibility.compatible ? 0 : 1);
}

// Main generator handler
generatorHandler({
	onManifest() {
		return {
			version: "0.0.1",
			defaultOutput: "./src/generated/orpc",
			prettyName: "Prisma oRPC Generator",
			requiresGenerators: ["prisma-client-js"],
		};
	},
	onGenerate: generate,
});
