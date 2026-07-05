// server/src/routes/activity.js
const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const Task = require('../models/Task');
const Rca = require('../models/Rca');
const Project = require('../models/Project');
const { requireAuth } = require('../middleware/auth');
const { canViewProject } = require('../utils/permissions');

router.get('/', requireAuth, async (req, res) => {
  try {
    const { entityType, entityId, project } = req.query;

    const query = {};

    if (project) {
      const projectDoc = await Project.findById(project);
      if (!projectDoc) {
        return res.status(400).json({ message: 'Invalid project' });
      }
      if (!canViewProject(projectDoc, req.user)) {
        return res.status(403).json({ message: 'Not allowed to view activity for this project' });
      }

      const taskIds = await Task.find({ project }).distinct('_id');
      const rcaIds = await Rca.find({ task: { $in: taskIds } }).distinct('_id');

      query.$or = [
        { entityType: 'task', entityId: { $in: taskIds } },
        { entityType: 'rca', entityId: { $in: rcaIds } },
      ];
    } else {
      if (entityType) query.entityType = entityType;
      if (entityId) query.entityId = entityId;
    }

    const logs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('actor', 'name email');

    res.json(logs);
  } catch (err) {
    console.error('Get activity logs error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;