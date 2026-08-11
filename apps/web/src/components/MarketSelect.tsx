import { Input, Select, Tag } from 'antd';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

// Every "which market" field in a project picks from THAT project's own markets
// (ProjectIdentity.markets, chosen once on the Create New Project form and shown
// as the workbook's own "Countries / Markets" parameter) instead of being typed
// (2026-08-11, user-requested). Typing meant "Vietnam", "VN" and "vietnam" were
// three different markets to the system, and a row could name a market the
// project does not sell into at all.
//
// The list is read here rather than threaded through as a prop because these
// tables are rendered from 25 call sites across 7 pages, and the value is a
// property of the project in the URL either way. If no project resolves — a
// context we do not have today — it degrades to a plain text input rather than
// showing an empty dropdown nobody can get past.
function useProjectMarkets(): string[] {
  const { projectId } = useParams();
  return useAppStore((s) => s.projects.find((p) => p.identity.id === projectId)?.identity.markets ?? []);
}

export default function MarketSelect({
  value,
  onChange,
  disabled,
  multiple,
}: {
  value?: string;
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
  // "Markets affected" style columns hold several. Stored as a comma-joined
  // string, which is what those columns already contained as free text.
  multiple?: boolean;
}) {
  const markets = useProjectMarkets();

  if (markets.length === 0) {
    return (
      <Input
        size="small"
        value={value}
        disabled={disabled}
        placeholder="Market"
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  const selected = multiple
    ? (value ?? '')
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean)
    : value
      ? [value]
      : [];
  // A value recorded before this became a picker, or a market since removed from
  // the project, stays visible and selected instead of being silently dropped.
  const unknown = selected.filter((m) => !markets.includes(m));
  const options: { value: string; label: string; unknown: boolean }[] = [
    ...markets.map((m) => ({ value: m, label: m, unknown: false })),
    ...unknown.map((m) => ({ value: m, label: m, unknown: true })),
  ];

  return (
    <Select
      size="small"
      allowClear
      showSearch
      mode={multiple ? 'multiple' : undefined}
      disabled={disabled}
      placeholder="Select market"
      style={{ width: '100%', minWidth: 110 }}
      value={multiple ? selected : value || undefined}
      options={options}
      onChange={(v: string | string[] | undefined) =>
        onChange(Array.isArray(v) ? (v.length > 0 ? v.join(', ') : undefined) : v)
      }
      optionRender={(option) => (
        <span>
          {option.data.value}
          {option.data.unknown && <Tag style={{ marginLeft: 6 }}>not one of this project's markets</Tag>}
        </span>
      )}
    />
  );
}
