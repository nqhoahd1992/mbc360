import { useState } from 'react';
import { Button, Card, DatePicker, Empty, Input, message, Modal, Select, Table, Tooltip, Typography } from 'antd';
import {
  CheckCircleFilled,
  ExclamationCircleFilled,
  GlobalOutlined,
  HistoryOutlined,
  LockOutlined,
  RightCircleFilled,
  WarningFilled,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { GateDecision, GateRecord, ProjectData, StageStatus } from '@mbc360/shared/types';
import { GATE_FIELD_LABELS, GATES, GATE_DECISIONS, STAGE_STATUSES } from '@mbc360/shared/config/gates';
import { getChangeTrigger, isChangeOpen } from '@mbc360/shared/config/changeTriggers';
import { useAppStore } from '../store/useAppStore';
import { currentGateIndex, gateBlockers, gateIndex, hardGateBlockers, isAwaitingDecision, isGatePassed } from '@mbc360/shared/utils/gateProgress';
import { canDecideGate, roleLabel } from '../utils/roles';
import { patchArray, useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';
import { useSession } from '../auth/useSession';

export default function GateFlowTable({
  project,
  gateIds,
}: {
  project: ProjectData;
  gateIds: string[];
}) {
  const setGate = useAppStore((s) => s.setGate);
  const setGatesBulk = useAppStore((s) => s.setGatesBulk);
  const backtrackGate = useAppStore((s) => s.backtrackGate);
  const changes = useAppStore((s) => s.changes);
  const viewRole = useAppStore((s) => s.viewRole);
  const { user } = useSession();
  const projectId = project.identity.id;
  const gates = project.gates;
  const currentIdx = currentGateIndex(project);

  const records = gateIds.map((id) => project.gates.find((g) => g.gateId === id)!);
  const { draft, dirty, update, markSaved, discard } = useDraft(records);
  const patch = (index: number, p: Partial<GateRecord>) => update((prev) => patchArray(prev, index, p));
  const save = () => {
    setGatesBulk(projectId, draft, user?.displayName);
    markSaved();
  };

  // Per-gate history popup — surfaces the same audit data as the Project
  // Overview "Backtrack audit log" / "Gate change log" cards, but reachable
  // directly from the Phase Gate Flow row instead of a separate page.
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const historyGateMeta = historyFor ? GATES.find((g) => g.id === historyFor) : undefined;
  const historyFieldChanges = historyFor
    ? [...project.gateChangeLog].filter((e) => e.gateId === historyFor).reverse()
    : [];
  const historyBacktracks = historyFor
    ? [...project.backtrackEvents]
        .filter((e) => e.fromGateId === historyFor || e.toGateId === historyFor || e.reopenedGateIds.includes(historyFor))
        .reverse()
    : [];

  const [backtrackFrom, setBacktrackFrom] = useState<string | null>(null);
  const [backtrackTo, setBacktrackTo] = useState<string | undefined>();
  const [backtrackReason, setBacktrackReason] = useState('');
  // Initiator is the real signed-in identity, not free text — B4's audit log
  // ("who initiated it") must record who actually performed the action, not
  // whatever name someone chooses to type.
  const [backtrackInitiatedBy, setBacktrackInitiatedBy] = useState('');

  const openBacktrackModal = (fromGateId: string) => {
    setBacktrackFrom(fromGateId);
    setBacktrackTo(undefined);
    setBacktrackReason('');
    setBacktrackInitiatedBy(user?.displayName ?? '');
  };

  // Every field is mandatory — "no silent corrections" (B4) means the audit
  // log must always carry who, why, and how far back, never a blank reason
  // or initiator.
  const canConfirmBacktrack = !!backtrackTo && !!backtrackReason.trim() && !!backtrackInitiatedBy.trim();

  const confirmBacktrack = () => {
    if (!backtrackFrom || !backtrackTo || !backtrackReason.trim() || !backtrackInitiatedBy.trim()) return;
    backtrackGate(projectId, backtrackFrom, backtrackTo, backtrackReason.trim(), backtrackInitiatedBy.trim());
    // Backtrack resets a whole range of gates at once (well beyond a single
    // row) — rather than hand-replicate that logic client-side, drop any
    // pending unsaved edits in this table so the next render's resync picks
    // up the authoritative post-backtrack state.
    if (dirty) message.info('Pending unsaved edits in the Phase Gate Flow table were discarded by the backtrack.');
    discard();
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
    .map((id, i) => ({
      meta: GATES.find((g) => g.id === id)!,
      // Committed record — drives the read-only badges/blockers below, which
      // stay accurate as of the last Save (see the note above `save()`).
      record: gates.find((g) => g.gateId === id)!,
      // Draft record — drives every editable field's live value.
      draftRecord: draft[i],
      draftIndex: i,
    }))
    .filter((r) => r.meta && r.record)
    .map((r) => ({
      ...r,
      passed: isGatePassed(project, r.meta.id),
      awaitingDecision: isAwaitingDecision(project, r.meta.id),
      blockers: gateBlockers(project, r.meta.id),
      // Subset of `blockers` that even Proceed with Conditions can't clear
      // (Critical next actions, Skincare for Two, F1/C7 Mandatory evidence) —
      // disables "Proceed with Conditions" too, not just plain "Proceed".
      hardBlockers: hardGateBlockers(project, r.meta.id),
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
      // B4 ("no silent corrections"): only the current gate is directly
      // editable here — an earlier, already-PASSED gate is locked too, not
      // just a future one. Correcting a passed gate's data must go through
      // Backtrack (openBacktrackModal below), which snapshots the prior
      // state and invalidates downstream approvals instead of overwriting
      // it in place.
      locked: gateIndex(r.meta.id) !== currentIdx,
      historyCount:
        project.gateChangeLog.filter((e) => e.gateId === r.meta.id).length +
        project.backtrackEvents.filter(
          (e) => e.fromGateId === r.meta.id || e.toGateId === r.meta.id || e.reopenedGateIds.includes(r.meta.id),
        ).length,
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
        scroll={{ x: 1250 }}
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
                value={r.draftRecord.status}
                disabled={r.locked}
                options={STAGE_STATUSES.map((s) => ({ value: s, label: s }))}
                onChange={(v: StageStatus) => patch(r.draftIndex, { status: v })}
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
                    value={r.draftRecord.decision}
                    disabled={r.locked || !r.canDecide}
                    status={r.awaitingDecision ? 'warning' : undefined}
                    options={GATE_DECISIONS.map((d) => ({
                      value: d,
                      label: d,
                      disabled:
                        // B1: a Gap prevents a normal Proceed decision.
                        // F9: an open change affecting the gate also blocks a plain
                        // Proceed — record Proceed with Conditions instead.
                        // B1/F1/C7: ANY blocker (including a soft, PwC-clearable
                        // open next action) still blocks a plain Proceed.
                        (d === 'Proceed' &&
                          (r.record.status === 'Gap' || r.openChanges.length > 0 || r.blockers.length > 0)) ||
                        // F8/C1/F1/C7: hard blockers (Critical actions, Skincare
                        // for Two, Mandatory evidence) are not cleared by Proceed
                        // with Conditions either — only the soft open-next-action
                        // blocker is (see hardGateBlockers vs. gateBlockers).
                        (d === 'Proceed with Conditions' && r.hardBlockers.length > 0) ||
                        // Backtrack reopens an EARLIER gate — Gate 1 has none.
                        (d === 'Backtrack' && r.meta.id === 'SG01'),
                    }))}
                    onChange={(v: GateDecision | undefined) => {
                      if (v === 'Backtrack') {
                        openBacktrackModal(r.meta.id);
                        return;
                      }
                      // F9: acknowledge any open change control record affecting
                      // this gate before the decision is recorded (audit note).
                      // This commits immediately (like Backtrack, it's already
                      // gated behind its own explicit confirmation), then
                      // mirrors the same fields into the draft so any other
                      // pending unsaved edits on this row aren't lost or
                      // clobbered by a later Save.
                      if (v && r.openChanges.length > 0) {
                        const ids = r.openChanges.map((c) => c.changeId).join(', ');
                        Modal.confirm({
                          title: 'Acknowledge open change control',
                          content: `Open change control record${r.openChanges.length > 1 ? 's' : ''} affect Gate ${r.meta.number}: ${ids}. Recording "${v}" acknowledges ${r.openChanges.length > 1 ? 'them' : 'it'} as accepted for this decision.`,
                          okText: 'Acknowledge & record',
                          cancelText: 'Cancel',
                          onOk: () => {
                            const note = `[Change ack ${dayjs().format('YYYY-MM-DD')}] Decision "${v}" recorded with open change(s) ${ids} acknowledged.`;
                            const notes = r.record.notes ? `${r.record.notes}\n${note}` : note;
                            setGate(projectId, r.meta.id, { decision: v, notes }, user?.displayName);
                            patch(r.draftIndex, { decision: v, notes });
                          },
                        });
                        return;
                      }
                      patch(r.draftIndex, { decision: v });
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
                value={r.draftRecord.owner}
                placeholder={r.meta.primaryOwner}
                disabled={r.locked}
                onChange={(e) => patch(r.draftIndex, { owner: e.target.value })}
              />
            ),
          },
          {
            title: 'Due date',
            width: 130,
            render: (_, r) => (
              <DatePicker
                size="small"
                value={r.draftRecord.dueDate ? dayjs(r.draftRecord.dueDate) : null}
                disabled={r.locked}
                onChange={(d) => patch(r.draftIndex, { dueDate: d ? d.format('YYYY-MM-DD') : undefined })}
              />
            ),
          },
          {
            title: 'Evidence / link',
            width: 150,
            render: (_, r) => (
              <Input
                size="small"
                value={r.draftRecord.evidenceLink}
                placeholder="link"
                disabled={r.locked}
                onChange={(e) => patch(r.draftIndex, { evidenceLink: e.target.value })}
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
                value={r.draftRecord.notes}
                disabled={r.locked}
                onChange={(e) => patch(r.draftIndex, { notes: e.target.value })}
              />
            ),
          },
          {
            title: 'History',
            width: 100,
            render: (_, r) => (
              <Button
                size="small"
                type="link"
                icon={<HistoryOutlined />}
                disabled={r.historyCount === 0}
                onClick={() => setHistoryFor(r.meta.id)}
              >
                {r.historyCount > 0 ? r.historyCount : 'None'}
              </Button>
            ),
          },
        ]}
      />
      <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />

      <Modal
        title={backtrackFromMeta ? `Backtrack from Gate ${backtrackFromMeta.number}` : 'Backtrack'}
        open={!!backtrackFrom}
        onOk={confirmBacktrack}
        onCancel={() => setBacktrackFrom(null)}
        okText="Confirm backtrack"
        okButtonProps={{ danger: true, disabled: !canConfirmBacktrack }}
      >
        <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
          A backtrack reopens an earlier gate (and everything in between) for rework. Those gates
          return to "Not Started" and any affected phase approval is invalidated and must be
          re-signed. Nothing is deleted: the previous decisions and sign-offs are preserved in the
          project's backtrack audit log ("no silent corrections").
        </Typography.Paragraph>
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 4, fontWeight: 600 }}>
            Backtrack to which gate? <span style={{ color: '#ff4d4f' }}>*</span>
          </div>
          <Select
            style={{ width: '100%' }}
            placeholder="Select an earlier gate to reopen"
            value={backtrackTo}
            onChange={setBacktrackTo}
            options={backtrackTargetOptions}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 4, fontWeight: 600 }}>
            Initiated by <span style={{ color: '#ff4d4f' }}>*</span>
          </div>
          <Input
            value={backtrackInitiatedBy}
            readOnly
            placeholder="Not signed in — cannot record an initiator"
          />
        </div>
        <div>
          <div style={{ marginBottom: 4, fontWeight: 600 }}>
            Reason <span style={{ color: '#ff4d4f' }}>*</span>
          </div>
          <Input.TextArea
            rows={2}
            value={backtrackReason}
            onChange={(e) => setBacktrackReason(e.target.value)}
            placeholder="Why is this backtrack required?"
          />
        </div>
      </Modal>

      <Modal
        title={historyGateMeta ? `Change history — Gate ${historyGateMeta.number}` : 'Change history'}
        open={!!historyFor}
        onCancel={() => setHistoryFor(null)}
        footer={null}
        width={820}
      >
        {historyBacktracks.length === 0 && historyFieldChanges.length === 0 ? (
          <Empty description="No changes recorded yet" />
        ) : (
          <>
            {historyBacktracks.length > 0 && (
              <>
                <Typography.Text strong>Backtrack events</Typography.Text>
                <Table
                  size="small"
                  style={{ marginTop: 8, marginBottom: 16 }}
                  rowKey={(e) => e.id}
                  dataSource={historyBacktracks}
                  pagination={false}
                  columns={[
                    { title: 'Date', width: 110, dataIndex: 'date' },
                    {
                      title: 'From → To',
                      width: 150,
                      render: (_, e) => {
                        const from = GATES.find((g) => g.id === e.fromGateId);
                        const to = GATES.find((g) => g.id === e.toGateId);
                        return `Gate ${from?.number ?? e.fromGateId} → Gate ${to?.number ?? e.toGateId}`;
                      },
                    },
                    { title: 'Initiated by', width: 140, render: (_, e) => e.initiatedBy ?? '—' },
                    { title: 'Reason', render: (_, e) => e.reason ?? '—' },
                  ]}
                />
              </>
            )}
            {historyFieldChanges.length > 0 && (
              <>
                <Typography.Text strong>Field edits</Typography.Text>
                <Table
                  size="small"
                  style={{ marginTop: 8 }}
                  rowKey={(e) => e.id}
                  dataSource={historyFieldChanges}
                  pagination={false}
                  columns={[
                    { title: 'Date', width: 140, dataIndex: 'date' },
                    { title: 'Changed by', width: 140, render: (_, e) => e.changedBy ?? '—' },
                    {
                      title: 'Changes',
                      render: (_, e) => (
                        <span style={{ fontSize: 12, color: '#666' }}>
                          {e.changes
                            .map((c) => `${GATE_FIELD_LABELS[c.field]}: ${c.from || '—'} → ${c.to || '—'}`)
                            .join(' · ')}
                        </span>
                      ),
                    },
                  ]}
                />
              </>
            )}
          </>
        )}
      </Modal>
    </Card>
  );
}
