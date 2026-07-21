import { useState } from 'react';
import { Card, DatePicker, Input, Modal, Select, Table, Tooltip, Typography } from 'antd';
import {
  CheckCircleFilled,
  ExclamationCircleFilled,
  GlobalOutlined,
  LockOutlined,
  RightCircleFilled,
  WarningFilled,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { GateDecision, ProjectData, StageStatus } from '@mbc360/shared/types';
import { GATES, GATE_DECISIONS, STAGE_STATUSES } from '@mbc360/shared/config/gates';
import { getChangeTrigger, isChangeOpen } from '@mbc360/shared/config/changeTriggers';
import { useAppStore } from '../store/useAppStore';
import { currentGateIndex, gateBlockers, gateIndex, isAwaitingDecision, isGatePassed } from '@mbc360/shared/utils/gateProgress';
import { canDecideGate, roleLabel } from '../utils/roles';

export default function GateFlowTable({
  project,
  gateIds,
}: {
  project: ProjectData;
  gateIds: string[];
}) {
  const setGate = useAppStore((s) => s.setGate);
  const backtrackGate = useAppStore((s) => s.backtrackGate);
  const changes = useAppStore((s) => s.changes);
  const viewRole = useAppStore((s) => s.viewRole);
  const projectId = project.identity.id;
  const gates = project.gates;
  const currentIdx = currentGateIndex(project);

  const [backtrackFrom, setBacktrackFrom] = useState<string | null>(null);
  const [backtrackTo, setBacktrackTo] = useState<string | undefined>();
  const [backtrackReason, setBacktrackReason] = useState('');
  const [backtrackInitiatedBy, setBacktrackInitiatedBy] = useState('');

  const openBacktrackModal = (fromGateId: string) => {
    setBacktrackFrom(fromGateId);
    setBacktrackTo(undefined);
    setBacktrackReason('');
    setBacktrackInitiatedBy('');
  };

  const confirmBacktrack = () => {
    if (!backtrackFrom || !backtrackTo) return;
    backtrackGate(
      projectId,
      backtrackFrom,
      backtrackTo,
      backtrackReason.trim() || undefined,
      backtrackInitiatedBy.trim() || undefined,
    );
    setBacktrackFrom(null);
  };

  // C4 (confirmed): an open change control record linked to a gate soft-locks
  // that gate — a visible warning until the change is assessed and closed.
  const openChangesForGate = (gateNumber: string) =>
    changes.filter((c) => {
      if (c.projectId !== projectId || !isChangeOpen(c.status)) return false;
      const trigger = getChangeTrigger(c.triggerId);
      if (!trigger) return false;
      return trigger.gates.includes('ALL') || trigger.gates.includes(gateNumber);
    });

  const rows = gateIds
    .map((id) => ({
      meta: GATES.find((g) => g.id === id)!,
      record: gates.find((g) => g.gateId === id)!,
    }))
    .filter((r) => r.meta && r.record)
    .map((r) => ({
      ...r,
      passed: isGatePassed(project, r.meta.id),
      awaitingDecision: isAwaitingDecision(project, r.meta.id),
      blockers: gateBlockers(project, r.meta.id),
      openChanges: openChangesForGate(r.meta.number),
      // A4 demo simulation: only the gate's primary-owner function may decide.
      canDecide: canDecideGate(viewRole, r.meta.id),
      // C5 soft check (per-market hard blocks live in Market Tracking; the
      // project-level effect of a partially-ready market set is follow-up F4).
      marketsNotReady:
        r.meta.id === 'SG11'
          ? project.marketTracks.filter((t) => t.launchApproval !== 'Approved' && t.launchApproval !== 'N/A')
          : [],
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
          A gate passes only when status is Complete, a Proceed / Proceed with Conditions decision
          is recorded, and no blockers remain (open next actions, mandatory safety screens)
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
                {r.openChanges.length > 0 && (
                  <Tooltip
                    title={`Soft lock — open change control record${r.openChanges.length > 1 ? 's' : ''} affecting this gate: ${r.openChanges
                      .map((c) => c.changeId)
                      .join(', ')}. Assess and close the change before relying on this gate.`}
                  >
                    <WarningFilled style={{ color: '#faad14', marginLeft: 6 }} />
                  </Tooltip>
                )}
                {r.marketsNotReady.length > 0 && (
                  <Tooltip
                    title={`Markets not launch-approved yet: ${r.marketsNotReady
                      .map((t) => t.market)
                      .join(', ')} — launch approval is hard-blocked per market until its PIF is Approved (see Market Tracking).`}
                  >
                    <GlobalOutlined style={{ color: '#1677ff', marginLeft: 6 }} />
                  </Tooltip>
                )}
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
                <Tooltip
                  title={
                    !r.canDecide
                      ? `Only ${r.meta.primaryOwner} can record this gate's decision — you are viewing as ${roleLabel(viewRole)} (RBAC demo, matrix pending F6)`
                      : undefined
                  }
                >
                  <Select
                    size="small"
                    allowClear
                    placeholder="Decision"
                    style={{ width: 140 }}
                    value={r.record.decision}
                    disabled={r.locked || !r.canDecide}
                    status={r.awaitingDecision ? 'warning' : undefined}
                    options={GATE_DECISIONS.map((d) => ({
                      value: d,
                      label: d,
                      // B1: a Gap prevents a normal Proceed decision.
                      // F9: an open change affecting the gate also blocks a plain
                      // Proceed — record Proceed with Conditions instead.
                      disabled:
                        d === 'Proceed' && (r.record.status === 'Gap' || r.openChanges.length > 0),
                    }))}
                    onChange={(v: GateDecision | undefined) => {
                      if (v === 'Backtrack') {
                        openBacktrackModal(r.meta.id);
                        return;
                      }
                      // F9: acknowledge any open change control record affecting
                      // this gate before the decision is recorded (audit note).
                      if (v && r.openChanges.length > 0) {
                        const ids = r.openChanges.map((c) => c.changeId).join(', ');
                        Modal.confirm({
                          title: 'Acknowledge open change control',
                          content: `Open change control record${r.openChanges.length > 1 ? 's' : ''} affect Gate ${r.meta.number}: ${ids}. Recording "${v}" acknowledges ${r.openChanges.length > 1 ? 'them' : 'it'} as accepted for this decision.`,
                          okText: 'Acknowledge & record',
                          cancelText: 'Cancel',
                          onOk: () => {
                            const note = `[Change ack ${dayjs().format('YYYY-MM-DD')}] Decision "${v}" recorded with open change(s) ${ids} acknowledged.`;
                            setGate(projectId, r.meta.id, {
                              decision: v,
                              notes: r.record.notes ? `${r.record.notes}\n${note}` : note,
                            });
                          },
                        });
                        return;
                      }
                      setGate(projectId, r.meta.id, { decision: v });
                    }}
                  />
                </Tooltip>
                {!r.canDecide && !r.locked && (
                  <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                    Decision restricted to {r.meta.primaryOwner}
                  </div>
                )}
                {r.record.status === 'Gap' && (
                  <div style={{ fontSize: 11, color: '#cf1322', marginTop: 2 }}>
                    Gap — normal Proceed blocked
                  </div>
                )}
                {r.openChanges.length > 0 && (
                  <div style={{ fontSize: 11, color: '#d48806', marginTop: 2 }}>
                    Open change — plain Proceed blocked; use Proceed with Conditions (acknowledge required)
                  </div>
                )}
                {r.awaitingDecision && !r.record.decision && (
                  <div style={{ fontSize: 11, color: '#d48806', marginTop: 2 }}>
                    Pending — decision required to pass
                  </div>
                )}
                {r.blockers.length > 0 && r.record.status === 'Complete' && (
                  <Tooltip title={r.blockers.join(' · ')}>
                    <div style={{ fontSize: 11, color: '#cf1322', marginTop: 2 }}>
                      Blocked: {r.blockers[0]}
                      {r.blockers.length > 1 ? ` (+${r.blockers.length - 1} more)` : ''}
                    </div>
                  </Tooltip>
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
          return to "Not Started" and any affected phase approval is invalidated and must be
          re-signed. Nothing is deleted: the previous decisions and sign-offs are preserved in the
          project's backtrack audit log ("no silent corrections").
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
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 4, fontWeight: 600 }}>Initiated by</div>
          <Input
            value={backtrackInitiatedBy}
            onChange={(e) => setBacktrackInitiatedBy(e.target.value)}
            placeholder="Who is initiating this backtrack? (recorded in the audit log)"
          />
        </div>
        <div>
          <div style={{ marginBottom: 4, fontWeight: 600 }}>Reason</div>
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
