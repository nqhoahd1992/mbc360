import { useMemo, useState } from 'react';
import { App, Button, Checkbox, Input, Select, message } from 'antd';
import { useParams } from 'react-router-dom';
import type { ChangeRecord } from '@mbc360/shared/types';
import { GATES } from '@mbc360/shared/config/gates';
import { isChangeOpen } from '@mbc360/shared/config/changeTriggers';
import {
  TRIAGE_ADMINISTRATIVE,
  TRIAGE_MATERIAL,
  TRIAGE_NOT_MATERIAL,
  TRIAGE_OUTCOMES,
  isTriageRecorded,
  suggestedScopeGateIds,
  triageProblems,
} from '@mbc360/shared/utils/changeTriage';
import { useAppStore } from '../store/useAppStore';
import Notice from './Notice';
import { RecordField } from './RecordList';
import './DynamicTable.css';

// Round 5 question 10: the controlled impact assessment of a change. Until Quality's change-control reviewer records it, the change holds the readiness of
// the gates it can affect; a Material outcome reopens the gates Quality confirms, keeping the earlier decisions in history. The server writes who and
// when, and refuses anyone who does not hold the Quality / change-control function on this project. [ASSUMPTION: R6-Q16]
const OUTCOME_HELP: Record<string, string> = {
  [TRIAGE_MATERIAL]: 'The change invalidates decisions already taken. The gates chosen below are reopened, and each has to be decided again.',
  [TRIAGE_NOT_MATERIAL]: 'The change does not invalidate any decision. Nothing is reopened.',
  [TRIAGE_ADMINISTRATIVE]: 'A justified administrative correction, kept as a controlled addendum. Nothing is reopened.',
};

// The scope is picked a phase at a time (three gates each) rather than from one twelve-tag box.
const PHASE_GROUPS = [1, 2, 3, 4].map((phase) => ({
  phase,
  options: GATES.filter((g) => g.phase === phase).map((g) => ({ value: g.id, label: `Gate ${g.number}`, title: g.name })),
}));

// What the panel's summary strip says about the triage, and which gates the change is holding until it is recorded.
export function triageSummary(change: ChangeRecord): { label: string; tone: string; pending: boolean; holds?: string } {
  if (isTriageRecorded(change)) return { label: `Impact: ${change.impactTriage}`, tone: 'c-tag-ok', pending: false };
  if (!isChangeOpen(change.status)) return { label: 'Closed without impact assessment', tone: '', pending: false };
  const scope = suggestedScopeGateIds(change).map((id) => GATES.find((g) => g.id === id)?.number ?? id);
  const range = scope.length > 1 ? `Gates ${scope[0]}\u2013${scope[scope.length - 1]}` : `Gate ${scope[0]}`;
  return { label: 'Impact not assessed', tone: 'c-tag-warn', pending: true, holds: `Holds ${range} until assessed` };
}

export default function ChangeTriageBlock({ change }: { change: ChangeRecord }) {
  const { projectId } = useParams();
  const triageChange = useAppStore((s) => s.triageChange);
  const { modal } = App.useApp();
  const suggested = useMemo(() => suggestedScopeGateIds(change), [change]);
  const [outcome, setOutcome] = useState<string | undefined>();
  const [scope, setScope] = useState<string[]>(suggested);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  if (isTriageRecorded(change)) {
    const gates = (change.confirmedGates ?? []).map((id) => GATES.find((g) => g.id === id)?.number ?? id);
    return (
      <dl className="rt-dl">
        <dt>Outcome</dt>
        <dd>{change.impactTriage}</dd>
        <dt>Assessed by</dt>
        <dd>
          {change.triageBy ?? '—'}
          {change.triageDate ? ` · ${change.triageDate}` : ''}
        </dd>
        <dt>Reason</dt>
        <dd>{change.triageReason ?? '—'}</dd>
        {gates.length > 0 && (
          <>
            <dt>Confirmed scope</dt>
            <dd>Gates {gates.join(', ')}</dd>
          </>
        )}
      </dl>
    );
  }
  if (!isChangeOpen(change.status)) {
    return <p className="rt-muted" style={{ margin: 0, fontSize: 13 }}>This change was closed without an impact assessment.</p>;
  }

  const problems = triageProblems({ outcome: outcome ?? '', confirmedGates: outcome === TRIAGE_MATERIAL ? scope : [], reason });

  const record = async () => {
    if (!projectId || !outcome) return;
    setBusy(true);
    try {
      const ok = await triageChange(projectId, change.changeId, { outcome, confirmedGates: outcome === TRIAGE_MATERIAL ? scope : [], reason: reason.trim() });
      if (ok) message.success(`${change.changeId}: impact recorded as "${outcome}"`);
    } finally {
      setBusy(false);
    }
  };
  const confirm = () => {
    if (outcome !== TRIAGE_MATERIAL) return void record();
    modal.confirm({
      title: `Reopen the gates this change invalidates?`,
      content: `Every gate in the confirmed scope that has passed goes back to Not Started and has to be decided again. The earlier decisions and signatures stay in the project history.`,
      okText: 'Record and reopen',
      onOk: record,
    });
  };

  return (
    <div>
      <Notice tone="warn" title="Impact not assessed yet">
        Until Quality's change-control reviewer records whether this change is material, it holds the readiness of the gates it can affect.
      </Notice>
      <div className="rt-grid">
        <RecordField label="Outcome" wide>
          <Select
            style={{ width: '100%' }}
            placeholder="Select the outcome"
            value={outcome}
            options={TRIAGE_OUTCOMES.map((o) => ({ value: o, label: o }))}
            onChange={setOutcome}
          />
          {outcome && <p className="rt-note">{OUTCOME_HELP[outcome]}</p>}
        </RecordField>
        {outcome === TRIAGE_MATERIAL && (
          <RecordField label="Confirmed scope — gates this change invalidates" wide>
            <div className="cc-scope">
              {PHASE_GROUPS.map((group) => (
                <div key={group.phase} className="cc-scope-row">
                  <span className="cc-scope-phase">Phase {group.phase}</span>
                  <Checkbox.Group
                    options={group.options}
                    value={scope.filter((id) => group.options.some((o) => o.value === id))}
                    onChange={(picked) =>
                      setScope([...scope.filter((id) => !group.options.some((o) => o.value === id)), ...(picked as string[])])
                    }
                  />
                </div>
              ))}
            </div>
            <p className="rt-note">The trigger suggests a minimum; widen it where the change reaches further. Gates that have not passed yet are unaffected.</p>
          </RecordField>
        )}
        <RecordField label="Reason" wide>
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} value={reason} placeholder="Why this outcome" onChange={(e) => setReason(e.target.value)} />
        </RecordField>
      </div>
      <div style={{ marginTop: 16 }}>
        <Button type="primary" disabled={problems.length > 0 || busy} loading={busy} onClick={confirm}>
          Record impact assessment
        </Button>
        <p className="rt-note" style={{ marginTop: 8 }}>
          {problems.length > 0 ? `Still needs: ${problems.join('; ')}. ` : ''}
          Only the project's Quality / change-control reviewer can record this.
        </p>
      </div>
    </div>
  );
}
