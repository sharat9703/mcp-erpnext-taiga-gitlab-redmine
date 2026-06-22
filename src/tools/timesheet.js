/**
 * Timesheet-specific tools for ERPNext MCP Server
 * Customized for Credence Analytics ERPNext
 */

/**
 * Helper to format date as DD-MM-YYYY HH:MM
 */
function formatDateTime(date, hour = 10, minute = 0) {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  // ERPNext expects: YYYY-MM-DD HH:MM:SS
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${mins}:00`;
}

/**
 * Get weekdays (Mon-Fri) for a given week
 * @param {string} weekStart - Start date (YYYY-MM-DD) or 'current' or 'last'
 */
function getWeekDays(weekStart) {
  let startDate;

  if (weekStart === 'current' || !weekStart) {
    // Get Monday of current week
    startDate = new Date();
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
    startDate.setDate(diff);
  } else if (weekStart === 'last') {
    // Get Monday of last week
    startDate = new Date();
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1) - 7;
    startDate.setDate(diff);
  } else {
    startDate = new Date(weekStart);
  }

  const days = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    days.push(d);
  }
  return days;
}

/**
 * Check if two time ranges overlap
 * @param {string} from1 - Start time of first range (YYYY-MM-DD HH:MM:SS)
 * @param {string} to1 - End time of first range
 * @param {string} from2 - Start time of second range
 * @param {string} to2 - End time of second range
 * @returns {boolean} True if ranges overlap
 */
function timeRangesOverlap(from1, to1, from2, to2) {
  const start1 = new Date(from1).getTime();
  const end1 = new Date(to1).getTime();
  const start2 = new Date(from2).getTime();
  const end2 = new Date(to2).getTime();

  // Two ranges overlap if one starts before the other ends
  return start1 < end2 && start2 < end1;
}

/**
 * Calculate to_time from from_time and hours
 */
function calculateToTime(fromTime, hours) {
  const from = new Date(fromTime);
  const to = new Date(from.getTime() + (hours * 60 * 60 * 1000));
  const year = to.getFullYear();
  const month = String(to.getMonth() + 1).padStart(2, '0');
  const day = String(to.getDate()).padStart(2, '0');
  const hour = String(to.getHours()).padStart(2, '0');
  const mins = String(to.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${mins}:00`;
}

/**
 * Validate time logs for overlaps
 * @param {Array} timeLogs - Array of time log objects
 * @param {number|null} excludeIndex - Index to exclude from validation (for updates)
 * @returns {Object} { valid: boolean, conflicts: Array of conflict descriptions }
 */
function validateNoOverlaps(timeLogs, excludeIndex = null) {
  const conflicts = [];

  for (let i = 0; i < timeLogs.length; i++) {
    if (i === excludeIndex) continue;

    const log1 = timeLogs[i];
    const from1 = log1.from_time;
    const to1 = log1.to_time || calculateToTime(log1.from_time, log1.hours);

    for (let j = i + 1; j < timeLogs.length; j++) {
      if (j === excludeIndex) continue;

      const log2 = timeLogs[j];
      const from2 = log2.from_time;
      const to2 = log2.to_time || calculateToTime(log2.from_time, log2.hours);

      if (timeRangesOverlap(from1, to1, from2, to2)) {
        conflicts.push({
          log1Index: i,
          log2Index: j,
          log1: { from: from1, to: to1, activity: log1.activity_type },
          log2: { from: from2, to: to2, activity: log2.activity_type },
          message: `Time entry ${i + 1} (${log1.activity_type}: ${from1} - ${to1}) overlaps with entry ${j + 1} (${log2.activity_type}: ${from2} - ${to2})`
        });
      }
    }
  }

  return {
    valid: conflicts.length === 0,
    conflicts
  };
}

/**
 * Create a new timesheet with time logs
 * @param {ERPNextClient} client
 * @param {Object} params
 */
export async function createTimesheet(client, params) {
  const {
    employee,
    company,
    time_logs,
    note,
    validate_overlaps = true
  } = params;

  // Get employee if not provided
  let employeeId = employee;
  let employeeData = null;

  if (!employeeId) {
    employeeData = await client.getCurrentEmployee();
    employeeId = employeeData.name;
  }

  // Format time logs for ERPNext - use is_billable field (not billable)
  const formattedTimeLogs = time_logs.map(log => ({
    activity_type: log.activity_type,
    from_time: log.from_time,
    to_time: log.to_time,
    hours: log.hours,
    project: log.project || null,
    task: log.task || null,
    description: log.description || '',
    is_billable: log.is_billable !== undefined ? (log.is_billable ? 1 : 0) : (log.billable !== false ? 1 : 0),
    billing_hours: log.billing_hours || log.hours,
    billing_rate: log.billing_rate || 0,
    costing_rate: log.costing_rate || 0
  }));

  // Validate no overlapping time entries
  if (validate_overlaps) {
    const validation = validateNoOverlaps(formattedTimeLogs);
    if (!validation.valid) {
      const errorMessages = validation.conflicts.map(c => c.message).join('\n');
      throw new Error(`Time entries have overlapping times:\n${errorMessages}`);
    }
  }

  const timesheetDoc = {
    doctype: 'Timesheet',
    employee: employeeId,
    company: company || (employeeData ? employeeData.company : undefined),
    time_logs: formattedTimeLogs,
    note: note || ''
  };

  const result = await client.createDoc('Timesheet', timesheetDoc);
  return result;
}

/**
 * Get timesheet by name
 */
export async function getTimesheet(client, name) {
  return await client.getDoc('Timesheet', name);
}

/**
 * List timesheets with optional filters
 */
export async function listTimesheets(client, options = {}) {
  const {
    employee,
    status,
    from_date,
    to_date,
    limit = 20
  } = options;

  const filters = [];

  if (employee) {
    filters.push(['employee', '=', employee]);
  }

  if (status) {
    filters.push(['status', '=', status]);
  }

  if (from_date) {
    filters.push(['start_date', '>=', from_date]);
  }

  if (to_date) {
    filters.push(['end_date', '<=', to_date]);
  }

  const result = await client.getDocList('Timesheet', {
    filters: filters.length > 0 ? JSON.stringify(filters) : undefined,
    fields: JSON.stringify([
      'name', 'employee', 'employee_name', 'status',
      'start_date', 'end_date', 'total_hours',
      'total_billable_hours', 'total_billed_hours',
      'total_costing_amount', 'total_billable_amount'
    ]),
    limit_page_length: limit,
    order_by: 'creation desc'
  });

  return result;
}

/**
 * Submit a draft timesheet
 */
export async function submitTimesheet(client, name) {
  return await client.submitDoc('Timesheet', name);
}

/**
 * Cancel a submitted timesheet
 */
export async function cancelTimesheet(client, name) {
  return await client.cancelDoc('Timesheet', name);
}

/**
 * Add time log to existing draft timesheet
 */
export async function addTimeLog(client, timesheetName, timeLog, validate_overlaps = true) {
  // Get existing timesheet
  const existing = await client.getDoc('Timesheet', timesheetName);

  if (existing.data.docstatus !== 0) {
    throw new Error('Cannot add time log to submitted/cancelled timesheet');
  }

  const newLog = {
    activity_type: timeLog.activity_type,
    from_time: timeLog.from_time,
    to_time: timeLog.to_time || calculateToTime(timeLog.from_time, timeLog.hours),
    hours: timeLog.hours,
    project: timeLog.project || null,
    task: timeLog.task || null,
    description: timeLog.description || '',
    is_billable: timeLog.is_billable !== undefined ? (timeLog.is_billable ? 1 : 0) : (timeLog.billable !== false ? 1 : 0)
  };

  // Add new time log to existing logs
  const updatedLogs = [...(existing.data.time_logs || []), newLog];

  // Validate no overlapping time entries
  if (validate_overlaps) {
    const validation = validateNoOverlaps(updatedLogs);
    if (!validation.valid) {
      const errorMessages = validation.conflicts.map(c => c.message).join('\n');
      throw new Error(`Cannot add time log - overlapping times detected:\n${errorMessages}`);
    }
  }

  return await client.updateDoc('Timesheet', timesheetName, {
    time_logs: updatedLogs
  });
}

/**
 * Get my draft timesheets (for current employee)
 */
export async function getMyDraftTimesheets(client) {
  const employee = await client.getCurrentEmployee();

  return await listTimesheets(client, {
    employee: employee.name,
    status: 'Draft'
  });
}

/**
 * Quick timesheet creation for today
 */
export async function createQuickTimesheet(client, params) {
  const {
    hours,
    activity_type,
    project,
    task,
    description
  } = params;

  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const fromTime = new Date(now.getTime() - (hours * 60 * 60 * 1000));

  const formatDateTime = (date) => {
    return date.toISOString().replace('T', ' ').substring(0, 19);
  };

  return await createTimesheet(client, {
    time_logs: [{
      activity_type,
      from_time: formatDateTime(fromTime),
      to_time: formatDateTime(now),
      hours,
      project,
      task,
      description
    }]
  });
}

/**
 * Create a weekly timesheet with your standard pattern:
 * - 7 hours Billable Work (10:00-17:00) with project
 * - 2 hours Non Billable Work (17:00-19:00) without project
 *
 * @param {ERPNextClient} client
 * @param {Object} params
 */
export async function createWeeklyTimesheet(client, params) {
  const {
    week = 'current',  // 'current', 'last', or 'YYYY-MM-DD' (Monday)
    project,
    billable_hours = 7,
    non_billable_hours = 2,
    billable_start_hour = 10,
    non_billable_start_hour = 17,
    exclude_days = [],  // Array of day indices to exclude (0=Mon, 1=Tue, etc.)
    note
  } = params;

  const weekDays = getWeekDays(week);
  const timeLogs = [];

  weekDays.forEach((day, index) => {
    // Skip excluded days
    if (exclude_days.includes(index)) {
      return;
    }

    // Billable Work entry
    if (billable_hours > 0) {
      timeLogs.push({
        activity_type: 'Billable Work',
        from_time: formatDateTime(day, billable_start_hour, 0),
        hours: billable_hours,
        project: project || null,
        is_billable: true,
        description: ''
      });
    }

    // Non Billable Work entry
    if (non_billable_hours > 0) {
      timeLogs.push({
        activity_type: 'Non Billable Work',
        from_time: formatDateTime(day, non_billable_start_hour, 0),
        hours: non_billable_hours,
        project: null,
        is_billable: false,
        description: ''
      });
    }
  });

  return await createTimesheet(client, {
    time_logs: timeLogs,
    note: note || `Weekly timesheet for ${weekDays[0].toISOString().split('T')[0]} to ${weekDays[4].toISOString().split('T')[0]}`
  });
}

/**
 * Create timesheet for specific dates with custom entries
 */
export async function createCustomTimesheet(client, params) {
  const {
    entries,  // Array of {date, activity_type, hours, project, is_billable, start_hour}
    note
  } = params;

  const timeLogs = entries.map(entry => ({
    activity_type: entry.activity_type,
    from_time: formatDateTime(new Date(entry.date), entry.start_hour || 10, 0),
    hours: entry.hours,
    project: entry.project || null,
    is_billable: entry.is_billable !== false,
    description: entry.description || ''
  }));

  return await createTimesheet(client, {
    time_logs: timeLogs,
    note
  });
}

/**
 * Update a specific time log in a draft timesheet
 * @param {ERPNextClient} client
 * @param {string} timesheetName - The timesheet name
 * @param {number} timeLogIndex - The 0-based index of the time log to update
 * @param {Object} updates - The fields to update
 * @param {boolean} validate_overlaps - Whether to validate for overlapping times
 */
export async function updateTimeLog(client, timesheetName, timeLogIndex, updates, validate_overlaps = true) {
  // Get existing timesheet
  const existing = await client.getDoc('Timesheet', timesheetName);

  if (existing.data.docstatus !== 0) {
    throw new Error('Cannot update time log in submitted/cancelled timesheet. Only draft timesheets can be edited.');
  }

  const timeLogs = existing.data.time_logs || [];

  if (timeLogIndex < 0 || timeLogIndex >= timeLogs.length) {
    throw new Error(`Invalid time log index: ${timeLogIndex}. Timesheet has ${timeLogs.length} time logs (indices 0-${timeLogs.length - 1}).`);
  }

  // Create updated time log with merged properties
  const originalLog = timeLogs[timeLogIndex];
  const updatedLog = {
    ...originalLog,
    ...updates
  };

  // If hours or from_time changed, recalculate to_time if not explicitly provided
  if ((updates.hours || updates.from_time) && !updates.to_time) {
    updatedLog.to_time = calculateToTime(
      updatedLog.from_time || originalLog.from_time,
      updatedLog.hours || originalLog.hours
    );
  }

  // Handle is_billable conversion
  if (updates.is_billable !== undefined) {
    updatedLog.is_billable = updates.is_billable ? 1 : 0;
  }

  // Create new array with updated log
  const updatedLogs = [...timeLogs];
  updatedLogs[timeLogIndex] = updatedLog;

  // Validate no overlapping time entries
  if (validate_overlaps) {
    const validation = validateNoOverlaps(updatedLogs);
    if (!validation.valid) {
      const errorMessages = validation.conflicts.map(c => c.message).join('\n');
      throw new Error(`Cannot update time log - would create overlapping times:\n${errorMessages}`);
    }
  }

  return await client.updateDoc('Timesheet', timesheetName, {
    time_logs: updatedLogs
  });
}

/**
 * Remove a specific time log from a draft timesheet
 * @param {ERPNextClient} client
 * @param {string} timesheetName - The timesheet name
 * @param {number} timeLogIndex - The 0-based index of the time log to remove
 */
export async function removeTimeLog(client, timesheetName, timeLogIndex) {
  // Get existing timesheet
  const existing = await client.getDoc('Timesheet', timesheetName);

  if (existing.data.docstatus !== 0) {
    throw new Error('Cannot remove time log from submitted/cancelled timesheet. Only draft timesheets can be edited.');
  }

  const timeLogs = existing.data.time_logs || [];

  if (timeLogIndex < 0 || timeLogIndex >= timeLogs.length) {
    throw new Error(`Invalid time log index: ${timeLogIndex}. Timesheet has ${timeLogs.length} time logs (indices 0-${timeLogs.length - 1}).`);
  }

  if (timeLogs.length === 1) {
    throw new Error('Cannot remove the last time log. A timesheet must have at least one time entry. Delete the timesheet instead.');
  }

  // Remove the time log at the specified index
  const updatedLogs = timeLogs.filter((_, index) => index !== timeLogIndex);

  return await client.updateDoc('Timesheet', timesheetName, {
    time_logs: updatedLogs
  });
}

/**
 * Update the note on a draft timesheet
 * @param {ERPNextClient} client
 * @param {string} timesheetName - The timesheet name
 * @param {string} note - The new note
 */
export async function updateTimesheetNote(client, timesheetName, note) {
  // Get existing timesheet
  const existing = await client.getDoc('Timesheet', timesheetName);

  if (existing.data.docstatus !== 0) {
    throw new Error('Cannot update note on submitted/cancelled timesheet. Only draft timesheets can be edited.');
  }

  return await client.updateDoc('Timesheet', timesheetName, {
    note: note
  });
}

/**
 * Delete a draft timesheet
 * @param {ERPNextClient} client
 * @param {string} timesheetName - The timesheet name
 */
export async function deleteTimesheet(client, timesheetName) {
  // Get existing timesheet to check status
  const existing = await client.getDoc('Timesheet', timesheetName);

  if (existing.data.docstatus !== 0) {
    throw new Error('Cannot delete submitted/cancelled timesheet. Only draft timesheets can be deleted.');
  }

  return await client.deleteDoc('Timesheet', timesheetName);
}

export default {
  createTimesheet,
  getTimesheet,
  listTimesheets,
  submitTimesheet,
  cancelTimesheet,
  addTimeLog,
  getMyDraftTimesheets,
  createQuickTimesheet,
  createWeeklyTimesheet,
  createCustomTimesheet,
  updateTimeLog,
  removeTimeLog,
  updateTimesheetNote,
  deleteTimesheet
};
