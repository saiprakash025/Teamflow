// server/src/models/Rca.js
const mongoose = require('mongoose');

const rcaSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'reviewed'],
      default: 'draft',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    findings: [
      {
        type: String,
      },
    ],
    actions: [
      {
        type: String,
      },
    ],
  },
  { timestamps: true }
);

const Rca = mongoose.model('Rca', rcaSchema);

module.exports = Rca;