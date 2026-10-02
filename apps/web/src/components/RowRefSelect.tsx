import { useMemo } from 'react';
import { Select } from 'antd';
import { useParams } from 'react-router-dom';
import type { RegisterColumn } from '@mbc360/shared/config/registers';
import { getRegisterConfig } from '@mbc360/shared/config/registers';
import type { RegisterRow } from '@mbc360/shared/types';
import { useAppStore } from '../store/useAppStore';

// A `rowRef` column (2026-10-02): picks a row of another register in the same
// project by that row's identifying value — e.g. a Label Platform Rollout row
// naming the Released Label Register record (Block A) it rolls out. It used to
// be a text box, so a typo pointed at nothing and nothing said so.
//
// Reads the project from the route, like ClaimSelect: the rows belong to the
// project in the URL, and this renders from DynamicTable's generic cell switch.

// Module-level constant: a selector returning a fresh `[]` loops forever (see the
// note in NextActionSelect).
const NO_ROWS: RegisterRow[] = [];

const text = (v: unknown) => (v == null ? '' : String(v).trim());

export default function RowRefSelect({
  column,
  value,
  onChange,
  disabled,
}: {
  column: RegisterColumn;
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const { projectId } = useParams();
  const rows = useAppStore(
    (s) => (column.refRegister && s.projects.find((p) => p.identity.id === projectId)?.registers[column.refRegister]) || NO_ROWS,
  );
  const target = column.refRegister ? getRegisterConfig(column.refRegister) : undefined;
  const refColumn = column.refColumn ?? '';

  const options = useMemo(() => {
    if (!target) return [];
    // Describe each row by its first other text column, so "R-003" reads as
    // "R-003 — Soothing Balm 50g" rather than a bare id.
    const describe = target.columns.find((c) => c.key !== refColumn && (c.type === 'text' || c.type === 'textarea'));
    const seen = new Set<string>();
    return rows.flatMap((r) => {
      const id = text(r[refColumn]);
      if (!id || seen.has(id)) return [];
      seen.add(id);
      const extra = describe ? text(r[describe.key]) : '';
      return [{ value: id, label: extra ? `${id} — ${extra}` : id }];
    });
  }, [rows, target, refColumn]);

  // A reference already recorded stays visible even if its target is gone or
  // renamed, so it can be seen and fixed rather than silently cleared.
  const current = text(value);
  const withExisting =
    current && !options.some((o) => o.value === current)
      ? [{ value: current, label: `${current} — not in ${target?.title ?? 'the linked register'}` }, ...options]
      : options;

  return (
    <Select
      style={{ width: '100%' }}
      showSearch={{ optionFilterProp: 'label' }}
      allowClear
      disabled={disabled || !target}
      status={current && !options.some((o) => o.value === current) ? 'warning' : undefined}
      popupMatchSelectWidth={false}
      placeholder={!target ? 'Misconfigured reference' : options.length === 0 ? `No ${target.title} record yet` : 'Not linked'}
      notFoundContent={target ? `No ${target.title} record matches` : undefined}
      value={current || undefined}
      options={withExisting}
      onChange={(v: string | undefined) => onChange(v ?? '')}
    />
  );
}
