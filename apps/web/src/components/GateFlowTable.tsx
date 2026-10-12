import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {Alert, Button, Card, DatePicker, Empty, Input, message, Select, Table, Tooltip, Typography} from 'antd';
import type { TableColumnsType } from 'antd';
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
import type { GateRecord, ProjectData, StageStatus } from '@mbc360/shared/types';
import { GATE_FIELD_LABELS, GATES, STAGE_STATUSES } from '@mbc360/shared/config/gates';
import { GATE_PASSING_DECISIONS as PASSING, gateFlowMissing } from '@mbc360/shared/config/gateSignOff';
import { openChangesAffectingGate } from '@mbc360/shared/config/changeTriggers';
import { activeMarketTracks } from '@mbc360/shared/utils/postLaunch';
import { gapBlocksDecision } from '@mbc360/shared/utils/gapCriticality';
import { useAppStore } from '../store/useAppStore';
import { usePermissionView } from '../auth/previewMode';
import { currentGateIndex, gateIndex, gateReadinessChecklist, isAwaitingDecision, isGatePassed, isGateSignedStanding } from '@mbc360/shared/utils/gateProgress';
import { canDecideGate, EMPTY_GRANTS } from '../utils/permissions';
import './GateFlowTable.css';
import { patchArray, useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';
import GateReadinessPanel from './GateReadinessPanel';
import GateSignOffPanel from './GateSignOffPanel';
import GapAssessmentBlock from './GapAssessmentBlock';
import UserSelect from './UserSelect';
import { ApiError } from '../api/projectsApi';
import { useSession } from '../auth/useSession';
import { TEXT, TABLE_STICKY } from '../theme/tokens';




import FormDrawer from './FormDrawer';
export default function GateFlowTable({
  project,
  gateIds,
  layout = 'table',
  hideReadiness,
  part = 'all',
}: {
  project: ProjectData;
  gateIds: string[];
  // 'card' (2026-10-02 Phase page concept): each gate as a form card — the same
  // editors, guards, sign-off panel and modals as the table, laid out for the
  // single-gate tab of PhasePage instead of a 1250px-wide row.
  layout?: 'table' | 'card';
  // The Phase page shows readiness in its own sticky rail, so the card layout
  // can leave it out rather than print the same list twice.
  hideReadiness?: boolean;
  // Card layout only: the Phase Gate Flow card and the Gate sign-off card sit in different places on the page
  // (the flow right after Project Identification, as in the workbook; the sign-off last), so each is rendered by
  // its own instance. 'all' keeps both together.
  part?: 'all' | 'flow' | 'signoff';
}) {
  const setGatesBulk = useAppStore((s) => s.setGatesBulk);
  const backtrackGate = useAppStore((s) => s.backtrackGate);
  const changes = useAppStore((s) => s.changes);
  // The role(s) on-screen checks use: your own, or the one being previewed.
  const permissionView = usePermissionView();
  const grants = useAppStore((s) => s.permissionGrid?.grants ?? EMPTY_GRANTS);
  const { user } = useSession();
  const location = useLocation();
  const projectId = project.identity.id;
  const archived = !!project.identity.archived;
  const gates = project.gates;
  const currentIdx = currentGateIndex(project);

  const records = gateIds.map((id) => project.gates.find((g) => g.gateId === id)!);
  const { draft, dirty, update, markSaved, discard } = useDraft(records);
  const patch = (index: number, p: Partial<GateRecord>) => update((prev) => patchArray(prev, index, p));

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

  // Per gate: whether the satisfied requirements are expanded (collapsed by
  // default — see GateReadinessPanel for why).
  const [showSatisfied, setShowSatisfied] = useState<Record<string, boolean>>({});
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

  // M3 Phase 1: these writes go to the API, so they can fail (rejected by a
  // server-side guard, a stale optimistic-lock version, or the network). The
  // old store actions silently no-op'd on rejection; surfacing the server's own
  // message is the point of moving enforcement there.
  const reportWriteError = (err: unknown) => {
    const conflict = err instanceof ApiError && err.isConflict;
    message.error(
      conflict
        ? 'This project was changed by someone else — reload the page before saving again.'
        : err instanceof Error
          ? err.message
          : 'Could not save — please try again.',
      conflict ? 8 : 6,
    );
  };

  const confirmBacktrack = async () => {
    if (!backtrackFrom || !backtrackTo || !backtrackReason.trim() || !backtrackInitiatedBy.trim()) return;
    try {
      await backtrackGate(projectId, backtrackFrom, backtrackTo, backtrackReason.trim(), backtrackInitiatedBy.trim());
    } catch (err) {
      reportWriteError(err);
      return; // keep the modal open and the draft intact so nothing is lost
    }
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
    openChangesAffectingGate(changes.filter((c) => c.projectId === projectId), projectId, gateNumber);

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
    .map((r) => {
      // Full readiness checklist (satisfied + unsatisfied) evaluated against
      // the DRAFT decision currently selected (not yet saved) — the soft
      // "open next action" item depends on whether that draft decision is
      // Proceed with Conditions, so this must be re-evaluated against the
      // draft, not the committed record, to give live, accurate guidance as
      // the user picks an option.
      const readinessChecklist = gateReadinessChecklist(project, r.meta.id, r.draftRecord.decision);
      return {
        ...r,
        passed: isGatePassed(project, r.meta.id),
        awaitingDecision: isAwaitingDecision(project, r.meta.id),
        // Question 29(5): once an approver has signed on this gate, its decision
        // is that signature's — the dropdown cannot change it (the API refuses
        // too). Withdrawing the signature is the way to change it.
        approverSigned: project.gateSignOffs.some(
          (g) =>
            g.gateId === r.meta.id &&
            g.role === 'Approved by' &&
            !!g.signedAt &&
            // F4: an older formula version's lanes do not hold the current gate.
            (!g.market || g.formulaVersion === project.formulaVersion),
        ),
        readinessChecklist,
        // Subset that even Proceed with Conditions can't clear (Critical next
        // actions, Skincare for Two, F1/C7 Mandatory evidence) — decision only
        // affects the (never-hard) open-next-actions item, so this is exactly
        // the decision-independent hardGateBlockers() result. `pending`
        // (manual, unwired) and `advisory` (Conditional/Supporting tier)
        // items are excluded — they're shown on the panel for visibility but
        // never actually block anything.
        hardBlockers: readinessChecklist.filter((item) => item.hardBlock && !item.satisfied && !item.pending && !item.advisory),
        liveBlockers: readinessChecklist.filter((item) => !item.satisfied && !item.pending && !item.advisory),
        openChanges: openChangesForGate(r.meta.number),
        // Only a role granted `gate:SGnn|decide` may record the decision.
        canDecide: permissionView.roleKeys.some((k) => canDecideGate(grants, k, r.meta.id)),
        // C5 soft check (per-market hard blocks live in Market Tracking; the
        // project-level effect of a partially-ready market set is follow-up F4).
        marketsNotReady:
          r.meta.id === 'SG11'
            ? activeMarketTracks(project).filter((t) => t.launchApproval !== 'Approved' && t.launchApproval !== 'N/A')
            : [],
        isCurrent: gateIndex(r.meta.id) === currentIdx,
        // B4 ("no silent corrections"): only the current gate is directly
        // editable here — an earlier, already-PASSED gate is locked too, not
        // just a future one. Correcting a passed gate's data must go through
        // Backtrack (openBacktrackModal below), which snapshots the prior
        // state and invalidates downstream approvals instead of overwriting
        // it in place.
        // An archived project is read-only until it is restored, so no row is
        // editable regardless of which gate is current (the server refuses the
        // write too — this only avoids offering an action that would be refused).
        locked: gateIndex(r.meta.id) !== currentIdx || archived,
        // SW-24: a standing signature makes this gate's own record read-only (the server refuses the write).
        signedLocked: isGateSignedStanding(project, r.meta.id),
        historyCount:
          project.gateChangeLog.filter((e) => e.gateId === r.meta.id).length +
          project.backtrackEvents.filter(
            (e) => e.fromGateId === r.meta.id || e.toGateId === r.meta.id || e.reopenedGateIds.includes(r.meta.id),
          ).length,
      };
    })
    // Whether the currently-selected DRAFT decision (unsaved) would actually
    // be rejected by the store guard if Saved right now — surfaced as a
    // Save-blocking reason instead of removing the option from the dropdown,
    // so the user can still select it and see exactly what's missing.
    .map((r) => {
      // Round 4 question 3: what a Gap blocks now depends on the criticality a
      // reviewer recorded, so the answer comes from the same shared function the
      // API guard calls rather than being re-stated here. Checked FIRST because it
      // is the more specific reason — "the gap is Critical" tells the user what to
      // do, where "stage status is Gap" does not.
      const gapVerdict = r.draftRecord.decision
        ? gapBlocksDecision(r.draftRecord, r.draftRecord.decision)
        : null;
      // Two different remedies, and telling them apart matters: `missing` means the
      // decision becomes valid once those fields are filled in (so pointing the user
      // at Hold would send them to hold a gate that does not need holding), while
      // `allowed` alone means this decision cannot be recorded at all.
      const gapFix = gapVerdict
        ? gapVerdict.missing?.length
          ? `Record ${gapVerdict.missing.join(', ')} on the gap assessment below, or choose ${gapVerdict.allowed
              .map((d) => `"${d}"`)
              .join(' or ')} instead`
          : `Record ${gapVerdict.allowed.map((d) => `"${d}"`).join(' or ')} instead`
        : undefined;
      const saveInvalidReason = gapVerdict
        ? `Gate ${r.meta.number}: "${r.draftRecord.decision}" isn't valid — ${gapVerdict.reason}. ${gapFix}`
        : r.draftRecord.decision === 'Proceed' && r.liveBlockers.length > 0
          ? `Gate ${r.meta.number}: "Proceed" isn't valid yet — ${r.liveBlockers.map((b) => b.label).join('; ')}`
          : r.draftRecord.decision === 'Proceed with Conditions' && r.hardBlockers.length > 0
            ? `Gate ${r.meta.number}: "Proceed with Conditions" isn't valid yet — ${r.hardBlockers.map((b) => b.label).join('; ')}`
            : undefined;
      return { ...r, saveInvalidReason, gapVerdict };
    });

  // Rows whose currently-selected (unsaved) decision would be rejected by
  // the store guard — Save stays disabled while any exist, with the reason
  // spelled out here rather than hidden behind a disabled dropdown option.
  const saveBlockedRows = rows.filter((r) => r.saveInvalidReason);

  // Gate-decision guidance (permission/Gap/open-change/pending/blockers) used
  // to live crammed inside the narrow "Gate decision" column — long blocker
  // lists made that column (and the whole row) very tall. Rendered instead as
  // a full-width row via the Table's `expandable` mechanism, always shown
  // (not user-toggleable) whenever there's something to say about a gate.
  // Every gate row expands, unconditionally, since 2026-08-29: the per-gate
  // sign-off panel (Round 4 questions 18/29) belongs to every gate, so there is
  // no longer a case where the expansion would be empty. Kept as a named
  // predicate rather than inlined `true` because `expandable` takes one, and
  // because the conditions it used to test are exactly what the panels below
  // render — a future panel that is conditional would go back in here.
  const rowHasGuidance = () => true;
  const guidanceRowKeys = rows.map((r) => r.meta.id);

  const save = () => {
    // Defense in depth — the Save button is already disabled in this case
    // (see the SaveBar `disabled` prop below), but never silently commit an
    // invalid decision even if that's somehow bypassed; setGatesBulk's own
    // guard would also revert it, but bailing here avoids a confusing
    // partial-save round-trip.
    if (saveBlockedRows.length > 0) return;
    setGatesBulk(projectId, draft, user?.displayName)
      // markSaved only after the server accepted the write — otherwise the
      // draft would be cleared while the database still holds the old values.
      .then(() => markSaved())
      .catch(reportWriteError);
  };

  // In the card layout this sits inside the gate's card; in the table layout it follows the table.
  const flowSaveBar = (
    <SaveBar
      dirty={dirty}
      onSave={save}
      onDiscard={discard}
      disabled={saveBlockedRows.length > 0}
      disabledReason="Resolve the issue(s) flagged above before saving."
    />
  );

  const backtrackFromMeta = backtrackFrom ? GATES.find((g) => g.id === backtrackFrom) : undefined;
  const backtrackTargetOptions = backtrackFrom
    ? GATES.filter((g) => gateIndex(g.id) < gateIndex(backtrackFrom)).map((g) => ({
        value: g.id,
        label: `Gate ${g.number} — ${g.name}`,
      }))
    : [];

  type Row = (typeof rows)[number];
  // Everything shown under a gate besides its own fields: restrictions, the gap
  // assessment, notices, the gate sign-off panel and (unless hidden) readiness.
  // `part` splits it for the card layout, where the sign-off is its own card BELOW the Phase Gate Flow card
  // rather than a part of it (2026-10-11): 'notices' is what belongs to the flow card, 'signoff' the rest.
  const renderGuidance = (r: Row, part: 'all' | 'notices' | 'signoff' = 'all') => (
            <div style={{ display: 'grid', gap: 4 }}>
              {part !== 'signoff' && <>
              {!r.canDecide && !r.locked && (
                <div style={{ fontSize: 12, color: TEXT.secondary }}>
                  Decision restricted to {r.meta.primaryOwner}
                </div>
              )}
              {/* Also shown while a Critical/High grade is still recorded after the
                  status left Gap: that grade keeps blocking (gapBlocksDecision), and
                  clearing it here is how the gap is closed — hiding the block would
                  leave the gate blocked with no field to fix it. */}
              {(r.draftRecord.status === 'Gap' ||
                ['Critical', 'High'].includes(r.draftRecord.gapCriticality ?? '')) && (
                <GapAssessmentBlock gate={r.draftRecord} locked={r.locked || r.signedLocked} onChange={(p) => patch(r.draftIndex, p)} />
              )}
              {r.openChanges.length > 0 && (
                <div style={{ fontSize: 12, color: '#d48806' }}>
                  Open change — plain Proceed blocked; the approver's sign-off with Proceed with Conditions records its acceptance
                </div>
              )}
              {r.awaitingDecision && !r.record.decision && (
                <div style={{ fontSize: 12, color: '#595959' }}>The gate decision is recorded when the approver signs below</div>
              )}
              </>}
              {part !== 'notices' && <>
              {/* Per-gate sign-off (Round 4 questions 18/29, 2026-08-29). Sits with
                  the blocker checklist because a signature and the evidence it
                  attests to are one subject — and because `sgNN-signoff` is one
                  of the items in that very list. */}
              <GateSignOffPanel project={project} gateId={r.meta.id} />
              {!hideReadiness && r.readinessChecklist.length > 0 && (
                <GateReadinessPanel
                  gateNumber={r.meta.number}
                  items={r.readinessChecklist}
                  projectId={projectId}
                  currentPath={location.pathname}
                  showSatisfied={!!showSatisfied[r.meta.id]}
                  onToggleSatisfied={() =>
                    setShowSatisfied((prev) => ({ ...prev, [r.meta.id]: !prev[r.meta.id] }))
                  }
                />
              )}
              </>}
            </div>
  );

  const columns: TableColumnsType<Row> = [
          {
            title: 'Gate',
            width: 90,
            fixed: 'left',
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
                    <RightCircleFilled style={{ color: '#0958d9', marginRight: 6 }} />
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
                    <GlobalOutlined style={{ color: '#0958d9', marginLeft: 6 }} />
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
                style={{ width: 130 }}
                value={r.draftRecord.status}
                disabled={r.locked || r.signedLocked}
                options={STAGE_STATUSES.map((s) => ({ value: s, label: s }))}
                onChange={(v: StageStatus) => patch(r.draftIndex, { status: v })}
              />
            ),
          },
          {
            title: 'Gate decision',
            width: 170,
            // Read-only (2026-10-11, project owner): the decision is the approver's, chosen in their signing
            // modal (SME 29(5)), so it is shown here and never edited. Backtrack is an action, not a decision.
            render: (_, r) => (
              <Tooltip title="Chosen by the approver in the signing modal — it cannot be edited here">
                <span className="gfc-decision">
                  {r.record.decision ? (
                    <span className={`c-tag c-tag-dot ${PASSING.includes(r.record.decision) ? 'c-tag-ok' : 'c-tag-warn'}`}>
                      {r.record.decision}
                    </span>
                  ) : (
                    <span className="c-tag gfc-decision-empty">Not decided yet</span>
                  )}
                </span>
              </Tooltip>
            ),
          },
          {
            title: 'Owner',
            width: 140,
            render: (_, r) => (
              <UserSelect
                value={r.draftRecord.owner}
                placeholder={r.meta.primaryOwner}
                disabled={r.locked || r.signedLocked}
                onChange={(v) => patch(r.draftIndex, { owner: v })}
              />
            ),
          },
          {
            title: 'Due date',
            width: 130,
            render: (_, r) => (
              <DatePicker
                value={r.draftRecord.dueDate ? dayjs(r.draftRecord.dueDate) : null}
                disabled={r.locked || r.signedLocked}
                onChange={(d) => patch(r.draftIndex, { dueDate: d ? d.format('YYYY-MM-DD') : undefined })}
              />
            ),
          },
          {
            title: 'Evidence / link',
            width: 150,
            render: (_, r) => (
              <Input
                value={r.draftRecord.evidenceLink}
                placeholder="link"
                disabled={r.locked || r.signedLocked}
                onChange={(e) => patch(r.draftIndex, { evidenceLink: e.target.value })}
              />
            ),
          },
          {
            title: 'Notes / blockers',
            width: 190,
            render: (_, r) => (
              <Input.TextArea
                autoSize={{ minRows: 3, maxRows: 8 }}
                value={r.draftRecord.notes}
                disabled={r.locked || r.signedLocked}
                onChange={(e) => patch(r.draftIndex, { notes: e.target.value })}
              />
            ),
          },
          {
            title: 'History',
            width: 100,
            fixed: 'right',
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
  ];

  // Card layout: the same column renderers, laid out as a form per gate.
  // Stage status (must read Complete), Owner, Due date and Evidence / link: GATE_FLOW_REQUIRED + the stage rule (SW-26).
  const REQUIRED_FIELD_TITLES = ['Stage status', 'Owner', 'Due date', 'Evidence / link'];
  const CARD_FIELDS = ['Stage status', 'Owner', 'Due date', 'Evidence / link', 'Notes / blockers'];
  const fieldFor = (title: string) => columns.find((c) => c.title === title) as { render: (v: unknown, r: Row, i: number) => React.ReactNode } | undefined;

  const content = (
    <>
      {archived && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          title="This project is archived — read-only"
          description="Restore it from the Projects list to make changes. Nothing has been deleted."
        />
      )}
      {saveBlockedRows.length > 0 && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          title="Decision not valid yet — cannot save"
          description={
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {saveBlockedRows.map((r) => (
                <li key={r.meta.id}>{r.saveInvalidReason}</li>
              ))}
            </ul>
          }
        />
      )}
      {layout === 'card' ? (
        <div className="gfc-list">
          {rows.map((r) => {
            // What still has to be SAVED before this gate can be signed off with a passing decision (SW-26).
            const flowTodo = [
              ...(r.record.status !== 'Complete' ? ['Stage status → Complete'] : []),
              ...gateFlowMissing(project, r.meta.id),
            ];
            return (
            <div key={r.meta.id} className="gfc-gate">
            {part !== 'signoff' && <div className={`c-card gfc-card${r.passed ? ' gfc-passed' : ''}`}>
              <div className="gfc-head">
                <div style={{ minWidth: 0 }}>
                  <div className="gfc-eyebrow">Phase Gate Flow</div>
                  <div className="gfc-title-row">
                    <span className="gfc-decision-line">
                      <span className="gfc-decision-k">Gate decision</span>
                      {r.record.decision ? (
                        <span className={`c-tag c-tag-dot ${PASSING.includes(r.record.decision) ? 'c-tag-ok' : 'c-tag-warn'}`}>
                          {r.record.decision}
                        </span>
                      ) : (
                        <span className="c-tag gfc-decision-empty">Not decided yet</span>
                      )}
                      <span className="gfc-decision-note">set by the approver when signing</span>
                    </span>
                    {r.locked && !r.isCurrent && !r.passed && (
                      <span className="c-tag">
                        <LockOutlined /> {gateIndex(r.meta.id) > currentIdx ? 'Not open yet' : 'Read-only'}
                      </span>
                    )}
                    {r.openChanges.length > 0 && <span className="c-tag c-tag-warn">Open change</span>}
                    {r.signedLocked && !r.passed && (
                      <Tooltip title="A signature stands on this gate. Withdraw it (latest first, with a reason) to change this record.">
                        <span className="c-tag">
                          <LockOutlined /> Locked by a signature
                        </span>
                      </Tooltip>
                    )}
                  </div>
                </div>
                {/* A disabled button still reads as something to press. With no
                    history there is nothing to open, so it is plain muted text. */}
                {r.meta.id !== 'SG01' && !r.locked && r.canDecide && !r.approverSigned && (
                  <Button size="small" type="text" onClick={() => openBacktrackModal(r.meta.id)}>
                    Backtrack…
                  </Button>
                )}
                {r.historyCount > 0 ? (
                  <Button size="small" type="text" icon={<HistoryOutlined />} onClick={() => setHistoryFor(r.meta.id)}>
                    History ({r.historyCount})
                  </Button>
                ) : (
                  <span className="gfc-nohistory">No history</span>
                )}
              </div>
              <div className="gfc-fields">
                {CARD_FIELDS.map((title) => (
                  <label key={title} className={title === 'Notes / blockers' ? 'gfc-full' : title === 'Evidence / link' ? 'gfc-full' : undefined}>
                    <span className="gfc-label">
                      {title}
                      {REQUIRED_FIELD_TITLES.includes(title) && (
                        <Tooltip title="Required before this gate can be signed off with a passing decision">
                          <span className="gfc-req" aria-label="required"> *</span>
                        </Tooltip>
                      )}
                    </span>
                    {fieldFor(title)?.render(undefined, r, r.draftIndex)}
                  </label>
                ))}
              </div>
              {!r.passed && !r.locked && (
                <div className={`gfc-ready${flowTodo.length === 0 ? ' gfc-ready-ok' : ''}`}>
                  {flowTodo.length === 0 ? (
                    <><CheckCircleFilled /> Complete — ready for sign-off</>
                  ) : (
                    <>Before sign-off, complete and save: {flowTodo.join(' · ')}</>
                  )}
                </div>
              )}
              <div className="gfc-guidance">{renderGuidance(r, 'notices')}</div>
              {flowSaveBar}
            </div>}
            {/* The sign-off is its own card, below the flow it depends on. */}
            {part !== 'flow' && <div className="gfc-signoff">{renderGuidance(r, 'signoff')}</div>}
            </div>
            );
          })}
        </div>
      ) : (
      <Table
        size="small"
        rowKey={(r) => r.meta.id}
        dataSource={rows}
        pagination={false}
        sticky={TABLE_STICKY}
        scroll={{ x: 1250 }}
        rowClassName={(r) => (r.passed ? 'gate-row-passed' : r.locked ? 'gate-row-locked' : '')}
        expandable={{
          showExpandColumn: false,
          expandedRowKeys: guidanceRowKeys,
          onExpandedRowsChange: () => {
            // Fully controlled by `guidanceRowKeys` — not user-toggleable, so
            // there's nothing to do here (and no expand icon to click anyway).
          },
          rowExpandable: rowHasGuidance,
          expandedRowRender: (r) => (
            renderGuidance(r)
          ),
        }}
        columns={columns}
      />
      )}
      {layout !== 'card' && flowSaveBar}

      <FormDrawer
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
      </FormDrawer>

      <FormDrawer
        title={historyGateMeta ? `History — Gate ${historyGateMeta.number}` : 'Change history'}
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
      </FormDrawer>
    </>
  );

  return layout === 'card' ? (
    <div className="concept-tokens gfc">{content}</div>
  ) : (
    <Card
      size="small"
      title="Phase Gate Flow"
      extra={
        <span style={{ color: TEXT.secondary }}>
          A gate passes only when status is Complete, a Proceed / Proceed with Conditions decision
          is recorded, and no blockers remain (open next actions, mandatory safety screens)
        </span>
      }
    >
      {content}
    </Card>
  );
}
