// server/src/models/ProjectPreference.js
const mongoose = require('mongoose');

const projectPreferenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    viewPreference: {
      type: String,
      enum: ['kanban', 'list', 'calendar'],
      default: 'kanban',
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light',
    },
  },
  { timestamps: true }
);

// one preference row per (user, project) pair
projectPreferenceSchema.index({ user: 1, project: 1 }, { unique: true });

module.exports = mongoose.model('ProjectPreference', projectPreferenceSchema);
