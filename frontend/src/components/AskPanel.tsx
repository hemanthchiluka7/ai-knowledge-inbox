import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useAsk } from '../hooks/useAsk';
import AnswerView from './AnswerView';
import SourceList from './SourceList';
import ErrorBanner from './ErrorBanner';

export default function AskPanel() {
  const [question, setQuestion] = useState('');
  const [activeCitation, setActiveCitation] = useState<number | null>(null);
  const { mutate, data, isPending, error, reset } = useAsk();

  const submit = () => {
    if (!question.trim() || isPending) return;
    reset();
    setActiveCitation(null);
    mutate({ question: question.trim(), topK: 5 });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submit();
    }
  };

  const nothingFound =
    data?.answer.toLowerCase().includes("couldn't find") &&
    data.citations.length === 0;

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <div>
          <label htmlFor="question" className="block text-xs font-medium text-gray-600 mb-1">
            Ask a question about your saved content
          </label>
          <textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What does the article say about…?"
            rows={3}
            minLength={3}
            maxLength={1000}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <p className="text-xs text-gray-400 mt-1">Ctrl+Enter to submit</p>
        </div>

        <ErrorBanner error={error} />

        <button
          type="submit"
          disabled={isPending || question.trim().length < 3}
          className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Thinking…' : 'Ask'}
        </button>
      </form>

      {isPending && (
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm text-gray-400 animate-pulse">
          Searching your knowledge base…
        </div>
      )}

      {data && !isPending && (
        <div className="space-y-3">
          {nothingFound ? (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700">
              {data.answer}
            </div>
          ) : (
            <>
              <AnswerView
                answer={data.answer}
                activeCitation={activeCitation}
                onCitationClick={(ref) =>
                  setActiveCitation((prev) => (prev === ref ? null : ref))
                }
              />
              <SourceList citations={data.citations} activeCitation={activeCitation} />
              <p className="text-right text-xs text-gray-400">
                {data.meta.retrievedChunks} chunks · {data.meta.model} · {data.meta.latencyMs}ms
              </p>
            </>
          )}
        </div>
      )}

      {!data && !isPending && (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
          Ask a question to get answers with cited sources.
        </div>
      )}
    </div>
  );
}
