import { Link } from 'react-router-dom';
import { usePermissionView } from '../auth/previewMode';
import Notice from '../components/Notice';
import RoleCapabilityEditor from '../components/RoleCapabilityEditor';
import '../styles/concept.css';
import './AdminUsers.css';

// Roles sub-page of "Users & Roles": edit what each role is allowed to do (the
// permission grid). Assigning a role to a user lives on the sibling Users page.
// Admin-only — the permission grid is world-readable (any session) so "View
// as" can consult it, but editing is admin-gated at the API; guard the page
// here too so a non-admin who deep-links the URL sees a clear notice instead
// of an editor whose Save silently 403s.
export default function AdminRoles() {
  const { isAdmin } = usePermissionView();

  if (!isAdmin) {
    return (
      <div className="concept">
        <Notice tone="warn" title="Admin access required">
          Sign in with an account that holds the System Administrator role to edit role capabilities.
        </Notice>
      </div>
    );
  }

  return (
    <div className="concept">
      {/* Same header as the sibling Users page; the editor prints the counts
          line right under it, since only it has loaded the grid. */}
      <header className="au-header">
        <h1 className="au-title">Roles</h1>
        <p className="au-desc">
          What each role is allowed to do. Assigning a role to a person is on the <Link to="/admin/users">Users</Link> page.
        </p>
      </header>
      <RoleCapabilityEditor />
    </div>
  );
}
