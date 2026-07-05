// server/src/routes/tasks.js
const express = require('express');
const Task = require('../models/Task');
const Project = require('../models/Project');
const ProjectTaskLink = require('../models/ProjectTaskLink');
const TaskRelation = require('../models/TaskRelation');
const { requireAuth } = require('../middleware/auth');
const { emitNotification } = require('../events');
const { logActivity } = require('../utils/activity');
const { canEditTask, canViewProject } = require('../utils/permissions');

const router = express.Router();


async function hasCircularDependency(taskId, newBlockedById){
  const visited = new Set();

  async function dfs(currentId) {
    if (visited.has(currentId)) return false;
    visited.add(currentId);

    // If we reach the original task, we have a cycle
    if (currentId.toString() === taskId.toString()) {
      return true;
    }

    const currentTask = await Task.findById(currentId).select('blockedBy');
    if (!currentTask) return false;

    for (const blocker of currentTask.blockedBy) {
      const result = await dfs(blocker.toString());
      if (result) return true;
    }

    return false;
  }

  return dfs(newBlockedById.toString());
}

//  list tasks 
router.get('/', requireAuth, async (req, res) => {
  try {
    const { project, status, assignee } = req.query;

    if (project) {
      const projectDoc = await Project.findById(project);
      if (!projectDoc) {
        return res.status(400).json({ message: 'Invalid project' });
      }
      if (!canViewProject(projectDoc, req.user)) {
        return res.status(403).json({ message: 'Not allowed to view tasks for this project' });
      }
    }

    const filter = {};
    if (project) filter.project = project;
    if (status) filter.status = status;
    if (assignee) filter.assignee = assignee;
     
    //Direct tasks
    const directTasks = await Task.find(filter)
      .populate('assignee', 'name email')
      .populate('project', 'name');

    let allTasks = directTasks;

    if (project) {
      const links = await ProjectTaskLink.find({ project }).populate({
        path: 'task',
        populate: [
          { path: 'assignee', select: 'name email' },
          { path: 'project', select: 'name' },
        ],
      });

      const linkedTasks = links.map((l) => l.task);

      // Merge direct + linked, avoiding duplicates by _id
      const seen = new Set(directTasks.map((t) => t._id.toString()));
      linkedTasks.forEach((t) => {
        if (!seen.has(t._id.toString())) {
          allTasks.push(t);
          seen.add(t._id.toString());
        }
      });
  
    }


   allTasks.sort((a, b) => {
      const da = a.dueDate || a.createdAt;
      const db = b.dueDate || b.createdAt;
      return da - db;
    });

    res.json(allTasks);
  } catch (err) {
    console.error('List tasks error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

//  create task
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      title,
      description,
      status,
      priority,
      assignee,
      dueDate,
      project,
      attachments,
      comments,
      mentions,
      parent,
    } = req.body;

    if (!title || !project) {
      return res.status(400).json({ message: 'Title and project are required' });
    }

    //  ensure project exists
    const projectDoc = await Project.findById(project);
    if (!projectDoc) {
      return res.status(400).json({ message: 'Invalid project' });
    }

    if (!canEditTask(projectDoc, req.user)) {
      return res.status(403).json({ message: 'Not allowed to create tasks in this project' });
    }

    const task = await Task.create({
      title,
      description,
      status: status || 'todo',
      priority: priority || 'medium',
      assignee,
      dueDate,
      project,
      parent: parent || undefined,
      attachments: attachments || [],
      comments: comments || [],
      mentions: mentions || [],
    });

    await logActivity({
  entityType: 'task',
  entityId: task._id,
  actor: req.user.userId,
  action: 'TASK_CREATED',
  payload: {
    title: task.title,
    status: task.status,
    assignee: task.assignee,
    project: task.project,
  },
});

    let overloadWarning = null;
    if (task.assignee) {
      const openTaskCount = await Task.countDocuments({
        assignee: task.assignee,
        status: { $ne: 'done' },
      });
      const OVERLOAD_THRESHOLD = 8;
      if (openTaskCount > OVERLOAD_THRESHOLD) {
        overloadWarning = {
          type: 'ASSIGNEE_OVERLOADED',
          assignee: task.assignee,
          openTaskCount,
          threshold: OVERLOAD_THRESHOLD,
        };
      }

      emitNotification(
        task.assignee,
        'task_assignment',
        `You have been assigned to task "${task.title}"`,
        task._id.toString()
      );
    }

    res.status(201).json({ task, warning: overloadWarning });
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

//  get single task
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id)
      .populate('assignee', 'name email')
      .populate('project', 'name')
      .populate('blockedBy', 'title status')
      .populate('blocks', 'title status')
      .populate('mentions', 'name email')
      .populate('comments.author', 'name email');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const taskProject = await Project.findById(task.project);
    if (!taskProject || !canViewProject(taskProject, req.user)) {
      return res.status(403).json({ message: 'Not allowed to view this task' });
    }

    res.json(task);
  } catch (err) {
    console.error('Get task error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

//  update task
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      status,
      priority,
      assignee,
      dueDate,
      attachments,
      comments,
      mentions,
      parent,
    } = req.body;

    const task = await Task.findById(id).populate('blockedBy', 'status');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const taskProject = await Project.findById(task.project);
    if (!taskProject || !canEditTask(taskProject, req.user)) {
      return res.status(403).json({ message: 'Not allowed to edit this task' });
    }

    const previousStatus = task.status;
    const previousAssignee = task.assignee ? task.assignee.toString() : null;
    const previousBlockedBy = task.blockedBy.map((d) => d._id.toString());

    if (status && status === 'done') {
      const hasOpenBlocker = task.blockedBy.some(
        (blocker) => blocker.status !== 'done'
      );

      if (hasOpenBlocker) {
        return res.status(400).json({
          message: 'Illegal status transition',
          reason: 'OPEN_BLOCKERS',
        });
      }

      const openSubtaskCount = await Task.countDocuments({
        parent: task._id,
        status: { $ne: 'done' },
      });
      if (openSubtaskCount > 0) {
        return res.status(400).json({
          message: 'Illegal status transition',
          reason: 'OPEN_SUBTASKS',
          openSubtaskCount,
        });
      }
    }

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (assignee !== undefined) task.assignee = assignee;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (attachments !== undefined) task.attachments = attachments;
    if (comments !== undefined) task.comments = comments;
    if (mentions !== undefined) task.mentions = mentions;
    if (parent !== undefined) task.parent = parent;

    await task.save();

    // Status change
if (status !== undefined && status !== previousStatus) {
  await logActivity({
    entityType: 'task',
    entityId: task._id,
    actor: req.user.userId,
    action: 'TASK_STATUS_CHANGED',
    payload: {
      from: previousStatus,
      to: task.status,
    },
  });
}

// Assignee change
const newAssignee = task.assignee ? task.assignee.toString() : null;
if (newAssignee !== previousAssignee) {
  await logActivity({
    entityType: 'task',
    entityId: task._id,
    actor: req.user.userId,
    action: 'TASK_REASSIGNED',
    payload: {
      from: previousAssignee,
      to: newAssignee,
    },
  });
}

// Dependency changes
const newBlockedBy = task.blockedBy.map((d) => d._id.toString());
if (JSON.stringify(previousBlockedBy) !== JSON.stringify(newBlockedBy)) {
  await logActivity({
    entityType: 'task',
    entityId: task._id,
    actor: req.user.userId,
    action: 'TASK_DEPENDENCIES_UPDATED',
    payload: {
      from: previousBlockedBy,
      to: newBlockedBy,
    },
  });
}

    await task.populate('assignee', 'name email');

    // Status change notification
  if (status !== undefined && status !== previousStatus) {
    if (task.assignee) {
      emitNotification(
        task.assignee._id,
        'task_status_change',
        `Task "${task.title}" changed to status "${task.status}"`,
        task._id.toString()
      );
    }
  }

  // Assignment change notification
  const newAssigneeId = task.assignee ? task.assignee._id.toString() : null;
  if (newAssigneeId && newAssigneeId !== previousAssignee) {
    emitNotification(
      task.assignee._id,
      'task_assignment',
      `You have been assigned to task "${task.title}"`,
      task._id.toString()
    );
  }

    res.json(task);
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// delete task
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const taskProject = await Project.findById(task.project);
    if (!taskProject || !canEditTask(taskProject, req.user)) {
      return res.status(403).json({ message: 'Not allowed to delete this task' });
    }

    await task.deleteOne();

    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// - add dependency
router.post('/:id/dependencies', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { blockedBy, blocks } = req.body;

    const task = await Task.findById(id).populate('blockedBy', 'status title');
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const taskProject = await Project.findById(task.project);
    if (!taskProject || !canEditTask(taskProject, req.user)) {
      return res.status(403).json({ message: 'Not allowed to modify dependencies for this task' });
    }

    // Handle blockedBy
    if (blockedBy) {
      const circular = await hasCircularDependency(id, blockedBy);
      if (circular) {
        return res.status(400).json({ message: 'Circular dependency detected',
          reason: 'CIRCULAR_DEPENDENCY' });
      }
      if (!task.blockedBy.includes(blockedBy)) {
        task.blockedBy.push(blockedBy);
      }
      await TaskRelation.findOneAndUpdate(
        { fromTask: task._id, toTask: blockedBy, type: 'blocked_by' },
        { fromTask: task._id, toTask: blockedBy, type: 'blocked_by' },
        { upsert: true }
      );
    }

    // Handle blocks
    if (blocks) {
      if (!task.blocks.includes(blocks)) {
        task.blocks.push(blocks);
      }
      await TaskRelation.findOneAndUpdate(
        { fromTask: task._id, toTask: blocks, type: 'blocks' },
        { fromTask: task._id, toTask: blocks, type: 'blocks' },
        { upsert: true }
      );
    }

    await task.save();

   await task.populate('blockedBy', 'status title');
    const unresolvedBlockers = task.blockedBy.filter(
      (blocker) => blocker.status !== 'done'
    );

    const warning =
      unresolvedBlockers.length > 0
        ? {
            type: 'UNRESOLVED_BLOCKERS',
            count: unresolvedBlockers.length,
            blockers: unresolvedBlockers.map((b) => ({
              id: b._id,
              title: b.title,
              status: b.status,
            })),
          }
        : null;

    res.json({
      task,
      warning,
    });
  } catch (err) {
    console.error('Update dependencies error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// list subtasks of a task
router.get('/:id/subtasks', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const parentTask = await Task.findById(id);
    if (!parentTask) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const taskProject = await Project.findById(parentTask.project);
    if (!taskProject || !canViewProject(taskProject, req.user)) {
      return res.status(403).json({ message: 'Not allowed to view this task' });
    }

    const subtasks = await Task.find({ parent: id })
      .populate('assignee', 'name email')
      .sort({ createdAt: 1 });

    res.json(subtasks);
  } catch (err) {
    console.error('List subtasks error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// add a comment (with optional threading + @mentions)
router.post('/:id/comments', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { body, parentComment, mentions } = req.body;

    if (!body) {
      return res.status(400).json({ message: 'Comment body is required' });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const taskProject = await Project.findById(task.project);
    if (!taskProject || !canViewProject(taskProject, req.user)) {
      return res.status(403).json({ message: 'Not allowed to comment on this task' });
    }

    const mentionIds = Array.isArray(mentions) ? mentions : [];

    const comment = {
      author: req.user.userId,
      body,
      parentComment: parentComment || null,
      createdAt: new Date(),
    };

    task.comments.push(comment);
    if (mentionIds.length) {
      task.mentions = Array.from(new Set([...(task.mentions || []).map((m) => m.toString()), ...mentionIds]));
    }
    await task.save();

    await logActivity({
      entityType: 'task',
      entityId: task._id,
      actor: req.user.userId,
      action: 'TASK_COMMENT_ADDED',
      payload: { body, parentComment: parentComment || null },
    });

    mentionIds.forEach((mentionedUserId) => {
      if (mentionedUserId.toString() !== req.user.userId.toString()) {
        emitNotification(
          mentionedUserId,
          'mention',
          `You were mentioned in a comment on task "${task.title}"`,
          task._id.toString()
        );
      }
    });

    res.status(201).json(task.comments[task.comments.length - 1]);
  } catch (err) {
    console.error('Add task comment error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// list all TaskRelation rows involving this task
router.get('/:id/relations', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const taskProject = await Project.findById(task.project);
    if (!taskProject || !canViewProject(taskProject, req.user)) {
      return res.status(403).json({ message: 'Not allowed to view this task' });
    }

    const relations = await TaskRelation.find({
      $or: [{ fromTask: id }, { toTask: id }],
    })
      .populate('fromTask', 'title status')
      .populate('toTask', 'title status');

    res.json(relations);
  } catch (err) {
    console.error('List task relations error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;