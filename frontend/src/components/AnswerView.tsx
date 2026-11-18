import { cn } from '../lib/utils';

type Segment = { kind: 'text'; text: string } | { kind: 'cite'; ref: number };

function parseSegments(answer: string): Segment[] {
  return answer.split(/(\[\d+\])/g).map((part) => {
    const m = part.match(/^\[(\d+)\]$/);
    return m ? { kind: 'cite', ref: parseInt(m[1], 10) } : { kind: 'text', text: part };
  });
}

interface Props {
  answer: string;
  activeCitation: number | null;
  onCitationClick: (ref: number) => void;
}

export default function AnswerView({ answer, activeCitation, onCitationClick }: Props) {
  const segments = parseSegments(answer);

  return (
    <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm text-gray-800 leading-relaxed">
      {segments.map((seg, i) => {
        if (seg.kind === 'text') return <span key={i}>{seg.text}</span>;
        return (
          <button
            key={i}
            onClick={() => onCitationClick(seg.ref)}
            aria-label={`Jump to source ${seg.ref}`}
            className={cn(
              'inline-flex items-center justify-center rounded px-1.5 py-0.5 text-xs font-mono font-semibold mx-0.5 transition-colors',
              activeCitation === seg.ref
                ? 'bg-blue-600 text-white'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200',
            )}
          >
            [{seg.ref}]
          </button>
        );
      })}
    </div>
  );
}
