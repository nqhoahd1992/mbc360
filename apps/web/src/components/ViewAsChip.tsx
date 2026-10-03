import { Dropdown, Tooltip } from 'antd';
import { DownOutlined, EyeOutlined } from '@ant-design/icons';
import { SSO_ROLES, roleLabel } from '../utils/roles';

// "View as" as a chip (administrators only). Neutral on the account's own
// role; amber while previewing another role, which makes the whole screen
// read-only (auth/previewMode.ts). The tooltip names both roles.
const OWN = '__own__';

export default function ViewAsChip({
  value,
  onChange,
  realRoleKeys,
  compact,
}: {
  /** The previewed role, or null when showing the account's own roles. */
  value: string | null;
  onChange: (role: string | null) => void;
  realRoleKeys: string[];
  /** Phone: the icon alone, still amber while simulating. */
  compact?: boolean;
}) {
  const simulating = !!value && !realRoleKeys.includes(value);
  const realLabel = realRoleKeys.map((k) => roleLabel(k)).join(', ') || 'none';
  const shown = simulating ? roleLabel(value!) : realLabel;
  const tip = simulating
    ? `Previewing as ${shown} — read-only. Your real role is ${realLabel}.`
    : `Your own role (${realLabel}). Pick another role to preview its screens, read-only.`;
  return (
    <Dropdown
      trigger={['click']}
      menu={{
        selectable: true,
        selectedKeys: [simulating ? value! : OWN],
        style: { maxHeight: 420, overflowY: 'auto' },
        items: [
          { key: OWN, label: `My own role (${realLabel})` },
          { type: 'divider' },
          { type: 'group', label: 'Preview as (read-only)' },
          ...SSO_ROLES.filter((r) => !realRoleKeys.includes(r.key)).map((r) => ({ key: r.key, label: r.label })),
        ],
        onClick: ({ key }) => onChange(key === OWN ? null : key),
      }}
    >
      <Tooltip title={tip} placement="bottomRight">
        <button
          type="button"
          className={`app-viewas${simulating ? ' app-viewas-sim' : ''}${compact ? ' app-viewas-compact' : ''}`}
          aria-label={tip}
        >
          <EyeOutlined />
          {!compact && (
            <>
              <span className="app-viewas-label">{shown}</span>
              <DownOutlined className="app-viewas-chev" />
            </>
          )}
        </button>
      </Tooltip>
    </Dropdown>
  );
}
