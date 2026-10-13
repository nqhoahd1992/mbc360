// The Change Control assessment of a post-market finding (Round 4 question 8), recorded as a
// LIST — one entry per finding — rather than one answer for the project (project owner,
// 2026-10-13: the SME wrote "the post-market finding" but never said one per project, so where
// the granularity is unspecified the default is the finer one). [ASSUMPTION: R5-Q11]
//
// The answer's own rules, applied to each entry:
//   · Yes  — "a valid Change Control record must be linked";
//   · No   — "the rationale and reviewer must be recorded";
//   · Pending assessment — "must block closure of the post-market finding".
// An empty list is NOT "nothing to assess": a review with no finding needing a change control
// is recorded as one entry answered No, with the reason — otherwise "nobody has looked" and
// "looked, found nothing" would read the same.
//
// ONE function decides what is wrong with an entry, read by the Gate 12 block (to show it and to
// disable Save) and by the API (to refuse it), so the two can never disagree.
import type { ChangeControlAssessment } from '../types';
import { CHANGE_CONTROL_REQUIRED_OPTIONS } from '../types';

const text = (v: string | undefined) => (v ?? '').trim();

export function isPendingAnswer(entry: Pick<ChangeControlAssessment, 'answer'>): boolean {
  const a = text(entry.answer);
  return a === '' || a === 'Pending assessment';
}

export interface ChangeControlAssessmentContext {
  /** Ids of the change records that exist on this project. */
  changeIds: readonly string[];
  /** The project's markets, for the optional market of an entry. */
  markets: readonly string[];
}

export function changeControlAssessmentProblems(
  entries: readonly ChangeControlAssessment[],
  ctx: ChangeControlAssessmentContext,
): string[] {
  const problems: string[] = [];
  entries.forEach((e, i) => {
    const n = `Assessment ${i + 1}`;
    const answer = text(e.answer);
    if (!text(e.finding)) problems.push(`${n}: Finding is required — say what this assessment is about`);
    if (answer !== '' && !(CHANGE_CONTROL_REQUIRED_OPTIONS as readonly string[]).includes(answer)) {
      problems.push(`${n}: "${answer}" is not one of ${CHANGE_CONTROL_REQUIRED_OPTIONS.join(' / ')}`);
    }
    if (text(e.market) && !ctx.markets.includes(text(e.market))) {
      problems.push(`${n}: "${text(e.market)}" is not one of this project's markets`);
    }
    // "A VALID Change Control record" — so the link must name a change record that exists on this
    // project, not any non-empty text. Whether every kind of change book counts (the CHG- records
    // here versus the FC- Formulation Change Register rows) is part of the still-open question on how
    // many change books there should be [ASSUMPTION: R5-Q27].
    const record = text(e.linkedRecordId);
    if (record && !ctx.changeIds.includes(record)) {
      problems.push(`${n}: "${record}" is not a change record of this project`);
    }
    if (record && answer !== 'Yes') {
      problems.push(`${n}: a linked Change Control record means the answer is Yes`);
    }
    if (answer === 'Yes' && !record) {
      problems.push(`${n}: Yes needs a linked Change Control record (Round 4, question 8)`);
    }
    if (answer === 'No' && (!text(e.reviewer) || !text(e.rationale))) {
      problems.push(`${n}: No needs both the reviewer and the rationale (Round 4, question 8)`);
    }
    if (text(e.reviewDate) && !/^\d{4}-\d{2}-\d{2}$/.test(text(e.reviewDate))) {
      problems.push(`${n}: the review date must be a date`);
    }
  });
  return problems;
}
