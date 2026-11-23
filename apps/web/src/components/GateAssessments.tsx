import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { ProjectData } from '@mbc360/shared/types';
import { assessmentAnchor, type AssessmentHome } from '@mbc360/shared/config/assessments';
import { isMarketAdditionPending } from '@mbc360/shared/utils/marketAdditions';
import AssessmentBlock from './AssessmentBlock';
import ChangeControlAssessments from './ChangeControlAssessments';
import ScaleUpAssessments from './ScaleUpAssessments';
import MarketAdditionAssessments from './MarketAdditionAssessments';
import StudyApprovalCard from './StudyApprovalCard';
import DrawerTabs, { type DrawerTab } from './DrawerTabs';
import { assessmentStatus } from './assessmentStatus';
import './AssessmentsCard.css';

// Every assessment a gate asks for, in ONE place (project owner, 2026-11-23: a gate page can carry several Assessment blocks — Gate 12 has up to
// three — so they are gathered into one card and split into tabs by assessment). With a single assessment nothing changes: it shows as its own
// card, so Gates 3, 8 and 9 look as before. With two or more, one "Assessments" card holds a tab each; a tab carries a dot while its assessment
// still needs someone. The market's own impact assessment (a market added after Gate 1) comes first, because it holds that market's release.
const SHORT_LABEL: Record<string, string> = {
  familyUse: 'Family use',
  administrativeOnly: 'Administrative-only',
  humanStudy: 'Human study',
  scaleUp: 'Scale-up',
  pmsUnstructured: 'Enhanced surveillance',
  changeControl: 'Change Control',
};

const MARKET_ANCHOR = 'sec-market-assessment';

interface Entry extends DrawerTab {
  anchors: string[];
  // The assessment on its own, when it is the only one.
  bare: ReactNode;
}

export default function GateAssessments({
  project,
  homes,
  market,
}: {
  project: ProjectData;
  homes: AssessmentHome[];
  market?: string;
}) {
  const [searchParams] = useSearchParams();
  const [own, setOwn] = useState<string | undefined>();

  const entries: Entry[] = [];
  const addition = market ? (project.marketAdditionAssessments ?? []).find((a) => a.market === market) : undefined;
  if (addition) {
    const node = <MarketAdditionAssessments projectId={project.identity.id} entry={addition} />;
    entries.push({
      key: 'market',
      label: `Impact — ${addition.market}`,
      dot: isMarketAdditionPending(addition),
      anchors: [MARKET_ANCHOR],
      children: node,
      bare: <div id={MARKET_ANCHOR}>{node}</div>,
    });
  }
  for (const a of homes) {
    if (a.key === 'foreseeableContact') continue; // answered inside the Target Users card
    const node: ReactNode =
      a.key === 'changeControl' ? (
        <ChangeControlAssessments project={project} market={market} />
      ) : a.key === 'scaleUp' ? (
        <ScaleUpAssessments project={project} />
      ) : a.key === 'humanStudy' ? (
        <>
          <AssessmentBlock project={project} which={a.key} />
          {/* The study approval workflow (rule C2): the route a human-participant study goes through. Not part of the workbook's sheet. */}
          {project.assessments.humanStudyPlanned !== 'No' && <StudyApprovalCard projectId={project.identity.id} approvals={project.studyApprovals} />}
        </>
      ) : (
        <AssessmentBlock project={project} which={a.key} />
      );
    entries.push({
      key: a.key,
      label: SHORT_LABEL[a.key] ?? a.title,
      dot: assessmentStatus(project, a.key).tone === 'warn',
      anchors: [assessmentAnchor(a.key)],
      children: node,
      bare: node,
    });
  }

  // A blocker link names an anchor inside one of the tabs: open that tab in the same render, so the section is visible when the page scrolls to
  // it (and keep it open after the link's parameter is dropped).
  const wanted = searchParams.get('scrollTo');
  const forced = wanted ? entries.find((e) => e.anchors.includes(wanted))?.key : undefined;
  if (forced && forced !== own) setOwn(forced);

  if (entries.length === 0) return null;
  if (entries.length === 1) return <>{entries[0].bare}</>;

  const active = entries.some((e) => e.key === own) ? own : entries[0].key;
  return (
    <section className="c-card as-tabs-card" id="sec-assessments">
      <div className="as-head">
        <div className="as-head-text">
          <div className="as-kicker">Assessments</div>
          <h2 className="as-title">Assessments at this gate</h2>
        </div>
      </div>
      <DrawerTabs
        forceRender
        activeKey={active}
        onChange={setOwn}
        tabs={entries.map((e) => ({
          key: e.key,
          label: e.label,
          dot: e.dot,
          // The market tab keeps the anchor the readiness list links to.
          children: e.key === 'market' ? <div id={MARKET_ANCHOR}>{e.children}</div> : e.children,
        }))}
      />
    </section>
  );
}
