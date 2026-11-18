import { Router } from 'express';
import { postQuery } from '../controllers/query.controller';
import { validate } from '../middleware/validate';
import { queryBodySchema } from '../schemas/query.schema';

const router = Router();

router.post('/query', validate(queryBodySchema), postQuery);

export default router;
