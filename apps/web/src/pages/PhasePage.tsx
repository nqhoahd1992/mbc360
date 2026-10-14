import { useEffect, useState } from 'react';
import { App, Button, Empty, Tooltip } from 'antd';
import { ArrowDownOutlined, ArrowRightOutlined, CheckOutlined, LockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  currentGateIndex,
  currentGateNumber,
  evaluateTrigger,
  gateIndex,
  gateReadinessChecklist,
  gateRefGateIds,
  isGatePassed,
  isGateRefLocked,
  isGateSignedStanding,
  phaseCompletionChecklist,
  phaseProgress,
  skincareForTwoIncompleteSections,
  skincareForTwoTriggers,
  isPhaseDataLocked,
  type GateReadinessItem,
} from '@mbc360/shared/utils/gateProgress';
import { gateFlowMissing } from '@mbc360/shared/config/gateSignOff';
import { useAppStore } from '../store/useAppStore';
import { GATES, PHASES, phaseLabel } from '@mbc360/shared/config/gates';
import { responsibleReviewer } from '@mbc360/shared/utils/readinessAck';
import { useSession } from '../auth/useSession';
import { PHASE_CONFIGS } from '@mbc360/shared/config/phases';
import ProjectIdentificationCard from '../components/ProjectIdentificationCard';
import OpportunityRequestCard from '../components/OpportunityRequestCard';
import PhaseKeyLinksCard from '../components/PhaseKeyLinksCard';
import GateFlowTable from '../components/GateFlowTable';
import ChecklistSection from '../components/ChecklistSection';
import RequirementTable from '../components/RequirementTable';
import GateChecksTable from '../components/GateChecksTable';
import EightAnglesTable from '../components/EightAnglesTable';
import SignOffBlock from '../components/SignOffBlock';
import NextActionsCard from '../components/NextActionsCard';
import { currentMarketTracks, legacyOnMarketTracks } from '@mbc360/shared/utils/postLaunch';
import MarketTrackingCard from '../components/MarketTrackingCard';
import PostLaunchReviewCard from '../components/PostLaunchReviewCard';
import SectionJumpButton from '../components/SectionJumpButton';
import GateReadinessPanel from '../components/GateReadinessPanel';
import AssessmentBlock, { isFamilyUseSelected } from '../components/AssessmentBlock';
import ChangeControlAssessments from '../components/ChangeControlAssessments';
import { ASSESSMENT_HOMES, assessmentAnchor } from '@mbc360/shared/config/assessments';
import { useUnsavedCount } from '../hooks/unsavedRegistry';
import '../styles/concept.css';
import './PhasePage.css';
import { composeReviewOwner } from '@mbc360/shared/config/reviewers';
import { targetUsersPinnedByAssessment } from '@mbc360/shared/utils/vulnerableUsers';

// Transcribed verbatim from cell A20 of each phase's source workbook sheet
// (PHASE1 G1-3 MKTG has no equivalent cell — its A20 is a table header, not a
// note). Keep these complete, not paraphrased or truncated — the second
// sentence in each is what actually explains the instruction.
const PHASE_NOTES: Record<number, string> = {
  2: 'Do not re-enter Phase 1 target user/product/market/claim selections here. Use those choices as inputs and record only ingredient, formula, costing, packaging and artwork decisions.',
  3: 'Phase 3 proves whether the Phase 1-2 choices are safe, valid, stable and releasable. It does not repeat product positioning choices unless a backtrack is required.',
  4: 'Phase 4 converts the approved development record into dossier evidence, launch approval and a monitored post-market improvement loop. Claim/market/product choices are referenced from Phase 1, not re-entered.',
};

const CLOSE_TAB = 'close';

// Pulse a ring around a section the page just scrolled to. Safe to call again
// while a pulse is running: the class is removed and re-added after a reflow so
// the animation restarts, and the previous timer is cancelled so it cannot strip
// the new highlight early. Deliberately NOT tied to an effect cleanup — the
// ?scrollTo= param is dropped right after the scroll, which re-runs that effect
// and used to cancel the timer, leaving the class stuck on (so it never replayed).
const flashTimers = new WeakMap<HTMLElement, number>();
function flashSection(el: HTMLElement) {
  window.clearTimeout(flashTimers.get(el));
  el.classList.remove('ph-flash');
  void el.offsetWidth;
  el.classList.add('ph-flash');
  flashTimers.set(el, window.setTimeout(() => el.classList.remove('ph-flash'), 1200));
}

export default function PhasePage() {
  const { projectId, phaseNo } = useParams();
  const phase = Number(phaseNo);
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const acceptPreWork = useAppStore((s) => s.acceptPhasePreWork);
  const { user: sessionUser } = useSession();
  const location = useLocation();
  const [showSatisfied, setShowSatisfied] = useState(false);
  // Scroll a section into view. A section near the end of the page cannot reach
  // the top (the page is not tall enough) and stops partway; the highlight ring
  // the caller adds is what tells the user which card they were taken to.
  // Resolves once the scroll has finished, so the caller can flash the section only when the user is looking at
  // it (not while it is still travelling past).
  const scrollToSection = (el: HTMLElement): Promise<void> =>
    new Promise((resolve) => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion) {
        el.scrollIntoView({ behavior: 'auto', block: 'start' });
        resolve();
        return;
      }
      let timer = 0;
      const done = () => {
        window.clearTimeout(timer);
        window.removeEventListener('scrollend', done);
        resolve();
      };
      // `scrollend` is not in every browser; a scroll that never moves (already there) never fires it either.
      window.addEventListener('scrollend', done, { once: true });
      timer = window.setTimeout(done, 1200);
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

  const [searchParams, setSearchParams] = useSearchParams();
  const config = PHASE_CONFIGS[phase];

  // Which tab a section lives on (2026-10-02, wireframe option A): the page
  // shows one gate at a time, so a section belongs to the first of its own
  // gates that is in this phase; anything not tied to one gate ('ALL') goes to
  // the close-out tab. Derived from the same config `gate` refs the locks use.
  const tabForRef = (ref: string | undefined): string => {
    const ids = gateRefGateIds(ref).filter((id) => config?.gateIds.includes(id));
    return ids[0] ?? CLOSE_TAB;
  };
  const requirementTab = (key: string) => {
    const section = config?.requirementSections.find((s) => s.key === key);
    return tabForRef(section?.rows?.[0]?.gate);
  };
  const anchorTab = (anchor: string): string | undefined => {
    if (!config) return undefined;
    if (anchor.startsWith('sec-checklist-')) {
      return tabForRef(config.checklistSections.find((s) => `sec-checklist-${s.key}` === anchor)?.gate);
    }
    if (anchor.startsWith('sec-requirement-')) return requirementTab(anchor.slice('sec-requirement-'.length));
    if (anchor.startsWith('sec-gate-check-')) {
      // sec-gate-check-<gate>-<slug>: the row lives on its own gate's tab, or on
      // the close-out for a check that belongs to no gate of this phase.
      const gateNumber = anchor.slice('sec-gate-check-'.length).split('-')[0];
      return config.gateIds.find((id) => GATES.find((g) => g.id === id)?.number === gateNumber) ?? CLOSE_TAB;
    }
    if (anchor === 'sec-eight-angles' || anchor === 'sec-sign-off') return CLOSE_TAB;
    if (anchor === 'sec-opportunity' || anchor === 'sec-identification') return config.gateIds[0];
    const assessment = ASSESSMENT_HOMES.find((a) => assessmentAnchor(a.key) === anchor);
    if (assessment && config.gateIds.includes(assessment.gateId)) return assessment.gateId;
    return undefined;
  };

  // Default tab: the gate open for work if it is in this phase; the close-out
  // once every gate has passed; otherwise the phase's first gate.
  const currentIdx = project ? currentGateIndex(project) : -1;
  const currentGateId = GATES[currentIdx]?.id;
  const allGatesPassed = !!project && !!config && config.gateIds.every((id) => isGatePassed(project, id));
  const defaultTab =
    config && currentGateId && config.gateIds.includes(currentGateId)
      ? currentGateId
      : allGatesPassed
        ? CLOSE_TAB
        : config?.gateIds[0] ?? CLOSE_TAB;
  const requested = searchParams.get('gate');
  const tab = requested && (requested === CLOSE_TAB || config?.gateIds.includes(requested)) ? requested : defaultTab;
  const navigate = useNavigate();
  const unsaved = useUnsavedCount();
  const { modal } = App.useApp();
  const goToTab = (next: string) =>
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set('gate', next);
        return p;
      },
      { replace: false },
    );
  // Each tab remounts its blocks (see the keyed container below), so unsaved
  // drafts on this tab would be lost — ask first, exactly as
  // UnsavedChangesGuard does for a link to another page (tabs are buttons, so
  // that guard never sees them).
  const selectTab = (next: string) => {
    if (next === tab) return;
    if (unsaved === 0) {
      goToTab(next);
      return;
    }
    modal.confirm({
      title: unsaved === 1 ? 'Leave with unsaved changes?' : `Leave with ${unsaved} unsaved sections?`,
      content: 'Edits you have not saved on this gate will be lost. Cancel, then use Save on the section you were editing.',
      okText: 'Switch without saving',
      okButtonProps: { danger: true },
      cancelText: 'Stay on this gate',
      onOk: () => goToTab(next),
    });
  };

  // Deep-link support for the "What's blocking Gate X" lists: a blocker link to
  // a section on THIS phase page carries `?scrollTo=<anchor id>`. The section
  // may sit on another tab, so switch to that tab first; once it is rendered,
  // scroll to it, briefly highlight it, then drop the param so a refresh does
  // not re-trigger the scroll.
  useEffect(() => {
    const targetId = searchParams.get('scrollTo');
    if (!targetId) return;
    const el = document.getElementById(targetId);
    if (!el) {
      const wanted = anchorTab(targetId);
      if (wanted && wanted !== tab) {
        setSearchParams(
          (prev) => {
            const p = new URLSearchParams(prev);
            p.set('gate', wanted);
            return p;
          },
          { replace: true },
        );
      }
      return;
    }
    void scrollToSection(el).then(() => flashSection(el));
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('scrollTo');
        return next;
      },
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, setSearchParams, tab]);

  const meta = PHASES.find((p) => p.phase === phase);
  if (!project || !config || !meta) return <Empty description="Not found" />;

  const progress = phaseProgress(project, phase);
  // F13 / B5: pre-work review. A not-yet-first phase that has opened prompts the
  // responsible owner to review and accept any pre-work entered before it opened.
  const closure = project.phaseClosures[phase];
  const preWorkAccepted = !!closure?.preWork?.acceptedBy;
  const showPreWorkReview = progress.state !== 'locked' && phase > 1 && !preWorkAccepted;
  const checklist = phaseCompletionChecklist(project, phase);
  const s42Triggers = skincareForTwoTriggers(project);
  const s42Incomplete = skincareForTwoIncompleteSections(project);
  const currentGateNum = currentGateNumber(project);
  const reviewOwnerText = config.reviewOwner ? composeReviewOwner(config.reviewOwner, project.identity.reviewers) : '';

  const gateMeta = (id: string) => GATES.find((g) => g.id === id)!;
  const stepState = (id: string) =>
    isGatePassed(project, id) ? 'passed' : gateIndex(id) === currentIdx ? 'current' : 'locked';

  const tabGateNumber = tab === CLOSE_TAB ? undefined : gateMeta(tab).number;
  const checkGateMatches = (gate: string) => (tab === CLOSE_TAB ? gate === 'ALL' || !config.gateIds.some((id) => gateMeta(id).number === gate) : gate === tabGateNumber);
  const keyChecks = project.gateChecks
    .map((check, index) => ({ check, index }))
    .filter((c) => config.gateIds.some((id) => gateMeta(id).number === c.check.gate) || (phase === 4 && c.check.gate === 'ALL'))
    .filter((c) => checkGateMatches(c.check.gate));
  const checklistSections = config.checklistSections.filter((s) => tabForRef(s.gate) === tab);
  const requirementSections = config.requirementSections.filter((s) => requirementTab(s.key) === tab);
  // The explicit assessments answered at this gate (config/assessments.ts). The
  // family-use one exists only for a Family use product.
  const assessments = ASSESSMENT_HOMES.filter(
    (a) => a.gateId === tab && (a.key !== 'familyUse' || isFamilyUseSelected(project)),
  );

  // Gates with a signature standing on them: the evidence each owns is read-only (SW-24), the same lock the
  // server enforces. A section is owned by its LAST gate (as the snapshot reads it); a row by its own gate number.
  const signedGates = new Set(GATES.filter((g) => isGateSignedStanding(project, g.id)).map((g) => g.id));
  const gateOfNumber = (n: string | undefined) => GATES.find((g) => g.number === n)?.id;
  const rowSigned = (n: string | undefined) => signedGates.has(gateOfNumber(n) ?? '');
  const sectionSigned = (ref: string | undefined) => {
    const ids = gateRefGateIds(ref);
    return signedGates.has(ids.length ? ids[ids.length - 1] : (gateOfNumber(ref) ?? ''));
  };

  const readiness = tab === CLOSE_TAB ? [] : gateReadinessChecklist(project, tab);
  const blockingCount = (id: string) =>
    gateReadinessChecklist(project, id).filter((i) => !i.satisfied && i.hardBlock).length;
  const metCount = (id: string) => gateReadinessChecklist(project, id).filter((i) => i.satisfied).length;
  const totalCount = (id: string) => gateReadinessChecklist(project, id).length;

  const jumpSections =
    tab === CLOSE_TAB
      ? [
          ...(keyChecks.length ? [{ id: 'sec-gate-checks', label: 'Key Gate Checks' }] : []),
          { id: 'sec-eight-angles', label: '8 Angles Coverage' },
          { id: 'sec-next-actions', label: 'Next Actions' },
          { id: 'sec-sign-off', label: 'Evidence Summary, Decision and Sign-Off' },
        ]
      : [
          ...(phase === 1 && tab === config.gateIds[0]
            ? [
                { id: 'sec-identification', label: 'Project Identification' },
              ]
            : []),
          { id: 'sec-gate-flow', label: 'Phase Gate Flow' },
          ...(phase === 1 && tab === config.gateIds[0] ? [{ id: 'sec-opportunity', label: 'Opportunity & Request (Gate 01)' }] : []),
          ...checklistSections.map((s) => ({ id: `sec-checklist-${s.key}`, label: s.title })),
          ...requirementSections.map((s) => ({ id: `sec-requirement-${s.key}`, label: s.title })),
          ...assessments.map((a) => ({ id: assessmentAnchor(a.key), label: `Assessment: ${a.title}` })),
          ...(keyChecks.length ? [{ id: 'sec-gate-checks', label: 'Key Gate Checks' }] : []),
          { id: 'sec-next-actions', label: 'Next Actions' },
          { id: 'sec-gate-signoff', label: `Gate ${tabGateNumber} sign-off` },
        ];

  const statusTag =
    progress.state === 'completed' ? (
      <span className="c-tag c-tag-dot c-tag-ok">Phase passed</span>
    ) : progress.awaitingApproval ? (
      <span className="c-tag c-tag-dot c-tag-warn">Awaiting phase sign-off</span>
    ) : progress.state === 'locked' ? (
      <span className="c-tag">
        <LockOutlined /> Locked
      </span>
    ) : (
      <span className="c-tag c-tag-dot">
        In progress · {progress.passedGates}/{progress.totalGates} gates passed
      </span>
    );

  // One status strip instead of four stacked notices: each condition is a chip,
  // the long explanation sits in its tooltip, the action (if any) beside it.
  const lastGateNum = gateMeta(config.gateIds[config.gateIds.length - 1]).number;
  const stripItems: React.ReactNode[] = [];
  if (progress.state === 'locked') {
    stripItems.push(
      <Tooltip
        key="locked"
        title="Gates must be completed in order. You can still review and fill the forms (draft evidence, requirements, notes, risks, proposed actions), but the gate flow, sign-off and formal closure stay read-only. Anything entered now is pre-work: once this phase opens, its review owner or the project's Lead must review and accept this phase's entries before they count towards completion."
      >
        <span className="c-tag c-tag-warn c-tag-dot">Phase locked — entries are pre-work</span>
      </Tooltip>,
    );
  }
  if (showPreWorkReview) {
    stripItems.push(
      <Tooltip
        key="prework"
        title="If any data in this phase was entered before the phase opened (pre-work), the phase's review owner or the project's Lead must review and formally accept it before it contributes to completion."
      >
        <span className="c-tag c-tag-warn c-tag-dot">Pre-work not reviewed</span>
      </Tooltip>,
      <Button key="prework-accept" type="link" size="small" icon={<CheckOutlined />} disabled={isPhaseDataLocked(project, phase)} onClick={() => acceptPreWork(project.identity.id, phase)}>
        Accept pre-work
      </Button>,
    );
  }
  // Round 4 question 16: an auto-generated "not applicable" on a critical item has
  // to be acknowledged by the phase's nominated "Reviewed by" before its gate can
  // close. Nobody can until the Lead nominates one, so say so up here rather than
  // leaving a blocker whose fix is on another tab [ASSUMPTION: R5-Q6].
  const pendingAcks = config.gateIds.flatMap((gid) =>
    isGatePassed(project, gid)
      ? []
      : gateReadinessChecklist(project, gid)
          .filter((i) => i.acknowledgement && i.acknowledgement.state !== 'acknowledged')
          .map((i) => ({ gid, id: i.id })),
  );
  if (pendingAcks.length > 0) {
    const ackReviewer = responsibleReviewer(project, config.gateIds[0]);
    const ackCount = `${pendingAcks.length} generated “not applicable” reason${pendingAcks.length === 1 ? '' : 's'}`;
    if (!ackReviewer?.userId) {
      stripItems.push(
        <Tooltip
          key="ack-nominate"
          title="Some items on this phase's critical gates do not apply to this project and the system wrote the reason itself, but such a reason must still be acknowledged by the responsible reviewer before the gate can close. The responsible reviewer is whoever is nominated as “Reviewed by” on this phase's sign-off."
        >
          <span className="c-tag c-tag-warn c-tag-dot">{ackCount} need a responsible reviewer — nominate “Reviewed by”</span>
        </Tooltip>,
        <Button key="ack-nominate-go" type="link" size="small" disabled={false} onClick={() => selectTab(CLOSE_TAB)}>
          Go to sign-offs
        </Button>,
      );
    } else {
      const mine = ackReviewer.userId === sessionUser?.id;
      stripItems.push(
        <Tooltip
          key="ack-wait"
          title="Each one is acknowledged on its gate's readiness list, by the person nominated as “Reviewed by” on this phase's sign-off."
        >
          <span className="c-tag c-tag-warn c-tag-dot">
            {mine ? `${ackCount} await your acknowledgement` : `${ackCount} await ${ackReviewer.name ?? 'the nominated reviewer'}`}
          </span>
        </Tooltip>,
      );
    }
  }
  if (progress.awaitingApproval) {
    stripItems.push(
      <Tooltip key="await" title="Record the Prepared, Reviewed and Approved by sign-offs in the close-out to complete the phase and unlock the next one.">
        <span className="c-tag c-tag-warn c-tag-dot">All gates passed — phase sign-off required</span>
      </Tooltip>,
    );
    if (tab !== CLOSE_TAB) {
      stripItems.push(
        <Button key="await-go" type="link" size="small" disabled={false} onClick={() => selectTab(CLOSE_TAB)}>
          Go to close-out
        </Button>,
      );
    }
  } else if (progress.state !== 'completed') {
    stripItems.push(
      <span key="after" className="ph-small">
        Phase sign-off opens after Gate {lastGateNum}
      </span>,
    );
  }
  if (phase === 3 && s42Triggers.length > 0) {
    const outstanding = s42Incomplete.length > 0;
    stripItems.push(
      <Tooltip
        key="s42"
        title={
          outstanding
            ? `Triggered by: ${s42Triggers.join(', ')}. Gate 07 is hard-blocked until the mandatory maternal and infant-contact safety sections are fully completed. Outstanding: ${s42Incomplete.join('; ')}.`
            : `Triggered by: ${s42Triggers.join(', ')}. All mandatory maternal and infant-contact safety sections are complete — Gate 07 is no longer blocked by this screen.`
        }
      >
        <span className={`c-tag c-tag-dot ${outstanding ? 'c-tag-bad' : 'c-tag-ok'}`}>
          Skincare for Two {outstanding ? `— ${s42Incomplete.length} section(s) outstanding` : '— complete'}
        </span>
      </Tooltip>,
    );
  }
  const statusStrip = stripItems.length > 0 && (
    <div className="ph-strip">
      {stripItems.map((item, i) => (
        <span key={i} className="ph-strip-item">
          {item}
        </span>
      ))}
    </div>
  );

  // The sign-off item can only be satisfied BY signing, so it is not counted as something still blocking the
  // way to the sign-off, and it carries no link of its own: the one button below is the way in (2026-10-11).
  const signoffId = `sg${tabGateNumber}-signoff`;
  // The Phase Gate Flow card must be complete and saved before anybody signs (SW-26). The card says so under its
  // own fields, but the readiness panel is where the button's state comes from, so it lists it as an item too.
  const flowMissing =
    tab === CLOSE_TAB
      ? []
      : [
          ...(project.gates.find((g) => g.gateId === tab)?.status !== 'Complete' ? ['Stage status → Complete'] : []),
          ...gateFlowMissing(project, tab),
        ];
  const flowItem: GateReadinessItem = {
    id: `sg${tabGateNumber}-gate-flow`,
    label: flowMissing.length
      ? `Phase Gate Flow — complete and save: ${flowMissing.join(' · ')}`
      : 'Phase Gate Flow complete',
    hardBlock: true,
    satisfied: flowMissing.length === 0,
    link: { href: `/phase/${phase}`, scrollToId: 'sec-gate-flow' },
  };
  const readinessItems = [
    ...(tab === CLOSE_TAB ? [] : [flowItem]),
    ...readiness.map((i) => (i.id === signoffId ? { ...i, link: undefined } : i)),
  ];
  const hardBlocking = readinessItems.filter((i) => !i.satisfied && i.hardBlock && i.id !== signoffId).length;
  const goSignoff = () => {
    const el = document.getElementById('sec-gate-signoff');
    if (!el) return;
    void scrollToSection(el).then(() => flashSection(el));
  };
  // Once this gate has passed (three signatures recorded) the button stops pointing at the sign-off and points at
  // what comes next: the next gate, this phase's close-out, or the next phase.
  const gatePassed = tab !== CLOSE_TAB && stepState(tab) === 'passed';
  const nextGateId = config.gateIds[config.gateIds.indexOf(tab) + 1];
  const nextPhaseMeta = PHASES.find((p) => p.phase === phase + 1);
  const lastSignedAt = project.gateSignOffs
    .filter((x) => x.gateId === tab && x.signedAt)
    .map((x) => x.signedAt as string)
    .sort()
    .pop();
  const nextStep: { label: string; hint?: string; disabledReason?: string; go: () => void } | null = !gatePassed
    ? null
    : nextGateId
      ? {
          label: `Next · Gate ${gateMeta(nextGateId).number}`,
          hint: gateMeta(nextGateId).name,
          disabledReason:
            stepState(nextGateId) === 'locked'
              ? `Gate ${gateMeta(nextGateId).number} is not open for work yet — every gate before it has to pass first.`
              : undefined,
          go: () => selectTab(nextGateId),
        }
      : progress.state !== 'completed'
        ? { label: 'Next · Close-out', hint: 'Phase sign-off', go: () => selectTab(CLOSE_TAB) }
        : nextPhaseMeta
          ? {
              label: `Next · Phase ${nextPhaseMeta.phase}`,
              hint: nextPhaseMeta.title,
              go: () => navigate(`/projects/${project.identity.id}/phase/${nextPhaseMeta.phase}`),
            }
          : null;
  // Grey while anything else still blocks; blue with a single soft pulse once only the signatures are left.
  const signoffButton = (block?: boolean) => {
    if (nextStep) {
      return (
        <Tooltip title={nextStep.disabledReason}>
          <span style={{ display: 'block' }}>
            <Button
              block={block}
              type="primary"
              className={`ph-go ph-go-next${nextStep.disabledReason ? '' : ' ph-go-ready'}`}
              disabled={!!nextStep.disabledReason}
              onClick={nextStep.go}
            >
              <span className="ph-go-text">
                <span className="ph-go-kicker">{nextStep.label}</span>
                <span className="ph-go-title">{nextStep.hint ?? 'Open'}</span>
              </span>
              <ArrowRightOutlined />
            </Button>
          </span>
        </Tooltip>
      );
    }
    return (
      <Tooltip title={hardBlocking ? `${hardBlocking} item${hardBlocking === 1 ? '' : 's'} still blocking — you can still open the sign-off` : undefined}>
        <Button
          block={block}
          disabled={false}
          type={hardBlocking ? 'default' : 'primary'}
          className={hardBlocking ? 'ph-go ph-go-wait' : 'ph-go ph-go-ready'}
          icon={<ArrowDownOutlined />}
          onClick={goSignoff}
        >
          Go to sign-off
        </Button>
      </Tooltip>
    );
  };

  return (
    <div className="concept ph">
      <SectionJumpButton sections={jumpSections} />

      <div className="ph-header">
        <div className="ph-title-row">
          <h1 className="ph-title">
            {phaseLabel(phase)}
          </h1>
          {statusTag}
        </div>
        <p className="ph-meta">
          {meta.name} · {project.identity.id} · {project.identity.productSku} · Responsible departments:{' '}
          {meta.department.split('/').map((d) => d.trim().charAt(0) + d.trim().slice(1).toLowerCase()).join(', ')}
          {reviewOwnerText && (
            <>
              {' '}· Review owner <b>{reviewOwnerText}</b>
            </>
          )}
        </p>
        {PHASE_NOTES[phase] && <p className="ph-note">{PHASE_NOTES[phase]}</p>}
        <PhaseKeyLinksCard links={config.keyLinks} project={project} phase={phase} />
      </div>

      <nav className="c-card ph-steps" aria-label="Gates in this phase">
        {config.gateIds.map((id, k) => {
          const st = stepState(id);
          const g = gateMeta(id);
          const blocking = blockingCount(id);
          return (
            <button
              key={id}
              type="button"
              className={`ph-step ph-step-${st}`}
              aria-current={tab === id ? 'step' : undefined}
              onClick={() => selectTab(id)}
            >
              <span className="ph-step-dot">{st === 'passed' ? <CheckOutlined /> : st === 'locked' ? <LockOutlined /> : k + 1}</span>
              <span className="ph-step-text">
                <span className="ph-step-title">Gate {g.number}</span>
                <span className="ph-step-sub">{g.name}</span>
                <span className={`ph-step-meta${st === 'current' && blocking ? ' ph-step-meta-bad' : ''}`}>
                  {st === 'passed'
                    ? `Passed · ${project.gates.find((r) => r.gateId === id)?.decision ?? ''}`
                    : st === 'current'
                      ? `${blocking} blocking · ${metCount(id)}/${totalCount(id)} met`
                      : 'Not open yet'}
                </span>
              </span>
            </button>
          );
        })}
        <button
          type="button"
          className={`ph-step ph-step-${progress.state === 'completed' ? 'passed' : progress.awaitingApproval ? 'current' : 'locked'}`}
          aria-current={tab === CLOSE_TAB ? 'step' : undefined}
          onClick={() => selectTab(CLOSE_TAB)}
        >
          <span className="ph-step-dot">
            {progress.state === 'completed' ? <CheckOutlined /> : progress.awaitingApproval ? config.gateIds.length + 1 : <LockOutlined />}
          </span>
          <span className="ph-step-text">
            <span className="ph-step-title">Close-out</span>
            <span className="ph-step-sub">8 angles, actions, sign-off</span>
            <span className="ph-step-meta">
              {progress.state === 'completed' ? 'Signed off' : progress.awaitingApproval ? 'Ready to sign' : `After Gate ${gateMeta(config.gateIds[config.gateIds.length - 1]).number}`}
            </span>
          </span>
        </button>
      </nav>
      {tab !== CLOSE_TAB && gateMeta(tab)?.purpose && <p className="ph-gate-purpose">{gateMeta(tab)?.purpose}</p>}

      {/* Keyed by tab: every block below keeps its own draft and drawer state,
          and without a remount switching tabs carried them across — an open
          drawer, or one gate's unsaved Next Actions draft, onto another gate. */}
      {tab === CLOSE_TAB ? (
        <div className="ph-stack" key={CLOSE_TAB}>
          {statusStrip}
          {keyChecks.length > 0 && (
            <div id="sec-gate-checks">
              <GateChecksTable
                projectId={project.identity.id}
                title="Key Gate Checks — all gates"
                checks={keyChecks}
                currentGateNumber={currentGateNum}
                isRowLocked={(check) => isGateRefLocked(project, check.gate) || rowSigned(check.gate)}
              />
            </div>
          )}
          {requirementSections.map((section) => (
            <div key={section.key} id={`sec-requirement-${section.key}`}>
              <RequirementTable
                projectId={project.identity.id}
                sectionKey={section.key}
                title={section.title}
                items={project.requirements[section.key] ?? []}
                currentGateNumber={currentGateNum}
                isRowLocked={(item) => isGateRefLocked(project, item.gate) || rowSigned(item.gate) || (item.gate === 'ALL' && isPhaseDataLocked(project, 4))}
                columns={section.columns}
                allowNotApplicable={section.allowNotApplicable}
              />
            </div>
          ))}
          <div id="sec-eight-angles">
            <EightAnglesTable
              projectId={project.identity.id}
              phase={phase}
              angles={project.phaseClosures[phase].angles}
              locked={isPhaseDataLocked(project, phase)}
            />
          </div>
          <div id="sec-next-actions">
            <NextActionsCard project={project} projectId={project.identity.id} gateIds={config.gateIds} actions={project.nextActions} />
          </div>
          {closure?.preWork?.acceptedBy && (
            <p className="ph-small">
              Pre-work reviewed and accepted by {closure.preWork.acceptedBy}
              {closure.preWork.acceptedDate ? ` on ${closure.preWork.acceptedDate}` : ''}.
            </p>
          )}
          <div id="sec-sign-off">
            <SignOffBlock
              projectId={project.identity.id}
              phase={phase}
              closure={project.phaseClosures[phase]}
              checklist={checklist}
              projectLead={project.identity.projectLead}
            />
          </div>
        </div>
      ) : (
        <div className="ph-body" key={tab}>
          <div className="ph-stack">
            {statusStrip}

            {/* Phase 1, Gate 01 only: Countries / Markets is Gate 1 evidence since
                Round 4 question 24, so the identification card (editable markets)
                lives with the Opportunity & Request capture it belongs to. */}
            {phase === 1 && tab === config.gateIds[0] && (
              <>
                <div id="sec-identification">
                  <ProjectIdentificationCard project={project} editableMarkets />
                </div>
              </>
            )}

            {/* Phase Gate Flow comes right after Project Identification, as in the SME's workbook: its Stage
                status is the gate's current state, so it is read and kept up to date first. */}
            <div id="sec-gate-flow">
              <GateFlowTable project={project} gateIds={[tab]} layout="card" hideReadiness part="flow" />
            </div>

            {phase === 1 && tab === config.gateIds[0] && (
              <div id="sec-opportunity">
                <OpportunityRequestCard project={project} />
              </div>
            )}

            {checklistSections.map((section) => (
              <div key={section.key} id={`sec-checklist-${section.key}`}>
                <ChecklistSection
                  untickBlockedReason={
                    section.key === 'targetUsers'
                      ? (label) => {
                          const pin = targetUsersPinnedByAssessment(project).find((p) => p.label === label);
                          return pin
                            ? `The Vulnerable-User Assessment has a "${pin.group}" row because this is selected. Remove that row first.`
                            : undefined;
                        }
                      : undefined
                  }
                  projectId={project.identity.id}
                  sectionKey={section.key}
                  title={section.title}
                  gate={section.gate}
                  items={project.checklists[section.key] ?? []}
                  currentGateNumber={currentGateNum}
                  readOnly={isGateRefLocked(project, section.gate) || sectionSigned(section.gate)}
                  requiresPrimary={section.requiresPrimary}
                />
              </div>
            ))}

            {requirementSections.map((section) => (
              <div key={section.key} id={`sec-requirement-${section.key}`}>
                <RequirementTable
                  projectId={project.identity.id}
                  sectionKey={section.key}
                  title={section.title}
                  items={project.requirements[section.key] ?? []}
                  currentGateNumber={currentGateNum}
                  viewedGateNumber={GATES.find((g) => g.id === tab)?.number}
                  isRowLocked={(item) => isGateRefLocked(project, item.gate) || rowSigned(item.gate) || (item.gate === 'ALL' && isPhaseDataLocked(project, 4))}
                  columns={section.columns}
                  allowNotApplicable={section.allowNotApplicable}
                />
              </div>
            ))}

            {assessments.map((a) => (
              a.key === 'changeControl' ? (
                <ChangeControlAssessments key={a.key} project={project} />
              ) : (
                <AssessmentBlock key={a.key} project={project} which={a.key} />
              )
            ))}

            {keyChecks.length > 0 && (
              <div id="sec-gate-checks">
                <GateChecksTable
                  projectId={project.identity.id}
                  title="Key Gate Checks"
                  showGate={false}
                  checks={keyChecks}
                  currentGateNumber={currentGateNum}
                  isRowLocked={(check) => isGateRefLocked(project, check.gate) || rowSigned(check.gate)}
                />
              </div>
            )}

            {phase === 4 && tab === 'SG11' && (
              <div id="sec-market-tracking">
                <MarketTrackingCard
                  projectId={project.identity.id}
                  tracks={[...currentMarketTracks(project), ...legacyOnMarketTracks(project)]}
                  currentVersion={project.formulaVersion}
                />
              </div>
            )}
            {/* Round 4 questions 13 and 14: the schedule runs from each market's
                actual commercial launch date. `enhanced` is the same PV/PMS
                condition Gate 12 evaluates. */}
            {phase === 4 && tab === 'SG12' && (
              <PostLaunchReviewCard project={project} enhanced={evaluateTrigger(project, 'pvPmsRequired') === 'applies'} />
            )}

            <div id="sec-next-actions">
              <NextActionsCard project={project} projectId={project.identity.id} gateIds={[tab]} actions={project.nextActions} />
            </div>

            {/* The three signatures come last: they attest to the evidence above. */}
            <div id="sec-gate-signoff">
              <GateFlowTable project={project} gateIds={[tab]} layout="card" hideReadiness part="signoff" />
            </div>
          </div>

          <aside className="ph-rail">
            <div className="c-card ph-rail-card">
              <div className="ph-rail-head">
                <div className="ph-rail-title">Gate {tabGateNumber} readiness</div>
                <div className={`ph-rail-sub${hardBlocking ? ' ph-bad' : ''}`}>
                  {stepState(tab) === 'passed'
                    ? 'Passed'
                    : hardBlocking
                      ? `${hardBlocking} blocking the sign-off`
                      : 'Ready for the signatures'}
                </div>
              </div>
              <div className="ph-rail-body">
                <GateReadinessPanel
                  gateNumber={tabGateNumber ?? ''}
                  project={project}
                  keepGate={tab}
                  items={readinessItems}
                  projectId={project.identity.id}
                  currentPath={location.pathname}
                  showSatisfied={showSatisfied}
                  onToggleSatisfied={() => setShowSatisfied((v) => !v)}
                  hideSummary
                  signatureItemId={signoffId}
                />
              </div>
              <div className="ph-rail-foot">
                {gatePassed && lastSignedAt && (
                  <button type="button" className="ph-signed-line" onClick={goSignoff}>
                    <CheckOutlined />
                    <span>Signed by 3 of 3 · {dayjs(lastSignedAt).format('YYYY-MM-DD HH:mm')}</span>
                    <span className="ph-signed-view">View <ArrowDownOutlined /></span>
                  </button>
                )}
                {signoffButton(true)}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
