import { Router } from 'express';
import { postIngest } from '../controllers/ingest.controller';
import { validate } from '../middleware/validate';
import { ingestBodySchema } from '../schemas/ingest.schema';

const router = Router();

router.post('/ingest', validate(ingestBodySchema), postIngest);

export default router;
