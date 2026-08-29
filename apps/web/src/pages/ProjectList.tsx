import { useEffect, useState } from 'react';
import { Button, Card, Checkbox, DatePicker, Empty, Form, Input, Modal, Popconfirm, Popover, Progress, Select, Table, Tag, Tooltip, message } from 'antd';
import { ArrowRightOutlined, PlusOutlined, DeleteOutlined, InboxOutlined, UndoOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import { useAppStore } from '../store/useAppStore';
import { PHASE_1 } from '@mbc360/shared/config/phases';
import { REVIEW_ROLES } from '@mbc360/shared/config/reviewers';
import { isGatePassed } from '@mbc360/shared/utils/gateProgress';
import { isChangeOpen } from '@mbc360/shared/config/changeTriggers';
import { useSession } from '../auth/useSession';
import { canArchiveProject, EMPTY_GRANTS } from '../utils/permissions';
import { TEXT } from '../theme/tokens';

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
  roleKey: string | null;
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
  const myRoleKeys = session.user?.roles.map((r) => r.key) ?? [];
  const canArchive = canArchiveProject(grants, myRoleKeys);
  const canDelete = session.isAdmin;

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

  return (
    <Card
      size="small"
      title="Projects"
      extra={
        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Checkbox
            style={{ fontSize: 13 }}
            checked={showArchived}
            onChange={(e) =>
              setShowArchived(e.target.checked).catch((err: unknown) =>
                message.error(err instanceof Error ? err.message : 'Could not reload projects'),
              )
            }
          >
            Show archived
          </Checkbox>
          {/* `size="small"` to match the Card: a default 32px button inside a
              small card's ~38px header leaves 3px of breathing room top and
              bottom and reads as if it is bursting out of the strip. Every
              other card-header action in the app (Refresh now, Disconnect,
              Select all…) is small for the same reason. The full-size button
              stays on the empty state, where it is the page's only call to
              action rather than a header control. */}
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            New Project
          </Button>
        </span>
      }
    >
      <Table
        size="small"
        rowKey={(p) => p.identity.id}
        dataSource={projects}
        scroll={{ x: 1290 }}
        // antd's default empty state is the words "No data", which on the
        // first-run screen of the whole app says nothing about what to do.
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span>
                  No projects yet. Creating one scaffolds all four phase forms, the twelve gates
                  and every evidence register.
                </span>
              }
            >
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
                Create New Project
              </Button>
            </Empty>
          ),
        }}
        columns={[
          {
            title: 'Project ID',
            width: 140,
            render: (_, p) => (
              <span>
                <Link to={`/projects/${p.identity.id}`}>
                  <b>{p.identity.id}</b>
                </Link>
                {p.identity.archived && (
                  <Tooltip
                    title={`Archived ${p.identity.archived.at}${p.identity.archived.by ? ` by ${p.identity.archived.by}` : ''} — restore it to resume work.`}
                  >
                    <Tag icon={<InboxOutlined />} style={{ marginInlineStart: 6 }}>
                      Archived
                    </Tag>
                  </Tooltip>
                )}
              </span>
            ),
          },
          { title: 'Product / SKU', width: 240, render: (_, p) => p.identity.productSku },
          { title: 'Product group', width: 160, render: (_, p) => p.identity.productGroup },
          { title: 'Lead', width: 130, render: (_, p) => p.identity.projectLead },
          { title: 'Opened', width: 110, render: (_, p) => p.identity.dateOpened },
          { title: 'Target launch', width: 110, render: (_, p) => p.identity.targetLaunchDate },
          {
            title: 'Markets',
            width: 200,
            render: (_, p) => (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {p.identity.markets.map((m) => (
                  <Tag key={m} style={{ marginInlineEnd: 0 }}>
                    {m}
                  </Tag>
                ))}
              </div>
            ),
          },
          {
            // The 13 review areas assigned at project creation. One person can
            // hold several areas, so the cell lists DISTINCT people (a few
            // inline, the rest behind a popover with the full role -> person
            // grid) rather than 13 near-duplicate names.
            title: 'Reviewers',
            width: 230,
            render: (_, p) => {
              const reviewers = p.identity.reviewers ?? {};
              const assigned = REVIEW_ROLES.filter((role) => !!reviewers[role.key]?.trim());
              if (assigned.length === 0) {
                return <span style={{ color: TEXT.disabled }}>Not assigned</span>;
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
              const isMe = (name: string) =>
                !!myName && name.trim().toLowerCase() === myName.trim().toLowerCase();
              return (
                <Popover
                  placement="left"
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
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, cursor: 'help' }}>
                    {shown.map(([name, areas]) => (
                      <Tag
                        key={name}
                        color={isMe(name) ? 'gold' : undefined}
                        style={{ marginInlineEnd: 0 }}
                      >
                        {name}
                        {areas.length > 1 && <span style={{ opacity: 0.6 }}> ×{areas.length}</span>}
                      </Tag>
                    ))}
                    {hidden > 0 && (
                      <Tag style={{ marginInlineEnd: 0, borderStyle: 'dashed' }}>+{hidden} more</Tag>
                    )}
                  </div>
                </Popover>
              );
            },
          },
          {
            title: 'Change requests',
            width: 150,
            render: (_, p) => {
              const list = changes.filter((c) => c.projectId === p.identity.id);
              if (list.length === 0) return <span style={{ color: TEXT.disabled }}>0</span>;
              const openCount = list.filter((c) => isChangeOpen(c.status)).length;
              return (
                <Link to="/change-control">
                  <b>{list.length}</b>
                  {openCount > 0 && (
                    <Tag color="orange" style={{ marginInlineStart: 6, marginInlineEnd: 0 }}>
                      {openCount} open
                    </Tag>
                  )}
                </Link>
              );
            },
          },
          {
            title: 'Progress',
            width: 160,
            render: (_, p) => {
              const done = p.gates.filter((g) => isGatePassed(p, g.gateId)).length;
              return <Progress percent={Math.round((done / 12) * 100)} size="small" />;
            },
          },
          {
            // Two different authorities, deliberately not interchangeable:
            //   Archive  — reversible, keeps everything, needs `project|archive`
            //              (Project Owner). Shown to whoever holds it.
            //   Delete   — irreversible, also destroys the audit trail, System
            //              Administrator only. Hidden entirely otherwise, so a
            //              role that cannot use it never sees the button.
            // Both are re-checked on the server; hiding is only about not
            // offering an action that would be refused.
            title: '',
            // Three actions now, so the column needs the room the two icons
            // did not.
            width: 150,
            render: (_, p) => {
              const archived = !!p.identity.archived;
              return (
                <span style={{ whiteSpace: 'nowrap' }}>
                  {/* The Project ID cell is already a link, but nothing in the
                      action group said "open this" — the only two controls there
                      were archive and delete, i.e. both destructive. A real
                      <Link> (not an onClick) so ⌘-click and middle-click open it
                      in a new tab like any other link. */}
                  <Link to={`/projects/${p.identity.id}`}>
                    <Tooltip title="Open this project's workspace">
                      <Button size="small" type="link" style={{ paddingInline: 4 }}>
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
                          size="small"
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
                        <Button size="small" danger type="text" aria-label="Delete this project permanently" icon={<DeleteOutlined />} />
                      </Tooltip>
                    </Popconfirm>
                  )}
                </span>
              );
            },
          },
        ]}
      />

      <Modal
        title="New Project — Project Identification"
        open={open}
        onOk={onCreate}
        onCancel={() => setOpen(false)}
        okText="Create"
        width={720}
      >
        <Form form={form} layout="vertical">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
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
          <div style={{ fontWeight: 600, margin: '4px 0 12px' }}>
            Review owners &amp; co-signers
            <span style={{ fontWeight: 400, color: TEXT.secondary, fontSize: 12, marginLeft: 8 }}>
              — the person responsible for each area on this project
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            {REVIEW_ROLES.map((role) => (
              <Form.Item
                key={role.key}
                name={['reviewers', role.key]}
                label={role.label}
                rules={[{ required: true, message: `${role.label} is required` }]}
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
      </Modal>
    </Card>
  );
}
