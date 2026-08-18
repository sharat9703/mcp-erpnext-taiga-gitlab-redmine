# devflow-mcp

An MCP (Model Context Protocol) server that exposes engineering-workflow operations to MCP clients such as Claude Code, Claude Desktop, or any other MCP-compatible assistant. It wraps four systems behind one stdio server: **ERPNext** (timesheets, leave applications, projects, Developer Tasks, Software Release documents), **Taiga** (user stories, tasks, attachments), **Redmine** (issue read/create/update, attachments), and **GitLab** (merge request listing, analysis, and release-note generation from MRs). All 52 tools are registered in a single process; ERPNext credentials are mandatory, the other three services activate only when their credentials are present.

## Prerequisites

- **Node.js >= 18** (declared in `package.json` `engines`). No build step — the server runs plain ESM JavaScript from `src/`.
- **ERPNext account** — required. The server exits at startup without it.
- **GitLab personal access token** — optional; needed for merge-request and software-release tools.
- **Redmine API key** — optional; needed for Redmine issue and attachment tools, and for auto-fetching ticket titles during release creation.
- **Taiga credentials** (token, or user + password) — optional; needed for all Taiga tools.

## Installation

```bash
git clone https://gitlab.credenceanalytics.com/Sharat/devflow-mcp.git
cd devflow-mcp
npm install
```

There is no build step. Verify it starts:

```bash
npm start          # or: node src/index.js
```

It should print `MCP ERPNext Server running` on stderr and then wait for stdio input (Ctrl+C to exit).

### Configuration

Copy `.env.example` to `.env` **in the repository root**. `src/index.js` loads it relative to the package root, not the working directory, so the file must sit next to `package.json`.

```env
ERPNEXT_URL=https://erp.example.com
ERPNEXT_USERNAME=you@example.com
ERPNEXT_PASSWORD=your-password
ERPNEXT_TOTP_SECRET=BASE32SECRET

GITLAB_URL=https://gitlab.example.com
GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx

REDMINE_URL=https://redmine.example.com
REDMINE_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

TAIGA_HOST=https://taiga.example.com/api/v1
TAIGA_USER=you@example.com
TAIGA_PASS=your-password
# TAIGA_TOKEN=eyJ0eXAi...    # alternative to TAIGA_USER + TAIGA_PASS
```

| Variable | Required | Default | What it is / where to get it |
|----------|----------|---------|------------------------------|
| `ERPNEXT_URL` | Yes | — | Base URL of your ERPNext/Frappe instance, no trailing path. |
| `ERPNEXT_USERNAME` | Yes | — | ERPNext login, usually your email address. |
| `ERPNEXT_PASSWORD` | Yes | — | Password for that ERPNext login. |
| `ERPNEXT_TOTP_SECRET` | No | — | Base32 TOTP seed, only if your ERPNext enforces 2FA. Shown as the "manual entry" secret when you set up the authenticator app. |
| `GITLAB_URL` | No | `https://gitlab.credenceanalytics.com` | Base URL of your GitLab instance. |
| `GITLAB_TOKEN` | No | — | Personal access token with `api` (or at least `read_api`) scope: GitLab → User Settings → Access Tokens. |
| `REDMINE_URL` | No | `https://support.credenceanalytics.com` | Base URL of your Redmine instance. |
| `REDMINE_API_KEY` | No | — | Redmine REST API key: Redmine → My account → API access key → Show. Needs write permission for the issue-create/update tools. |
| `TAIGA_HOST` | No | `https://api.taiga.io/api/v1` | Taiga **API** base URL — must include the `/api/v1` suffix. |
| `TAIGA_USER` | No | — | Taiga username or email (used with `TAIGA_PASS` for password login). |
| `TAIGA_PASS` | No | — | Password for `TAIGA_USER`. |
| `TAIGA_TOKEN` | No | — | Pre-issued Taiga auth token. Use this *or* `TAIGA_USER` + `TAIGA_PASS`. |
| `DEVFLOW_ENV_FILE` | No | `<package root>/.env` | Absolute path to the `.env` file to load. Set this when the server runs from a read-only or cached install (e.g. `npx`, or the Claude Code plugin) where there is no writable package root to hold `.env`. |

Credentials may also be supplied through the MCP client's `env` block instead of `.env` (see below); the process environment wins where both are set.

## Client setup

### Claude Code plugin (recommended)

The server ships as the `devflow-mcp` plugin in the internal marketplace, which registers it for you — no path wiring, no `claude mcp add`:

```
/plugin marketplace add https://gitlab.credenceanalytics.com/cred-ai/creda-ai-marketplace.git
/plugin install devflow-mcp@creda-ai-marketplace
```

The plugin launches the server via `npx` straight from this repository's git tag, so there is nothing to clone or `npm install`. Credentials come from a `.env` file of your own, pointed at by `DEVFLOW_ENV_FILE`:

```bash
# create ~/.devflow-mcp.env holding the variables from the table above, then:
setx DEVFLOW_ENV_FILE "%USERPROFILE%\.devflow-mcp.env"         # Windows
echo 'export DEVFLOW_ENV_FILE=~/.devflow-mcp.env' >> ~/.bashrc  # macOS/Linux
```

Restart Claude Code afterwards so the new environment variable is picked up.

### Manual registration

Add the server to your MCP client config. Use an **absolute path** to `src/index.js`.

**Claude Desktop** — `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "devflow": {
      "command": "node",
      "args": ["D:\\devflow-mcp\\src\\index.js"],
      "env": {
        "ERPNEXT_URL": "https://erp.example.com",
        "ERPNEXT_USERNAME": "you@example.com",
        "ERPNEXT_PASSWORD": "your-password",
        "GITLAB_TOKEN": "glpat-xxxxxxxxxxxxxxxxxxxx",
        "REDMINE_API_KEY": "xxxxxxxxxxxxxxxxxxxxxxxx",
        "TAIGA_HOST": "https://taiga.example.com/api/v1",
        "TAIGA_USER": "you@example.com",
        "TAIGA_PASS": "your-password"
      }
    }
  }
}
```

**Claude Code** — same block inside `.mcp.json` (project scope) or `~/.claude.json` (user scope), or register it in one command:

```bash
claude mcp add devflow -- node /absolute/path/to/devflow-mcp/src/index.js
```

Windows path notes:

- In JSON, backslashes must be escaped: `"D:\\devflow-mcp\\src\\index.js"`. Forward slashes (`"D:/devflow-mcp/src/index.js"`) also work and avoid the issue.
- Keeping credentials in `.env` and omitting the `env` block entirely is simpler — the server finds `.env` from its own location regardless of where the client launches it from.

## Usage

Once the server is connected, ask the assistant in plain language:

- **"Create my weekly timesheet for project PROJ-0460."**
  Calls `erpnext_create_weekly_timesheet`, which creates Mon–Fri entries of 7h Billable + 2h Non-Billable, validates that no time ranges overlap, and returns the draft timesheet name for review before you submit it.

- **"Preview a software release for https://gitlab.example.com/team/repo/-/merge_requests/412 using https://erp.example.com/app/software-release/PROD-v1.2.0 as the template."**
  Calls `erpnext_preview_software_release`: pulls commits and notes from the MR, extracts Redmine ids from the description, fetches their titles from Redmine, inherits Product/Customer/Reviewer from the template release, and shows every field plus its source. Nothing is written until you follow up with `erpnext_create_software_release`.

- **"Show the tasks under this Taiga user story and the commits they reference."**
  Calls `erpnext_get_user_story_tasks`, returning each task's full description along with the merge-commit SHAs and Redmine issue ids found in it — useful for assembling a cherry-pick list for a release branch.

- **"Apply for leave from 25 Dec to 27 Dec, and show my leave balance first."**
  Calls `erpnext_get_leave_balance`, then `erpnext_apply_leave` to create the application as a draft; `erpnext_submit_leave_application` sends it for approval as a separate, explicit step.

See [USAGE.md](USAGE.md) for longer worked examples.

## Tool reference

52 tools, registered in `src/definitions/` and dispatched from `src/handlers/`.

### Auth

| Tool | Description | Required params |
|------|-------------|-----------------|
| `erpnext_login` | Log in to ERPNext with the configured username/password and optional TOTP. Call before other operations. | — |
| `erpnext_get_current_employee` | Get the Employee record linked to the logged-in user. | — |

### Timesheets

| Tool | Description | Required params |
|------|-------------|-----------------|
| `erpnext_list_activity_types` | List available activity types for timesheets. | — |
| `erpnext_create_timesheet` | Create a timesheet with an array of time logs. | `time_logs` |
| `erpnext_quick_timesheet` | Create a timesheet for today with a single entry. | `hours`, `activity_type` |
| `erpnext_create_weekly_timesheet` | Create a Mon–Fri week of 7h Billable + 2h Non-Billable per day (hours and days configurable). | — |
| `erpnext_create_custom_timesheet` | Create a timesheet from fully custom entries. | `entries` |
| `erpnext_list_timesheets` | List timesheets, filterable by employee, status and date range. | — |
| `erpnext_get_timesheet` | Get one timesheet's details. | `name` |
| `erpnext_get_my_draft_timesheets` | List all draft timesheets for the current employee. | — |
| `erpnext_add_time_log` | Append a time log to an existing draft timesheet. | `timesheet`, `activity_type`, `hours` |
| `erpnext_update_time_log` | Edit hours, times, project, activity type or description of one log in a draft. | `timesheet`, `time_log_index` |
| `erpnext_remove_time_log` | Remove one time log from a draft (cannot remove the last one). | `timesheet`, `time_log_index` |
| `erpnext_update_timesheet_note` | Update the note on a draft timesheet. | `timesheet`, `note` |
| `erpnext_delete_timesheet` | Delete a draft (unsubmitted) timesheet. | `timesheet` |
| `erpnext_submit_timesheet` | Submit a draft timesheet. | `name` |
| `erpnext_cancel_timesheet` | Cancel a submitted timesheet. | `name` |

### Leave

| Tool | Description | Required params |
|------|-------------|-----------------|
| `erpnext_list_leave_types` | List available leave types. | — |
| `erpnext_get_leave_balance` | Get leave balance for the current employee, optionally for one leave type. | — |
| `erpnext_list_leave_applications` | List leave applications, filterable by status, type and date range. | — |
| `erpnext_get_leave_application` | Get one leave application's details. | `name` |
| `erpnext_get_my_pending_leaves` | List pending leave applications for the current employee. | — |
| `erpnext_get_my_approved_leaves` | List approved leave applications for the current employee. | — |
| `erpnext_apply_leave` | Apply for leave, single or multiple days, with half-day support. | `from_date` |
| `erpnext_submit_leave_application` | Submit a leave application for approval. | `name` |
| `erpnext_cancel_leave_application` | Cancel a leave application. | `name` |

### Tasks & Projects

| Tool | Description | Required params |
|------|-------------|-----------------|
| `erpnext_list_projects` | List ERPNext projects, optionally filtered by status. | — |
| `erpnext_list_tasks` | List tasks for a project. | `project` |
| `erpnext_create_tasks_from_analysis` | Create ERPNext tasks from a prior merge-request analysis, marked Completed and assigned to the current employee. | `tasks` |
| `erpnext_get_developer_tasks` | Get Developer Tasks for a developer (default: logged-in user) with date/status/product/subject filters, plus a per-client breakdown. | — |

### Taiga

| Tool | Description | Required params |
|------|-------------|-----------------|
| `erpnext_validate_user_story` | Validate a user story by URL and return its id, title and project. | `user_story_url` |
| `erpnext_create_user_story` | Create a user story in a Taiga project; returns id, ref and URL. | `project_slug`, `subject` |
| `erpnext_create_taiga_tasks` | Create one or more tasks under a user story, resolving assignees from project members and setting custom attributes (complexity, task type) where they exist. | `user_story_id`, `project_slug`, `tasks` |
| `erpnext_get_taiga_tasks` | Get tasks assigned to a user (default: authenticated user) with descriptions and attachment metadata; open tasks only by default. | — |
| `erpnext_get_user_story_tasks` | Get all tasks under a user story (any assignee) with full descriptions, plus merge-commit SHAs and Redmine ids referenced in them. | `user_story` |
| `erpnext_update_taiga_task` | Update a task's status and/or description, identified by `task_id` or by `ref` + project. | — |
| `erpnext_download_taiga_attachment` | Download a task attachment to disk by URL or attachment id; returns the saved path and a text preview where applicable. | — |
| `erpnext_export_tasks_to_erp` | Export tasks to ERPNext as Developer Task documents, resolving the employee code, mapping task type to an ERP category and normalizing complexity. | `tasks` |

### Redmine

| Tool | Description | Required params |
|------|-------------|-----------------|
| `erpnext_get_redmine_issue` | Get an issue's title/subject from its id or URL. | `issue_id` |
| `erpnext_get_redmine_issue_details` | Get full issue content: description, status, priority, assignee, done ratio, comments, attachments, sub-tasks and relations. | `issue_id` |
| `erpnext_create_redmine_issue` | Create a new issue in a project, with optional tracker, assignee, dates, parent and custom fields. Needs create permission. | `project_id`, `subject` |
| `erpnext_update_redmine_issue` | Add a note and/or change fields (status by id or name, assignee, priority, done ratio, subject, description, dates). Needs write permission. | `issue_id` |
| `erpnext_download_redmine_attachment` | Download an issue attachment to disk by attachment id or download URL; returns the saved path, metadata and a text preview where applicable. | `attachment` |

All Redmine tools require `REDMINE_API_KEY`.

### GitLab merge requests

| Tool | Description | Required params |
|------|-------------|-----------------|
| `erpnext_list_merge_requests` | List MRs in a project, filterable by state, author, target branch and creation date range. | `project_path` |
| `erpnext_analyze_merge_request` | Analyze one or more MRs: extract commits, group them by type (features/fixes/refactors) and identify Redmine issues, returning a suggested task breakdown for review. | — (pass `mr_url` or `mr_urls`) |
| `erpnext_get_mr_details` | Get MR details including auto-detected customer, version, Redmine ids from the description and patch/test-report URLs from the notes. | `mr_url` |

### Software releases

| Tool | Description | Required params |
|------|-------------|-----------------|
| `erpnext_preview_software_release` | Show what the release document will contain — auto-detected fields, their sources and anything still missing — without creating it. | `mr_urls` |
| `erpnext_create_software_release` | Create the Software Release document in ERPNext from GitLab MR URL(s), auto-filling Product/Customer/Reviewer from a template release and pulling Redmine ids, ticket titles, patch URLs and test-report URLs. | `mr_urls` |
| `erpnext_get_software_release` | Get an existing release by URL or name (commonly used as the template reference). | — (pass `release_url` or `release_name`) |
| `erpnext_list_software_releases` | List recent releases, filterable by product and customer. | — |
| `erpnext_list_products` | List products (Brands) available for release selection. | — |
| `erpnext_list_customers_for_release` | List customers available for release selection. | — |

### Resources

Read-only endpoints exposed alongside the tools:

| URI | Contents |
|-----|----------|
| `erpnext://timesheets/draft` | Draft timesheets for the current employee |
| `erpnext://activity-types` | Available timesheet activity types |
| `erpnext://projects` | All projects |
| `erpnext://leave-types` | Available leave types |
| `erpnext://leaves/pending` | Pending leave applications |

## Troubleshooting

**Server exits immediately with "ERPNEXT_URL, ERPNEXT_USERNAME, and ERPNEXT_PASSWORD are required".**
The `.env` file is missing or not in the repository root. It is loaded from the package root (next to `package.json`), not from the client's working directory. Either move it there or pass the values in the client's `env` block.

**ERPNext login fails / 401.**
Run `erpnext_login` explicitly and read the error. If the account has 2FA enabled, `ERPNEXT_TOTP_SECRET` must be the Base32 seed — not a 6-digit code. Check that `ERPNEXT_URL` has no trailing slash or path segment.

**Redmine tools return an error about the API key.**
`REDMINE_API_KEY` is unset or lacks permission. Creating and updating issues needs write access on the target project; a read-only key will fail only on those tools.

**Taiga tools fail to authenticate.**
Supply either `TAIGA_TOKEN` or both `TAIGA_USER` and `TAIGA_PASS`. `TAIGA_HOST` must point at the API base and include `/api/v1` — a plain site URL will 404.

**GitLab / release tools fail.**
`GITLAB_TOKEN` needs `api` scope and access to the project the MR lives in. Confirm `GITLAB_URL` matches the instance hosting that MR.

**The server does not appear in the client.**
- Restart the client fully after editing its config — MCP servers are launched at startup.
- Check the path in `args` is absolute and the file exists; in JSON, backslashes must be doubled.
- Run `node /absolute/path/to/src/index.js` in a terminal. If the process prints `MCP ERPNext Server running` and hangs, the server is fine and the problem is the client config; any other output is the actual error.
- In Claude Code, `claude mcp list` shows registered servers and their connection status.

## License

MIT — see [LICENSE](LICENSE).

## Author

**Sharat Yaragatti** — [GitHub](https://github.com/sharat9703)
