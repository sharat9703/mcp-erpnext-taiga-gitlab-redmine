/**
 * Task tool definitions
 * @module definitions/task-tools
 */

export const taskTools = [
  {
    name: 'erpnext_list_merge_requests',
    description: 'List merge requests from a GitLab project with filters (state, author, date range). Returns a list of MRs that can be selected for task creation analysis.',
    inputSchema: {
      type: 'object',
      properties: {
        project_path: {
          type: 'string',
          description: 'GitLab project path (e.g., "mercuryfx/tcil/mudra2/intranet/retail-app/retail")'
        },
        state: {
          type: 'string',
          description: 'Filter by MR state (default: "merged")',
          enum: ['merged', 'opened', 'closed', 'all']
        },
        author_username: {
          type: 'string',
          description: 'Filter by author username (e.g., "sharatyaragatti")'
        },
        target_branch: {
          type: 'string',
          description: 'Filter by target branch (e.g., "main", "development")'
        },
        created_after: {
          type: 'string',
          description: 'Filter MRs created after this date (ISO format: YYYY-MM-DD)'
        },
        created_before: {
          type: 'string',
          description: 'Filter MRs created before this date (ISO format: YYYY-MM-DD)'
        },
        sort: {
          type: 'string',
          description: 'Sort by field (default: "created_date")',
          enum: ['created_date', 'updated_date']
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 40)'
        }
      },
      required: ['project_path']
    }
  },
  {
    name: 'erpnext_analyze_merge_request',
    description: 'Analyze one or multiple GitLab merge requests and generate intelligent task breakdown. Extracts commits, groups them by type (features/fixes/refactors), and identifies Redmine issues from MR descriptions. Returns suggested tasks for user review before creation.',
    inputSchema: {
      type: 'object',
      properties: {
        mr_url: {
          type: 'string',
          description: 'Single GitLab merge request URL (use this OR mr_urls). Example: https://gitlab.example.com/project/-/merge_requests/123'
        },
        mr_urls: {
          type: 'array',
          description: 'Multiple GitLab merge request URLs (use this OR mr_url). For analyzing multiple MRs together.',
          items: {
            type: 'string'
          }
        },
        project: {
          type: 'string',
          description: 'ERPNext project name to assign tasks to (optional)'
        },
        include_redmine_tasks: {
          type: 'boolean',
          description: 'Whether to create tasks from Redmine issues found in MR description (default: true)'
        },
        group_by: {
          type: 'string',
          description: 'How to group commits into tasks (default: "auto")',
          enum: ['commits', 'files', 'auto']
        }
      }
    }
  },
  {
    name: 'erpnext_create_tasks_from_analysis',
    description: 'Create tasks in ERPNext from previously analyzed merge request data. Tasks are created with "Completed" status and automatically assigned to the current employee.',
    inputSchema: {
      type: 'object',
      properties: {
        tasks: {
          type: 'array',
          description: 'Array of task objects from analysis to create in ERPNext',
          items: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Task title (max 140 characters)'
              },
              description: {
                type: 'string',
                description: 'Task description'
              },
              commits: {
                type: 'array',
                description: 'Array of commit hashes associated with this task',
                items: {
                  type: 'string'
                }
              },
              source: {
                type: 'string',
                description: 'Source of the task (commits, redmine, mr_title)',
                enum: ['commits', 'redmine', 'mr_title']
              }
            },
            required: ['title']
          }
        },
        project: {
          type: 'string',
          description: 'ERPNext project name to assign tasks to (optional, can be null)'
        },
        status: {
          type: 'string',
          description: 'Task status (default: "Completed")',
          enum: ['Open', 'Working', 'Pending Review', 'Completed', 'Cancelled']
        }
      },
      required: ['tasks']
    }
  }
];

export default taskTools;
