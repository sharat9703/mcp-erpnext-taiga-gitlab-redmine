/**
 * Taiga API Client
 * @module taiga-client
 *
 * Ported from the taskbridge project. Provides the subset of Taiga API
 * operations needed to validate user stories, create tasks under a user
 * story (with assignee + custom attributes), and shape tasks for export
 * to ERPNext "Developer Task" documents.
 */

import axios from 'axios';

export class TaigaClient {
  /**
   * @param {Object} config
   * @param {string} [config.host]  - Taiga API base (e.g. https://taiga.example.com/api/v1)
   * @param {string} [config.token] - Pre-issued auth token (skips user/pass login)
   * @param {string} [config.user]  - Username (used when no token provided)
   * @param {string} [config.pass]  - Password (used when no token provided)
   */
  constructor(config = {}) {
    const host = config.host || 'https://api.taiga.io/api/v1';
    this.user = config.user || null;
    this.pass = config.pass || null;
    this.token = config.token || null;
    this.client = axios.create({ baseURL: host.replace(/\/$/, '') });
  }

  /**
   * Authenticate with Taiga. Uses the provided token if present, otherwise
   * performs a username/password login to obtain an auth token.
   */
  async authenticate() {
    if (this.token) return;
    if (!this.user || !this.pass) {
      throw new Error('Missing TAIGA_TOKEN or TAIGA_USER/TAIGA_PASS');
    }
    const res = await this.client.post('/auth', {
      type: 'normal',
      username: this.user,
      password: this.pass
    });
    this.token = res.data.auth_token;
  }

  authHeaders() {
    if (!this.token) throw new Error('Taiga not authenticated');
    return { Authorization: `Bearer ${this.token}` };
  }

  async getUserStoryByRef(projectSlug, ref) {
    const res = await this.client.get('/userstories/by_ref', {
      headers: this.authHeaders(),
      params: { ref, project__slug: projectSlug }
    });
    return res.data;
  }

  async getUserStory(userStoryId) {
    const res = await this.client.get(`/userstories/${userStoryId}`, {
      headers: this.authHeaders()
    });
    return res.data;
  }

  async getProjectBySlug(slug) {
    const res = await this.client.get('/projects/by_slug', {
      headers: this.authHeaders(),
      params: { slug }
    });
    return res.data;
  }

  async getTaskStatuses(projectId) {
    const res = await this.client.get('/task-statuses', {
      headers: this.authHeaders(),
      params: { project: projectId }
    });
    return res.data;
  }

  async getTaskAttributeDefs(projectId) {
    const res = await this.client.get('/task-custom-attributes', {
      headers: this.authHeaders(),
      params: { project: projectId }
    });
    return res.data; // [{ id, name, type, ... }]
  }

  async getUserStoryStatuses(projectId) {
    const res = await this.client.get('/userstory-statuses', {
      headers: this.authHeaders(),
      params: { project: projectId }
    });
    return res.data;
  }

  async createUserStory(payload) {
    try {
      const res = await this.client.post('/userstories', payload, {
        headers: this.authHeaders()
      });
      return res.data;
    } catch (e) {
      throw new Error(`Taiga createUserStory failed (${formatStatus(e)}): ${formatDetail(e)}`);
    }
  }

  async getProjectMembers(projectId) {
    const res = await this.client.get(`/projects/${projectId}`, {
      headers: this.authHeaders()
    });
    return res.data.members || [];
  }

  /**
   * Find a project member by username / full name (case-insensitive,
   * exact match preferred then substring match).
   */
  async findProjectMemberByName(projectId, name) {
    const members = await this.getProjectMembers(projectId);
    const searchName = String(name || '').toLowerCase().trim();
    if (!searchName) return null;

    const member = members.find((m) => {
      const username = String(m.username || '').toLowerCase().trim();
      const fullName = String(m.full_name || '').toLowerCase().trim();
      const fullNameDisplay = String(m.full_name_display || '').toLowerCase().trim();
      return (
        username === searchName ||
        fullName === searchName ||
        fullNameDisplay === searchName ||
        username.includes(searchName) ||
        fullName.includes(searchName) ||
        fullNameDisplay.includes(searchName)
      );
    });
    return member || null;
  }

  async createTask(payload) {
    try {
      const res = await this.client.post('/tasks', payload, {
        headers: this.authHeaders()
      });
      return res.data;
    } catch (e) {
      throw new Error(`Taiga createTask failed (${formatStatus(e)}): ${formatDetail(e)}`);
    }
  }

  async setTaskCustomAttributeValues(taskId, attributesValues, version = 1) {
    try {
      const res = await this.client.patch(
        `/tasks/custom-attributes-values/${taskId}`,
        { attributes_values: attributesValues, version },
        { headers: this.authHeaders() }
      );
      return res.data;
    } catch (e) {
      throw new Error(
        `Taiga setTaskCustomAttributeValues failed (${formatStatus(e)}): ${formatDetail(e)}`
      );
    }
  }
}

function formatStatus(e) {
  return e?.response?.status || 'no-status';
}

function formatDetail(e) {
  const data = e?.response?.data;
  if (data && (data.detail || data.message)) return data.detail || data.message;
  if (data) return JSON.stringify(data);
  return String(e?.message || e);
}

/**
 * Parse a Taiga User Story URL of the form
 *   https://<domain>/project/<slug>/us/<ref>
 * @returns {{ slug: string, ref: number }}
 */
export function parseUserStorySlugRef(userStoryUrl) {
  const m = String(userStoryUrl).match(/\/project\/([^/]+)\/us\/(\d+)/);
  if (!m) throw new Error('Could not parse project slug/ref from URL');
  return { slug: m[1], ref: parseInt(m[2], 10) };
}

/**
 * Normalize various date inputs to YYYY-MM-DD (Taiga / ERP friendly).
 * Accepts Excel serial numbers, dd-MM-yyyy, yyyy-MM-dd, or anything Date can parse.
 */
export function normalizeDueDate(input) {
  if (input == null) return null;

  // Excel serial number (days since 1899-12-30)
  if (typeof input === 'number' && isFinite(input)) {
    const base = new Date(Date.UTC(1899, 11, 30));
    const ms = Math.round(input * 24 * 60 * 60 * 1000);
    const d = new Date(base.getTime() + ms);
    return ymdFromDate(d, true);
  }

  const s = String(input).trim();
  if (!s) return null;

  // dd[sep]MM[sep]yyyy
  const m1 = s.match(/^([0-3]?\d)[/\-\s]([0-1]?\d)[/\-\s](\d{4})$/);
  if (m1) {
    return `${m1[3]}-${m1[2].padStart(2, '0')}-${m1[1].padStart(2, '0')}`;
  }
  // yyyy[sep]MM[sep]dd
  const m2 = s.match(/^(\d{4})[/\-\s]([0-1]?\d)[/\-\s]([0-3]?\d)$/);
  if (m2) {
    return `${m2[1]}-${m2[2].padStart(2, '0')}-${m2[3].padStart(2, '0')}`;
  }
  return toYMD(s);
}

/**
 * Format a date-like value to YYYY-MM-DD, or null if invalid.
 */
export function toYMD(dateLike) {
  if (!dateLike) return null;
  const d = typeof dateLike === 'string' ? new Date(dateLike) : dateLike;
  if (isNaN(d.getTime())) return null;
  return ymdFromDate(d, false);
}

function ymdFromDate(d, utc) {
  const y = utc ? d.getUTCFullYear() : d.getFullYear();
  const m = String((utc ? d.getUTCMonth() : d.getMonth()) + 1).padStart(2, '0');
  const dd = String(utc ? d.getUTCDate() : d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Normalize complexity to valid ERP values: Simple, Medium, Complex.
 */
export function normalizeComplexity(complexity) {
  if (!complexity) return 'Simple';
  const c = String(complexity).toLowerCase().trim();
  const map = {
    easy: 'Simple', simple: 'Simple', low: 'Simple', basic: 'Simple', trivial: 'Simple',
    medium: 'Medium', moderate: 'Medium', normal: 'Medium', average: 'Medium',
    complex: 'Complex', hard: 'Complex', difficult: 'Complex', high: 'Complex', advanced: 'Complex'
  };
  return map[c] || 'Simple';
}

/**
 * Map a Taiga task_type (with subject/description hints) to an ERP
 * Developer Task category. Returns null when no mapping is found.
 */
export function taigaTypeToErpCategory(taskType, subject, description) {
  const subjectLower = String(subject || '').toLowerCase();
  const descriptionLower = String(description || '').toLowerCase();

  if (subjectLower.includes('testing') || descriptionLower.includes('testing')) {
    return 'Testing';
  }

  const map = {
    'rest api - nodejs': 'REST Service',
    'rest api - wildfly': 'REST Service',
    'rpc / jds - wildfly': 'Back-end Function',
    'consumer - java': 'Back-end Function',
    'consumer - nodejs': 'Back-end Function',
    'fe - vuejs - component': 'Front-end component',
    'fe - jdc / html': 'Front-end component',
    'fe - react component': 'Front-end component',
    'database - objects': 'DB Procedure'
  };

  const k = String(taskType || '')
    .toLowerCase()
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s*-\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();
  return map[k] || null;
}

export default TaigaClient;
