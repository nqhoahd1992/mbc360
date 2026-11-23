// Round 5 question 16(a) (SME answer, 2026-11-05): "Regulatory and Safety supply and approve the controlled sources and company overlays, with
// versions and effective dates. The two twelve-row Excel lists are screening prompts, not proof of a complete market restriction screen. Load
// only the approved current company list." And (c): "Keep updates linked to formula, market and source versions."
//
// Read here ([ASSUMPTION: R6-Q22]):
//   - the list is company-level and an entry counts only while it is APPROVED — approved by Regulatory AND by Safety — and CURRENT: its effective
//     dates include today. A proposed, withdrawn, not-yet-effective or expired entry is not loaded;
//   - editing what an entry says retracts both approvals, like a Claims Library entry (an approval stands for the words that were approved);
//   - a formula ingredient MATCHES an entry when the CAS number is the same, else when the INCI name is, and the entry applies to at least one of the
//     project's markets (an entry with no market applies to every market);
//   - every match has to be TAKEN UP: a row of the project's General Restricted & Caution Assessment names the ingredient, so a restricted ingredient
//     found on the list cannot slip past the screen. The row records the list version it was assessed against (`sourceVersion`).
import type { ProjectData, RegisterRow, RestrictedCautionEntry } from '../types';
import type { RegisterConfig } from '../config/registers';

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const norm = (v: unknown): string => text(v).toLowerCase().replace(/\s+/g, ' ');

// Approved by both functions, and not withdrawn.
export function isApprovedRestrictedCaution(e: Pick<RestrictedCautionEntry, 'status'>): boolean {
  return e.status === 'Approved';
}

// Approved, and effective on the given day (YYYY-MM-DD).
export function isCurrentRestrictedCaution(e: RestrictedCautionEntry, today: string): boolean {
  if (!isApprovedRestrictedCaution(e)) return false;
  if (text(e.effectiveFrom) !== '' && e.effectiveFrom > today) return false;
  if (text(e.effectiveTo) !== '' && (e.effectiveTo as string) < today) return false;
  return true;
}

// The status of an entry follows from its approvals and is never typed.
export function restrictedCautionStatusOf(e: { status?: string; approvedByRegulatory?: string; approvedBySafety?: string }, withdrawn = false): RestrictedCautionEntry['status'] {
  if (withdrawn || e.status === 'Withdrawn') return 'Withdrawn';
  return text(e.approvedByRegulatory) !== '' && text(e.approvedBySafety) !== '' ? 'Approved' : 'Proposed';
}

// What an entry still needs before it can be saved: the fields the answer names (a source, its version, an effective date).
export function restrictedCautionProblems(e: Partial<RestrictedCautionEntry>): string[] {
  const missing: string[] = [];
  if (text(e.ingredient) === '') missing.push('the ingredient (INCI name)');
  if (text(e.kind) === '') missing.push('whether it is Prohibited, Restricted or Caution');
  if (text(e.sourceReference) === '') missing.push('the controlled source it comes from');
  if (text(e.version) === '') missing.push("the source's version");
  if (text(e.effectiveFrom) === '') missing.push('the date it takes effect');
  if (text(e.effectiveFrom) !== '' && text(e.effectiveTo) !== '' && (e.effectiveTo as string) < (e.effectiveFrom as string)) missing.push('an end date after the start date');
  return missing;
}

// The INCI names the formula carries, lower-cased (what an entry's ingredient is matched against).
export function projectIngredientNames(project: ProjectData): string[] {
  return [...new Set(project.bom.map((l) => norm(l.inciName)).filter((n) => n !== ''))];
}

export interface RestrictedCautionMatch {
  ingredient: string; // as the formula names it
  entry: RestrictedCautionEntry;
}

// The approved current entries the formula's ingredients match. CAS first, then INCI name; only entries that apply to one of the project's markets.
export function restrictedCautionMatches(project: ProjectData, today: string = new Date().toISOString().slice(0, 10)): RestrictedCautionMatch[] {
  const entries = (project.reference?.restrictedCaution ?? []).filter((e) => isCurrentRestrictedCaution(e, today));
  const markets = new Set(project.identity.markets.map(norm));
  const out: RestrictedCautionMatch[] = [];
  for (const line of project.bom) {
    const cas = text(line.casNo);
    const inci = norm(line.inciName);
    for (const entry of entries) {
      const appliesHere = entry.markets.length === 0 || entry.markets.some((m) => markets.has(norm(m)));
      if (!appliesHere) continue;
      const byCas = cas !== '' && text(entry.casNo) !== '' && cas === text(entry.casNo);
      const byName = inci !== '' && inci === norm(entry.ingredient);
      if (byCas || byName) out.push({ ingredient: text(line.inciName) || entry.ingredient, entry });
    }
  }
  return out;
}

// The matches no row of the General Restricted & Caution Assessment is linked to. A row is linked by the id of the list entry it was assessed
// against (SW-59: a register that uses company reference data links to it by a picked record, never by a retyped name).
export function restrictedCautionMatchesNotTakenUp(project: ProjectData, today?: string): RestrictedCautionMatch[] {
  const rows = project.registers['generalRestrictedCaution'] ?? [];
  const linked = new Set(rows.map((r) => restrictedCautionLinkOf(r)).filter((id) => id !== ''));
  return restrictedCautionMatches(project, today).filter((m) => !linked.has(m.entry.id));
}

// ---------------------------------------------------------------------------
// The link from a register row to the entry (SW-59, project owner 2026-11-23)
// ---------------------------------------------------------------------------
// The column restrictedCautionId holds the id of the entry the row was assessed against. The entries it may name are the approved, current ones
// the project carries (reference.restrictedCaution). Every row names one: there is NO "not on the list" option (project owner, 2026-11-23: it let
// the entry-derived cells be typed by hand again, which is exactly what the rule exists to stop). An ingredient the company list does not hold is
// first proposed and approved as an entry of that list, and only then assessed here.
// Rows saved while such an option existed hold this value; it counts as no link.
const LEGACY_NOT_LISTED = 'not-listed';
export const restrictedCautionLinkOf = (row: RegisterRow): string => {
  const id = text(row.restrictedCautionId);
  return id === LEGACY_NOT_LISTED ? '' : id;
};

// What the row's entry-derived cells hold: the entry's ingredient, its kind and limit as one basis, its source, its version and the markets it names.
export type RestrictedCautionInherit = 'ingredient' | 'basis' | 'sourceReference' | 'version' | 'markets';

export function restrictedCautionInheritedValue(field: RestrictedCautionInherit, entry: RestrictedCautionEntry): string {
  switch (field) {
    case 'ingredient':
      return text(entry.ingredient);
    case 'basis':
      return [text(entry.kind), text(entry.condition)].filter((p) => p !== '').join(': ');
    case 'sourceReference':
      return text(entry.sourceReference);
    case 'version':
      return text(entry.version);
    case 'markets':
      return entry.markets.join(', ');
  }
}

// The project carries EVERY entry of the company list; only an approved one in effect today can be linked to, copied from or taken up.
export const currentRestrictedCautionEntries = (
  entries: readonly RestrictedCautionEntry[] | undefined,
  today: string = new Date().toISOString().slice(0, 10),
): RestrictedCautionEntry[] => (entries ?? []).filter((e) => isCurrentRestrictedCaution(e, today));

export const findRestrictedCautionEntry = (entries: readonly RestrictedCautionEntry[] | undefined, id: unknown, today?: string): RestrictedCautionEntry | undefined =>
  currentRestrictedCautionEntries(entries, today).find((e) => e.id === text(id));

// The cells a row takes from its entry, as a patch. A field the entry holds nothing for is left out, so the cell stays the person's own.
export function restrictedCautionInheritedCells(config: RegisterConfig, entry: RestrictedCautionEntry): RegisterRow {
  const patch: RegisterRow = {};
  for (const c of config.columns) {
    if (!c.inheritFromEntry) continue;
    const value = restrictedCautionInheritedValue(c.inheritFromEntry, entry);
    if (value !== '') patch[c.key] = value;
  }
  return patch;
}

// The API copies the entry-derived cells on every save, so the stored row can never disagree with the entry. A row linked to an entry that is no
// longer current (withdrawn, expired) keeps what it holds: it is flagged, not rewritten.
export function applyRestrictedCautionInheritance(config: RegisterConfig, rows: RegisterRow[], entries: readonly RestrictedCautionEntry[]): RegisterRow[] {
  if (!config.columns.some((c) => c.inheritFromEntry)) return rows;
  return rows.map((row) => {
    const entry = findRestrictedCautionEntry(entries, row.restrictedCautionId);
    return entry ? { ...row, ...restrictedCautionInheritedCells(config, entry) } : row;
  });
}

// A NEW link (or a changed one) must name a current entry. A link a row already had stays, even when its entry has
// since been withdrawn: it is flagged on the row instead.
export function newRestrictedCautionLinkProblems(committed: RegisterRow[], next: RegisterRow[], entries: readonly RestrictedCautionEntry[]): string[] {
  const out: string[] = [];
  next.forEach((row, i) => {
    const id = text(row.restrictedCautionId);
    if (id === '') return;
    const recordId = text(row.recordId);
    const old = (recordId && committed.find((c) => text(c.recordId) === recordId)) || committed[i];
    if (text(old?.restrictedCautionId) === id) return;
    if (!findRestrictedCautionEntry(entries, id)) {
      out.push(`${text(row.ingredientInci) || `Row ${i + 1}`} — "${id}" is not an approved, current entry of the company's restricted and caution list`);
    }
  });
  return out;
}

// Why a row's link needs attention. Undefined = it does not.
export function restrictedCautionLinkGap(row: RegisterRow, entries: readonly RestrictedCautionEntry[] | undefined): string | undefined {
  const id = restrictedCautionLinkOf(row);
  if (id === '') return 'Company list entry (choose the entry this row is about)';
  const entry = findRestrictedCautionEntry(entries, id);
  if (!entry) return 'the linked company list entry is no longer approved and current: reassess the row against the current list';
  if (text(entry.version) !== text(row.sourceVersion)) {
    return `the company list entry is now at version ${text(entry.version)} (this row was assessed against ${text(row.sourceVersion) || 'none'}): reassess and save the row to record the current version`;
  }
  return undefined;
}
