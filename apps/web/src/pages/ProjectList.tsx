import { useEffect, useState } from 'react';
import { Button, Checkbox, DatePicker, Empty, Form, Input, Pagination, Popconfirm, Popover, Select, Tag, Tooltip, message } from 'antd';
import { ArrowRightOutlined, PlusOutlined, DeleteOutlined, InboxOutlined, UndoOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import { useAppStore } from '../store/useAppStore';
import { PHASE_1 } from '@mbc360/shared/config/phases';
import { REVIEW_ROLES, reviewRoleFieldLabel } from '@mbc360/shared/config/reviewers';
import { isGatePassed } from '@mbc360/shared/utils/gateProgress';
import { isChangeOpen } from '@mbc360/shared/config/changeTriggers';
import { useSession } from '../auth/useSession';
import { usePermissionView } from '../auth/previewMode';
import { canArchiveProject, EMPTY_GRANTS } from '../utils/permissions';
import { TEXT } from '../theme/tokens';
import '../styles/concept.css';
import '../components/RegisterPageHeader.css';
import './ProjectList.css';

import FormDrawer from '../components/FormDrawer';
interface NewProjectForm {
  id: string;
  productCode: string;
  projectLead: string;
  productGroup: string;
  brandCustomer: string;
  productSku: string;
  ownerDepartment: string;
  targetLaunchDate?: Dayjs;
  markets: string[];
  reviewers: Record<string, string>;
}

interface PickerUser {
  id: string;
  displayName: string;
  // Every role the person holds, joined for the tag (a user may hold several).
  roleName: string | null;
}

export default function ProjectList() {
  const projects = useAppStore((s) => s.projects);
  const changes = useAppStore((s) => s.changes);
  const createProject = useAppStore((s) => s.createProject);
  const deleteProject = useAppStore((s) => s.deleteProject);
  const setProjectArchived = useAppStore((s) => s.setProjectArchived);
  const showArchived = useAppStore((s) => s.showArchivedProjects);
  const setShowArchived = useAppStore((s) => s.setShowArchivedProjects);
  const grants = useAppStore((s) => s.permissionGrid?.grants ?? EMPTY_GRANTS);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<NewProjectForm>();
  // The real signed-in identity — NOT the "View as" simulator: archiving and
  // deleting change real data, so a demo role switch must not grant them.
  const session = useSession();
  const myName = session.user?.displayName;
  // Archive and Delete follow View as like every other on-screen check; a
  // preview is read-only anyway, and the server checks the real session.
  const permissionView = usePermissionView();
  const canArchive = canArchiveProject(grants, permissionView.roleKeys);
  const canDelete = permissionView.isAdmin;

  // Active users for the reviewer pickers (no hard role filter — every field
  // lists all active users, role shown as a tag). Fetched when the modal opens.
  const [users, setUsers] = useState<PickerUser[]>([]);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch('/api/rbac/users')
      .then((r) => (r.ok ? r.json() : []))
      .then((list: PickerUser[]) => {
        if (!cancelled) setUsers(list);
      })
      .catch(() => {
        if (!cancelled) setUsers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Deduped by displayName (the stored value) so antd Select has unique option
  // values; each option carries its role for the tag + text search.
  const userOptions = Array.from(new Map(users.map((u) => [u.displayName, u])).values()).map((u) => ({
    value: u.displayName,
    label: u.displayName,
    roleName: u.roleName ?? '—',
  }));

  const marketOptions = PHASE_1.checklistSections
    .find((s) => s.key === 'targetMarkets')!
    .options.filter((o) => !o.startsWith('Other'))
    .map((o) => ({ value: o, label: o }));

  const onCreate = async () => {
    const values = await form.validateFields();
    if (projects.some((p) => p.identity.id === values.id)) {
      message.error('Project ID already exists');
      return;
    }
    // M3 Phase 1: this is a real POST /api/projects now, so it can be rejected
    // (duplicate id/product code, validation) — the modal stays open with the
    // entered values instead of pretending the project was created.
    try {
      await createProject({
        ...values,
        dateOpened: dayjs().format('YYYY-MM-DD'),
        targetLaunchDate: values.targetLaunchDate ? values.targetLaunchDate.format('YYYY-MM-DD') : '',
        markets: values.markets ?? [],
        reviewers: values.reviewers,
      });
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Could not create the project');
      return;
    }
    message.success('Project created');
    setOpen(false);
    form.resetFields();
  };

  // The list used antd Table's default pagination (10 per page); kept, so a
  // long portfolio does not become one endless page.
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(projects.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = projects.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const activeCount = projects.filter((p) => !p.identity.archived).length;
  const archivedCount = projects.length - activeCount;

  const isMe = (name: string) => !!myName && name.trim().toLowerCase() === myName.trim().toLowerCase();

  // The 13 review areas assigned at project creation. One person can hold
  // several areas, so the cell lists DISTINCT people (a few inline, the rest
  // behind a popover with the full role -> person grid) rather than 13
  // near-duplicate names.
  const renderReviewers = (p: (typeof projects)[number]) => {
    const reviewers = p.identity.reviewers ?? {};
    const assigned = REVIEW_ROLES.filter((role) => !!reviewers[role.key]?.trim());
    if (assigned.length === 0) {
      return <span className="pl-muted">Not assigned</span>;
    }
    // Distinct people, in role order, each with every area they hold.
    const byPerson = new Map<string, string[]>();
    for (const role of assigned) {
      const name = reviewers[role.key].trim();
      if (!byPerson.has(name)) byPerson.set(name, []);
      byPerson.get(name)!.push(role.label);
    }
    const people = [...byPerson.entries()];
    const shown = people.slice(0, 3);
    const hidden = people.length - shown.length;
    return (
      <Popover
        placement="left"
        rootClassName="concept-tokens"
        title={`Review owners — ${p.identity.id}`}
        content={
          <div style={{ display: 'grid', gap: 2, fontSize: 12, maxWidth: 320 }}>
            {REVIEW_ROLES.map((role) => {
              const name = reviewers[role.key]?.trim();
              return (
                <div key={role.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ color: TEXT.secondary }}>{role.label}</span>
                  <span style={{ fontWeight: name && isMe(name) ? 700 : 400 }}>
                    {name || <span style={{ color: TEXT.disabled }}>unassigned</span>}
                    {name && isMe(name) && <Tag color="gold" style={{ marginInlineStart: 6 }}>You</Tag>}
                  </span>
                </div>
              );
            })}
          </div>
        }
      >
        <div className="pl-tags pl-reviewers">
          {shown.map(([name, areas]) => (
            <span key={name} className={`c-tag${isMe(name) ? ' pl-me' : ''}`}>
              {name}
              {areas.length > 1 && <span style={{ opacity: 0.7 }}>×{areas.length}</span>}
            </span>
          ))}
          {hidden > 0 && (
            <span className="c-tag" style={{ borderStyle: 'dashed' }}>
              +{hidden} more
            </span>
          )}
        </div>
      </Popover>
    );
  };

  const renderChanges = (p: (typeof projects)[number]) => {
    const list = changes.filter((c) => c.projectId === p.identity.id);
    if (list.length === 0) return <span className="pl-muted">0</span>;
    const openCount = list.filter((c) => isChangeOpen(c.status)).length;
    return (
      <Link className="c-link" to="/change-control" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <b>{list.length}</b>
        {openCount > 0 && <span className="c-tag c-tag-warn c-tag-dot">{openCount} open</span>}
      </Link>
    );
  };

  // Two different authorities, deliberately not interchangeable:
  //   Archive  — reversible, keeps everything, needs `project|archive`
  //              (Project Owner). Shown to whoever holds it.
  //   Delete   — irreversible, also destroys the audit trail, System
  //              Administrator only. Hidden entirely otherwise, so a role that
  //              cannot use it never sees the button.
  // Both are re-checked on the server; hiding is only about not offering an
  // action that would be refused.
  const renderActions = (p: (typeof projects)[number]) => {
    const archived = !!p.identity.archived;
    return (
      <>
        {/* The identity is already a link, but nothing in the action group
            said "open this" — the only two other controls are archive and
            delete, i.e. both destructive. A real <Link> (not an onClick) so
            ⌘-click and middle-click open it in a new tab like any other link. */}
        <Link to={`/projects/${p.identity.id}`}>
          <Tooltip title="Open this project's workspace">
            <Button type="link" style={{ paddingInline: 4 }}>
              View <ArrowRightOutlined />
            </Button>
          </Tooltip>
        </Link>
        {canArchive && (
          <Popconfirm
            title={archived ? 'Restore this project?' : 'Archive this project?'}
            description={
              archived
                ? 'It reappears in the active list.'
                : 'It is hidden from the list but nothing is deleted — you can restore it later.'
            }
            onConfirm={() =>
              setProjectArchived(p.identity.id, !archived).catch((err: unknown) =>
                message.error(err instanceof Error ? err.message : 'Could not update the project'),
              )
            }
          >
            <Tooltip title={archived ? 'Restore' : 'Archive (reversible)'}>
              <Button
                type="text"
                aria-label={archived ? 'Restore this project' : 'Archive this project'}
                icon={archived ? <UndoOutlined /> : <InboxOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        )}
        {canDelete && (
          <Popconfirm
            title="Delete this project?"
            description="This also deletes its entire audit trail and cannot be undone. Archive instead if you may need the record."
            okButtonProps={{ danger: true }}
            onConfirm={() =>
              deleteProject(p.identity.id).catch((err: unknown) =>
                message.error(err instanceof Error ? err.message : 'Could not delete the project'),
              )
            }
          >
            <Tooltip title="Delete permanently (System Administrator only)">
              <Button danger type="text" aria-label="Delete this project permanently" icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        )}
      </>
    );
  };

  return (
    <div className="concept">
      <div className="pl-toolbar">
        <div className="rph">
          <div className="rph-title-row">
            <h1 className="rph-title">Projects</h1>
          </div>
          <p className="rph-meta">
            {activeCount} active project{activeCount === 1 ? '' : 's'}
            {showArchived && ` · ${archivedCount} archived shown`}
          </p>
        </div>
        <div className="pl-actions-bar">
          <Checkbox
            checked={showArchived}
            onChange={(e) =>
              setShowArchived(e.target.checked).catch((err: unknown) =>
                message.error(err instanceof Error ? err.message : 'Could not reload projects'),
              )
            }
          >
            Show archived
          </Checkbox>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            New Project
          </Button>
        </div>
      </div>

      <div
        className="c-card pl"
        style={{ '--pl-cols': 'minmax(0, 2.2fr) minmax(0, 1fr) minmax(0, 0.9fr) minmax(0, 1.3fr) minmax(0, 1.6fr) minmax(0, 0.7fr) minmax(0, 1.1fr) 132px' } as React.CSSProperties}
      >
        <div className="pl-card-head">
          <span className="pl-card-title">All projects</span>
          <span className="pl-count">
            {projects.length} project{projects.length === 1 ? '' : 's'}
          </span>
        </div>
        {projects.length === 0 ? (
          // A bare "No data" on the first-run screen of the whole app says
          // nothing about what to do.
          <div className="pl-empty">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span>
                  No projects yet. Creating one scaffolds all four phase forms, the twelve gates and every evidence
                  register.
                </span>
              }
            >
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
                Create New Project
              </Button>
            </Empty>
          </div>
        ) : (
          <>
            <div className="pl-head" aria-hidden>
              <span>Project</span>
              <span>Lead</span>
              <span>Target launch</span>
              <span>Markets</span>
              <span>Reviewers</span>
              <span>Changes</span>
              <span>Progress</span>
              <span />
            </div>
            <ul className="pl-list">
              {pageRows.map((p) => {
                const done = p.gates.filter((g) => isGatePassed(p, g.gateId)).length;
                const pct = Math.round((done / 12) * 100);
                return (
                  <li key={p.identity.id} className="pl-row">
                    <div className="pl-cell">
                      <div className="pl-id-title">
                        <Link className="c-link pl-id-name" to={`/projects/${p.identity.id}`}>
                          {p.identity.productSku || p.identity.id}
                        </Link>
                        {p.identity.archived && (
                          <Tooltip
                            title={`Archived ${p.identity.archived.at}${p.identity.archived.by ? ` by ${p.identity.archived.by}` : ''} — restore it to resume work.`}
                          >
                            <span className="c-tag">
                              <InboxOutlined />
                              Archived
                            </span>
                          </Tooltip>
                        )}
                      </div>
                      <div className="pl-id-sub">
                        {p.identity.id}
                        {p.identity.productGroup && ` · ${p.identity.productGroup}`}
                        {p.identity.dateOpened && ` · Opened ${p.identity.dateOpened}`}
                      </div>
                    </div>
                    <div className="pl-cell" data-label="Lead">
                      {p.identity.projectLead || <span className="pl-muted">—</span>}
                    </div>
                    <div className="pl-cell" data-label="Target launch">
                      {p.identity.targetLaunchDate || <span className="pl-muted">—</span>}
                    </div>
                    <div className="pl-cell" data-label="Markets">
                      {p.identity.markets.length ? (
                        <div className="pl-tags">
                          {p.identity.markets.map((m) => (
                            <span key={m} className="c-tag">
                              {m}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="pl-muted">None yet</span>
                      )}
                    </div>
                    <div className="pl-cell" data-label="Reviewers">
                      {renderReviewers(p)}
                    </div>
                    <div className="pl-cell" data-label="Changes">
                      {renderChanges(p)}
                    </div>
                    <div className="pl-cell" data-label="Progress">
                      <div className="pl-progress">
                        <div
                          className="pl-bar"
                          role="progressbar"
                          aria-label={`${done} of 12 gates passed`}
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div className={done === 12 ? 'pl-bar-done' : undefined} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="pl-pct">{pct}%</span>
                      </div>
                    </div>
                    <div className="pl-cell pl-cell-actions">{renderActions(p)}</div>
                  </li>
                );
              })}
            </ul>
            {pageCount > 1 && (
              <div className="pl-pagination">
                <Pagination
                  current={currentPage}
                  pageSize={PAGE_SIZE}
                  total={projects.length}
                  onChange={setPage}
                  showSizeChanger={false}
                />
              </div>
            )}
          </>
        )}
      </div>

      <FormDrawer
        title="New Project — Project Identification"
        open={open}
        onOk={onCreate}
        onCancel={() => setOpen(false)}
        okText="Create"
        width={720}
      >
        <Form form={form} layout="vertical">
          <div className="pl-form-section">Project identification</div>
          <div className="pl-form-grid">
            <Form.Item name="id" label="Project ID" rules={[{ required: true }]}>
              <Input placeholder="MBC-2026-003" />
            </Form.Item>
            <Form.Item name="productCode" label="Product Code" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="productSku" label="Product / SKU" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="productGroup" label="Product Group" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="projectLead" label="Project Lead" rules={[{ required: true }]}>
              <Select
                showSearch
                placeholder="Select a user"
                optionFilterProp="label"
                popupMatchSelectWidth={false}
                notFoundContent={users.length === 0 ? 'No users found' : 'No match'}
                options={userOptions}
                optionRender={(opt) => (
                  <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span>{opt.data.label}</span>
                    <Tag style={{ marginInlineEnd: 0 }}>{(opt.data as { roleName?: string }).roleName}</Tag>
                  </span>
                )}
              />
            </Form.Item>
            <Form.Item name="ownerDepartment" label="Owner / Department" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="brandCustomer" label="Brand / Customer" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="targetLaunchDate" label="Target launch date" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>
          {/* Optional at creation since 2026-08-29 (Round 4 question 24): "not
              mandatory to create the initial project shell, but becomes mandatory
              before Gate 1 passes". Requiring it here is what had made the Gate 1
              check unsatisfiable-by-being-always-satisfied. */}
          <Form.Item
            name="markets"
            label="Countries / Markets"
            extra="Optional now — required before Gate 1 can pass."
          >
            <Select mode="multiple" options={marketOptions} placeholder="Select markets" />
          </Form.Item>

          {/* Review owners / co-signers — assigned per project (2026-07-23).
              Each page's "Review owner · Co-sign: …" caption is composed from
              these people. All 13 are required and there is no default: every
              field is an empty user picker, so a project never inherits the
              workbook's reference names (REVIEW_ROLES[].workbookName) — those
              only seed the 13 user ACCOUNTS. */}
          <div className="pl-form-section">
            Review owners &amp; co-signers
            <span>the person responsible for each area on this project</span>
          </div>
          <div className="pl-form-grid">
            {REVIEW_ROLES.map((role) => (
              <Form.Item
                key={role.key}
                name={['reviewers', role.key]}
                label={reviewRoleFieldLabel(role)}
                rules={[{ required: true, message: `${reviewRoleFieldLabel(role)} is required` }]}
              >
                <Select
                  showSearch
                  placeholder="Select a user"
                  optionFilterProp="label"
                  popupMatchSelectWidth={false}
                  notFoundContent={users.length === 0 ? 'No users found' : 'No match'}
                  options={userOptions}
                  optionRender={(opt) => (
                    <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span>{opt.data.label}</span>
                      <Tag style={{ marginInlineEnd: 0 }}>{(opt.data as { roleName?: string }).roleName}</Tag>
                    </span>
                  )}
                />
              </Form.Item>
            ))}
          </div>
        </Form>
      </FormDrawer>
    </div>
  );
}
