// Rule E2 (SME Round 3), Gate 10 — option (b):
//
//   "Enforce the ASEAN checklist only where an ASEAN market is selected. For
//    non-ASEAN markets, require a temporary Regulatory Checklist Status with:
//    applicable market; required dossier type; owner; checklist or evidence link;
//    status; Regulatory approval. The absence of a built-in country template
//    should not mean the item is unenforced."
//
// Until 2026-08-12 `sg10-checklist` was `manual`, on the reasoning that enforcing
// the ASEAN checklist for everyone would wrongly block a product not sold in
// ASEAN. That reasoning was right and the conclusion was wrong: the answer is to
// enforce it per market, not to enforce nothing — which is the sentence above.
import { isDoneStatus } from './doneStatus';
import type { ProjectData } from '../types';
import { activeMarkets } from './postLaunch';
import { controlledActionGaps } from './controlledActions';
import type { MarketApprovalStatus } from '../types';
import {
  ASEAN_MARKETS,
  CHECKLIST_NOT_APPLICABLE,
  CONDITION_BEFORE_LAUNCH,
  EXTERNAL_REQUIRED_PENDING,
  EXTERNAL_AUTHORISATION_OPTIONS,
  EXTERNAL_NOTIFIED,
  EXTERNAL_AUTHORISED,
  OTHER_MARKET_OPTION,
  REGULATORY_APPROVAL_WITH_CONDITIONS,
} from '../config/registers';

export const MARKET_DOSSIER_REGISTER = 'regulatoryChecklistStatus';
export const ASEAN_CHECKLIST_REGISTER = 'pifChecklistAsean';

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

// The values that let a market's row stand at Gate 10. N/A is here because it
// carries its own rationale + reviewer requirement above.
const CHECKLIST_DONE_STATUSES: string[] = ['Complete', CHECKLIST_NOT_APPLICABLE];
const REGULATORY_APPROVAL_DONE: string[] = ['Approved', 'Approved with Conditions', CHECKLIST_NOT_APPLICABLE];

export function isAseanMarket(market: string): boolean {
  return ASEAN_MARKETS.includes(market.trim());
}

export function projectHasAseanMarket(project: ProjectData): boolean {
  return project.identity.markets.some(isAseanMarket);
}

// Round 5 question 20: every market the product is still pursued in needs its own dossier components and its own country-specific regulatory
// conclusion — an ASEAN market too: "ASEAN PIF mapping/checklist can be shared evidence, but each market still needs a country-specific
// regulatory/readiness conclusion and any additional local requirements". (It used to be every market OUTSIDE ASEAN.) A withdrawn market is
// not pursued any more. [ASSUMPTION: R6-Q28]
export function marketsNeedingDossier(project: ProjectData): string[] {
  return activeMarkets(project);
}

const rowsOf = (project: ProjectData, market: string) => (project.registers[MARKET_DOSSIER_REGISTER] ?? []).filter((r) => text(r.market) === market);
const rowLabel = (row: Record<string, unknown>) => text(row.componentId) || text(row.component) || 'a component';

// A row counts once Regulatory has said what the dossier is, who owns it, where
// the checklist lives, and recorded both statuses. E2 lists all six, CONFIRMED by
// Round 4 question 35(c); a row missing any of them is a placeholder, not the
// record it asks for. Returns WHY, so the Gate 10 blocker can name the missing
// piece rather than say "incomplete".
function checklistRowGap(project: ProjectData, row: Record<string, unknown>): string | null {
  if (text(row.dossierType) === '') return 'no dossier type';
  if (text(row.component) === '') return 'no dossier component';
  if (text(row.componentVersion) === '') return 'no component version';
  if (text(row.owner) === '') return 'no owner';
  if (text(row.checklistLink) === '') return 'no checklist or evidence link';
  if (text(row.status) === '') return 'no status';
  if (text(row.regulatoryApproval) === '') return 'no regulatory approval';
  // 35(b): "a market entered as Other — specify must also record the actual
  // country or jurisdiction. Until the market is named and the dossier type is
  // identified, the record is incomplete and must block Gate 10."
  if (text(row.market) === OTHER_MARKET_OPTION && text(row.otherMarketName) === '') {
    return 'market recorded as "Other - specify" with no actual country or jurisdiction named';
  }
  // 35(c): "Where N/A is used, the rationale and authorised reviewer must also be
  // recorded." Applies to either column — an unexplained N/A is the one answer
  // that closes a row by saying nothing.
  const usesNotApplicable =
    text(row.status) === CHECKLIST_NOT_APPLICABLE || text(row.regulatoryApproval) === CHECKLIST_NOT_APPLICABLE;
  if (usesNotApplicable && text(row.naRationale) === '') return 'N/A recorded with no rationale';
  if (usesNotApplicable && text(row.naReviewer) === '') return 'N/A recorded with no authorised reviewer';
  // Present is not the same as passing (SME rule audit B10, 2026-10-04): a row
  // reading "Blocked" or "Not Approved" has every field filled and used to
  // satisfy Gate 10. Which values count as done is our reading of the two lists
  // question 35(a) supplied [ASSUMPTION: R5-Q31].
  if (!CHECKLIST_DONE_STATUSES.includes(text(row.status))) return `checklist status is "${text(row.status)}"`;
  if (!REGULATORY_APPROVAL_DONE.includes(text(row.regulatoryApproval))) {
    return `regulatory approval is "${text(row.regulatoryApproval)}"`;
  }
  // Question 20: an approval with conditions passes only with the conditions documented, when they must be met, and a controlled action
  // carrying them ("permitted at that stage" is read as that timing being stated by the decision).
  if (text(row.regulatoryApproval) === REGULATORY_APPROVAL_WITH_CONDITIONS) {
    if (text(row.approvalConditions) === '') return 'approved with conditions, but the conditions are not documented';
    if (text(row.conditionTiming) === '') return 'approved with conditions, but it is not said when they must be met';
    const action = project.nextActions.find((a) => a.id === text(row.conditionActionId));
    const missing = action && action.status !== 'Cancelled' ? controlledActionGaps(action) : ['a tracked Next Action'];
    if (missing.length > 0) return `approved with conditions, but no controlled action carries them (needs ${missing.join(', ')})`;
  }
  // Separate internal approval from the authority's own notification: it has to be said which applies, not assumed from the approval.
  if (!(EXTERNAL_AUTHORISATION_OPTIONS as readonly string[]).includes(text(row.externalAuthorisation))) {
    return 'no external notification / authorisation status (internal approval does not stand in for it)';
  }
  if ([EXTERNAL_NOTIFIED, EXTERNAL_AUTHORISED].includes(text(row.externalAuthorisation)) && text(row.externalEvidenceLink) === '') {
    return 'external notification / authorisation recorded with no evidence link';
  }
  return null;
}

// Which markets still have nothing usable at Gate 10, and why. Returned as text so
// the blocker can name the market rather than say "something is missing".
// Every component of the market is assessed, not only the first (question 20).
export function marketsWithoutChecklist(project: ProjectData): string[] {
  return marketsNeedingDossier(project).flatMap((market) => {
    const rows = rowsOf(project, market);
    if (rows.length === 0) return [`${market} (no dossier component recorded)`];
    return rows.flatMap((row) => {
      const gap = checklistRowGap(project, row);
      return gap ? [`${market} ${rowLabel(row)} (${gap})`] : [];
    });
  });
}

// What still stands between a market and release after Gate 10 (question 20): "A condition required before launch blocks Gate 11 until met" —
// the action carrying it is Closed — and an external notification that is required but not yet made. Empty when nothing does.
export function marketLaunchHolds(project: ProjectData): string[] {
  return marketsNeedingDossier(project).flatMap((market) =>
    rowsOf(project, market).flatMap((row) => {
      const out: string[] = [];
      if (text(row.regulatoryApproval) === REGULATORY_APPROVAL_WITH_CONDITIONS && text(row.conditionTiming) === CONDITION_BEFORE_LAUNCH) {
        const action = project.nextActions.find((a) => a.id === text(row.conditionActionId));
        if (!action || action.status !== 'Closed') out.push(`${market} ${rowLabel(row)}: a condition required before launch is not met (${action ? `action ${action.id} is ${action.status}` : 'no action linked'})`);
      }
      if (text(row.externalAuthorisation) === EXTERNAL_REQUIRED_PENDING) out.push(`${market} ${rowLabel(row)}: the external notification / authorisation is required and not yet made`);
      return out;
    }),
  );
}

// The ONE regulatory summary of a market, derived from its dossier components (question 20: "Synchronise summary values from the same
// underlying decisions; do not maintain contradictory approval fields"). The tracking card's Regulatory status is this value, never typed.
export function marketRegulatorySummary(project: ProjectData, market: string): MarketApprovalStatus {
  const rows = rowsOf(project, market);
  if (rows.length === 0) return 'Not Started';
  const refused = (r: Record<string, unknown>) => ['Not Approved', 'Withdrawn'].includes(text(r.regulatoryApproval)) || ['Blocked', 'On Hold'].includes(text(r.status));
  if (rows.some(refused)) return 'Blocked';
  if (rows.every((r) => checklistRowGap(project, r) === null)) {
    return rows.every((r) => text(r.regulatoryApproval) === CHECKLIST_NOT_APPLICABLE && text(r.status) === CHECKLIST_NOT_APPLICABLE) ? 'N/A' : 'Approved';
  }
  return 'In Progress';
}

// A summary of "Approved" that is approved WITH conditions says so beside it.
export function marketHasConditionalApproval(project: ProjectData, market: string): boolean {
  return rowsOf(project, market).some((r) => text(r.regulatoryApproval) === REGULATORY_APPROVAL_WITH_CONDITIONS);
}

// The ASEAN half. Only evaluated when the project actually sells into ASEAN —
// that condition is the whole point of E2's option (b), and it is expressed as a
// readiness trigger rather than baked in here so the panel can say "not triggered"
// in the same words it uses everywhere else.
export function aseanChecklistIncomplete(project: ProjectData): boolean {
  const rows = project.registers[ASEAN_CHECKLIST_REGISTER] ?? [];
  // 'Complete' is the workbook's own word on this sheet's Status list (it was 'Completed' on the generic list).
  return rows.some((r) => !isDoneStatus(r.status));
}
