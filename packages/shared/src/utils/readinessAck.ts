// Acknowledgement of auto-generated "not applicable" reasons (Round 4 question 16).
//
// The SME's rule: where the system works out from controlled data that a
// condition does not apply it may write the N/A reason itself, but "for safety-,
// regulatory-, claims- or release-critical items, the system-generated rationale
// must still be acknowledged by the responsible reviewer before gate closure".
// Two things the original answer did not say are decided HERE, in one place, both now
// answered by the review team in Round 5 question 1 (reply of 2026-11-05):
//
//   1. which items are critical — 1(a), item by item, and
//   2. who acknowledges an item — 1(a)'s "Acknowledgement function" column and 1(b):
//      the person holding that function on the project.
import type { ProjectData, ReadinessAcknowledgement } from '../types';
import { REVIEW_ROLES } from '../config/reviewers';
import { CRITICAL_GATES } from '../config/gateSignOff';

// (1) Critical = the team's own item-by-item classification of the 31 items that can carry
// a generated N/A (Round 5 question 1(a)). "Critical" here means only that the N/A rationale
// needs acknowledgement; it assigns no Critical risk rating to the project.
//
// The default below is the gate-based rule we had been using (an item is critical when it sits
// on one of the seven gates Round 4 question 29(3) calls critical). The team's table differs
// from it on eleven items, and those eleven are the overrides: ten the rule missed (the five
// Gate 12 items, since Gate 12 is not on that list; the Gate 2 infant-use context; the Gate 5
// preservative strategy and infant formula assessment; the Gate 6 infant packaging and market
// pack requirements) and one it over-reached on (the Gate 3 competitor review). verify:ack
// checks the whole table item by item.
export const CRITICAL_ITEM_OVERRIDES: Record<string, boolean> = {
  'sg02-infant-context': true,
  'sg03-benchmark': false,
  'sg05-preservative': true,
  'sg05-infant-formula': true,
  'sg06-infant-packaging': true,
  'sg06-market-pack': true,
  'sg12-feedback-review': true,
  'sg12-pms-baseline': true,
  'sg12-pv-pms': true,
  'sg12-performance': true,
  'sg12-change-links': true,
};

export function isCriticalForAcknowledgement(gateId: string, itemId: string): boolean {
  const override = CRITICAL_ITEM_OVERRIDES[itemId];
  return override ?? CRITICAL_GATES.includes(gateId);
}

// 'stale' = there is an acknowledgement but of a rationale the engine no longer
// generates: the facts behind the N/A changed after it was given, so it counts
// for nothing and the reviewer must look again. There is no "not acknowledged"
// state: a reviewer who does not agree changes the facts behind the N/A (which
// stops it being generated), and until somebody acknowledges, the item is simply
// 'missing' and blocks (the project owner's decision, 2026-11-05).
export type AcknowledgementState = 'acknowledged' | 'stale' | 'missing';

// (2) WHO acknowledges is the person holding the FUNCTION the review team names for the item (Round 5 question 1(a),
// column "Acknowledgement function", and 1(b)): not a phase sign-off row and never an administrator. A function is held
// by a named person on the project (ProjectIdentity.reviewers, assigned on the Create form or later by the Lead); one that
// nobody holds reads Unassigned and the item waits — nobody is substituted for it, the Lead included. Only the optional functions can be empty, and only this acknowledgement reads them, so it is the one thing that waits on an empty role.
//
// An item needs one or more SLOTS; every slot must be acknowledged, each by its own function ("where both functions are
// needed, both conclusions must be recorded"). A slot lists the function keys that can fill it: any ONE holder of those
// acknowledges it. The readings of the team's wording are ours, [ASSUMPTION: R5-Q6]:
//   · "A; B" / "A and B" / "A with B"  -> two slots, one per function
//   · a name with a lower-case specialism after the slash ("Quality / microbiology reviewer", "Quality / post-market reviewer",
//     "Quality / change-control reviewer", "Safety / study reviewer") is a SUB-ROLE inside the function before the slash, named as
//     the team wrote it. Its holder acknowledges those items; the holder of the parent function does not stand in
//     (project owner, 2026-11-06). A capitalised name is an independent function ("Safety with Regulatory") [ASSUMPTION: R6-Q1]
//   · "Regulatory if limits apply", "Quality for pack controls", "Technical for claim impact" -> the second function is
//     required always, because the app cannot tell whether the condition applies and dropping it would quietly narrow the rule
//   · "Authorised human-study reviewer" and "Technical claims reviewer" name no parent function, so each is its OWN function,
//     worded exactly as written: nothing says they are the Clinical / Study Coordinator or Technical Claims function
//   · "Manufacturing / R&I" -> either of the two (two functions the team names separately)
//   · "Technical for claim impact" -> Technical Claims (the function question 37(b) lists)
const SAFETY = 'safety-scientific';
const REGULATORY = 'regulatory'; // the Regulatory area role is the Regulatory function (project owner, 2026-11-06)
const QUALITY = 'quality'; // the Quality area role is the Quality function (project owner, 2026-11-06)
const QUALITY_MICROBIOLOGY = 'quality-microbiology';
const QUALITY_POST_MARKET = 'quality-post-market';
const QUALITY_CHANGE_CONTROL = 'quality-change-control';
const TECHNICAL = 'technical-claims';
const TECHNICAL_REVIEWER = 'technical-claims-reviewer';
const HUMAN_STUDY_REVIEWER = 'human-study-reviewer';
const SAFETY_STUDY_REVIEWER = 'safety-study-reviewer';
const MANUFACTURING = 'manufacturing';
const RI = 'ri';

export const ACKNOWLEDGEMENT_FUNCTIONS: Record<string, string[][]> = {
  'sg02-infant-context': [[SAFETY]],
  'sg03-reg-claims': [[REGULATORY]],
  'sg04-pb-screen': [[SAFETY]],
  'sg04-allergen': [[SAFETY], [REGULATORY]],
  'sg04-infant-suitability': [[SAFETY]],
  'sg05-preservative': [[QUALITY_MICROBIOLOGY]],
  'sg05-infant-formula': [[SAFETY]],
  'sg06-infant-packaging': [[SAFETY], [QUALITY]],
  'sg06-market-pack': [[REGULATORY]],
  'sg07-bom-matches-pb': [[SAFETY]],
  'sg07-maternal-caution': [[SAFETY]],
  'sg07-maternal-infant': [[SAFETY]],
  'sg07-infant-safety': [[SAFETY]],
  'sg08-infant-testing': [[SAFETY_STUDY_REVIEWER]],
  'sg08-human-study': [[HUMAN_STUDY_REVIEWER]],
  'sg09-pet': [[QUALITY_MICROBIOLOGY]],
  'sg09-scaleup': [[QUALITY], [MANUFACTURING, RI]],
  'sg09-infant-testing': [[QUALITY], [SAFETY]],
  'sg10-checklist-asean': [[REGULATORY]],
  'sg10-pif-mapped': [[REGULATORY]],
  'sg10-infant-pif': [[SAFETY], [REGULATORY]],
  'sg10-performance-evidence': [[TECHNICAL_REVIEWER]],
  'sg12-feedback-review': [[QUALITY_POST_MARKET]],
  'sg12-pms-baseline': [[QUALITY_POST_MARKET]],
  'sg12-pv-pms': [[SAFETY], [REGULATORY]],
  'sg12-performance': [[QUALITY], [TECHNICAL]],
  'sg12-change-links': [[QUALITY_CHANGE_CONTROL]],
};

// Does this user hold the role? A role named through the Lead's assignment carries the account; one named on the Create form
// carries only the person's name (the form stores a name), so it is matched on the name, trimmed and case-insensitive, the way
// register closing already matches the review areas. An administrator account is not the holder.
export function holdsRole(holder: { userId?: string | null; name: string }, user: { id: string; displayName: string }): boolean {
  if (holder.userId) return holder.userId === user.id;
  return holder.name.trim().toLowerCase() === user.displayName.trim().toLowerCase();
}

// One thing that has to be acknowledged, and where it stands.
export interface AcknowledgementSlot {
  functionKeys: string[]; // any one holder of these may acknowledge
  label: string; // "Safety / Scientific Review" — or "Manufacturing or R&I" when either may
  holders: { functionKey: string; name: string }[]; // who holds the function(s) on this project; empty = Unassigned
  state: AcknowledgementState;
  ack?: ReadinessAcknowledgement;
}

function functionLabel(key: string): string {
  return REVIEW_ROLES.find((r) => r.key === key)?.label ?? key;
}

export function acknowledgementSlots(project: ProjectData, gateId: string, itemId: string, rationale: string): AcknowledgementSlot[] {
  const groups = ACKNOWLEDGEMENT_FUNCTIONS[itemId] ?? [];
  return groups.map((functionKeys) => {
    const holders = functionKeys
      .map((functionKey) => ({ functionKey, name: project.identity.reviewers?.[functionKey]?.trim() ?? '' }))
      .filter((h) => h.name);
    // The row of whichever alternative acknowledged it (the latest edit if more than one function filled the slot).
    const acks = (project.readinessAcknowledgements ?? []).filter(
      (a) => a.gateId === gateId && a.itemId === itemId && functionKeys.includes(a.functionKey),
    );
    const matching = acks.find((a) => a.rationale === rationale);
    const ack = matching ?? acks[0];
    const state: AcknowledgementState = !ack ? 'missing' : matching ? 'acknowledged' : 'stale';
    return { functionKeys, label: functionKeys.map(functionLabel).join(' or '), holders, state, ack };
  });
}

// An item is acknowledged only when EVERY slot is; it is stale when something was acknowledged but no longer matches.
export function acknowledgementState(
  project: ProjectData,
  gateId: string,
  itemId: string,
  rationale: string,
): { state: AcknowledgementState; slots: AcknowledgementSlot[]; by?: string; at?: string } {
  const slots = acknowledgementSlots(project, gateId, itemId, rationale);
  const state: AcknowledgementState =
    slots.length > 0 && slots.every((x) => x.state === 'acknowledged')
      ? 'acknowledged'
      : slots.some((x) => x.state === 'stale')
        ? 'stale'
        : 'missing';
  const given = slots.map((x) => x.ack).filter((a): a is ReadinessAcknowledgement => !!a && state === 'acknowledged');
  const latest = [...given].sort((a, b) => a.acknowledgedAt.localeCompare(b.acknowledgedAt)).pop();
  return {
    state,
    slots,
    by: given.length > 0 ? [...new Set(given.map((a) => a.acknowledgedByName))].join(', ') : undefined,
    at: latest?.acknowledgedAt,
  };
}

