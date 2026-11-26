// Round 5 question 29 (SME answer, 2026-11-05): "Read both. Packaging Specs & Artwork Evidence holds the approved artwork revision, file and linked Claim
// IDs/approved claim revisions. Released Label Control records which approved label/artwork/formula version is authorised and actually used in each market,
// plus transition and reconciliation. Gate 11 confirms that the proposed release matches the approved record; a filename alone is not approval. A Yes and
// actual market-release date are recorded after deployment, not required before first-launch authorisation. Do not force a false "already released" answer
// to pass Gate 11."
//
// One reading for the screen and the server. Our readings (`[ASSUMPTION: R6-Q37]`): the approved record is a row of the packaging register (it carries a
// generated Artwork ID); a Released Label Control row names the approved record it releases, and Gate 11 compares them — approved, same label version, same
// artwork file, covering the market, same formula version; the claim revisions an approval stood on are stamped by the server when it is given and the
// approval is stale if a claim has moved on since; "released to market" and its date are never read before Gate 12.
import type { ProjectData, RegisterRow } from '../types';

export const ARTWORK_REGISTER = 'packagingSpecsArtwork';
export const RELEASED_LABEL_REGISTER = 'releasedLabelRegister';

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : v === undefined || v === null ? '' : String(v).trim());
const same = (a: unknown, b: unknown) => text(a).toLowerCase() === text(b).toLowerCase();
const ids = (v: unknown) => text(v).split(',').map((x) => x.trim()).filter(Boolean);

// The claims an artwork row names, with the revision each stood at: "CLM-001 r2, CLM-002 r1".
function stampOf(claimIds: string[], claims: RegisterRow[]): string {
  const byId = new Map(claims.map((c) => [text(c.claimId), c]));
  return claimIds.map((id) => `${id} r${text(byId.get(id)?.revision) || '?'}`).join(', ');
}

// When an artwork row is APPROVED, the server records the revision of every claim it names, as it stood then. Carried over by Artwork ID otherwise; a value the
// request carries is never trusted.
export function stampArtworkClaimRevisions(project: ProjectData, committed: RegisterRow[], rows: RegisterRow[]): RegisterRow[] {
  const before = new Map(committed.filter((r) => text(r.artworkId) !== '').map((r) => [text(r.artworkId), r]));
  const claims = project.registers['claimEvidenceTraceability'] ?? [];
  return rows.map((row) => {
    const old = before.get(text(row.artworkId));
    const approved = text(row.approval) === 'Approved';
    const fresh = approved && (!old || text(old.approval) !== 'Approved' || text(old.claimIds) !== text(row.claimIds) || text(old.approvedClaimRevisions) === '');
    if (!fresh) return { ...row, approvedClaimRevisions: approved ? (old?.approvedClaimRevisions ?? '') : '' };
    return { ...row, approvedClaimRevisions: stampOf(ids(row.claimIds), claims) };
  });
}

// An approval given on claim revisions that have since moved on is stale: the artwork has to be approved again on the claim as it now stands.
export function artworkClaimRevisionDrift(artworkRows: RegisterRow[], claimRows: RegisterRow[]): { row: RegisterRow; claimId: string; reason: string }[] {
  const byId = new Map(claimRows.map((c) => [text(c.claimId), c]));
  const out: { row: RegisterRow; claimId: string; reason: string }[] = [];
  for (const row of artworkRows) {
    if (text(row.approval) !== 'Approved') continue;
    for (const part of text(row.approvedClaimRevisions).split(',').map((p) => p.trim()).filter(Boolean)) {
      const m = /^(.+?) r(\S+)$/.exec(part);
      if (!m) continue;
      const claim = byId.get(m[1]);
      if (claim && text(claim.revision) !== '' && text(claim.revision) !== m[2]) {
        out.push({ row, claimId: m[1], reason: `claim ${m[1]} is now at revision ${text(claim.revision)}; this artwork was approved on revision ${m[2]} — approve it again on the claim as it stands` });
      }
    }
  }
  return out;
}

// What stands between a Released Label Control row and the approved artwork record it releases; empty = the proposed release matches the approval.
export function releasedLabelApprovalGaps(project: ProjectData, market?: string): string[] {
  const approved = project.registers[ARTWORK_REGISTER] ?? [];
  const rows = (project.registers[RELEASED_LABEL_REGISTER] ?? []).filter((r) => {
    if (!market) return true;
    const named = ids(r.marketsAffected);
    return named.length === 0 || named.includes(market);
  });
  if (rows.length === 0) return [market ? `${market}: no released-label record` : 'no released-label record'];
  const out: string[] = [];
  for (const row of rows) {
    const label = text(row.recordId) || text(row.newLabelVersion) || '(unnamed row)';
    const ref = text(row.approvedArtworkId);
    if (ref === '') {
      out.push(`${label}: names no approved artwork record — a filename alone is not approval`);
      continue;
    }
    const rec = approved.find((a) => text(a.artworkId) === ref);
    if (!rec) {
      out.push(`${label}: points at artwork record ${ref}, which does not exist`);
      continue;
    }
    if (text(rec.approval) !== 'Approved') out.push(`${label}: artwork record ${ref} is not Approved`);
    if (!same(row.newLabelVersion, rec.artworkVersion)) out.push(`${label}: label version "${text(row.newLabelVersion) || '—'}" is not the approved version "${text(rec.artworkVersion) || '—'}"`);
    if (text(rec.artworkFile) === '') out.push(`${label}: artwork record ${ref} names no approved artwork file`);
    else if (!same(row.newArtworkFile, rec.artworkFile)) out.push(`${label}: artwork file "${text(row.newArtworkFile) || '—'}" is not the approved file "${text(rec.artworkFile)}"`);
    if (market && text(rec.market) !== '' && !ids(rec.market).includes(market)) out.push(`${label}: artwork record ${ref} is approved for ${text(rec.market)}, not ${market}`);
    if (text(row.formulaVersion) === '') out.push(`${label}: names no formula version`);
    else if (text(row.formulaVersion) !== text(project.formulaVersion)) out.push(`${label}: formula ${text(row.formulaVersion)} is not the project's current ${project.formulaVersion}`);
  }
  return out;
}
