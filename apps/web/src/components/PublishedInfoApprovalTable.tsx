import { useMemo } from 'react';
import { Alert, Checkbox, Input, Select, Tooltip } from 'antd';
import type { RegisterColumn, RegisterConfig } from '@mbc360/shared/config/registers';
import type { RegisterRow } from '@mbc360/shared/types';
import { contradictoryClaimRows, publishedInfoViolations, wordingDiffers, wordingSimilarity } from '@mbc360/shared/utils/claimEvidence';
import DynamicTable, { type CellApi } from './DynamicTable';

// Published_Info_Approval: the generic register table (DynamicTable, 2026-10-02
// concept) plus this register's own cell rules — it was a fork of the whole table
// until then. Originally (2026-07-27,
// user-requested): "Claim ID" is picked from Claim -> Evidence Traceability
// instead of typed free text.
//
// The picker originally offered 'Supported' claims ONLY; corrected 2026-08-07
// per SME Round 3 (D2) to offer every claim, so an intended claim can be
// documented while still under development.
//
// 2026-08-12 — the rest of D2. Two shipped behaviours it rejected are gone:
//
//   * Wording was auto-filled from the claim and LOCKED, and re-synced on every
//     save. D2: "Do not enforce an absolute character-for-character lock across
//     every channel." Worse than a lock in practice — the only way to shorten a
//     sentence for a social caption was to edit the claim itself, letting one
//     post rewrite approved wording for the whole project. Now the claim's text
//     shows in its own read-only "Master approved wording" column, the proposed
//     channel wording stays editable, and a difference must be classified by a
//     reviewer before release. Similarity is shown as a WARNING only, never a
//     block — D2 reserves equivalence for a person.
//   * A blank Claim ID meant "this row makes no claim", so any row escaped every
//     rule by leaving it empty. D2 allows that only for genuinely non-product
//     corporate information, which is now an explicit tick attributed to whoever
//     made it.
//
// All of it is enforced by the shared `publishedInfoViolations`, which the API
// calls too — the guard here is UX, not the authority.
export default function PublishedInfoApprovalTable({
  config,
  rows,
  claimEvidenceRows,
  onSave,
  readOnly,
  readOnlyReason,
  embedded,
}: {
  config: RegisterConfig;
  rows: RegisterRow[];
  // Live Claim -> Evidence Traceability rows for this project — the picker's
  // source list, and the source of the read-only master wording column.
  claimEvidenceRows: RegisterRow[];
  onSave: (rows: RegisterRow[]) => void;
  readOnly?: boolean;
  readOnlyReason?: string;
  embedded?: boolean;
}) {
  const claimById = useMemo(
    () => new Map(claimEvidenceRows.filter((c) => typeof c.claimId === 'string' && c.claimId).map((c) => [String(c.claimId), c])),
    [claimEvidenceRows],
  );
  // EVERY claim is offered, whatever its status (corrected 2026-08-07, SME
  // Round 3 D2: "Developing or Pending claims should be selectable"). The
  // release block is a separate mechanism (`publishedInfoViolations`, enforced
  // in the API too), so nothing is weakened by offering them here. A
  // non-Supported claim is labelled as such rather than hidden.
  const claimOptions = useMemo(
    () =>
      claimEvidenceRows
        .filter((c) => typeof c.claimId === 'string' && c.claimId)
        .map((c) => {
          const wording = String(c.approvedWording ?? '').trim();
          const status = String(c.status ?? '').trim();
          const detail = wording || (status && status !== 'Supported' ? `${status} — no approved wording yet` : '');
          return {
            value: String(c.claimId),
            label: detail ? `${c.claimId} — ${detail.slice(0, 60)}${detail.length > 60 ? '…' : ''}` : String(c.claimId),
          };
        }),
    [claimEvidenceRows],
  );
  // The claim's own approved wording, read live rather than from the row's
  // stored copy — the API rewrites that copy on save, so during editing the
  // claim is the only trustworthy source.
  const masterWordingFor = (row: RegisterRow) => {
    const claimId = typeof row.claimId === 'string' ? row.claimId.trim() : '';
    return claimId ? String(claimById.get(claimId)?.approvedWording ?? '') : '';
  };

  // D2: "Automated similarity checking may be used as a warning, but final
  // equivalence must be confirmed by an authorised reviewer." Nothing branches
  // on this number — it only tells the reviewer how far apart the two texts are.
  const adaptationFor = (row: RegisterRow) => {
    const master = masterWordingFor(row);
    if (!wordingDiffers(master, row.exactWording)) return undefined;
    return {
      similarity: wordingSimilarity(master, row.exactWording),
      classified: String(row.wordingEquivalence ?? '').trim() !== '',
    };
  };

  const renderCell = (column: RegisterColumn, row: RegisterRow, _index: number, api: CellApi): React.ReactNode | undefined => {
    switch (column.key) {
      // No input by design: the API stamps this from the signed-in account when
      // the box is ticked, so it cannot be typed (a declaration anyone can retype
      // attributes nothing) — hence explicit states, including "recorded when you
      // save", since the name only exists after the server has seen the tick.
      case 'noProductClaimBy': {
        const declared = String(row.noProductClaimBy ?? '').trim();
        if (declared) return <span className="rt-static">{declared}</span>;
        return (
          <span className="rt-muted" style={{ fontSize: 12 }}>
            {row.noProductClaim ? 'recorded when you save' : 'no exemption declared'}
          </span>
        );
      }
      // Read-only, rendered from the claim rather than the row's stored copy so
      // it is right the moment a claim is linked, before any save.
      case 'masterWording': {
        const master = masterWordingFor(row);
        if (!master) {
          return (
            <span className="rt-muted" style={{ fontSize: 12 }}>
              {row.claimId ? 'claim has no approved wording yet' : 'no claim linked'}
            </span>
          );
        }
        return <span className="rt-static">{master}</span>;
      }
      default:
        break;
    }
    if (api.readOnly) return undefined;

    switch (column.key) {
      // The prior question: a record that makes no product statement has nothing
      // to link. Ticking is blocked while a claim IS linked — the person unlinks
      // it deliberately rather than the app dropping the link for them.
      case 'noProductClaim': {
        const linked = String(row.claimId ?? '').trim() !== '';
        const blocked = linked && !row.noProductClaim;
        return (
          <Tooltip
            title={
              blocked
                ? 'A Claim ID is linked, so this record does make a product statement — unlink the claim first if that is wrong'
                : undefined
            }
          >
            <Checkbox
              checked={!!row.noProductClaim}
              disabled={blocked}
              onChange={(e) => {
                if (e.target.checked && linked) return; // defence in depth
                api.patch('noProductClaim', e.target.checked);
              }}
            />
          </Tooltip>
        );
      }
      case 'claimId': {
        const claimId = String(row.claimId ?? '');
        const violation = publishedInfoViolations(api.draft, claimEvidenceRows).find((v) => v.row === row);
        const isViolation = violation?.kind === 'unlinked' || violation?.kind === 'unsupported';
        const exempt = !!row.noProductClaim;
        return (
          <Tooltip
            title={
              exempt
                ? 'Declared as containing no product claim or technical statement — untick that to link a claim'
                : isViolation
                  ? violation?.reason
                  : undefined
            }
          >
            <Select
              disabled={exempt}
              style={{ width: '100%' }}
              showSearch
              allowClear
              popupMatchSelectWidth={false}
              status={isViolation ? 'error' : undefined}
              optionFilterProp="label"
              placeholder="Not claim-linked"
              value={claimId || undefined}
              options={
                // Never silently hide an existing link, even one pointing at a
                // claim that has since been deleted.
                claimId && !claimOptions.some((o) => o.value === claimId)
                  ? [{ value: claimId, label: `${claimId} — no matching claim record` }, ...claimOptions]
                  : claimOptions
              }
              onChange={(value: string | undefined) => {
                // Seed the proposed wording from the claim ONLY when it is still
                // empty — never overwrite text written for this channel, which is
                // what the old lock did on every save.
                const claim = value ? claimById.get(value) : undefined;
                const wording = String(claim?.approvedWording ?? '').trim();
                api.patchRow({
                  claimId: value ?? '',
                  ...(wording && String(row.exactWording ?? '').trim() === '' ? { exactWording: wording } : {}),
                });
              }}
            />
          </Tooltip>
        );
      }
      case 'exactWording': {
        const adaptation = adaptationFor(row);
        const violation = publishedInfoViolations(api.draft, claimEvidenceRows).find((v) => v.row === row);
        return (
          <>
            <Input.TextArea
              autoSize={{ minRows: 2, maxRows: 8 }}
              status={violation?.kind === 'wording' ? 'error' : undefined}
              value={row.exactWording as string | undefined}
              onChange={(e) => api.patch('exactWording', e.target.value)}
            />
            {adaptation && (
              <div style={{ fontSize: 12, marginTop: 4, color: adaptation.classified ? 'var(--c-text-3)' : 'var(--c-warn)' }}>
                Differs from master · {Math.round(adaptation.similarity * 100)}% word overlap
                {adaptation.classified ? '' : ' — needs a reviewer comparison'}
              </div>
            )}
          </>
        );
      }
      default:
        return undefined;
    }
  };

  return (
    <DynamicTable
      config={config}
      rows={rows}
      // No resync on save: overwriting the proposed wording with the claim's
      // text is exactly the character-for-character lock D2 rules out. The API
      // fills the read-only masterWording column instead.
      onSave={onSave}
      readOnly={readOnly}
      readOnlyReason={readOnlyReason}
      embedded={embedded}
      renderCell={renderCell}
      tableColumns={['workflowState', 'claimId', 'market', 'status']}
      subtitleText={(row) =>
        [row.publishedItem, row.channel].map((v) => String(v ?? '').trim()).filter(Boolean).join(' · ')
      }
      rowHasError={(row, draft) => publishedInfoViolations(draft, claimEvidenceRows).some((v) => v.row === row)}
      saveBlockers={(draft) => {
        // All three D2 release conditions, from the same function the API calls.
        const violations = publishedInfoViolations(draft, claimEvidenceRows);
        // Both cells are disabled to keep this impossible, so a row can only
        // reach this state through data from elsewhere — but the guard exists at
        // both layers regardless (BACKEND_PLAN §3 principle 7).
        const contradictory = contradictoryClaimRows(draft);
        return [
          ...(contradictory.length > 0
            ? [`${contradictory.length} row(s) are declared as containing no product claim while also linking a Claim ID — unlink the claim, or clear the declaration.`]
            : []),
          ...(violations.length > 0 ? [`${violations.length} row(s) cannot sit at a released workflow state — see the reasons above.`] : []),
        ];
      }}
      notices={(draft) => {
        if (readOnly) return null;
        const violations = publishedInfoViolations(draft, claimEvidenceRows);
        if (violations.length > 0) {
          return (
            <Alert
              type="error"
              showIcon
              title={`${violations.length} row(s) cannot sit at a released workflow state`}
              description={
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {violations.map((v, i) => (
                    <li key={i}>
                      <strong>{String(v.row.recordId ?? '(no record id)')}</strong> — {v.reason}
                    </li>
                  ))}
                </ul>
              }
            />
          );
        }
        if (draft.some((row) => adaptationFor(row) && !adaptationFor(row)?.classified)) {
          return (
            <Alert
              type="warning"
              showIcon
              title="Proposed wording differs from the claim's master wording on some rows"
              description="That is allowed — a channel may adapt wording where the meaning, scope, qualifiers and evidence burden are unchanged. Record the comparison in 'Wording comparison' and who confirmed it; a material change needs a new or revised claim record instead. The word-overlap figure is guidance only, never a decision."
            />
          );
        }
        return null;
      }}
    />
  );
}
