/**
 * Software Release tools for ERPNext MCP Server
 * Creates software release documents from GitLab merge requests
 */

import fs from 'node:fs';
import { GitLabClient } from '../gitlab-client.js';
import { RedmineClient } from '../redmine-client.js';

/**
 * Customer-Project path mapping
 * Maps GitLab project path patterns to customer names
 */
const CUSTOMER_PROJECT_MAP = {
  // Customer-specific projects
  'kotak': 'Kotak Mahindra Bank',
  'tcil': 'Thomas Cook',
  'astra': 'Thomas Cook',
  'thomascook': 'Thomas Cook',
  'mudra2': 'Thomas Cook',
  'intranet': 'Thomas Cook',
  'sbi': 'State Bank of India',
  'hdfc': 'HDFC Bank',
  'icici': 'ICICI Bank',
  'ybl': 'Yes Bank',
  'yesbank': 'Yes Bank',
  'mudra': 'Thomas Cook'
};

/**
 * Map project path to customer name
 * @param {string} projectPath - GitLab project path
 * @returns {Object} { customer, confidence, matchedPattern }
 */
function mapProjectToCustomer(projectPath) {
  const pathLower = projectPath.toLowerCase();

  for (const [pattern, customer] of Object.entries(CUSTOMER_PROJECT_MAP)) {
    if (pathLower.includes(pattern)) {
      return {
        customer,
        confidence: customer ? 'high' : 'none',
        matchedPattern: pattern,
        isStandardProduct: !customer
      };
    }
  }

  return {
    customer: null,
    confidence: 'none',
    matchedPattern: null,
    isStandardProduct: false
  };
}

/**
 * Generate clickable HTML link
 * @param {string} url - URL to link
 * @param {string} text - Link text (defaults to URL)
 * @returns {string} HTML anchor tag
 */
function createLink(url, text = null) {
  const displayText = text || url;
  return `<a href="${url}" rel="noopener noreferrer">${displayText}</a>`;
}

/**
 * Generate release notes HTML with clickable links
 * @param {Object} params - Release parameters
 * @returns {string} HTML formatted release notes
 */
function generateReleaseNotesHtml(params) {
  const {
    releaseDate,
    releasedBy,
    reviewer,
    redmineIds = [],
    redmineTitles = [],
    patchUrls = [],
    testReportUrls = [],
    mrUrls = [],
    manualScriptUrls = [],
    configUrls = []
  } = params;

  const lines = [];

  // Header
  lines.push(`<p><span style="font-size: 14px; background-color: inherit; color: inherit;">#### Released on ${releaseDate}</span></p>`);
  lines.push('<p><br></p>');
  lines.push(`<p><span style="font-size: 14px; background-color: inherit; color: inherit;">#### Released by ${releasedBy}</span></p>`);
  lines.push('<p><br></p>');
  lines.push(`<p><span style="font-size: 14px; background-color: inherit; color: inherit;">#### Reviewed by ${reviewer}</span></p>`);
  lines.push('<p><br></p>');

  // Redmine IDs
  if (redmineIds.length > 0) {
    lines.push('<p><span style="font-size: 14px; background-color: inherit; color: inherit;">### Redmine ID:</span></p>');
    redmineIds.forEach((id, index) => {
      const url = `https://support.credenceanalytics.com/issues/${id}`;
      const title = redmineTitles[index] || '';
      const linkText = `#${id}`;
      const titlePart = title ? ` - ${title}` : '';
      lines.push(`<p><span style="font-size: 14px;">- </span>${createLink(url, linkText)}<span style="font-size: 14px;">${titlePart}</span></p>`);
    });
    lines.push('<p><br></p>');
  }

  // Patch URLs
  if (patchUrls.length > 0) {
    lines.push('<p><span style="font-size: 14px; background-color: inherit; color: inherit;">#### Patch:</span></p>');
    lines.push('<ol>');
    patchUrls.forEach(url => {
      lines.push(`<li data-list="bullet"><span class="ql-ui" contenteditable="false"></span>${createLink(url)}</li>`);
    });
    lines.push('</ol>');
    lines.push('<p><br></p>');
  }

  // Test Reports
  if (testReportUrls.length > 0) {
    lines.push('<p><span style="font-size: 14px; background-color: inherit; color: inherit;">#### Test Reports:</span></p>');
    lines.push('<ol>');
    testReportUrls.forEach(url => {
      lines.push(`<li data-list="bullet"><span class="ql-ui" contenteditable="false"></span>${createLink(url)}</li>`);
    });
    lines.push('</ol>');
    lines.push('<p><br></p>');
  }

  // Release Links (MR URLs)
  if (mrUrls.length > 0) {
    lines.push('<p><span style="font-size: 14px; background-color: inherit; color: inherit;">#### Release Link:</span></p>');
    lines.push('<ol>');
    mrUrls.forEach(url => {
      lines.push(`<li data-list="bullet"><span class="ql-ui" contenteditable="false"></span>${createLink(url)}</li>`);
    });
    lines.push('</ol>');
    lines.push('<p><br></p>');
  }

  // Manual Scripts (optional)
  if (manualScriptUrls.length > 0) {
    lines.push('<p><span style="font-size: 14px; background-color: inherit; color: inherit;">#### Manual Script:</span></p>');
    lines.push('<ol>');
    manualScriptUrls.forEach(url => {
      lines.push(`<li data-list="bullet"><span class="ql-ui" contenteditable="false"></span>${createLink(url)}</li>`);
    });
    lines.push('</ol>');
    lines.push('<p><br></p>');
  }

  // Configuration Details (optional)
  if (configUrls.length > 0) {
    lines.push('<p><span style="font-size: 14px; background-color: inherit; color: inherit;">#### Configuration Details:</span></p>');
    lines.push('<ol>');
    configUrls.forEach(url => {
      lines.push(`<li data-list="bullet"><span class="ql-ui" contenteditable="false"></span>${createLink(url)}</li>`);
    });
    lines.push('</ol>');
    lines.push('<p><br></p>');
  }

  return lines.join('\n');
}

/**
 * Format date as DD-MM-YYYY
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date
 */
function formatDate(date) {
  const d = date ? new Date(date) : new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Format date as YYYY-MM-DD for ERPNext
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date
 */
function formatDateForErp(date) {
  const d = date ? new Date(date) : new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
}

/**
 * Generate release name from version and customer/product
 * @param {Object} params - Parameters
 * @returns {string} Generated release name
 */
function generateReleaseName(params) {
  const { version, customer, product } = params;

  // Sanitize version for use in name
  const versionPart = version.replace(/\./g, '_');

  if (customer) {
    // Customer-specific release: CUSTOMER_VERSION
    const customerPart = customer.replace(/\s+/g, '_').toUpperCase().substring(0, 10);
    return `${customerPart}_${versionPart}`;
  }

  // Standard product release
  return `MFXSTD_RETAIL_LIVE_${versionPart}`;
}

/**
 * List available products (Brands) from ERPNext
 * @param {ERPNextClient} client
 * @returns {Object} List of products
 */
export async function listProducts(client) {
  const result = await client.getDocList('Brand', {
    fields: JSON.stringify(['name', 'brand']),
    limit_page_length: 100
  });

  return {
    products: result.data || result,
    message: 'Select a product for the software release'
  };
}

/**
 * List available customers from ERPNext
 * @param {ERPNextClient} client
 * @param {number} limit
 * @returns {Object} List of customers
 */
export async function listCustomersForRelease(client, limit = 50) {
  const result = await client.getDocList('Customer', {
    fields: JSON.stringify(['name', 'customer_name']),
    limit_page_length: limit,
    order_by: 'customer_name asc'
  });

  return {
    customers: result.data || result,
    message: 'Select a customer for the software release (or confirm auto-detected customer)'
  };
}

/**
 * Get merge request details and auto-detect customer
 * Also fetches uploaded files (patches, test reports) from MR notes
 * @param {Object} gitlabConfig - GitLab configuration
 * @param {string} mrUrl - Merge request URL
 * @returns {Object} MR details with detected customer and uploads
 */
export async function getMrDetails(gitlabConfig, mrUrl) {
  if (!gitlabConfig.token) {
    throw new Error('GitLab token not configured. Set GITLAB_TOKEN in environment variables.');
  }

  const gitlab = new GitLabClient(gitlabConfig);
  const mrResult = await gitlab.getMergeRequest(mrUrl);

  if (!mrResult.success) {
    throw new Error(`Failed to fetch MR details: ${mrResult.error}`);
  }

  const mr = mrResult.data;
  const customerMapping = mapProjectToCustomer(mr.projectPath);

  // Try to extract version from branch name or title
  const version = gitlab.extractVersion(mr.sourceBranch, mr.title);

  // Extract any Redmine IDs from description
  const detectedRedmineIds = gitlab.extractRedmineIds(mr.description);

  // Auto-fetch uploaded files from MR description and notes
  const uploadsResult = await gitlab.getAllMrUploads(mrUrl);
  const uploads = uploadsResult.success ? uploadsResult.uploads : {
    patches: [],
    testReports: [],
    scripts: [],
    configs: [],
    other: []
  };

  // Extract Redmine IDs and their titles from MR description
  const redmineWithTitles = detectedRedmineIds.filter(r => r.title);

  return {
    mr: {
      id: mr.id,
      title: mr.title,
      description: mr.description,
      webUrl: mr.webUrl,
      projectPath: mr.projectPath,
      sourceBranch: mr.sourceBranch,
      targetBranch: mr.targetBranch,
      author: mr.author,
      mergedAt: mr.mergedAt
    },
    detectedCustomer: customerMapping.customer,
    customerConfidence: customerMapping.confidence,
    isStandardProduct: customerMapping.isStandardProduct,
    matchedPattern: customerMapping.matchedPattern,
    detectedVersion: version,
    // Redmine IDs extracted from MR description (with titles if found in table)
    detectedRedmineIds: detectedRedmineIds.map(r => r.id),
    detectedRedmineTitles: detectedRedmineIds.map(r => r.title || null),
    hasRedmineTitlesFromMr: redmineWithTitles.length > 0,
    // Auto-fetched uploads from MR
    autoFetchedUploads: {
      patchUrls: uploads.patches,
      testReportUrls: uploads.testReports,
      manualScriptUrls: uploads.scripts,
      configUrls: uploads.configs,
      otherUrls: uploads.other
    },
    hasAutoFetchedPatches: uploads.patches.length > 0,
    hasAutoFetchedTestReports: uploads.testReports.length > 0,
    message: customerMapping.customer
      ? `Detected customer "${customerMapping.customer}" from project path. Please confirm this is correct.`
      : customerMapping.isStandardProduct
        ? 'This appears to be a standard product release (no specific customer).'
        : 'Could not auto-detect customer. Please select from the customer list.'
  };
}

/**
 * Get Redmine issue details (title/subject)
 * @param {Object} redmineConfig - Redmine configuration
 * @param {string} issueId - Redmine issue ID or URL
 * @returns {Object} Issue details
 */
export async function getRedmineIssue(redmineConfig, issueId) {
  if (!redmineConfig.apiKey) {
    return {
      success: false,
      error: 'Redmine API key not configured. Set REDMINE_API_KEY in environment variables.',
      message: 'Please enter the Redmine ticket title manually.'
    };
  }

  const redmine = new RedmineClient(redmineConfig);
  const result = await redmine.getIssueTitle(issueId);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      message: 'Could not fetch issue title. Please enter it manually.'
    };
  }

  return {
    success: true,
    issue: result.data,
    message: `Found Redmine issue #${result.data.id}: ${result.data.title}`
  };
}

/**
 * Get full Redmine issue details (description, status, comments, attachments, children)
 * @param {Object} redmineConfig - Redmine configuration
 * @param {string} issueId - Redmine issue ID or URL
 * @param {Object} options - { includeComments, includeAttachments, includeChildren }
 * @returns {Object} Full issue details
 */
export async function getRedmineIssueDetails(redmineConfig, issueId, options = {}) {
  if (!redmineConfig.apiKey) {
    return {
      success: false,
      error: 'Redmine API key not configured. Set REDMINE_API_KEY in environment variables.'
    };
  }

  const include = [];
  if (options.includeComments !== false) include.push('journals');
  if (options.includeAttachments !== false) include.push('attachments');
  if (options.includeChildren !== false) include.push('children', 'relations');

  const redmine = new RedmineClient(redmineConfig);
  const result = await redmine.getIssueFull(issueId, include);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    issue: result.data,
    message: `Found Redmine issue #${result.data.id}: ${result.data.subject} (${result.data.status}, ${result.data.comments.length} comment(s))`
  };
}

/**
 * Update a Redmine issue - add a comment and/or change fields
 * @param {Object} redmineConfig - Redmine configuration
 * @param {Object} params - { issue_id, notes, private_notes, status_id, status_name,
 *   assigned_to_id, priority_id, done_ratio, subject, description, due_date, start_date }
 * @returns {Object} Update result
 */
export async function updateRedmineIssue(redmineConfig, params = {}) {
  if (!redmineConfig.apiKey) {
    return {
      success: false,
      error: 'Redmine API key not configured. Set REDMINE_API_KEY in environment variables.'
    };
  }

  if (!params.issue_id) {
    return { success: false, error: 'issue_id is required' };
  }

  const redmine = new RedmineClient(redmineConfig);

  // Resolve status name -> id if a name was supplied instead of an id
  let statusId = params.status_id;
  if (statusId === undefined && params.status_name) {
    const statusResult = await redmine.listStatuses();
    if (!statusResult.success) {
      return { success: false, error: `Could not resolve status name: ${statusResult.error}` };
    }
    const match = statusResult.statuses.find(
      s => s.name.toLowerCase() === String(params.status_name).toLowerCase()
    );
    if (!match) {
      return {
        success: false,
        error: `Status "${params.status_name}" not found. Available: ${statusResult.statuses.map(s => s.name).join(', ')}`
      };
    }
    statusId = match.id;
  }

  const result = await redmine.updateIssue(params.issue_id, {
    notes: params.notes,
    privateNotes: params.private_notes,
    statusId,
    assignedToId: params.assigned_to_id,
    priorityId: params.priority_id,
    doneRatio: params.done_ratio,
    subject: params.subject,
    description: params.description,
    dueDate: params.due_date,
    startDate: params.start_date
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    issueId: result.issueId,
    updated: result.updated,
    url: result.url,
    message: `Updated Redmine issue #${result.issueId} (${result.updated.join(', ')})`
  };
}

/**
 * Get multiple Redmine issue titles
 * @param {Object} redmineConfig - Redmine configuration
 * @param {string[]} issueIds - Array of Redmine issue IDs or URLs
 * @returns {Object} Issue details with titles
 */
export async function getRedmineIssueTitles(redmineConfig, issueIds) {
  if (!redmineConfig.apiKey) {
    return {
      success: false,
      titles: [],
      error: 'Redmine API key not configured'
    };
  }

  const redmine = new RedmineClient(redmineConfig);
  const results = await redmine.getIssueTitles(issueIds);

  const titles = [];
  const errors = [];

  for (const result of results) {
    if (result.success) {
      titles.push({
        id: result.data.id,
        title: result.data.title,
        url: result.data.url
      });
    } else {
      errors.push(result.error);
    }
  }

  return {
    success: titles.length > 0,
    titles,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Get existing software release details (for template reference)
 * @param {ERPNextClient} client
 * @param {string} releaseUrl - Release URL or name
 * @returns {Object} Release details
 */
export async function getSoftwareRelease(client, releaseUrl, releaseName) {
  let name = releaseName;

  // Extract release name from URL if provided
  if (releaseUrl && !name) {
    const match = releaseUrl.match(/software-release\/([^\/\?]+)/);
    if (match) {
      name = decodeURIComponent(match[1]);
    }
  }

  if (!name) {
    throw new Error('Please provide either release_url or release_name');
  }

  const result = await client.getDoc('Software Release', name);
  return result;
}

/**
 * Extract template defaults from an existing software release
 * Returns customer, product, reviewer, and release_type
 * @param {ERPNextClient} client
 * @param {string} templateUrlOrName - Template release URL or name
 * @returns {Object} Template defaults { customer, product, reviewer, release_type }
 */
export async function getTemplateDefaults(client, templateUrlOrName) {
  if (!templateUrlOrName) {
    return { success: false, defaults: null };
  }

  let name = templateUrlOrName;

  // Extract release name from URL if provided
  if (templateUrlOrName.includes('software-release/')) {
    const match = templateUrlOrName.match(/software-release\/([^\/\?]+)/);
    if (match) {
      name = decodeURIComponent(match[1]);
    }
  }

  try {
    const result = await client.getDoc('Software Release', name);
    const release = result.data || result;

    // Extract reviewer from release_notes HTML
    let reviewer = null;
    if (release.release_notes) {
      // Pattern: "#### Reviewed by Jitesh Suthar"
      const reviewerMatch = release.release_notes.match(/Reviewed by\s+([^<]+)/i);
      if (reviewerMatch) {
        reviewer = reviewerMatch[1].trim();
      }
    }

    return {
      success: true,
      defaults: {
        customer: release.customer || null,
        product: release.product || null,
        reviewer: reviewer,
        release_type: release.release_type || 'Patch'
      },
      templateRelease: {
        name: release.name,
        version: release.version,
        release_date: release.release_date
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      defaults: null
    };
  }
}

/**
 * List recent software releases
 * @param {ERPNextClient} client
 * @param {Object} options - Filter options
 * @returns {Object} List of releases
 */
export async function listSoftwareReleases(client, options = {}) {
  const { product, customer, limit = 20 } = options;

  const filters = [];
  if (product) {
    filters.push(['product', '=', product]);
  }
  if (customer) {
    filters.push(['customer', '=', customer]);
  }

  const result = await client.getDocList('Software Release', {
    filters: filters.length > 0 ? JSON.stringify(filters) : undefined,
    fields: JSON.stringify([
      'name', 'release', 'product', 'customer', 'version',
      'release_type', 'release_date', 'released_by_name'
    ]),
    limit_page_length: limit,
    order_by: 'creation desc'
  });

  return result;
}

/**
 * Preview what a software release will look like before creating it
 * Gathers all auto-detected and auto-filled fields without actually creating the release
 * @param {ERPNextClient} erpnext - ERPNext client
 * @param {Object} gitlabConfig - GitLab configuration
 * @param {Object} redmineConfig - Redmine configuration
 * @param {Object} params - Release parameters
 * @returns {Object} Preview of the software release
 */
export async function previewSoftwareRelease(erpnext, gitlabConfig, redmineConfig, params) {
  let {
    mr_urls,
    product,
    customer,
    redmine_ids,
    redmine_titles = [],
    reviewer,
    patch_urls = [],
    test_report_urls = [],
    manual_script_urls = [],
    config_urls = [],
    version,
    release_name,
    release_type = 'Patch',
    release_date,
    template_release_url
  } = params;

  const preview = {
    fields: {},
    sources: {},
    warnings: [],
    ready: true
  };

  // Validate MR URLs first
  if (!mr_urls || mr_urls.length === 0) {
    preview.warnings.push('At least one merge request URL is required');
    preview.ready = false;
    return preview;
  }

  const gitlab = new GitLabClient(gitlabConfig);

  // Get MR details first
  let mrDetails = null;
  try {
    const mrResult = await gitlab.getMergeRequest(mr_urls[0]);
    if (mrResult.success) {
      mrDetails = mrResult.data;
    }
  } catch (e) {
    preview.warnings.push(`Could not fetch MR details: ${e.message}`);
  }

  // If template release is provided, load defaults from it
  let templateUsed = null;
  if (template_release_url) {
    const templateResult = await getTemplateDefaults(erpnext, template_release_url);
    if (templateResult.success && templateResult.defaults) {
      const defaults = templateResult.defaults;
      templateUsed = templateResult.templateRelease?.name;

      // Apply defaults only if not explicitly provided
      if (!product && defaults.product) {
        product = defaults.product;
        preview.sources.product = `Template: ${templateUsed}`;
      }
      if (!customer && defaults.customer) {
        customer = defaults.customer;
        preview.sources.customer = `Template: ${templateUsed}`;
      }
      if (!reviewer && defaults.reviewer) {
        reviewer = defaults.reviewer;
        preview.sources.reviewer = `Template: ${templateUsed}`;
      }
      if (!release_type && defaults.release_type) {
        release_type = defaults.release_type;
        preview.sources.release_type = `Template: ${templateUsed}`;
      }
    }
  }

  // Track user-provided values
  if (params.product) preview.sources.product = 'User provided';
  if (params.customer) preview.sources.customer = 'User provided';
  if (params.reviewer) preview.sources.reviewer = 'User provided';
  if (params.release_type) preview.sources.release_type = 'User provided';

  // Auto-detect customer from GitLab path if not set
  if (!customer && mrDetails) {
    const customerMapping = mapProjectToCustomer(mrDetails.projectPath);
    if (customerMapping.customer) {
      customer = customerMapping.customer;
      preview.sources.customer = `Auto-detected from GitLab path (pattern: "${customerMapping.matchedPattern}")`;
    }
  }

  // Auto-fetch Redmine IDs and titles from MR description if not provided
  if (!redmine_ids || redmine_ids.length === 0) {
    if (mrDetails && mrDetails.description) {
      const extracted = gitlab.extractRedmineIds(mrDetails.description);
      if (extracted.length > 0) {
        redmine_ids = extracted.map(r => r.id);
        preview.sources.redmine_ids = 'Auto-extracted from MR description';

        // Also extract titles from MR description table if available
        if (redmine_titles.length === 0) {
          const mrTitles = extracted.filter(r => r.title);
          if (mrTitles.length > 0) {
            redmine_titles = extracted.map(r => r.title || '');
            preview.sources.redmine_titles = 'Auto-extracted from MR description table';
          }
        }
      }
    }
  } else {
    preview.sources.redmine_ids = 'User provided';
  }

  // Auto-fetch uploads from GitLab if not provided
  let finalPatchUrls = patch_urls.length > 0 ? patch_urls : [];
  let finalTestReportUrls = test_report_urls.length > 0 ? test_report_urls : [];
  let finalManualScriptUrls = manual_script_urls.length > 0 ? manual_script_urls : [];
  let finalConfigUrls = config_urls.length > 0 ? config_urls : [];

  if (patch_urls.length > 0) preview.sources.patch_urls = 'User provided';
  if (test_report_urls.length > 0) preview.sources.test_report_urls = 'User provided';

  if (finalPatchUrls.length === 0 || finalTestReportUrls.length === 0) {
    for (const mrUrl of mr_urls) {
      const uploadsResult = await gitlab.getAllMrUploads(mrUrl);
      if (uploadsResult.success) {
        if (finalPatchUrls.length === 0 && uploadsResult.uploads.patches.length > 0) {
          finalPatchUrls = [...finalPatchUrls, ...uploadsResult.uploads.patches];
          preview.sources.patch_urls = 'Auto-fetched from GitLab MR';
        }
        if (finalTestReportUrls.length === 0 && uploadsResult.uploads.testReports.length > 0) {
          finalTestReportUrls = [...finalTestReportUrls, ...uploadsResult.uploads.testReports];
          preview.sources.test_report_urls = 'Auto-fetched from GitLab MR';
        }
        if (finalManualScriptUrls.length === 0 && uploadsResult.uploads.scripts.length > 0) {
          finalManualScriptUrls = [...finalManualScriptUrls, ...uploadsResult.uploads.scripts];
          preview.sources.manual_script_urls = 'Auto-fetched from GitLab MR';
        }
        if (finalConfigUrls.length === 0 && uploadsResult.uploads.configs.length > 0) {
          finalConfigUrls = [...finalConfigUrls, ...uploadsResult.uploads.configs];
          preview.sources.config_urls = 'Auto-fetched from GitLab MR';
        }
      }
    }
  }

  // Auto-fetch Redmine titles if not provided and API key is configured
  let finalRedmineTitles = redmine_titles;
  if (finalRedmineTitles.length === 0 && redmine_ids && redmine_ids.length > 0 && redmineConfig?.apiKey) {
    const titlesResult = await getRedmineIssueTitles(redmineConfig, redmine_ids);
    if (titlesResult.success) {
      finalRedmineTitles = redmine_ids.map(id => {
        const found = titlesResult.titles.find(t => String(t.id) === String(id));
        return found ? found.title : '';
      });
      preview.sources.redmine_titles = 'Auto-fetched from Redmine API';
    }
  }

  // Auto-detect version from branch name
  let finalVersion = version;
  if (params.version) {
    preview.sources.version = 'User provided';
  } else if (mrDetails) {
    finalVersion = gitlab.extractVersion(mrDetails.sourceBranch, mrDetails.title);
    if (finalVersion) {
      preview.sources.version = `Auto-detected from branch "${mrDetails.sourceBranch}"`;
    }
  }

  // Get current employee for released_by
  let releasedByName = null;
  try {
    const employee = await erpnext.getCurrentEmployee();
    releasedByName = employee.employee_name || employee.name;
    preview.sources.released_by = 'Current logged-in user';
  } catch (e) {
    preview.warnings.push('Could not get current employee');
  }

  // Generate release name if not provided
  const finalReleaseName = release_name || (finalVersion ? generateReleaseName({
    version: finalVersion,
    customer,
    product
  }) : null);

  if (params.release_name) {
    preview.sources.release_name = 'User provided';
  } else if (finalReleaseName) {
    preview.sources.release_name = 'Auto-generated';
  }

  // Set release date
  const releaseDate = release_date || new Date().toISOString().split('T')[0];
  preview.sources.release_date = params.release_date ? 'User provided' : 'Default (today)';

  // Check for missing required fields
  if (!product) {
    preview.warnings.push('MISSING: Product is required');
    preview.ready = false;
  }
  if (!redmine_ids || redmine_ids.length === 0) {
    preview.warnings.push('MISSING: At least one Redmine ID is required');
    preview.ready = false;
  }
  if (!reviewer) {
    preview.warnings.push('MISSING: Reviewer name is required');
    preview.ready = false;
  }
  if (finalPatchUrls.length === 0) {
    preview.warnings.push('MISSING: At least one patch URL is required');
    preview.ready = false;
  }
  if (!finalVersion) {
    preview.warnings.push('MISSING: Version is required');
    preview.ready = false;
  }

  // Build preview fields
  preview.fields = {
    // Core fields
    product: product || null,
    customer: customer || null,
    release_name: finalReleaseName || null,
    version: finalVersion || null,
    release_type: release_type,
    release_date: formatDate(releaseDate),
    released_by: releasedByName,
    reviewer: reviewer || null,

    // Redmine
    redmine_ids: redmine_ids || [],
    redmine_titles: finalRedmineTitles,

    // URLs
    patch_urls: finalPatchUrls,
    test_report_urls: finalTestReportUrls,
    manual_script_urls: finalManualScriptUrls,
    config_urls: finalConfigUrls,
    mr_urls: mr_urls
  };

  // Add template info if used
  if (templateUsed) {
    preview.templateUsed = templateUsed;
  }

  // Add MR info
  if (mrDetails) {
    preview.mrInfo = {
      title: mrDetails.title,
      sourceBranch: mrDetails.sourceBranch,
      projectPath: mrDetails.projectPath,
      webUrl: mrDetails.webUrl
    };
  }

  // Generate summary message
  if (preview.ready) {
    preview.message = `Ready to create software release "${finalReleaseName}" (v${finalVersion}) for ${product}${customer ? ` - ${customer}` : ''}`;
  } else {
    preview.message = `Cannot create release yet. ${preview.warnings.length} issue(s) need to be resolved.`;
  }

  return preview;
}

/**
 * Create a software release document
 * Auto-fetches Redmine titles and uploads from GitLab if not provided
 * Supports using an existing release as template for customer, product, reviewer
 * @param {ERPNextClient} erpnext - ERPNext client
 * @param {Object} gitlabConfig - GitLab configuration
 * @param {Object} redmineConfig - Redmine configuration
 * @param {Object} params - Release parameters
 * @returns {Object} Created release
 */
export async function createSoftwareRelease(erpnext, gitlabConfig, redmineConfig, params) {
  let {
    mr_urls,
    product,
    customer,
    redmine_ids,
    redmine_titles = [],
    reviewer,
    patch_urls = [],
    test_report_urls = [],
    manual_script_urls = [],
    config_urls = [],
    version,
    release_name,
    release_type = 'Patch',
    release_date,
    template_release_url
  } = params;

  // Validate MR URLs first
  if (!mr_urls || mr_urls.length === 0) {
    throw new Error('At least one merge request URL is required');
  }

  const gitlab = new GitLabClient(gitlabConfig);

  // If template release is provided, load defaults from it
  let templateUsed = null;
  if (template_release_url) {
    const templateResult = await getTemplateDefaults(erpnext, template_release_url);
    if (templateResult.success && templateResult.defaults) {
      const defaults = templateResult.defaults;
      templateUsed = templateResult.templateRelease?.name;

      // Apply defaults only if not explicitly provided
      if (!product && defaults.product) {
        product = defaults.product;
      }
      if (!customer && defaults.customer) {
        customer = defaults.customer;
      }
      if (!reviewer && defaults.reviewer) {
        reviewer = defaults.reviewer;
      }
      if (!release_type && defaults.release_type) {
        release_type = defaults.release_type;
      }
    }
  }

  // Auto-fetch Redmine IDs and titles from MR description if not provided
  if (!redmine_ids || redmine_ids.length === 0) {
    for (const mrUrl of mr_urls) {
      const mrResult = await gitlab.getMergeRequest(mrUrl);
      if (mrResult.success && mrResult.data.description) {
        const extracted = gitlab.extractRedmineIds(mrResult.data.description);
        if (extracted.length > 0) {
          redmine_ids = extracted.map(r => r.id);
          // Also extract titles from MR description table if available
          if (redmine_titles.length === 0) {
            const mrTitles = extracted.filter(r => r.title);
            if (mrTitles.length > 0) {
              redmine_titles = extracted.map(r => r.title || '');
            }
          }
          break; // Use first MR's Redmine IDs
        }
      }
    }
  }

  // Validate required fields after template and auto-detection
  if (!product) {
    throw new Error('Product is required. Use erpnext_list_products to see available options, or provide template_release_url.');
  }
  if (!redmine_ids || redmine_ids.length === 0) {
    throw new Error('At least one Redmine ID is required. Could not auto-detect from MR description.');
  }
  if (!reviewer) {
    throw new Error('Reviewer name is required. Provide template_release_url to use previous reviewer.');
  }

  // Auto-fetch uploads from GitLab if not provided
  let finalPatchUrls = patch_urls;
  let finalTestReportUrls = test_report_urls;
  let finalManualScriptUrls = manual_script_urls;
  let finalConfigUrls = config_urls;

  if (finalPatchUrls.length === 0 || finalTestReportUrls.length === 0) {
    // Fetch uploads from all MR URLs
    for (const mrUrl of mr_urls) {
      const uploadsResult = await gitlab.getAllMrUploads(mrUrl);
      if (uploadsResult.success) {
        if (finalPatchUrls.length === 0 && uploadsResult.uploads.patches.length > 0) {
          finalPatchUrls = [...finalPatchUrls, ...uploadsResult.uploads.patches];
        }
        if (finalTestReportUrls.length === 0 && uploadsResult.uploads.testReports.length > 0) {
          finalTestReportUrls = [...finalTestReportUrls, ...uploadsResult.uploads.testReports];
        }
        if (finalManualScriptUrls.length === 0 && uploadsResult.uploads.scripts.length > 0) {
          finalManualScriptUrls = [...finalManualScriptUrls, ...uploadsResult.uploads.scripts];
        }
        if (finalConfigUrls.length === 0 && uploadsResult.uploads.configs.length > 0) {
          finalConfigUrls = [...finalConfigUrls, ...uploadsResult.uploads.configs];
        }
      }
    }
  }

  // Validate patch URLs after auto-fetch
  if (finalPatchUrls.length === 0) {
    throw new Error('At least one patch URL is required. Could not auto-detect from MR uploads.');
  }

  // Auto-fetch Redmine titles if not provided
  let finalRedmineTitles = redmine_titles;
  if (finalRedmineTitles.length === 0 && redmineConfig?.apiKey) {
    const titlesResult = await getRedmineIssueTitles(redmineConfig, redmine_ids);
    if (titlesResult.success) {
      // Map titles in same order as redmine_ids
      finalRedmineTitles = redmine_ids.map(id => {
        const found = titlesResult.titles.find(t => String(t.id) === String(id));
        return found ? found.title : '';
      });
    }
  }

  // Get current employee for released_by
  const employee = await erpnext.getCurrentEmployee();
  const releasedByName = employee.employee_name || employee.name;
  const releasedBy = employee.name;

  // Determine version
  let finalVersion = version;
  if (!finalVersion && gitlabConfig.token) {
    // Try to extract from first MR
    const mrResult = await gitlab.getMergeRequest(mr_urls[0]);
    if (mrResult.success) {
      finalVersion = gitlab.extractVersion(mrResult.data.sourceBranch, mrResult.data.title);
    }
  }

  if (!finalVersion) {
    throw new Error('Version is required. Could not auto-detect from MR.');
  }

  // Generate release name if not provided
  const finalReleaseName = release_name || generateReleaseName({
    version: finalVersion,
    customer,
    product
  });

  // Format release date
  const formattedReleaseDate = formatDate(release_date);
  const erpReleaseDate = formatDateForErp(release_date);

  // Generate release notes HTML
  const releaseNotes = generateReleaseNotesHtml({
    releaseDate: formattedReleaseDate,
    releasedBy: releasedByName,
    reviewer,
    redmineIds: redmine_ids,
    redmineTitles: finalRedmineTitles,
    patchUrls: finalPatchUrls,
    testReportUrls: finalTestReportUrls,
    mrUrls: mr_urls,
    manualScriptUrls: finalManualScriptUrls,
    configUrls: finalConfigUrls
  });

  // Create the software release document
  const releaseDoc = {
    doctype: 'Software Release',
    product: product,
    release: finalReleaseName,
    version: finalVersion,
    release_type: release_type,
    release_date: erpReleaseDate,
    released_by: releasedBy,
    customer: customer || null,
    release_notes: releaseNotes
  };

  const result = await erpnext.createDoc('Software Release', releaseDoc);

  return {
    success: true,
    release: result.data || result,
    releaseUrl: `${erpnext.baseUrl}/app/software-release/${encodeURIComponent(result.data?.name || result.name)}`,
    message: `Software release "${finalReleaseName}" created successfully`,
    templateUsed: templateUsed,
    autoFetched: {
      patchUrls: patch_urls.length === 0 && finalPatchUrls.length > 0,
      testReportUrls: test_report_urls.length === 0 && finalTestReportUrls.length > 0,
      redmineTitles: redmine_titles.length === 0 && finalRedmineTitles.length > 0,
      redmineIds: params.redmine_ids === undefined && redmine_ids.length > 0
    }
  };
}

/**
 * Download a Redmine attachment to disk (e.g. an issue's script/spreadsheet).
 * @param {Object} redmineConfig - { url, apiKey }
 * @param {Object} params - { attachment, save_dir?, include_text_preview?, preview_chars? }
 * @returns {Object} { status, id, filename, size, contentType, path, textPreview? }
 */
export async function downloadRedmineAttachment(redmineConfig, params = {}) {
  try {
    if (!redmineConfig || !redmineConfig.apiKey) {
      return { status: 'error', message: 'REDMINE_API_KEY not configured' };
    }
    const ref = params.attachment ?? params.attachment_id ?? params.url;
    if (!ref) return { status: 'error', message: 'Provide "attachment" (id or download URL)' };

    const redmine = new RedmineClient(redmineConfig);
    const info = await redmine.downloadAttachment(ref, { saveDir: params.save_dir });

    let textPreview = null;
    const isTextish = /text\/|json|xml|csv|sql/i.test(info.contentType || '') ||
      /\.(txt|sql|csv|json|xml|log|md|jds|js)$/i.test(info.filename || '');
    if (params.include_text_preview !== false && isTextish) {
      try { textPreview = fs.readFileSync(info.path, 'utf8').slice(0, params.preview_chars || 4000); }
      catch { /* binary or unreadable */ }
    }

    return {
      status: 'success',
      id: info.id,
      filename: info.filename,
      size: info.size,
      contentType: info.contentType,
      path: info.path,
      ...(textPreview != null ? { textPreview } : {})
    };
  } catch (error) {
    return { status: 'error', message: `Failed to download attachment: ${error.message}` };
  }
}

export default {
  downloadRedmineAttachment,
  listProducts,
  listCustomersForRelease,
  getMrDetails,
  getRedmineIssue,
  getRedmineIssueDetails,
  updateRedmineIssue,
  getTemplateDefaults,
  getRedmineIssueTitles,
  getSoftwareRelease,
  listSoftwareReleases,
  previewSoftwareRelease,
  createSoftwareRelease
};
