import { useMemo } from 'react';
import { Alert, Button, Card, Checkbox, DatePicker, Input, InputNumber, Popconfirm, Select, Table, Tag, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, LockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { RegisterColumn, RegisterConfig } from '@mbc360/shared/config/registers';
import { isRegisterRowBlank } from '@mbc360/shared/config/registers';
import type { RegisterRow } from '@mbc360/shared/types';
import { unsupportedClaimRows } from '@mbc360/shared/utils/claimEvidence';
import { patchArray, useDraft } from '../hooks/useDraft';
import { createEmptyRegisterRow } from '../store/factory';
import SaveBar from './SaveBar';
import UserSelect from './UserSelect';

// Published_Info_Approval-specific variant of DynamicTable (2026-07-27,
// user-requested): "Claim ID" is picked from Claim -> Evidence Traceability
// instead of typed free text, and linking a claim that is already 'Supported'
// auto-fills + locks "Exact wording / technical statement" to that claim's own
// approved wording — mirrors the Cosmetri raw-material picker's
// auto-fill-and-lock pattern in SupplierRmEvidenceTable.tsx (Supplier is a
// reliable source field, locked; here the approved wording is the reliable
// source, locked the same way). This is what makes the Gate 3 rule ("a claim
// may remain under development, but unsupported wording must not be marked as
// approved") a real hard block in practice.
//
// The picker originally offered 'Supported' claims ONLY; corrected 2026-08-07
// per SME Round 3 (Response2 D2) to offer every claim, so an intended claim
// can be documented while still under development. The rule is enforced at
// RELEASE instead — `unsupportedClaimRows` blocks saving a row at "Approved
// for Release"/"Released" while its claim is not Supported, in the UI and
// authoritatively in the API. Two further D2 changes are NOT done here and
// belong to the claims rework: Claim ID becoming mandatory for any row stating
// a product benefit, and replacing the wording lock with master-approved
// wording held alongside proposed channel wording plus a reviewer equivalence
// check.
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
  // source list and the auto-fill/lock source for exactWording.
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
  // separate mechanism (`unsupportedClaimRows` below, enforced in the API
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
  // A linked claim only drives auto-fill-and-lock of the wording once it is
  // actually 'Supported' — a Pending claim has no approved wording, so locking
  // the cell to its empty value would make the row unusable. (D2 also replaces
  // this lock outright with master-wording vs channel-wording plus a reviewer
  // equivalence check; that is the larger rework, not this correction.)
  const lockedClaimFor = (row: RegisterRow) => {
    const claimId = typeof row.claimId === 'string' ? row.claimId.trim() : '';
    const claim = claimId ? claimById.get(claimId) : undefined;
    return claim?.status === 'Supported' ? claim : undefined;
  };

  const hasBlankRows = draft.some((r) => isRegisterRowBlank(config, r));
  // Gate 3 rule, hard-blocked (2026-07-27): even though a linked row's wording
  // can no longer drift from the approved text (locked above), the CLAIM
  // itself can still be un-supported later on the Claim -> Evidence
  // Traceability page after this row already linked it — this guard catches
  // that case too. The API enforces the same rule authoritatively.
  const claimViolations = unsupportedClaimRows(draft, claimEvidenceRows);
  const saveBlocked = hasBlankRows || claimViolations.length > 0;

  const save = () => {
    if (saveBlocked) return;
    // Resync every linked row's exactWording to the claim's CURRENT approved
    // wording right before saving — covers the edge case where the claim's
    // approvedWording text was edited after this row picked it, so what gets
    // persisted is never stale.
    // Only rows locked to a 'Supported' claim are resynced — a row linked to a
    // still-Pending claim keeps whatever wording its owner typed, since there
    // is no approved text to resync from.
    const resynced = draft.map((row) => {
      const claim = lockedClaimFor(row);
      return claim ? { ...row, exactWording: claim.approvedWording } : row;
    });
    onSave(resynced);
    markSaved();
  };

  const renderGeneric = (column: RegisterColumn, row: RegisterRow, index: number) => {
    const editable = column.editable !== false && !readOnly;
    const value = row[column.key];
    if (!editable) return <span style={{ color: '#666' }}>{value != null ? String(value) : ''}</span>;
    switch (column.type) {
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
      if (col.key === 'claimId') {
        return {
          title: col.label,
          width: col.width ?? 150,
          render: (_: unknown, row: RegisterRow, index: number) => {
            const claimId = String(row.claimId ?? '');
            const isViolation = claimViolations.includes(row);
            return (
              <Tooltip title={isViolation ? "This claim is not 'Supported' — cannot save while linked at a released workflow state" : undefined}>
                <Select
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
                    const claim = value ? claimById.get(value) : undefined;
                    // Auto-fill + lock: only for a 'Supported' claim, which is
                    // the same condition the "Exact wording" cell locks on —
                    // linking a still-Pending claim leaves that cell editable
                    // and does not overwrite what is already there.
                    if (claim?.status === 'Supported') patch(index, 'exactWording', claim.approvedWording);
                  }}
                />
              </Tooltip>
            );
          },
        };
      }
      if (col.key === 'exactWording') {
        return {
          title: col.label,
          width: col.width ?? 220,
          render: (_: unknown, row: RegisterRow, index: number) => {
            const claim = lockedClaimFor(row);
            if (claim) {
              return (
                <Tooltip title="Locked — auto-filled from the linked Claim ID's approved wording. Unlink the claim, or edit the wording on Claim -> Evidence Traceability, to change it.">
                  <span style={{ color: '#666' }}>{String(claim.approvedWording ?? '')}</span>
                </Tooltip>
              );
            }
            return (
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 4 }}
                size="small"
                value={row.exactWording as string | undefined}
                onChange={(e) => patch(index, 'exactWording', e.target.value)}
              />
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
      {!readOnly && claimViolations.length > 0 && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          message={`${claimViolations.length} row(s) reference a claim that is not 'Supported'`}
          description="A claim may remain under development, but unsupported wording must not be marked as approved (Gate 3 rule) — unlink the claim, revert the workflow state, or get the claim to 'Supported' on Claim -> Evidence Traceability first."
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
          const isViolation = claimViolations.includes(row);
          return isBlank || isViolation ? { style: { background: '#fff1f0' } } : {};
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
              : `${claimViolations.length} row(s) reference a claim that is not 'Supported' — cannot save at a released workflow state until the claim is supported.`
          }
        />
      )}
    </Card>
  );
}
