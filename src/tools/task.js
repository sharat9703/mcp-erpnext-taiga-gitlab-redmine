/**
 * Task creation tools for ERPNext MCP Server
 * GitLab merge request analysis and intelligent task creation
 * @module tools/task
 */

/**
 * Group commits by conventional commit patterns
 * @param {Array} commits - Array of commit objects
 * @returns {Object} Grouped commits by type
 */
function groupCommitsByPatterns(commits) {
  const groups = {
    features: [],
    fixes: [],
    refactors: [],
    docs: [],
    tests: [],
    other: []
  };

  for (const commit of commits) {
    const subject = (commit.subject || '').toLowerCase();

    if (/^feat:|^feature:/i.test(subject)) {
      groups.features.push(commit);
    } else if (/^fix:|^bugfix:/i.test(subject)) {
      groups.fixes.push(commit);
    } else if (/^refactor:/i.test(subject)) {
      groups.refactors.push(commit);
    } else if (/^docs?:/i.test(subject)) {
      groups.docs.push(commit);
    } else if (/^test:/i.test(subject)) {
      groups.tests.push(commit);
    } else {
      groups.other.push(commit);
    }
  }

  return groups;
}

/**
 * Generate a title for a group of commits
 * @param {string} type - Group type (features, fixes, etc.)
 * @param {Array} commits - Commits in the group
 * @returns {string} Generated title
 */
function generateGroupTitle(type, commits) {
  const typeLabels = {
    features: 'Feature Implementation',
    fixes: 'Bug Fixes',
    refactors: 'Code Refactoring',
    docs: 'Documentation Updates',
    tests: 'Test Coverage',
    other: 'Development Work'
  };

  const label = typeLabels[type] || 'Development Work';

  // Try to find a common theme in commit messages
  if (commits.length === 1) {
    return commits[0].subject;
  }

  // Extract common words from commit subjects (simplified)
  const words = commits.map(c => c.subject.split(/\s+/)).flat();
  const wordCounts = {};
  for (const word of words) {
    if (word.length > 3 && !/^(feat|fix|refactor|docs|test|the|and|for|with|from|to):/i.test(word)) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
  }

  const commonWord = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0];

  if (commonWord && wordCounts[commonWord] > commits.length / 2) {
    return `${label}: ${commonWord}`;
  }

  return `${label} (${commits.length} commits)`;
}

/**
 * Analyze what changed in a function modification and generate human-readable description
 * @param {Array} addedLines - Lines that were added (with + prefix removed)
 * @param {Array} removedLines - Lines that were removed (with - prefix removed)
 * @returns {string} Human-readable description of the change
 */
function analyzeModificationChange(addedLines, removedLines) {
  const added = addedLines.join('\n');
  const removed = removedLines.join('\n');
  const addedLower = added.toLowerCase();
  const removedLower = removed.toLowerCase();

  // Analyze what was actually done
  const descriptions = [];

  // Check for database operations
  if (addedLower.includes('select') && (addedLower.includes('from') || addedLower.includes('where'))) {
    // Extract table name if possible
    const tableMatch = added.match(/FROM\s+(\w+)/i);
    const tableName = tableMatch ? tableMatch[1] : 'database';

    if (addedLower.includes('where') && addedLower.includes('=')) {
      descriptions.push(`Added database check to query ${tableName} table for existing records`);
    } else {
      descriptions.push(`Added database query to fetch data from ${tableName}`);
    }
  }

  // Check for validation/existence checks
  if (addedLower.includes('if') && addedLower.includes('length') && addedLower.includes('return')) {
    descriptions.push('Added validation to check if record already exists and return early if found');
  }

  // Check for error handling
  if (addedLower.includes('try') && addedLower.includes('catch')) {
    descriptions.push('Added error handling to catch and manage exceptions');
  }

  // Check for status/flag returns
  if (addedLower.includes('return') && addedLower.includes('status')) {
    const statusMatch = added.match(/['"]([A-Z_]+)['"]/);
    if (statusMatch) {
      descriptions.push(`Returns "${statusMatch[1]}" status when condition is met`);
    } else {
      descriptions.push('Updated return status based on conditions');
    }
  }

  // Check for API calls
  if (addedLower.includes('await') && (addedLower.includes('fetch') || addedLower.includes('post') || addedLower.includes('get'))) {
    descriptions.push('Added API call to external service');
  }

  // Check for data processing
  if (addedLower.includes('map') || addedLower.includes('filter') || addedLower.includes('reduce')) {
    descriptions.push('Added data processing and transformation logic');
  }

  // Check for logging
  if (addedLower.includes('console.log') || addedLower.includes('logger')) {
    descriptions.push('Added logging for debugging');
  }

  // Generic detection based on size
  if (descriptions.length === 0) {
    if (addedLines.length > removedLines.length * 2) {
      descriptions.push('Extended the function with additional logic and checks');
    } else if (removedLines.length > addedLines.length * 2) {
      descriptions.push('Simplified and refactored the code');
    } else if (addedLines.length < 3 && removedLines.length < 3) {
      descriptions.push('Made a minor code adjustment');
    } else {
      descriptions.push('Updated the logic and implementation');
    }
  }

  return descriptions.join('. ');
}

/**
 * Generate human-readable description from change analysis
 * @param {Object} change - Change object with function, description, etc.
 * @param {Array} commits - Related commits
 * @returns {string} Human-readable description
 */
function generateHumanReadableDescription(change, commits) {
  // Try to extract description from commit messages first (most human-readable)
  const meaningfulCommits = commits.filter(c =>
    !c.subject.toLowerCase().startsWith('merge ') &&
    !c.subject.toLowerCase().startsWith('revert ')
  );

  if (meaningfulCommits.length > 0 && meaningfulCommits[0].message) {
    // Extract bullet points from commit message if available
    const commitLines = meaningfulCommits[0].message.split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('-'))
      .map(line => line.substring(1).trim())  // Remove the dash
      .slice(0, 5);  // Limit to 5 points

    if (commitLines.length > 0) {
      // Use commit message as the primary description
      return commitLines.join('\n');
    }

    // If no bullet points, use the commit subject and body
    const commitSubject = meaningfulCommits[0].subject;
    const commitBody = meaningfulCommits[0].message.split('\n\n')[1];
    if (commitBody && commitBody.length > 10) {
      return `${commitSubject}\n\n${commitBody}`;
    }

    return commitSubject;
  }

  // Fallback to code analysis if no commit message
  const parts = [];

  if (change.changeType === 'added') {
    parts.push('Added new code');
  } else if (change.changeType === 'modified') {
    parts.push('Modified existing code');
  } else {
    parts.push('Changed code');
  }

  if (change.description && change.description !== 'New function') {
    parts.push(': ' + change.description);
  }

  parts.push(`\nFile: ${change.filename.split('/').slice(-2).join('/')}`);

  return parts.join('');
}

/**
 * Extract function changes from diff (both new and modified)
 * @param {string} diff - Git diff string
 * @param {string} filename - File name for context
 * @returns {Array} Array of function changes
 */
function extractFunctionChanges(diff, filename) {
  if (!diff) return [];

  const changes = [];
  const lines = diff.split('\n');
  let currentContext = null;
  let addedLines = [];
  let removedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect function context from diff headers (@@)
    const contextMatch = line.match(/@@.*@@\s*(.+)/);
    if (contextMatch) {
      // Save previous context if exists
      if (currentContext && (addedLines.length > 0 || removedLines.length > 0)) {
        const changeType = removedLines.length === 0 ? 'added' : addedLines.length === 0 ? 'removed' : 'modified';
        const description = changeType === 'modified'
          ? analyzeModificationChange(addedLines, removedLines)
          : changeType === 'added' ? 'New function' : 'Function removed';

        changes.push({
          function: currentContext,
          filename,
          changeType,
          linesAdded: addedLines.length,
          linesRemoved: removedLines.length,
          description
        });
      }

      currentContext = contextMatch[1].trim();
      addedLines = [];
      removedLines = [];
      continue;
    }

    // Collect added/removed lines
    if (line.startsWith('+') && !line.startsWith('+++')) {
      addedLines.push(line.substring(1));
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      removedLines.push(line.substring(1));
    }

    // Detect function definitions for better context (only on added/removed lines)
    const funcMatch = line.match(/^[+-]\s*(export\s+)?(async\s+)?(function\s+(\w+)|const\s+(\w+)\s*=\s*(async\s+)?(function|\([^)]*\)\s*=>)|class\s+(\w+))/);
    if (funcMatch) {
      const funcName = funcMatch[4] || funcMatch[5] || funcMatch[8];
      if (funcName && funcName.length > 2) {  // Ignore very short names like variables
        currentContext = funcName;
      }
    }
  }

  // Save last context
  if (currentContext && (addedLines.length > 0 || removedLines.length > 0)) {
    const changeType = removedLines.length === 0 ? 'added' : addedLines.length === 0 ? 'removed' : 'modified';
    const description = changeType === 'modified'
      ? analyzeModificationChange(addedLines, removedLines)
      : changeType === 'added' ? 'New function' : 'Function removed';

    changes.push({
      function: currentContext,
      filename,
      changeType,
      linesAdded: addedLines.length,
      linesRemoved: removedLines.length,
      description
    });
  }

  return changes;
}

/**
 * Generate a description for a group of commits
 * @param {Array} commits - Commits in the group
 * @returns {string} Generated description
 */
function generateGroupDescription(commits) {
  const lines = ['Completed development work:'];

  for (const commit of commits.slice(0, 10)) {  // Limit to first 10
    lines.push(`- ${commit.subject}`);
  }

  if (commits.length > 10) {
    lines.push(`... and ${commits.length - 10} more commits`);
  }

  return lines.join('\n');
}

/**
 * Generate task suggestions from MR data
 * @param {Object} mrDetails - MR details
 * @param {Array} commits - All commits
 * @param {Array} redmineIssues - Redmine issues extracted
 * @param {Object} groupedCommits - Grouped commits
 * @param {boolean} includeRedmine - Whether to include Redmine tasks
 * @param {Array} functionChanges - Function-level changes from diff analysis
 * @returns {Array} Suggested tasks
 */
function generateTaskSuggestions(mrDetails, commits, redmineIssues, groupedCommits, includeRedmine = true, functionChanges = []) {
  const tasks = [];

  // 1. Tasks from Redmine issues
  if (includeRedmine && redmineIssues && redmineIssues.length > 0) {
    for (const issue of redmineIssues) {
      const title = issue.title || `Redmine #${issue.id}`;
      const description = issue.title
        ? `Redmine Issue: ${issue.url}\n\n${issue.title}`
        : `Redmine Issue: ${issue.url}`;

      tasks.push({
        title: title.slice(0, 140),  // Enforce 140 char limit
        description: description,
        commits: [],
        source: 'redmine',
        redmine_id: issue.id
      });
    }
  }

  // 2. If we have function-level changes, create intelligent tasks
  // IMPORTANT: Create ONE task per function change (not grouped)
  if (functionChanges && functionChanges.length > 0) {
    for (const change of functionChanges) {
      const filename = change.filename.split('/').pop();
      const functionName = change.function;

      // Generate human-readable description from the change
      const humanDescription = generateHumanReadableDescription(change, commits);

      // Create descriptive title based on change type
      let title;
      if (change.changeType === 'added') {
        title = `Add ${functionName} in ${filename}`;
      } else if (change.changeType === 'modified') {
        title = `Update ${functionName} - ${change.description.split(';')[0]}`;
      } else {
        title = `${functionName} in ${filename}`;
      }

      tasks.push({
        title: title.slice(0, 140),
        description: humanDescription,
        commits: commits.map(c => c.hash),
        source: 'function_analysis',
        filename: change.filename,
        changeType: change.changeType
      });
    }
  } else {
    // Fallback to commit-based tasks if no function analysis available
    for (const [type, commitGroup] of Object.entries(groupedCommits)) {
      if (commitGroup.length === 0) continue;

      if (commitGroup.length === 1) {
        // Single commit = single task
        const commit = commitGroup[0];
        tasks.push({
          title: commit.subject.slice(0, 140),
          description: commit.message || commit.subject,
          commits: [commit.hash],
          source: 'commits',
          commit_type: type
        });
      } else {
        // Multiple commits = group into one task
        const title = generateGroupTitle(type, commitGroup);
        const description = generateGroupDescription(commitGroup);
        tasks.push({
          title: title.slice(0, 140),
          description: description,
          commits: commitGroup.map(c => c.hash),
          source: 'commits',
          commit_type: type
        });
      }
    }
  }

  // 3. If very few commits and no tasks yet, create one task from MR title
  if (commits.length <= 3 && tasks.length === 0 && mrDetails) {
    tasks.push({
      title: (mrDetails.title || '').slice(0, 140),
      description: mrDetails.description || mrDetails.title || '',
      commits: commits.map(c => c.hash),
      source: 'mr_title'
    });
  }

  return tasks;
}

/**
 * Analyze a single merge request
 * @param {Object} gitlabClient - GitLab client instance
 * @param {string} mrUrl - MR URL
 * @param {Object} options - Analysis options
 * @returns {Object} Analysis results
 */
async function analyzeSingleMR(gitlabClient, mrUrl, options = {}) {
  const { includeRedmine = true, groupBy = 'auto' } = options;

  // Fetch MR details
  const mrResult = await gitlabClient.getMergeRequest(mrUrl);
  if (!mrResult.success) {
    throw new Error(`Failed to fetch MR: ${mrResult.error}`);
  }

  const mrDetails = mrResult.data;

  // Fetch MR commits
  const commitsResult = await gitlabClient.getMergeRequestCommits(mrUrl);
  if (!commitsResult.success) {
    throw new Error(`Failed to fetch commits: ${commitsResult.error}`);
  }

  const commits = commitsResult.data;

  // Fetch MR changes (diff) for intelligent analysis
  const changesResult = await gitlabClient.getMergeRequestChanges(mrUrl);
  let functionChanges = [];

  if (changesResult.success && changesResult.data) {
    // Extract function-level changes from each file
    for (const fileChange of changesResult.data) {
      const fileFunctionChanges = extractFunctionChanges(fileChange.diff, fileChange.new_path);
      functionChanges.push(...fileFunctionChanges);
    }
  }

  // Extract Redmine issues from description
  const redmineIssues = includeRedmine
    ? gitlabClient.extractRedmineIds(mrDetails.description || '')
    : [];

  // Group commits
  const groupedCommits = groupCommitsByPatterns(commits);

  // Generate task suggestions (enhanced with function-level analysis)
  const suggestedTasks = generateTaskSuggestions(
    mrDetails,
    commits,
    redmineIssues,
    groupedCommits,
    includeRedmine,
    functionChanges
  );

  return {
    mr: {
      title: mrDetails.title,
      iid: mrDetails.id,
      web_url: mrDetails.webUrl,
      author: mrDetails.author,
      source_branch: mrDetails.sourceBranch,
      target_branch: mrDetails.targetBranch
    },
    commits: commits,
    redmineIssues: redmineIssues,
    suggestedTasks: suggestedTasks,
    statistics: {
      totalCommits: commits.length,
      tasksIdentified: suggestedTasks.length,
      redmineIssues: redmineIssues.length
    }
  };
}

/**
 * List merge requests from a project
 * @param {Object} gitlabClient - GitLab client instance
 * @param {Object} params - Parameters
 * @returns {Object} List of merge requests
 */
export async function listMergeRequests(gitlabClient, params) {
  const {
    project_path,
    state = 'merged',
    author_username,
    target_branch,
    created_after,
    created_before,
    sort = 'created_date',
    limit = 40
  } = params;

  if (!project_path) {
    throw new Error('project_path is required');
  }

  const filters = {
    state,
    author_username,
    target_branch,
    created_after,
    created_before,
    sort,
    per_page: limit
  };

  const result = await gitlabClient.listMergeRequests(project_path, filters);

  if (!result.success) {
    throw new Error(`Failed to list merge requests: ${result.error}`);
  }

  return {
    project: project_path,
    total: result.data.length,
    merge_requests: result.data
  };
}

/**
 * Analyze merge request(s) and generate task breakdown
 * @param {Object} gitlabClient - GitLab client instance
 * @param {Object} params - Parameters
 * @returns {Object} Analysis results
 */
export async function analyzeMergeRequest(gitlabClient, params) {
  const {
    mr_url,
    mr_urls,
    project,
    include_redmine_tasks = true,
    group_by = 'auto'
  } = params;

  // Determine which MR URLs to analyze
  const mrUrls = mr_urls || (mr_url ? [mr_url] : []);

  if (mrUrls.length === 0) {
    throw new Error('Either mr_url or mr_urls is required');
  }

  const options = {
    includeRedmine: include_redmine_tasks,
    groupBy: group_by
  };

  // Analyze each MR
  const analyses = [];
  for (const url of mrUrls) {
    try {
      const analysis = await analyzeSingleMR(gitlabClient, url, options);
      analyses.push(analysis);
    } catch (error) {
      // Include error in results but continue
      analyses.push({
        error: error.message,
        mr_url: url
      });
    }
  }

  // If single MR, return simple format
  if (analyses.length === 1 && !analyses[0].error) {
    return analyses[0];
  }

  // For multiple MRs, consolidate results
  const allCommits = [];
  const allRedmineIssues = [];
  const allSuggestedTasks = [];
  const mrSummaries = [];

  for (const analysis of analyses) {
    if (analysis.error) {
      mrSummaries.push({
        error: analysis.error,
        mr_url: analysis.mr_url
      });
      continue;
    }

    mrSummaries.push({
      title: analysis.mr.title,
      iid: analysis.mr.iid,
      web_url: analysis.mr.web_url,
      commits_count: analysis.commits.length,
      tasks_count: analysis.suggestedTasks.length
    });

    allCommits.push(...analysis.commits);
    allRedmineIssues.push(...analysis.redmineIssues);
    allSuggestedTasks.push(...analysis.suggestedTasks);
  }

  // Deduplicate Redmine issues
  const uniqueRedmineIssues = [];
  const seenRedmineIds = new Set();
  for (const issue of allRedmineIssues) {
    if (!seenRedmineIds.has(issue.id)) {
      seenRedmineIds.add(issue.id);
      uniqueRedmineIssues.push(issue);
    }
  }

  return {
    merge_requests: mrSummaries,
    commits: allCommits,
    redmineIssues: uniqueRedmineIssues,
    suggestedTasks: allSuggestedTasks,
    statistics: {
      totalMRs: mrUrls.length,
      totalCommits: allCommits.length,
      tasksIdentified: allSuggestedTasks.length,
      redmineIssues: uniqueRedmineIssues.length
    }
  };
}

/**
 * Create tasks in ERPNext from analysis
 * @param {Object} erpnextClient - ERPNext client instance
 * @param {Object} params - Parameters
 * @returns {Object} Creation results
 */
export async function createTasksFromAnalysis(erpnextClient, params) {
  const {
    tasks,
    project,
    status = 'Completed'
  } = params;

  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    throw new Error('tasks array is required and must not be empty');
  }

  // Prepare task data for ERPNext
  const taskDataArray = tasks.map(task => ({
    subject: task.title || 'Untitled Task',
    description: task.description || '',
    project: project || null,
    status: status,
    priority: 'Medium'
  }));

  // Create tasks in bulk
  const result = await erpnextClient.createTasksBulk(taskDataArray);

  return result;
}

export default {
  listMergeRequests,
  analyzeMergeRequest,
  createTasksFromAnalysis
};
