import mongoose from 'mongoose';
import { ENV } from './env.js';

export const connectDB = async (retries = 5, delayMs = 2000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(ENV.MONGODB_URI, {
        serverSelectionTimeoutMS: 8000
      });
      console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      console.error(`[Database] Connection attempt ${attempt}/${retries} failed: ${error.message}`);
      if (attempt < retries) {
        console.log(`[Database] Retrying in ${delayMs / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        console.error(`[Database Error] Failed to connect to MongoDB after ${retries} attempts.`);
        console.error(`[Database Error] Please ensure your current IP is whitelisted in MongoDB Atlas Network Access.`);
        process.exit(1);
      }
    }
  }
};

