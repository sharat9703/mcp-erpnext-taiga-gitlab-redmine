/**
 * Leave application handlers
 * @module handlers/leave-handlers
 */

import * as leaveTools from '../tools/leave.js';

/**
 * Create leave handlers
 * @param {Object} erpnext - ERPNext client instance
 * @returns {Object} Handler map { toolName: handlerFn }
 */
export function createLeaveHandlers(erpnext) {
  return {
    'erpnext_list_leave_types': async () => {
      return await leaveTools.getLeaveTypes(erpnext);
    },

    'erpnext_get_leave_balance': async (args) => {
      return await leaveTools.getLeaveBalance(erpnext, args || {});
    },

    'erpnext_list_leave_applications': async (args) => {
      return await leaveTools.listLeaveApplications(erpnext, args || {});
    },

    'erpnext_get_leave_application': async (args) => {
      return await leaveTools.getLeaveApplication(erpnext, args.name);
    },

    'erpnext_get_my_pending_leaves': async () => {
      return await leaveTools.getMyPendingLeaves(erpnext);
    },

    'erpnext_get_my_approved_leaves': async (args) => {
      return await leaveTools.getMyApprovedLeaves(erpnext, args || {});
    },

    'erpnext_apply_leave': async (args) => {
      return await leaveTools.createLeaveApplication(erpnext, {
        from_date: args.from_date,
        to_date: args.to_date || args.from_date,
        leave_type: args.leave_type,
        half_day: args.half_day,
        half_day_date: args.half_day_date,
        description: args.description
      });
    },

    'erpnext_submit_leave_application': async (args) => {
      return await leaveTools.submitLeaveApplication(erpnext, args.name);
    },

    'erpnext_cancel_leave_application': async (args) => {
      return await leaveTools.cancelLeaveApplication(erpnext, args.name);
    }
  };
}

export default createLeaveHandlers;
