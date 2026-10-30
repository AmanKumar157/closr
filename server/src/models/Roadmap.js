import mongoose from 'mongoose';

const resourceResolvedSchema = new mongoose.Schema(
  {
    url: { type: String, default: '' },
    title: { type: String, default: '' },
    channel: { type: String, default: '' },
    videoId: { type: String, default: '' },
    verified: { type: Boolean, default: false }
  },
  { _id: false }
);

const milestoneResourceSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['video', 'documentation', 'article', 'practice'],
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    searchQuery: {
      type: String,
      required: true,
      trim: true
    },
    whyThis: {
      type: String,
      required: true,
      trim: true
    },
    isFree: {
      type: Boolean,
      default: true
    },
    language: {
      type: String,
      enum: ['en', 'hi'],
      default: 'en'
    },
    status: {
      type: String,
      enum: ['not_started', 'viewed', 'done'],
      default: 'not_started'
    },
    resolved: {
      type: resourceResolvedSchema,
      default: () => ({})
    }
  },
  { _id: false }
);

const milestoneSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date,
      default: null
    },
    resource: {
      type: milestoneResourceSchema,
      required: true
    }
  },
  { _id: false }
);

const weekSchema = new mongoose.Schema(
  {
    weekNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },
    topicTitle: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    skillsCovered: {
      type: [String],
      default: []
    },
    milestones: {
      type: [milestoneSchema],
      required: true
    }
  },
  { _id: false }
);

const roadmapSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    analysisId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Analysis',
      required: true,
      index: true
    },
    targetRole: {
      type: String,
      required: true,
      trim: true
    },
    weeks: {
      type: [weekSchema],
      required: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

export const Roadmap = mongoose.model('Roadmap', roadmapSchema);

