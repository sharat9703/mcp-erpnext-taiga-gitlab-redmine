/**
 * MCP Resources configuration
 * @module resources
 *
 * Resources are read-only data endpoints that can be accessed by clients.
 * Add new resources here when adding new features.
 */

import * as timesheetTools from './tools/timesheet.js';
import * as leaveTools from './tools/leave.js';

/**
 * Resource definitions for ListResourcesRequest
 */
export const RESOURCES = [
  {
    uri: 'erpnext://timesheets/draft',
    name: 'Draft Timesheets',
    description: 'List of all draft timesheets for current employee',
    mimeType: 'application/json'
  },
  {
    uri: 'erpnext://activity-types',
    name: 'Activity Types',
    description: 'Available activity types for timesheets',
    mimeType: 'application/json'
  },
  {
    uri: 'erpnext://projects',
    name: 'Projects',
    description: 'List of all projects',
    mimeType: 'application/json'
  },
  {
    uri: 'erpnext://leave-types',
    name: 'Leave Types',
    description: 'Available leave types',
    mimeType: 'application/json'
  },
  {
    uri: 'erpnext://leaves/pending',
    name: 'Pending Leaves',
    description: 'List of pending leave applications',
    mimeType: 'application/json'
  }
];

/**
 * Create resource handlers
 * @param {Object} erpnext - ERPNext client instance
 * @returns {Object} Map of URI to handler function
 */
export function createResourceHandlers(erpnext) {
  return {
    'erpnext://timesheets/draft': () => timesheetTools.getMyDraftTimesheets(erpnext),
    'erpnext://activity-types': () => erpnext.getActivityTypes(),
    'erpnext://projects': () => erpnext.getProjects(),
    'erpnext://leave-types': () => leaveTools.getLeaveTypes(erpnext),
    'erpnext://leaves/pending': () => leaveTools.getMyPendingLeaves(erpnext)
  };
}

export default { RESOURCES, createResourceHandlers };
