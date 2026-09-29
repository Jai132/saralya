import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

/** Bottom sheet on mobile, centred dialog on wide screens. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  dark,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  dark?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center" role="dialog" aria-modal>
      <div className="absolute inset-0 animate-fadeUp bg-navy/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={`relative max-h-[88vh] w-full animate-fadeUp overflow-y-auto rounded-t-3xl p-5 pb-[max(env(safe-area-inset-bottom),20px)] shadow-2xl sm:max-w-md sm:rounded-3xl ${
          dark ? 'bg-navy text-white' : 'bg-white'
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className={`font-serif text-lg font-semibold ${dark ? 'text-white' : 'text-navy'}`}>{title}</div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-black/5" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
