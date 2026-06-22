# MCP ERPNext

[![npm version](https://badge.fury.io/js/mcp-erpnext.svg)](https://www.npmjs.com/package/mcp-erpnext)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Model Context Protocol (MCP) server for ERPNext - manage timesheets, leave applications, projects, and software releases via Claude, Gemini, or any MCP-compatible AI assistant.

## Features

- **Timesheets**: Create, edit, submit, and manage timesheets
- **Leave Applications**: Apply for leave, check balances, manage applications
- **Projects**: List projects and tasks
- **Software Releases**: Create release documents from GitLab merge requests with auto-detection
- **Smart Validation**: Automatic overlap detection for time entries
- **Draft Editing**: Full support for editing draft timesheets

## Installation

### Via npm (recommended)

```bash
npm install -g mcp-erpnext
```

### From source

```bash
git clone https://github.com/Gaurav-Pasi/mcp-erpnext.git
cd mcp-erpnext
npm install
```

## Configuration

### 1. Set up credentials

Create a `.env` file or set environment variables:

```env
ERPNEXT_URL=https://your-erpnext-instance.com
ERPNEXT_USERNAME=your-email@example.com
ERPNEXT_PASSWORD=your-password
ERPNEXT_TOTP_SECRET=your-totp-secret  # Optional, for 2FA

# For Software Releases (optional)
GITLAB_URL=https://gitlab.example.com
GITLAB_TOKEN=your-gitlab-personal-access-token
REDMINE_URL=https://redmine.example.com
REDMINE_API_KEY=your-redmine-api-key  # For auto-fetching ticket titles
```

### 2. Configure your AI client

**Claude Desktop** (`~/.claude/claude_desktop_config.json` or `%APPDATA%\Claude\claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "erpnext": {
      "command": "npx",
      "args": ["mcp-erpnext"],
      "env": {
        "ERPNEXT_URL": "https://your-erpnext-instance.com",
        "ERPNEXT_USERNAME": "your-username",
        "ERPNEXT_PASSWORD": "your-password"
      }
    }
  }
}
```

**Or from local installation:**

```json
{
  "mcpServers": {
    "erpnext": {
      "command": "node",
      "args": ["/path/to/mcp-erpnext/src/index.js"]
    }
  }
}
```

**Gemini CLI** (`~/.gemini/settings.json`):

```json
{
  "mcpServers": {
    "erpnext": {
      "command": "npx",
      "args": ["mcp-erpnext"],
      "env": {
        "ERPNEXT_URL": "https://your-erpnext-instance.com",
        "ERPNEXT_USERNAME": "your-username",
        "ERPNEXT_PASSWORD": "your-password"
      }
    }
  }
}
```

## Usage Examples

Once configured, you can ask your AI assistant:

```
Create weekly timesheet for project PROJ-0460
```

```
Show my draft timesheets
```

```
Submit timesheet TS-2025-00123
```

```
Apply for leave from Dec 25 to Dec 27
```

```
Update time log 0 in timesheet TS-2025-00123 to 8 hours
```

```
Create software release for https://gitlab.example.com/project/-/merge_requests/123
using template https://erp.example.com/app/software-release/Product-v1.0.0
```

See [USAGE.md](USAGE.md) for complete examples.

## Available Tools

### Timesheets
| Tool | Description |
|------|-------------|
| `erpnext_create_weekly_timesheet` | Create weekly timesheet (7h billable + 2h non-billable/day) |
| `erpnext_create_timesheet` | Create custom timesheet |
| `erpnext_create_custom_timesheet` | Create timesheet with specific entries |
| `erpnext_list_timesheets` | List timesheets with filters |
| `erpnext_get_timesheet` | Get timesheet details |
| `erpnext_get_my_draft_timesheets` | Get current user's draft timesheets |
| `erpnext_update_time_log` | Edit a time entry in draft timesheet |
| `erpnext_remove_time_log` | Remove a time entry from draft |
| `erpnext_update_timesheet_note` | Update timesheet note |
| `erpnext_delete_timesheet` | Delete draft timesheet |
| `erpnext_submit_timesheet` | Submit for approval |
| `erpnext_cancel_timesheet` | Cancel timesheet |

### Leave Applications
| Tool | Description |
|------|-------------|
| `erpnext_apply_leave` | Apply for leave |
| `erpnext_list_leave_applications` | List leave applications |
| `erpnext_get_my_pending_leaves` | Get pending leave applications |
| `erpnext_get_leave_balance` | Check leave balance |
| `erpnext_submit_leave_application` | Submit for approval |
| `erpnext_cancel_leave_application` | Cancel leave application |

### Core
| Tool | Description |
|------|-------------|
| `erpnext_login` | Authenticate with ERPNext |
| `erpnext_get_current_employee` | Get logged-in user's employee record |
| `erpnext_list_projects` | List projects |
| `erpnext_list_tasks` | List tasks for a project |
| `erpnext_list_activity_types` | List available activity types |

### Software Releases
| Tool | Description |
|------|-------------|
| `erpnext_preview_software_release` | **Preview release before creating** - shows all fields and sources |
| `erpnext_create_software_release` | Create release from GitLab MR with auto-detection |
| `erpnext_get_mr_details` | Get MR details (Redmine IDs, patches, version) |
| `erpnext_get_redmine_issue` | Get Redmine ticket title |
| `erpnext_get_software_release` | Get existing release (use as template) |
| `erpnext_list_software_releases` | List recent releases |
| `erpnext_list_products` | List available products |
| `erpnext_list_customers_for_release` | List available customers |

## Key Features

### Time Entry Overlap Prevention

The server automatically validates that time entries don't overlap:

```
Error: Time entries have overlapping times:
Time entry 1 (Billable Work: 2025-12-02 10:00:00 - 17:00:00) overlaps with
entry 2 (Non Billable Work: 2025-12-02 15:00:00 - 17:00:00)
```

### Draft Editing

Edit draft timesheets before submission:
- Update hours, times, project, activity type
- Remove individual time entries
- Update notes
- Delete entire draft

### Software Release Auto-Detection

Create software releases from GitLab MRs with intelligent auto-detection:

- **Template-based**: Use existing release as template (auto-fills Product, Customer, Reviewer)
- **Redmine IDs**: Auto-extracted from MR description tables (`| 1. | #124323 | Title |`)
- **Redmine Titles**: Auto-fetched from Redmine API if configured
- **Version**: Auto-detected from branch name (e.g., `release-v1.0.0.12`)
- **Customer**: Auto-detected from GitLab project path
- **Patch URLs**: Auto-extracted from MR notes/attachments
- **Test Reports**: Auto-extracted from MR notes/attachments

## Project Structure

```
mcp-erpnext/
├── src/
│   ├── index.js              # Entry point
│   ├── erpnext-client.js     # ERPNext API client
│   ├── gitlab-client.js      # GitLab API client (for software releases)
│   ├── redmine-client.js     # Redmine API client (for ticket titles)
│   ├── resources.js          # MCP resources
│   ├── definitions/          # Tool schemas
│   ├── handlers/             # Tool handlers
│   ├── tools/                # Business logic
│   └── formatters/           # Response formatters
├── .env.example
├── package.json
├── README.md
└── USAGE.md
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Author

**Gaurav Pasi** - [GitHub](https://github.com/Gaurav-Pasi)

## Links

- [GitHub Repository](https://github.com/Gaurav-Pasi/mcp-erpnext)
- [npm Package](https://www.npmjs.com/package/mcp-erpnext)
- [Report Issues](https://github.com/Gaurav-Pasi/mcp-erpnext/issues)
