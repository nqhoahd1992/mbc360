import { ASSESSMENT_HOMES, type AssessmentKey } from '@mbc360/shared/config/assessments';
import { acknowledgementsOpenedBy } from '@mbc360/shared/utils/readinessAck';
import './AssessmentsCard.css';

// Said inside an assessment that can open an acknowledgement: an answer that leaves a critical item "not applicable" makes the system
// write that reason, and the person holding the function named here must acknowledge it. Computed from the same tables the
// acknowledgement uses, so it is shown exactly where one can follow and never where one cannot.
export default function AcknowledgementNote({ assessmentKey }: { assessmentKey: AssessmentKey }) {
  const home = ASSESSMENT_HOMES.find((h) => h.key === assessmentKey);
  if (!home) return null;
  const opened = acknowledgementsOpenedBy([home.trigger, ...(home.alsoDecides ?? [])]);
  if (opened.length === 0) return null;

  // One entry per function, with the gates it will be asked at.
  const byFunction = new Map<string, Set<number>>();
  for (const o of opened) {
    for (const fn of o.functions) {
      if (!byFunction.has(fn)) byFunction.set(fn, new Set());
      byFunction.get(fn)!.add(Number(o.gateId.replace('SG', '')));
    }
  }
  const parts = [...byFunction].map(([fn, gates]) => {
    const list = [...gates].sort((a, b) => a - b);
    return `${fn} (${list.length === 1 ? 'Gate' : 'Gates'} ${list.join(', ')})`;
  });

  return (
    <p className="as-ack" role="note">
      <span className="as-ack-kicker">Acknowledgement</span>
      <span>
        If this leaves an item not applicable, it needs acknowledging by {parts.join(' · ')}.
      </span>
    </p>
  );
}
