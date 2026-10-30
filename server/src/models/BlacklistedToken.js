import mongoose from 'mongoose';

const blacklistedTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
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
