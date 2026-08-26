import { useState } from 'react';
import UserSelect from '../components/UserSelect';
import { Button, Card, Empty, Form, Input, Modal, Select, Table, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import type { RiskLevel, WorkStatus } from '@mbc360/shared/types';
import { WORK_STATUSES } from '@mbc360/shared/config/gates';
import StatusBadge from '../components/StatusBadge';
import PhaseDependencyAlert from '../components/PhaseDependencyAlert';
import { isGatePassed, positionSentence } from '@mbc360/shared/utils/gateProgress';
import { patchArray, useDraft } from '../hooks/useDraft';
import SaveBar from '../components/SaveBar';
import { TABLE_STICKY } from '../theme/tokens';

const EVENT_TYPES = [
  'Consumer feedback', 'HCP feedback', 'Distributor feedback', 'Retailer feedback',
  'Sales feedback', 'Social media feedback', 'Complaint', 'Adverse event / PV signal',
  'PMS trend', 'Claim question', 'Packaging issue', 'Formula issue', 'Quality issue',
  'FAQ update', 'CAPA', 'Product optimisation',
];

interface CapaForm {
  market: string;
  eventType: string;
  summary: string;
  severity: RiskLevel;
  owner: string;
  notes?: string;
}

export default function PostMarketCapa() {
  const { projectId } = useParams();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const addCapa = useAppStore((s) => s.addCapa);
  const setCapaBulk = useAppStore((s) => s.setCapaBulk);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<CapaForm>();
  const { draft, dirty, update, markSaved, discard } = useDraft(project?.capa ?? []);

  if (!project) return <Empty description="Project not found" />;
  const id = project.identity.id;

  const patch = (index: number, p: Partial<(typeof draft)[number]>) => update((prev) => patchArray(prev, index, p));
  const save = () => {
    setCapaBulk(id, draft);
    markSaved();
  };

  const onCreate = async () => {
    const values = await form.validateFields();
    const record = {
      ...values,
      id: `PM-${String(project.capa.length + 1).padStart(3, '0')}`,
      status: 'Not Started' as WorkStatus,
    };
    addCapa(id, record);
    message.success(`Record ${record.id} added`);
    setOpen(false);
    form.resetFields();
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <PhaseDependencyAlert
        reached={isGatePassed(project, 'SG11')}
        title="Post-launch activity (Gate 12)"
        description={`Post-market / CAPA applies after the product is on market — that is, once Gate 11 (launch sign-off) has passed. ${positionSentence(project)} You can pre-fill records, but they normally start after launch.`}
      />
      <Card
        size="small"
        title={`Post-Market / Complaint & CAPA Log — ${project.identity.productSku}`}
        extra={
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            New record
          </Button>
        }
      >
      {draft.length === 0 ? (
        <Empty description="No post-market records yet" />
      ) : (
        <Table
          size="small"
          rowKey={(r) => r.id}
          dataSource={draft}
          sticky={TABLE_STICKY}
          scroll={{ x: 1000 }}
          columns={[
            { title: 'Record ID', width: 100, dataIndex: 'id', fixed: 'left', render: (v) => <b>{v}</b> },
            { title: 'Market', width: 110, dataIndex: 'market' },
            { title: 'Event type', width: 180, dataIndex: 'eventType' },
            { title: 'Summary', width: 280, dataIndex: 'summary' },
            { title: 'Severity', width: 100, dataIndex: 'severity', render: (v) => <StatusBadge value={v} /> },
            {
              title: 'Status',
              width: 150,
              render: (_, r, i) => (
                <Select
                  style={{ width: 140 }}
                  value={r.status}
                  options={WORK_STATUSES.map((s) => ({ value: s, label: s }))}
                  onChange={(v: WorkStatus) => patch(i, { status: v })}
                />
              ),
            },
            { title: 'Owner', width: 130, dataIndex: 'owner' },
            {
              title: 'Notes',
              width: 200,
              render: (_, r, i) => (
                <Input value={r.notes} onChange={(e) => patch(i, { notes: e.target.value })} />
              ),
            },
          ]}
        />
      )}
      <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />

      <Modal title="New Post-Market Record" open={open} onOk={onCreate} onCancel={() => setOpen(false)} okText="Add">
        <Form form={form} layout="vertical" initialValues={{ severity: 'Low' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="market" label="Market" rules={[{ required: true }]}>
              <Select options={project.identity.markets.map((m) => ({ value: m, label: m }))} />
            </Form.Item>
            <Form.Item name="eventType" label="Event type" rules={[{ required: true }]}>
              <Select options={EVENT_TYPES.map((t) => ({ value: t, label: t }))} showSearch />
            </Form.Item>
            <Form.Item name="severity" label="Severity / risk" rules={[{ required: true }]}>
              <Select options={['Low', 'Medium', 'High'].map((r) => ({ value: r, label: r }))} />
            </Form.Item>
            <Form.Item name="owner" label="Owner" rules={[{ required: true }]}>
              <UserSelect onChange={() => {}} />
            </Form.Item>
          </div>
          <Form.Item name="summary" label="Complaint / AE summary" rules={[{ required: true }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
      </Card>
    </div>
  );
}
