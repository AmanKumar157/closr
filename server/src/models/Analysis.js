import mongoose from 'mongoose';

const missingSkillSchema = new mongoose.Schema(
  {
    skill: {
      type: String,
      required: true,
      trim: true
    },
    importance: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    }
  },
  { _id: false }
);

const analysisSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    fileName: {
      type: String,
      default: 'Uploaded Resume.pdf',
      trim: true
    },
    fileSize: {
      type: Number,
      default: 0
    },
    fileBuffer: {
      type: Buffer,
      default: null,
      select: false
    },
    fileContentType: {
      type: String,
      default: 'application/pdf'
    },
    hasOriginalPdf: {
      type: Boolean,
      default: false
    },
    resumeText: {
      type: String,
      required: [true, 'Resume text is required']
    },
    targetRole: {
      type: String,
      required: [true, 'Target role is required'],
      trim: true
    },
    jobDescription: {
      type: String,
      trim: true,
      default: ''
    },
    matchScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    extractedSkills: {
      type: [String],
      default: []
    },
    matchedSkills: {
      type: [String],
      default: []
    },
    missingSkills: {
      type: [missingSkillSchema],
      default: []
    },
    weakSections: {
      type: [String],
      default: []
    },
    suggestions: {
      type: [String],
      default: []
    },
    previousAnalysisId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Analysis',
      default: null
    },
    roadmapId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Roadmap',
      default: null
    },
    // Hash of resumeText + targetRole + jobDescription for caching identical AI queries
    cacheHash: {
      type: String,
      index: true
    },
    // SHA-256 hash of extracted resume text to block duplicate uploads of the exact same resume
    resumeTextHash: {
      type: String,
      index: true,
      default: ''
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

export const Analysis = mongoose.model('Analysis', analysisSchema);

