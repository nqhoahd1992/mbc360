import type { ProjectData } from '@mbc360/shared/types';
import type { AssessmentKey } from '@mbc360/shared/config/assessments';
import { assessmentStatus } from './assessmentStatus';

// Where an assessment stands, in words, at the top right of its block — the same one-liner the Project Overview lists, so the block
// and the overview can never disagree. Amber is exactly what blocks a gate.
export default function AssessmentStateTag({ project, assessmentKey }: { project: ProjectData; assessmentKey: AssessmentKey }) {
  const { text, tone } = assessmentStatus(project, assessmentKey);
  const cls = tone === 'ok' ? 'c-tag-ok' : tone === 'warn' ? 'c-tag-warn' : '';
  return (
    <span className={`c-tag c-tag-dot as-state ${cls}`} title={text}>
      {text}
    </span>
  );
}
