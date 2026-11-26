import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Checkbox, Input, Modal, Radio, message } from 'antd';
import { REGISTER_APPLICABILITY } from '@mbc360/shared/config/registerApplicability';
import {
  APPLICABILITY_REGISTER,
  CLAIMS_REGISTER,
  NO_CLAIMS_CHECKS,
  applicabilityState,
  decisionGaps,
  decisionRowOf,
  registerTitle,
} from '@mbc360/shared/utils/registerApplicability';
import type { RegisterRow } from '@mbc360/shared/types';
import { useSession } from '../auth/useSession';
import { useAppStore } from '../store/useAppStore';

// Round 5 question 31: what the SME's table says about this register, and — where a reviewed decision may stand in for entries — the decision itself:
// reuse of an approved record, or "not applicable" with its rationale. The decision is one row of the Register Applicability Decisions register, recorded in
// the signed-in person's own name. [ASSUMPTION: R6-Q39]
const STATE_TEXT = {
  entries: ['c-tag-ok', 'Entries recorded'],
  reuse: ['c-tag-ok', 'Reusing an approved record'],
  notApplicable: ['c-tag-ok', 'Reviewed as not applicable'],
  open: ['c-tag-warn', 'Needs entries or a decision'],
} as const;

export default function RegisterApplicabilityBlock({ registerKey, readOnly }: { registerKey: string; readOnly?: boolean }) {
  const { projectId } = useParams();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const setRegisterRowsBulk = useAppStore((s) => s.setRegisterRowsBulk);
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState<string>('');
  const [rationale, setRationale] = useState('');
  const [link, setLink] = useState('');
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const spec = REGISTER_APPLICABILITY[registerKey];
  if (!project || !spec || registerKey === APPLICABILITY_REGISTER || spec.rule === 'Own rules') return null;

  const canDecide = spec.decisions.length > 0 && !spec.ownRecord;
  const state = applicabilityState(project, registerKey);
  // A register nothing requires (Reference, Optional, event records) is not flagged as unfinished; one that needs entries but takes no decision says only that.
  const demanding = spec.rule === 'Required' || spec.rule === 'Scope-dependent' || spec.rule === 'Conditional';
  let [tone, stateLabel]: [string, string] = [...STATE_TEXT[state]];
  if (state === 'open' && !demanding) [tone, stateLabel] = ['', spec.rule === 'Reference' ? 'Controlled reference' : 'No gate requires entries'];
  else if (state === 'open' && !canDecide) stateLabel = 'Needs entries';
  const row = decisionRowOf(project, registerKey);
  const gaps = row ? decisionGaps(project, registerKey, row) : [];
  const isClaims = registerKey === CLAIMS_REGISTER;

  const begin = () => {
    setDecision(String(row?.decision ?? (spec.decisions[0] === 'reuse' ? 'Reuse approved record' : 'Not applicable')));
    setRationale(String(row?.rationale ?? ''));
    setLink(String(row?.evidenceLink ?? ''));
    setChecks(Object.fromEntries(NO_CLAIMS_CHECKS.map(([k]) => [k, row?.[k] === true])));
    setOpen(true);
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const title = registerTitle(registerKey);
    const rows = (project.registers[APPLICABILITY_REGISTER] ?? []).filter((r) => String(r.register ?? '') !== title);
    const next: RegisterRow = {
      register: title,
      decision,
      rationale,
      evidenceLink: decision === 'Reuse approved record' ? link : '',
      decidedBy: user.displayName,
      ...(isClaims ? Object.fromEntries(NO_CLAIMS_CHECKS.map(([k]) => [k, !!checks[k]])) : {}),
    };
    const ok = await setRegisterRowsBulk(project.identity.id, APPLICABILITY_REGISTER, [...rows, next]);
    setSaving(false);
    if (ok) {
      message.success('Decision recorded');
      setOpen(false);
    }
  };

  const noClaimsLabel = isClaims ? '"No claims" record' : 'Applicability decision';
  return (
    <div className="rt-note" style={{ margin: '0 0 8px', padding: '10px 14px 0' }}>
      <p style={{ margin: 0 }}>
        <span className={`c-tag c-tag-dot ${tone}`}>{stateLabel}</span> <b>{spec.rule}</b> — {spec.note}
      </p>
      {row && state !== 'entries' && gaps.length > 0 && (
        <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
          {gaps.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      )}
      {row && gaps.length === 0 && (
        <p style={{ margin: '6px 0 0' }}>
          {String(row.decision)} — {String(row.rationale ?? '')}
          {row.evidenceLink ? ` · ${String(row.evidenceLink)}` : ''} · {String(row.decidedBy ?? '—')}
          {row.decidedOn ? ` · ${String(row.decidedOn)}` : ''}
        </p>
      )}
      {canDecide && !readOnly && (
        <p style={{ margin: '8px 0 0' }}>
          <Button size="small" onClick={begin}>
            {row ? `Revise the ${noClaimsLabel.toLowerCase()}` : `Record ${isClaims ? 'the "no claims" record' : 'a decision'}`}
          </Button>
        </p>
      )}
      <Modal
        open={open}
        title={`${registerTitle(registerKey)} — ${noClaimsLabel.toLowerCase()}`}
        onCancel={() => setOpen(false)}
        onOk={save}
        okText="Record as me"
        confirmLoading={saving}
        destroyOnHidden
      >
        <Radio.Group value={decision} onChange={(e) => setDecision(e.target.value)} style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
          {spec.decisions.includes('reuse') && <Radio value="Reuse approved record">Reuse an approved record (its version and applicability are confirmed)</Radio>}
          {spec.decisions.includes('na') && <Radio value="Not applicable">{isClaims ? 'No claims are proposed' : 'Not applicable to this project'}</Radio>}
        </Radio.Group>
        {decision === 'Reuse approved record' && (
          <label style={{ display: 'block', marginBottom: 12 }}>
            <div>Approved record reused (link)<span className="as-req">&nbsp;*</span></div>
            <Input value={link} onChange={(e) => setLink(e.target.value)} />
          </label>
        )}
        {decision === 'Not applicable' && spec.naNeedsAdministrativeOnly && (
          <p className="au-field-help">Accepted only while the project is confirmed as administrative-only (Project Overview → assessments).</p>
        )}
        {isClaims && decision === 'Not applicable' && (
          <div style={{ display: 'grid', gap: 4, marginBottom: 12 }}>
            <div>Checked for express or implied efficacy claims<span className="as-req">&nbsp;*</span></div>
            {NO_CLAIMS_CHECKS.map(([key, what]) => (
              <Checkbox key={key} checked={!!checks[key]} onChange={(e) => setChecks((c) => ({ ...c, [key]: e.target.checked }))}>
                {what[0].toUpperCase() + what.slice(1)}
              </Checkbox>
            ))}
          </div>
        )}
        <label style={{ display: 'block' }}>
          <div>{decision === 'Reuse approved record' ? 'Why the approved record applies (its version and scope)' : 'Reviewed rationale'}<span className="as-req">&nbsp;*</span></div>
          <Input.TextArea autoSize={{ minRows: 3 }} value={rationale} onChange={(e) => setRationale(e.target.value)} />
        </label>
      </Modal>
    </div>
  );
}
