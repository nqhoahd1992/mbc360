import { useMemo } from 'react';
import { Alert, Card, DatePicker, Input, Select, Table } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { PhaseClosure, SignOff } from '@mbc360/shared/types';
import type { PhaseCompletionChecklist } from '@mbc360/shared/utils/gateProgress';
import { GATE_DECISIONS, PHASES } from '@mbc360/shared/config/gates';
import { useAppStore } from '../store/useAppStore';
import { canApprovePhase, roleLabel } from '../utils/roles';
import { patchArray, useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';

interface ClosureDraft {
  evidenceSummary: string;
  signOffs: SignOff[];
}

export default function SignOffBlock({
  projectId,
  phase,
  closure,
  checklist,
}: {
  projectId: string;
  phase: number;
  closure: PhaseClosure;
  checklist: PhaseCompletionChecklist;
}) {
  const setEvidenceSummary = useAppStore((s) => s.setEvidenceSummary);
  const setSignOffsBulk = useAppStore((s) => s.setSignOffsBulk);
  const viewRole = useAppStore((s) => s.viewRole);

  // useDraft compares the committed value by reference, so this composite
  // must stay referentially stable across renders that don't actually change
  // evidenceSummary/signOffs.
  const committed = useMemo<ClosureDraft>(
    () => ({ evidenceSummary: closure.evidenceSummary ?? '', signOffs: closure.signOffs }),
    [closure.evidenceSummary, closure.signOffs],
  );
  const { draft, dirty, update, markSaved, discard } = useDraft(committed);

  // B3: sign-off only becomes available once the phase's other closure
  // conditions are met. N/A items count only when justified.
  const locked = !checklist.canSignOff;
  const missing = [
    !checklist.gatesPassed && 'all gates passed',
    !checklist.keyChecksDone && 'key gate checks done (or justified N/A)',
    !checklist.anglesCovered && 'all 8 angles covered (or justified N/A)',
    !checklist.actionsClosed && 'next actions closed (unless Proceed with Conditions)',
    !checklist.preWorkAccepted && 'pre-work reviewed and accepted',
  ].filter(Boolean) as string[];

  // A4 demo simulation: only the phase's responsible department (or admin) may
  // sign "Approved by"; anyone may fill Prepared/Reviewed (contribute rights).
  const canApprove = canApprovePhase(viewRole, phase);
  const rowDisabled = (r: SignOff) => locked || (r.role === 'Approved by' && !canApprove);
  const phaseDept = PHASES.find((p) => p.phase === phase)?.department;

  const patchSignOff = (index: number, p: Partial<SignOff>) =>
    update((prev) => ({ ...prev, signOffs: patchArray(prev.signOffs, index, p) }));
  const save = () => {
    setEvidenceSummary(projectId, phase, draft.evidenceSummary);
    setSignOffsBulk(projectId, phase, draft.signOffs);
    markSaved();
  };

  return (
    <Card size="small" title="Evidence Summary, Decision and Sign-Off">
      {locked && (
        <Alert
          type="warning"
          showIcon
          icon={<LockOutlined />}
          style={{ marginBottom: 12 }}
          title="Sign-off locked — closure conditions not yet met"
          description={`Still required before sign-off: ${missing.join('; ')}.`}
        />
      )}
      {!locked && !canApprove && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          title={`"Approved by" is restricted to ${phaseDept} — you are viewing as ${roleLabel(viewRole)}`}
          description="Prepared / Reviewed rows stay open to contributors. RBAC demo simulation — the real role matrix is pending confirmation (F6)."
        />
      )}
      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 4, fontWeight: 600 }}>
          Evidence summary / decision rationale
        </div>
        <Input.TextArea
          rows={3}
          value={draft.evidenceSummary}
          onChange={(e) => update((prev) => ({ ...prev, evidenceSummary: e.target.value }))}
        />
      </div>
      <Table
        size="small"
        rowKey={(r) => r.role}
        dataSource={draft.signOffs}
        pagination={false}
        scroll={{ x: 900 }}
        columns={[
          { title: 'Role', width: 120, dataIndex: 'role', render: (v) => <b>{v}</b> },
          {
            title: 'Name',
            width: 180,
            render: (_, r, i) => (
              <Input
                size="small"
                value={r.name}
                disabled={rowDisabled(r)}
                onChange={(e) => patchSignOff(i, { name: e.target.value })}
              />
            ),
          },
          {
            title: 'Signature / initials',
            width: 130,
            render: (_, r, i) => (
              <Input
                size="small"
                value={r.initials}
                disabled={rowDisabled(r)}
                onChange={(e) => patchSignOff(i, { initials: e.target.value })}
              />
            ),
          },
          {
            title: 'Date',
            width: 140,
            render: (_, r, i) => (
              <DatePicker
                size="small"
                value={r.date ? dayjs(r.date) : null}
                disabled={rowDisabled(r)}
                onChange={(d) => patchSignOff(i, { date: d ? d.format('YYYY-MM-DD') : undefined })}
              />
            ),
          },
          {
            title: 'Decision',
            width: 150,
            render: (_, r, i) => (
              <Select
                size="small"
                allowClear
                style={{ width: 140 }}
                value={r.decision}
                disabled={rowDisabled(r)}
                options={GATE_DECISIONS.map((d) => ({ value: d, label: d }))}
                onChange={(v) => patchSignOff(i, { decision: v })}
              />
            ),
          },
          {
            title: 'Comments / conditions',
            width: 260,
            render: (_, r, i) => (
              <Input
                size="small"
                value={r.comments}
                disabled={rowDisabled(r)}
                onChange={(e) => patchSignOff(i, { comments: e.target.value })}
              />
            ),
          },
        ]}
      />
      <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
    </Card>
  );
}
