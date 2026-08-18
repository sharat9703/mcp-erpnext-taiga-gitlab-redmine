#!/usr/bin/env node

/**
 * MCP ERPNext Server - Main entry point
 * @module index
 *
 * This file is intentionally kept small. It only:
 * 1. Loads configuration
 * 2. Initializes the MCP server
 * 3. Wires up handlers from modular files
 *
 * To add new features:
 * - Add tool definitions in: src/definitions/
 * - Add business logic in: src/tools/
 * - Add handlers in: src/handlers/
 * - Add resources in: src/resources.js
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Internal modules
import { ERPNextClient } from './erpnext-client.js';
import { TOOLS } from './definitions/index.js';
import { createAllHandlers } from './handlers/index.js';
import { RESOURCES, createResourceHandlers } from './resources.js';
import { formatResponse } from './formatters/index.js';

// Load environment variables from DEVFLOW_ENV_FILE if set (the server may be
// installed read-only, e.g. via npx), else from the package root, independent of cwd
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: process.env.DEVFLOW_ENV_FILE || join(__dirname, '..', '.env') });

// Configuration
const config = {
  erpnext: {
    url: process.env.ERPNEXT_URL,
    username: process.env.ERPNEXT_USERNAME,
    password: process.env.ERPNEXT_PASSWORD,
    totpSecret: process.env.ERPNEXT_TOTP_SECRET
  },
  gitlab: {
    url: process.env.GITLAB_URL || 'https://gitlab.credenceanalytics.com',
    token: process.env.GITLAB_TOKEN
  },
  redmine: {
    url: process.env.REDMINE_URL || 'https://support.credenceanalytics.com',
    apiKey: process.env.REDMINE_API_KEY
  },
  taiga: {
    host: process.env.TAIGA_HOST || 'https://api.taiga.io/api/v1',
    token: process.env.TAIGA_TOKEN,
    user: process.env.TAIGA_USER,
    pass: process.env.TAIGA_PASS
  }
};

// Validate required config
if (!config.erpnext.url || !config.erpnext.username || !config.erpnext.password) {
  console.error('Error: ERPNEXT_URL, ERPNEXT_USERNAME, and ERPNEXT_PASSWORD are required');
  console.error('Set them in .env file or environment variables');
  console.error('');
  console.error('Example .env file:');
  console.error('  ERPNEXT_URL=https://your-erpnext-instance.com');
  console.error('  ERPNEXT_USERNAME=your-username');
  console.error('  ERPNEXT_PASSWORD=your-password');
  console.error('  ERPNEXT_TOTP_SECRET=your-totp-secret  # optional, for 2FA');
  console.error('  GITLAB_URL=https://gitlab.example.com  # for software releases');
  console.error('  GITLAB_TOKEN=your-gitlab-token  # for software releases');
  process.exit(1);
}

// Initialize ERPNext client
const erpnext = new ERPNextClient(config.erpnext);

// Create handlers (pass erpnext, gitlab, and redmine config)
const toolHandlers = createAllHandlers(erpnext, config.gitlab, config.redmine, config.taiga);
const resourceHandlers = createResourceHandlers(erpnext);

// Create MCP Server
const server = new Server(
  { name: 'devflow-mcp', version: '1.0.0' },
  { capabilities: { tools: {}, resources: {} } }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const handler = toolHandlers[name];
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    const result = await handler(args);
    return {
      content: [{ type: 'text', text: formatResponse(name, result) }]
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true
    };
  }
});

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return { resources: RESOURCES };
});

// Read resource content
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  try {
    const handler = resourceHandlers[uri];
    if (!handler) {
      throw new Error(`Unknown resource: ${uri}`);
    }

    const content = await handler();
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(content, null, 2)
      }]
    };
  } catch (error) {
    throw new Error(`Failed to read resource: ${error.message}`);
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP ERPNext Server running');
  console.error(`Connected to: ${config.erpnext.url}`);
  if (config.gitlab.token) {
    console.error(`GitLab: ${config.gitlab.url}`);
  }
  if (config.redmine.apiKey) {
    console.error(`Redmine: ${config.redmine.url}`);
  }
  if (config.taiga.token || (config.taiga.user && config.taiga.pass)) {
    console.error(`Taiga: ${config.taiga.host}`);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
