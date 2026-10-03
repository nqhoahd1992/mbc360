import { RightOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { ProjectData } from '@mbc360/shared/types';
import { familyUseAgeGroupList } from '@mbc360/shared/types';
import { GATES } from '@mbc360/shared/config/gates';
import { ASSESSMENT_HOMES, assessmentAnchor, type AssessmentKey } from '@mbc360/shared/config/assessments';
import { evaluateTrigger } from '@mbc360/shared/utils/gateProgress';
import { isFamilyUseSelected } from './AssessmentBlock';
import '../styles/concept.css';
import './AssessmentsCard.css';

type Tone = 'ok' | 'warn' | 'muted';

// The overview's one-line-per-assessment summary (2026-10-03). The answers are
// recorded on their gates' tabs (AssessmentBlock); this only says where each
// stands and links there. "Waiting" is the engine's own `notAssessed` state, so
// what is amber here is exactly what blocks a gate.
function status(project: ProjectData, key: AssessmentKey): { text: string; tone: Tone } {
  const a = project.assessments;
  const v = (s?: string) => s?.trim() ?? '';
  const home = ASSESSMENT_HOMES.find((h) => h.key === key)!;
  const waiting = evaluateTrigger(project, home.trigger) === 'notAssessed';
  switch (key) {
    case 'familyUse': {
      if (!isFamilyUseSelected(project)) return { text: 'Not asked — Family use is not a target user', tone: 'muted' };
      const groups = familyUseAgeGroupList(a);
      return groups.length ? { text: groups.join(', '), tone: 'ok' } : { text: 'Age groups not yet confirmed', tone: 'warn' };
    }
    case 'administrativeOnly': {
      const ans = v(a.administrativeOnly);
      if (!ans) return { text: 'Not recorded', tone: 'muted' };
      if (ans === 'Yes' && !v(a.administrativeOnlyConfirmedBy)) return { text: 'Yes — not yet confirmed', tone: 'warn' };
      return { text: ans === 'Yes' ? `Yes — confirmed by ${v(a.administrativeOnlyConfirmedBy)}` : ans, tone: 'ok' };
    }
    case 'humanStudy': {
      const started = (project.registers['studyProtocolSetup'] ?? []).some((r) => String(r.plannedValue ?? '').trim() !== '');
      if (started) return { text: 'Yes — a Study Protocol has been started', tone: 'ok' };
      return waiting ? { text: v(a.humanStudyPlanned) || 'Not yet assessed', tone: 'warn' } : { text: v(a.humanStudyPlanned), tone: 'ok' };
    }
    case 'scaleUp':
      return waiting
        ? { text: v(a.scaleUpRiskIdentified) || 'Not yet assessed', tone: 'warn' }
        : { text: v(a.scaleUpRiskIdentified) || 'Counts as identified (Major formula change)', tone: 'ok' };
    case 'changeControl':
      return waiting
        ? { text: v(a.changeControlRequired) || 'Not yet assessed', tone: 'warn' }
        : { text: v(a.changeControlRequired) || 'Counts as Yes (a change control is open)', tone: 'ok' };
  }
}

export default function AssessmentSummary({ project }: { project: ProjectData }) {
  const id = project.identity.id;
  const rows = ASSESSMENT_HOMES.map((home) => {
    const gate = GATES.find((g) => g.id === home.gateId)!;
    return { home, gate, ...status(project, home.key) };
  });
  const waiting = rows.filter((r) => r.tone === 'warn').length;
  return (
    <section className="c-card asum">
      <div className="asum-head">
        <h2 className="asum-title">Assessments</h2>
        <p className="asum-sub">
          {waiting > 0 ? (
            <b className="asum-warn">
              {waiting} waiting for an answer — each blocks its gate until answered
            </b>
          ) : (
            'Nothing waiting for an answer'
          )}
          {' · '}answered on each gate&rsquo;s tab
        </p>
      </div>
      <ul className="asum-list">
        {rows.map(({ home, gate, text, tone }) => (
          <li key={home.key}>
            <Link
              className="asum-row"
              to={`/projects/${id}/phase/${gate.phase}?gate=${gate.id}&scrollTo=${assessmentAnchor(home.key)}`}
            >
              <span className="c-tag asum-gate">Gate {gate.number}</span>
              <span className="asum-q">{home.title}</span>
              <span className={`asum-a asum-${tone}`}>{text}</span>
              <RightOutlined className="asum-chev" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
