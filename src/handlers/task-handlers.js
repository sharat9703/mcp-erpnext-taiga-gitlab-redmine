/**
 * Task handlers
 * @module handlers/task-handlers
 */

import * as taskTools from '../tools/task.js';

/**
 * Create task handlers
 * @param {Object} erpnext - ERPNext client instance
 * @param {Object} gitlabConfig - GitLab configuration
 * @returns {Object} Handler map { toolName: handlerFn }
 */
export function createTaskHandlers(erpnext, gitlabConfig) {
  // Lazy import GitLabClient to avoid circular dependencies
  let GitLabClient;
  let gitlabClient;

  const getGitLabClient = async () => {
    if (!gitlabClient) {
      if (!GitLabClient) {
        const module = await import('../gitlab-client.js');
        GitLabClient = module.GitLabClient || module.default;
      }
      gitlabClient = new GitLabClient(gitlabConfig);
    }
    return gitlabClient;
  };

  return {
    'erpnext_list_merge_requests': async (args) => {
      const gitlab = await getGitLabClient();
      return await taskTools.listMergeRequests(gitlab, args);
    },

    'erpnext_analyze_merge_request': async (args) => {
      const gitlab = await getGitLabClient();
      return await taskTools.analyzeMergeRequest(gitlab, args);
    },

    'erpnext_create_tasks_from_analysis': async (args) => {
      return await taskTools.createTasksFromAnalysis(erpnext, args);
    }
  };
}

export default createTaskHandlers;
