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
import type { ProjectData } from '../types';
import { ASEAN_MARKETS } from '../config/registers';

export const MARKET_DOSSIER_REGISTER = 'regulatoryChecklistStatus';
export const ASEAN_CHECKLIST_REGISTER = 'pifChecklistAsean';

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export function isAseanMarket(market: string): boolean {
  return ASEAN_MARKETS.includes(market.trim());
}

export function projectHasAseanMarket(project: ProjectData): boolean {
  return project.identity.markets.some(isAseanMarket);
}

// Markets this project sells into that have no built-in profile — i.e. everything
// the ASEAN checklist does not cover. "Other - specify" lands here on purpose: an
// unnamed market cannot be assumed to be covered by the ASEAN template.
export function marketsNeedingOwnChecklist(project: ProjectData): string[] {
  return project.identity.markets.filter((m) => !isAseanMarket(m));
}

// A row counts once Regulatory has said what the dossier is, who owns it, where
// the checklist lives, and recorded both statuses. E2 lists all six; a row missing
// any of them is a placeholder, not the record it asks for.
function isChecklistRowComplete(row: Record<string, unknown>): boolean {
  return (
    text(row.dossierType) !== '' &&
    text(row.owner) !== '' &&
    text(row.checklistLink) !== '' &&
    text(row.status) !== '' &&
    text(row.regulatoryApproval) !== ''
  );
}

// Which markets still have nothing usable at Gate 10, and why. Returned as text so
// the blocker can name the market rather than say "something is missing".
export function marketsWithoutChecklist(project: ProjectData): string[] {
  const rows = project.registers[MARKET_DOSSIER_REGISTER] ?? [];
  return marketsNeedingOwnChecklist(project)
    .map((market) => {
      const row = rows.find((r) => text(r.market) === market);
      if (!row) return `${market} (no checklist record)`;
      if (!isChecklistRowComplete(row)) return `${market} (record incomplete)`;
      return '';
    })
    .filter(Boolean);
}

// The ASEAN half. Only evaluated when the project actually sells into ASEAN —
// that condition is the whole point of E2's option (b), and it is expressed as a
// readiness trigger rather than baked in here so the panel can say "not triggered"
// in the same words it uses everywhere else.
export function aseanChecklistIncomplete(project: ProjectData): boolean {
  const rows = project.registers[ASEAN_CHECKLIST_REGISTER] ?? [];
  return rows.some((r) => text(r.status) !== 'Completed');
}
