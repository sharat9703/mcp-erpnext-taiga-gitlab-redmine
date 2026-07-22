/**
 * Redmine API Client for MCP-ERPNext
 * Handles fetching issue/ticket details for software releases
 */

import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export class RedmineClient {
  constructor(config) {
    this.baseURL = config.url || 'https://support.credenceanalytics.com';
    this.apiKey = config.apiKey;

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'X-Redmine-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * Parse Redmine issue URL or ID to extract issue ID
   * @param {string} issueUrlOrId - Redmine issue URL or ID
   * @returns {string} Issue ID
   */
  parseIssueId(issueUrlOrId) {
    if (!issueUrlOrId) return null;

    const str = String(issueUrlOrId).trim();

    // If it's just a number, return it
    if (/^\d+$/.test(str)) {
      return str;
    }

    // Try to parse as URL
    try {
      const parsed = new URL(str);
      const pathParts = parsed.pathname.split('/').filter(Boolean);

      // Look for /issues/12345 pattern
      const issuesIndex = pathParts.findIndex(part => part === 'issues');
      if (issuesIndex !== -1 && pathParts[issuesIndex + 1]) {
        const id = pathParts[issuesIndex + 1];
        if (/^\d+$/.test(id)) {
          return id;
        }
      }
    } catch (e) {
      // Not a valid URL, try regex extraction
    }

    // Try to extract number from string (e.g., "#12345" or "issue-12345")
    const match = str.match(/(\d{5,})/);
    if (match) {
      return match[1];
    }

    return null;
  }

  /**
   * Get issue details from Redmine
   * @param {string} issueUrlOrId - Redmine issue URL or ID
   * @returns {Object} Issue details
   */
  async getIssue(issueUrlOrId) {
    const issueId = this.parseIssueId(issueUrlOrId);

    if (!issueId) {
      return {
        success: false,
        error: `Could not parse issue ID from: ${issueUrlOrId}`
      };
    }

    try {
      const response = await this.client.get(`/issues/${issueId}.json`);
      const issue = response.data.issue;

      return {
        success: true,
        data: {
          id: issue.id,
          subject: issue.subject,
          description: issue.description,
          status: issue.status?.name,
          priority: issue.priority?.name,
          project: issue.project?.name,
          tracker: issue.tracker?.name,
          author: issue.author?.name,
          assignedTo: issue.assigned_to?.name,
          createdOn: issue.created_on,
          updatedOn: issue.updated_on,
          url: `${this.baseURL}/issues/${issue.id}`
        }
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return {
          success: false,
          error: `Issue #${issueId} not found`
        };
      }
      if (error.response?.status === 401 || error.response?.status === 403) {
        return {
          success: false,
          error: 'Redmine authentication failed - check API key'
        };
      }
      return {
        success: false,
        error: error.response?.data?.errors?.join(', ') || error.message
      };
    }
  }

  /**
   * Get full issue details including description, comments (journals),
   * attachments, children and relations.
   * @param {string} issueUrlOrId - Redmine issue URL or ID
   * @param {string[]} include - Sections to include (journals, attachments, children, relations, watchers)
   * @returns {Object} Full issue details
   */
  async getIssueFull(issueUrlOrId, include = ['journals', 'attachments', 'children', 'relations']) {
    const issueId = this.parseIssueId(issueUrlOrId);

    if (!issueId) {
      return {
        success: false,
        error: `Could not parse issue ID from: ${issueUrlOrId}`
      };
    }

    try {
      const params = include && include.length ? { include: include.join(',') } : {};
      const response = await this.client.get(`/issues/${issueId}.json`, { params });
      const issue = response.data.issue;

      // Extract comments (journal entries that carry a note)
      const comments = (issue.journals || [])
        .filter(j => j.notes && j.notes.trim())
        .map(j => ({
          id: j.id,
          author: j.user?.name,
          createdOn: j.created_on,
          private: j.private_notes || false,
          notes: j.notes
        }));

      const attachments = (issue.attachments || []).map(a => ({
        id: a.id,
        filename: a.filename,
        filesize: a.filesize,
        contentType: a.content_type,
        description: a.description,
        author: a.author?.name,
        createdOn: a.created_on,
        contentUrl: a.content_url
      }));

      const children = (issue.children || []).map(c => ({
        id: c.id,
        subject: c.subject,
        tracker: c.tracker?.name,
        url: `${this.baseURL}/issues/${c.id}`
      }));

      const relations = (issue.relations || []).map(r => ({
        id: r.id,
        type: r.relation_type,
        issueId: r.issue_id,
        issueToId: r.issue_to_id
      }));

      return {
        success: true,
        data: {
          id: issue.id,
          subject: issue.subject,
          description: issue.description,
          status: issue.status?.name,
          statusId: issue.status?.id,
          priority: issue.priority?.name,
          project: issue.project?.name,
          tracker: issue.tracker?.name,
          author: issue.author?.name,
          assignedTo: issue.assigned_to?.name,
          doneRatio: issue.done_ratio,
          startDate: issue.start_date,
          dueDate: issue.due_date,
          createdOn: issue.created_on,
          updatedOn: issue.updated_on,
          parent: issue.parent?.id,
          customFields: (issue.custom_fields || []).map(f => ({ name: f.name, value: f.value })),
          comments,
          attachments,
          children,
          relations,
          url: `${this.baseURL}/issues/${issue.id}`
        }
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return { success: false, error: `Issue #${issueId} not found` };
      }
      if (error.response?.status === 401 || error.response?.status === 403) {
        return { success: false, error: 'Redmine authentication failed - check API key' };
      }
      return {
        success: false,
        error: error.response?.data?.errors?.join(', ') || error.message
      };
    }
  }

  /**
   * List available issue statuses (for resolving status name -> id).
   * @returns {Object} { success, statuses: [{ id, name, isClosed }] }
   */
  async listStatuses() {
    try {
      const response = await this.client.get('/issue_statuses.json');
      const statuses = (response.data.issue_statuses || []).map(s => ({
        id: s.id,
        name: s.name,
        isClosed: s.is_closed || false
      }));
      return { success: true, statuses };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.errors?.join(', ') || error.message
      };
    }
  }

  /**
   * Update a Redmine issue. Supports adding a note/comment and changing
   * fields such as status, assignee, priority, done ratio, etc.
   * @param {string} issueUrlOrId - Redmine issue URL or ID
   * @param {Object} fields - Issue fields to set. Recognised keys:
   *   notes, privateNotes, statusId, assignedToId, priorityId,
   *   doneRatio, subject, description, dueDate, startDate
   * @returns {Object} { success, message } - Redmine returns 204 (no body) on success
   */
  async updateIssue(issueUrlOrId, fields = {}) {
    const issueId = this.parseIssueId(issueUrlOrId);

    if (!issueId) {
      return { success: false, error: `Could not parse issue ID from: ${issueUrlOrId}` };
    }

    const issue = {};
    if (fields.notes !== undefined) issue.notes = fields.notes;
    if (fields.privateNotes !== undefined) issue.private_notes = fields.privateNotes;
    if (fields.statusId !== undefined) issue.status_id = fields.statusId;
    if (fields.assignedToId !== undefined) issue.assigned_to_id = fields.assignedToId;
    if (fields.priorityId !== undefined) issue.priority_id = fields.priorityId;
    if (fields.doneRatio !== undefined) issue.done_ratio = fields.doneRatio;
    if (fields.subject !== undefined) issue.subject = fields.subject;
    if (fields.description !== undefined) issue.description = fields.description;
    if (fields.dueDate !== undefined) issue.due_date = fields.dueDate;
    if (fields.startDate !== undefined) issue.start_date = fields.startDate;

    if (Object.keys(issue).length === 0) {
      return { success: false, error: 'No fields provided to update' };
    }

    try {
      await this.client.put(`/issues/${issueId}.json`, { issue });
      return {
        success: true,
        issueId: Number(issueId),
        updated: Object.keys(issue),
        url: `${this.baseURL}/issues/${issueId}`
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return { success: false, error: `Issue #${issueId} not found` };
      }
      if (error.response?.status === 401 || error.response?.status === 403) {
        return { success: false, error: 'Redmine authentication failed or insufficient permissions' };
      }
      if (error.response?.status === 422) {
        return {
          success: false,
          error: error.response?.data?.errors?.join(', ') || 'Validation failed'
        };
      }
      return {
        success: false,
        error: error.response?.data?.errors?.join(', ') || error.message
      };
    }
  }

  /**
   * Get the currently-authenticated user (resolved from the API key).
   * @returns {Object} { success, user: { id, login, firstName, lastName } }
   */
  async getCurrentUser() {
    try {
      const response = await this.client.get('/users/current.json');
      const user = response.data.user;
      return {
        success: true,
        user: {
          id: user.id,
          login: user.login,
          firstName: user.firstname,
          lastName: user.lastname
        }
      };
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        return { success: false, error: 'Redmine authentication failed - check API key' };
      }
      return {
        success: false,
        error: error.response?.data?.errors?.join(', ') || error.message
      };
    }
  }

  /**
   * Create a new Redmine issue.
   * @param {Object} fields - Issue fields. Recognised keys:
   *   projectId (required), subject (required), trackerId, description,
   *   assignedToId, priorityId, statusId, dueDate, startDate, parentIssueId,
   *   customFields ([{ id, value }])
   * @returns {Object} { success, issueId, url } - Redmine returns 201 with the created issue
   */
  async createIssue(fields = {}) {
    if (!fields.projectId) {
      return { success: false, error: 'projectId is required to create an issue' };
    }
    if (!fields.subject) {
      return { success: false, error: 'subject is required to create an issue' };
    }

    const issue = { project_id: fields.projectId, subject: fields.subject };
    if (fields.trackerId !== undefined) issue.tracker_id = fields.trackerId;
    if (fields.description !== undefined) issue.description = fields.description;
    if (fields.assignedToId !== undefined) issue.assigned_to_id = fields.assignedToId;
    if (fields.priorityId !== undefined) issue.priority_id = fields.priorityId;
    if (fields.statusId !== undefined) issue.status_id = fields.statusId;
    if (fields.dueDate !== undefined) issue.due_date = fields.dueDate;
    if (fields.startDate !== undefined) issue.start_date = fields.startDate;
    if (fields.parentIssueId !== undefined) issue.parent_issue_id = fields.parentIssueId;
    if (Array.isArray(fields.customFields) && fields.customFields.length) {
      issue.custom_fields = fields.customFields.map(f => ({ id: f.id, value: f.value }));
    }

    try {
      const response = await this.client.post('/issues.json', { issue });
      const created = response.data.issue;
      return {
        success: true,
        issueId: created.id,
        subject: created.subject,
        status: created.status?.name,
        tracker: created.tracker?.name,
        project: created.project?.name,
        url: `${this.baseURL}/issues/${created.id}`
      };
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        return { success: false, error: 'Redmine authentication failed or insufficient permissions to create an issue' };
      }
      if (error.response?.status === 422) {
        return {
          success: false,
          error: error.response?.data?.errors?.join(', ') || 'Validation failed'
        };
      }
      return {
        success: false,
        error: error.response?.data?.errors?.join(', ') || error.message
      };
    }
  }

  /**
   * Get multiple issues
   * @param {string[]} issueUrlsOrIds - Array of issue URLs or IDs
   * @returns {Object[]} Array of issue details
   */
  async getIssues(issueUrlsOrIds) {
    const results = await Promise.all(
      issueUrlsOrIds.map(id => this.getIssue(id))
    );
    return results;
  }

  /**
   * Get issue title/subject only
   * @param {string} issueUrlOrId - Redmine issue URL or ID
   * @returns {Object} { id, title, url } or error
   */
  async getIssueTitle(issueUrlOrId) {
    const result = await this.getIssue(issueUrlOrId);

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: {
        id: result.data.id,
        title: result.data.subject,
        url: result.data.url
      }
    };
  }

  /**
   * Get titles for multiple issues
   * @param {string[]} issueUrlsOrIds - Array of issue URLs or IDs
   * @returns {Object[]} Array of { id, title, url }
   */
  async getIssueTitles(issueUrlsOrIds) {
    const results = await Promise.all(
      issueUrlsOrIds.map(id => this.getIssueTitle(id))
    );
    return results;
  }

  /**
   * Extract a numeric attachment id from a Redmine attachment id or URL.
   * Accepts: "267232", ".../attachments/download/267232/file.txt",
   *          ".../attachments/267232".
   * @param {string|number} idOrUrl
   * @returns {string} attachment id
   */
  parseAttachmentId(idOrUrl) {
    if (idOrUrl == null) throw new Error('attachment id/url is required');
    const s = String(idOrUrl).trim();
    if (/^\d+$/.test(s)) return s;
    const m = s.match(/attachments\/(?:download\/)?(\d+)/);
    if (m) return m[1];
    throw new Error(`Could not parse an attachment id from "${idOrUrl}"`);
  }

  /**
   * Get attachment metadata (filename, size, content type, content_url).
   * @param {string} attachmentId
   */
  async getAttachmentMeta(attachmentId) {
    const res = await this.client.get(`/attachments/${attachmentId}.json`);
    return res.data.attachment;
  }

  /**
   * Download a Redmine attachment to disk.
   * @param {string|number} idOrUrl - attachment id or download URL
   * @param {Object} [opts]
   * @param {string} [opts.saveDir] - directory to save into (default: os tmp/devflow-attachments)
   * @returns {Object} { id, filename, size, contentType, path }
   */
  async downloadAttachment(idOrUrl, opts = {}) {
    const attachmentId = this.parseAttachmentId(idOrUrl);
    const meta = await this.getAttachmentMeta(attachmentId);
    const dir = opts.saveDir || path.join(os.tmpdir(), 'devflow-attachments', 'redmine');
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `${attachmentId}_${meta.filename}`);
    const dl = await axios.get(meta.content_url, {
      headers: { 'X-Redmine-API-Key': this.apiKey },
      responseType: 'arraybuffer',
      timeout: 120000
    });
    fs.writeFileSync(filePath, Buffer.from(dl.data));
    return {
      id: Number(attachmentId),
      filename: meta.filename,
      size: meta.filesize,
      contentType: meta.content_type,
      path: filePath
    };
  }
}

export default RedmineClient;
