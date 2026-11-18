import { useEffect, useRef } from 'react';
import type { Citation } from '../api/types';
import { cn } from '../lib/utils';

interface Props {
  citations: Citation[];
  activeCitation: number | null;
}

export default function SourceList({ citations, activeCitation }: Props) {
  const refs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (activeCitation === null) return;
    refs.current.get(activeCitation)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeCitation]);

  if (citations.length === 0) return null;

  return (
    <div className="space-y-2 mt-3">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sources</p>
      {citations.map((c) => (
        <div
          key={c.ref}
          ref={(el) => {
            if (el) refs.current.set(c.ref, el);
            else refs.current.delete(c.ref);
          }}
          className={cn(
            'rounded-lg border p-3 text-sm transition-colors',
            activeCitation === c.ref
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-200 bg-white',
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold text-blue-600">[{c.ref}]</span>
            {c.title && <span className="font-medium text-gray-700 truncate">{c.title}</span>}
            {c.sourceUrl && (
              <a
                href={c.sourceUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="ml-auto text-xs text-blue-500 hover:underline shrink-0"
              >
                Source ↗
              </a>
            )}
          </div>
          <p className="text-gray-600 text-xs leading-relaxed line-clamp-4">{c.snippet}</p>
        </div>
      ))}
    </div>
  );
}
