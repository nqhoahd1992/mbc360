import { useState } from 'react';
import { Card, DatePicker, Input, Modal, Select, Table, Tooltip, Typography } from 'antd';
import {
  CheckCircleFilled,
  ExclamationCircleFilled,
  LockOutlined,
  RightCircleFilled,
  WarningFilled,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { GateDecision, ProjectData, StageStatus } from '../types';
import { GATES, GATE_DECISIONS, STAGE_STATUSES } from '../config/gates';
import { useAppStore } from '../store/useAppStore';
import { currentGateIndex, gateIndex, isAwaitingDecision, isGatePassed } from '../utils/gateProgress';

export default function GateFlowTable({
  project,
  gateIds,
}: {
  project: ProjectData;
  gateIds: string[];
}) {
  const setGate = useAppStore((s) => s.setGate);
  const backtrackGate = useAppStore((s) => s.backtrackGate);
  const projectId = project.identity.id;
  const gates = project.gates;
  const currentIdx = currentGateIndex(project);

  const [backtrackFrom, setBacktrackFrom] = useState<string | null>(null);
  const [backtrackTo, setBacktrackTo] = useState<string | undefined>();
  const [backtrackReason, setBacktrackReason] = useState('');

  const openBacktrackModal = (fromGateId: string) => {
    setBacktrackFrom(fromGateId);
    setBacktrackTo(undefined);
    setBacktrackReason('');
  };

  const confirmBacktrack = () => {
    if (!backtrackFrom || !backtrackTo) return;
    backtrackGate(projectId, backtrackFrom, backtrackTo, backtrackReason.trim() || undefined);
    setBacktrackFrom(null);
  };

  const rows = gateIds
    .map((id) => ({
      meta: GATES.find((g) => g.id === id)!,
      record: gates.find((g) => g.gateId === id)!,
    }))
    .filter((r) => r.meta && r.record)
    .map((r) => ({
      ...r,
      passed: isGatePassed(gates, r.meta.id),
      awaitingDecision: isAwaitingDecision(gates, r.meta.id),
      isCurrent: gateIndex(r.meta.id) === currentIdx,
      locked: gateIndex(r.meta.id) > currentIdx,
    }));

  const backtrackFromMeta = backtrackFrom ? GATES.find((g) => g.id === backtrackFrom) : undefined;
  const backtrackTargetOptions = backtrackFrom
    ? GATES.filter((g) => gateIndex(g.id) < gateIndex(backtrackFrom)).map((g) => ({
        value: g.id,
        label: `Gate ${g.number} — ${g.name}`,
      }))
    : [];

  return (
    <Card
      size="small"
      title="Phase Gate Flow"
      extra={
        <span style={{ color: '#999' }}>
          A gate passes only when status is Complete and a Proceed / Proceed with Conditions
          decision is recorded
        </span>
      }
    >
      <Table
        size="small"
        rowKey={(r) => r.meta.id}
        dataSource={rows}
        pagination={false}
        scroll={{ x: 1150 }}
        rowClassName={(r) => (r.passed ? 'gate-row-passed' : r.locked ? 'gate-row-locked' : '')}
        columns={[
          {
            title: 'Gate',
            width: 90,
            render: (_, r) => (
              <span style={{ whiteSpace: 'nowrap' }}>
                {r.passed && <CheckCircleFilled style={{ color: '#52c41a', marginRight: 6 }} />}
                {r.record.status === 'Gap' && (
                  <Tooltip title="Gap identified — a deficiency was found and needs action">
                    <WarningFilled style={{ color: '#fa541c', marginRight: 6 }} />
                  </Tooltip>
                )}
                {r.awaitingDecision && r.record.status !== 'Gap' && (
                  <Tooltip title="Work is Complete — record a Proceed / Proceed with Conditions decision to pass this gate">
                    <ExclamationCircleFilled style={{ color: '#faad14', marginRight: 6 }} />
                  </Tooltip>
                )}
                {!r.passed && !r.awaitingDecision && r.record.status !== 'Gap' && r.isCurrent && (
                  <Tooltip title="Current gate">
                    <RightCircleFilled style={{ color: '#1677ff', marginRight: 6 }} />
                  </Tooltip>
                )}
                {r.locked && (
                  <Tooltip title="Locked — complete the previous gates first">
                    <LockOutlined style={{ color: '#bbb', marginRight: 6 }} />
                  </Tooltip>
                )}
                <b>{r.meta.number}</b>
              </span>
            ),
          },
          { title: 'Plain-English stage', width: 210, render: (_, r) => r.meta.name },
          {
            title: 'Objective / minimum output',
            width: 300,
            render: (_, r) => <span style={{ color: '#666' }}>{r.meta.purpose}</span>,
          },
          {
            title: 'Stage status',
            width: 140,
            render: (_, r) => (
              <Select
                size="small"
                style={{ width: 130 }}
                value={r.record.status}
                disabled={r.locked}
                options={STAGE_STATUSES.map((s) => ({ value: s, label: s }))}
                onChange={(v: StageStatus) => setGate(projectId, r.meta.id, { status: v })}
              />
            ),
          },
          {
            title: 'Gate decision',
            width: 170,
            render: (_, r) => (
              <span>
                <Select
                  size="small"
                  allowClear
                  placeholder="Decision"
                  style={{ width: 140 }}
                  value={r.record.decision}
                  disabled={r.locked}
                  status={r.awaitingDecision ? 'warning' : undefined}
                  options={GATE_DECISIONS.map((d) => ({ value: d, label: d }))}
                  onChange={(v: GateDecision | undefined) => {
                    if (v === 'Backtrack') {
                      openBacktrackModal(r.meta.id);
                      return;
                    }
                    setGate(projectId, r.meta.id, { decision: v });
                  }}
                />
                {r.awaitingDecision && (
                  <div style={{ fontSize: 11, color: '#d48806', marginTop: 2 }}>
                    Decision required to pass
                  </div>
                )}
              </span>
            ),
          },
          {
            title: 'Owner',
            width: 140,
            render: (_, r) => (
              <Input
                size="small"
                value={r.record.owner}
                placeholder={r.meta.primaryOwner}
                disabled={r.locked}
                onChange={(e) => setGate(projectId, r.meta.id, { owner: e.target.value })}
              />
            ),
          },
          {
            title: 'Due date',
            width: 130,
            render: (_, r) => (
              <DatePicker
                size="small"
                value={r.record.dueDate ? dayjs(r.record.dueDate) : null}
                disabled={r.locked}
                onChange={(d) => setGate(projectId, r.meta.id, { dueDate: d ? d.format('YYYY-MM-DD') : undefined })}
              />
            ),
          },
          {
            title: 'Evidence / link',
            width: 150,
            render: (_, r) => (
              <Input
                size="small"
                value={r.record.evidenceLink}
                placeholder="link"
                disabled={r.locked}
                onChange={(e) => setGate(projectId, r.meta.id, { evidenceLink: e.target.value })}
              />
            ),
          },
          {
            title: 'Notes / blockers',
            width: 190,
            render: (_, r) => (
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 4 }}
                size="small"
                value={r.record.notes}
                disabled={r.locked}
                onChange={(e) => setGate(projectId, r.meta.id, { notes: e.target.value })}
              />
            ),
          },
        ]}
      />

      <Modal
        title={backtrackFromMeta ? `Backtrack from Gate ${backtrackFromMeta.number}` : 'Backtrack'}
        open={!!backtrackFrom}
        onOk={confirmBacktrack}
        onCancel={() => setBacktrackFrom(null)}
        okText="Confirm backtrack"
        okButtonProps={{ danger: true, disabled: !backtrackTo }}
      >
        <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
          A backtrack reopens an earlier gate (and everything in between) for rework. Those gates
          return to "Not Started", and any phase already approved on the strength of them will
          require sign-off again.
        </Typography.Paragraph>
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 4, fontWeight: 600 }}>Backtrack to which gate?</div>
          <Select
            style={{ width: '100%' }}
            placeholder="Select an earlier gate to reopen"
            value={backtrackTo}
            onChange={setBacktrackTo}
            options={backtrackTargetOptions}
          />
        </div>
        <div>
          <div style={{ marginBottom: 4, fontWeight: 600 }}>Reason (optional)</div>
          <Input.TextArea
            rows={2}
            value={backtrackReason}
            onChange={(e) => setBacktrackReason(e.target.value)}
            placeholder="Why is this backtrack required?"
          />
        </div>
      </Modal>
    </Card>
  );
}
