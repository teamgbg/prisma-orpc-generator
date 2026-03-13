/**
 * Entry point for the Prisma oRPC generator binary.
 *
 * Handles CLI flags and invokes the generator as a Prisma plugin, producing ORPC routers
 * for scala-hub's API layer that power AI tool CRUD operations.
 */

#!/usr/bin/env node

import { generatorHandler } from '@prisma/generator-helper';
import { generate } from './generators/orpc-generator';
import { displayInfo, checkCompatibility } from './index';

// Show generator info
if (process.argv.includes('--version') || process.argv.includes('-v')) {
  displayInfo();
  process.exit(0);
}

if (process.argv.includes('--check')) {
  const compatibility = checkCompatibility();
  
  if (compatibility.compatible) {
    console.log('✅ Environment is compatible');
  } else {
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
generatorHandler({
  onManifest() {
    return {
      version: '0.0.1',
      defaultOutput: './src/generated/orpc',
      prettyName: 'Prisma oRPC Generator',
      requiresGenerators: ['prisma-client-js'],
    };
  },
  onGenerate: generate,
});