import { useItems } from '../hooks/useItems';
import ItemCard from './ItemCard';
import ErrorBanner from './ErrorBanner';

export default function ItemList() {
  const { data, isLoading, error } = useItems();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) return <ErrorBanner error={error} />;

  const items = data?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
        No saved items yet. Add a note or URL to get started.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}
