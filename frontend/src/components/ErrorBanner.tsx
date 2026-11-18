import { ApiError } from '../api/client';

interface Props {
  error: unknown;
}

export default function ErrorBanner({ error }: Props) {
  if (!error) return null;
  const message = error instanceof ApiError ? error.message : 'Something went wrong.';
  const code = error instanceof ApiError ? error.code : null;

  return (
    <div role="alert" className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
      {code && <span className="font-mono font-semibold mr-2">{code}</span>}
      {message}
    </div>
  );
}
