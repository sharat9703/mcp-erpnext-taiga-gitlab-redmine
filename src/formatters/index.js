/**
 * Response formatters index
 */

import { formatTimesheetResponse } from './timesheet-formatter.js';
import { formatSoftwareReleaseResponse } from './software-release-formatter.js';

/**
 * Format tool response based on tool name
 */
export function formatResponse(toolName, result) {
  // Timesheet tools
  if (toolName.startsWith('erpnext_') && (
    toolName.includes('timesheet') ||
    toolName.includes('time_log')
  )) {
    return formatTimesheetResponse(toolName, result);
  }

  // Software release tools
  if (toolName.startsWith('erpnext_') && (
    toolName.includes('software_release') ||
    toolName.includes('mr_details') ||
    toolName.includes('products') ||
    toolName.includes('customers_for_release')
  )) {
    return formatSoftwareReleaseResponse(toolName, result);
  }

  // Default: JSON output
  return JSON.stringify(result, null, 2);
}

export { formatTimesheetResponse, formatSoftwareReleaseResponse };
