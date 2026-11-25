import { useMemo } from 'react';
import { Select, Tag } from 'antd';
import { useParams } from 'react-router-dom';
import type { RestrictedCautionEntry } from '@mbc360/shared/types';
import { restrictedCautionLinkOf, restrictedCautionMatches } from '@mbc360/shared/utils/restrictedCaution';
import { useAppStore } from '../store/useAppStore';
import { useRestrictedCautionEntries } from '../hooks/restrictedCautionEntries';
import ReferenceSource from './ReferenceSource';

// Picks the entry of the company's restricted and caution list a General Restricted & Caution Assessment row was assessed against (SW-59,
// 2026-11-23). The stored value is the entry's id. Only approved, current entries are offered; the ones the project's formula actually matches
// come first, since each of those needs a row. There is no "not on the list" choice: an ingredient the list does not hold is proposed there first.
// Modelled on ClaimsLibrarySelect.

const KIND_COLOUR: Record<string, string | undefined> = { Prohibited: 'red', Restricted: 'orange', Caution: 'gold' };

export default function RestrictedCautionSelect({
  hideSource,
  value,
  onChange,
  disabled,
  status,
}: {
  // Leave out the "taken from" line under the picker where space is tight (a table cell).
  hideSource?: boolean;
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  status?: 'warning' | 'error';
}) {
  const { projectId } = useParams();
  const entries = useRestrictedCautionEntries();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const inFormula = useMemo(() => new Set(project ? restrictedCautionMatches(project).map((m) => m.entry.id) : []), [project]);

  const current = restrictedCautionLinkOf({ restrictedCautionId: value });
  const options = useMemo(() => {
    const ordered = [...entries].sort((a, b) => Number(inFormula.has(b.id)) - Number(inFormula.has(a.id)) || a.ingredient.localeCompare(b.ingredient));
    const base: { value: string; label: string; entry?: RestrictedCautionEntry }[] = [
      ...ordered.map((e) => ({ value: e.id, label: `${e.ingredient} — ${e.kind}`, entry: e })),
    ];
    // A link already recorded stays visible even when its entry is no longer approved and current, so it can be seen and fixed.
    return current && !base.some((o) => o.value === current) ? [{ value: current, label: `${current} — no longer approved and current` }, ...base] : base;
  }, [entries, inFormula, current]);

  const select = (
    <Select
      style={{ width: '100%' }}
      showSearch={{ optionFilterProp: 'label' }}
      disabled={disabled}
      status={status}
      popupMatchSelectWidth={false}
      placeholder={entries.length === 0 ? 'The company list has no approved entry yet' : 'Choose an entry'}
      notFoundContent="No approved entry matches"
      value={current || undefined}
      options={options}
      onChange={(v: string) => onChange(v)}
      labelRender={({ value: v }) => {
        const entry = entries.find((e) => e.id === v);
        return entry ? entry.ingredient : String(v);
      }}
      optionRender={(option) => {
        const entry = (option.data as { entry?: RestrictedCautionEntry }).entry;
        if (!entry) return <span style={{ color: '#cf1322' }}>{option.label}</span>;
        return (
          <span style={{ display: 'flex', alignItems: 'flex-start', gap: 8, maxWidth: 520, whiteSpace: 'normal' }}>
            <span style={{ flex: 1 }}>
              {entry.ingredient}
              {entry.casNo ? <span style={{ opacity: 0.6 }}> · {entry.casNo}</span> : null}
            </span>
            {inFormula.has(entry.id) && <Tag style={{ marginInlineEnd: 0 }}>In this formula</Tag>}
            <Tag color={KIND_COLOUR[entry.kind]} style={{ marginInlineEnd: 0 }}>
              {entry.kind}
            </Tag>
          </span>
        );
      }}
    />
  );
  return (
    <>
      {select}
      {!hideSource && <ReferenceSource kind="restrictedCaution" />}
    </>
  );
}
