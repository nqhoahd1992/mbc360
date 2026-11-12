import { Select, Tag } from 'antd';
import { useParams } from 'react-router-dom';
import type { ChangeRecord } from '@mbc360/shared/types';
import { resolveChangeRef } from '@mbc360/shared/utils/changeLinks';
import { useAppStore } from '../store/useAppStore';

// Picks a change record of this project from the Change Control log (Round 5 question 11(4)). A register used to hold a typed Change ID, so a typo or
// another project's number satisfied it and nothing checked that it existed. The value stored is the change's own number; an FC- number an older book
// used for the same change still resolves (it is the change's alias).
//
// A value the register already holds that matches no change stays visible and is flagged — "Preserve imported text and flag unresolved legacy
// references rather than discarding them" — never silently cleared. Reads the project from the route, like ClaimSelect.
const NO_CHANGES: ChangeRecord[] = [];

export default function ChangeRefSelect({
  value,
  onChange,
  disabled,
}: {
  value?: string;
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
}) {
  const { projectId } = useParams();
  const changes = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId)?.changes ?? NO_CHANGES);
  const current = String(value ?? '').trim();
  const resolved = current === '' ? undefined : resolveChangeRef(changes, current);
  const options = [
    ...changes.map((c) => ({
      value: c.changeId,
      label: c.trigger ? `${c.changeId} — ${c.trigger}` : c.changeId,
      status: c.status,
    })),
    ...(current && !resolved ? [{ value: current, label: current, status: 'not in the Change Control log' }] : []),
  ];
  return (
    <Select
      allowClear
      showSearch
      disabled={disabled}
      status={current && !resolved ? 'warning' : undefined}
      placeholder={changes.length > 0 ? 'Link a change' : 'No changes recorded yet'}
      style={{ width: '100%', minWidth: 140 }}
      value={current || undefined}
      options={options}
      optionFilterProp="label"
      onChange={(v?: string) => onChange(v)}
      optionRender={(option) => (
        <span>
          {option.data.label}
          {option.data.status && <Tag style={{ marginLeft: 6 }}>{option.data.status}</Tag>}
        </span>
      )}
    />
  );
}
