/**
 * Timesheet tool definitions
 * @module definitions/timesheet-tools
 */

export const timesheetTools = [
  {
    name: 'erpnext_create_timesheet',
    description: 'Create a new timesheet with time logs.',
    inputSchema: {
      type: 'object',
      properties: {
        employee: { type: 'string', description: 'Employee ID (optional)' },
        company: { type: 'string', description: 'Company name (optional)' },
        note: { type: 'string', description: 'Note for the timesheet' },
        time_logs: {
          type: 'array',
          description: 'Array of time log entries',
          items: {
            type: 'object',
            properties: {
              activity_type: { type: 'string', description: 'Activity type' },
              from_time: { type: 'string', description: 'Start time (YYYY-MM-DD HH:MM:SS)' },
              to_time: { type: 'string', description: 'End time (YYYY-MM-DD HH:MM:SS)' },
              hours: { type: 'number', description: 'Hours worked' },
              project: { type: 'string', description: 'Project name (optional)' },
              task: { type: 'string', description: 'Task name (optional)' },
              description: { type: 'string', description: 'Description' },
              billable: { type: 'boolean', description: 'Is billable? (default: true)' }
            },
            required: ['activity_type', 'hours']
          }
        }
      },
      required: ['time_logs']
    }
  },
  {
    name: 'erpnext_quick_timesheet',
    description: 'Create a timesheet for today with a single entry',
    inputSchema: {
      type: 'object',
      properties: {
        hours: { type: 'number', description: 'Hours worked' },
        activity_type: { type: 'string', description: 'Activity type' },
        project: { type: 'string', description: 'Project (optional)' },
        task: { type: 'string', description: 'Task (optional)' },
        description: { type: 'string', description: 'Description' }
      },
      required: ['hours', 'activity_type']
    }
  },
  {
    name: 'erpnext_list_timesheets',
    description: 'List timesheets with optional filters',
    inputSchema: {
      type: 'object',
      properties: {
        employee: { type: 'string', description: 'Filter by employee ID' },
        status: { type: 'string', description: 'Filter by status (Draft, Submitted, Billed, Cancelled)' },
        from_date: { type: 'string', description: 'Filter from date (YYYY-MM-DD)' },
        to_date: { type: 'string', description: 'Filter to date (YYYY-MM-DD)' },
        limit: { type: 'number', description: 'Results limit (default: 20)' }
      }
    }
  },
  {
    name: 'erpnext_get_timesheet',
    description: 'Get details of a specific timesheet',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Timesheet ID (e.g., TS-00001)' }
      },
      required: ['name']
    }
  },
  {
    name: 'erpnext_get_my_draft_timesheets',
    description: 'Get all draft timesheets for current employee',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'erpnext_add_time_log',
    description: 'Add time log to existing draft timesheet',
    inputSchema: {
      type: 'object',
      properties: {
        timesheet: { type: 'string', description: 'Timesheet ID' },
        activity_type: { type: 'string', description: 'Activity type' },
        from_time: { type: 'string', description: 'Start time' },
        to_time: { type: 'string', description: 'End time' },
        hours: { type: 'number', description: 'Hours worked' },
        project: { type: 'string', description: 'Project (optional)' },
        task: { type: 'string', description: 'Task (optional)' },
        description: { type: 'string', description: 'Description' }
      },
      required: ['timesheet', 'activity_type', 'hours']
    }
  },
  {
    name: 'erpnext_submit_timesheet',
    description: 'Submit a draft timesheet',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Timesheet ID' } },
      required: ['name']
    }
  },
  {
    name: 'erpnext_cancel_timesheet',
    description: 'Cancel a submitted timesheet',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Timesheet ID' } },
      required: ['name']
    }
  },
  {
    name: 'erpnext_create_weekly_timesheet',
    description: 'Create weekly timesheet: 7h Billable + 2h Non-Billable per day, Mon-Fri',
    inputSchema: {
      type: 'object',
      properties: {
        week: { type: 'string', description: '"current", "last", or YYYY-MM-DD (Monday)' },
        project: { type: 'string', description: 'Project ID for billable work' },
        billable_hours: { type: 'number', description: 'Billable hours/day (default: 7)' },
        non_billable_hours: { type: 'number', description: 'Non-billable hours/day (default: 2)' },
        billable_start_hour: { type: 'number', description: 'Billable start hour (default: 10)' },
        non_billable_start_hour: { type: 'number', description: 'Non-billable start hour (default: 17)' },
        exclude_days: { type: 'array', items: { type: 'number' }, description: '0=Mon..4=Fri' },
        note: { type: 'string', description: 'Note' }
      },
      required: []
    }
  },
  {
    name: 'erpnext_create_custom_timesheet',
    description: 'Create timesheet with custom entries',
    inputSchema: {
      type: 'object',
      properties: {
        entries: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', description: 'YYYY-MM-DD' },
              activity_type: { type: 'string', description: 'Activity type' },
              hours: { type: 'number', description: 'Hours' },
              project: { type: 'string', description: 'Project (optional)' },
              is_billable: { type: 'boolean', description: 'Billable (default: true)' },
              start_hour: { type: 'number', description: 'Start hour (default: 10)' },
              description: { type: 'string', description: 'Description' }
            },
            required: ['date', 'activity_type', 'hours']
          }
        },
        note: { type: 'string', description: 'Note' }
      },
      required: ['entries']
    }
  },
  {
    name: 'erpnext_update_time_log',
    description: 'Update a specific time log in a draft timesheet. Use this to edit hours, times, project, activity type, or description of an existing time entry.',
    inputSchema: {
      type: 'object',
      properties: {
        timesheet: { type: 'string', description: 'Timesheet ID (e.g., TS-00001)' },
        time_log_index: { type: 'number', description: 'Index of the time log to update (0-based)' },
        activity_type: { type: 'string', description: 'New activity type (optional)' },
        from_time: { type: 'string', description: 'New start time (YYYY-MM-DD HH:MM:SS) (optional)' },
        to_time: { type: 'string', description: 'New end time (YYYY-MM-DD HH:MM:SS) (optional)' },
        hours: { type: 'number', description: 'New hours worked (optional)' },
        project: { type: 'string', description: 'New project (optional, use empty string to remove)' },
        task: { type: 'string', description: 'New task (optional)' },
        description: { type: 'string', description: 'New description (optional)' },
        is_billable: { type: 'boolean', description: 'Is billable? (optional)' }
      },
      required: ['timesheet', 'time_log_index']
    }
  },
  {
    name: 'erpnext_remove_time_log',
    description: 'Remove a specific time log from a draft timesheet. Cannot remove the last time log.',
    inputSchema: {
      type: 'object',
      properties: {
        timesheet: { type: 'string', description: 'Timesheet ID (e.g., TS-00001)' },
        time_log_index: { type: 'number', description: 'Index of the time log to remove (0-based)' }
      },
      required: ['timesheet', 'time_log_index']
    }
  },
  {
    name: 'erpnext_update_timesheet_note',
    description: 'Update the note on a draft timesheet',
    inputSchema: {
      type: 'object',
      properties: {
        timesheet: { type: 'string', description: 'Timesheet ID (e.g., TS-00001)' },
        note: { type: 'string', description: 'New note for the timesheet' }
      },
      required: ['timesheet', 'note']
    }
  },
  {
    name: 'erpnext_delete_timesheet',
    description: 'Delete a draft timesheet. Only works on timesheets that have not been submitted.',
    inputSchema: {
      type: 'object',
      properties: {
        timesheet: { type: 'string', description: 'Timesheet ID (e.g., TS-00001)' }
      },
      required: ['timesheet']
    }
  }
];

export default timesheetTools;
