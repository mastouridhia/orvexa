import { useEffect } from 'react';

export type ToastProps = {
  message: string;
  onDone: () => void;
  durationMs?: number;
};

export function Toast({ message, onDone, durationMs = 2200 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDone, durationMs);
    return () => clearTimeout(t);
  }, [message, onDone, durationMs]);
  return (
    <div className="toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}
