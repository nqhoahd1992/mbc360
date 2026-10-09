import { useEffect, useState } from 'react';
import { App, Button, Empty, Tooltip } from 'antd';
import { ArrowDownOutlined, CheckOutlined, LockOutlined } from '@ant-design/icons';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import {
  currentGateIndex,
  currentGateNumber,
  evaluateTrigger,
  gateIndex,
  gateReadinessChecklist,
  gateRefGateIds,
  isGatePassed,
  isGateRefLocked,
  phaseCompletionChecklist,
  phaseProgress,
  skincareForTwoIncompleteSections,
  skincareForTwoTriggers,
  isPhaseDataLocked,
} from '@mbc360/shared/utils/gateProgress';
import { useAppStore } from '../store/useAppStore';
import { GATES, PHASES, phaseLabel } from '@mbc360/shared/config/gates';
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
  const location = useLocation();
  const [showSatisfied, setShowSatisfied] = useState(false);
  // Scroll a section into view. A section near the end of the page cannot reach
  // the top (the page is not tall enough) and stops partway; the highlight ring
  // the caller adds is what tells the user which card they were taken to.
  const scrollToSection = (el: HTMLElement) => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  };

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
    scrollToSection(el);
    flashSection(el);
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
                { id: 'sec-opportunity', label: 'Opportunity & Request (Gate 01)' },
              ]
            : []),
          ...checklistSections.map((s) => ({ id: `sec-checklist-${s.key}`, label: s.title })),
          ...requirementSections.map((s) => ({ id: `sec-requirement-${s.key}`, label: s.title })),
          ...assessments.map((a) => ({ id: assessmentAnchor(a.key), label: `Assessment: ${a.title}` })),
          ...(keyChecks.length ? [{ id: 'sec-gate-checks', label: 'Key Gate Checks' }] : []),
          { id: 'sec-next-actions', label: 'Next Actions' },
          { id: 'sec-gate-flow', label: `Gate ${tabGateNumber} decision and sign-off` },
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
  if (progress.awaitingApproval) {
    stripItems.push(
      <Tooltip key="await" title="Record the Prepared, Reviewed and Approved by sign-offs in the close-out to complete the phase and unlock the next one.">
        <span className="c-tag c-tag-warn c-tag-dot">All gates passed — phase sign-off required</span>
      </Tooltip>,
    );
    if (tab !== CLOSE_TAB) {
      stripItems.push(
        <Button key="await-go" type="link" size="small" onClick={() => selectTab(CLOSE_TAB)}>
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

  const goToDecision = () => {
    const el = document.getElementById('sec-gate-flow');
    if (!el) return;
    scrollToSection(el);
    flashSection(el);
  };
  const tabRecord = tab === CLOSE_TAB ? undefined : project.gates.find((r) => r.gateId === tab);
  const hardBlocking = readiness.filter((i) => !i.satisfied && i.hardBlock).length;
  const gateSummary = tabRecord && (
    <div className="c-card ph-summary">
      <div>
        <div className="ph-summary-k">Status</div>
        <span className="c-tag c-tag-dot">{tabRecord.status}</span>
      </div>
      <div>
        <div className="ph-summary-k">Owner</div>
        <div className="ph-summary-v">{tabRecord.owner || '—'}</div>
      </div>
      <div>
        <div className="ph-summary-k">Due</div>
        <div className="ph-summary-v">{tabRecord.dueDate || '—'}</div>
      </div>
      <div>
        <div className="ph-summary-k">Readiness</div>
        <div className={`ph-summary-v${hardBlocking ? ' ph-bad' : ''}`}>{hardBlocking ? `${hardBlocking} blocking` : 'Ready to decide'}</div>
      </div>
      <Button className="ph-summary-go" icon={<ArrowDownOutlined />} onClick={goToDecision}>
        Go to decision
      </Button>
    </div>
  );

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
          {meta.name} · {project.identity.id} · {project.identity.productSku} · {meta.department}
          {reviewOwnerText && (
            <>
              {' '}· Review owner <b>{reviewOwnerText}</b>
            </>
          )}
        </p>
        {PHASE_NOTES[phase] && <p className="ph-note">{PHASE_NOTES[phase]}</p>}
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
                isRowLocked={(check) => isGateRefLocked(project, check.gate)}
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
                isRowLocked={(item) => isGateRefLocked(project, item.gate) || (item.gate === 'ALL' && isPhaseDataLocked(project, 4))}
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
          <PhaseKeyLinksCard links={config.keyLinks} project={project} phase={phase} />
        </div>
      ) : (
        <div className="ph-body" key={tab}>
          <div className="ph-stack">
            {statusStrip}
            {gateSummary}

            {/* Phase 1, Gate 01 only: Countries / Markets is Gate 1 evidence since
                Round 4 question 24, so the identification card (editable markets)
                lives with the Opportunity & Request capture it belongs to. */}
            {phase === 1 && tab === config.gateIds[0] && (
              <>
                <div id="sec-identification">
                  <ProjectIdentificationCard project={project} editableMarkets />
                </div>
                <div id="sec-opportunity">
                  <OpportunityRequestCard project={project} />
                </div>
              </>
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
                  readOnly={isGateRefLocked(project, section.gate)}
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
                  isRowLocked={(item) => isGateRefLocked(project, item.gate) || (item.gate === 'ALL' && isPhaseDataLocked(project, 4))}
                  columns={section.columns}
                  allowNotApplicable={section.allowNotApplicable}
                />
              </div>
            ))}

            {assessments.map((a) => (
              <AssessmentBlock key={a.key} project={project} which={a.key} />
            ))}

            {keyChecks.length > 0 && (
              <div id="sec-gate-checks">
                <GateChecksTable
                  projectId={project.identity.id}
                  title="Key Gate Checks"
                  showGate={false}
                  checks={keyChecks}
                  currentGateNumber={currentGateNum}
                  isRowLocked={(check) => isGateRefLocked(project, check.gate)}
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

            {/* The decision and the three signatures come last: they attest to
                the evidence above, so they are made after it, not before. */}
            <div id="sec-gate-flow">
              <GateFlowTable project={project} gateIds={[tab]} layout="card" hideReadiness />
            </div>
          </div>

          <aside className="ph-rail">
            <div className="c-card ph-rail-card">
              <div className="ph-rail-head">
                <div className="ph-rail-title">Gate {tabGateNumber} readiness</div>
                <div className={`ph-rail-sub${readiness.some((i) => !i.satisfied && i.hardBlock) ? ' ph-bad' : ''}`}>
                  {stepState(tab) === 'passed'
                    ? 'Passed'
                    : readiness.some((i) => !i.satisfied && i.hardBlock)
                      ? `${readiness.filter((i) => !i.satisfied && i.hardBlock).length} blocking the decision`
                      : 'Nothing blocking — ready to decide'}
                </div>
              </div>
              <div className="ph-rail-body">
                <GateReadinessPanel
                  gateNumber={tabGateNumber ?? ''}
                  items={readiness}
                  projectId={project.identity.id}
                  currentPath={location.pathname}
                  showSatisfied={showSatisfied}
                  onToggleSatisfied={() => setShowSatisfied((v) => !v)}
                  hideSummary
                />
              </div>
              <div className="ph-rail-foot">
                <Button block type={hardBlocking ? 'default' : 'primary'} icon={<ArrowDownOutlined />} onClick={goToDecision}>
                  {hardBlocking ? 'Go to decision' : 'Sign and decide'}
                </Button>
              </div>
            </div>
            <div id="sec-key-links">
              <PhaseKeyLinksCard links={config.keyLinks} project={project} phase={phase} />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
