import { Request, Response } from 'express';
import { answerQuestion } from '../services/answer.service';
import type { QueryBody } from '../schemas/query.schema';

export async function postQuery(req: Request, res: Response): Promise<void> {
  const { question, topK } = (req.parsed?.body ?? req.body) as QueryBody;
  const result = await answerQuestion(question, topK);
  res.json(result);
}
