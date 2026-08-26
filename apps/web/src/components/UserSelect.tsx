import { Select, Tag } from 'antd';
import { useUserOptions } from '../hooks/useUserOptions';

// One picker for every "which person" field in the app. Stores the user's
// displayName, which is what those fields already held as free text, so nothing
// has to be migrated and an existing value keeps working.
//
// A value that is not in the user list (typed before this became a picker, a
// person since deactivated, or a function name like "Regulatory" left over from
// a seeded row) is kept and shown as its own option rather than silently
// cleared — losing a recorded owner would be a worse bug than an untidy list.
export default function UserSelect({
  value,
  onChange,
  disabled,
  placeholder = 'Select a person',
  style,
}: {
  value?: string;
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
  style?: React.CSSProperties;
}) {
  const users = useUserOptions();
  const known = users.some((u) => u.value === value);
  const options = [
    ...users.map((u) => ({ value: u.value, label: u.label, roleName: u.roleName })),
    ...(value && !known ? [{ value, label: value, roleName: 'not in the user list' }] : []),
  ];

  return (
    <Select
      allowClear
      showSearch
      disabled={disabled}
      placeholder={placeholder}
      style={{ width: '100%', minWidth: 120, ...style }}
      value={value || undefined}
      options={options}
      optionFilterProp="value"
      onChange={(v?: string) => onChange(v)}
      optionRender={(option) => (
        <span>
          {option.data.value}
          <Tag style={{ marginLeft: 6 }}>{option.data.roleName}</Tag>
        </span>
      )}
    />
  );
}
