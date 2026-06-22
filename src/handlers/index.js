/**
 * Handlers index - aggregates all tool handlers
 * @module handlers
 *
 * To add handlers for a new feature:
 * 1. Create a new file in handlers/ (e.g., expense-handlers.js)
 * 2. Export a createXxxHandlers(erpnext) function
 * 3. Import and merge it here
 */

import { createCoreHandlers } from './core-handlers.js';
import { createTimesheetHandlers } from './timesheet-handlers.js';
import { createLeaveHandlers } from './leave-handlers.js';
import { createSoftwareReleaseHandlers } from './software-release-handlers.js';
import { createTaskHandlers } from './task-handlers.js';
import { createTaigaHandlers } from './taiga-handlers.js';

/**
 * Create all handlers
 * @param {Object} erpnext - ERPNext client instance
 * @param {Object} gitlabConfig - GitLab configuration (optional, for software releases and tasks)
 * @param {Object} redmineConfig - Redmine configuration (optional, for fetching ticket titles)
 * @param {Object} taigaConfig - Taiga configuration (optional, for Taiga task creation/export)
 * @returns {Object} Combined handler map
 */
export function createAllHandlers(erpnext, gitlabConfig = {}, redmineConfig = {}, taigaConfig = {}) {
  return {
    ...createCoreHandlers(erpnext),
    ...createTimesheetHandlers(erpnext),
    ...createLeaveHandlers(erpnext),
    ...createSoftwareReleaseHandlers(erpnext, gitlabConfig, redmineConfig),
    ...createTaskHandlers(erpnext, gitlabConfig),
    ...createTaigaHandlers(erpnext, taigaConfig)
  };
}

export { createCoreHandlers, createTimesheetHandlers, createLeaveHandlers, createSoftwareReleaseHandlers, createTaskHandlers, createTaigaHandlers };

export default createAllHandlers;
