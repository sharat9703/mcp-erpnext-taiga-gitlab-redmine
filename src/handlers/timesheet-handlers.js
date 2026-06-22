/**
 * Timesheet handlers
 * @module handlers/timesheet-handlers
 */

import * as timesheetTools from '../tools/timesheet.js';

/**
 * Create timesheet handlers
 * @param {Object} erpnext - ERPNext client instance
 * @returns {Object} Handler map { toolName: handlerFn }
 */
export function createTimesheetHandlers(erpnext) {
  return {
    'erpnext_create_timesheet': async (args) => {
      return await timesheetTools.createTimesheet(erpnext, args);
    },

    'erpnext_quick_timesheet': async (args) => {
      return await timesheetTools.createQuickTimesheet(erpnext, args);
    },

    'erpnext_list_timesheets': async (args) => {
      return await timesheetTools.listTimesheets(erpnext, args || {});
    },

    'erpnext_get_timesheet': async (args) => {
      return await timesheetTools.getTimesheet(erpnext, args.name);
    },

    'erpnext_get_my_draft_timesheets': async () => {
      return await timesheetTools.getMyDraftTimesheets(erpnext);
    },

    'erpnext_add_time_log': async (args) => {
      return await timesheetTools.addTimeLog(erpnext, args.timesheet, {
        activity_type: args.activity_type,
        from_time: args.from_time,
        to_time: args.to_time,
        hours: args.hours,
        project: args.project,
        task: args.task,
        description: args.description
      });
    },

    'erpnext_submit_timesheet': async (args) => {
      return await timesheetTools.submitTimesheet(erpnext, args.name);
    },

    'erpnext_cancel_timesheet': async (args) => {
      return await timesheetTools.cancelTimesheet(erpnext, args.name);
    },

    'erpnext_create_weekly_timesheet': async (args) => {
      return await timesheetTools.createWeeklyTimesheet(erpnext, args || {});
    },

    'erpnext_create_custom_timesheet': async (args) => {
      return await timesheetTools.createCustomTimesheet(erpnext, args);
    },

    'erpnext_update_time_log': async (args) => {
      const { timesheet, time_log_index, ...updates } = args;
      return await timesheetTools.updateTimeLog(erpnext, timesheet, time_log_index, updates);
    },

    'erpnext_remove_time_log': async (args) => {
      return await timesheetTools.removeTimeLog(erpnext, args.timesheet, args.time_log_index);
    },

    'erpnext_update_timesheet_note': async (args) => {
      return await timesheetTools.updateTimesheetNote(erpnext, args.timesheet, args.note);
    },

    'erpnext_delete_timesheet': async (args) => {
      return await timesheetTools.deleteTimesheet(erpnext, args.timesheet);
    }
  };
}

export default createTimesheetHandlers;
