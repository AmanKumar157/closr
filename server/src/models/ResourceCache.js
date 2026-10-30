import mongoose from 'mongoose';

const resourceCacheSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    resolved: {
      url: { type: String, default: '' },
      title: { type: String, default: '' },
      channel: { type: String, default: '' },
      videoId: { type: String, default: '' },
      verified: { type: Boolean, default: false }
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: { expires: 30 * 24 * 60 * 60 } // Automatically expires and drops after 30 days
    }
  }
);

export const ResourceCache = mongoose.model('ResourceCache', resourceCacheSchema);
