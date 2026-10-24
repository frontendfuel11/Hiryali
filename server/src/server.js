import 'dotenv/config';
import app from './app.js';
import { connectDatabase } from './config/db.js';

const port = Number(process.env.PORT || 5000);
try {
  if (process.env.SKIP_DB === 'true') {
    console.warn('SKIP_DB=true — starting without MongoDB (chat/health only).');
  } else {
    await connectDatabase();
  }
  const server = app.listen(port, () => console.log(`Hariyali API listening on http://localhost:${port}`));
  const shutdown = (signal) => {
    console.log(`${signal} received; shutting down.`);
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
} catch (error) {
  console.error('Failed to start Hariyali API:', error.message);
  process.exit(1);
}
