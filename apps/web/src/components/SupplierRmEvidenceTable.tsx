import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Checkbox, DatePicker, Input, InputNumber, Popconfirm, Select, Table, Tag, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { RegisterColumn, RegisterConfig } from '@mbc360/shared/config/registers';
import { isRegisterRowBlank } from '@mbc360/shared/config/registers';
import type { RegisterRow } from '@mbc360/shared/types';
import { patchArray, useDraft } from '../hooks/useDraft';
import { createEmptyRegisterRow } from '../store/factory';
import { useCosmetriStatus } from '../integrations/useCosmetriStatus';
import { cosmetriListRawMaterials, type CosmetriRawMaterialSummary } from '../integrations/cosmetri';
import SaveBar from './SaveBar';

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
  onSave,
}: {
  config: RegisterConfig;
  rows: RegisterRow[];
  onSave: (rows: RegisterRow[]) => void;
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
  const removeRow = (index: number) => update((prev) => prev.filter((_, i) => i !== index));

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
    const editable = column.editable !== false;
    const value = row[column.key];
    if (!editable) return <span style={{ color: '#666' }}>{value != null ? String(value) : ''}</span>;
    switch (column.type) {
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

  const columns = [
    ...config.columns.map((col) => {
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
    {
      title: '',
      width: 44,
      render: (_: unknown, __: RegisterRow, index: number) => (
        <Popconfirm title="Remove this row?" onConfirm={() => removeRow(index)}>
          <Button size="small" danger type="text" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
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
      {!cosmetriConnected && (
        <p style={{ color: '#d48806', fontSize: 12, marginTop: -4, marginBottom: 12 }}>
          Cosmetri is not connected — raw material picking is disabled; connect it on the Integrations page.
        </p>
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
      <Button size="small" type="dashed" block icon={<PlusOutlined />} onClick={addRow} style={{ marginTop: 8 }}>
        Add row
      </Button>
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
    </Card>
  );
}
