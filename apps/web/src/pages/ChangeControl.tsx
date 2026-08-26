import { useMemo, useState } from 'react';
import UserSelect from '../components/UserSelect';
import ChangeDispositionBlock from '../components/ChangeDispositionBlock';
import { isChangeDispositionRecorded, missingDispositionFields } from '@mbc360/shared/utils/changeImpact';
import { Alert, AutoComplete, Button, Card, DatePicker, Form, Input, Modal, Select, Space, Switch, Table, Tag, message } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useAppStore } from '../store/useAppStore';
import type { ChangeRecord, ChangeStatus, RiskLevel } from '@mbc360/shared/types';
import {
  CHANGE_RACI,
  CHANGE_STATUSES,
  CHANGE_TRIGGERS,
  CHANGE_IMPACT_AREAS,
  getChangeTrigger,
  isChangeOpen,
  phaseShortLabel,
  triggerPhases,
  type ChangeTriggerCategory,
  type RaciRole,
} from '@mbc360/shared/config/changeTriggers';
import StatusBadge from '../components/StatusBadge';
import { useDraft } from '../hooks/useDraft';
import SaveBar from '../components/SaveBar';
import { TEXT, TABLE_STICKY } from '../theme/tokens';

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
  const setChangesBulk = useAppStore((s) => s.setChangesBulk);
  // The project the sidebar is currently pinned to (2026-08-26, user-requested):
  // opening "Open Change Request" from inside a project's workspace should not
  // make someone re-pick the project they were just looking at.
  const activeProjectId = useAppStore((s) => s.activeProjectId);
  const { draft, dirty, update, markSaved, discard } = useDraft(changes);
  const [open, setOpen] = useState(false);
  const [refOpen, setRefOpen] = useState(false);
  const [form] = Form.useForm<ChangeForm>();
  const selectedTriggerId = Form.useWatch('triggerId', form);
  const selectedTrigger = getChangeTrigger(selectedTriggerId);
  // "Old version" is what this change supersedes. The project's real versions are
  // known — the formula's from its version history, artwork's from the Packaging
  // Specs & Artwork register — so offer them rather than making someone remember
  // the exact string. AutoComplete, not Select: the field is descriptive, and a
  // change may supersede something neither list holds (a supplier spec revision,
  // a document rev). Suggesting is right here; constraining would not be.
  const selectedProjectId = Form.useWatch('projectId', form);
  const oldVersionOptions = useMemo(() => {
    const p = projects.find((x) => x.identity.id === selectedProjectId);
    if (!p) return [];
    const formula = [p.formulaVersion, ...p.formulaVersionHistory.map((v) => v.version)];
    const artwork = (p.registers['packagingSpecsArtwork'] ?? []).map((r) => String(r.artworkVersion ?? ''));
    const uniq = (xs: string[]) => [...new Set(xs.map((x) => x.trim()).filter(Boolean))];
    return [
      { label: 'Formula version', options: uniq(formula).map((v) => ({ value: v })) },
      { label: 'Artwork / label version', options: uniq(artwork).map((v) => ({ value: v })) },
    ].filter((g) => g.options.length > 0);
  }, [projects, selectedProjectId]);

  // Default is Yes (see initialValues); only hide the message when explicitly No.
  const commRequired = Form.useWatch('communicationRequired', form) !== false;

  // `form`'s `initialValues` only apply once, at first mount — reopening the
  // Modal later would not pick up a since-changed active project, so the
  // Project (and its dependent Product/SKU) are set explicitly on every open
  // instead. `activeProjectId` may point at a project that no longer exists
  // (deleted, or never set) — falls back to leaving the field blank rather
  // than crashing on a `.find()` that returns undefined.
  const openNewChangeModal = () => {
    const activeProject = projects.find((p) => p.identity.id === activeProjectId);
    form.setFieldsValue({
      projectId: activeProject?.identity.id,
      productSku: activeProject?.identity.productSku,
    });
    setOpen(true);
  };

  const onCreate = async () => {
    const values = await form.validateFields();
    const nextNumber = changes.length + 1;
    const trig = getChangeTrigger(values.triggerId);
    const record: ChangeRecord = {
      ...values,
      changeId: `CHG-${String(nextNumber).padStart(3, '0')}`,
      trigger: trig?.label ?? '',
      dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : undefined,
      status: 'Draft',
    };
    addChange(record);
    message.success(`Change ${record.changeId} opened`);
    setOpen(false);
    form.resetFields();
  };

  const patchChange = (changeId: string, patch: Partial<ChangeRecord>) =>
    update((prev) => prev.map((c) => (c.changeId === changeId ? { ...c, ...patch } : c)));
  const saveChanges = () => {
    setChangesBulk(draft);
    markSaved();
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Alert
        type="warning"
        showIcon
        title="No silent corrections"
        description="Artwork, formula, label, claim, supplier, process and market changes must be recorded here with a trigger, owner, impact assessment, approval, communication and closure evidence."
      />

      <Card
        size="small"
        title="Change Control & Communication Log"
        extra={
          <Space>
            <Button size="small" icon={<SearchOutlined />} onClick={() => setRefOpen(true)}>
              Trigger reference
            </Button>
            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openNewChangeModal}>
              Open Change Request
            </Button>
          </Space>
        }
      >
        <Table
          size="small"
          rowKey={(c) => c.changeId}
          dataSource={draft}
          sticky={TABLE_STICKY}
          scroll={{ x: 2260 }}
          // Round 4 question 34(c). Always expanded and not user-toggleable, the
          // same pattern the Gate Flow table uses for its readiness panel: a change
          // that silently blocks Gate 11 is exactly what should not need a click to
          // discover.
          expandable={{
            showExpandColumn: false,
            expandedRowKeys: draft.filter((c) => !isChangeOpen(c.status)).map((c) => c.changeId),
            expandedRowRender: (c) => (
              <ChangeDispositionBlock change={c} onChange={(p) => patchChange(c.changeId, p)} />
            ),
          }}
          columns={[
            { title: 'Change ID', width: 100, dataIndex: 'changeId', fixed: 'left', render: (v) => <b>{v}</b> },
            { title: 'Trigger / event', width: 240, dataIndex: 'trigger' },
            {
              title: 'Affected gates / phases',
              width: 260,
              render: (_, c) => {
                const t = getChangeTrigger(c.triggerId);
                return t ? <AffectedTags gates={t.gates} /> : <span style={{ color: TEXT.disabled }}>—</span>;
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
            {
              // Editable in the table, not only on the create form: rule E3(b) makes an
              // UNCLASSIFIED open change block Gate 11, and every change that existed
              // before this column did is unclassified. Without an inline editor those
              // would block the gate with nowhere to fix them — an unsatisfiable blocker,
              // the exact failure the readiness sweeps exist to catch.
              title: 'Impact (Gate 11)',
              width: 260,
              render: (_, c) => (
                <Select
                  mode="multiple"
                  allowClear
                  style={{ width: 245 }}
                  placeholder="Not classified — blocks Gate 11"
                  status={(c.impactAreas ?? []).length === 0 ? 'warning' : undefined}
                  value={c.impactAreas ?? []}
                  options={CHANGE_IMPACT_AREAS.map((a) => ({ value: a, label: a }))}
                  onChange={(v: string[]) => patchChange(c.changeId, { impactAreas: v })}
                />
              ),
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
              width: 235,
              render: (_, c) => (
                <Select
                  style={{ width: 220 }}
                  value={c.status}
                  options={CHANGE_STATUSES.map((s) => ({ value: s, label: s }))}
                  onChange={(v: ChangeStatus) =>
                    patchChange(c.changeId, {
                      status: v,
                      closedDate:
                        v === 'Completed' || v === 'Rejected' || v === 'Cancelled' || v === 'Superseded'
                          ? dayjs().format('YYYY-MM-DD')
                          : undefined,
                    })
                  }
                />
              ),
            },
            // Round 4 question 34(c): the seven parts of a final disposition are
            // edited in the expandable row below, not as seven more columns — this
            // table is already 2260px wide. The column here reports whether the
            // disposition is complete, which is what decides Gate 11.
            {
              title: 'Final disposition',
              width: 150,
              render: (_, c) =>
                isChangeOpen(c.status) ? (
                  <span style={{ color: TEXT.secondary }}>—</span>
                ) : isChangeDispositionRecorded(c) ? (
                  <Tag color="green">Recorded</Tag>
                ) : (
                  <Tag color="orange">{missingDispositionFields(c).length} missing</Tag>
                ),
            },
            { title: 'Closed', width: 110, dataIndex: 'closedDate' },
            { title: 'Owner', width: 130, dataIndex: 'owner' },
            { title: 'Notes', width: 200, dataIndex: 'notes', ellipsis: true, render: (v) => v || '—' },
          ]}
        />
        <SaveBar dirty={dirty} onSave={saveChanges} onDiscard={discard} />
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
          // NOT `sticky`: inside a Modal the scroll container is the modal
          // body, while antd's sticky header pins against the VIEWPORT at
          // offsetHeader — so the header detached and floated across the middle
          // of the list. `scroll.y` is the in-modal equivalent: the table gets
          // its own scroll area with the header pinned to the top of it, and
          // the 19-row reference stops making the modal taller than the screen.
          scroll={{ x: 1200, y: '58vh' }}
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
          sticky={TABLE_STICKY}
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
            {/* Every trigger is offered for every project, whatever gate it is
                at — not filtered against how far the project has actually
                progressed (2026-08-26, user-raised: a project at Gate 2
                picking a Gate 10 trigger has nothing there yet to change,
                while a project past Gate 5/8 reopening a Gate 5/8 trigger is
                exactly what Change Control is for, so the filter — if any —
                must compare against the highest gate PASSED, not just
                disallow "not the current gate"). Left unrestricted for now
                [ASSUMPTION: R5-Q17]. */}
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
            {/* Rule E3(b): Gate 11 "must evaluate the impact classification … of each
                open Change Control". Required, because an unclassified open change
                blocks Gate 11 — there is nothing for the gate to evaluate. */}
            <Form.Item
              name="impactAreas"
              label="Impact classification"
              rules={[{ required: true, message: 'Classify the impact — Gate 11 evaluates this' }]}
              extra="What this change affects. Launch-impacting or high risk hard-blocks Gate 11; administrative only may pass with conditions."
            >
              <Select
                mode="multiple"
                allowClear
                options={CHANGE_IMPACT_AREAS.map((a) => ({ value: a, label: a }))}
              />
            </Form.Item>
            <Form.Item name="riskLevel" label="Risk level" rules={[{ required: true }]}>
              <Select options={['Low', 'Medium', 'High'].map((r) => ({ value: r, label: r }))} />
            </Form.Item>
            <Form.Item name="oldVersion" label="Old version">
              <AutoComplete
                options={oldVersionOptions}
                placeholder={
                  selectedProjectId
                    ? oldVersionOptions.length > 0
                      ? 'Pick a version, or type another'
                      : 'No versions recorded on this project yet — type one'
                    : 'Select a project first, or type a version'
                }
                filterOption={(input, option) => {
                  // Options are grouped, so antd passes group nodes here too — a group
                  // has no `value` and must not be filtered out by it, or its whole
                  // section disappears while typing.
                  const value = (option as { value?: string } | undefined)?.value;
                  return value === undefined || value.toLowerCase().includes(input.toLowerCase());
                }}
              />
            </Form.Item>
            <Form.Item name="dueDate" label="Due date">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="owner" label="Owner" rules={[{ required: true }]}>
              <UserSelect onChange={() => {}} />
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
