import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { api } from '../api/client';

export function useItems() {
  return useQuery({
    queryKey: ['items'],
    queryFn: () => api.listItems(),
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? [];
      return items.some((i) => i.status === 'pending') ? 2000 : false;
    },
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });
}
