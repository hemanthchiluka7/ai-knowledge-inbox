import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './lib/logger';
import { requestId } from './middleware/requestId';
import { notFound } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';
import router from './routes';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(requestId);
app.use(
  pinoHttp({
    logger,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    customProps: (req: any) => ({ requestId: req.requestId ?? 'unknown' }),
    autoLogging: { ignore: (req) => req.url === '/health' },
  }),
);
app.use(express.json({ limit: '1mb' }));

app.use(router);

app.use(notFound);
app.use(errorHandler);

export default app;
