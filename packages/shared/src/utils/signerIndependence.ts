// Round 5 question 23 (a) and (d): when one person may hold two of the three signatures on one record. One reading for the screen and
// the server, so they cannot disagree.
//
// Gate (a): at the seven critical gates the Prepared, Reviewed and Approved signatures are three distinct people; at every other gate the
// preparer differs from the reviewer and from the approver, and the reviewer and the approver MAY be the same person. One person preparing
// several DIFFERENT gate records is not a conflict — this only compares the slots of ONE record.
// Phase (d): the preparer differs from the reviewer and from the approver; the reviewer may also approve. The SME's last sentence
// ("if the phase approval makes a new substantive critical decision, apply the three-person rule") cannot be evaluated by the system, so it
// is not enforced — `[ASSUMPTION: R6-Q31]`.
import { CRITICAL_GATES } from '../config/gateSignOff';

export type SignerSlot = 'Prepared by' | 'Reviewed by' | 'Approved by';

export type SignerSlots = Partial<Record<SignerSlot, string | null | undefined>>;

export interface SignerConflict {
  a: SignerSlot;
  b: SignerSlot;
}

// A gate whose three signatures must all be different people.
export function gateNeedsThreeDistinctSigners(gateId: string): boolean {
  return CRITICAL_GATES.includes(gateId);
}

const PREPARER_PAIRS: SignerConflict[] = [
  { a: 'Prepared by', b: 'Reviewed by' },
  { a: 'Prepared by', b: 'Approved by' },
];
const ALL_PAIRS: SignerConflict[] = [...PREPARER_PAIRS, { a: 'Reviewed by', b: 'Approved by' }];

// Every pair of slots that holds the same person and may not.
export function signerConflicts(slots: SignerSlots, threeDistinct: boolean): SignerConflict[] {
  return (threeDistinct ? ALL_PAIRS : PREPARER_PAIRS).filter((p) => !!slots[p.a] && slots[p.a] === slots[p.b]);
}

export function gateSignerConflicts(gateId: string, slots: SignerSlots): SignerConflict[] {
  return signerConflicts(slots, gateNeedsThreeDistinctSigners(gateId));
}

export function phaseSignerConflicts(slots: SignerSlots): SignerConflict[] {
  return signerConflicts(slots, false);
}

// The slots a person may not take, given who already holds the others — what a picker disables and what the server refuses.
export function slotsBlockedFor(slot: SignerSlot, threeDistinct: boolean): SignerSlot[] {
  return (threeDistinct ? ALL_PAIRS : PREPARER_PAIRS)
    .filter((p) => p.a === slot || p.b === slot)
    .map((p) => (p.a === slot ? p.b : p.a));
}

// The person who may not take `slot` because they already hold another slot, or undefined.
export function blockedPeopleFor(slot: SignerSlot, slots: SignerSlots, threeDistinct: boolean): Map<string, SignerSlot> {
  const out = new Map<string, SignerSlot>();
  for (const other of slotsBlockedFor(slot, threeDistinct)) {
    const id = slots[other];
    if (id) out.set(id, other);
  }
  return out;
}

export function signerConflictMessage(conflicts: SignerConflict[], threeDistinct: boolean, who = 'The same person'): string {
  const pairs = conflicts.map((c) => `"${c.a}" and "${c.b}"`).join(', ');
  return threeDistinct
    ? `${who} cannot hold ${pairs} — at a critical gate Prepared, Reviewed and Approved are three different people`
    : `${who} cannot hold ${pairs} — the preparer must differ from the reviewer and from the approver`;
}
