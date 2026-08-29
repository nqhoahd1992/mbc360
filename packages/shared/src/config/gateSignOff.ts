// Per-gate sign-off rules (Round 4 questions 18 and 29, 2026-08-24; built
// 2026-08-29). Everything here is CONFIGURATION rather than logic, kept in one
// file on purpose — `docs/plans/Post_Round3_Design_Decisions.md` §1 asked for
// exactly that: "đặt điểm 3 và 4 thành hằng số cạnh nhau", so that a change of
// mind about which gates are critical, or about what independence means, is one
// edit rather than a hunt through the engine.
import type { GateSignOff, GateSignOffRole, ProjectData } from '../types';
import { GATE_SIGNOFF_ROLES } from '../types';

// Question 29(3), verbatim: "Enhanced independence requirements apply to Gate 3
// (claims) · Gate 4 (ingredient and regulatory screening) · Gate 7 (safety) ·
// Gate 8 (testing, human studies and evidence) · Gate 9 (stability and release
// readiness) · Gate 10 (regulatory, claims and dossier) · Gate 11 (production and
// launch release)."
//
// All four gates our own analysis had called arguable (SG03, SG04, SG08, SG09)
// are in the list — the reading that would have left them out was the wrong one.
export const CRITICAL_GATES: readonly string[] = ['SG03', 'SG04', 'SG07', 'SG08', 'SG09', 'SG10', 'SG11'];

// Question 29(4): at a critical gate "at least one reviewer or approver must also
// represent the relevant independent function". The four mappings are the
// answer's own, and each is expressed as a CAPABILITY rather than a role name so
// the Role Editor stays the place where authority is granted — the same shape
// question 32(c)'s `watchlist-finding` capabilities already use.
//
// `anyOf`: a claim decision may be reviewed by "Technical and/or Regulatory", so
// holding either satisfies it. Which one a given gate needs is not a judgement
// this file makes — it is the answer's own sentence, mapped to the gate it names.
export const INDEPENDENT_FUNCTION_BY_GATE: Record<string, { label: string; anyOf: string[] }> = {
  // "Claim decision reviewed/approved by Technical and/or Regulatory."
  SG03: { label: 'Technical or Regulatory', anyOf: ['gate-signoff|represent-technical', 'gate-signoff|represent-regulatory'] },
  // Gate 4 is "ingredient and regulatory screening" — the regulatory function.
  SG04: { label: 'Regulatory', anyOf: ['gate-signoff|represent-regulatory'] },
  // "Safety decision reviewed/approved by Safety/Scientific Review."
  SG07: { label: 'Safety or Scientific Review', anyOf: ['gate-signoff|represent-safety'] },
  // Gate 8 is "testing, human studies and evidence" — Safety/Scientific Review
  // owns the evidence conclusion; the human-study workflow keeps its own,
  // stricter outside-department rule (C2), which this does not replace.
  SG08: { label: 'Safety or Scientific Review', anyOf: ['gate-signoff|represent-safety'] },
  // "Quality/release decision reviewed/approved by Quality."
  SG09: { label: 'Quality', anyOf: ['gate-signoff|represent-quality'] },
  SG10: { label: 'Regulatory', anyOf: ['gate-signoff|represent-regulatory'] },
  SG11: { label: 'Quality', anyOf: ['gate-signoff|represent-quality'] },
};

// Every capability the mapping above can ask for — the seeder and the Role Editor
// read this so a capability can never be required by a rule and absent from the
// grid, which would make the gate unpassable with nothing on screen saying why.
export const INDEPENDENT_FUNCTION_CAPABILITIES: readonly string[] = [
  ...new Set(Object.values(INDEPENDENT_FUNCTION_BY_GATE).flatMap((f) => f.anyOf)),
];

// Question 29(2), verbatim, all ten. Four of them are decisions this app's
// `GATE_DECISIONS` enum does not carry (Reject/Stop · Approved with Conditions ·
// Not Approved · Further Information Required) and two are acts rather than
// decisions (Delegated approval · Override or exception) — they are listed anyway
// so that adding any of them later cannot silently skip the comment rule. The
// missing Reject/Stop decision is [ASSUMPTION: R5-Q13].
export const DECISIONS_REQUIRING_COMMENT: readonly string[] = [
  'Proceed with Conditions',
  'Hold',
  'Backtrack',
  'Reject/Stop',
  'Approved with Conditions',
  'Not Approved',
  'Further Information Required',
  'N/A',
  'Delegated approval',
  'Override or exception',
];

export function gateSignOffNeedsComment(decision: string): boolean {
  return DECISIONS_REQUIRING_COMMENT.includes(decision.trim());
}

// Question 18: Gates 10, 11 and 12 are signed per market. Gate 12 is included on
// the answer's own words — "Gate 12 post-market reviews also operate per market".
export const PER_MARKET_GATES: readonly string[] = ['SG10', 'SG11', 'SG12'];

export function isPerMarketGate(gateId: string): boolean {
  return PER_MARKET_GATES.includes(gateId);
}

// Which sign-off "lanes" a gate has on a given project: one lane for Gates 1-9,
// and one PER MARKET for Gates 10-12. A per-market gate on a project with no
// markets recorded yields no lanes at all, which the readiness check reads as
// unsigned rather than as complete — a project that has not said where it sells
// has not signed anything off for anywhere.
export function gateSignOffMarkets(project: ProjectData, gateId: string): (string | undefined)[] {
  if (!isPerMarketGate(gateId)) return [undefined];
  return project.identity.markets.filter((m) => m.trim() !== '');
}

export function findGateSignOff(
  project: ProjectData,
  gateId: string,
  market: string | undefined,
  role: GateSignOffRole,
): GateSignOff | undefined {
  return project.gateSignOffs.find(
    (s) => s.gateId === gateId && (s.market ?? undefined) === market && s.role === role,
  );
}

// Question 29(5): the sequence. A role may only be signed once every role before
// it is signed — "Preparer → Reviewer → Approver" is an order, not a list.
export function previousGateSignOffRole(role: GateSignOffRole): GateSignOffRole | undefined {
  const index = GATE_SIGNOFF_ROLES.indexOf(role);
  return index > 0 ? GATE_SIGNOFF_ROLES[index - 1] : undefined;
}

// A signed row whose snapshot no longer matches the project is STALE: question
// 29(1) — "if evidence within the signed snapshot changes after a signature the
// signature becomes stale/invalidated … and re-signing is required". Deliberately
// not deleted: what was signed, and when, stays on the record; it simply stops
// counting. `changes` is what the answer's "the system identifies what changed"
// asks for and is computed by `snapshotChanges` in utils/gateSnapshot.ts.
export function isGateSignOffSigned(signOff: GateSignOff | undefined): boolean {
  return !!signOff?.signedAt;
}
