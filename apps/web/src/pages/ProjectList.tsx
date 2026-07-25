import { useEffect, useState } from 'react';
import { Button, Card, DatePicker, Form, Input, Modal, Popconfirm, Popover, Progress, Select, Table, Tag, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import { useAppStore } from '../store/useAppStore';
import { PHASE_1 } from '@mbc360/shared/config/phases';
import { REVIEW_ROLES } from '@mbc360/shared/config/reviewers';
import { isGatePassed } from '@mbc360/shared/utils/gateProgress';
import { isChangeOpen } from '@mbc360/shared/config/changeTriggers';
import { useSession } from '../auth/useSession';

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
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<NewProjectForm>();
  // Used only to mark the signed-in person in the Reviewers column.
  const myName = useSession().user?.displayName;

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
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          New Project
        </Button>
      }
    >
      <Table
        size="small"
        rowKey={(p) => p.identity.id}
        dataSource={projects}
        scroll={{ x: 1290 }}
        columns={[
          {
            title: 'Project ID',
            width: 140,
            render: (_, p) => <Link to={`/projects/${p.identity.id}`}><b>{p.identity.id}</b></Link>,
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
                return <span style={{ color: '#bbb' }}>Not assigned</span>;
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
                            <span style={{ color: '#888' }}>{role.label}</span>
                            <span style={{ fontWeight: name && isMe(name) ? 700 : 400 }}>
                              {name || <span style={{ color: '#bbb' }}>unassigned</span>}
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
              if (list.length === 0) return <span style={{ color: '#bbb' }}>0</span>;
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
            title: '',
            width: 60,
            render: (_, p) => (
              <Popconfirm
                title="Delete this project?"
                onConfirm={() =>
                  deleteProject(p.identity.id).catch((err: unknown) =>
                    message.error(err instanceof Error ? err.message : 'Could not delete the project'),
                  )
                }
              >
                <Button size="small" danger type="text" icon={<DeleteOutlined />} />
              </Popconfirm>
            ),
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
            <Form.Item name="productGroup" label="Product Group">
              <Input />
            </Form.Item>
            <Form.Item name="projectLead" label="Project Lead" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="ownerDepartment" label="Owner / Department">
              <Input />
            </Form.Item>
            <Form.Item name="brandCustomer" label="Brand / Customer">
              <Input />
            </Form.Item>
            <Form.Item name="targetLaunchDate" label="Target launch date">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item name="markets" label="Countries / Markets">
            <Select mode="multiple" options={marketOptions} placeholder="Select markets" />
          </Form.Item>

          {/* Review owners / co-signers — assigned per project (2026-07-23).
              Each page's "Review owner · Co-sign: …" caption is composed from
              these people. All required; the placeholder is the workbook's
              reference name for that responsibility. */}
          <div style={{ fontWeight: 600, margin: '4px 0 12px' }}>
            Review owners &amp; co-signers
            <span style={{ fontWeight: 400, color: '#999', fontSize: 12, marginLeft: 8 }}>
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
