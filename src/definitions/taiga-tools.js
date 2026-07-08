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
  },
  {
    name: 'erpnext_get_taiga_tasks',
    description: "Get Taiga tasks assigned to a user (defaults to the authenticated user), with each task's description and attachment metadata. Optionally filter by project (slug or name) and status; by default only OPEN tasks are returned. Use this to read a task's description and see its attachments (download them with erpnext_download_taiga_attachment).",
    inputSchema: {
      type: 'object',
      properties: {
        assignee: {
          type: 'string',
          description: 'Assignee name (matched against project members) or numeric user id. Defaults to the authenticated Taiga user.'
        },
        project: {
          type: 'string',
          description: 'Restrict to a project by slug or name (e.g. "tcil-mercury-fx" or "TCIL"). Omit to search all the user\'s projects.'
        },
        status: {
          type: 'string',
          description: 'Filter by task status name (e.g. "New", "In progress", "Ready for test").'
        },
        include_closed: {
          type: 'boolean',
          description: 'Include closed/done tasks (default: false — only open tasks).'
        },
        include_attachments: {
          type: 'boolean',
          description: "Include each task's attachment metadata (default: true). Set false to skip per-task attachment lookups for speed."
        },
        limit: {
          type: 'number',
          description: 'Max tasks to return (default: 500).'
        }
      },
      required: []
    }
  },
  {
    name: 'erpnext_update_taiga_task',
    description: "Update a Taiga task's status and/or description. Identify the task by numeric task_id, or by ref + project (slug or name). Status names are resolved to the project's status ids automatically.",
    inputSchema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'number',
          description: 'Numeric Taiga task id (internal id, not the #ref). Use this OR ref+project.'
        },
        ref: {
          type: 'number',
          description: 'Task reference number (the #ref shown in Taiga). Requires project.'
        },
        project: {
          type: 'string',
          description: 'Project slug or name (required when using ref).'
        },
        status: {
          type: 'string',
          description: 'New status name (e.g. "In progress", "Ready for test", "Closed").'
        },
        description: {
          type: 'string',
          description: 'New description text (replaces the existing description).'
        }
      },
      required: []
    }
  },
  {
    name: 'erpnext_download_taiga_attachment',
    description: "Download a Taiga task attachment to local disk. Provide the attachment url (from erpnext_get_taiga_tasks) or a numeric attachment_id. Returns the saved file path and — for text-like files — a content preview.",
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: "Attachment download URL (from a task's attachments list)."
        },
        attachment_id: {
          type: 'number',
          description: 'Numeric attachment id (used to resolve the url when url is not given).'
        },
        filename: {
          type: 'string',
          description: 'Optional filename to save as.'
        },
        save_dir: {
          type: 'string',
          description: 'Directory to save into. Default: OS temp/devflow-attachments/taiga.'
        },
        include_text_preview: {
          type: 'boolean',
          description: 'For text-like files, include a content preview (default: true).'
        },
        preview_chars: {
          type: 'number',
          description: 'Max characters of text preview (default: 4000).'
        }
      },
      required: []
    }
  }
];

export default taigaTools;
