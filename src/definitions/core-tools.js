/**
 * Core ERPNext tools - login, employee, projects
 * @module definitions/core-tools
 */

export const coreTools = [
  {
    name: 'erpnext_login',
    description: 'Login to ERPNext with username/password and optional TOTP. Call this first before other operations.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'erpnext_get_current_employee',
    description: 'Get the employee record linked to the currently logged in user',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'erpnext_list_activity_types',
    description: 'List all available activity types for timesheets',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'erpnext_list_projects',
    description: 'List all projects',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by project status (Open, Completed, Cancelled)'
        }
      }
    }
  },
  {
    name: 'erpnext_list_tasks',
    description: 'List tasks for a specific project',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description: 'Project name/ID'
        }
      },
      required: ['project']
    }
  }
];

export default coreTools;
