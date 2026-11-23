// SW-59 (project owner, 2026-11-23): a register that uses company reference data links to the record by a picked field, the cells that restate the
// record are filled from it, and they are read-only. This file is the shared half for two more sources (the Restricted & caution list has its own in
// `restrictedCaution.ts`):
//
//   - the Claims Library: a project claim links to an entry (`libraryEntryId`); wording, category and risk come from the entry. A claim with NO
//     link is a genuinely new claim (Round 4 question 28(2): "A genuinely new claim may be proposed without a library link") and is typed, which is
//     why an unlinked claim is not locked. A link to a Withdrawn entry is never newly made (Round 5 question 6(c)) and an existing one is not
//     rewritten from wording that is no longer used. [ASSUMPTION: R6-Q23]
//   - the Regulatory market profiles: a profile is keyed by market, so the row's `market` IS the link. The dossier type the profile names fills
//     the register's "Required dossier type", derived on every read so a later change to the profile shows at once. [ASSUMPTION: R6-Q24]
//
// A value the source holds nothing for is never copied: the cell stays the person's own.
import type { ClaimLibraryEntry, MarketProfile, RegisterRow } from '../types';
import type { RegisterColumn } from '../config/registers';
import { CLAIM_LIBRARY_LINK_OPTIONS } from '../config/referenceData';

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const norm = (v: unknown): string => text(v).toLowerCase().replace(/\s+/g, ' ');

// ---------------------------------------------------------------------------
// Claims Library
// ---------------------------------------------------------------------------
export const CLAIM_LIBRARY_LINK_COLUMN = 'libraryEntryId';
export const CLAIM_LIBRARY_STATUS_FIELD = 'libraryStatus';

export type ClaimsLibraryInherit = NonNullable<RegisterColumn['inheritFromLibrary']>;

// The entry a claim row is linked to, unless it has been withdrawn (withdrawn wording is no longer used, so nothing is copied from it).
export function linkedClaimsLibraryEntry(library: readonly ClaimLibraryEntry[] | undefined, id: unknown): ClaimLibraryEntry | undefined {
  const key = text(id);
  if (key === '') return undefined;
  return library?.find((e) => e.id === key && e.status !== 'Withdrawn');
}

export function claimsLibraryInheritedValue(field: ClaimsLibraryInherit, entry: ClaimLibraryEntry): string {
  switch (field) {
    case 'wording':
      return text(entry.wording);
    case 'claimCategory':
      return text(entry.claimCategory);
    case 'claimRisk':
      return text(entry.claimRisk);
    case 'linkStatus':
      return CLAIM_LIBRARY_LINK_OPTIONS[0];
  }
}

// The cells a claim takes from its entry, as a patch; a field the entry holds nothing for is left out.
export function claimsLibraryInheritedCells(columns: readonly RegisterColumn[], entry: ClaimLibraryEntry): RegisterRow {
  const patch: RegisterRow = {};
  for (const c of columns) {
    if (!c.inheritFromLibrary) continue;
    const value = claimsLibraryInheritedValue(c.inheritFromLibrary, entry);
    if (value !== '') patch[c.key] = value;
  }
  return patch;
}

const committedRowOf = (committed: readonly RegisterRow[], row: RegisterRow, index: number): RegisterRow | undefined => {
  const id = text(row.claimId);
  return (id !== '' && committed.find((c) => text(c.claimId) === id)) || committed[index];
};

// The API copies the library cells onto a claim. `changed` = the rows whose link a person has just made or changed (done BEFORE the revision and
// baseline checks, so a link that rewrites an approved wording needs the sanctioned route like any edit); `unchanged` = the rows that kept their
// link (done AFTER them, so a later change to the library follows into the claim at the next save without refusing an unrelated edit);
// `all` = both. A claim whose link was just cleared loses the "Linked" declaration, so the person declares "New claim" on purpose.
export function applyClaimsLibraryInheritance(
  columns: readonly RegisterColumn[],
  rows: RegisterRow[],
  library: readonly ClaimLibraryEntry[] | undefined,
  committed: readonly RegisterRow[],
  which: 'changed' | 'unchanged' | 'all' = 'all',
): RegisterRow[] {
  if (!columns.some((c) => c.inheritFromLibrary)) return rows;
  return rows.map((row, i) => {
    const link = text(row[CLAIM_LIBRARY_LINK_COLUMN]);
    const was = text(committedRowOf(committed, row, i)?.[CLAIM_LIBRARY_LINK_COLUMN]);
    const changed = link !== was;
    if ((which === 'changed' && !changed) || (which === 'unchanged' && changed)) return row;
    const entry = linkedClaimsLibraryEntry(library, link);
    if (entry) return { ...row, ...claimsLibraryInheritedCells(columns, entry) };
    if (link === '' && changed && text(row[CLAIM_LIBRARY_STATUS_FIELD]) === CLAIM_LIBRARY_LINK_OPTIONS[0]) return { ...row, [CLAIM_LIBRARY_STATUS_FIELD]: '' };
    return row;
  });
}

// ---------------------------------------------------------------------------
// Regulatory market profiles
// ---------------------------------------------------------------------------
export type MarketProfileInherit = NonNullable<RegisterColumn['inheritFromMarketProfile']>;

export function marketProfileFor(profiles: readonly MarketProfile[] | undefined, market: unknown): MarketProfile | undefined {
  const key = norm(market);
  return key === '' ? undefined : profiles?.find((p) => norm(p.market) === key);
}

export function marketProfileInheritedValue(field: MarketProfileInherit, profile: MarketProfile): string {
  switch (field) {
    case 'dossierType':
      return text(profile.dossierType);
  }
}

// Derived on every read and save (`deriveRegisterRows`): the profile is Regulatory's, so the register can never disagree with it.
export function applyMarketProfileInheritance(columns: readonly RegisterColumn[], rows: RegisterRow[], profiles: readonly MarketProfile[] | undefined): RegisterRow[] {
  const inherited = columns.filter((c) => c.inheritFromMarketProfile);
  if (inherited.length === 0) return rows;
  return rows.map((row) => {
    const profile = marketProfileFor(profiles, row.market);
    if (!profile) return row;
    const next = { ...row };
    for (const c of inherited) {
      const value = marketProfileInheritedValue(c.inheritFromMarketProfile as MarketProfileInherit, profile);
      if (value !== '') next[c.key] = value;
    }
    return next;
  });
}
