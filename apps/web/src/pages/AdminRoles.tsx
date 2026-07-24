import { Alert, Typography } from 'antd';
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
    <>
      <Typography.Title level={4}>Roles</Typography.Title>
      <Typography.Paragraph type="secondary">
        Edit what each role is allowed to do — which gate decisions it may record, which phase
        "Approved by" rows it may sign, and market-track approval. Assigning a role to a specific
        user lives on the sibling Users page.
      </Typography.Paragraph>
      <RoleCapabilityEditor />
    </>
  );
}
