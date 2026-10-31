import mongoose from 'mongoose';

const generatedResumeSchema = new mongoose.Schema(
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
      required: false,
      default: null,
      index: true
    },
    html: {
      type: String,
      required: true
    },
    companyName: {
      type: String,
      default: 'General Application',
      trim: true
    },
    targetRole: {
      type: String,
      default: 'Target Role',
      trim: true
    },
    template: {
      type: String,
      enum: ['modern', 'classic', 'compact'],
      default: 'modern'
    }
  },
  {
    timestamps: true
  }
);

export const GeneratedResume = mongoose.model('GeneratedResume', generatedResumeSchema);

