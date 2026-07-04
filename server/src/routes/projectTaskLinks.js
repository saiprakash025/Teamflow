// server/src/routes/projectTaskLinks.js
const express = require('express');
const ProjectTaskLink = require('../models/ProjectTaskLink');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { requireAuth } = require('../middleware/auth');
const { canEditTask } = require('../utils/permissions');

const router = express.Router();

// POST /api/project-task-links
// Body: { projectId, taskId }
router.post('/', requireAuth, async (req, res) => {
  try {
    const user = req.user; // { userId, role }
    const { projectId, taskId } = req.body;

    if (!projectId || !taskId) {
      return res.status(400).json({ message: 'projectId and taskId are required' });
    }

    const project = await Project.findById(projectId);
    const task = await Task.findById(taskId);

    if (!project || !task) {
      return res.status(404).json({ message: 'Project or Task not found' });
    }

    // Permission: user must be allowed to edit tasks on this project
    if (!canEditTask(project, user)) {
      return res.status(403).json({ message: 'Not allowed to link tasks for this project' });
    }

    // Avoid duplicate links
    const existing = await ProjectTaskLink.findOne({
      project: projectId,
      task: taskId,
    });
    if (existing) {
      return res.status(200).json(existing);
    }

    const link = await ProjectTaskLink.create({
      project: projectId,
      task: taskId,
    });

    res.status(201).json(link);
  } catch (err) {
    console.error('Create ProjectTaskLink error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/project-task-links/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const link = await ProjectTaskLink.findById(id).populate('project');
    if (!link) {
      return res.status(404).json({ message: 'Link not found' });
    }

    // Only users who can edit tasks on the linked project can remove the link
    if (!canEditTask(link.project, user)) {
      return res.status(403).json({ message: 'Not allowed to remove link' });
    }

    await link.deleteOne();

    res.json({ message: 'Link deleted' });
  } catch (err) {
    console.error('Delete ProjectTaskLink error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;