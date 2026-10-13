import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import './ClampedText.css';

// Text that stops at `lines` lines and opens on click. It only offers the toggle when the text really is longer
// than that, so a short description renders exactly as plain text would.
export default function ClampedText({ children, lines = 3 }: { children: ReactNode; lines?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [children, open]);

  return (
    <>
      <span
        ref={ref}
        className={open ? 'clamp-text' : 'clamp-text clamp-text-closed'}
        style={open ? undefined : { WebkitLineClamp: lines }}
      >
        {children}
      </span>
      {(overflows || open) && (
        <button type="button" className="clamp-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? 'Show less' : 'Show more'}
        </button>
      )}
    </>
  );
}
