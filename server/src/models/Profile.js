import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    currentSkills: {
      type: [String],
      default: []
    },
    targetRole: {
      type: String,
      trim: true,
      default: ''
    },
    jobDescription: {
      type: String,
      trim: true,
      default: ''
    },
    preferredLanguage: {
      type: String,
      enum: ['en', 'hi'],
      default: 'en'
    },
    avatar: {
      type: String,
      default: ''
    },
    lastUploadedResume: {
      fileName: { type: String, default: '' },
      fileSize: { type: Number, default: 0 },
      uploadedAt: { type: Date, default: null },
      analysisId: { type: mongoose.Schema.Types.ObjectId, ref: 'Analysis', default: null }
    }
  },
  {
    timestamps: true
  }
);

export const Profile = mongoose.model('Profile', profileSchema);

