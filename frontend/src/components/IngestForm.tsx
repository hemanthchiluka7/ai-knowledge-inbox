import { useState, type FormEvent } from 'react';
import { useIngest } from '../hooks/useIngest';
import ErrorBanner from './ErrorBanner';
import { cn } from '../lib/utils';

type Tab = 'note' | 'url';

export default function IngestForm() {
  const [tab, setTab] = useState<Tab>('note');
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const { mutate, isPending, error, reset } = useIngest();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    reset();
    if (tab === 'note') {
      mutate(
        { type: 'note', content, title: title || undefined },
        {
          onSuccess: () => { setContent(''); setTitle(''); },
        },
      );
    } else {
      mutate(
        { type: 'url', url },
        { onSuccess: () => setUrl('') },
      );
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(['note', 'url'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); reset(); }}
            className={cn(
              'px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors',
              tab === t
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            {t === 'note' ? '📝 Note' : '🔗 URL'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {tab === 'note' ? (
          <>
            <div>
              <label htmlFor="note-title" className="block text-xs font-medium text-gray-600 mb-1">
                Title (optional)
              </label>
              <input
                id="note-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My note title"
                maxLength={200}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label htmlFor="note-content" className="block text-xs font-medium text-gray-600 mb-1">
                Content <span className="text-red-500">*</span>
              </label>
              <textarea
                id="note-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste or type your note here…"
                required
                rows={6}
                maxLength={20000}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </>
        ) : (
          <div>
            <label htmlFor="url-input" className="block text-xs font-medium text-gray-600 mb-1">
              URL <span className="text-red-500">*</span>
            </label>
            <input
              id="url-input"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        )}

        <ErrorBanner error={error} />

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
      </form>
    </div>
  );
}
