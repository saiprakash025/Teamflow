// server/src/models/ProjectTaskLink.js
const mongoose = require('mongoose');

const projectTaskLinkSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const ProjectTaskLink = mongoose.model('ProjectTaskLink', projectTaskLinkSchema);

module.exports = ProjectTaskLink;