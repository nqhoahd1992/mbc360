import { useMemo } from 'react';
import { Select, Tag } from 'antd';
import { useParams } from 'react-router-dom';
import type { NextAction } from '@mbc360/shared/types';
import { NEXT_ACTION_TERMINAL_STATUSES } from '@mbc360/shared/types';
import { useAppStore } from '../store/useAppStore';

// Rule D3: "A genuine controlled Next Action must be used. A note alone is not
// sufficient." So a flagged watch-list row points at a real Next Action record
// rather than carrying a typed reference, and the picker is what makes that the
// easy path. Modelled on ClaimSelect — same shape, same reason.
//
// Reads the project from the route rather than a prop: this renders from inside
// DynamicTable's generic cell switch, which has no project in scope, and the
// value belongs to the project in the URL either way.

// MUST be a module-level constant. A zustand selector that builds a new array
// (`?? []`) returns a fresh reference every call, so useSyncExternalStore sees a
// changed snapshot on every render and loops until React throws "Maximum update
// depth exceeded" — this exact bug shipped in ClaimSelect/MarketSelect on
// 2026-08-11 and crashed the register pages on first load.
const NO_ACTIONS: NextAction[] = [];

export default function NextActionSelect({
  value,
  onChange,
  disabled,
}: {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const { projectId } = useParams();
  const actions = useAppStore(
    (s) => s.projects.find((p) => p.identity.id === projectId)?.nextActions ?? NO_ACTIONS,
  );

  const options = useMemo(
    () =>
      actions.map((a) => ({
        value: a.id,
        // Searchable text has to be plain, so the label carries the description
        // and the tags ride in `optionRender` below.
        label: `${a.description || '(no description)'} — ${a.gateId} · ${a.status}`,
        action: a,
      })),
    [actions],
  );

  // Never hide a link that is already recorded, even if the action has since been
  // deleted — same principle as the raw-material and claim pickers. Showing it as
  // unresolved is what lets someone fix it; hiding it loses the fact silently.
  const withExisting =
    value && !options.some((o) => o.value === value)
      ? [{ value, label: `${value} — no matching Next Action`, action: undefined }, ...options]
      : options;

  return (
    <Select
      size="small"
      style={{ width: '100%' }}
      showSearch
      allowClear
      disabled={disabled}
      optionFilterProp="label"
      placeholder="No action linked"
      value={value || undefined}
      options={withExisting}
      onChange={(v: string | undefined) => onChange(v ?? '')}
      optionRender={(option) => {
        const action = (option.data as { action?: NextAction }).action;
        if (!action) return <span style={{ color: '#cf1322' }}>{option.label}</span>;
        const open = !NEXT_ACTION_TERMINAL_STATUSES.includes(action.status);
        return (
          <span>
            {action.description || '(no description)'}{' '}
            <Tag>{action.gateId}</Tag>
            <Tag color={action.priority === 'Critical' ? 'red' : undefined}>{action.priority}</Tag>
            {/* Cancelled is called out because it does not count as the controlled
                action D3 requires — see isControlledAction. Picking one leaves the
                gate blocked, so say so at the point of choosing. */}
            <Tag color={action.status === 'Cancelled' ? 'red' : open ? 'blue' : 'default'}>
              {action.status}
              {action.status === 'Cancelled' ? ' — not a controlled action' : ''}
            </Tag>
          </span>
        );
      }}
    />
  );
}
