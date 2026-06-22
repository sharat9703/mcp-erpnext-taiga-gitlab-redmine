# ERPNext MCP - User Guide

Quick reference for using ERPNext through your AI assistant.

---

## Timesheets

### Create Weekly Timesheet
```
Create weekly timesheet for project PROJ-0460
```
Creates Mon-Fri entries: 7h billable (10:00-17:00) + 2h non-billable (17:00-19:00)

### Create Last Week's Timesheet
```
Create weekly timesheet for last week on PROJ-0460
```

### Skip a Day (e.g., Friday off)
```
Create weekly timesheet for PROJ-0460, skip Friday
```

### Check Draft Timesheets
```
Show my draft timesheets
```

### Submit Timesheet
```
Submit timesheet TS-2025-09010
```

### View Timesheet Details
```
Show details of timesheet TS-2025-09010
```

### List Recent Timesheets
```
Show my timesheets from this month
```

### Edit Time Entry in Draft Timesheet
```
Update time log 0 in timesheet TS-2025-09010 to 8 hours
```
```
Change the project on time log 1 in TS-2025-09010 to PROJ-0461
```
```
Update time log 2 in TS-2025-09010: change hours to 6, start time to 11:00
```

### Remove Time Entry from Draft
```
Remove time log 3 from timesheet TS-2025-09010
```

### Update Timesheet Note
```
Update note on timesheet TS-2025-09010 to "Week of Dec 2-6"
```

### Delete Draft Timesheet
```
Delete timesheet TS-2025-09010
```

---

## Leave Applications

### Apply for Single Day Leave
```
Apply for leave on 2025-12-25
```

### Apply for Multiple Days
```
Apply for leave from 2025-12-25 to 2025-12-27
```

### Apply for Half Day
```
Apply for half day leave on 2025-12-25
```

### Apply with Reason
```
Apply for sick leave on 2025-12-25 for doctor appointment
```

### Check Pending Leaves
```
Show my pending leave applications
```

### Check Approved Leaves
```
Show my approved leaves
```

### Cancel Leave
```
Cancel leave application HR-LAP-2025-01720
```

### Check Leave Balance
```
What is my leave balance?
```

---

## Projects & Tasks

### List All Projects
```
Show my projects
```

### List Open Projects Only
```
Show open projects
```

### List Tasks for a Project
```
Show tasks for project PROJ-0460
```

---

## Common Workflows

### Weekly Timesheet Flow
1. `Show my projects` → Find project ID
2. `Create weekly timesheet for PROJ-0460` → Creates draft
3. `Show my draft timesheets` → Verify
4. `Submit timesheet TS-2025-XXXXX` → Done

### Leave Application Flow
1. `Show leave types` → See available types
2. `Apply for leave from Dec 25 to Dec 26` → Creates application
3. `Show my pending leaves` → Verify
4. Wait for manager approval

---

## Tips

- **Dates**: Use `YYYY-MM-DD` format or natural language like "next Monday"
- **Projects**: Get project ID first with "show my projects"
- **Draft first**: Timesheets are created as drafts - review before submitting
- **Leave types**: Check available types with "show leave types"

---

## Important Notes

### Time Entry Overlap Prevention
The system automatically validates that time entries do not overlap. If you try to create or edit time entries with overlapping times, you will receive an error message showing which entries conflict.

**Example error:**
```
Time entries have overlapping times:
Time entry 1 (Billable Work: 2025-12-02 10:00:00 - 2025-12-02 17:00:00) overlaps with entry 2 (Non Billable Work: 2025-12-02 15:00:00 - 2025-12-02 17:00:00)
```

To fix overlapping entries, edit the time logs to adjust start times or hours so they don't overlap.

### Editing Timesheets
- **Only draft timesheets can be edited** - once submitted, timesheets cannot be modified
- Time log indices are 0-based (first entry is 0, second is 1, etc.)
- Use `Show details of timesheet TS-XXXX` to see current time logs and their indices
- You can edit hours, start/end times, project, activity type, and description
- The last time log cannot be removed - delete the entire timesheet instead

---

## Software Releases

Create software release documents in ERPNext from GitLab merge request URLs. All links in release notes are clickable hyperlinks.

### Auto-Fetch Features
The system automatically fetches:
- **Product, Customer, Reviewer** - From template release URL if provided
- **Redmine IDs & Titles** - Extracted from MR description table (e.g., `| 1. | #124323 | LRS API Change |`)
- **Redmine Titles (fallback)** - Auto-fetched from Redmine API if not found in MR and REDMINE_API_KEY is configured
- **Patch URLs** - Extracted from MR description/notes (files containing "patch", ".war", "warpatch", "wildfly")
- **Test Report URLs** - Extracted from MR notes (files containing "test", "report")
- **Manual Script URLs** - Extracted from MR notes (files containing "script", "manual")
- **Config URLs** - Extracted from MR notes (files containing "config", "configuration")
- **Customer** - Auto-detected from GitLab project path (if no template)
- **Version** - Extracted from branch name (e.g., `release-v1.0.0.12` → `1.0.0.12`)

---

## Software Release Examples

### Example 1: MR with Redmine Table (Full Auto)
**MR Description:**
```
B). Release Points:
| Sr. No. | Point | Name |
| 1. | #124323 | Liberalized Remittance Scheme (LRS) API Change |

C). Patch: patch.zip
D). Test Report: LRS_TEST_REPORT.docx
```

**Command:**
```
Create software release for https://gitlab.credenceanalytics.com/mercuryfx/kotak/ing_uat.war/-/merge_requests/168
using template https://erp.credenceanalytics.com/app/software-release/MercuryFx-KOTAK-v5.0.0.410
```

**What gets auto-filled:**
| Field | Source | Value |
|-------|--------|-------|
| Product | Template | MercuryFx |
| Customer | Template | Kotak Mahindra Bank |
| Reviewer | Template | Jitesh Suthar |
| Redmine ID | MR Description | 124323 |
| Redmine Title | MR Description | Liberalized Remittance Scheme (LRS) API Change |
| Patch URL | MR Attachments | patch.zip link |
| Test Report | MR Attachments | LRS_TEST_REPORT.docx link |
| Version | MR Branch | 5.0.0.411 |

**You provide:** Nothing! Everything is auto-filled.

---

### Example 2: Simple MR (No Redmine in Description)
**MR:** `https://gitlab.credenceanalytics.com/mercuryfx/mudra2/intranet/retail-app/retail/-/merge_requests/1451`

**MR Details:**
- Title: "release 12"
- Branch: `release-v1.0.0.12`
- Description: Just "release 12" (no Redmine table)

**Command:**
```
Create software release for https://gitlab.credenceanalytics.com/mercuryfx/mudra2/intranet/retail-app/retail/-/merge_requests/1451
using template https://erp.credenceanalytics.com/app/software-release/Mudra-TCIL-v1.0.0.11
Redmine ID: 125000
```

**What gets auto-filled:**
| Field | Source | Value |
|-------|--------|-------|
| Product | Template | Mudra |
| Customer | Template | Thomas Cook |
| Reviewer | Template | Jitesh Suthar |
| Version | MR Branch | 1.0.0.12 |
| Patch URL | MR Attachments | (if uploaded) |

**You provide:** Redmine ID (not in MR description)

---

### Example 3: Multiple MRs
**Command:**
```
Create software release for these merge requests:
- https://gitlab.credenceanalytics.com/mercuryfx/kotak/ing_uat.war/-/merge_requests/148
- https://gitlab.credenceanalytics.com/mercuryfx/kotak/reporting-server/-/merge_requests/6
using template https://erp.credenceanalytics.com/app/software-release/MercuryFx-KOTAK-v5.0.0.1
```

Both MRs' attachments will be combined into the release.

---

### Get MR Details First
```
Get details of merge request https://gitlab.credenceanalytics.com/mercuryfx/mudra2/intranet/retail-app/retail/-/merge_requests/1451
```
This shows:
- Auto-detected customer (Thomas Cook from `mudra2/intranet` path)
- Auto-detected version (1.0.0.12 from branch)
- Redmine IDs if found in description
- Patch URLs and test report URLs from MR notes

### Get Redmine Ticket Title
```
Get Redmine issue 124323
```
Returns the ticket title for use in the software release.

### List Available Products
```
Show products for software release
```

### List Available Customers
```
Show customers for software release
```

### View Existing Software Release
```
Show software release Mudra-TCIL-v1.0.0.11
```

### List Recent Software Releases
```
Show recent software releases for Mudra
```

---

## Preview Before Creating

**Always preview before creating!** Use the preview command to see exactly what will be filled:

### Preview Command
```
Preview software release for https://gitlab.credenceanalytics.com/mercuryfx/mudra2/intranet/retail-app/retail/-/merge_requests/1451
using template https://erp.credenceanalytics.com/app/software-release/Mudra-TCIL-v1.0.0.11
```

### Preview Output Shows:
| Field | Value | Source |
|-------|-------|--------|
| Product | Mudra | Template: Mudra-TCIL-v1.0.0.11 |
| Customer | Thomas Cook | Template: Mudra-TCIL-v1.0.0.11 |
| Reviewer | Jitesh Suthar | Template: Mudra-TCIL-v1.0.0.11 |
| Version | 1.0.0.12 | Auto-detected from branch "release-v1.0.0.12" |
| Release Name | THOMAS_COO_1_0_0_12 | Auto-generated |
| Redmine IDs | (empty) | - |
| Patch URLs | [...] | Auto-fetched from GitLab MR |

### Warnings Section:
If any required fields are missing, warnings will be shown:
```
MISSING: At least one Redmine ID is required
```

### Ready Status:
- **ready: true** → All required fields present, safe to create
- **ready: false** → Missing fields, need to provide additional info

### Override Any Field After Preview
After seeing the preview, you can **override ANY auto-detected field**:

```
Create software release for https://gitlab.../merge_requests/1451
using template https://erp.../software-release/Mudra-TCIL-v1.0.0.11
Redmine ID: 125000
Customer: HDFC Bank              ← Override auto-detected customer
Version: 2.0.0.1                 ← Override auto-detected version
Reviewer: John Doe               ← Override template reviewer
```

**Priority order (highest to lowest):**
1. **User-provided value** - Always wins
2. **Template value** - Used if no user value
3. **Auto-detected value** - Fallback

**Overridable fields:**
- `product` - Product name
- `customer` - Customer name
- `reviewer` - Reviewer name
- `version` - Version string
- `release_name` - Release document name
- `release_type` - Patch/Minor/Major
- `release_date` - Release date
- `redmine_ids` - Redmine ticket IDs
- `redmine_titles` - Ticket titles
- `patch_urls` - Patch file URLs
- `test_report_urls` - Test report URLs

---

## Software Release Workflow

### Recommended Flow (Preview → Review → Override → Create)
```
1. Preview software release for https://gitlab.../merge_requests/1451
   using template https://erp.../software-release/Mudra-TCIL-v1.0.0.11

2. (Review the preview output)
   - See all auto-filled fields and their sources
   - Note any missing required fields
   - Check if any auto-detected values need correction

3. Create with overrides if needed:
   Create software release for https://gitlab.../merge_requests/1451
   using template https://erp.../software-release/Mudra-TCIL-v1.0.0.11
   Redmine ID: 125000
   Customer: Different Customer    ← Optional override
```

### Fastest Flow (MR has Redmine table)
```
Create software release for https://gitlab.../merge_requests/168
using template https://erp.credenceanalytics.com/app/software-release/MercuryFx-KOTAK-v5.0.0.410
```
**Result:** Everything auto-filled!

### Flow When MR Has No Redmine
```
Create software release for https://gitlab.../merge_requests/1451
using template https://erp.credenceanalytics.com/app/software-release/Mudra-TCIL-v1.0.0.11
Redmine ID: 125000
```
**You provide:** Just the Redmine ID

### Flow Without Template
```
Create software release for https://gitlab.../merge_requests/43
Product: MercuryFx
Customer: Thomas Cook
Reviewer: Jitesh Suthar
Redmine ID: 124323
```

### Customer Auto-Detection
Customer is auto-detected from GitLab project path:
- `mercuryfx/kotak/*` or `mercuryfx/ing/*` → Kotak Mahindra Bank
- `mercuryfx/tcil/*` or `mercuryfx/astra/*` → Thomas Cook
- `mercuryfx/mudra2/*` or `mercuryfx/*/intranet/*` → Thomas Cook
- `mercuryfx/sbi/*` → State Bank of India
- `mercuryfx/hdfc/*` → HDFC Bank
- etc.

### Redmine Integration
To enable auto-fetching of Redmine ticket titles, add to your `.env`:
```
REDMINE_URL=https://support.credenceanalytics.com
REDMINE_API_KEY=your-api-key
```

Get your API key from Redmine: My Account → API access key
