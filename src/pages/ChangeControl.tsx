import { useState } from 'react';
import { Alert, Button, Card, DatePicker, Form, Input, Modal, Select, Switch, Table, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useAppStore } from '../store/useAppStore';
import type { ChangeRecord, RiskLevel, WorkStatus } from '../types';
import { WORK_STATUSES } from '../config/gates';
import StatusBadge from '../components/StatusBadge';

const AFFECTED_AREAS = [
  'Artwork', 'Formula', 'Label', 'Claim', 'Supplier', 'Process', 'Packaging', 'Market',
  'Formula / Supplier', 'Other',
];

interface ChangeForm {
  trigger: string;
  projectId?: string;
  productSku: string;
  affectedArea: string;
  oldVersion?: string;
  riskLevel: RiskLevel;
  requiredAction?: string;
  requiredSignOffs?: string;
  communicationRequired: boolean;
  salesMarketingMessage?: string;
  dueDate?: Dayjs;
  owner: string;
}

export default function ChangeControl() {
  const changes = useAppStore((s) => s.changes);
  const projects = useAppStore((s) => s.projects);
  const addChange = useAppStore((s) => s.addChange);
  const setChange = useAppStore((s) => s.setChange);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<ChangeForm>();

  const onCreate = async () => {
    const values = await form.validateFields();
    const nextNumber = changes.length + 1;
    const record: ChangeRecord = {
      ...values,
      changeId: `CHG-${String(nextNumber).padStart(3, '0')}`,
      dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : undefined,
      status: 'Not Started',
    };
    addChange(record);
    message.success(`Change ${record.changeId} opened`);
    setOpen(false);
    form.resetFields();
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Alert
        type="warning"
        showIcon
        message="No silent corrections"
        description="Artwork, formula, label, claim, supplier, process and market changes must be recorded here with a trigger, owner, impact assessment, approval, communication and closure evidence."
      />

      <Card
        size="small"
        title="Change Control & Communication Log"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            Open Change Request
          </Button>
        }
      >
        <Table
          size="small"
          rowKey={(c) => c.changeId}
          dataSource={changes}
          scroll={{ x: 1300 }}
          columns={[
            { title: 'Change ID', width: 100, dataIndex: 'changeId', render: (v) => <b>{v}</b> },
            { title: 'Trigger / event', width: 240, dataIndex: 'trigger' },
            { title: 'Product / SKU', width: 200, dataIndex: 'productSku' },
            { title: 'Affected area', width: 140, dataIndex: 'affectedArea' },
            {
              title: 'Risk',
              width: 90,
              dataIndex: 'riskLevel',
              render: (v) => <StatusBadge value={v} />,
            },
            { title: 'Required action', width: 240, dataIndex: 'requiredAction', ellipsis: true },
            { title: 'Sign-offs', width: 160, dataIndex: 'requiredSignOffs', ellipsis: true },
            {
              title: 'Comms',
              width: 90,
              render: (_, c) => (c.communicationRequired ? 'Required' : '—'),
            },
            { title: 'Due', width: 110, dataIndex: 'dueDate' },
            {
              title: 'Status',
              width: 150,
              render: (_, c) => (
                <Select
                  size="small"
                  style={{ width: 140 }}
                  value={c.status}
                  options={WORK_STATUSES.map((s) => ({ value: s, label: s }))}
                  onChange={(v: WorkStatus) =>
                    setChange(c.changeId, {
                      status: v,
                      closedDate: v === 'Completed' ? dayjs().format('YYYY-MM-DD') : undefined,
                    })
                  }
                />
              ),
            },
            { title: 'Closed', width: 110, dataIndex: 'closedDate' },
            { title: 'Owner', width: 130, dataIndex: 'owner' },
            { title: 'Notes', width: 200, dataIndex: 'notes', ellipsis: true },
          ]}
        />
      </Card>

      <Modal
        title="Open Change Request"
        open={open}
        onOk={onCreate}
        onCancel={() => setOpen(false)}
        okText="Open change"
        width={680}
      >
        <Form form={form} layout="vertical" initialValues={{ riskLevel: 'Medium', communicationRequired: true }}>
          <Form.Item name="trigger" label="Trigger / event" rules={[{ required: true }]}>
            <Input placeholder="What changed and why?" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="projectId" label="Project">
              <Select
                allowClear
                options={projects.map((p) => ({ value: p.identity.id, label: `${p.identity.id} — ${p.identity.productSku}` }))}
                onChange={(v) => {
                  const p = projects.find((x) => x.identity.id === v);
                  if (p) form.setFieldValue('productSku', p.identity.productSku);
                }}
              />
            </Form.Item>
            <Form.Item name="productSku" label="Product / SKU" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="affectedArea" label="Affected area" rules={[{ required: true }]}>
              <Select options={AFFECTED_AREAS.map((a) => ({ value: a, label: a }))} />
            </Form.Item>
            <Form.Item name="riskLevel" label="Risk level" rules={[{ required: true }]}>
              <Select options={['Low', 'Medium', 'High'].map((r) => ({ value: r, label: r }))} />
            </Form.Item>
            <Form.Item name="oldVersion" label="Old version">
              <Input placeholder="e.g. F1.0 / AW-03" />
            </Form.Item>
            <Form.Item name="dueDate" label="Due date">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="owner" label="Owner" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="requiredSignOffs" label="Required sign-offs">
              <Input placeholder="e.g. R&I, Safety, Regulatory" />
            </Form.Item>
          </div>
          <Form.Item name="requiredAction" label="Required action / impact assessment">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="communicationRequired"
            label="Sales / Marketing communication required"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item name="salesMarketingMessage" label="Sales / Marketing message">
            <Input.TextArea rows={2} placeholder="Customer-facing explanation if applicable" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
