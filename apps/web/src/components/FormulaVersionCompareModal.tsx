import { useEffect, useState } from 'react';
import { Alert, Modal, Select, Space, Switch, Table, Tag, Typography } from 'antd';
import type { BomLine } from '@mbc360/shared/types';
import { diffFormulaBom, type FormulaBomDiffRow, type FormulaBomDiffStatus } from '@mbc360/shared/utils/formulaDiff';
import { TEXT } from '../theme/tokens';

export interface FormulaVersionOption {
  version: string;
  // BOM as it stood at this version. Undefined = no snapshot was captured
  // (history entries created before version snapshots existed).
  bom: BomLine[] | undefined;
}

const STATUS_TAG: Record<FormulaBomDiffStatus, { color: string; label: string }> = {
  added: { color: 'green', label: 'Added' },
  removed: { color: 'red', label: 'Removed' },
  changed: { color: 'gold', label: 'Changed' },
  unchanged: { color: 'default', label: 'Unchanged' },
};

function fmt(v: unknown): string {
  if (v === undefined || v === null || v === '') return '—';
  if (typeof v === 'number') return v.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return String(v);
}

// Renders one field of a diff row: plain value normally, struck-through
// "before" for removed rows, and "before → after" only when that field
// actually differs on a changed row.
function fieldCell(row: FormulaBomDiffRow, field: keyof BomLine) {
  const before = row.before?.[field];
  const after = row.after?.[field];
  if (row.status === 'removed') {
    return <span style={{ color: TEXT.secondary, textDecoration: 'line-through' }}>{fmt(before)}</span>;
  }
  if (row.status === 'added' || row.status === 'unchanged' || before === after) {
    return <span>{fmt(after ?? before)}</span>;
  }
  return (
    <span>
      <span style={{ color: TEXT.secondary, textDecoration: 'line-through' }}>{fmt(before)}</span>{' → '}
      <b>{fmt(after)}</b>
    </span>
  );
}

export default function FormulaVersionCompareModal({
  open,
  onClose,
  options,
  initialFrom,
  initialTo,
}: {
  open: boolean;
  onClose: () => void;
  options: FormulaVersionOption[]; // ordered oldest -> newest
  initialFrom?: string;
  initialTo?: string;
}) {
  const [fromVersion, setFromVersion] = useState<string | undefined>(initialFrom);
  const [toVersion, setToVersion] = useState<string | undefined>(initialTo);
  const [showUnchanged, setShowUnchanged] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFromVersion(initialFrom ?? options[options.length - 2]?.version ?? options[0]?.version);
    setToVersion(initialTo ?? options[options.length - 1]?.version);
    setShowUnchanged(false);
  }, [open, initialFrom, initialTo, options]);

  const fromOption = options.find((o) => o.version === fromVersion);
  const toOption = options.find((o) => o.version === toVersion);

  const missingSnapshot = fromOption && toOption && (fromOption.bom === undefined || toOption.bom === undefined);
  const rows: FormulaBomDiffRow[] =
    fromOption?.bom && toOption?.bom ? diffFormulaBom(fromOption.bom, toOption.bom) : [];
  const visibleRows = showUnchanged ? rows : rows.filter((r) => r.status !== 'unchanged');
  const counts = rows.reduce(
    (acc, r) => ({ ...acc, [r.status]: acc[r.status] + 1 }),
    { added: 0, removed: 0, changed: 0, unchanged: 0 } as Record<FormulaBomDiffStatus, number>,
  );

  return (
    <Modal
      title="Compare formula versions"
      open={open}
      onCancel={onClose}
      footer={null}
      width="min(1200px, 96vw)"
      style={{ top: 24 }}
    >
      <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
        <Space wrap>
          <span>
            From{' '}
            <Select
              style={{ width: 160 }}
              value={fromVersion}
              onChange={setFromVersion}
              options={options.map((o) => ({ value: o.version, label: o.version }))}
            />
          </span>
          <span>
            To{' '}
            <Select
              style={{ width: 160 }}
              value={toVersion}
              onChange={setToVersion}
              options={options.map((o) => ({ value: o.version, label: o.version }))}
            />
          </span>
          <span>
            <Switch checked={showUnchanged} onChange={setShowUnchanged} /> Show unchanged lines
          </span>
        </Space>

        {fromVersion === toVersion && (
          <Alert type="info" showIcon title="Both sides are the same version — no differences to show." />
        )}

        {missingSnapshot && (
          <Alert
            type="warning"
            showIcon
            title="No BOM snapshot available for one of the selected versions"
            description="That version was created before formula-version snapshots existed, so its composition can't be reconstructed for comparison."
          />
        )}

        {!missingSnapshot && fromVersion !== toVersion && (
          <>
            <Space size="small">
              <Tag color="green">{counts.added} added</Tag>
              <Tag color="red">{counts.removed} removed</Tag>
              <Tag color="gold">{counts.changed} changed</Tag>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {counts.unchanged} unchanged
              </Typography.Text>
            </Space>
            <div style={{ minWidth: 0, overflowX: 'auto' }}>
              <Table
                size="small"
                rowKey={(r) => r.key}
                dataSource={visibleRows}
                pagination={false}
                scroll={{ x: 1040, y: 420 }}
                locale={{ emptyText: 'No differences to show.' }}
                columns={[
                  {
                    title: 'Status',
                    width: 100,
                    render: (_, r) => <Tag color={STATUS_TAG[r.status].color}>{STATUS_TAG[r.status].label}</Tag>,
                  },
                  { title: 'RM Code', width: 90, render: (_, r) => r.after?.rmCode ?? r.before?.rmCode },
                  { title: 'Ingredient / INCI', width: 190, render: (_, r) => fieldCell(r, 'inciName') },
                  { title: 'CAS no.', width: 110, render: (_, r) => fieldCell(r, 'casNo') },
                  { title: '% w/w', width: 130, render: (_, r) => fieldCell(r, 'percentWw') },
                  { title: 'Cost / kg', width: 130, render: (_, r) => fieldCell(r, 'costPerKg') },
                  { title: 'Supplier', width: 150, render: (_, r) => fieldCell(r, 'supplier') },
                  { title: 'Function', width: 140, render: (_, r) => fieldCell(r, 'functionRole') },
                ]}
              />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
