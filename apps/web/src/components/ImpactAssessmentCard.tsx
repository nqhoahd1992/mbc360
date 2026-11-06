import { useState } from 'react';
import { Button, Input, Select } from 'antd';
import type { ImpactAssessmentRecord, ProjectData } from '@mbc360/shared/types';
import { IMPACT_CONCLUSIONS } from '@mbc360/shared/types';
import { REVIEW_ROLES } from '@mbc360/shared/config/reviewers';
import { IMPACT_DATASET_LABELS, impactConclusionProblem, isImpactOverdue } from '@mbc360/shared/utils/impactAssessments';
import { useAppStore } from '../store/useAppStore';
import { useSession } from '../auth/useSession';
import Notice from './Notice';
import '../styles/concept.css';
import './ImpactAssessmentCard.css';

// Round 5 question 1(d), our reading of the details [ASSUMPTION: R6-Q6]. A change to the company lists that this project relies on
// opens an impact assessment here. Each function named on it records what the change means for this project; a Critical change holds
// the release gates and the launch of the markets it covers until every function has. The person who raised it cannot conclude it,
// and an administrator is not the holder of a function — the server enforces both, this only says so.
const norm = (s?: string) => (s ?? '').trim().toLowerCase();

function ConcludeForm({ project, a, functionKey }: { project: ProjectData; a: ImpactAssessmentRecord; functionKey: string }) {
  const conclude = useAppStore((s) => s.concludeImpactAssessment);
  const [conclusion, setConclusion] = useState<string>('');
  const [rationale, setRationale] = useState('');
  const [linked, setLinked] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const problem = conclusion
    ? impactConclusionProblem({ conclusion, rationale, linkedChangeId: linked }, project.changes.map((c) => c.changeId))
    : 'Choose a conclusion';
  return (
    <div className="ia-form">
      <Select
        placeholder="Conclusion"
        value={conclusion || undefined}
        options={IMPACT_CONCLUSIONS.map((c) => ({ value: c, label: c }))}
        onChange={(v) => setConclusion(v)}
        style={{ minWidth: 220 }}
      />
      {conclusion === 'Impact on this project' && (
        <Select
          placeholder="Change Control record that deals with it"
          value={linked || undefined}
          options={project.changes.map((c) => ({ value: c.changeId, label: c.changeId }))}
          onChange={(v) => setLinked(v)}
          style={{ minWidth: 260 }}
          notFoundContent="Open a Change Control record first"
        />
      )}
      <Input.TextArea
        className="ia-wide"
        autoSize={{ minRows: 2, maxRows: 5 }}
        placeholder="Rationale"
        value={rationale}
        onChange={(e) => setRationale(e.target.value)}
      />
      <Button
        type="primary"
        loading={busy}
        disabled={!!problem}
        title={problem ?? undefined}
        onClick={() => {
          setBusy(true);
          void conclude(project.identity.id, a.id, { functionKey, conclusion, rationale, linkedChangeId: linked || undefined }).finally(() =>
            setBusy(false),
          );
        }}
      >
        Record conclusion
      </Button>
    </div>
  );
}

export default function ImpactAssessmentCard({ project }: { project: ProjectData }) {
  const { user } = useSession();
  const list = project.impactAssessments ?? [];
  if (list.length === 0) return null;
  const today = new Date().toISOString().slice(0, 10);
  const open = list.filter((a) => !a.concludedAt);
  const ordered = [...open, ...list.filter((a) => a.concludedAt)];
  return (
    <section className="c-card ia-card" id="sec-impact-assessments">
      <div className="ia-head">
        <h2 className="ia-title">Impact of changes to the company lists</h2>
        <span className="ia-count">
          {open.length} open · {list.length - open.length} concluded
        </span>
      </div>
      {ordered.map((a) => {
        const held = a.critical && !a.concludedAt;
        return (
          <div key={a.id} className={`ia-item${held ? ' ia-item-held' : ''}`}>
            <div className="ia-item-head">
              <b>{a.subject}</b>
              <span className="c-tag">{IMPACT_DATASET_LABELS[a.dataset]}</span>
              {a.critical && <span className="c-tag c-tag-bad">Critical</span>}
              {a.concludedAt ? (
                <span className="c-tag c-tag-ok">Concluded</span>
              ) : isImpactOverdue(a, today) ? (
                <span className="c-tag c-tag-warn">Overdue — due {a.dueDate}</span>
              ) : (
                <span className="c-tag">Due {a.dueDate}</span>
              )}
            </div>
            <div className="ia-summary">
              {a.summary} · raised by {a.raisedBy || 'unknown'} on {a.raisedAt.slice(0, 10)}
              {a.reason ? ` · ${a.reason}` : ''}
            </div>
            {held && (
              <Notice tone="bad" title="Release is on hold">
                Gates 10 to 12 cannot pass{a.markets.length > 0 ? `, and ${a.markets.join(', ')} cannot be approved or recorded as launched,` : ''} until
                every function below has concluded.
              </Notice>
            )}
            <ul className="ia-fns">
              {a.functionKeys.map((k) => {
                const label = REVIEW_ROLES.find((r) => r.key === k)?.label ?? k;
                const holder = project.identity.reviewers?.[k];
                const done = a.conclusions.find((c) => c.functionKey === k);
                const mine = !!holder && norm(holder) === norm(user?.displayName) && a.raisedById !== user?.id;
                return (
                  <li key={k}>
                    <div className="ia-fn-line">
                      <b>{label}</b> — {holder ? holder : <span className="ia-unassigned">Unassigned (the Lead assigns one in Project team)</span>}
                    </div>
                    {done ? (
                      <div className="ia-done">
                        {done.conclusion}
                        {done.linkedChangeId ? ` (${done.linkedChangeId})` : ''} — {done.rationale} · {done.concludedBy}, {done.concludedAt.slice(0, 10)}
                      </div>
                    ) : a.concludedAt ? null : mine ? (
                      <ConcludeForm project={project} a={a} functionKey={k} />
                    ) : (
                      <div className="ia-wait">{holder ? `Waiting for ${holder}` : 'Waiting for someone to be assigned'}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
