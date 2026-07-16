import { Alert, Card, DatePicker, Input, Select, Table } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { PhaseClosure, SignOff } from '../types';
import type { PhaseCompletionChecklist } from '../utils/gateProgress';
import { GATE_DECISIONS, PHASES } from '../config/gates';
import { useAppStore } from '../store/useAppStore';
import { canApprovePhase, roleLabel } from '../utils/roles';

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
  const setSignOff = useAppStore((s) => s.setSignOff);
  const setClosureField = useAppStore((s) => s.setClosureField);
  const viewRole = useAppStore((s) => s.viewRole);

  // B3: sign-off only becomes available once the phase's other closure
  // conditions are met. N/A items count only when justified.
  const locked = !checklist.canSignOff;
  const missing = [
    !checklist.gatesPassed && 'all gates passed',
    !checklist.keyChecksDone && 'key gate checks done (or justified N/A)',
    !checklist.anglesCovered && 'all 8 angles covered (or justified N/A)',
    !checklist.actionsClosed && 'next actions closed (unless Proceed with Conditions)',
  ].filter(Boolean) as string[];

  // A4 demo simulation: only the phase's responsible department (or admin) may
  // sign "Approved by"; anyone may fill Prepared/Reviewed (contribute rights).
  const canApprove = canApprovePhase(viewRole, phase);
  const rowDisabled = (r: SignOff) => locked || (r.role === 'Approved by' && !canApprove);
  const phaseDept = PHASES.find((p) => p.phase === phase)?.department;

  return (
    <Card size="small" title="Evidence Summary, Decision and Sign-Off">
      {locked && (
        <Alert
          type="warning"
          showIcon
          icon={<LockOutlined />}
          style={{ marginBottom: 12 }}
          message="Sign-off locked — closure conditions not yet met"
          description={`Still required before sign-off: ${missing.join('; ')}.`}
        />
      )}
      {!locked && !canApprove && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message={`"Approved by" is restricted to ${phaseDept} — you are viewing as ${roleLabel(viewRole)}`}
          description="Prepared / Reviewed rows stay open to contributors. RBAC demo simulation — the real role matrix is pending confirmation (F6)."
        />
      )}
      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 4, fontWeight: 600 }}>
          Evidence summary / decision rationale
        </div>
        <Input.TextArea
          rows={3}
          value={closure.evidenceSummary}
          onChange={(e) => setClosureField(projectId, phase, 'evidenceSummary', e.target.value)}
        />
      </div>
      <Table
        size="small"
        rowKey={(r) => r.role}
        dataSource={closure.signOffs}
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
                onChange={(e) => setSignOff(projectId, phase, i, { name: e.target.value })}
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
                onChange={(e) => setSignOff(projectId, phase, i, { initials: e.target.value })}
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
                onChange={(d) => setSignOff(projectId, phase, i, { date: d ? d.format('YYYY-MM-DD') : undefined })}
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
                onChange={(v) => setSignOff(projectId, phase, i, { decision: v })}
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
                onChange={(e) => setSignOff(projectId, phase, i, { comments: e.target.value })}
              />
            ),
          },
        ]}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <Input
          style={{ flex: 2, minWidth: 220 }}
          addonBefore="Next action"
          value={closure.nextAction}
          onChange={(e) => setClosureField(projectId, phase, 'nextAction', e.target.value)}
        />
        <DatePicker
          placeholder="Next due date"
          value={closure.nextDueDate ? dayjs(closure.nextDueDate) : null}
          onChange={(d) =>
            setClosureField(projectId, phase, 'nextDueDate', d ? d.format('YYYY-MM-DD') : '')
          }
        />
        <Input
          style={{ flex: 1, minWidth: 160 }}
          addonBefore="Owner"
          value={closure.nextOwner}
          onChange={(e) => setClosureField(projectId, phase, 'nextOwner', e.target.value)}
        />
      </div>
    </Card>
  );
}
