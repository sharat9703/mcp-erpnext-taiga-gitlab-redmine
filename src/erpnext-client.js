import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import { authenticator } from 'otplib';

/**
 * ERPNext API Client with session-based authentication
 * Supports password login with optional TOTP 2FA
 */
export class ERPNextClient {
  constructor(config) {
    this.baseUrl = config.url.replace(/\/$/, '');
    this.username = config.username;
    this.password = config.password;
    this.totpSecret = config.totpSecret;

    // Create cookie jar for session management
    this.cookieJar = new CookieJar();

    // Create axios instance with cookie support
    this.client = wrapper(axios.create({
      baseURL: this.baseUrl,
      jar: this.cookieJar,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }));

    this.isAuthenticated = false;
  }

  /**
   * Generate TOTP code from secret
   */
  generateTOTP() {
    if (!this.totpSecret) {
      return null;
    }
    return authenticator.generate(this.totpSecret);
  }

  /**
   * Login to ERPNext with username/password and optional TOTP
   */
  async login() {
    try {
      // Step 1: Initial login request
      const loginResponse = await this.client.post('/api/method/login', {
        usr: this.username,
        pwd: this.password
      });

      // Check if 2FA is required
      if (loginResponse.data.verification && loginResponse.data.tmp_id) {
        // Step 2: 2FA verification required
        if (!this.totpSecret) {
          throw new Error('2FA is required but TOTP_SECRET is not configured');
        }

        const otpCode = this.generateTOTP();

        const verifyResponse = await this.client.post('/api/method/login', {
          usr: this.username,
          pwd: this.password,
          otp: otpCode,
          tmp_id: loginResponse.data.tmp_id
        });

        if (verifyResponse.data.message === 'Logged In' || verifyResponse.data.full_name) {
          this.isAuthenticated = true;
          return { success: true, user: verifyResponse.data.full_name || this.username };
        }
      } else if (loginResponse.data.message === 'Logged In' || loginResponse.data.full_name) {
        // No 2FA required, direct login successful
        this.isAuthenticated = true;
        return { success: true, user: loginResponse.data.full_name || this.username };
      }

      throw new Error('Login failed: ' + JSON.stringify(loginResponse.data));
    } catch (error) {
      if (error.response) {
        throw new Error(`Login failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Ensure we're authenticated before making API calls
   */
  async ensureAuthenticated() {
    if (!this.isAuthenticated) {
      await this.login();
    }
  }

  /**
   * Get logged in user info
   */
  async getLoggedUser() {
    await this.ensureAuthenticated();
    const response = await this.client.get('/api/method/frappe.auth.get_logged_user');
    return response.data;
  }

  /**
   * Get document list
   */
  async getDocList(doctype, options = {}) {
    await this.ensureAuthenticated();
    const response = await this.client.get('/api/resource/' + doctype, { params: options });
    return response.data;
  }

  /**
   * Get single document
   */
  async getDoc(doctype, name) {
    await this.ensureAuthenticated();
    const response = await this.client.get(`/api/resource/${doctype}/${encodeURIComponent(name)}`);
    return response.data;
  }

  /**
   * Create new document
   */
  async createDoc(doctype, doc) {
    await this.ensureAuthenticated();
    const response = await this.client.post(`/api/resource/${doctype}`, doc);
    return response.data;
  }

  /**
   * Update document
   */
  async updateDoc(doctype, name, doc) {
    await this.ensureAuthenticated();
    const response = await this.client.put(`/api/resource/${doctype}/${encodeURIComponent(name)}`, doc);
    return response.data;
  }

  /**
   * Submit document (for submittable doctypes like Timesheet)
   */
  async submitDoc(doctype, name) {
    await this.ensureAuthenticated();

    // First get the document to ensure it exists and is in Draft status
    const doc = await this.getDoc(doctype, name);

    if (doc.data.docstatus !== 0) {
      throw new Error(`Document ${name} is not in Draft status (docstatus: ${doc.data.docstatus})`);
    }

    try {
      const response = await this.client.post('/api/method/frappe.client.submit', {
        doc: doc.data
      });
      return response.data;
    } catch (error) {
      throw new Error(parseErpError(error?.response?.data) || error.message);
    }
  }

  /**
   * Cancel submitted document
   */
  async cancelDoc(doctype, name) {
    await this.ensureAuthenticated();

    try {
      const response = await this.client.post('/api/method/frappe.client.cancel', {
        doctype,
        name
      });
      return response.data;
    } catch (error) {
      throw new Error(parseErpError(error?.response?.data) || error.message);
    }
  }

  /**
   * Run a whitelisted method
   */
  async call(method, args = {}) {
    await this.ensureAuthenticated();
    const response = await this.client.post(`/api/method/${method}`, args);
    return response.data;
  }

  /**
   * Get employee linked to current user
   */
  async getCurrentEmployee() {
    await this.ensureAuthenticated();

    // Get current user
    const userResponse = await this.getLoggedUser();
    const userId = userResponse.message;

    // Find employee linked to this user
    const employees = await this.getDocList('Employee', {
      filters: JSON.stringify([['user_id', '=', userId]]),
      fields: JSON.stringify(['name', 'employee_name', 'company', 'department'])
    });

    if (employees.data && employees.data.length > 0) {
      return employees.data[0];
    }

    throw new Error(`No employee found linked to user: ${userId}`);
  }

  /**
   * Find an Employee code (name) by employee_name (exact, case-insensitive
   * preferred, falling back to the first "like" match). Returns null if none.
   * @param {string} employeeName
   * @returns {Promise<string|null>}
   */
  async findEmployeeCodeByName(employeeName) {
    await this.ensureAuthenticated();
    const name = String(employeeName || '').trim();
    if (!name) return null;

    const response = await this.getDocList('Employee', {
      filters: JSON.stringify([['employee_name', 'like', `%${name}%`]]),
      fields: JSON.stringify(['name', 'employee_name', 'user_id']),
      limit_page_length: 5
    });

    const data = response.data || [];
    if (!data.length) return null;
    const exact = data.find(
      (e) => String(e.employee_name || '').toLowerCase() === name.toLowerCase()
    );
    return String((exact || data[0]).name);
  }

  /**
   * Create a "Developer Task" document from a normalized payload.
   * Unlike createTask(), this preserves Taiga-export fields (taiga_id,
   * developer, product, reviewer, assigner, completed_date) and a details
   * child row. Errors are surfaced with a friendly, parsed message.
   * @param {Object} payload - Fully shaped Developer Task field map
   * @returns {Promise<Object>} Created document
   */
  async createDeveloperTaskDoc(payload) {
    await this.ensureAuthenticated();
    try {
      const response = await this.createDoc('Developer Task', payload);
      return response.data;
    } catch (error) {
      throw new Error(parseErpError(error?.response?.data) || error.message);
    }
  }

  /**
   * Get activity types for timesheet
   */
  async getActivityTypes() {
    await this.ensureAuthenticated();
    const response = await this.getDocList('Activity Type', {
      fields: JSON.stringify(['name', 'activity_type', 'costing_rate', 'billing_rate'])
    });
    return response.data || [];
  }

  /**
   * Get projects list
   */
  async getProjects(filters = {}) {
    await this.ensureAuthenticated();
    const response = await this.getDocList('Project', {
      filters: JSON.stringify(Object.entries(filters).map(([k, v]) => [k, '=', v])),
      fields: JSON.stringify(['name', 'project_name', 'status', 'company'])
    });
    return response.data || [];
  }

  /**
   * Get tasks for a project (Developer Task doctype)
   */
  async getTasks(projectName) {
    await this.ensureAuthenticated();
    const response = await this.getDocList('Developer Task', {
      filters: JSON.stringify([['project', '=', projectName]]),
      fields: JSON.stringify(['name', 'subject', 'status', 'project', 'employee'])
    });
    return response.data || [];
  }

  /**
   * Get Developer Tasks assigned to a developer, with optional filters.
   * Defaults to the currently logged-in user when no developer is given.
   *
   * @param {Object} [options]
   * @param {string} [options.developer_user] - Developer's user id / email (defaults to logged-in user)
   * @param {string} [options.developer_name] - Filter by developer name (LIKE match)
   * @param {string} [options.from_date] - Only tasks created on/after this date (YYYY-MM-DD)
   * @param {string} [options.to_date] - Only tasks created on/before this date (YYYY-MM-DD)
   * @param {string} [options.status] - Filter by status (e.g. "Reviewed", "Open")
   * @param {string} [options.product] - Filter by product (e.g. "MercuryFx")
   * @param {string} [options.search] - Substring match on the task subject
   * @param {number} [options.limit] - Max rows to return (default: all, paginated)
   * @param {string} [options.order] - "asc" | "desc" by creation (default: "desc")
   * @returns {Promise<Array>} Developer Task rows
   */
  async getDeveloperTasks(options = {}) {
    await this.ensureAuthenticated();

    const filters = [];
    if (options.developer_name) {
      filters.push(['developer_name', 'like', `%${options.developer_name}%`]);
    } else {
      let user = options.developer_user;
      if (!user) {
        const logged = await this.getLoggedUser();
        user = logged?.message || logged;
      }
      filters.push(['developer_user', '=', user]);
    }
    if (options.from_date) filters.push(['creation', '>=', `${options.from_date} 00:00:00`]);
    if (options.to_date) filters.push(['creation', '<=', `${options.to_date} 23:59:59`]);
    if (options.status) filters.push(['status', '=', options.status]);
    if (options.product) filters.push(['product', '=', options.product]);
    if (options.search) filters.push(['task', 'like', `%${options.search}%`]);

    const fields = ['name', 'task', 'status', 'workflow_state', 'product',
      'developer_name', 'target_date', 'completed_date', 'creation'];
    const orderDir = (options.order || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
    const orderBy = `creation ${orderDir}`;
    const hardLimit = Number.isFinite(options.limit) ? Number(options.limit) : Infinity;

    const rows = [];
    let start = 0;
    const page = 500;
    while (rows.length < hardLimit) {
      const pageLen = Math.min(page, hardLimit - rows.length);
      const response = await this.getDocList('Developer Task', {
        filters: JSON.stringify(filters),
        fields: JSON.stringify(fields),
        order_by: orderBy,
        limit_start: start,
        limit_page_length: pageLen
      });
      const batch = response.data || [];
      rows.push(...batch);
      if (batch.length < pageLen) break;
      start += batch.length;
    }
    return rows;
  }

  /**
   * Create a task in ERPNext (Developer Task doctype)
   * @param {Object} taskData - Task data
   * @returns {Object} Created task
   */
  async createTask(taskData) {
    await this.ensureAuthenticated();

    const currentUser = await this.getLoggedUser();
    const employee = await this.getCurrentEmployee();

    // Get today's date for target_date if not provided
    const today = new Date().toISOString().split('T')[0];

    // Infer category from description
    const category = this.inferCategory(taskData.description || taskData.subject || '');
    const complexity = taskData.complexity || this.inferComplexity(taskData.description || '');

    const task = {
      doctype: 'Developer Task',
      task: (taskData.subject || '').slice(0, 140),  // Required field
      status: taskData.status || 'Completed',
      target_date: taskData.target_date || today,  // Required field
      project: taskData.project || null,
      employee: employee?.name || null,
      details: [
        {
          doctype: 'Developer Task Detail',
          category: taskData.category || category,
          type: 'New',  // Always 'New' as it's the only supported type
          complexity: complexity,
          description: taskData.description || ''  // Add description field
        }
      ]
    };

    // Assign to current user if not specified
    if (taskData.assigned_to) {
      task._assign = JSON.stringify([taskData.assigned_to]);
    } else if (currentUser && currentUser.message) {
      task._assign = JSON.stringify([currentUser.message]);
    }

    return await this.createDoc('Developer Task', task);
  }

  /**
   * Infer category from description
   * @param {string} text - Description text
   * @returns {string} Category
   */
  inferCategory(text) {
    const lower = text.toLowerCase();
    if (lower.includes('function') || lower.includes('api') || lower.includes('endpoint') || lower.includes('rpc')) {
      return 'Back-end Function';
    }
    if (lower.includes('ui') || lower.includes('button') || lower.includes('form') || lower.includes('component')) {
      return 'Front-end component';
    }
    if (lower.includes('screen') || lower.includes('page')) {
      return 'Screen';
    }
    if (lower.includes('database') || lower.includes('sql') || lower.includes('query') || lower.includes('table')) {
      return 'DB Procedure';
    }
    if (lower.includes('test')) {
      return 'Testing';
    }
    if (lower.includes('setup') || lower.includes('config')) {
      return 'Setup';
    }
    if (lower.includes('rest') || lower.includes('service')) {
      return 'REST Service';
    }
    return 'Back-end Function';  // Default
  }

  /**
   * Infer complexity from description
   * @param {string} text - Description text
   * @returns {string} Complexity level
   */
  inferComplexity(text) {
    const lower = text.toLowerCase();
    if (lower.includes('minor') || lower.includes('simple') || text.length < 50) {
      return 'Simple';
    }
    if (lower.includes('complex') || lower.includes('refactor') || lower.includes('major')) {
      return 'Complex';
    }
    return 'Medium';  // Default
  }

  /**
   * Create multiple tasks in bulk with error recovery
   * @param {Array} tasks - Array of task data objects
   * @returns {Object} Results summary
   */
  async createTasksBulk(tasks) {
    const results = [];

    for (const taskData of tasks) {
      try {
        const result = await this.createTask(taskData);
        results.push({
          success: true,
          task: result.data,
          input: taskData
        });
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          input: taskData
        });
      }
    }

    return {
      total: tasks.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results: results
    };
  }
}

/**
 * Extract a human-friendly message from a Frappe/ERPNext error response body.
 * Falls back to JSON when nothing parseable is found.
 * @param {Object} data - error.response.data
 * @returns {string}
 */
function parseErpError(data) {
  if (!data) return '';
  try {
    if (data._server_messages) {
      const serverMessages = JSON.parse(data._server_messages);
      if (Array.isArray(serverMessages) && serverMessages.length > 0) {
        const first = JSON.parse(serverMessages[0]);
        if (first?.message) {
          return String(first.message).replace(/<[^>]*>/g, '').trim();
        }
      }
    }
    if (data.exception) return String(data.exception);
    if (data.message) return String(data.message);
  } catch (_e) {
    // fall through to JSON
  }
  return JSON.stringify(data);
}

export default ERPNextClient;
