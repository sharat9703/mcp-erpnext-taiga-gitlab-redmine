/**
 * Software Release handlers
 * @module handlers/software-release-handlers
 */

import * as softwareReleaseTools from '../tools/software-release.js';

/**
 * Create software release handlers
 * @param {Object} erpnext - ERPNext client instance
 * @param {Object} gitlabConfig - GitLab configuration
 * @param {Object} redmineConfig - Redmine configuration
 * @returns {Object} Handler map { toolName: handlerFn }
 */
export function createSoftwareReleaseHandlers(erpnext, gitlabConfig, redmineConfig = {}) {
  return {
    'erpnext_create_software_release': async (args) => {
      return await softwareReleaseTools.createSoftwareRelease(erpnext, gitlabConfig, redmineConfig, args);
    },

    'erpnext_preview_software_release': async (args) => {
      return await softwareReleaseTools.previewSoftwareRelease(erpnext, gitlabConfig, redmineConfig, args);
    },

    'erpnext_list_products': async () => {
      return await softwareReleaseTools.listProducts(erpnext);
    },

    'erpnext_list_customers_for_release': async (args) => {
      return await softwareReleaseTools.listCustomersForRelease(erpnext, args?.limit);
    },

    'erpnext_get_mr_details': async (args) => {
      return await softwareReleaseTools.getMrDetails(gitlabConfig, args.mr_url);
    },

    'erpnext_get_redmine_issue': async (args) => {
      return await softwareReleaseTools.getRedmineIssue(redmineConfig, args.issue_id);
    },

    'erpnext_get_redmine_issue_details': async (args) => {
      return await softwareReleaseTools.getRedmineIssueDetails(redmineConfig, args.issue_id, {
        includeComments: args.include_comments,
        includeAttachments: args.include_attachments,
        includeChildren: args.include_children
      });
    },

    'erpnext_update_redmine_issue': async (args) => {
      return await softwareReleaseTools.updateRedmineIssue(redmineConfig, args);
    },

    'erpnext_get_software_release': async (args) => {
      return await softwareReleaseTools.getSoftwareRelease(erpnext, args.release_url, args.release_name);
    },

    'erpnext_list_software_releases': async (args) => {
      return await softwareReleaseTools.listSoftwareReleases(erpnext, args || {});
    }
  };
}

export default createSoftwareReleaseHandlers;
