// server/src/routes/analytics.js
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Rca = require('../models/Rca');

const router = express.Router();

// Helper: ids of projects the current user owns or belongs to
async function getAccessibleProjectIds(userId) {
  const projects = await Project.find({
    $or: [{ owner: userId }, { 'members.user': userId }],
  }).select('_id');
  return projects.map((p) => p._id);
}

// summary / dashboard
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { project } = req.query;

    let projectIds = await getAccessibleProjectIds(userId);

    if (project) {
      const accessibleIdStrings = projectIds.map((id) => id.toString());
      if (!accessibleIdStrings.includes(project)) {
        return res.status(403).json({ message: 'Not allowed to view analytics for this project' });
      }
      projectIds = [project];
    }

    const [
      projectCount,
      totalTasks,
      completedTasks,
      overdueTaskCount,
      rcaDraft,
      rcaSubmitted,
      rcaReviewed,
      workloadAgg,
      velocityAgg,
    ] = await Promise.all([
      Project.countDocuments({
        $or: [{ owner: userId }, { 'members.user': userId }],
      }),

      Task.countDocuments({ project: { $in: projectIds } }),

      Task.countDocuments({ project: { $in: projectIds }, status: 'done' }),

      Task.countDocuments({
        project: { $in: projectIds },
        status: { $ne: 'done' },
        dueDate: { $lt: new Date() },
      }),

      Rca.countDocuments({ task: { $in: await Task.find({ project: { $in: projectIds } }).distinct('_id') }, status: 'draft' }),
      Rca.countDocuments({ task: { $in: await Task.find({ project: { $in: projectIds } }).distinct('_id') }, status: 'submitted' }),
      Rca.countDocuments({ task: { $in: await Task.find({ project: { $in: projectIds } }).distinct('_id') }, status: 'reviewed' }),

      // workload per assignee: open (not done) task count, grouped by assignee
      Task.aggregate([
        { $match: { project: { $in: projectIds }, status: { $ne: 'done' }, assignee: { $ne: null } } },
        { $group: { _id: '$assignee', openTaskCount: { $sum: 1 } } },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        {
          $project: {
            _id: 0,
            userId: '$user._id',
            name: '$user.name',
            email: '$user.email',
            openTaskCount: 1,
          },
        },
        { $sort: { openTaskCount: -1 } },
      ]),

      // velocity: tasks completed per week over the last 8 weeks
      Task.aggregate([
        {
          $match: {
            project: { $in: projectIds },
            status: 'done',
            updatedAt: { $gte: new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { $isoWeek: '$updatedAt' },
            completedCount: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const completionRate =
      totalTasks > 0 ? Number(((completedTasks / totalTasks) * 100).toFixed(1)) : 0;

    // simple project health signal: share of open tasks that are overdue
    const openTasks = totalTasks - completedTasks;
    const overdueShare =
      openTasks > 0 ? Number(((overdueTaskCount / openTasks) * 100).toFixed(1)) : 0;
    const projectHealth =
      overdueShare === 0 ? 'healthy' : overdueShare < 20 ? 'at_risk' : 'unhealthy';

    res.json({
      projectCount,
      taskCount: totalTasks,
      completedTasks,
      completionRate,
      overdueTaskCount,
      projectHealth,
      overdueSharePercent: overdueShare,
      workloadByAssignee: workloadAgg,
      velocityLast8Weeks: velocityAgg.map((w) => ({
        isoWeek: w._id,
        completedCount: w.completedCount,
      })),
      rcaByStatus: {
        draft: rcaDraft,
        submitted: rcaSubmitted,
        reviewed: rcaReviewed,
      },
    });
  } catch (err) {
    console.error('Analytics summary error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CSV export of tasks, scoped to the user's accessible projects and the active filter
router.get('/export', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { project, status, assignee } = req.query;

    const projectIds = await getAccessibleProjectIds(userId);
    const accessibleIdStrings = projectIds.map((id) => id.toString());

    const filter = { project: { $in: projectIds } };

    if (project) {
      if (!accessibleIdStrings.includes(project)) {
        return res.status(403).json({ message: 'Not allowed to export this project' });
      }
      filter.project = project;
    }
    if (status) filter.status = status;
    if (assignee) filter.assignee = assignee;

    const tasks = await Task.find(filter)
      .populate('project', 'name')
      .populate('assignee', 'name email');

    const header = 'Project,Task,Status,Priority,Assignee,DueDate\n';

    const rows = tasks
      .map((t) => {
        const projectName = t.project ? t.project.name : '';
        const assigneeName = t.assignee ? t.assignee.name : '';
        const dueDate = t.dueDate ? t.dueDate.toISOString() : '';

        return [projectName, t.title, t.status, t.priority, assigneeName, dueDate]
          .map((field) => `"${String(field).replace(/"/g, '""')}"`)
          .join(',');
      })
      .join('\n');

    const csv = header + rows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="analytics_tasks.csv"');
    res.status(200).send(csv);
  } catch (err) {
    console.error('Analytics export error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
