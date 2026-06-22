/**
 * Tool definitions index - aggregates all tool definitions
 * @module definitions
 *
 * To add a new tool:
 * 1. Create a new file in definitions/ (e.g., expense-tools.js)
 * 2. Export your tools array
 * 3. Import and spread it here
 */

import { coreTools } from './core-tools.js';
import { timesheetTools } from './timesheet-tools.js';
import { leaveTools } from './leave-tools.js';
import { softwareReleaseTools } from './software-release-tools.js';
import { taskTools } from './task-tools.js';
import { taigaTools } from './taiga-tools.js';

// Combine all tool definitions
export const TOOLS = [
  ...coreTools,
  ...timesheetTools,
  ...leaveTools,
  ...softwareReleaseTools,
  ...taskTools,
  ...taigaTools
];

// Export individual modules for selective use
export { coreTools, timesheetTools, leaveTools, softwareReleaseTools, taskTools, taigaTools };

export default TOOLS;
