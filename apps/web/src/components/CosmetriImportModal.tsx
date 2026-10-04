import { useEffect, useState } from 'react';
import { Alert, Button, Select, Spin, Table, Tag, Typography, message } from 'antd';
import { CloudDownloadOutlined, ExportOutlined } from '@ant-design/icons';
import {
  cosmetriGetFormulaImport,
  cosmetriListFormulas,
  type CosmetriFormulaSummary,
  type CosmetriImportRow,
} from '../integrations/cosmetri';
import { matchIngredientWatchLists } from '@mbc360/shared/utils/ingredientWatch';
import { useAppStore } from '../store/useAppStore';

import FormDrawer from './FormDrawer';
// Imports a Formula BOM from Cosmetri (decision A3 — Cosmetri is the read-only
// master data source; MBc360 stores only project-specific evidence and links).
export default function CosmetriImportModal({
  projectId,
  open,
  onClose,
  onImported,
  hasExistingBom,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
  // Called right after the import commits, so the caller can drop any
  // pending local Formula BOM draft/edits — otherwise a draft's own
  // unsaved-changes guard (see useDraft.ts) keeps showing stale rows and
  // clicking "Save" would silently undo the import.
  onImported?: () => void;
  hasExistingBom: boolean;
}) {
  const importCosmetriBom = useAppStore((s) => s.importCosmetriBom);
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const powerAppsUrl = useAppStore((s) => s.integrations.powerApps.newRawMaterialUrl);

  const [formulas, setFormulas] = useState<CosmetriFormulaSummary[]>([]);
  const [loadingFormulas, setLoadingFormulas] = useState(false);
  const [selectedId, setSelectedId] = useState<number | undefined>();
  const [rows, setRows] = useState<CosmetriImportRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedId(undefined);
    setRows([]);
    setLoadingFormulas(true);
    cosmetriListFormulas()
      .then(setFormulas)
      .catch((err) => message.error(err instanceof Error ? err.message : 'Failed to list formulas.'))
      .finally(() => setLoadingFormulas(false));
  }, [open]);

  useEffect(() => {
    if (!selectedId) {
      setRows([]);
      return;
    }
    setLoadingRows(true);
    cosmetriGetFormulaImport(selectedId)
      .then(setRows)
      .catch((err) => message.error(err instanceof Error ? err.message : 'Failed to load formula.'))
      .finally(() => setLoadingRows(false));
  }, [selectedId]);

  const totalPercent = rows.reduce((sum, r) => sum + r.percentWw, 0);

  const [importing, setImporting] = useState(false);

  // The server reads the formula from Cosmetri itself and writes the lines, plus
  // an identity-only Supplier & RM Evidence row for any material that has none
  // (F1/C7 Gate 4 traceability) — one transaction. Doing it here would let any
  // client mark a manual line "from Cosmetri" (SME rule audit A1).
  const onImport = async () => {
    if (!selectedId) return;
    const knownBefore = new Set((project?.registers['supplierRmEvidence'] ?? []).map((r) => String(r.rmCode ?? '')));
    setImporting(true);
    const ok = await importCosmetriBom(projectId, selectedId);
    setImporting(false);
    if (!ok) return;
    const after = useAppStore.getState().projects.find((p) => p.identity.id === projectId);
    const added = (after?.registers['supplierRmEvidence'] ?? []).filter(
      (r) => !knownBefore.has(String(r.rmCode ?? '')),
    ).length;
    onImported?.();
    message.success(
      `Imported ${after?.bom.length ?? rows.length} BOM lines from Cosmetri` +
        (added > 0 ? ` and added ${added} new Supplier & RM Evidence record${added > 1 ? 's' : ''}` : '') +
        '.',
    );
    onClose();
  };

  const isPlaceholderUrl = powerAppsUrl.includes('REPLACE-');

  return (
    <FormDrawer
      title={
        <span>
          <CloudDownloadOutlined style={{ marginRight: 8 }} />
          Import Formula BOM from Cosmetri
        </span>
      }
      open={open}
      onCancel={onClose}
      width={860}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="import" type="primary" disabled={rows.length === 0} loading={importing} onClick={onImport}>
          Import {rows.length > 0 ? `${rows.length} lines` : ''}
        </Button>,
      ]}
    >
      <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
        Composition, supplier names and INCI/CAS identity come read-only from Cosmetri
        (formula + raw-material + compliance endpoints). Costs and function/role stay
        MBc360-side entries. Any imported material without a Supplier &amp; RM Evidence
        record yet gets one created automatically (identity fields only — SDS/CoA/
        allergen/etc. still need to be added there).
      </Typography.Paragraph>

      {hasExistingBom && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          title="Importing replaces the current Formula BOM lines of this project."
        />
      )}

      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 4, fontWeight: 600 }}>Cosmetri formula</div>
        <Select
          style={{ width: '100%' }}
          placeholder={loadingFormulas ? 'Loading formulas…' : 'Select a formula'}
          loading={loadingFormulas}
          value={selectedId}
          onChange={setSelectedId}
          options={formulas.map((f) => ({
            value: f.id,
            label: [f.reference, f.version && `v${f.version}`, f.productTitle, f.status && `(${f.status})`]
              .filter(Boolean)
              .join(' · '),
          }))}
        />
      </div>

      {loadingRows ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      ) : (
        rows.length > 0 && (
          <Table
            size="small"
            rowKey={(r) => r.rmId}
            dataSource={rows}
            pagination={false}
            scroll={{ x: 760 }}
            columns={[
              { title: 'Code', width: 90, render: (_, r) => r.code || `RM-${r.rmId}` },
              { title: 'Trade name', width: 170, dataIndex: 'tradeName' },
              { title: 'INCI', width: 200, dataIndex: 'inciName' },
              { title: 'CAS no.', width: 110, dataIndex: 'casNo' },
              { title: '% w/w', width: 80, dataIndex: 'percentWw' },
              { title: 'Supplier', width: 140, dataIndex: 'supplierName' },
              {
                title: 'Screen',
                width: 180,
                render: (_, r) => {
                  const hits = matchIngredientWatchLists(r.inciName, r.casNo);
                  if (r.qualityStatus !== 'Approved') {
                    return <Tag color="orange">Cosmetri: {r.qualityStatus}</Tag>;
                  }
                  if (hits.length === 0) return <Tag color="green">Clear</Tag>;
                  return hits.map((h) => (
                    <Tag key={`${h.kind}-${h.group}`} color={h.kind === 'prohibited' ? 'red' : 'orange'}>
                      {h.kind === 'prohibited' ? 'Prohibited' : 'PB caution'}
                      {h.matchedBy === 'cas' ? ' (CAS)' : ''}
                    </Tag>
                  ));
                },
              },
            ]}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={4}>
                  <b>Total</b>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <b>{Math.round(totalPercent * 100) / 100}%</b>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} colSpan={2} />
              </Table.Summary.Row>
            )}
          />
        )
      )}

      <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}>
        Raw material not in Cosmetri yet? Raise a <b>Create new raw material</b> change request in
        Power Apps (request → approval → entered in Cosmetri → available here).{' '}
        <Button
          size="small"
          type="link"
          icon={<ExportOutlined />}
          href={powerAppsUrl}
          target="_blank"
          disabled={isPlaceholderUrl}
          style={{ padding: 0 }}
        >
          Open request app{isPlaceholderUrl ? ' (URL not configured)' : ''}
        </Button>
      </Typography.Paragraph>
    </FormDrawer>
  );
}
