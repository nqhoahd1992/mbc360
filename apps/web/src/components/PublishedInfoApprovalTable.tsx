import { useMemo } from 'react';
import { Alert, Button, Card, Checkbox, DatePicker, Input, InputNumber, Popconfirm, Select, Table, Tag, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, LockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { RegisterColumn, RegisterConfig } from '@mbc360/shared/config/registers';
import { isRegisterRowBlank } from '@mbc360/shared/config/registers';
import type { RegisterRow } from '@mbc360/shared/types';
import { contradictoryClaimRows, publishedInfoViolations, wordingDiffers, wordingSimilarity } from '@mbc360/shared/utils/claimEvidence';
import { patchArray, useDraft } from '../hooks/useDraft';
import { createEmptyRegisterRow } from '../store/factory';
import SaveBar from './SaveBar';
import UserSelect from './UserSelect';
import MarketSelect from './MarketSelect';

// Published_Info_Approval-specific variant of DynamicTable (2026-07-27,
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
}: {
  config: RegisterConfig;
  rows: RegisterRow[];
  // Live Claim -> Evidence Traceability rows for this project — the picker's
  // source list, and the source of the read-only master wording column.
  claimEvidenceRows: RegisterRow[];
  onSave: (rows: RegisterRow[]) => void;
  readOnly?: boolean;
  readOnlyReason?: string;
}) {
  const { draft, dirty, update, markSaved, discard } = useDraft(rows);
  const patch = (index: number, key: string, value: string | number | boolean | undefined) =>
    update((prev) => patchArray(prev, index, { [key]: value } as Partial<RegisterRow>));
  const addRow = () => update((prev) => [...prev, createEmptyRegisterRow(config.key)]);
  const removeRow = (index: number) => update((prev) => prev.filter((_, i) => i !== index));

  const claimById = useMemo(
    () => new Map(claimEvidenceRows.filter((c) => typeof c.claimId === 'string' && c.claimId).map((c) => [String(c.claimId), c])),
    [claimEvidenceRows],
  );
  // EVERY claim is offered, whatever its status (corrected 2026-08-07, SME
  // Round 3 / Response2 D2). It used to list 'Supported' claims only, on the
  // reasoning that a claim still under development has no approved wording to
  // lock to — the team answered the other way: "Developing or Pending claims
  // should be selectable. The purpose is to document the intended claim
  // early." The restriction was also stricter than the Gate 3 rule requires,
  // since that rule bites at RELEASE, not at linking — and that block is a
  // separate mechanism (`publishedInfoViolations` below, enforced in the API
  // too), so nothing is weakened by removing it here. A non-Supported claim
  // is labelled as such in the dropdown rather than hidden.
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

  const hasBlankRows = draft.some((r) => isRegisterRowBlank(config, r));
  // All three D2 release conditions, from the same function the API calls.
  const violations = publishedInfoViolations(draft, claimEvidenceRows);
  const violationFor = (row: RegisterRow) => violations.find((v) => v.row === row);
  // Both cells below are disabled to keep this impossible, so a row can only
  // reach this state through data that arrived from somewhere else — but the
  // guard exists at both layers regardless, because "the UI disables it" is not
  // enforcement (BACKEND_PLAN §3 principle 7).
  const contradictory = contradictoryClaimRows(draft);
  const saveBlocked = hasBlankRows || violations.length > 0 || contradictory.length > 0;

  // D2: "Automated similarity checking may be used as a warning, but final
  // equivalence must be confirmed by an authorised reviewer." Nothing branches
  // on this number — it only tells the reviewer how far apart the two texts are.
  const wordingAdaptations = useMemo(
    () =>
      draft
        .map((row) => ({ row, master: masterWordingFor(row) }))
        .filter(({ row, master }) => wordingDiffers(master, row.exactWording))
        .map(({ row, master }) => ({
          row,
          similarity: wordingSimilarity(master, row.exactWording),
          classified: String(row.wordingEquivalence ?? '').trim() !== '',
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft, claimById],
  );

  const save = () => {
    if (saveBlocked) return;
    // No resync: overwriting the proposed wording with the claim's text is
    // exactly the character-for-character lock D2 rules out. The API fills the
    // read-only masterWording column instead, so the record still carries what
    // the channel wording was compared against.
    onSave(draft);
    markSaved();
  };

  const renderGeneric = (column: RegisterColumn, row: RegisterRow, index: number) => {
    const editable = column.editable !== false && !readOnly;
    const value = row[column.key];
    if (!editable) return <span style={{ color: '#666' }}>{value != null ? String(value) : ''}</span>;
    switch (column.type) {
      case 'market':
      case 'markets':
        return (
          <MarketSelect
            value={value as string | undefined}
            multiple={column.type === 'markets'}
            onChange={(v) => patch(index, column.key, v)}
          />
        );
      case 'user':
        return (
          <UserSelect
            value={value as string | undefined}
            onChange={(v) => patch(index, column.key, v)}
          />
        );
      case 'checkbox':
        return <Checkbox checked={!!value} onChange={(e) => patch(index, column.key, e.target.checked)} />;
      case 'select':
        return (
          <Select
            size="small"
            allowClear
            style={{ width: '100%', minWidth: 110 }}
            value={value as string | undefined}
            options={(column.options ?? []).map((o) => ({ value: o, label: o }))}
            onChange={(v) => patch(index, column.key, v)}
          />
        );
      case 'date':
        return (
          <DatePicker
            size="small"
            style={{ width: '100%' }}
            value={value ? dayjs(String(value)) : null}
            onChange={(d) => patch(index, column.key, d ? d.format('YYYY-MM-DD') : undefined)}
          />
        );
      case 'number':
        return (
          <InputNumber size="small" style={{ width: '100%' }} value={value as number | undefined} onChange={(v) => patch(index, column.key, v ?? 0)} />
        );
      case 'textarea':
        return (
          <Input.TextArea
            autoSize={{ minRows: 1, maxRows: 4 }}
            size="small"
            value={value as string | undefined}
            onChange={(e) => patch(index, column.key, e.target.value)}
          />
        );
      case 'text':
      default:
        return <Input size="small" value={value as string | undefined} onChange={(e) => patch(index, column.key, e.target.value)} />;
    }
  };

  const staticCell = (column: RegisterColumn, row: RegisterRow) => {
    const value = row[column.key];
    if (column.type === 'checkbox') return <Checkbox checked={!!value} disabled />;
    return <span style={{ color: '#666' }}>{value != null ? String(value) : ''}</span>;
  };

  const columns = [
    ...config.columns.map((col) => {
      if (readOnly) {
        return { title: col.label, width: col.width ?? 140, render: (_: unknown, row: RegisterRow) => staticCell(col, row) };
      }
      // The prior question, so it comes first in config order too: a record that
      // makes no product statement has nothing to link. Ticking is blocked while a
      // claim IS linked — the person unlinks it deliberately rather than the app
      // dropping the link for them.
      if (col.key === 'noProductClaim') {
        return {
          title: col.label,
          width: col.width ?? 130,
          render: (_: unknown, row: RegisterRow, index: number) => {
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
                    // Defence in depth for the same rule the `disabled` above
                    // expresses — a stale render must not be able to set it.
                    if (e.target.checked && linked) return;
                    patch(index, 'noProductClaim', e.target.checked);
                  }}
                />
              </Tooltip>
            );
          },
        };
      }
      if (col.key === 'claimId') {
        return {
          title: col.label,
          width: col.width ?? 150,
          render: (_: unknown, row: RegisterRow, index: number) => {
            const claimId = String(row.claimId ?? '');
            const violation = violationFor(row);
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
                  size="small"
                  style={{ width: '100%' }}
                  showSearch
                  allowClear
                  status={isViolation ? 'error' : undefined}
                  optionFilterProp="label"
                  placeholder="Not claim-linked"
                  value={claimId || undefined}
                  options={
                    // Never silently hide an existing link, even one pointing
                    // at a claim that has since been deleted — same principle
                    // as the Cosmetri raw-material picker keeping an
                    // off-catalogue value visible. (Every existing claim is in
                    // `claimOptions` now, whatever its status, so this only
                    // fires for an id with no claim behind it at all.)
                    claimId && !claimOptions.some((o) => o.value === claimId)
                      ? [{ value: claimId, label: `${claimId} — no matching claim record` }, ...claimOptions]
                      : claimOptions
                  }
                  onChange={(value: string | undefined) => {
                    patch(index, 'claimId', value ?? '');
                    // Seed the proposed wording from the claim as a convenience
                    // ONLY when the cell is still empty — never overwrite text
                    // someone has written for this channel, which is what the
                    // old lock did on every save.
                    const claim = value ? claimById.get(value) : undefined;
                    const wording = String(claim?.approvedWording ?? '').trim();
                    if (wording && String(row.exactWording ?? '').trim() === '') {
                      patch(index, 'exactWording', wording);
                    }
                  }}
                />
              </Tooltip>
            );
          },
        };
      }
      // Read-only, and rendered from the claim rather than from the row's stored
      // copy so it is right the moment a claim is linked, before any save.
      if (col.key === 'masterWording') {
        return {
          title: col.label,
          width: col.width ?? 200,
          render: (_: unknown, row: RegisterRow) => {
            const master = masterWordingFor(row);
            if (!master) {
              return (
                <span style={{ color: '#bbb', fontSize: 12 }}>
                  {row.claimId ? 'claim has no approved wording yet' : 'no claim linked'}
                </span>
              );
            }
            return <span style={{ color: '#666' }}>{master}</span>;
          },
        };
      }
      if (col.key === 'exactWording') {
        return {
          title: col.label,
          width: col.width ?? 220,
          render: (_: unknown, row: RegisterRow, index: number) => {
            const adaptation = wordingAdaptations.find((a) => a.row === row);
            return (
              <>
                <Input.TextArea
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  size="small"
                  status={violationFor(row)?.kind === 'wording' ? 'error' : undefined}
                  value={row.exactWording as string | undefined}
                  onChange={(e) => patch(index, 'exactWording', e.target.value)}
                />
                {adaptation && (
                  <div style={{ fontSize: 11, marginTop: 2, color: adaptation.classified ? '#8c8c8c' : '#d46b08' }}>
                    Differs from master · {Math.round(adaptation.similarity * 100)}% word overlap
                    {adaptation.classified ? '' : ' — needs a reviewer comparison'}
                  </div>
                )}
              </>
            );
          },
        };
      }
      return { title: col.label, width: col.width ?? 140, render: (_: unknown, row: RegisterRow, index: number) => renderGeneric(col, row, index) };
    }),
    ...(readOnly
      ? []
      : [
          {
            title: '',
            width: 44,
            render: (_: unknown, __: RegisterRow, index: number) => (
              <Popconfirm title="Remove this row?" onConfirm={() => removeRow(index)}>
                <Button size="small" danger type="text" icon={<DeleteOutlined />} />
              </Popconfirm>
            ),
          },
        ]),
  ];

  const totalWidth = config.columns.reduce((sum, c) => sum + (c.width ?? 140), 0) + 44;

  return (
    <Card
      size="small"
      title={
        <span>
          {config.title} {config.gate && <Tag>Gate {config.gate}</Tag>}
        </span>
      }
      extra={<span style={{ color: '#999', fontSize: 12 }}>{draft.length} rows</span>}
    >
      {config.description && (
        <p style={{ color: '#888', fontSize: 12, marginTop: -4, marginBottom: 12 }}>{config.description}</p>
      )}
      {readOnly && (
        <Alert
          type="info"
          showIcon
          icon={<LockOutlined />}
          style={{ marginBottom: 12 }}
          message="Read-only — gate passed"
          description={readOnlyReason ?? 'This evidence belongs to a gate that has already passed. To correct it, Backtrack to reopen that gate first.'}
        />
      )}
      {!readOnly && violations.length > 0 && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          message={`${violations.length} row(s) cannot sit at a released workflow state`}
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
      )}
      {!readOnly && wordingAdaptations.some((a) => !a.classified) && violations.length === 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="Proposed wording differs from the claim's master wording on some rows"
          description="That is allowed — a channel may adapt wording where the meaning, scope, qualifiers and evidence burden are unchanged. Record the comparison in 'Wording comparison' and who confirmed it; a material change needs a new or revised claim record instead. The word-overlap figure is guidance only, never a decision."
        />
      )}
      <Table
        size="small"
        rowKey={(row) => draft.indexOf(row)}
        dataSource={draft}
        columns={columns}
        pagination={false}
        scroll={{ x: totalWidth }}
        onRow={(row) => {
          const isBlank = isRegisterRowBlank(config, row);
          return isBlank || violationFor(row) ? { style: { background: '#fff1f0' } } : {};
        }}
      />
      {!readOnly && (
        <Button size="small" type="dashed" block icon={<PlusOutlined />} onClick={addRow} style={{ marginTop: 8 }}>
          Add row
        </Button>
      )}
      {!readOnly && (
        <SaveBar
          dirty={dirty}
          onSave={save}
          onDiscard={discard}
          disabled={saveBlocked}
          disabledReason={
            hasBlankRows
              ? 'One or more rows have no data entered — fill in at least one field or remove the row before saving.'
              : contradictory.length > 0
                ? `${contradictory.length} row(s) are declared as containing no product claim while also linking a Claim ID — unlink the claim, or clear the declaration.`
                : `${violations.length} row(s) cannot sit at a released workflow state — see the reasons above.`
          }
        />
      )}
    </Card>
  );
}
