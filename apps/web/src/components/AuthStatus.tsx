import { Avatar, Button, Dropdown, Typography } from 'antd';
import { LogoutOutlined, UserOutlined } from '@ant-design/icons';
import type { SessionUser } from '../auth/useSession';

interface AuthStatusProps {
  user: SessionUser;
  onLogout: () => void;
}

// The real signed-in identity (M2 Entra ID SSO) — a single chip (avatar +
// name) that opens a dropdown with the full identity and sign-out. `user` is
// always present: App.tsx's Shell only renders this (and the rest of the
// app) once a session exists — see pages/Login.tsx for the signed-out state.
// This is what decides whether the Admin > Users screen is reachable. It
// sits next to, not instead of, the "View as" simulator: gate/phase
// decisions in this demo UI still run off the simulated role until the
// frontend is switched to the API (M3).
export default function AuthStatus({ user, onLogout }: AuthStatusProps) {
  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items: [
          {
            key: 'info',
            label: (
              <div style={{ lineHeight: 1.4, padding: '2px 0' }}>
                <div style={{ fontWeight: 600 }}>{user.displayName}</div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {user.email}
                  {user.department ? ` · ${user.department}` : ''}
                </Typography.Text>
              </div>
            ),
            disabled: true,
          },
          { type: 'divider' },
          { key: 'logout', label: 'Sign out', icon: <LogoutOutlined />, onClick: onLogout },
        ],
      }}
    >
      <Button type="text" size="small" style={{ display: 'flex', alignItems: 'center', gap: 6, paddingInline: 6 }}>
        <Avatar size={22} icon={<UserOutlined />} />
        <span
          style={{
            fontSize: 13,
            maxWidth: 140,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {user.displayName}
        </span>
      </Button>
    </Dropdown>
  );
}
