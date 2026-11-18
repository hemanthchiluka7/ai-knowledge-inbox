import { useDeleteItem } from '../hooks/useItems';
import type { ItemSummary } from '../api/types';
import { cn } from '../lib/utils';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function StatusBadge({ status, error }: { status: ItemSummary['status']; error: string | null }) {
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
        <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
        Processing
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span
        title={error ?? 'Processing failed'}
        className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 cursor-help"
      >
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
      Ready
    </span>
  );
}

interface Props {
  item: ItemSummary;
}

export default function ItemCard({ item }: Props) {
  const { mutate: del, isPending: isDeleting } = useDeleteItem();

  const displayTitle = item.title ?? item.preview?.slice(0, 60) ?? 'Untitled';
  const icon = item.sourceType === 'url' ? '🔗' : '📝';

  return (
    <div className={cn('rounded-lg border p-3 bg-white', item.status === 'failed' && 'border-red-200')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span aria-hidden="true">{icon}</span>
            <span className="truncate text-sm font-medium text-gray-800">{displayTitle}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={item.status} error={item.errorMessage} />
            <span className="text-xs text-gray-400">{relativeTime(item.createdAt)}</span>
            {item.status === 'ready' && (
              <span className="text-xs text-gray-400">{item.chunkCount} chunks</span>
            )}
          </div>
        </div>
        <button
          onClick={() => del(item.id)}
          disabled={isDeleting}
          aria-label={`Delete ${displayTitle}`}
          className="shrink-0 rounded p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
        >
          ✕
        </button>
      </div>
      {item.preview && item.status === 'ready' && (
        <p className="mt-2 text-xs text-gray-500 line-clamp-2">{item.preview}</p>
      )}
    </div>
  );
}
