/**
 * Taiga handlers
 * @module handlers/taiga-handlers
 */

import * as taigaTools from '../tools/taiga.js';

/**
 * Create Taiga tool handlers.
 * @param {Object} erpnext - ERPNext client instance
 * @param {Object} taigaConfig - Taiga configuration { host, token, user, pass }
 * @returns {Object} Handler map { toolName: handlerFn }
 */
export function createTaigaHandlers(erpnext, taigaConfig = {}) {
  // Lazy-instantiate the Taiga client to avoid requiring Taiga config when
  // only ERPNext features are used.
  let TaigaClient;
  let taigaClient;

  const getTaigaClient = async () => {
    if (!taigaClient) {
      if (!TaigaClient) {
        const module = await import('../taiga-client.js');
        TaigaClient = module.TaigaClient || module.default;
      }
      taigaClient = new TaigaClient(taigaConfig);
    }
    return taigaClient;
  };

  return {
    'erpnext_validate_user_story': async (args) => {
      const taiga = await getTaigaClient();
      return await taigaTools.validateUserStory(taiga, args);
    },

    'erpnext_create_user_story': async (args) => {
      const taiga = await getTaigaClient();
      return await taigaTools.createUserStory(taiga, args);
    },

    'erpnext_create_taiga_tasks': async (args) => {
      const taiga = await getTaigaClient();
      return await taigaTools.createTaigaTasks(taiga, args);
    },

    'erpnext_export_tasks_to_erp': async (args) => {
      return await taigaTools.exportTasksToErp(erpnext, args);
    },

    'erpnext_get_taiga_tasks': async (args) => {
      const taiga = await getTaigaClient();
      return await taigaTools.getTaigaTasks(taiga, args);
    },

    'erpnext_update_taiga_task': async (args) => {
      const taiga = await getTaigaClient();
      return await taigaTools.updateTaigaTask(taiga, args);
    },

    'erpnext_download_taiga_attachment': async (args) => {
      const taiga = await getTaigaClient();
      return await taigaTools.downloadTaigaAttachment(taiga, args);
    }
  };
}

export default createTaigaHandlers;
