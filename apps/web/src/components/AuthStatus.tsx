import { Button, Space, Typography } from 'antd';
import { LoginOutlined, LogoutOutlined } from '@ant-design/icons';
import type { SessionUser } from '../auth/useSession';

interface AuthStatusProps {
  user: SessionUser | null;
  loading: boolean;
  onLogout: () => void;
}

// The real signed-in identity (M2 Entra ID SSO), shown next to the "View as"
// simulator rather than replacing it — gate/phase decisions in this demo UI
// still run off the simulated role until the frontend is switched to the API
// (M3). This is what decides whether the Admin > Users screen is reachable.
export default function AuthStatus({ user, loading, onLogout }: AuthStatusProps) {
  if (loading) return null;

  if (!user) {
    return (
      <Button size="small" icon={<LoginOutlined />} href="/api/auth/login">
        Sign in with Microsoft
      </Button>
    );
  }

  return (
    <Space size={8}>
      <Typography.Text style={{ fontSize: 12 }} type="secondary">
        {user.displayName}
        {user.department ? ` · ${user.department}` : ''}
      </Typography.Text>
      <Button size="small" icon={<LogoutOutlined />} onClick={onLogout}>
        Sign out
      </Button>
    </Space>
  );
}
