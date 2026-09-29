import { Link } from 'react-router-dom';
import { Wordmark } from '../components/Logo';

export default function Placeholder({ title }: { title: string }) {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <Wordmark />
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-sm text-ink-soft">Coming in a later milestone.</p>
      <Link to="/" className="text-sm font-semibold text-teal">
        ← Back to start
      </Link>
    </div>
  );
}
