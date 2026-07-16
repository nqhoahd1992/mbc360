import { useState } from 'react';
import { Alert, Button, Card, DatePicker, Form, Input, Modal, Select, Space, Switch, Table, Tag, message } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useAppStore } from '../store/useAppStore';
import type { ChangeRecord, RiskLevel, WorkStatus } from '@mbc360/shared/types';
import { WORK_STATUSES } from '@mbc360/shared/config/gates';
import {
  CHANGE_RACI,
  CHANGE_TRIGGERS,
  getChangeTrigger,
  phaseShortLabel,
  triggerPhases,
  type ChangeTriggerCategory,
  type RaciRole,
} from '@mbc360/shared/config/changeTriggers';
import StatusBadge from '../components/StatusBadge';

const AFFECTED_AREAS = [
  'Artwork', 'Formula', 'Label', 'Claim', 'Supplier', 'Process', 'Packaging', 'Market',
  'Formula / Supplier', 'Other',
];

const TRIGGER_CATEGORIES: ChangeTriggerCategory[] = ['Formula', 'Artwork / Label', 'PIF / Evidence'];

const RACI_ROLE_COLOR: Record<RaciRole, string> = {
  Accountable: 'red',
  Responsible: 'blue',
  Approver: 'green',
  'Informed / acknowledgement': 'default',
};

const triggerSelectOptions = TRIGGER_CATEGORIES.map((cat) => ({
  label: cat,
  options: CHANGE_TRIGGERS.filter((t) => t.category === cat).map((t) => ({ value: t.id, label: t.label })),
}));

// Affected gates + phases, derived from a trigger's gate list.
function AffectedTags({ gates }: { gates: string[] }) {
  const phases = triggerPhases(gates);
  const spansAll = gates.includes('ALL');
  return (
    <Space size={[4, 4]} wrap>
      {spansAll ? (
        <Tag color="red">All gates</Tag>
      ) : (
        gates.map((g) => (
          <Tag key={g} color="blue">
            Gate {g}
          </Tag>
        ))
      )}
      {phases.map((p) => (
        <Tag key={p} color="geekblue">
          {phaseShortLabel(p)}
        </Tag>
      ))}
    </Space>
  );
}

interface ChangeForm {
  triggerId?: string;
  projectId?: string;
  productSku: string;
  affectedArea: string;
  oldVersion?: string;
  riskLevel: RiskLevel;
  requiredAction?: string;
  evidenceLink?: string;
  requiredSignOffs?: string;
  communicationRequired: boolean;
  salesMarketingMessage?: string;
  dueDate?: Dayjs;
  owner: string;
  notes?: string;
}

export default function ChangeControl() {
  const changes = useAppStore((s) => s.changes);
  const projects = useAppStore((s) => s.projects);
  const addChange = useAppStore((s) => s.addChange);
  const setChange = useAppStore((s) => s.setChange);
  const [open, setOpen] = useState(false);
  const [refOpen, setRefOpen] = useState(false);
  const [form] = Form.useForm<ChangeForm>();
  const selectedTriggerId = Form.useWatch('triggerId', form);
  const selectedTrigger = getChangeTrigger(selectedTriggerId);
  // Default is Yes (see initialValues); only hide the message when explicitly No.
  const commRequired = Form.useWatch('communicationRequired', form) !== false;

  const onCreate = async () => {
    const values = await form.validateFields();
    const nextNumber = changes.length + 1;
    const trig = getChangeTrigger(values.triggerId);
    const record: ChangeRecord = {
      ...values,
      changeId: `CHG-${String(nextNumber).padStart(3, '0')}`,
      trigger: trig?.label ?? '',
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
          <Space>
            <Button icon={<SearchOutlined />} onClick={() => setRefOpen(true)}>
              Trigger reference
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
              Open Change Request
            </Button>
          </Space>
        }
      >
        <Table
          size="small"
          rowKey={(c) => c.changeId}
          dataSource={changes}
          scroll={{ x: 2260 }}
          columns={[
            { title: 'Change ID', width: 100, dataIndex: 'changeId', render: (v) => <b>{v}</b> },
            { title: 'Trigger / event', width: 240, dataIndex: 'trigger' },
            {
              title: 'Affected gates / phases',
              width: 260,
              render: (_, c) => {
                const t = getChangeTrigger(c.triggerId);
                return t ? <AffectedTags gates={t.gates} /> : <span style={{ color: '#bbb' }}>—</span>;
              },
            },
            { title: 'Product / SKU', width: 200, dataIndex: 'productSku' },
            { title: 'Affected area', width: 140, dataIndex: 'affectedArea' },
            { title: 'Old version', width: 110, dataIndex: 'oldVersion', render: (v) => v || '—' },
            {
              title: 'Risk',
              width: 90,
              dataIndex: 'riskLevel',
              render: (v) => <StatusBadge value={v} />,
            },
            { title: 'Required action', width: 240, dataIndex: 'requiredAction', ellipsis: true },
            { title: 'Evidence link', width: 130, dataIndex: 'evidenceLink', ellipsis: true, render: (v) => v || '—' },
            { title: 'Sign-offs', width: 160, dataIndex: 'requiredSignOffs', ellipsis: true },
            {
              title: 'Comms',
              width: 90,
              render: (_, c) => (c.communicationRequired ? 'Required' : '—'),
            },
            { title: 'Sales / Marketing message', width: 200, dataIndex: 'salesMarketingMessage', ellipsis: true, render: (v) => v || '—' },
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
            { title: 'Closure evidence', width: 160, dataIndex: 'closureEvidence', ellipsis: true, render: (v) => v || '—' },
            { title: 'Closed', width: 110, dataIndex: 'closedDate' },
            { title: 'Owner', width: 130, dataIndex: 'owner' },
            { title: 'Notes', width: 200, dataIndex: 'notes', ellipsis: true, render: (v) => v || '—' },
          ]}
        />
      </Card>

      <Modal
        title="Change trigger reference — affected gates & phases"
        open={refOpen}
        onCancel={() => setRefOpen(false)}
        footer={null}
        width={1040}
      >
        <Table
          size="small"
          rowKey={(t) => t.id}
          dataSource={CHANGE_TRIGGERS}
          pagination={false}
          scroll={{ x: 1200 }}
          columns={[
            {
              title: 'Category',
              width: 130,
              dataIndex: 'category',
              render: (v) => <Tag>{v}</Tag>,
              filters: TRIGGER_CATEGORIES.map((c) => ({ text: c, value: c })),
              onFilter: (v, t) => t.category === v,
            },
            { title: 'Trigger', width: 240, dataIndex: 'label', render: (v) => <b>{v}</b> },
            { title: 'Examples', width: 240, dataIndex: 'examples', render: (v) => v ?? '—' },
            { title: 'Affected gates / phases', width: 280, render: (_, t) => <AffectedTags gates={t.gates} /> },
            { title: 'Owner', width: 150, dataIndex: 'owner' },
            { title: 'Required sign-offs', width: 200, dataIndex: 'signOffs', render: (v) => v ?? '—' },
          ]}
        />
      </Modal>

      <Card
        size="small"
        title="RACI / Closure control — who must contribute before a change can close"
      >
        <Table
          size="small"
          rowKey={(r) => r.functionName}
          dataSource={CHANGE_RACI}
          pagination={false}
          scroll={{ x: 900 }}
          columns={[
            { title: 'Function', width: 160, dataIndex: 'functionName', render: (v) => <b>{v}</b> },
            {
              title: 'Role',
              width: 190,
              dataIndex: 'role',
              render: (v: RaciRole) => <Tag color={RACI_ROLE_COLOR[v]}>{v}</Tag>,
            },
            { title: 'Required contribution', width: 300, dataIndex: 'contribution' },
            { title: 'Linked evidence / sheet', width: 260, dataIndex: 'linkedEvidence' },
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
          <Form.Item name="triggerId" label="Trigger / event" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Select the change trigger"
              options={triggerSelectOptions}
              onChange={(id) => {
                const t = getChangeTrigger(id);
                if (t) {
                  form.setFieldsValue({
                    requiredAction: t.action,
                    requiredSignOffs: t.signOffs,
                  });
                }
              }}
            />
          </Form.Item>
          {selectedTrigger && (
            <Form.Item label="Affected gates & phases">
              <AffectedTags gates={selectedTrigger.gates} />
            </Form.Item>
          )}
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
            <Form.Item name="evidenceLink" label="Evidence link">
              <Input placeholder="link / folder" />
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
          {commRequired && (
            <Form.Item name="salesMarketingMessage" label="Sales / Marketing message" preserve={false}>
              <Input.TextArea rows={2} placeholder="Customer-facing explanation if applicable" />
            </Form.Item>
          )}
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
