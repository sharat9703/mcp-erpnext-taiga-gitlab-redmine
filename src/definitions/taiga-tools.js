/**
 * Taiga tool definitions
 * @module definitions/taiga-tools
 *
 * Tools for validating Taiga user stories, creating tasks under a user
 * story, and exporting those tasks to ERPNext "Developer Task" documents.
 */

export const taigaTools = [
  {
    name: 'erpnext_validate_user_story',
    description:
      'Validate a Taiga User Story by its URL and return its id, title and project. Use this before creating tasks to confirm the user story exists and to obtain the user_story_id.',
    inputSchema: {
      type: 'object',
      properties: {
        user_story_url: {
          type: 'string',
          description:
            'Taiga User Story URL of the form https://<domain>/project/<slug>/us/<ref>'
        }
      },
      required: ['user_story_url']
    }
  },
  {
    name: 'erpnext_create_user_story',
    description:
      'Create a new User Story in a Taiga project. Returns the created user story id, ref and URL. Use the returned user_story_id with erpnext_create_taiga_tasks to add tasks under it.',
    inputSchema: {
      type: 'object',
      properties: {
        project_slug: {
          type: 'string',
          description: 'Taiga project slug the user story belongs to (e.g. "rupay-card").'
        },
        subject: {
          type: 'string',
          description: 'User story title/subject (required).'
        },
        description: { type: 'string', description: 'User story description.' },
        status: {
          type: 'string',
          description: 'User story status name (e.g. "New", "In progress"). Defaults to the project default.'
        },
        assignee: {
          type: 'string',
          description: 'Assignee name (matched against Taiga project members).'
        },
        tags: {
          type: 'array',
          description: 'Tags to apply to the user story.',
          items: { type: 'string' }
        },
        milestone: {
          type: 'number',
          description: 'Optional milestone (sprint) id to attach the user story to.'
        }
      },
      required: ['project_slug', 'subject']
    }
  },
  {
    name: 'erpnext_create_taiga_tasks',
    description:
      'Create one or more tasks in Taiga under a given User Story. Resolves assignees from project members and sets custom attributes (complexity, task_type) when those attributes exist on the project. Returns created task refs/ids and any failures.',
    inputSchema: {
      type: 'object',
      properties: {
        user_story_id: {
          type: 'number',
          description: 'Numeric Taiga User Story id (from erpnext_validate_user_story).'
        },
        project_slug: {
          type: 'string',
          description: 'Taiga project slug the tasks belong to (e.g. "rupay-card").'
        },
        status: {
          type: 'string',
          description: 'Task status name to apply to all created tasks (e.g. "Closed", "In progress"). Defaults to the project default (usually "New").'
        },
        tasks: {
          type: 'array',
          description: 'Tasks to create under the user story.',
          items: {
            type: 'object',
            properties: {
              task: {
                type: 'string',
                description: 'Task subject/title (required).'
              },
              description: { type: 'string', description: 'Task description.' },
              assignee: {
                type: 'string',
                description: 'Assignee name (matched against Taiga project members).'
              },
              due_date: {
                type: 'string',
                description: 'Due date (YYYY-MM-DD, dd-MM-yyyy, or Excel serial).'
              },
              complexity: {
                type: 'string',
                description: 'Complexity value (set as a custom attribute if present).'
              },
              task_type: {
                type: 'string',
                description: 'Task type value (set as a custom attribute if present).'
              },
              rowIndex: {
                type: 'number',
                description: 'Optional source row index for error reporting.'
              }
            },
            required: ['task']
          }
        }
      },
      required: ['user_story_id', 'project_slug', 'tasks']
    }
  },
  {
    name: 'erpnext_export_tasks_to_erp',
    description:
      'Export tasks to ERPNext as "Developer Task" documents. Resolves the developer (employee code) from a name when not provided, maps the Taiga task_type to an ERP category, and normalizes complexity. Returns created ids, in-batch skips, and failures.',
    inputSchema: {
      type: 'object',
      properties: {
        tasks: {
          type: 'array',
          description: 'Tasks to export to ERPNext Developer Task.',
          items: {
            type: 'object',
            properties: {
              taiga_id: {
                type: 'string',
                description: 'Taiga task id/ref stored on the ERP document (dedupes within the batch).'
              },
              subject: { type: 'string', description: 'Task subject (ERP "task" field).' },
              description: { type: 'string', description: 'Task description.' },
              developer: {
                type: 'string',
                description: 'ERP employee code of the developer (skips name lookup if provided).'
              },
              assigned_to_name: {
                type: 'string',
                description: 'Developer name; used to look up the employee code when developer is not given.'
              },
              due_date: { type: 'string', description: 'Target date.' },
              completed_date: { type: 'string', description: 'Completed date.' },
              product: { type: 'string', description: 'ERP product link.' },
              reviewer: { type: 'string', description: 'ERP reviewer link.' },
              assigner: { type: 'string', description: 'ERP assigner link.' },
              category: {
                type: 'string',
                description: 'ERP Developer Task category (overrides task_type mapping).'
              },
              type: {
                type: 'string',
                description: 'Developer Task Detail type (default: "New").'
              },
              status: {
                type: 'string',
                description: 'Developer Task status (e.g. "Reviewed", "Completed"). Omit to leave the ERP default.'
              },
              task_type: {
                type: 'string',
                description: 'Taiga task type, mapped to an ERP category when category is absent.'
              },
              complexity: { type: 'string', description: 'Complexity (normalized to Simple/Medium/Complex).' }
            },
            required: ['subject']
          }
        }
      },
      required: ['tasks']
    }
  }
];

export default taigaTools;
