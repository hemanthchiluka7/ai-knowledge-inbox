import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

type IngestArgs =
  | { type: 'note'; content: string; title?: string }
  | { type: 'url'; url: string };

export function useIngest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: IngestArgs) =>
      args.type === 'note'
        ? api.ingestNote(args.content, args.title)
        : api.ingestUrl(args.url),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });
}
