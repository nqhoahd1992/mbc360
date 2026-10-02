import { useMemo } from 'react';
import { Select, Tag } from 'antd';
import { useParams } from 'react-router-dom';
import type { ClaimLibraryEntry } from '@mbc360/shared/config/referenceData';
import { useAppStore } from '../store/useAppStore';

// Picks an entry of the company Claims Library for a claim row (2026-10-02).
// The column used to be free text that had to hold an internal entry id — one no
// screen displayed — so in practice it could not be filled, and a mistyped id
// silently counted as "not in the library" at Gate 3.
//
// Reads the library from the route's project (`reference.claimsLibrary`, loaded
// with every project) rather than the admin page's store slice, which is only
// fetched when that page opens. Modelled on ClaimSelect / NextActionSelect.

// Module-level constant: a selector returning a fresh `[]` loops forever (see the
// note in NextActionSelect).
const NO_ENTRIES: ClaimLibraryEntry[] = [];

const STATUS_COLOUR: Record<string, string | undefined> = { Approved: 'green', Proposed: 'gold', Withdrawn: 'red' };

export default function ClaimsLibrarySelect({
  value,
  onChange,
  disabled,
  status,
}: {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  status?: 'warning' | 'error';
}) {
  const { projectId } = useParams();
  const entries = useAppStore(
    (s) => s.projects.find((p) => p.identity.id === projectId)?.reference?.claimsLibrary ?? NO_ENTRIES,
  );

  const options = useMemo(
    () =>
      // Approved first: only an Approved entry clears Gate 3's library condition.
      [...entries]
        .sort((a, b) => Number(b.status === 'Approved') - Number(a.status === 'Approved'))
        .map((e) => ({ value: e.id, label: `${e.wording} — ${e.status}`, entry: e })),
    [entries],
  );

  // A link already recorded stays visible even if its entry is gone, so it can
  // be seen and fixed rather than silently cleared.
  const current = String(value ?? '').trim();
  const withExisting =
    current && !options.some((o) => o.value === current)
      ? [{ value: current, label: `${current} — no matching library entry`, entry: undefined }, ...options]
      : options;

  return (
    <Select
      style={{ width: '100%' }}
      showSearch={{ optionFilterProp: 'label' }}
      allowClear
      disabled={disabled}
      status={status}
      popupMatchSelectWidth={false}
      placeholder={entries.length === 0 ? 'The Claims Library is empty' : 'Not linked'}
      notFoundContent="No library entry matches"
      value={current || undefined}
      options={withExisting}
      onChange={(v: string | undefined) => onChange(v ?? '')}
      labelRender={({ value: v }) => {
        const entry = entries.find((e) => e.id === v);
        return entry ? entry.wording : String(v);
      }}
      optionRender={(option) => {
        const entry = (option.data as { entry?: ClaimLibraryEntry }).entry;
        if (!entry) return <span style={{ color: '#cf1322' }}>{option.label}</span>;
        return (
          <span style={{ display: 'flex', alignItems: 'flex-start', gap: 8, maxWidth: 520, whiteSpace: 'normal' }}>
            <span style={{ flex: 1 }}>{entry.wording}</span>
            {/* Proposed and Withdrawn entries can be picked — a claim may reuse
                wording still going through approval — but they do not clear
                Gate 3, and the tag says so at the point of choosing. */}
            <Tag color={STATUS_COLOUR[entry.status]} style={{ marginInlineEnd: 0 }}>
              {entry.status}
              {entry.status !== 'Approved' ? ' — does not clear Gate 3' : ''}
            </Tag>
          </span>
        );
      }}
    />
  );
}
