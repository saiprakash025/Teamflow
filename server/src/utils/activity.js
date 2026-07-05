// server/src/utils/activity.js
const ActivityLog = require('../models/ActivityLog');

async function logActivity({
  entityType,
  entityId,
  actor,
  action,
  payload = {},
}) {
  try {
    await ActivityLog.create({
      entityType,
      entityId,
      actor,
      action,
      payload,
    });
  } catch (err) {
    console.error('ActivityLog error:', err);
  }
}

module.exports = {
  logActivity,
};