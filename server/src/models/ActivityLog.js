// server/src/models/ActivityLog.js
const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: ['task', 'rca', 'project'],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    action: {
      type: String,
      required: true,
    },

    // Flexible payload to store before/after, comments, etc.
    payload: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true, // createdAt = log time
  }
);

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;