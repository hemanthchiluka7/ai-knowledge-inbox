import { Router } from 'express';
import healthRouter from './health.routes';
import ingestRouter from './ingest.routes';
import itemsRouter from './items.routes';
import queryRouter from './query.routes';

const router = Router();

router.use(healthRouter);
router.use(ingestRouter);
router.use(itemsRouter);
router.use(queryRouter);

export default router;
