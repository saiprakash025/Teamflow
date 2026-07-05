// server/src/routes/preferences.js
const express = require('express');
const Project = require('../models/Project');
const ProjectPreference = require('../models/ProjectPreference');
const { requireAuth } = require('../middleware/auth');
const { canViewProject } = require('../utils/permissions');

const router = express.Router();

// get current user's preference for a project (falls back to defaults)
router.get('/:projectId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    if (!canViewProject(project, req.user)) {
      return res.status(403).json({ message: 'Not allowed to view this project' });
    }

    const pref = await ProjectPreference.findOne({ user: userId, project: projectId });

    res.json({
      viewPreference: pref ? pref.viewPreference : 'kanban',
      theme: pref ? pref.theme : 'light',
    });
  } catch (err) {
    console.error('Get preference error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// upsert current user's preference for a project
router.put('/:projectId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { projectId } = req.params;
    const { viewPreference, theme } = req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    if (!canViewProject(project, req.user)) {
      return res.status(403).json({ message: 'Not allowed to set preferences for this project' });
    }

    if (viewPreference && !['kanban', 'list', 'calendar'].includes(viewPreference)) {
      return res.status(400).json({ message: 'Invalid viewPreference' });
    }
    if (theme && !['light', 'dark'].includes(theme)) {
      return res.status(400).json({ message: 'Invalid theme' });
    }

    const pref = await ProjectPreference.findOneAndUpdate(
      { user: userId, project: projectId },
      {
        $set: {
          ...(viewPreference ? { viewPreference } : {}),
          ...(theme ? { theme } : {}),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ viewPreference: pref.viewPreference, theme: pref.theme });
  } catch (err) {
    console.error('Set preference error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
