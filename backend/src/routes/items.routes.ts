import { Router } from 'express';
import { listItems, getItem, deleteItem } from '../controllers/items.controller';
import { validate } from '../middleware/validate';
import { listItemsQuerySchema } from '../schemas/items.schema';

const router = Router();

router.get('/items', validate(listItemsQuerySchema, 'query'), listItems);
router.get('/items/:id', getItem);
router.delete('/items/:id', deleteItem);

export default router;
