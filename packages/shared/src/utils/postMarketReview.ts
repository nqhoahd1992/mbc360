// Round 5 question 22 — the rules of config/postMarketReview.ts as pure functions, read by the Gate 12 items and by the Post-Market / CAPA screen
// alike (guard parity). Every reading of what the answer leaves open is [ASSUMPTION: R6-Q30].
import type { CapaRecord, ProjectData, RegisterRow } from '../types';
import {
  CATEGORY_PERFORMANCE,
  CHANGE_DECISION_RAISED,
  ESCALATION_FORWARD,
  SIGNIFICANT,
  TREND_MEANINGFUL,
} from '../config/postMarketReview';
import { isDoneStatus } from './doneStatus';

export const POST_MARKET_TRENDS_REGISTER = 'postMarketTrends';

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : String(value ?? '').trim());

// "Log other reports for triage ... Record severity, significance, reviewer and escalation decision." Every record is triaged: its kind, whether it is
// significant, who reviewed it and what was decided about the review schedule (severity is on every record already).
export function capaTriageGaps(record: CapaRecord): string[] {
  const gaps: string[] = [];
  if (text(record.category) === '') gaps.push('the kind of report');
  if (text(record.significance) === '') gaps.push('whether it is significant');
  if (text(record.reviewer) === '') gaps.push('the reviewer');
  if (text(record.escalation) === '') gaps.push('the escalation decision');
  return gaps;
}

export const isPerformanceFinding = (record: CapaRecord): boolean => text(record.category) === CATEGORY_PERFORMANCE;

// "The performance finding also needs a recorded assessment, conclusion, evidence, impact on claims/quality and CHG decision. Corrective work requires
// verified closure, or an explicitly accepted non-critical open action with a due date in the current review. ... A Critical unresolved issue blocks
// closure." Said for a performance finding; empty for any other record.
export function capaFindingGaps(record: CapaRecord): string[] {
  if (!isPerformanceFinding(record)) return [];
  const gaps: string[] = [];
  if (text(record.assessment) === '') gaps.push('the assessment');
  if (text(record.conclusion) === '') gaps.push('the conclusion');
  if (text(record.evidenceLink) === '') gaps.push('the evidence');
  if (text(record.impactNote) === '') gaps.push('the impact on claims and quality');
  if (text(record.changeDecision) === '') gaps.push('the Change Control decision');
  else if (text(record.changeDecision) === CHANGE_DECISION_RAISED && text(record.changeId) === '') gaps.push('the Change Control record it raised');
  if (isDoneStatus(record.status)) {
    if (text(record.verifiedBy) === '') gaps.push('the verification of the closed corrective work');
  } else if (record.severity === 'Critical') {
    gaps.push('closing it: a Critical issue cannot stay open');
  } else if (text(record.acceptedOpenBy) === '' || text(record.acceptedOpenDue) === '') {
    gaps.push('either verified closure or the open action explicitly accepted with its due date in the current review');
  }
  return gaps;
}

// A Critical issue that is still open (any category): it blocks closure whatever else is in order.
export function openCriticalCapa(project: ProjectData): CapaRecord[] {
  return project.capa.filter((c) => c.severity === 'Critical' && !isDoneStatus(c.status));
}

// The rows of the trends register: "source records, period, market, product/version/batches, number of reports, denominator where available,
// comparison period, interpretation, reviewer/date and action. Do not require an arbitrary universal numerical threshold." The denominator is the only
// optional field; a trend concluded to be meaningful also names its action.
export function trendRowGaps(row: RegisterRow): string[] {
  const gaps: string[] = [];
  const need: [string, string][] = [
    ['market', 'the market'],
    ['periodStart', 'the start of the period'],
    ['periodEnd', 'the end of the period'],
    ['sourceRecords', 'the source records'],
    ['productVersionBatches', 'the product, version and batches'],
    ['reportCount', 'the number of reports'],
    ['comparisonPeriod', 'the comparison period'],
    ['interpretation', 'the interpretation'],
    ['conclusion', 'whether it is a meaningful trend'],
    ['reviewer', 'the reviewer'],
    ['reviewDate', 'the review date'],
  ];
  for (const [key, label] of need) if (text(row[key]) === '') gaps.push(label);
  if (text(row.conclusion) === TREND_MEANINGFUL && text(row.actionId) === '' && text(row.action) === '') gaps.push('the action taken on a meaningful trend');
  return gaps;
}

// What brings the post-launch review forward (question 22(b)(i)): a significant adverse event, material quality signal or regulator request, or a
// meaningful complaint trend. A record does when its reviewer decided so (the escalation decision) or when it is significant in a kind that matters here
// (safety, quality, regulatory); a trend does when it was concluded meaningful. A performance challenge is judged by its significance in the same way,
// and a routine wording query advances nothing (category General information, or not significant and not escalated).
export function postMarketSignalsBringingReviewForward(project: ProjectData): string[] {
  const out: string[] = [];
  for (const c of project.capa) {
    if (ESCALATION_FORWARD.includes(text(c.escalation))) out.push(`${c.id}: ${text(c.escalation)}`);
    else if (text(c.significance) === SIGNIFICANT && ['Safety or adverse event', 'Quality or packaging', 'Regulatory', CATEGORY_PERFORMANCE].includes(text(c.category))) {
      out.push(`${c.id}: significant ${text(c.category).toLowerCase()}`);
    }
  }
  for (const r of project.registers[POST_MARKET_TRENDS_REGISTER] ?? []) {
    if (text(r.conclusion) === TREND_MEANINGFUL) out.push(`${text(r.trendId) || 'a trend'}: meaningful trend`);
  }
  return out;
}
