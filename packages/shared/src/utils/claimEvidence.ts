// Gate 3 rule (F1 appendix, docs/rounds/2026-07-21-sme-reply-F1-F14.txt): "A claim may remain under
// development, but unsupported wording must not be marked as approved."
// Hard-blocked 2026-07-27 (user-requested) at the point that rule actually
// bites — Published Information Approval (rules C6/F11), which already
// covers every public-facing channel including labels and sales material
// (see that register's own description). A Published Info row that links to
// a specific claim (`claimId`, referencing Claim -> Evidence Traceability)
// cannot reach a released workflow state unless that claim's own status is
// 'Supported'. A row with no `claimId` isn't claim-linked, so this rule
// doesn't apply to it (e.g. plain company/product info).
import type { RegisterRow } from '../types';
import { RELEASED_INFO_STATES } from '../config/registers';

// Which Published Info rows violate the rule — non-empty and never mutates
// its inputs, so both the frontend (Save-guard UX) and the API (the
// authoritative enforcement) can call it against the same data and agree.
export function unsupportedClaimRows(
  publishedInfoRows: RegisterRow[],
  claimEvidenceRows: RegisterRow[],
): RegisterRow[] {
  const supportedClaimIds = new Set(
    claimEvidenceRows
      .filter((c) => c.status === 'Supported' && typeof c.claimId === 'string' && c.claimId.trim() !== '')
      .map((c) => String(c.claimId).trim()),
  );
  return publishedInfoRows.filter((row) => {
    const claimId = typeof row.claimId === 'string' ? row.claimId.trim() : '';
    if (!claimId) return false; // not linked to a specific claim — rule doesn't apply
    if (!RELEASED_INFO_STATES.includes(String(row.workflowState))) return false; // not being released yet
    return !supportedClaimIds.has(claimId);
  });
}
