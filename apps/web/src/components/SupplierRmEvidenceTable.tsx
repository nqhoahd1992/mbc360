import { useEffect, useMemo, useState } from 'react';
import { Checkbox, Input, Select, Tooltip } from 'antd';
import type { RegisterColumn, RegisterConfig } from '@mbc360/shared/config/registers';
import { RM_EVIDENCE_INCOMPLETE } from '@mbc360/shared/config/registers';
import type { BomLine, RegisterRow } from '@mbc360/shared/types';
import { useCosmetriStatus } from '../integrations/useCosmetriStatus';
import { cosmetriListRawMaterials, type CosmetriRawMaterialSummary } from '../integrations/cosmetri';
import DynamicTable, { type CellApi } from './DynamicTable';

// Supplier_RM_Evidence: the generic register table (DynamicTable, 2026-10-02
// concept) plus this register's own cell rules. `rmCode` is picked from
// Cosmetri's raw-material catalogue instead of typed, mirroring the manual-BOM
// picker in BomCosting.tsx (F14). Cosmetri only supplies identity/supplier for a
// raw material (no INCI/CAS/SDS/CoA/etc.), so only `rmCode`/`grade` (trade name)
// /`supplier` get picker treatment — every other column (the actual evidence)
// stays as the generic table renders it.
//
// Until 2026-10-02 this was a fork of the whole table (its own Table, Add/Delete
// and SaveBar). It now supplies only what differs, through DynamicTable's
// `renderCell` / `saveBlockers` / `removeBlockedReason` hooks.
export default function SupplierRmEvidenceTable({
  config,
  rows,
  bom,
  onSave,
  readOnly,
  readOnlyReason,
  embedded,
}: {
  config: RegisterConfig;
  rows: RegisterRow[];
  // Formula BOM lines that may reference a row here by `rmCode` — a row in use
  // can't be removed (or have its approval revoked) until it's removed from the
  // BOM first. Checked against the committed `project.bom`, since this table's
  // Save cycle is independent from BomCosting's.
  bom: BomLine[];
  onSave: (rows: RegisterRow[]) => void;
  readOnly?: boolean;
  readOnlyReason?: string;
  embedded?: boolean;
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

  const rmCodesInBom = useMemo(() => new Set(bom.map((l) => l.rmCode).filter(Boolean)), [bom]);
  const inUse = (row: RegisterRow) => !!row.rmCode && rmCodesInBom.has(String(row.rmCode));

  // Same format Cosmetri's own UI uses for a raw material, and identical to
  // BomCosting's `rawMaterialLabel` so a picked value reads the same in both.
  const rawMaterialLabel = (r: CosmetriRawMaterialSummary) =>
    `${r.tradeName} | ${r.code}${r.qualityStatus !== 'Approved' ? ` (${r.qualityStatus})` : ''}`;
  const rawMaterialOptions = useMemo(
    () => rawMaterials.map((r) => ({ value: `RM-${r.id}`, label: rawMaterialLabel(r) })),
    [rawMaterials],
  );
  const rawMaterialById = useMemo(() => new Map(rawMaterials.map((r) => [`RM-${r.id}`, r])), [rawMaterials]);
  const matchedRawMaterial = (row: RegisterRow) => rawMaterialById.get(String(row.rmCode ?? ''));

  // Two rows pointing at the same Cosmetri raw material is always a mistake.
  // Rows with no rmCode picked yet are NOT blocked (unlike the BOM): a
  // partially-filled evidence row is normal while gathering documents.
  const duplicateCodes = (draft: RegisterRow[]) => {
    const counts = new Map<string, number>();
    for (const r of draft) {
      const code = String(r.rmCode ?? '');
      if (code) counts.set(code, (counts.get(code) ?? 0) + 1);
    }
    return new Set([...counts].filter(([, n]) => n > 1).map(([code]) => code));
  };
  const renderCell = (column: RegisterColumn, row: RegisterRow, _index: number, api: CellApi): React.ReactNode | undefined => {
    if (api.readOnly) return undefined;
    switch (column.key) {
      case 'rmCode': {
        const code = String(row.rmCode ?? '');
        const duplicates = duplicateCodes(api.draft);
        return (
          <Select
            style={{ width: '100%' }}
            showSearch
            allowClear
            status={code && duplicates.has(code) ? 'error' : undefined}
            loading={loadingRawMaterials}
            disabled={!cosmetriConnected}
            placeholder={cosmetriConnected ? 'Search raw material…' : 'Connect Cosmetri in Integrations first'}
            value={code || undefined}
            optionFilterProp="label"
            options={
              // Keep the row's current value visible even if it isn't in the
              // fetched catalogue — never silently blank existing data.
              code && !rawMaterialById.has(code)
                ? [{ value: code, label: `${row.grade || code} — not in the current Cosmetri catalogue` }, ...rawMaterialOptions]
                : rawMaterialOptions
            }
            onChange={(value: string | undefined) => {
              const match = value ? rawMaterialById.get(value) : undefined;
              // Supplier is a real field Cosmetri's raw-material API supplies —
              // safe to set. INCI is NOT (the endpoint has no INCI field), so it
              // only ever gets a placeholder hint, never a stored value.
              api.patchRow({
                rmCode: value ?? '',
                grade: match ? `${match.tradeName} | ${match.code}` : undefined,
                ...(match ? { supplier: match.supplierName } : {}),
              });
            }}
          />
        );
      }
      case 'grade':
      case 'supplier': {
        const match = matchedRawMaterial(row);
        if (!match) return undefined;
        return (
          <Tooltip title="From Cosmetri — read-only">
            <span className="rt-static">{column.key === 'supplier' ? match.supplierName : String(row.grade ?? '')}</span>
          </Tooltip>
        );
      }
      case 'inciName':
        return (
          <Input
            value={row.inciName as string | undefined}
            // The trade name is only ever a grey hint, never auto-filled, so the
            // user always types the real INCI (same treatment as BomCosting).
            placeholder={matchedRawMaterial(row)?.tradeName}
            onChange={(e) => api.patch('inciName', e.target.value)}
          />
        );
      case 'approvedForUse': {
        // Same "remove it from the BOM first" rule as row deletion, applied to
        // revoking approval: only the true → false transition on an in-use
        // material is blocked.
        const blocked = !!row.approvedForUse && inUse(row);
        return (
          <Tooltip title={blocked ? 'In use on the Formula BOM — remove it there first before revoking approval' : undefined}>
            <Checkbox
              checked={!!row.approvedForUse}
              disabled={blocked}
              onChange={(e) => {
                if (blocked && !e.target.checked) return; // defence in depth
                // D4: all three evidence statuses describe an UNapproved row, so
                // approving clears it and un-approving puts the row back to
                // "Incomplete — evidence review required" — both halves of one
                // deliberate action (`rmEvidenceContradictions` rejects the
                // contradictory state at the API anyway).
                api.patchRow({
                  approvedForUse: e.target.checked,
                  evidenceStatus: e.target.checked ? '' : RM_EVIDENCE_INCOMPLETE,
                });
              }}
            />
          </Tooltip>
        );
      }
      case 'evidenceStatus':
        // The other half of the pair above: an approved row has no evidence
        // disposition to set, so the cell says so.
        return row.approvedForUse === true ? (
          <span className="rt-muted" style={{ fontSize: 12 }}>approved for use — no outstanding review</span>
        ) : undefined;
      default:
        return undefined;
    }
  };

  return (
    <DynamicTable
      config={config}
      rows={rows}
      onSave={onSave}
      readOnly={readOnly}
      readOnlyReason={readOnlyReason}
      embedded={embedded}
      renderCell={renderCell}
      identityText={(row) => String(row.grade || row.rmCode || '').trim()}
      subtitleText={(row) => [row.inciName, row.supplier].map((v) => String(v ?? '').trim()).filter(Boolean).join(' · ')}
      removeBlockedReason={(row) => (inUse(row) ? 'In use on the Formula BOM — remove it there first' : undefined)}
      rowHasError={(row, draft) => !!row.rmCode && duplicateCodes(draft).has(String(row.rmCode))}
      saveBlockers={(draft) =>
        duplicateCodes(draft).size > 0
          ? ['Two or more rows point at the same Cosmetri raw material — merge them into one row before saving.']
          : []
      }
      notices={() =>
        !readOnly && !cosmetriConnected ? (
          <p className="rt-notice">Cosmetri is not connected — raw material picking is disabled; connect it on the Integrations page.</p>
        ) : null
      }
    />
  );
}
