// Reasons are written as a list, one line each, never as one sentence joined with semicolons (project owner, 2026-11-11: a run of
// clauses in one line is hard to read and understand). The text keeps its line breaks: the web app shows messages with
// `white-space: pre-line`, so the same string reads as a list in a toast, a banner and an API error.
export interface ReasonLine {
  label: string;
  // Further sentences about this reason, one per line, shown indented beneath it.
  detail?: string;
}

const bullet = (line: string): string => `• ${line}`;

// "• one\n• two"
export function bulletList(items: readonly string[]): string {
  return items.map(bullet).join('\n');
}

// A headline, the reasons as a list, and an optional closing sentence.
export function listMessage(headline: string, items: readonly string[], tail?: string): string {
  return [headline, bulletList(items), ...(tail ? [tail] : [])].join('\n');
}

// The same for reasons that carry a detail: the detail sits under its reason, indented.
export function reasonsMessage(headline: string, reasons: readonly ReasonLine[], tail?: string): string {
  const lines = reasons.map((r) =>
    r.detail
      ? [bullet(r.label), ...r.detail.split('\n').filter((l) => l.trim() !== '').map((l) => `   ${l}`)].join('\n')
      : bullet(r.label),
  );
  return [headline, ...lines, ...(tail ? [tail] : [])].join('\n');
}
