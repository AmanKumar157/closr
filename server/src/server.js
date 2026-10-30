import app from './app.js';
import { connectDB } from './config/db.js';
import { ENV } from './config/env.js';

const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(ENV.PORT, () => {
      console.log(`[Server] CareerPilot server listening on port ${ENV.PORT} (${ENV.NODE_ENV})`);
      console.log(`[Server] Accepting requests from: ${ENV.CLIENT_URL}`);
    });

    const shutdown = (signal) => {
      console.log(`\n[Server] Received ${signal}. Gracefully shutting down...`);
      server.close(() => {
        console.log('[Server] HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error(`[Server Error] Failed to start server: ${err.message}`);
    process.exit(1);
  }
};

startServer();
