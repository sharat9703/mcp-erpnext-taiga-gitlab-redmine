/**
 * Leave application tool definitions
 * @module definitions/leave-tools
 */

export const leaveTools = [
  {
    name: 'erpnext_list_leave_types',
    description: 'List all available leave types',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'erpnext_get_leave_balance',
    description: 'Get leave balance for employee',
    inputSchema: {
      type: 'object',
      properties: {
        leave_type: { type: 'string', description: 'Leave type to check' }
      }
    }
  },
  {
    name: 'erpnext_list_leave_applications',
    description: 'List leave applications with filters',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Status (Open, Approved, Rejected, Cancelled)' },
        leave_type: { type: 'string', description: 'Leave type' },
        from_date: { type: 'string', description: 'From date (YYYY-MM-DD)' },
        to_date: { type: 'string', description: 'To date (YYYY-MM-DD)' },
        limit: { type: 'number', description: 'Results limit (default: 10)' }
      }
    }
  },
  {
    name: 'erpnext_get_leave_application',
    description: 'Get details of a specific leave application',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Leave ID (e.g., HR-LAP-2025-01700)' }
      },
      required: ['name']
    }
  },
  {
    name: 'erpnext_get_my_pending_leaves',
    description: 'Get pending leave applications for current employee',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'erpnext_get_my_approved_leaves',
    description: 'Get approved leave applications for current employee',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Results limit (default: 10)' }
      }
    }
  },
  {
    name: 'erpnext_apply_leave',
    description: 'Apply for leave (single or multiple days)',
    inputSchema: {
      type: 'object',
      properties: {
        from_date: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        to_date: { type: 'string', description: 'End date (YYYY-MM-DD)' },
        leave_type: { type: 'string', description: 'Leave type (default: Leave)' },
        half_day: { type: 'boolean', description: 'Half day leave?' },
        half_day_date: { type: 'string', description: 'Half day date' },
        description: { type: 'string', description: 'Reason for leave' }
      },
      required: ['from_date']
    }
  },
  {
    name: 'erpnext_submit_leave_application',
    description: 'Submit leave application for approval',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Leave ID' } },
      required: ['name']
    }
  },
  {
    name: 'erpnext_cancel_leave_application',
    description: 'Cancel a leave application',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Leave ID' } },
      required: ['name']
    }
  }
];

export default leaveTools;
