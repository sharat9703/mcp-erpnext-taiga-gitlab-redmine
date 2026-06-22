/**
 * Timesheet response formatters
 * Provides clean, human-readable output similar to ERPNext UI
 */

/**
 * Format a single time log entry
 */
function formatTimeLog(log, index) {
  const from = log.from_time ? log.from_time.substring(0, 16).replace(' ', ' ') : 'N/A';
  const to = log.to_time ? log.to_time.substring(0, 16).replace(' ', ' ') : 'N/A';
  const billable = log.is_billable ? 'Yes' : 'No';
  const project = log.project || '-';

  return `  ${index + 1}. ${log.activity_type}
     From: ${from} → To: ${to}
     Hours: ${log.hours} | Billable: ${billable}
     Project: ${project}${log.description ? `\n     Description: ${log.description}` : ''}`;
}

/**
 * Format timesheet details (for get/create responses)
 */
export function formatTimesheetDetails(data) {
  const ts = data.data || data;

  const lines = [
    `Timesheet: ${ts.name}`,
    `Status: ${ts.status || 'Draft'}`,
    `Employee: ${ts.employee_name || ts.employee}`,
    `Period: ${ts.start_date || 'N/A'} to ${ts.end_date || 'N/A'}`,
    `Total Hours: ${ts.total_hours || 0}`,
    ''
  ];

  if (ts.time_logs && ts.time_logs.length > 0) {
    lines.push(`Time Entries (${ts.time_logs.length}):`);
    ts.time_logs.forEach((log, index) => {
      lines.push(formatTimeLog(log, index));
    });
  }

  if (ts.note) {
    lines.push('', `Note: ${ts.note}`);
  }

  return lines.join('\n');
}

/**
 * Format timesheet list (for list responses)
 */
export function formatTimesheetList(data) {
  const items = Array.isArray(data) ? data : (data.data || []);

  if (items.length === 0) {
    return 'No timesheets found.';
  }

  const lines = [`Found ${items.length} timesheet(s):`, ''];

  items.forEach((ts, index) => {
    lines.push(`${index + 1}. ${ts.name} | ${ts.status} | ${ts.employee_name || ts.employee}`);
    lines.push(`   Period: ${ts.start_date || 'N/A'} to ${ts.end_date || 'N/A'} | Hours: ${ts.total_hours || 0}`);
  });

  return lines.join('\n');
}

/**
 * Format simple success response
 */
export function formatSuccess(action, timesheetName, details = null) {
  let msg = `${action}: ${timesheetName}`;
  if (details) {
    msg += `\n${details}`;
  }
  return msg;
}

/**
 * Detect response type and format accordingly
 */
export function formatTimesheetResponse(toolName, result) {
  // Handle array responses (list operations)
  if (Array.isArray(result)) {
    return formatTimesheetList(result);
  }

  // Handle object responses
  if (result && typeof result === 'object') {
    const data = result.data || result;

    // List response with data array
    if (Array.isArray(data)) {
      return formatTimesheetList(data);
    }

    // Single timesheet with time_logs = detailed view
    if (data.time_logs) {
      // Determine action based on tool name
      let prefix = '';
      if (toolName.includes('create')) {
        prefix = 'Created ';
      } else if (toolName.includes('update')) {
        prefix = 'Updated ';
      } else if (toolName.includes('submit')) {
        prefix = 'Submitted ';
      }

      return (prefix ? prefix + '\n\n' : '') + formatTimesheetDetails(data);
    }

    // Simple success response (submit, cancel, delete)
    if (data.name) {
      if (toolName.includes('submit')) {
        return formatSuccess('Submitted', data.name);
      }
      if (toolName.includes('cancel')) {
        return formatSuccess('Cancelled', data.name);
      }
      if (toolName.includes('delete')) {
        return formatSuccess('Deleted', data.name);
      }
      return formatTimesheetDetails(data);
    }
  }

  // Fallback to JSON
  return JSON.stringify(result, null, 2);
}

export default {
  formatTimesheetDetails,
  formatTimesheetList,
  formatSuccess,
  formatTimesheetResponse
};
