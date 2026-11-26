// Round 5 question 31: register-by-register applicability. The table (config/registerApplicability.ts) says what each register is; this file decides,
// for one project, whether a register's requirement is met: by ENTRIES in it, or by a reviewed applicability DECISION recorded in the Applicability
// Decisions register — "Reuse approved record" (a link to approved reusable evidence whose version and applicability are confirmed) or "Not applicable"
// (a reviewed rationale). One reading for the screen and the server. Our readings are `[ASSUMPTION: R6-Q39]`.
import { REGISTER_CONFIGS, isRegisterRowBlank } from '../config/registers';
import { APPLICABILITY_DECISIONS, REGISTER_APPLICABILITY } from '../config/registerApplicability';
import type { ProjectData, RegisterRow } from '../types';
import { administrativeOnlyConfirmed } from './gateProgress';

export const APPLICABILITY_REGISTER = 'registerApplicability';
// The register whose "Not applicable" decision is the "no claims" record (Round 4 question 19(d), extended by Round 5 question 31).
export const CLAIMS_REGISTER = 'claimEvidenceTraceability';
// The three places the SME says must be checked before "no claims" can be recorded.
export const NO_CLAIMS_CHECKS = [
  ['checkedLabel', 'the label'],
  ['checkedWebsite', 'the website'],
  ['checkedOtherMaterial', 'other intended material'],
] as const;

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : v === undefined || v === null ? '' : String(v).trim());

export function registerTitle(key: string): string {
  return REGISTER_CONFIGS.find((c) => c.key === key)?.title ?? key;
}
export function registerKeyOfTitle(title: string): string | undefined {
  return REGISTER_CONFIGS.find((c) => c.title === title)?.key;
}

export function decisionRowOf(project: ProjectData, key: string): RegisterRow | undefined {
  const title = registerTitle(key);
  return (project.registers[APPLICABILITY_REGISTER] ?? []).find((r) => text(r.register) === title);
}

// What is wrong with a decision row, for the register it names. Empty = a valid decision.
export function decisionGaps(project: ProjectData, key: string, row: RegisterRow | undefined): string[] {
  const spec = REGISTER_APPLICABILITY[key];
  if (!row || !spec) return ['no decision recorded'];
  const decision = text(row.decision);
  const out: string[] = [];
  if (!APPLICABILITY_DECISIONS.includes(decision as never)) return ['no decision chosen'];
  const reuse = decision === 'Reuse approved record';
  if (reuse && !spec.decisions.includes('reuse')) out.push('this register cannot be satisfied by reusing an approved record');
  if (!reuse && !spec.decisions.includes('na')) out.push('this register cannot be marked not applicable');
  if (text(row.rationale) === '') out.push(reuse ? 'say why the approved record applies (its version and scope)' : 'the reviewed rationale is missing');
  if (reuse && text(row.evidenceLink) === '') out.push('link the approved record being reused');
  if (text(row.decidedBy) === '') out.push('the decision is not recorded by a person');
  if (!reuse && spec.naNeedsAdministrativeOnly && !administrativeOnlyConfirmed(project)) {
    out.push('"not applicable" is accepted only for a project confirmed as administrative-only (a blank change type is not a waiver)');
  }
  if (!reuse && key === CLAIMS_REGISTER) {
    for (const [column, what] of NO_CLAIMS_CHECKS) if (row[column] !== true) out.push(`${what} has not been checked for express or implied efficacy claims`);
  }
  return out;
}

export function validDecision(project: ProjectData, key: string): RegisterRow | undefined {
  const row = decisionRowOf(project, key);
  return row && decisionGaps(project, key, row).length === 0 ? row : undefined;
}

// A decision stands in for the register's entries — except the claims register, whose "no claims" record is read by `noClaimsDeclared` and the claim checks.
export function decisionSubstitutes(project: ProjectData, key: string): boolean {
  return key !== CLAIMS_REGISTER && !!validDecision(project, key);
}

// A row a person has actually filled in. A fixed reference row is seeded by the application, so only the columns a person may edit count.
export function rowEntered(key: string, row: RegisterRow): boolean {
  const config = REGISTER_CONFIGS.find((c) => c.key === key);
  if (!config) return Object.keys(row).length > 0;
  const editable = { ...config, columns: config.columns.filter((c) => c.editable !== false && !c.computed) };
  return !isRegisterRowBlank(editable, row);
}
export function registerEntered(project: ProjectData, key: string): boolean {
  return (project.registers[key] ?? []).some((r) => rowEntered(key, r));
}

export type ApplicabilityState = 'entries' | 'reuse' | 'notApplicable' | 'open';
export function applicabilityState(project: ProjectData, key: string): ApplicabilityState {
  if (registerEntered(project, key)) return 'entries';
  const row = validDecision(project, key);
  if (row && key !== CLAIMS_REGISTER) return text(row.decision) === 'Reuse approved record' ? 'reuse' : 'notApplicable';
  return 'open';
}
export const registerApplicable = (project: ProjectData, key: string): boolean => applicabilityState(project, key) !== 'open';

// "No claims", as the SME defined it: the ledger is empty, and a reviewed "not applicable" records that the label, website and other intended material
// were checked and contain no express or implied efficacy claim.
export function noClaimsVerified(project: ProjectData): boolean {
  return !!validDecision(project, CLAIMS_REGISTER) && text(decisionRowOf(project, CLAIMS_REGISTER)?.decision) === 'Not applicable';
}

// Problems with the Applicability Decisions register as saved (server and screen): a row must name a register that can carry a decision, once.
export function applicabilityRegisterProblems(rows: RegisterRow[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const title = text(row.register);
    if (title === '') continue;
    const key = registerKeyOfTitle(title);
    const spec = key ? REGISTER_APPLICABILITY[key] : undefined;
    if (!key || !spec || spec.decisions.length === 0 || spec.ownRecord) out.push(`"${title}" does not take an applicability decision`);
    if (seen.has(title)) out.push(`"${title}" has more than one decision`);
    seen.add(title);
  }
  return out;
}

// The server writes the date a decision was recorded; it is renewed when what was decided changes, never taken from the request.
export function stampApplicabilityDecisions(committed: RegisterRow[], rows: RegisterRow[], today: string): RegisterRow[] {
  const before = new Map(committed.map((r) => [text(r.register), r]));
  const sig = (r: RegisterRow | undefined) => [r?.decision, r?.rationale, r?.evidenceLink, r?.checkedLabel, r?.checkedWebsite, r?.checkedOtherMaterial].map(text).join('|');
  return rows.map((row) => {
    const old = before.get(text(row.register));
    const decided = text(row.decision) !== '';
    if (!decided) return { ...row, decidedOn: '' };
    return { ...row, decidedOn: old && sig(old) === sig(row) && text(old.decidedOn) !== '' ? text(old.decidedOn) : today };
  });
}
