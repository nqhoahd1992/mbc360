// The Change Control assessment of post-market findings (Round 4 question 8, Round 5 question 2), recorded as a
// LIST — one entry per distinct finding — rather than one answer for the project.
//
// Round 5 question 2 (SME, 2026-11-05) settled the shape:
//   (a) "one assessment per distinct finding, linked to the review cycle and affected market(s). Several complaints may support one
//       trend finding; one finding may affect several markets. An existing open CHG record does not waive assessment of a new
//       finding."
//   (b) a finding is "an issue requiring a documented review": an individual complaint or adverse event where assessment is needed,
//       a complaint trend, a quality deviation, a regulator request, a substantiated claim challenge, or a performance/packaging
//       concern. A review with none records "no findings requiring Change Control", with reviewer, date and rationale.
//   (c) fields: a generated Finding ID, source/category, source record link, date identified, affected SKU/formula/batch and
//       market(s), review-cycle ID, severity/priority and disposition. "Yes/No/Pending must each carry reviewer, date and rationale;
//       Yes links a relevant CHG record. Pending blocks closure of that finding and an unrestricted close-out of the affected
//       review."
//
// An empty list is NOT "nothing to assess": a review with no finding needing a change control is recorded as one entry answered
// No, with the reason — otherwise "nobody has looked" and "looked, found nothing" would read the same.
//
// ONE function decides what is wrong with an entry, read by the Gate 12 block (to show it and to disable Save) and by the API
// (to refuse it), so the two can never disagree.
import type { ChangeControlAssessment } from '../types';
import { CHANGE_CONTROL_REQUIRED_OPTIONS, POST_MARKET_FINDING_CATEGORIES, RISK_LEVELS } from '../types';

const text = (v: string | undefined) => (v ?? '').trim();

export function isPendingAnswer(entry: Pick<ChangeControlAssessment, 'answer'>): boolean {
  const a = text(entry.answer);
  return a === '' || a === 'Pending assessment';
}

// An entry's markets are stored comma-joined (the same shape as every other multi-market column).
export function assessmentMarkets(entry: Pick<ChangeControlAssessment, 'markets'>): string[] {
  return text(entry.markets)
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
}

export interface ChangeControlAssessmentContext {
  /** Ids of the change records that exist on this project. */
  changeIds: readonly string[];
  /** The project's markets, for the markets an entry is about. */
  markets: readonly string[];
  /**
   * The review cycles an entry can be linked to ("Vietnam|3m"), from the post-launch schedule and the reviews already recorded.
   * Empty while no market has launched, in which case there is no cycle to link and none is demanded.
   */
  reviewCycles: readonly string[];
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
    // (b): what makes an issue a finding at all.
    if (!text(e.category)) problems.push(`${n}: Source / category is required`);
    else if (!(POST_MARKET_FINDING_CATEGORIES as readonly string[]).includes(text(e.category))) {
      problems.push(`${n}: "${text(e.category)}" is not one of the finding categories`);
    }
    if (text(e.severity) && !(RISK_LEVELS as readonly string[]).includes(text(e.severity))) {
      problems.push(`${n}: "${text(e.severity)}" is not one of ${RISK_LEVELS.join(' / ')}`);
    }
    if (answer !== '' && !(CHANGE_CONTROL_REQUIRED_OPTIONS as readonly string[]).includes(answer)) {
      problems.push(`${n}: "${answer}" is not one of ${CHANGE_CONTROL_REQUIRED_OPTIONS.join(' / ')}`);
    }
    // (a): linked to the affected market(s) — one finding may affect several.
    const markets = assessmentMarkets(e);
    for (const m of markets) {
      if (!ctx.markets.includes(m)) problems.push(`${n}: "${m}" is not one of this project's markets`);
    }
    if (markets.length === 0 && ctx.markets.length > 0) problems.push(`${n}: choose the market(s) this finding affects`);
    // (a): ...and to the review cycle it came from.
    const cycle = text(e.reviewCycle);
    if (cycle && !ctx.reviewCycles.includes(cycle)) problems.push(`${n}: "${cycle}" is not a review cycle of this project`);
    if (!cycle && ctx.reviewCycles.length > 0) problems.push(`${n}: choose the review cycle this finding belongs to`);
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
    // (c): "Yes/No/Pending must each carry reviewer, date and rationale". An entry with no answer yet counts as Pending but is
    // still being worked on, so it asks for nothing until an answer is chosen.
    if (answer !== '' && (!text(e.reviewer) || !text(e.reviewDate) || !text(e.rationale))) {
      problems.push(`${n}: ${answer} needs the reviewer, the review date and the rationale (Round 5, question 2)`);
    }
    for (const [label, value] of [
      ['review date', e.reviewDate],
      ['date identified', e.dateIdentified],
    ] as const) {
      if (text(value) && !/^\d{4}-\d{2}-\d{2}$/.test(text(value))) problems.push(`${n}: the ${label} must be a date`);
    }
  });
  return problems;
}
