import { Dropdown } from 'antd';
import { DownOutlined, EditOutlined, LogoutOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { SessionUser } from '../auth/useSession';
import UserAvatar from './UserAvatar';
import './AuthStatus.css';

interface AuthStatusProps {
  user: SessionUser;
  onLogout: () => void;
  /** Avatar only — the name is still in the dropdown. For narrow screens. */
  compact?: boolean;
}

// The real signed-in identity (M2 Entra ID SSO) — a single chip (avatar +
// name) that opens a dropdown with the full identity and sign-out. `user` is
// always present: App.tsx's Shell only renders this (and the rest of the
// app) once a session exists — see pages/Login.tsx for the signed-out state.
// This is what decides whether the Admin > Users screen is reachable. It
// sits next to, not instead of, the "View as" simulator: gate/phase
// decisions in this demo UI still run off the simulated role until the
// frontend is switched to the API (M3).
export default function AuthStatus({ user, onLogout, compact }: AuthStatusProps) {
  return (
    <Dropdown
      trigger={['click']}
      // The identity block is part of the popup, not a menu item: as an item it took antd's hover
      // background and padding (and swallowed its own chips' tint).
      popupRender={(menu) => (
        <div className="auth-pop">
          <div className="auth-info-row">
            <UserAvatar name={user.displayName} seed={user.id} size={40} />
            <div className="auth-info-text">
              <div className="auth-info-name">{user.displayName}</div>
              <div className="auth-info-email">{user.email}</div>
              {(user.roles.length > 0 || user.department) && (
                <div className="auth-info-meta">
                  {user.roles.map((r) => (
                    <span className="auth-info-chip" key={r.key}>
                      {r.name}
                    </span>
                  ))}
                  {user.department && <span className="auth-info-chip">{user.department}</span>}
                </div>
              )}
            </div>
          </div>
          {menu}
        </div>
      )}
      menu={{
        items: [
          {
            key: 'account',
            label: <Link to="/account">My account</Link>,
            icon: <EditOutlined />,
          },
          { type: 'divider' },
          { key: 'logout', label: 'Sign out', icon: <LogoutOutlined />, onClick: onLogout },
        ],
      }}
    >
      <button
        type="button"
        className="auth-trigger"
        aria-label={`Account menu: ${user.displayName}`}
        aria-haspopup="menu"
        title={`${user.displayName} — account menu`}
      >
        <UserAvatar name={user.displayName} seed={user.id} size={compact ? 32 : 28} />
        {!compact && <span className="auth-trigger-name">{user.displayName}</span>}
        <DownOutlined className="auth-trigger-caret" />
      </button>
    </Dropdown>
  );
}
