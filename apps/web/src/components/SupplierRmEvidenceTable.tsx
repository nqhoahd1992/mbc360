import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Checkbox, DatePicker, Input, InputNumber, Popconfirm, Select, Table, Tag, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, LockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { RegisterColumn, RegisterConfig } from '@mbc360/shared/config/registers';
import { isRegisterRowBlank } from '@mbc360/shared/config/registers';
import type { BomLine, RegisterRow } from '@mbc360/shared/types';
import { patchArray, useDraft } from '../hooks/useDraft';
import { createEmptyRegisterRow } from '../store/factory';
import { useCosmetriStatus } from '../integrations/useCosmetriStatus';
import { cosmetriListRawMaterials, type CosmetriRawMaterialSummary } from '../integrations/cosmetri';
import SaveBar from './SaveBar';
import UserSelect from './UserSelect';
import MarketSelect from './MarketSelect';

// Supplier_RM_Evidence-specific variant of DynamicTable: `rmCode` is picked
// from Cosmetri's raw-material catalogue instead of typed free text, mirroring
// the manual-BOM-line picker in BomCosting.tsx (F14). Cosmetri only supplies
// identity/supplier for a raw material (no INCI/CAS/SDS/CoA/etc.), so only
// `rmCode`/`grade` (trade name)/`supplier` get picker treatment — every other
// column (the actual evidence: SDS/CoA/TDS/allergen/impurity/...) stays exactly
// as free-text as the generic DynamicTable already renders it.
export default function SupplierRmEvidenceTable({
  config,
  rows,
  bom,
  onSave,
  // Gate-level edit lock (2026-07-23): read-only once every gate this register
  // is tied to has passed (Gate 04, here). Static cells, no picker/Add/Delete/
  // Save — correcting a passed gate's evidence requires Backtrack.
  readOnly,
  readOnlyReason,
}: {
  config: RegisterConfig;
  rows: RegisterRow[];
  // Formula BOM lines that may reference a row here by `rmCode` — a row in
  // use can't be removed until it's removed from the BOM first (see
  // `removeRow` below).
  bom: BomLine[];
  onSave: (rows: RegisterRow[]) => void;
  readOnly?: boolean;
  readOnlyReason?: string;
}) {
  const cosmetriConnected = useCosmetriStatus().status.connected;
  const [rawMaterials, setRawMaterials] = useState<CosmetriRawMaterialSummary[]>([]);
  const [loadingRawMaterials, setLoadingRawMaterials] = useState(false);
  useEffect(() => {
    if (!cosmetriConnected) {
      setRawMaterials([]);
      return;
    }
    setLoadingRawMaterials(true);
    cosmetriListRawMaterials()
      .then(setRawMaterials)
      .catch(() => setRawMaterials([]))
      .finally(() => setLoadingRawMaterials(false));
  }, [cosmetriConnected]);

  const { draft, dirty, update, markSaved, discard } = useDraft(rows);
  const patch = (index: number, key: string, value: string | number | boolean | undefined) =>
    update((prev) => patchArray(prev, index, { [key]: value } as Partial<RegisterRow>));
  const addRow = () => update((prev) => [...prev, createEmptyRegisterRow(config.key)]);

  // A row still referenced by a Formula BOM line can't be removed — deleting
  // it out from under the BOM would silently orphan that line's raw-material
  // identity (and, since 2026-07-23, drop it out of the approved-for-use
  // picker entirely, which would then block the BOM's own Save). Delete the
  // BOM line first, then the evidence row. Checked against the committed
  // `project.bom` (this table's own Save cycle is independent from BomCosting's).
  const rmCodesInBom = new Set(bom.map((l) => l.rmCode).filter(Boolean));
  const removeRow = (index: number) => {
    const code = String(draft[index]?.rmCode ?? '');
    // Defense in depth — the Delete button is already disabled for this case
    // (see the column below), but never remove a row still in use even if
    // that's somehow bypassed.
    if (code && rmCodesInBom.has(code)) return;
    update((prev) => prev.filter((_, i) => i !== index));
  };

  // Same format Cosmetri's own UI uses for a raw material, and identical to
  // BomCosting's `rawMaterialLabel` so a picked value reads the same way in
  // both places.
  const rawMaterialLabel = (r: CosmetriRawMaterialSummary) =>
    `${r.tradeName} | ${r.code}${r.qualityStatus !== 'Approved' ? ` (${r.qualityStatus})` : ''}`;
  const rawMaterialOptions = useMemo(
    () => rawMaterials.map((r) => ({ value: `RM-${r.id}`, label: rawMaterialLabel(r) })),
    [rawMaterials],
  );
  const rawMaterialById = useMemo(() => new Map(rawMaterials.map((r) => [`RM-${r.id}`, r])), [rawMaterials]);
  const matchedRawMaterial = (row: RegisterRow) => rawMaterialById.get(String(row.rmCode ?? ''));

  // Two rows pointing at the same Cosmetri raw material is always a mistake —
  // same duplicate guard as the BOM picker, but rows with no rmCode picked yet
  // are NOT blocked here (unlike BOM): a partially-filled evidence row is
  // normal while gathering documents, whereas every BOM line must resolve to
  // a real material since costing/composition depends on it.
  const duplicateRmCodes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of draft) {
      const code = String(r.rmCode ?? '');
      if (!code) continue;
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
    for (const [code, count] of counts) if (count < 2) counts.delete(code);
    return counts;
  }, [draft]);
  const hasDuplicates = duplicateRmCodes.size > 0;
  const hasBlankRows = draft.some((r) => isRegisterRowBlank(config, r));
  const saveBlocked = hasDuplicates || hasBlankRows;

  const save = () => {
    if (saveBlocked) return;
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
      case 'checkbox': {
        // Same "remove it from the BOM first" rule as row deletion above,
        // applied to revoking approval instead of deleting the row outright:
        // can't uncheck `approvedForUse` on a material the Formula BOM still
        // references (checking it back on is always fine — only the
        // true → false transition on an in-use material is blocked). This is
        // the only checkbox column on this register, so scoping by
        // `column.key` rather than hard-coding a separate render path keeps
        // `renderGeneric` reusable if that ever changes.
        const code = String(row.rmCode ?? '');
        const blockedFromUnchecking =
          column.key === 'approvedForUse' && !!value && !!code && rmCodesInBom.has(code);
        return (
          <Tooltip
            title={
              blockedFromUnchecking
                ? 'In use on the Formula BOM — remove it there first before revoking approval'
                : undefined
            }
          >
            <Checkbox
              checked={!!value}
              disabled={blockedFromUnchecking}
              onChange={(e) => {
                // Defense in depth — the checkbox is already disabled for
                // this case, but never silently revoke approval on an in-use
                // material even if that's somehow bypassed.
                if (blockedFromUnchecking && !e.target.checked) return;
                patch(index, column.key, e.target.checked);
              }}
            />
          </Tooltip>
        );
      }
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
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            value={value as number | undefined}
            onChange={(v) => patch(index, column.key, v ?? 0)}
          />
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
        return (
          <Input size="small" value={value as string | undefined} onChange={(e) => patch(index, column.key, e.target.value)} />
        );
    }
  };

  // Static (read-only) cell for a locked gate — no inputs, no picker.
  const staticCell = (column: RegisterColumn, row: RegisterRow) => {
    const value = row[column.key];
    if (column.type === 'checkbox') return <Checkbox checked={!!value} disabled />;
    return <span style={{ color: '#666' }}>{value != null ? String(value) : ''}</span>;
  };

  const columns = [
    ...config.columns.map((col) => {
      if (readOnly) {
        return { title: col.label, width: col.key === 'rmCode' ? 260 : col.width ?? 140, render: (_: unknown, row: RegisterRow) => staticCell(col, row) };
      }
      if (col.key === 'rmCode') {
        return {
          title: col.label,
          width: 260,
          render: (_: unknown, row: RegisterRow, index: number) => {
            const code = String(row.rmCode ?? '');
            const isDuplicate = !!code && duplicateRmCodes.has(code);
            return (
              <Select
                size="small"
                style={{ width: '100%' }}
                showSearch
                allowClear
                status={isDuplicate ? 'error' : undefined}
                loading={loadingRawMaterials}
                disabled={!cosmetriConnected}
                placeholder={cosmetriConnected ? 'Search raw material…' : 'Connect Cosmetri in Integrations first'}
                value={code || undefined}
                optionFilterProp="label"
                options={
                  // Keep the row's current value visible even if it isn't in
                  // the fetched catalogue — never silently blank existing data.
                  code && !rawMaterialById.has(code)
                    ? [
                        { value: code, label: `${row.grade || code} — not in the current Cosmetri catalogue` },
                        ...rawMaterialOptions,
                      ]
                    : rawMaterialOptions
                }
                onChange={(value: string | undefined) => {
                  const match = value ? rawMaterialById.get(value) : undefined;
                  patch(index, 'rmCode', value ?? '');
                  patch(index, 'grade', match ? `${match.tradeName} | ${match.code}` : undefined);
                  // Supplier is a real field Cosmetri's raw-material API
                  // supplies — safe to set as an actual value. INCI is NOT:
                  // the raw-material endpoint has no INCI field at all, so
                  // that column only ever gets a placeholder hint, never a
                  // stored value (see below).
                  if (match) patch(index, 'supplier', match.supplierName);
                }}
              />
            );
          },
        };
      }
      if (col.key === 'grade') {
        return {
          title: col.label,
          width: col.width ?? 140,
          render: (_: unknown, row: RegisterRow, index: number) => {
            const match = matchedRawMaterial(row);
            return match ? (
              <Tooltip title="From Cosmetri — read-only">
                <span style={{ color: '#666' }}>{String(row.grade ?? '')}</span>
              </Tooltip>
            ) : (
              <Input
                size="small"
                value={row.grade as string | undefined}
                onChange={(e) => patch(index, 'grade', e.target.value)}
              />
            );
          },
        };
      }
      if (col.key === 'supplier') {
        return {
          title: col.label,
          width: col.width ?? 140,
          render: (_: unknown, row: RegisterRow, index: number) => {
            const match = matchedRawMaterial(row);
            return match ? (
              <Tooltip title="From Cosmetri — read-only">
                <span style={{ color: '#666' }}>{match.supplierName}</span>
              </Tooltip>
            ) : (
              <Input
                size="small"
                value={row.supplier as string | undefined}
                onChange={(e) => patch(index, 'supplier', e.target.value)}
              />
            );
          },
        };
      }
      if (col.key === 'inciName') {
        return {
          title: col.label,
          width: col.width ?? 180,
          render: (_: unknown, row: RegisterRow, index: number) => (
            <Input
              size="small"
              value={row.inciName as string | undefined}
              // Cosmetri's raw-material API has no INCI field — the trade
              // name is only ever a grey hint, never auto-filled, so the user
              // always types the real INCI (same treatment as BomCosting).
              placeholder={matchedRawMaterial(row)?.tradeName}
              onChange={(e) => patch(index, 'inciName', e.target.value)}
            />
          ),
        };
      }
      return {
        title: col.label,
        width: col.width ?? 140,
        render: (_: unknown, row: RegisterRow, index: number) => renderGeneric(col, row, index),
      };
    }),
    ...(readOnly ? [] : [{
      title: '',
      width: 44,
      render: (_: unknown, row: RegisterRow, index: number) => {
        const inUse = !!row.rmCode && rmCodesInBom.has(String(row.rmCode));
        return (
          // A disabled antd Button's root DOM node is a genuine `disabled`
          // <button>, which doesn't fire the hover events Tooltip listens
          // for — unlike Checkbox (its disabled state only disables the
          // inner <input>, so the wrapper span the Tooltip below hovers on
          // stays "live"). Wrapping in a plain <span> gives Tooltip a
          // non-disabled hover target, the standard antd workaround (see
          // Tooltip's own FAQ: "child doesn't trigger hover when disabled").
          <Tooltip title={inUse ? 'In use on the Formula BOM — remove it there first' : undefined}>
            <span>
              <Popconfirm title="Remove this row?" onConfirm={() => removeRow(index)} disabled={inUse}>
                <Button size="small" danger type="text" icon={<DeleteOutlined />} disabled={inUse} />
              </Popconfirm>
            </span>
          </Tooltip>
        );
      },
    }]),
  ];

  const totalWidth = config.columns.reduce((sum, c) => sum + (c.key === 'rmCode' ? 260 : c.width ?? 140), 0) + 44;

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
      {readOnly ? (
        <Alert
          type="info"
          showIcon
          icon={<LockOutlined />}
          style={{ marginBottom: 12 }}
          message="Read-only — gate passed"
          description={readOnlyReason ?? 'This evidence belongs to a gate that has already passed. To correct it, Backtrack to reopen that gate first.'}
        />
      ) : (
        !cosmetriConnected && (
          <p style={{ color: '#d48806', fontSize: 12, marginTop: -4, marginBottom: 12 }}>
            Cosmetri is not connected — raw material picking is disabled; connect it on the Integrations page.
          </p>
        )
      )}
      <Table
        size="small"
        rowKey={(row) => draft.indexOf(row)}
        dataSource={draft}
        columns={columns}
        pagination={false}
        scroll={{ x: totalWidth }}
        onRow={(row) => {
          const code = String(row.rmCode ?? '');
          const isDuplicate = !!code && duplicateRmCodes.has(code);
          const isBlank = isRegisterRowBlank(config, row);
          return isDuplicate || isBlank ? { style: { background: '#fff1f0' } } : {};
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
            hasDuplicates
              ? 'Two or more rows point at the same Cosmetri raw material — merge them into one row before saving.'
              : 'One or more rows have no data entered — fill in at least one field or remove the row before saving.'
          }
        />
      )}
    </Card>
  );
}
