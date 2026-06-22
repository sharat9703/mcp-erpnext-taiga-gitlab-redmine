/**
 * Taiga tools - business logic
 * @module tools/taiga
 *
 * Validate Taiga user stories, create tasks under a user story, and export
 * tasks to ERPNext "Developer Task" documents. Ported from the taskbridge
 * project's /api/validate-user-story, /api/create-taiga-tasks and
 * /api/devtask routes.
 */

import {
  parseUserStorySlugRef,
  normalizeDueDate,
  toYMD,
  normalizeComplexity,
  taigaTypeToErpCategory
} from '../taiga-client.js';

/**
 * Validate a Taiga User Story by URL.
 * @param {Object} taiga - TaigaClient instance
 * @param {Object} params - { user_story_url }
 * @returns {Object} { user_story_id, title, project, slug, ref }
 */
export async function validateUserStory(taiga, params) {
  const { user_story_url } = params;
  if (!user_story_url) throw new Error('user_story_url is required');

  let slug;
  let ref;
  try {
    ({ slug, ref } = parseUserStorySlugRef(String(user_story_url)));
  } catch (_e) {
    throw new Error('Invalid Taiga User Story URL. Expected .../project/<slug>/us/<ref>');
  }

  await taiga.authenticate();
  const story = await taiga.getUserStoryByRef(slug, ref);

  return {
    user_story_id: story.id,
    title: story.subject || 'Untitled User Story',
    project: story.project,
    slug,
    ref
  };
}

/**
 * Create a new User Story in a Taiga project.
 * @param {Object} taiga - TaigaClient instance
 * @param {Object} params - { project_slug, subject, description, status, assignee, tags, milestone }
 * @returns {Object} { ok, user_story_id, ref, subject, project, url }
 */
export async function createUserStory(taiga, params) {
  const { project_slug, subject, description, status, assignee, tags, milestone } = params;

  if (!project_slug) throw new Error('project_slug is required');
  if (!subject || !String(subject).trim()) throw new Error('subject is required');

  await taiga.authenticate();

  const project = await taiga.getProjectBySlug(project_slug);
  if (!project) throw new Error(`Project not found for slug "${project_slug}"`);

  // Resolve status name -> id (best effort; Taiga applies its default otherwise).
  let statusId = null;
  if (status && String(status).trim()) {
    try {
      const statuses = await taiga.getUserStoryStatuses(project.id);
      const wanted = String(status).toLowerCase().trim();
      const match = (statuses || []).find(
        (s) => String(s.name || '').toLowerCase().trim() === wanted
      );
      if (match) statusId = match.id;
    } catch (_e) {
      // Ignore status lookup failures and fall back to the default.
    }
  }

  // Resolve assignee from project members (best effort).
  let assignedUserId = null;
  if (assignee && String(assignee).trim()) {
    const member = await taiga.findProjectMemberByName(project.id, String(assignee).trim());
    if (member) assignedUserId = member.id;
  }

  const payload = {
    project: project.id,
    subject: String(subject).trim(),
    description: description ? String(description).trim() : '',
    assigned_to: assignedUserId,
    tags: Array.isArray(tags) && tags.length ? tags : undefined,
    milestone: milestone != null ? Number(milestone) : null
  };
  if (statusId != null) payload.status = statusId;

  const story = await taiga.createUserStory(payload);

  const slug = story.project_extra_info?.slug || project_slug;
  const url = story.ref ? buildUserStoryUrl(taiga, slug, story.ref) : null;

  return {
    ok: true,
    user_story_id: story.id,
    ref: story.ref,
    subject: story.subject,
    project: story.project,
    url
  };
}

/**
 * Build a web URL for a user story from the Taiga API base.
 * Converts .../api/v1 -> the site root and appends the project/us path.
 */
function buildUserStoryUrl(taiga, slug, ref) {
  const apiBase = taiga?.client?.defaults?.baseURL || '';
  const webBase = apiBase.replace(/\/api\/v\d+\/?$/, '').replace(/\/$/, '');
  if (!webBase || !slug) return null;
  return `${webBase}/project/${slug}/us/${ref}`;
}

/**
 * Create tasks in Taiga under a user story.
 * @param {Object} taiga - TaigaClient instance
 * @param {Object} params - { user_story_id, project_slug, tasks[] }
 * @returns {Object} { ok, created, failed[], tasks[] }
 */
export async function createTaigaTasks(taiga, params) {
  const { user_story_id, project_slug, tasks, status } = params;

  if (!user_story_id) throw new Error('user_story_id is required');
  if (!project_slug) throw new Error('project_slug is required');
  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw new Error('tasks array is required and must not be empty');
  }

  await taiga.authenticate();

  const userStory = await taiga.getUserStory(Number(user_story_id));
  if (!userStory) throw new Error('User Story not found');

  const project = await taiga.getProjectBySlug(project_slug);
  if (!project) throw new Error(`Project not found for slug "${project_slug}"`);

  const taskStatuses = await taiga.getTaskStatuses(project.id);
  const defaultStatusId =
    taskStatuses && taskStatuses[0] && taskStatuses[0].id ? taskStatuses[0].id : 1;

  // Resolve an explicit status name (e.g. "Closed") to its id, else default.
  let statusId = defaultStatusId;
  if (status && String(status).trim()) {
    const wanted = String(status).toLowerCase().trim();
    const match = (taskStatuses || []).find(
      (s) => String(s.name || '').toLowerCase().trim() === wanted
    );
    if (match) statusId = match.id;
  }

  // Resolve custom attribute ids for complexity / task_type (best effort).
  let complexityAttrId = null;
  let taskTypeAttrId = null;
  try {
    const attrDefs = await taiga.getTaskAttributeDefs(project.id);
    for (const def of attrDefs || []) {
      if (def && typeof def.id === 'number' && typeof def.name === 'string') {
        const nameLower = def.name.toLowerCase().trim();
        if (nameLower === 'complexity' || nameLower === 'story points' || nameLower === 'points') {
          complexityAttrId = String(def.id);
        } else if (['task_type', 'task type', 'type', 'tasktype'].includes(nameLower)) {
          taskTypeAttrId = String(def.id);
        }
      }
    }
  } catch (_e) {
    // Custom attributes are optional; ignore lookup failures.
  }

  const userCache = new Map();
  let created = 0;
  const failed = [];
  const createdTasks = [];

  for (const taskData of tasks) {
    try {
      const normalizedDue = normalizeDueDate(taskData.due_date);

      // Resolve assignee from project members (cached).
      let assignedUserId = null;
      const assigneeName = (taskData.assignee || '').trim();
      if (assigneeName) {
        if (!userCache.has(assigneeName)) {
          userCache.set(assigneeName, await taiga.findProjectMemberByName(project.id, assigneeName));
        }
        const assignedUser = userCache.get(assigneeName);
        if (assignedUser) assignedUserId = assignedUser.id;
      }

      const payload = {
        subject: String(taskData.task || '').trim(),
        description: (taskData.description || '').trim(),
        user_story: Number(user_story_id),
        project: project.id,
        milestone: userStory.milestone || null,
        status: statusId,
        assigned_to: assignedUserId,
        due_date: normalizedDue
      };

      const createdTask = await taiga.createTask(payload);
      created++;

      // Set custom attribute values after creation (best effort).
      const customAttrs = {};
      if (complexityAttrId && (taskData.complexity || '').trim()) {
        customAttrs[complexityAttrId] = taskData.complexity.trim();
      }
      if (taskTypeAttrId && (taskData.task_type || '').trim()) {
        customAttrs[taskTypeAttrId] = taskData.task_type.trim();
      }
      if (Object.keys(customAttrs).length > 0 && createdTask.id) {
        try {
          await taiga.setTaskCustomAttributeValues(createdTask.id, customAttrs);
        } catch (_attrErr) {
          // Don't fail task creation if attributes can't be set.
        }
      }

      createdTasks.push({
        rowIndex: taskData.rowIndex,
        taiga_id: String(createdTask.ref ?? createdTask.id),
        id: createdTask.id,
        ref: createdTask.ref,
        subject: payload.subject
      });
    } catch (err) {
      failed.push({
        rowIndex: taskData.rowIndex,
        task: taskData.task,
        due_raw: taskData.due_date,
        error: String(err?.message || err)
      });
    }
  }

  return {
    ok: created > 0,
    created,
    failed,
    tasks: createdTasks,
    error: created === 0 && failed.length > 0 ? failed[0]?.error : undefined
  };
}

/**
 * Export tasks to ERPNext as "Developer Task" documents.
 * @param {Object} erpnext - ERPNextClient instance
 * @param {Object} params - { tasks[] }
 * @returns {Object} { ok, created, created_ids, skipped[], failed[] }
 */
export async function exportTasksToErp(erpnext, params) {
  const { tasks } = params;
  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw new Error('tasks array is required and must not be empty');
  }

  await erpnext.ensureAuthenticated();

  const employeeCache = new Map();
  const alreadyCreated = new Set();
  const created_ids = [];
  const skipped = [];
  const failed = [];

  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    const taigaId = t.taiga_id != null ? String(t.taiga_id) : '';

    if (taigaId && alreadyCreated.has(taigaId)) {
      skipped.push({ taiga_id: taigaId, reason: 'duplicate_in_batch' });
      continue;
    }

    try {
      // Resolve developer: honor explicit value, else look up by name (cached).
      let developer = t.developer ? String(t.developer) : null;
      if (!developer && t.assigned_to_name) {
        const key = String(t.assigned_to_name).trim();
        if (key) {
          if (!employeeCache.has(key)) {
            employeeCache.set(key, await erpnext.findEmployeeCodeByName(key));
          }
          developer = employeeCache.get(key);
        }
      }

      const category = t.category
        ? String(t.category)
        : taigaTypeToErpCategory(t.task_type, t.subject, t.description);

      const payload = {
        task: String(t.subject || ''),
        developer,
        target_date: toYMD(t.due_date),
        completed_date: toYMD(t.completed_date || null),
        taiga_id: taigaId || null,
        product: t.product || null,
        reviewer: t.reviewer || null,
        assigner: t.assigner || null,
        details: [
          {
            category,
            type: t.type ? String(t.type) : 'New',
            complexity: normalizeComplexity(t.complexity),
            description: String(t.description || '')
          }
        ]
      };
      if (t.status) payload.status = String(t.status);

      await erpnext.createDeveloperTaskDoc(payload);
      if (taigaId) alreadyCreated.add(taigaId);
      created_ids.push(taigaId || payload.task);
    } catch (err) {
      failed.push({
        index: i,
        taiga_id: taigaId,
        subject: String(t.subject || ''),
        error: String(err?.message || err)
      });
    }
  }

  return {
    ok: failed.length === 0,
    created: created_ids.length,
    created_ids,
    skipped,
    failed
  };
}

export default {
  validateUserStory,
  createUserStory,
  createTaigaTasks,
  exportTasksToErp
};
