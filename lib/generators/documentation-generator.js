"use strict";
/**
 * Generates Markdown documentation for oRPC APIs.
 *
 * Creates README and reference docs to aid scala-hub developers integrating
 * generated ORPC routers with AI tool definitions.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentationGenerator = void 0;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
class DocumentationGenerator {
    constructor(config, outputDir, logger) {
        this.config = config;
        this.outputDir = outputDir;
        this.logger = logger;
    }
    async generateDocumentation(models) {
        this.logger.debug("Generating documentation...");
        // Ensure documentation directory exists before writing files
        const docsDir = node_path_1.default.join(this.outputDir, "documentation");
        try {
            await node_fs_1.promises.mkdir(docsDir, { recursive: true });
        }
        catch {
            // ignore mkdir errors; subsequent writes will surface issues if any
        }
        await this.generateReadme(models);
        await this.generateAPIReference(models);
        this.logger.debug("Documentation generated");
    }
    async generateReadme(models) {
        const readmeContent = `# ${this.config.apiTitle}

${this.config.apiDescription}

This API was automatically generated from your Prisma schema using **prisma-orpc-generator** - a feature-rich code generator for oRPC.

## 🚀 Quick Start

### 1. Start Your API Server

Make sure your API server is running (refer to your main project's README for server setup instructions).

### 2. Explore the API
- Use the generated oRPC router to interact with your API endpoints.

## 📁 Generated Files Overview

This documentation folder contains everything you need to work with your generated API:

### Documentation Files
- \`README.md\` - This overview (you are here!)
- \`api-reference.md\` - Detailed API documentation with all endpoints

## ✨ Features

This is a simple oRPC API generated from your Prisma schema.


## 📊 Data Models

Your API provides endpoints for the following models:

${models
            .map((model) => `### ${model.name}
${model.documentation ? `${model.documentation}` : `Manage ${model.name} records`}

- **Fields**: ${model.fields.length} (${model.fields.filter((f) => f.isOptional).length} optional)
- **Relations**: ${model.fields.filter((f) => f.relationName).length}
- **Primary Key**: ${model.fields.find((f) => f.isId)?.name || "id"}

**Available Operations:**
- List all records: \`${model.name.toLowerCase()}FindMany\`
- Get by ID: \`${model.name.toLowerCase()}FindUnique\`
- Create new: \`${model.name.toLowerCase()}Create\`
- Update existing: \`${model.name.toLowerCase()}Update\`
- Delete record: \`${model.name.toLowerCase()}Delete\`
`)
            .join("\n")}

## 💻 Usage Examples

### Using oRPC Protocol

\`\`\`typescript
import { router } from './generated/orpc/router';

// Example server usage - router is already generated with your endpoints
// Connect your oRPC router to your server framework of choice

${models.length > 0
            ? `// Available procedures for ${models[0].name} model:
// - ${models[0].name.toLowerCase()}FindMany
// - ${models[0].name.toLowerCase()}FindUnique  
// - ${models[0].name.toLowerCase()}Create
// - ${models[0].name.toLowerCase()}Update
// - ${models[0].name.toLowerCase()}Delete`
            : "// Your generated procedures will appear here"}
\`\`\`

## 🔧 Configuration

${this.generateConfigDocumentation()}

## 🛡️ Security Features

${this.generateSecurityDocumentation()}

## 📡 API Protocol

This API uses oRPC protocol, which provides:
- Type-safe remote procedure calls
- Automatic serialization/deserialization
- Built-in error handling
- Request/response validation
- Streaming support (if enabled)

## 🔄 Development Workflow

1. **Make schema changes** in your \`prisma/schema.prisma\`
2. **Regenerate the API** with \`npx prisma generate\`
3. **Restart the server** with \`npm run dev\`
4. **Update your client code** using the new generated types

## 📖 How to Use This Documentation

### API Reference
The \`api-reference.md\` file contains detailed documentation for all endpoints, including:
- Request/response schemas
- Error codes and handling
- Authentication requirements
- Parameter descriptions

### API Interaction
Use the generated oRPC router and procedures to interact with your API endpoints.

## 📚 Additional Resources

- [oRPC Documentation](https://orpc.unnoq.com/) - Learn about oRPC protocol
- [Prisma Documentation](https://www.prisma.io/docs) - Database toolkit documentation
- [API Reference](./api-reference.md) - Detailed endpoint documentation

---

*Generated with [prisma-orpc-generator](https://github.com/omar-dulaimi/prisma-orpc-generator) ${this.config.apiVersion}*
`;
        await node_fs_1.promises.writeFile(node_path_1.default.join(this.outputDir, "documentation", "README.md"), readmeContent);
    }
    async generateAPIReference(models) {
        const apiRefContent = `
# ${this.config.apiTitle} - API Reference

## Overview

${this.config.apiDescription}

This document provides detailed information about all available API endpoints.

## Models

${models
            .map((model) => `
### ${model.name}

${model.documentation || `The ${model.name} model.`}

#### Fields

${model.fields
            .map((field) => `
- **${field.name}** (${field.type}${field.isList ? "[]" : ""})${field.isOptional ? " - Optional" : ""}${field.isId ? " - Primary Key" : ""}${field.isUnique ? " - Unique" : ""}
  ${field.documentation ? `  - ${field.documentation}` : ""}
`)
            .join("")}

#### Available Operations

- \`GET /${model.name.toLowerCase()}s\` - List all ${model.name} records
- \`GET /${model.name.toLowerCase()}s/{id}\` - Get a specific ${model.name} by ID
- \`POST /${model.name.toLowerCase()}s\` - Create a new ${model.name}
- \`PUT /${model.name.toLowerCase()}s/{id}\` - Update an existing ${model.name}
- \`DELETE /${model.name.toLowerCase()}s/{id}\` - Delete a ${model.name}

`)
            .join("")}

## Error Handling

All errors follow the standard oRPC error format:

\`\`\`json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
\`\`\`

### Common Error Codes

- \`BAD_REQUEST\` - Invalid input data
- \`UNAUTHORIZED\` - Authentication required
- \`FORBIDDEN\` - Insufficient permissions
- \`NOT_FOUND\` - Resource not found
- \`CONFLICT\` - Resource already exists
- \`TOO_MANY_REQUESTS\` - Rate limit exceeded
- \`INTERNAL_SERVER_ERROR\` - Server error

## Response Format

All successful responses follow this format:

\`\`\`json
{
  "success": true,
  "data": {},
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "operation": "create"
  }
}
\`\`\`

For paginated responses:

\`\`\`json
{
  "success": true,
  "data": [],
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 20,
      "pages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
\`\`\`
`;
        await node_fs_1.promises.writeFile(node_path_1.default.join(this.outputDir, "documentation", "api-reference.md"), apiRefContent);
    }
    generateConfigDocumentation() {
        return `
### Server Configuration

- **Port**: ${this.config.serverPort}
- **API Prefix**: ${this.config.apiPrefix || "none"}
- **Base URL**: http://localhost:${this.config.serverPort}${this.config.apiPrefix ? `/${this.config.apiPrefix}` : ""}

### Configuration

No additional features are configured.


`;
    }
    generateSecurityDocumentation() {
        return "No additional security features are configured.";
    }
}
exports.DocumentationGenerator = DocumentationGenerator;
//# sourceMappingURL=documentation-generator.js.map