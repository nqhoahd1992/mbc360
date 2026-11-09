import { RightOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { ProjectData } from '@mbc360/shared/types';
import { GATES } from '@mbc360/shared/config/gates';
import { ASSESSMENT_HOMES, assessmentAnchor } from '@mbc360/shared/config/assessments';
import { assessmentStatus } from './assessmentStatus';
import '../styles/concept.css';
import './AssessmentsCard.css';

export default function AssessmentSummary({ project }: { project: ProjectData }) {
  const id = project.identity.id;
  const rows = ASSESSMENT_HOMES.map((home) => {
    const gate = GATES.find((g) => g.id === home.gateId)!;
    return { home, gate, ...assessmentStatus(project, home.key) };
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
