/**
 * GitLab API Client for MCP-ERPNext
 * Handles fetching merge request details for software releases
 */

import axios from 'axios';

export class GitLabClient {
  constructor(config) {
    this.baseURL = config.url || 'https://gitlab.credenceanalytics.com';
    this.token = config.token;

    this.client = axios.create({
      baseURL: `${this.baseURL}/api/v4`,
      headers: {
        'PRIVATE-TOKEN': this.token,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * Parse merge request URL to extract project path and MR ID
   * @param {string} mrUrl - GitLab merge request URL
   * @returns {Object} { projectPath, mrId, baseUrl }
   */
  parseMergeRequestUrl(mrUrl) {
    try {
      const parsed = new URL(mrUrl);
      const pathParts = parsed.pathname.split('/').filter(Boolean);

      // Find merge_requests index
      const mrIndex = pathParts.findIndex(part => part === 'merge_requests');
      if (mrIndex === -1) {
        throw new Error('Not a valid merge request URL');
      }

      // Extract project path (everything before merge_requests, excluding -)
      const projectParts = pathParts.slice(0, mrIndex).filter(part => part !== '-');
      const mrId = pathParts[mrIndex + 1];

      if (!mrId || !/^\d+$/.test(mrId)) {
        throw new Error('Invalid merge request ID in URL');
      }

      return {
        baseUrl: `${parsed.protocol}//${parsed.host}`,
        projectPath: projectParts.join('/'),
        mrId: parseInt(mrId, 10)
      };
    } catch (error) {
      throw new Error(`Failed to parse MR URL: ${error.message}`);
    }
  }

  /**
   * Get merge request details
   * @param {string} mrUrl - Full GitLab merge request URL
   * @returns {Object} Merge request details
   */
  async getMergeRequest(mrUrl) {
    const { projectPath, mrId } = this.parseMergeRequestUrl(mrUrl);

    try {
      const response = await this.client.get(
        `/projects/${encodeURIComponent(projectPath)}/merge_requests/${mrId}`
      );

      const mr = response.data;

      return {
        success: true,
        data: {
          id: mr.iid,
          title: mr.title,
          description: mr.description || '',
          state: mr.state,
          sourceBranch: mr.source_branch,
          targetBranch: mr.target_branch,
          author: mr.author?.name || mr.author?.username,
          mergedBy: mr.merged_by?.name || mr.merged_by?.username,
          mergedAt: mr.merged_at,
          createdAt: mr.created_at,
          webUrl: mr.web_url,
          projectPath: projectPath,
          projectId: mr.project_id
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Get multiple merge requests from URLs
   * @param {string[]} mrUrls - Array of merge request URLs
   * @returns {Object[]} Array of merge request details
   */
  async getMergeRequests(mrUrls) {
    const results = await Promise.all(
      mrUrls.map(url => this.getMergeRequest(url))
    );

    return results;
  }

  /**
   * Get merge request changes (diff)
   * @param {string} mrUrl - Full GitLab merge request URL
   * @returns {Object} MR changes with diff
   */
  async getMergeRequestChanges(mrUrl) {
    const { projectPath, mrId } = this.parseMergeRequestUrl(mrUrl);

    try {
      const response = await this.client.get(
        `/projects/${encodeURIComponent(projectPath)}/merge_requests/${mrId}/changes`
      );

      return {
        success: true,
        data: response.data.changes || []
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extract Redmine IDs and titles from MR description
   * Parses table format like: | 1. | #124323 | Liberalized Remittance Scheme (LRS) API Change |
   * @param {string} description - MR description text
   * @returns {Object[]} Array of { id, url, title }
   */
  extractRedmineIds(description) {
    if (!description) return [];

    const ids = new Set();
    const results = [];

    // Pattern 1: Table row format - | Sr. No. | #124323 | Title Here |
    // Matches: | 1. | #124323 | Some Title |
    const tableRowPattern = /\|\s*\d+\.?\s*\|\s*#(\d{5,})\s*\|\s*([^|]+)\s*\|/gi;
    let match;

    while ((match = tableRowPattern.exec(description)) !== null) {
      const id = match[1];
      const title = match[2].trim();
      if (!ids.has(id)) {
        ids.add(id);
        results.push({
          id: id,
          url: `https://support.credenceanalytics.com/issues/${id}`,
          title: title || null
        });
      }
    }

    // Pattern 2: Table row with linked Redmine - | 1. | [#124323](url) | Title |
    const linkedTablePattern = /\|\s*\d+\.?\s*\|\s*\[#(\d{5,})\][^|]*\|\s*([^|]+)\s*\|/gi;
    while ((match = linkedTablePattern.exec(description)) !== null) {
      const id = match[1];
      const title = match[2].trim();
      if (!ids.has(id)) {
        ids.add(id);
        results.push({
          id: id,
          url: `https://support.credenceanalytics.com/issues/${id}`,
          title: title || null
        });
      }
    }

    // Pattern 3: Full URL pattern: https://support.credenceanalytics.com/issues/123456
    const urlPattern = /https?:\/\/support\.credenceanalytics\.com\/issues\/(\d+)/gi;
    while ((match = urlPattern.exec(description)) !== null) {
      const id = match[1];
      if (!ids.has(id)) {
        ids.add(id);
        results.push({
          id: id,
          url: `https://support.credenceanalytics.com/issues/${id}`,
          title: null
        });
      }
    }

    // Pattern 4: Simple hash pattern (fallback): #123456
    const hashPattern = /#(\d{5,})/g;
    while ((match = hashPattern.exec(description)) !== null) {
      const id = match[1];
      if (!ids.has(id)) {
        ids.add(id);
        results.push({
          id: id,
          url: `https://support.credenceanalytics.com/issues/${id}`,
          title: null
        });
      }
    }

    return results;
  }

  /**
   * Map project path to customer name
   * @param {string} projectPath - GitLab project path
   * @returns {Object} { customer, confidence }
   */
  mapProjectToCustomer(projectPath) {
    const pathLower = projectPath.toLowerCase();

    // Customer mapping based on project path patterns
    const customerMap = {
      'kotak': 'Kotak Mahindra Bank',
      'tcil': 'Thomas Cook',
      'astra': 'Thomas Cook',
      'sbi': 'State Bank of India',
      'hdfc': 'HDFC Bank',
      'icici': 'ICICI Bank',
      'axis': 'Axis Bank',
      'yes': 'Yes Bank',
      'indusind': 'IndusInd Bank',
      'federal': 'Federal Bank',
      'rbl': 'RBL Bank',
      'idfc': 'IDFC First Bank',
      'bandhan': 'Bandhan Bank',
      'ing': 'Kotak Mahindra Bank',  // ING projects are for Kotak
      'mudra': 'Standard Product',
      'mfxstd': 'Standard Product'
    };

    for (const [pattern, customer] of Object.entries(customerMap)) {
      if (pathLower.includes(pattern)) {
        return {
          customer,
          confidence: 'high',
          matchedPattern: pattern
        };
      }
    }

    return {
      customer: null,
      confidence: 'none',
      matchedPattern: null
    };
  }

  /**
   * Extract version from branch name or MR title
   * @param {string} sourceBranch - Source branch name
   * @param {string} title - MR title
   * @returns {string|null} Extracted version or null
   */
  extractVersion(sourceBranch, title) {
    // Common version patterns
    const patterns = [
      /v?(\d+\.\d+\.\d+\.\d+)/i,  // 5.0.0.411 or v5.0.0.411
      /v?(\d+\.\d+\.\d+)/i,       // 5.0.0 or v5.0.0
      /v?(\d+\.\d+)/i             // 5.0 or v5.0
    ];

    const sources = [sourceBranch, title].filter(Boolean);

    for (const source of sources) {
      for (const pattern of patterns) {
        const match = source.match(pattern);
        if (match) {
          return match[1];
        }
      }
    }

    return null;
  }

  /**
   * Get project details
   * @param {string} projectPath - GitLab project path
   * @returns {Object} Project details
   */
  async getProject(projectPath) {
    try {
      const response = await this.client.get(
        `/projects/${encodeURIComponent(projectPath)}`
      );

      return {
        success: true,
        data: {
          id: response.data.id,
          name: response.data.name,
          path: response.data.path_with_namespace,
          webUrl: response.data.web_url,
          defaultBranch: response.data.default_branch
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Get merge request notes/comments (contains uploaded files)
   * @param {string} mrUrl - Merge request URL
   * @returns {Object} Notes with extracted upload URLs
   */
  async getMergeRequestNotes(mrUrl) {
    const { projectPath, mrId } = this.parseMergeRequestUrl(mrUrl);

    try {
      const response = await this.client.get(
        `/projects/${encodeURIComponent(projectPath)}/merge_requests/${mrId}/notes`,
        { params: { per_page: 100 } }
      );

      const notes = response.data;

      // Extract uploaded file URLs from notes
      const uploads = this.extractUploadsFromNotes(notes, projectPath);

      return {
        success: true,
        notes: notes,
        uploads: uploads
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        uploads: { patches: [], testReports: [], scripts: [], configs: [] }
      };
    }
  }

  /**
   * Extract uploaded file URLs from MR notes
   * @param {Array} notes - MR notes array
   * @param {string} projectPath - Project path for building full URLs
   * @returns {Object} Categorized uploads { patches, testReports, scripts, configs }
   */
  extractUploadsFromNotes(notes, projectPath) {
    const uploads = {
      patches: [],
      testReports: [],
      scripts: [],
      configs: [],
      other: []
    };

    // Pattern to match GitLab upload URLs
    const uploadPattern = /https?:\/\/gitlab[^\s\)]+\/uploads\/[^\s\)]+/gi;
    // Alternative pattern: /uploads/hash/filename in markdown
    const markdownUploadPattern = /\[([^\]]+)\]\(\/uploads\/([^)]+)\)/gi;

    for (const note of notes) {
      const body = note.body || '';

      // Find all upload URLs
      let match;

      // Full URL pattern
      while ((match = uploadPattern.exec(body)) !== null) {
        const url = match[0];
        this.categorizeUpload(url, uploads);
      }

      // Reset regex
      uploadPattern.lastIndex = 0;

      // Markdown pattern - build full URL
      while ((match = markdownUploadPattern.exec(body)) !== null) {
        const filename = match[1];
        const uploadPath = match[2];
        const fullUrl = `${this.baseURL}/${projectPath}/uploads/${uploadPath}`;
        this.categorizeUpload(fullUrl, uploads, filename);
      }
    }

    return uploads;
  }

  /**
   * Categorize an upload URL based on filename
   * @param {string} url - Upload URL
   * @param {Object} uploads - Uploads object to add to
   * @param {string} filename - Optional filename hint
   */
  categorizeUpload(url, uploads, filename = null) {
    const urlLower = url.toLowerCase();
    const filenameLower = (filename || url).toLowerCase();

    // Avoid duplicates
    const allUrls = [...uploads.patches, ...uploads.testReports, ...uploads.scripts, ...uploads.configs, ...uploads.other];
    if (allUrls.includes(url)) return;

    // Categorize based on filename/URL patterns
    if (filenameLower.includes('patch') || filenameLower.includes('.war') ||
        urlLower.includes('patch') || filenameLower.includes('warpatch') ||
        filenameLower.includes('wildfly')) {
      uploads.patches.push(url);
    } else if (filenameLower.includes('test') || filenameLower.includes('report') ||
               filenameLower.includes('testreport')) {
      uploads.testReports.push(url);
    } else if (filenameLower.includes('script') || filenameLower.includes('manual')) {
      uploads.scripts.push(url);
    } else if (filenameLower.includes('config') || filenameLower.includes('configuration')) {
      uploads.configs.push(url);
    } else if (filenameLower.endsWith('.zip') || filenameLower.endsWith('.docx') ||
               filenameLower.endsWith('.txt') || filenameLower.endsWith('.pdf')) {
      uploads.other.push(url);
    }
  }

  /**
   * Get all uploads from MR description and notes
   * @param {string} mrUrl - Merge request URL
   * @returns {Object} All uploads found
   */
  async getAllMrUploads(mrUrl) {
    const { projectPath, mrId } = this.parseMergeRequestUrl(mrUrl);

    try {
      // Get MR details for description
      const mrResponse = await this.getMergeRequest(mrUrl);

      // Get MR notes
      const notesResponse = await this.getMergeRequestNotes(mrUrl);

      // Combine uploads from description and notes
      const allUploads = {
        patches: [],
        testReports: [],
        scripts: [],
        configs: [],
        other: []
      };

      // Extract from MR description
      if (mrResponse.success && mrResponse.data.description) {
        const descUploads = this.extractUploadsFromText(mrResponse.data.description, projectPath);
        this.mergeUploads(allUploads, descUploads);
      }

      // Merge notes uploads
      if (notesResponse.success) {
        this.mergeUploads(allUploads, notesResponse.uploads);
      }

      return {
        success: true,
        uploads: allUploads,
        hasPatches: allUploads.patches.length > 0,
        hasTestReports: allUploads.testReports.length > 0
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        uploads: { patches: [], testReports: [], scripts: [], configs: [], other: [] }
      };
    }
  }

  /**
   * Extract uploads from text (description or note body)
   * @param {string} text - Text to extract from
   * @param {string} projectPath - Project path
   * @returns {Object} Categorized uploads
   */
  extractUploadsFromText(text, projectPath) {
    const uploads = {
      patches: [],
      testReports: [],
      scripts: [],
      configs: [],
      other: []
    };

    if (!text) return uploads;

    // Full GitLab upload URL pattern
    const uploadPattern = /https?:\/\/gitlab[^\s\)\]]+\/uploads\/[^\s\)\]]+/gi;
    // Project upload pattern (e.g., /-/project/123/uploads/...)
    const projectUploadPattern = /https?:\/\/gitlab[^\s\)\]]+\/-\/project\/\d+\/uploads\/[^\s\)\]]+/gi;

    let match;

    while ((match = uploadPattern.exec(text)) !== null) {
      this.categorizeUpload(match[0], uploads);
    }

    while ((match = projectUploadPattern.exec(text)) !== null) {
      this.categorizeUpload(match[0], uploads);
    }

    return uploads;
  }

  /**
   * Merge two upload objects
   * @param {Object} target - Target uploads object
   * @param {Object} source - Source uploads object
   */
  mergeUploads(target, source) {
    for (const category of ['patches', 'testReports', 'scripts', 'configs', 'other']) {
      for (const url of (source[category] || [])) {
        if (!target[category].includes(url)) {
          target[category].push(url);
        }
      }
    }
  }

  /**
   * List merge requests from a project with filters
   * @param {string} projectPath - Project path (e.g., "group/project")
   * @param {Object} filters - Filter options
   * @returns {Array} List of merge requests
   */
  async listMergeRequests(projectPath, filters = {}) {
    const {
      state = 'merged',
      author_username,
      target_branch,
      created_after,
      created_before,
      sort = 'created_date',
      order_by = 'created_at',
      per_page = 40
    } = filters;

    const params = {
      state,
      order_by,
      sort: 'desc',
      per_page
    };

    if (author_username) params.author_username = author_username;
    if (target_branch) params.target_branch = target_branch;
    if (created_after) params.created_after = created_after;
    if (created_before) params.created_before = created_before;

    try {
      const response = await this.client.get(
        `/projects/${encodeURIComponent(projectPath)}/merge_requests`,
        { params }
      );

      return {
        success: true,
        data: response.data.map(mr => ({
          iid: mr.iid,
          title: mr.title,
          web_url: mr.web_url,
          author: {
            name: mr.author?.name,
            username: mr.author?.username,
            email: mr.author?.email
          },
          created_at: mr.created_at,
          updated_at: mr.updated_at,
          merged_at: mr.merged_at,
          source_branch: mr.source_branch,
          target_branch: mr.target_branch,
          state: mr.state
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Get commits from a merge request
   * @param {string} mrUrl - Merge request URL
   * @returns {Array} Commits with hash, subject, author, date
   */
  async getMergeRequestCommits(mrUrl) {
    const { projectPath, mrId } = this.parseMergeRequestUrl(mrUrl);

    try {
      const response = await this.client.get(
        `/projects/${encodeURIComponent(projectPath)}/merge_requests/${mrId}/commits`
      );

      return {
        success: true,
        data: response.data.map(commit => ({
          hash: commit.id,
          short_hash: commit.short_id,
          subject: commit.title,
          message: commit.message,
          author_name: commit.author_name,
          author_email: commit.author_email,
          authored_date: commit.authored_date,
          committed_date: commit.committed_date
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
}

export default GitLabClient;
