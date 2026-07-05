// server/src/models/Rca.js
const mongoose = require('mongoose');

const rcaSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },

    timeline: {
      type: String,
      trim: true,
    },
    contributingFactors: {
      type: String,
      trim: true,
    },
    correctiveActions: {
      type: String,
      trim: true,
    },
    preventiveMeasures: {
      type: String,
      trim: true,
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

    reviews: [
      {
        reviewer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        decision: {
          type: String,
          enum: ['approved', 'rejected'],
          required: true,
        },
        comment: {
          type: String,
          required: true,
          trim: true,
        },
        decidedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

     comments: [
      {
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        body: String,
        parentComment: { type: mongoose.Schema.Types.ObjectId, default: null },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    attachments: [
      {
        url: String,
        name: String,
      },
    ],

  },
  { timestamps: true }
);

const Rca = mongoose.model('Rca', rcaSchema);

module.exports = Rca;