const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, },
    description: { type: String,trim:true, },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    viewPreference: {
      type: String,
      enum: ['kanban', 'list', 'calendar'],
      default: 'kanban',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Project', projectSchema);