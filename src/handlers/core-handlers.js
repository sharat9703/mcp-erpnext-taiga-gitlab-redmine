/**
 * Core handlers - login, employee, projects
 * @module handlers/core-handlers
 */

/**
 * Register core handlers
 * @param {Object} erpnext - ERPNext client instance
 * @returns {Object} Handler map { toolName: handlerFn }
 */
export function createCoreHandlers(erpnext) {
  return {
    'erpnext_login': async () => {
      return await erpnext.login();
    },

    'erpnext_get_current_employee': async () => {
      return await erpnext.getCurrentEmployee();
    },

    'erpnext_list_activity_types': async () => {
      return await erpnext.getActivityTypes();
    },

    'erpnext_list_projects': async (args) => {
      return await erpnext.getProjects(args?.status ? { status: args.status } : {});
    },

    'erpnext_list_tasks': async (args) => {
      return await erpnext.getTasks(args.project);
    }
  };
}

export default createCoreHandlers;
