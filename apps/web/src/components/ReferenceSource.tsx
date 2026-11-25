import './ReferenceSource.css';
import { REFERENCE_SOURCE_TEXT, type ReferenceSourceKind } from '../utils/referenceSource';

// The line under a reference field that says where its values come from (project owner, 2026-11-25), so the link between a
// register and the data behind it is visible. The wording lives in utils/referenceSource.ts, one place for every field.
export default function ReferenceSource({ kind, text }: { kind?: ReferenceSourceKind; text?: string }) {
  const line = text ?? (kind ? REFERENCE_SOURCE_TEXT[kind] : undefined);
  return line ? <span className="ref-source">{line}</span> : null;
}
