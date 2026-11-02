import mongoose from 'mongoose';

const blacklistedTokenSchema = new mongoose.Schema(
  {
    tokenHash: {
      type: String,
      index: true
    },
    token: {
      type: String,
      index: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // Document automatically deleted when expiresAt is reached
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

export const BlacklistedToken = mongoose.model('BlacklistedToken', blacklistedTokenSchema);

