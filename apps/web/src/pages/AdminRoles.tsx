import { Alert, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { useSession } from '../auth/useSession';
import RoleCapabilityEditor from '../components/RoleCapabilityEditor';

// Roles sub-page of "Users & Roles": edit what each role is allowed to do (the
// permission grid). Assigning a role to a user lives on the sibling Users page.
// Admin-only — the permission grid is world-readable (any session) so "View
// as" can consult it, but editing is admin-gated at the API; guard the page
// here too so a non-admin who deep-links the URL sees a clear notice instead
// of an editor whose Save silently 403s.
export default function AdminRoles() {
  const { isAdmin } = useSession();

  if (!isAdmin) {
    return (
      <Alert
        type="warning"
        showIcon
        title="Admin access required"
        description="Sign in with an account that holds the admin role to edit role capabilities."
      />
    );
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Roles
        </Typography.Title>
        {/* One line, not three: the editor below names every capability group
            and explains each in place, so repeating the list here (as this page
            used to, almost word for word) pushed the first control below a wall
            of prose that said nothing new. */}
        <Typography.Text type="secondary">
          What each role is allowed to do. Assigning a role to a person is on the{' '}
          <Link to="/admin/users">Users</Link> page.
        </Typography.Text>
      </div>
      <RoleCapabilityEditor />
    </div>
  );
}
