// server/src/models/TaskRelation.js
const mongoose = require('mongoose');

// Explicit relation record between two tasks, in addition to the
// blockedBy/blocks arrays kept on Task itself (those remain the source
// of truth for the cycle-detection check to avoid a larger refactor).
const taskRelationSchema = new mongoose.Schema(
  {
    fromTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    toTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    type: {
      type: String,
      enum: ['blocks', 'blocked_by'],
      required: true,
    },
  },
  { timestamps: true }
);

taskRelationSchema.index({ fromTask: 1, toTask: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('TaskRelation', taskRelationSchema);
