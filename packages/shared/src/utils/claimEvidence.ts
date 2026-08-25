// Gate 3 rule (F1 appendix, docs/rounds/2026-07-21-sme-reply-F1-F14.txt): "A claim may remain under
// development, but unsupported wording must not be marked as approved."
// Hard-blocked 2026-07-27 (user-requested) at the point that rule actually
// bites — Published Information Approval (rules C6/F11), which already
// covers every public-facing channel including labels and sales material
// (see that register's own description).
//
// Extended 2026-08-12 to the rest of rule D2 (SME Round 3), which governs how
// OTHER records use a claim rather than the claim ledger itself. Three
// conditions now decide whether a Published Info row may sit at a released
// state, all evaluated by `publishedInfoViolations` so the UI (save-guard) and
// the API (authoritative) can never drift:
//
//   1. Claim ID linkage — "every external product-benefit, safety, efficacy,
//      performance or suitability statement should be required to link to a
//      Claim ID. Linkage may remain optional only for genuinely non-product
//      corporate information that contains no product claim or technical
//      statement." Blank Claim ID used to be both the default AND the
//      exemption, so a row escaped every rule below by leaving it empty. The
//      exemption is now asserted (`noProductClaim`) and attributed
//      (`noProductClaimBy`, filled server-side).
//   2. Claim status — the original 2026-07-27 rule, unchanged.
//   3. Wording equivalence — "do not enforce an absolute character-for-
//      character lock… retain master approved wording, proposed channel
//      wording, comparison/review status, reviewer approval. Minor adaptation
//      may be allowed where the meaning, scope, qualifiers and evidence burden
//      remain unchanged. Any material change must create a new or revised claim
//      record. Automated similarity checking may be used as a warning, but
//      final equivalence must be confirmed by an authorised reviewer."
//
// Two parts of D2 are deliberately NOT here, because neither had a record to
// attach to and inventing one would have been guessing: "final artwork approval"
// (packagingSpecsArtwork has no claim linkage at all) and "external publication"
// as a separate act from reaching a released state.
//
// Round 4 question 30 (2026-08-24) answered both, and neither is a small addition
// [R4-REWORK: câu 30(c)(d)]:
//   (c) final artwork approval IS the Packaging/Artwork Approval record, which
//       must link EVERY Claim ID on the artwork and hard-block where any linked
//       claim is Pending · Unsupported · Not approved for the market · Superseded
//       · Not approved for the intended wording or channel;
//   (d) external publication is a separate event from Approval for Release, held
//       in a new Publication/Deployment record (date · channel · market · URL,
//       file or artwork reference · published version · person responsible ·
//       withdrawal or supersession date). For printed packaging the equivalent
//       event is Release to Print.
import type { RegisterRow } from '../types';
import { RELEASED_INFO_STATES, WORDING_EQUIVALENT_VALUES, WORDING_MATERIAL_CHANGE } from '../config/registers';

export interface PublishedInfoViolation {
  row: RegisterRow;
  // Which of the three conditions failed — lets the UI colour the right cell
  // instead of only reddening the whole row.
  kind: 'unlinked' | 'unsupported' | 'wording';
  reason: string;
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

// Compared after normalising, so a trailing space or a double space is not a
// "difference" anyone should have to classify. Case and punctuation ARE
// significant: "supports skin health" vs "Supports skin health." is trivial,
// but so is asking a reviewer to tick a box for it, whereas treating
// "helps soothe" and "soothes" as equal would be the app deciding equivalence —
// which D2 explicitly reserves for a person.
const normaliseWording = (value: unknown): string => text(value).replace(/\s+/g, ' ');

export function wordingDiffers(master: unknown, proposed: unknown): boolean {
  const m = normaliseWording(master);
  const p = normaliseWording(proposed);
  if (m === '' || p === '') return false; // nothing to compare against yet
  return m !== p;
}

// D2: "Automated similarity checking may be used as a warning, but final
// equivalence must be confirmed by an authorised reviewer." So this returns a
// number for the UI to show and NEVER decides anything — no caller branches on
// it. Word-overlap (Jaccard) rather than character distance, because the
// adaptations D2 has in mind are shortenings and re-orderings for a channel,
// where shared vocabulary is the signal.
export function wordingSimilarity(master: unknown, proposed: unknown): number {
  const tokens = (value: unknown) =>
    new Set(
      normaliseWording(value)
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, '')
        .split(' ')
        .filter(Boolean),
    );
  const a = tokens(master);
  const b = tokens(proposed);
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared += 1;
  return shared / (a.size + b.size - shared);
}

// "This record makes no product claim" and "this record's claim is CL-01" cannot
// both be true. Unlike everything in `publishedInfoViolations`, this is not a
// release condition — it is incoherent at any workflow state, so it is checked on
// every save.
//
// The UI prevents it structurally (ticking is disabled while a claim is linked,
// and the picker is disabled once ticked) and this is the API's matching refusal.
// Deliberately NOT resolved by clearing the Claim ID when the box is ticked:
// silently dropping a link someone recorded is the "no silent corrections"
// failure (B4). The person unlinks it themselves, or leaves the box alone.
export function contradictoryClaimRows(publishedInfoRows: RegisterRow[]): RegisterRow[] {
  return publishedInfoRows.filter((row) => !!row.noProductClaim && text(row.claimId) !== '');
}

// Every reason a Published Info row may not sit at a released state. Non-empty
// and never mutates its inputs, so both layers can call it on the same data and
// agree.
export function publishedInfoViolations(
  publishedInfoRows: RegisterRow[],
  claimEvidenceRows: RegisterRow[],
): PublishedInfoViolation[] {
  const supportedClaimIds = new Set(
    claimEvidenceRows
      .filter((c) => c.status === 'Supported' && text(c.claimId) !== '')
      .map((c) => text(c.claimId)),
  );
  const claimById = new Map(claimEvidenceRows.filter((c) => text(c.claimId) !== '').map((c) => [text(c.claimId), c]));

  const violations: PublishedInfoViolation[] = [];
  for (const row of publishedInfoRows) {
    // Every condition below is about RELEASE. Earlier workflow states stay
    // freely editable on purpose: a claim may not exist yet when the content is
    // first drafted, and D2's own picker rule exists so an intended claim can be
    // documented early rather than blocking early work.
    if (!RELEASED_INFO_STATES.includes(String(row.workflowState))) continue;

    const claimId = text(row.claimId);

    if (claimId === '') {
      if (!row.noProductClaim) {
        violations.push({
          row,
          kind: 'unlinked',
          reason:
            'no Claim ID, and not declared as non-product information — link a claim, or tick "No product claim or technical statement" if this record genuinely contains neither',
        });
      }
      continue; // nothing further to check on an exempt row
    }

    if (!supportedClaimIds.has(claimId)) {
      violations.push({
        row,
        kind: 'unsupported',
        reason: `claim ${claimId} is not 'Supported' in Claim -> Evidence Traceability`,
      });
      continue; // the wording check below would be noise on top of this
    }

    // Master wording comes from the claim, live — not from the row's own stored
    // copy, which could be stale if the claim was edited afterwards.
    const master = claimById.get(claimId)?.approvedWording;
    if (!wordingDiffers(master, row.exactWording)) continue;

    const verdict = text(row.wordingEquivalence);
    if (verdict === WORDING_MATERIAL_CHANGE) {
      violations.push({
        row,
        kind: 'wording',
        reason: `wording for claim ${claimId} is recorded as a material change — D2 requires a new or revised claim record, not a re-worded row`,
      });
      continue;
    }
    if (!WORDING_EQUIVALENT_VALUES.includes(verdict)) {
      violations.push({
        row,
        kind: 'wording',
        reason: `proposed wording differs from claim ${claimId}'s master wording and has not been classified — an authorised reviewer must record the comparison before release`,
      });
      continue;
    }
    if (text(row.equivalenceConfirmedBy) === '' || text(row.equivalenceConfirmedDate) === '') {
      violations.push({
        row,
        kind: 'wording',
        reason: `wording for claim ${claimId} is marked equivalent but nobody is recorded as having confirmed it — D2 requires an authorised reviewer`,
      });
    }
  }
  return violations;
}

// `unsupportedClaimRows()` used to live here — the narrow 2026-07-27 predicate
// for the claim-status rule alone. Removed 2026-08-12: both of its call sites
// (the API guard and this register's save-guard) now call
// `publishedInfoViolations`, and no gate-readiness check ever read it, so keeping
// it would have left an exported function that nothing calls and whose result
// silently omits two of D2's three conditions — the next caller to reach for the
// shorter name would have enforced a third of the rule.
