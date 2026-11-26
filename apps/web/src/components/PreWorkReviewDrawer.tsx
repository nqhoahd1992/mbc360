import { useMemo, useState } from 'react';
import { Checkbox, Input, Select } from 'antd';
import dayjs from 'dayjs';
import type { PreWorkEntry, ProjectData } from '@mbc360/shared/types';
import { PRE_WORK_DECISIONS, PRE_WORK_DECISIONS_NEEDING_NOTE, preWorkDecisionProblem, preWorkEntries, preWorkStatusTone } from '@mbc360/shared/utils/preWork';
import { useAppStore } from '../store/useAppStore';
import { useSession } from '../auth/useSession';
import { usePermissionView } from '../auth/previewMode';
import FormDrawer from './FormDrawer';

const KIND_LABEL: Record<PreWorkEntry['kind'], string> = { checklist: 'Checklist', requirement: 'Requirements', gateChecks: 'Key Gate Checks', register: 'Register' };

// Round 5 question 27: the marked entries of a phase that was worked on before it opened, with who entered each and when, and what its accountable owner decided.
// A decision is recorded from an explicit list — the rows ticked here — and only for the entries the person may decide. [ASSUMPTION: R6-Q35]
export default function PreWorkReviewDrawer({ project, phase, open, onClose }: { project: ProjectData; phase: number; open: boolean; onClose: () => void }) {
  const { user } = useSession();
  const view = usePermissionView();
  const review = useAppStore((s) => s.reviewPreWork);
  const entries = preWorkEntries(project, phase);
  const [picked, setPicked] = useState<Record<string, { decision: string; note: string }>>({});
  const [busy, setBusy] = useState(false);
  const actor = useMemo(() => ({ displayName: user?.displayName ?? '', isAdmin: view.isAdmin }), [user?.displayName, view.isAdmin]);
  const waiting = entries.filter((e) => e.status === 'Pre-work');
  const chosen = waiting.filter((e) => picked[e.id]);
  const incomplete = chosen.some((e) => PRE_WORK_DECISIONS_NEEDING_NOTE.includes(picked[e.id].decision) && picked[e.id].note.trim() === '');

  const toggle = (e: PreWorkEntry, on: boolean) =>
    setPicked((p) => {
      const next = { ...p };
      if (on) next[e.id] = next[e.id] ?? { decision: 'Accepted', note: '' };
      else delete next[e.id];
      return next;
    });
  const save = async () => {
    setBusy(true);
    try {
      const ok = await review(project.identity.id, phase, chosen.map((e) => ({ id: e.id, decision: picked[e.id].decision, ...(picked[e.id].note.trim() ? { note: picked[e.id].note.trim() } : {}) })));
      if (ok) setPicked({});
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormDrawer
      title={`Phase ${phase} pre-work`}
      open={open}
      onCancel={onClose}
      onOk={() => void save()}
      okText={chosen.length > 0 ? `Record ${chosen.length} decision${chosen.length > 1 ? 's' : ''}` : 'Record decisions'}
      okButtonProps={{ disabled: chosen.length === 0 || incomplete, loading: busy }}
      width={640}
    >
      <p className="rt-note" style={{ marginBottom: 14 }}>
        These tables were saved before this phase opened. Each is decided by the owner of its area: tick the entries to decide, pick Accepted, Updated (accepted after you
        corrected it) or Rejected (to be redone), and record. Safety and Regulatory areas are decided only by their accountable owner.
      </p>
      {entries.length === 0 && <p className="rt-note">Nothing in this phase was saved before it opened.</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
        {entries.map((e) => {
          const problem = e.status === 'Pre-work' ? preWorkDecisionProblem(project, e, actor) : undefined;
          const sel = picked[e.id];
          return (
            <li key={e.id} style={{ borderTop: '1px solid var(--c-border, #e5e7eb)', paddingTop: 10 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                {e.status === 'Pre-work' && <Checkbox checked={!!sel} disabled={!!problem} onChange={(ev) => toggle(e, ev.target.checked)} aria-label={`Decide ${e.label}`} />}
                <b>{e.label}</b>
                <span className="c-tag">{KIND_LABEL[e.kind]}</span>
                <span className={`c-tag c-tag-dot ${preWorkStatusTone(e.status)}`}>{e.status}</span>
              </div>
              <div className="rt-note" style={{ margin: '4px 0 0' }}>
                Entered by {e.enteredBy ?? '—'}
                {e.enteredAt ? ` on ${dayjs(e.enteredAt).format('YYYY-MM-DD')}` : ''}
                {e.reviewedBy ? ` · ${e.status.toLowerCase()} by ${e.reviewedBy} on ${e.reviewedAt ? dayjs(e.reviewedAt).format('YYYY-MM-DD') : '—'}` : ''}
                {e.note ? ` — ${e.note}` : ''}
              </div>
              {problem && <div className="rt-note" style={{ margin: '4px 0 0' }}>{problem}</div>}
              {sel && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  <Select
                    style={{ width: 160 }}
                    value={sel.decision}
                    options={PRE_WORK_DECISIONS.map((d) => ({ value: d, label: d }))}
                    onChange={(v: string) => setPicked((p) => ({ ...p, [e.id]: { ...p[e.id], decision: v } }))}
                  />
                  {PRE_WORK_DECISIONS_NEEDING_NOTE.includes(sel.decision) && (
                    <Input
                      style={{ flex: '1 1 240px' }}
                      placeholder={sel.decision === 'Updated' ? 'What was corrected' : 'What is wrong and must be redone'}
                      value={sel.note}
                      onChange={(ev) => setPicked((p) => ({ ...p, [e.id]: { ...p[e.id], note: ev.target.value } }))}
                    />
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </FormDrawer>
  );
}
