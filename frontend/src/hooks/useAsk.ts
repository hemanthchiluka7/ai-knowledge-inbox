import { useMutation } from '@tanstack/react-query';
import { api } from '../api/client';

export function useAsk() {
  return useMutation({
    mutationFn: ({ question, topK }: { question: string; topK?: number }) =>
      api.query(question, topK),
  });
}
