// Round 5 question 26 (SME answer, 2026-11-05): a deviation record when something is released without approval.
//
// (a) "Prevent approval/release within the workflow when prerequisites fail. Log discovered external unapproved publication as a deviation; do not
//     label it approved retrospectively."
// (b) the record's content, and "preserve evidence of the original incident".
// (c) "Block affected Gate 11 release where the deviation leaves an unresolved safety, compliance, claims or version mismatch. Gate 12 records and
//     reviews it; Critical unresolved cases block the affected review's closure. A non-critical deviation may remain under explicitly accepted
//     controlled actions. Do not globally block unrelated products or markets."
// (d) "Show expiry/review-due and withdrawn/superseded content warnings to accountable owners and track the disposition. A review date becoming due
//     triggers re-review and any defined use restriction; it does not by itself prove unlawful prior publication. A known unsupported or prohibited
//     claim needs prompt containment."
//
// One reading for the screen and the server. Our readings (`[ASSUMPTION: R6-Q34]`): the deviation lives in its own register, one row per incident;
// "unresolved" means not Closed and not accepted under a controlled action; only the four kinds the answer names (safety, compliance, claims, version
// mismatch) hold Gate 11; a deviation names a market (blank = every market of the project) and holds that market's lane alone; "accepted under a
// controlled action" needs a tracked Next Action, an accepter, and a severity below Critical; and a content warning is open until a person records its
// disposition on the published-information row.
import { controlledActionGaps } from './controlledActions';
import { RELEASED_INFO_STATES } from '../config/registers';
import { DEVIATION_ACCEPTED, DEVIATION_BLOCKING_ISSUE_TYPES, DEVIATION_DISPOSITIONS, DEVIATION_ISSUE_TYPES, DEVIATION_SEVERITIES, DEVIATION_SOURCES, VALIDITY_DISPOSITIONS } from '../config/deviations';
import type { ProjectData, RegisterRow } from '../types';

export const DEVIATION_REGISTER = 'deviationRecords';

export { DEVIATION_ACCEPTED, DEVIATION_BLOCKING_ISSUE_TYPES, DEVIATION_DISPOSITIONS, DEVIATION_ISSUE_TYPES, DEVIATION_SEVERITIES, DEVIATION_SOURCES, VALIDITY_DISPOSITIONS };

// What the incident is, as first recorded: kept as it was, never edited afterwards ("preserve evidence of the original incident").
export const DEVIATION_ORIGINAL_COLUMNS = [
  'deviationId',
  'source',
  'discoveryDate',
  'incidentDate',
  'reporter',
  'sku',
  'market',
  'channel',
  'claimId',
  'contentDescription',
  'evidenceLink',
  'approvalExpected',
  'approvalActual',
] as const;

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : v === undefined || v === null ? '' : String(v).trim());

// What a deviation row still lacks: the record's own fields, then the ones a reviewer, a high severity or a closure add.
export function deviationRowGaps(row: RegisterRow): string[] {
  const need: [string, string][] = [
    ['source', 'how it was found'],
    ['discoveryDate', 'the discovery date'],
    ['reporter', 'the reporter'],
    ['market', 'the market'],
    ['channel', 'the channel'],
    ['contentDescription', 'the content or claim and its revision'],
    ['evidenceLink', 'the URL, file or screenshot that evidences it'],
    ['approvalExpected', 'the approval that was expected'],
    ['approvalActual', 'the approval that actually existed'],
    ['scopeOfUse', 'the scope and duration of use'],
    ['issueType', 'the kind of issue'],
    ['severity', 'the severity'],
    ['impactAssessment', 'the impact assessment'],
    ['owner', 'the owner'],
    ['dueDate', 'the due date'],
  ];
  const gaps = need.filter(([k]) => text(row[k]) === '').map(([, label]) => label);
  if ((text(row.severity) === 'High' || text(row.severity) === 'Critical') && text(row.rootCause) === '') gaps.push('the root cause');
  const disposition = text(row.disposition);
  if (disposition === 'Closed') {
    for (const [k, label] of [['verification', 'the verification or effectiveness check'], ['closureDecision', 'the closure decision'], ['closureDate', 'the closure date']] as const) {
      if (text(row[k]) === '') gaps.push(label);
    }
  }
  return gaps;
}

// The part of an accepted deviation that makes it acceptable: a tracked controlled action, an accepter, and a severity below Critical.
export function deviationAcceptanceGaps(row: RegisterRow, project: Pick<ProjectData, 'nextActions'>): string[] {
  if (text(row.disposition) !== DEVIATION_ACCEPTED) return [];
  const gaps: string[] = [];
  if (text(row.severity) === 'Critical') gaps.push('a Critical deviation cannot be carried under an accepted action — it must be resolved');
  const action = project.nextActions.find((a) => a.id === text(row.acceptedActionId));
  if (!action || action.status === 'Cancelled') gaps.push('a live controlled Next Action that carries it');
  else for (const g of controlledActionGaps(action)) gaps.push(`the carrying action needs ${g}`);
  if (text(row.acceptedBy) === '') gaps.push('who accepted it');
  return gaps;
}

// Done: closed with its closure recorded, or carried by an accepted controlled action. Anything else is unresolved.
export function deviationResolved(row: RegisterRow, project: Pick<ProjectData, 'nextActions'>): boolean {
  const disposition = text(row.disposition);
  if (disposition === 'Closed') return deviationRowGaps(row).length === 0;
  if (disposition === DEVIATION_ACCEPTED) return deviationAcceptanceGaps(row, project).length === 0;
  return false;
}

export function deviationRows(project: Pick<ProjectData, 'registers'>, market?: string): RegisterRow[] {
  const rows = project.registers[DEVIATION_REGISTER] ?? [];
  if (!market) return [...rows];
  // A deviation that names no market holds every market of the project; one that names markets holds those alone.
  return rows.filter((r) => {
    const named = text(r.market);
    return named === '' || named.split(',').map((m) => m.trim()).includes(market);
  });
}

// The deviations that leave a safety, compliance, claims or version mismatch unresolved in this market (blank market = every market).
export function unresolvedBlockingDeviations(project: ProjectData, market?: string): RegisterRow[] {
  return deviationRows(project, market).filter((r) => DEVIATION_BLOCKING_ISSUE_TYPES.includes(text(r.issueType)) && !deviationResolved(r, project));
}

// "Critical unresolved cases block the affected review's closure": only a closed Critical deviation is done — an acceptance does not stand for one.
export function unresolvedCriticalDeviations(project: ProjectData, market?: string): RegisterRow[] {
  return deviationRows(project, market).filter((r) => text(r.severity) === 'Critical' && !(text(r.disposition) === 'Closed' && deviationRowGaps(r).length === 0));
}

// Gate 12 "records and reviews it": every deviation of the market is complete enough to review and has a reviewer and a disposition other than Open.
export function deviationsAwaitingReview(project: ProjectData, market?: string): RegisterRow[] {
  return deviationRows(project, market).filter((r) => text(r.reviewer) === '' || text(r.disposition) === '' || text(r.disposition) === 'Open' || deviationAcceptanceGaps(r, project).length > 0);
}

// What may no longer be edited on a saved deviation, and the rows that may not be removed. Rows are matched by their generated Deviation ID.
export function deviationRecordViolations(committed: readonly RegisterRow[], incoming: readonly RegisterRow[]): string[] {
  const out: string[] = [];
  const byId = new Map(incoming.map((r) => [text(r.deviationId), r]));
  for (const old of committed) {
    const id = text(old.deviationId);
    if (id === '') continue;
    const next = byId.get(id);
    if (!next) {
      out.push(`${id} cannot be removed: a deviation is a record of what happened, so it is closed, never deleted`);
      continue;
    }
    const changed = DEVIATION_ORIGINAL_COLUMNS.filter((k) => text(old[k]) !== text(next[k]));
    if (changed.length > 0) out.push(`${id}: the original incident is preserved as first recorded (${changed.join(', ')} cannot change)`);
  }
  return out;
}

// ---- (d) content validity warnings -----------------------------------------------------------------------------------------------------------------
export interface ContentWarning {
  recordId: string;
  kind: 'Review date due' | 'Claim no longer supported' | 'Wording withdrawn';
  detail: string;
  owner: string;
  market: string;
  // A known unsupported or prohibited claim needs prompt containment, not just a re-review.
  promptContainment: boolean;
  // A person recorded what was done about it on the row.
  dispositioned: boolean;
}

// Released published information whose review date has come, or whose claim is no longer supported or whose approved wording was withdrawn.
// A due review date "does not by itself prove unlawful prior publication": it asks for a re-review and any defined use restriction.
export function contentValidityWarnings(project: ProjectData, today: string): ContentWarning[] {
  const out: ContentWarning[] = [];
  const claims = project.registers.claimEvidenceTraceability ?? [];
  const library = project.reference?.claimsLibrary ?? [];
  for (const row of project.registers.publishedInfoApproval ?? []) {
    if (!RELEASED_INFO_STATES.includes(text(row.workflowState))) continue;
    const recordId = text(row.recordId) || text(row.publishedItem) || '(unnamed)';
    const base = { recordId, owner: text(row.contentOwner), market: text(row.market) };
    const reviewedOn = text(row.validityReviewedDate);
    const dispositioned = reviewedOn !== '' && text(row.validityDisposition) !== '';
    const expiry = text(row.expiryReviewDate);
    if (expiry !== '' && expiry <= today) {
      out.push({ ...base, kind: 'Review date due', detail: `its review date was ${expiry}`, promptContainment: false, dispositioned: dispositioned && reviewedOn >= expiry });
    }
    const claimId = text(row.claimId);
    const claim = claimId === '' ? undefined : claims.find((c) => text(c.claimId) === claimId);
    if (claim && text(claim.status) !== 'Supported') {
      out.push({ ...base, kind: 'Claim no longer supported', detail: `claim ${claimId} is not Supported`, promptContainment: true, dispositioned });
    }
    const entry = claim ? library.find((e) => e.id === text(claim.libraryEntryId)) : undefined;
    if (entry && (entry as { status?: string }).status === 'Withdrawn') {
      out.push({ ...base, kind: 'Wording withdrawn', detail: `the Claims Library wording behind claim ${claimId} was withdrawn`, promptContainment: true, dispositioned });
    }
  }
  return out;
}
