import { Link } from 'react-router-dom';
import type { ChangeRecord } from '@mbc360/shared/types';
import { getChangeTrigger, openChangesAffectingGate } from '@mbc360/shared/config/changeTriggers';
import { useAppStore } from '../store/useAppStore';
import Notice from './Notice';

// F9 (SME, 2026-07-21): an open Change Control "should show a prominent warning on the affected project,
// formula version, market and gate, identify the open change and its owner". The gate row and the project
// overview already did; this is the same warning on the pages for the formula and for the markets.
//
// `gateNumbers` are the gates the page is about ('05' for the Formula BOM, '10'-'12' for the market tracks).
// A change is listed when its trigger names one of them (or ALL), the same rule the gate rows use.
export default function OpenChangesNotice({
  projectId,
  gateNumbers,
  scope,
  note,
}: {
  projectId: string;
  gateNumbers: string[];
  // What the warning is about, in a phrase: "the formula" / "the market tracks".
  scope: string;
  // One extra sentence, for a limit the reader should know about.
  note?: string;
}) {
  const changes = useAppStore((s) => s.changes);
  const found = new Map<string, ChangeRecord>();
  for (const gateNumber of gateNumbers) {
    for (const c of openChangesAffectingGate(changes, projectId, gateNumber)) found.set(c.changeId, c);
  }
  const open = [...found.values()];
  if (open.length === 0) return null;

  return (
    <Notice
      tone="warn"
      title={`${open.length} open change control record${open.length === 1 ? '' : 's'} affect${open.length === 1 ? 's' : ''} ${scope}`}
      action={<Link to={`/projects/${projectId}/change-control`}>Open Change Control</Link>}
    >
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {open.map((c) => (
          <li key={c.changeId}>
            <b>{c.changeId}</b> · {getChangeTrigger(c.triggerId)?.label ?? c.trigger} · {c.status} · owner{' '}
            {c.owner?.trim() || 'not named'} · {(c.markets ?? []).length > 0 ? c.markets!.join(', ') : 'every market'}
          </li>
        ))}
      </ul>
      {note && <div style={{ marginTop: 4 }}>{note}</div>}
    </Notice>
  );
}
