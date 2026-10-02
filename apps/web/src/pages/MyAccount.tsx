import { useEffect, useMemo, useState } from 'react';
import { Button, Popconfirm } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { GATES, PHASES } from '@mbc360/shared/config/gates';
import { reviewRoleLabel, rolesAssignedTo } from '@mbc360/shared/config/reviewers';
import {
  deleteMySignature,
  getMySignature,
  saveMySignature,
  type SignatureResponse,
} from '../api/accountApi';
import SignatureCaptureModal from '../components/SignatureCaptureModal';
import TotpEnrollCard from '../components/TotpEnrollCard';
import { useSession } from '../auth/useSession';
import { useAppStore } from '../store/useAppStore';
import { buildCapabilityGroups } from '../utils/capabilityGroups';
import Notice from '../components/Notice';
import '../styles/concept.css';
import './AdminUsers.css';
import './AdminMarketProfiles.css';
import './MyAccount.css';

// My Account (2026-08-21): the signing identity, in one place — who the app
// thinks you are, what your role lets you do, which review areas you hold on
// each project, the signature you attach to a sign-off, and the authenticator
// that proves it is you.
//
// Reworked 2026-08-22: it held only the two signing controls inside a
// `maxWidth: 640` column, so most of the screen was empty and the page could
// not answer the questions people actually open it for — "what am I allowed to
// do here?" and "what am I on the hook for?". Both answers were already in the
// browser (the permission grid the header's "View as" reads, and each project's
// reviewer assignments); nothing new is fetched for them.
export default function MyAccount() {
  const { user, isAdmin } = useSession();
  const permissionGrid = useAppStore((s) => s.permissionGrid);
  const projects = useAppStore((s) => s.projects);

  const [signature, setSignature] = useState<SignatureResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMySignature()
      .then(setSignature)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load signature'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (imageData: string) => {
    setSignature(await saveMySignature(imageData));
  };

  const handleDelete = async () => {
    setSignature(await deleteMySignature());
  };

  const initials = (user?.displayName ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  // What this account may actually do, read from the same live grid the
  // header's "View as" simulation and the server's guards use — so this card
  // cannot drift from what a save would be allowed to do.
  const capabilities = useMemo(() => {
    const roleKeys = (user?.roles ?? []).map((r) => r.key);
    const granted = new Set(roleKeys.flatMap((key) => permissionGrid?.grants[key] ?? []));
    const gateNumbers = GATES.filter((g) => granted.has(`gate:${g.id}|decide`)).map((g) => g.number);
    const phaseNumbers = PHASES.filter((p) => granted.has(`phase:${p.phase}|approve`)).map((p) => p.phase);
    return {
      granted,
      gateNumbers,
      phaseNumbers,
      marketTrack: granted.has('market-track|approve'),
      archive: granted.has('project|archive'),
      any: granted.size > 0,
    };
  }, [permissionGrid, user?.roles]);

  // Which review areas this person holds, per project — the digital
  // replacement for the workbook's owner tab-prefix (see MySheets).
  const reviewAreas = useMemo(
    () =>
      projects
        .map((p) => ({
          id: p.identity.id,
          name: p.identity.id,
          sku: p.identity.productSku,
          areas: rolesAssignedTo(p.identity.reviewers, user?.displayName),
        }))
        .filter((row) => row.areas.length > 0),
    [projects, user?.displayName],
  );

  const groups = useMemo(() => (permissionGrid ? buildCapabilityGroups(permissionGrid.permissions) : []), [permissionGrid]);
  const total = groups.reduce((n, g) => n + g.caps.length, 0);
  const myGroups = groups
    .map((g) => ({ ...g, caps: g.caps.filter((c) => capabilities.granted.has(c.id)) }))
    .filter((g) => g.caps.length > 0);
  const grantedCount = myGroups.reduce((n, g) => n + g.caps.length, 0);

  return (
    <div className="concept au">
      <header className="ma-header">
        <span className="au-avatar ma-avatar">{initials}</span>
        <div style={{ minWidth: 0 }}>
          <h1 className="au-title">{user?.displayName}</h1>
          <p className="au-meta">
            {user?.email}
            {user?.department && ` · ${user.department}`} ·{' '}
            {/* Not always SSO: the seeded …@demo.mbc360.local accounts come in
                through dev-login, and claiming Microsoft 365 for one of those
                would simply be false. */}
            {user?.email.endsWith('@demo.mbc360.local') ? 'Dev login' : 'Microsoft 365'}
          </p>
          <div className="ma-roles">
            {(user?.roles ?? []).map((r) => (
              <span key={r.key} className="c-tag">
                {r.name}
              </span>
            ))}
          </div>
        </div>
      </header>

      <section className="c-card ma-card">
        <div className="ma-card-head">
          <h2 className="ma-card-title">What your role lets you do</h2>
          {!isAdmin && permissionGrid && (
            <span className="mp-muted">
              {grantedCount} of {total} capabilities
            </span>
          )}
        </div>
        {isAdmin ? (
          <p className="ma-pad ma-text">
            System Administrator is unrestricted — it holds every capability, including deleting projects.{' '}
            <Link to="/admin/roles">Edit roles</Link>
          </p>
        ) : !permissionGrid ? (
          <div className="ma-pad">
            <div className="c-skel" style={{ height: 40 }} />
          </div>
        ) : myGroups.length === 0 ? (
          <p className="ma-pad ma-text">
            Your role grants no decision or approval rights. You can still record evidence everywhere.
          </p>
        ) : (
          <>
            <dl className="ma-groups">
              {myGroups.map((g) => (
                <div key={g.key} className="ma-group">
                  <dt>
                    {g.title} <span className="mp-muted">{g.caps.length}</span>
                  </dt>
                  <dd>
                    {g.caps.map((c) => (
                      <span key={c.id} className="c-tag">
                        {c.label}
                      </span>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="ma-foot">Anything not listed needs another role. Recording evidence needs none of these.</p>
          </>
        )}
      </section>

      <section className="c-card au-list">
        <div className="ma-card-head ma-card-head-plain">
          <h2 className="ma-card-title">My review areas</h2>
          <span className="mp-muted">
            {reviewAreas.length === 0 ? 'None' : `${reviewAreas.length} ${reviewAreas.length === 1 ? 'project' : 'projects'}`}
          </span>
        </div>
        {reviewAreas.length === 0 ? (
          <p className="ma-pad ma-text" style={{ paddingTop: 0 }}>
            You are not a reviewer on any project yet. Reviewers are chosen per project when it is created.
          </p>
        ) : (
          reviewAreas.map((row) => (
            <Link key={row.id} to={`/projects/${row.id}/my-sheets`} className="au-row ma-row">
              <div className="ma-row-text">
                <div className="au-name-text">{row.name}</div>
                {row.sku && <div className="au-email">{row.sku}</div>}
              </div>
              <div className="ma-row-tags">
                {row.areas.map((key) => (
                  <span key={key} className="c-tag">
                    {reviewRoleLabel(key)}
                  </span>
                ))}
              </div>
              <RightOutlined className="au-chev" />
            </Link>
          ))
        )}
      </section>

      <section className="c-card ma-card">
        <div className="ma-card-head ma-card-head-stack">
          <h2 className="ma-card-title">Ready to sign</h2>
          <p className="ma-text">
            Your saved signature is attached when you sign a phase, a gate or a register signature cell; each time, a fresh
            code from your authenticator confirms it is you.
          </p>
        </div>
        <div className="ma-sign">
          <div className="ma-sign-half">
            <div className="ma-sub">Signature</div>
            {error && (
              <Notice tone="bad" title="Could not load your signature">
                {error}
              </Notice>
            )}
            {loading ? (
              <div className="c-skel" style={{ height: 76, width: 240 }} />
            ) : signature?.hasSignature ? (
              <>
                <div className="ma-sigbox">
                  <img src={signature.imageData} alt="Your saved signature" />
                </div>
                <div className="ma-actions">
                  <Button onClick={() => setModalOpen(true)}>Update</Button>
                  <Popconfirm
                    title="Remove your saved signature?"
                    description="You can draw a new one at any time."
                    okText="Remove"
                    okButtonProps={{ danger: true }}
                    onConfirm={handleDelete}
                  >
                    <Button danger>Remove</Button>
                  </Popconfirm>
                </div>
              </>
            ) : (
              <>
                <div className="ma-sigbox ma-sigbox-empty">No signature saved yet</div>
                <div className="ma-actions">
                  <Button type="primary" onClick={() => setModalOpen(true)}>
                    Draw signature
                  </Button>
                </div>
              </>
            )}
          </div>
          <div className="ma-sign-half">
            <div className="ma-sub">Authenticator</div>
            <TotpEnrollCard />
          </div>
        </div>
      </section>
      <SignatureCaptureModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} />
    </div>
  );
}
