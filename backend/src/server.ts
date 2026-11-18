import app from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import './db/connection'; // Ensure DB is initialized before server starts
import { reEnqueuePending } from './services/ingestion.service';

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV, url: `http://localhost:${env.PORT}` }, 'Server started');
  reEnqueuePending();
});

server.on('error', (err) => {
  logger.error(err, 'Server error');
  process.exit(1);
});

export default server;
