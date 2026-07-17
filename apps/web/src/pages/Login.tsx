import { Alert, Button, Card, Typography } from 'antd';
import { WindowsOutlined } from '@ant-design/icons';

// The only entry point into MBc360 when there's no active session (signed
// out, never signed in, or the session expired) — Microsoft 365 SSO is the
// single supported sign-in method, so there is deliberately no other option
// here (no dev-login control; that stays a raw endpoint for local testing).
export default function Login() {
  const authError = new URLSearchParams(window.location.search).get('auth_error') === '1';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f2f5',
        padding: 16,
      }}
    >
      <Card style={{ width: 380, textAlign: 'center' }}>
        <Typography.Title level={3} style={{ marginBottom: 0 }}>
          MBc360
        </Typography.Title>
        <Typography.Text type="secondary">Development & Quality System</Typography.Text>

        <div style={{ margin: '24px 0' }}>
          <Button type="primary" size="large" block href="/api/auth/login" icon={<WindowsOutlined />}>
            Sign in with Microsoft 365
          </Button>
        </div>

        {authError && (
          <Alert
            type="error"
            showIcon
            title="Sign-in failed"
            description="Something went wrong completing sign-in with Microsoft. Please try again."
            style={{ textAlign: 'left', marginBottom: 8 }}
          />
        )}

        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Use your organization Microsoft 365 account. Access is granted per user by an administrator.
        </Typography.Text>
      </Card>
    </div>
  );
}
