/**
 * Software Release tool definitions
 * @module definitions/software-release-tools
 */

export const softwareReleaseTools = [
  {
    name: 'erpnext_create_software_release',
    description: 'Create a software release document in ERPNext from GitLab merge request URL(s). When template_release_url is provided, auto-fills Product, Customer, and Reviewer from that release. Also auto-fetches: Redmine IDs from MR description (#123456), patch/test report URLs from MR notes, and Redmine ticket titles if REDMINE_API_KEY configured. All links in release notes are clickable.',
    inputSchema: {
      type: 'object',
      properties: {
        mr_urls: {
          type: 'array',
          items: { type: 'string' },
          description: 'GitLab merge request URL(s). Redmine IDs like #124323 in description will be auto-extracted.'
        },
        template_release_url: {
          type: 'string',
          description: 'URL of existing software release to use as template. Auto-fills: Product, Customer, Reviewer, Release Type from this release.'
        },
        product: {
          type: 'string',
          description: 'Product name (e.g., MercuryFx). Auto-filled from template_release_url if provided, otherwise required.'
        },
        customer: {
          type: 'string',
          description: 'Customer name. Auto-filled from template_release_url, or auto-detected from GitLab project path.'
        },
        redmine_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Redmine ticket ID(s). Auto-extracted from MR description if not provided (looks for #123456 patterns).'
        },
        redmine_titles: {
          type: 'array',
          items: { type: 'string' },
          description: 'Titles for each Redmine ID. Auto-fetched if REDMINE_API_KEY is configured.'
        },
        reviewer: {
          type: 'string',
          description: 'Reviewer name. Auto-filled from template_release_url if provided.'
        },
        patch_urls: {
          type: 'array',
          items: { type: 'string' },
          description: 'Patch file URL(s). Auto-fetched from GitLab MR notes/description if not provided.'
        },
        test_report_urls: {
          type: 'array',
          items: { type: 'string' },
          description: 'Test report URL(s). Auto-fetched from GitLab MR notes/description if not provided.'
        },
        manual_script_urls: {
          type: 'array',
          items: { type: 'string' },
          description: 'Manual script URL(s). Auto-fetched from GitLab MR notes/description if not provided.'
        },
        config_urls: {
          type: 'array',
          items: { type: 'string' },
          description: 'Configuration file URL(s). Auto-fetched from GitLab MR notes/description if not provided.'
        },
        version: {
          type: 'string',
          description: 'Version string (e.g., "5.0.0.411"). Auto-detected from MR branch/title.'
        },
        release_name: {
          type: 'string',
          description: 'Release name. Auto-generated if not provided.'
        },
        release_type: {
          type: 'string',
          enum: ['Patch', 'Minor', 'Major'],
          description: 'Type of release. Auto-filled from template or defaults to Patch.'
        },
        release_date: {
          type: 'string',
          description: 'Release date (YYYY-MM-DD). Default: today'
        }
      },
      required: ['mr_urls']
    }
  },
  {
    name: 'erpnext_preview_software_release',
    description: 'Preview what a software release will look like BEFORE creating it. Shows all auto-detected fields, their sources, and any missing required fields. Use this to review the release details before calling erpnext_create_software_release.',
    inputSchema: {
      type: 'object',
      properties: {
        mr_urls: {
          type: 'array',
          items: { type: 'string' },
          description: 'GitLab merge request URL(s)'
        },
        template_release_url: {
          type: 'string',
          description: 'URL of existing software release to use as template'
        },
        product: {
          type: 'string',
          description: 'Product name (optional - will show if auto-filled from template)'
        },
        customer: {
          type: 'string',
          description: 'Customer name (optional - will show if auto-detected)'
        },
        redmine_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Redmine ticket ID(s) (optional - will show if auto-extracted from MR)'
        },
        reviewer: {
          type: 'string',
          description: 'Reviewer name (optional - will show if auto-filled from template)'
        },
        version: {
          type: 'string',
          description: 'Version string (optional - will show if auto-detected from MR branch)'
        }
      },
      required: ['mr_urls']
    }
  },
  {
    name: 'erpnext_list_products',
    description: 'List available products (Brands) for software release selection',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'erpnext_list_customers_for_release',
    description: 'List available customers for software release selection',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of customers to return. Default: 50'
        }
      },
      required: []
    }
  },
  {
    name: 'erpnext_get_mr_details',
    description: 'Get details from a GitLab merge request URL including auto-detected customer, version, Redmine IDs from description, and auto-fetched patch/test report URLs from MR notes',
    inputSchema: {
      type: 'object',
      properties: {
        mr_url: {
          type: 'string',
          description: 'GitLab merge request URL'
        }
      },
      required: ['mr_url']
    }
  },
  {
    name: 'erpnext_get_redmine_issue',
    description: 'Get Redmine issue details (title/subject) from issue ID or URL. Requires REDMINE_API_KEY to be configured.',
    inputSchema: {
      type: 'object',
      properties: {
        issue_id: {
          type: 'string',
          description: 'Redmine issue ID (e.g., "115275") or full URL (e.g., "https://support.credenceanalytics.com/issues/115275")'
        }
      },
      required: ['issue_id']
    }
  },
  {
    name: 'erpnext_get_redmine_issue_details',
    description: 'Get FULL Redmine issue details from an ID or URL: description, status, priority, assignee, done ratio, comments/journal notes, attachments, sub-tasks (children) and relations. Use this (not erpnext_get_redmine_issue) when you need the actual issue content, reported bugs, or discussion. Requires REDMINE_API_KEY.',
    inputSchema: {
      type: 'object',
      properties: {
        issue_id: {
          type: 'string',
          description: 'Redmine issue ID (e.g., "149460") or full URL'
        },
        include_comments: {
          type: 'boolean',
          description: 'Include comments/journal notes. Default: true'
        },
        include_attachments: {
          type: 'boolean',
          description: 'Include attachment metadata (filename, content URL). Default: true'
        },
        include_children: {
          type: 'boolean',
          description: 'Include sub-tasks and relations. Default: true'
        }
      },
      required: ['issue_id']
    }
  },
  {
    name: 'erpnext_update_redmine_issue',
    description: 'Update a Redmine issue: add a comment/note and/or change fields (status, assignee, priority, done ratio, subject, description, dates). Provide either status_id or status_name (name is resolved automatically). Requires REDMINE_API_KEY with write permission on the project.',
    inputSchema: {
      type: 'object',
      properties: {
        issue_id: {
          type: 'string',
          description: 'Redmine issue ID (e.g., "149460") or full URL'
        },
        notes: {
          type: 'string',
          description: 'Comment/note to add to the issue journal'
        },
        private_notes: {
          type: 'boolean',
          description: 'Mark the added note as private (visible only to members with permission). Default: false'
        },
        status_id: {
          type: 'number',
          description: 'New status ID. Use this OR status_name.'
        },
        status_name: {
          type: 'string',
          description: 'New status name (e.g., "In Progress", "Resolved", "Closed"). Resolved to an ID automatically.'
        },
        assigned_to_id: {
          type: 'number',
          description: 'User ID to assign the issue to'
        },
        priority_id: {
          type: 'number',
          description: 'New priority ID'
        },
        done_ratio: {
          type: 'number',
          description: '% done (0-100)'
        },
        subject: {
          type: 'string',
          description: 'New issue subject/title'
        },
        description: {
          type: 'string',
          description: 'New issue description'
        },
        due_date: {
          type: 'string',
          description: 'Due date (YYYY-MM-DD)'
        },
        start_date: {
          type: 'string',
          description: 'Start date (YYYY-MM-DD)'
        }
      },
      required: ['issue_id']
    }
  },
  {
    name: 'erpnext_get_software_release',
    description: 'Get details of an existing software release (can be used as template reference)',
    inputSchema: {
      type: 'object',
      properties: {
        release_url: {
          type: 'string',
          description: 'ERPNext software release URL (e.g., https://erp.credenceanalytics.com/app/software-release/MercuryFx-MFXSTD_RETAIL_LIVE_5_0_0_411)'
        },
        release_name: {
          type: 'string',
          description: 'Or provide release name directly (e.g., MercuryFx-MFXSTD_RETAIL_LIVE_5_0_0_411)'
        }
      },
      required: []
    }
  },
  {
    name: 'erpnext_list_software_releases',
    description: 'List recent software releases with optional filters',
    inputSchema: {
      type: 'object',
      properties: {
        product: {
          type: 'string',
          description: 'Filter by product name'
        },
        customer: {
          type: 'string',
          description: 'Filter by customer name'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results. Default: 20'
        }
      },
      required: []
    }
  }
];

export default softwareReleaseTools;
