import type { ReactNode } from 'react';
import './HistoryTimeline.css';

// How the app shows a history (project owner, 2026-11-11: "wherever there is a history, use this presentation"): a vertical timeline, newest
// first as the caller gives it. Each entry is a dot on a line with its event in bold, who and when beneath it, and the reason or detail
// under that. No revision numbers: what happened and who did it is what a reader wants. Use this for any new history too.
export interface HistoryItem {
  key: string;
  // The event, e.g. "Technical approval", "Signed · Prepared by".
  title: ReactNode;
  // Who and when, e.g. "App Admin · 2026-11-02".
  meta?: ReactNode;
  // The reason, a comment, the list of what changed — anything that belongs under the event.
  detail?: ReactNode;
  // Colours the dot: a good outcome, something taken back or needing attention, a refusal.
  tone?: 'ok' | 'warn' | 'bad';
}

export default function HistoryTimeline({ items }: { items: HistoryItem[] }) {
  return (
    <ol className="hx">
      {items.map((item) => (
        <li key={item.key} className={`hx-item${item.tone ? ` hx-${item.tone}` : ''}`}>
          <span className="hx-dot" aria-hidden />
          <div className="hx-event">{item.title}</div>
          {item.meta && <div className="hx-meta">{item.meta}</div>}
          {item.detail && <div className="hx-detail">{item.detail}</div>}
        </li>
      ))}
    </ol>
  );
}
