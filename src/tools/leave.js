/**
 * Leave Application tools for ERPNext MCP Server
 */

/**
 * List leave applications
 */
export async function listLeaveApplications(client, options = {}) {
  const {
    employee,
    status,
    leave_type,
    from_date,
    to_date,
    limit = 10
  } = options;

  const filters = [];

  if (employee) {
    filters.push(['employee', '=', employee]);
  }
  if (status) {
    filters.push(['status', '=', status]);
  }
  if (leave_type) {
    filters.push(['leave_type', '=', leave_type]);
  }
  if (from_date) {
    filters.push(['from_date', '>=', from_date]);
  }
  if (to_date) {
    filters.push(['to_date', '<=', to_date]);
  }

  const result = await client.getDocList('Leave Application', {
    filters: filters.length > 0 ? JSON.stringify(filters) : undefined,
    fields: JSON.stringify([
      'name', 'employee', 'employee_name', 'leave_type',
      'from_date', 'to_date', 'total_leave_days', 'status',
      'description', 'half_day'
    ]),
    limit_page_length: limit,
    order_by: 'from_date desc'
  });

  return result;
}

/**
 * Get leave application details
 */
export async function getLeaveApplication(client, name) {
  return await client.getDoc('Leave Application', name);
}

/**
 * Get leave balance for employee
 */
export async function getLeaveBalance(client, options = {}) {
  const { employee, leave_type } = options;

  // Get employee if not provided
  let employeeId = employee;
  if (!employeeId) {
    const emp = await client.getCurrentEmployee();
    employeeId = emp.name;
  }

  // Call the leave balance method
  const result = await client.call('erpnext.hr.doctype.leave_application.leave_application.get_leave_balance_on', {
    employee: employeeId,
    date: new Date().toISOString().split('T')[0],
    leave_type: leave_type,
    consider_all_leaves_in_the_allocation_period: 1
  });

  return result;
}

/**
 * Get available leave types
 */
export async function getLeaveTypes(client) {
  const result = await client.getDocList('Leave Type', {
    fields: JSON.stringify(['name', 'leave_type_name', 'max_leaves_allowed', 'is_carry_forward']),
    limit_page_length: 50
  });
  return result.data || [];
}

/**
 * Create leave application
 */
export async function createLeaveApplication(client, params) {
  const {
    employee,
    leave_type = 'Leave',
    from_date,
    to_date,
    half_day = false,
    half_day_date,
    description = ''
  } = params;

  // Get employee if not provided
  let employeeId = employee;
  let employeeData = null;

  if (!employeeId) {
    employeeData = await client.getCurrentEmployee();
    employeeId = employeeData.name;
  }

  const leaveDoc = {
    doctype: 'Leave Application',
    employee: employeeId,
    leave_type,
    from_date,
    to_date: to_date || from_date,
    half_day: half_day ? 1 : 0,
    half_day_date: half_day ? (half_day_date || from_date) : null,
    description,
    status: 'Open'
  };

  const result = await client.createDoc('Leave Application', leaveDoc);
  return result;
}

/**
 * Submit leave application
 */
export async function submitLeaveApplication(client, name) {
  return await client.submitDoc('Leave Application', name);
}

/**
 * Cancel leave application
 */
export async function cancelLeaveApplication(client, name) {
  return await client.cancelDoc('Leave Application', name);
}

/**
 * Apply for single day leave
 */
export async function applySingleDayLeave(client, params) {
  const {
    date,
    leave_type = 'Leave',
    half_day = false,
    description = ''
  } = params;

  return await createLeaveApplication(client, {
    leave_type,
    from_date: date,
    to_date: date,
    half_day,
    half_day_date: half_day ? date : null,
    description
  });
}

/**
 * Apply for multiple days leave
 */
export async function applyMultipleDaysLeave(client, params) {
  const {
    from_date,
    to_date,
    leave_type = 'Leave',
    description = ''
  } = params;

  return await createLeaveApplication(client, {
    leave_type,
    from_date,
    to_date,
    description
  });
}

/**
 * Get my pending leave applications
 */
export async function getMyPendingLeaves(client) {
  const employee = await client.getCurrentEmployee();

  return await listLeaveApplications(client, {
    employee: employee.name,
    status: 'Open'
  });
}

/**
 * Get my approved leaves
 */
export async function getMyApprovedLeaves(client, options = {}) {
  const employee = await client.getCurrentEmployee();
  const { limit = 10 } = options;

  return await listLeaveApplications(client, {
    employee: employee.name,
    status: 'Approved',
    limit
  });
}

export default {
  listLeaveApplications,
  getLeaveApplication,
  getLeaveBalance,
  getLeaveTypes,
  createLeaveApplication,
  submitLeaveApplication,
  cancelLeaveApplication,
  applySingleDayLeave,
  applyMultipleDaysLeave,
  getMyPendingLeaves,
  getMyApprovedLeaves
};
