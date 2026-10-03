import { useMemo, useState } from 'react';
import UserSelect from '../components/UserSelect';
import ChangeDispositionBlock from '../components/ChangeDispositionBlock';
import { isChangeDispositionRecorded, missingDispositionFields } from '@mbc360/shared/utils/changeImpact';
import { AutoComplete, Button, DatePicker, Form, Input, Select, Switch, message, Tooltip } from 'antd';
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
  type ChangeTriggerCategory,
  type RaciRole,
} from '@mbc360/shared/config/changeTriggers';
import StatusBadge from '../components/StatusBadge';
import { useDraft } from '../hooks/useDraft';
import SaveBar from '../components/SaveBar';
import RecordList, { RecordField } from '../components/RecordList';
import '../styles/concept.css';
import '../components/DynamicTable.css';
import './ChangeControl.css';

import FormDrawer from '../components/FormDrawer';
import TriggerReference, { AffectedGates } from '../components/TriggerReference';
const AFFECTED_AREAS = [
  'Artwork', 'Formula', 'Label', 'Claim', 'Supplier', 'Process', 'Packaging', 'Market',
  'Formula / Supplier', 'Other',
];

const TRIGGER_CATEGORIES: ChangeTriggerCategory[] = ['Formula', 'Artwork / Label', 'PIF / Evidence'];

// Tone on the role tag only (concept rule: colour carries state on the tag).
const RACI_ROLE_TONE: Record<RaciRole, string> = {
  Accountable: ' c-tag-bad',
  Responsible: '',
  Approver: ' c-tag-ok',
  'Informed / acknowledgement': '',
};

const triggerSelectOptions = TRIGGER_CATEGORIES.map((cat) => ({
  label: cat,
  options: CHANGE_TRIGGERS.filter((t) => t.category === cat).map((t) => ({ value: t.id, label: t.label })),
}));

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
    // Highest existing CHG number + 1, not `changes.length + 1`: a count repeats
    // an id as soon as any record is missing from the list (removed, or not
    // loaded), and a change id is the record's reference everywhere else.
    const nextNumber =
      changes.reduce((max, c) => {
        const n = /^CHG-(\d+)$/.exec(c.changeId ?? '')?.[1];
        return n ? Math.max(max, Number(n)) : max;
      }, 0) + 1;
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

  const openCount = draft.filter((c) => isChangeOpen(c.status)).length;
  const projectLabel = (id?: string) => {
    if (!id) return undefined;
    const p = projects.find((x) => x.identity.id === id);
    return p ? `${p.identity.id} — ${p.identity.productSku}` : id;
  };
  // What makes a change hold Gate 11 (rule E3(b), Round 4 question 34(c)): an
  // open change nobody has classified, or a closed one without its final
  // disposition. The old table kept the disposition always expanded so this
  // never needed a click; in the list it is the row's flag and subtitle instead.
  const gate11Issue = (c: ChangeRecord): string | undefined => {
    if (isChangeOpen(c.status)) {
      return (c.impactAreas ?? []).length === 0 ? 'Impact not classified — blocks Gate 11' : undefined;
    }
    if (isChangeDispositionRecorded(c)) return undefined;
    return `Final disposition: ${missingDispositionFields(c).length} missing — blocks Gate 11`;
  };

  const statusSelect = (c: ChangeRecord) => (
    <Select
      style={{ width: '100%' }}
      value={c.status}
      aria-label="Status"
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
  );

  const dlRow = (label: string, value: React.ReactNode) => (
    <div className="rt-dl-row">
      <dt>{label}</dt>
      <dd>{value === undefined || value === null || value === '' ? <span className="rt-muted">—</span> : value}</dd>
    </div>
  );

  const actions = (
    <>
      {/* On a phone the label collapses to the icon so both actions fit one
          row under the title; the tooltip and aria-label keep the name. */}
      <Tooltip title="Trigger reference">
        <Button icon={<SearchOutlined />} aria-label="Trigger reference" onClick={() => setRefOpen(true)}>
          <span className="cc-btn-text">Trigger reference</span>
        </Button>
      </Tooltip>
      <Button type="primary" icon={<PlusOutlined />} onClick={openNewChangeModal}>
        Open Change Request
      </Button>
    </>
  );

  return (
    <div className="concept cc">
      <header className="cc-header">
        <div className="cc-title-row">
          <h1 className="cc-title">Change Control</h1>
          {openCount > 0 ? (
            <span className="c-tag c-tag-dot c-tag-warn">{openCount} open</span>
          ) : (
            <span className="c-tag c-tag-dot c-tag-ok">Nothing open</span>
          )}
          <div className="cc-actions">{actions}</div>
        </div>
        <p className="cc-meta">
          Change Control &amp; Communication Log · {draft.length} {draft.length === 1 ? 'change' : 'changes'} across all
          projects
        </p>
        <p className="cc-desc">
          <b>No silent corrections.</b> Artwork, formula, label, claim, supplier, process and market changes must be
          recorded here with a trigger, owner, impact assessment, approval, communication and closure evidence.
        </p>
      </header>

      {draft.length === 0 ? (
        <div className="c-card cc-empty">
          <div className="cc-empty-title">No change requests yet</div>
          <p className="cc-empty-text">
            Open one whenever an artwork, formula, label, claim, supplier, process or market change is proposed —
            before the change is made, not after.
          </p>
          <Button type="primary" icon={<PlusOutlined />} onClick={openNewChangeModal}>
            Open Change Request
          </Button>
        </div>
      ) : (
        <RecordList<ChangeRecord>
          title="Change Control & Communication Log"
          description="Open a change to see every field. Status, impact classification and the final disposition are edited in place and saved together."
          count={`${openCount} open of ${draft.length}`}
          rows={draft}
          rowKey={(c) => c.changeId}
          rowTitle={(c) => (
            <>
              <span className="cc-id">{c.changeId}</span> {c.trigger || <span className="rt-muted">No trigger recorded</span>}
            </>
          )}
          rowSubtitle={(c) => {
            const issue = gate11Issue(c);
            return (
              <>
                {[c.productSku, c.affectedArea].filter(Boolean).join(' · ') || '—'}
                {issue && <span className="cc-issue"> · {issue}</span>}
              </>
            );
          }}
          rowFlag={(c) => gate11Issue(c) !== undefined}
          inline={[
            { label: 'Risk', width: 96, render: (c) => <StatusBadge value={c.riskLevel} /> },
            { label: 'Status', width: 248, render: (c) => statusSelect(c) },
          ]}
          drawerTitle={(c) => (
            <>
              {c.changeId} · {c.trigger || 'No trigger recorded'}
            </>
          )}
          drawer={(c) => {
            const t = getChangeTrigger(c.triggerId);
            return (
              <>
                <div>
                  <div className="rt-sec-title">Change</div>
                  <dl className="rt-dl">
                    {dlRow('Trigger / event', c.trigger)}
                    {dlRow('Affected gates / phases', t ? <AffectedGates gates={t.gates} /> : undefined)}
                    {dlRow('Project', projectLabel(c.projectId))}
                    {dlRow('Product / SKU', c.productSku)}
                    {dlRow('Affected area', c.affectedArea)}
                    {dlRow('Old version', c.oldVersion)}
                    {dlRow('Risk', <StatusBadge value={c.riskLevel} />)}
                    {dlRow('Owner', c.owner)}
                    {dlRow('Due', c.dueDate)}
                    {dlRow('Closed', c.closedDate)}
                  </dl>
                </div>

                <div>
                  <div className="rt-sec-title">Status &amp; impact</div>
                  <div className="rt-grid">
                    <RecordField label="Status">{statusSelect(c)}</RecordField>
                    {/* Editable here, not only on the create form: rule E3(b) makes
                        an UNCLASSIFIED open change block Gate 11, and every change
                        that existed before this field did is unclassified. Without
                        an editor those would block the gate with nowhere to fix
                        them — an unsatisfiable blocker, the exact failure the
                        readiness sweeps exist to catch. */}
                    <RecordField label="Impact (Gate 11)" wide>
                      <Select
                        mode="multiple"
                        allowClear
                        style={{ width: '100%' }}
                        placeholder="Not classified — blocks Gate 11"
                        status={(c.impactAreas ?? []).length === 0 ? 'warning' : undefined}
                        value={c.impactAreas ?? []}
                        options={CHANGE_IMPACT_AREAS.map((a) => ({ value: a, label: a }))}
                        onChange={(v: string[]) => patchChange(c.changeId, { impactAreas: v })}
                      />
                    </RecordField>
                  </div>
                </div>

                <div>
                  <div className="rt-sec-title">Action &amp; communication</div>
                  <dl className="rt-dl">
                    {dlRow('Required action', c.requiredAction)}
                    {dlRow('Required sign-offs', c.requiredSignOffs)}
                    {dlRow('Evidence link', c.evidenceLink)}
                    {dlRow('Comms', c.communicationRequired ? 'Required' : undefined)}
                    {dlRow('Sales / Marketing message', c.salesMarketingMessage)}
                    {dlRow('Notes', c.notes)}
                  </dl>
                </div>

                {/* Round 4 question 34(c): the seven parts of a final disposition. */}
                <div>
                  <div className="rt-sec-title">Final disposition</div>
                  <ChangeDispositionBlock change={c} onChange={(p) => patchChange(c.changeId, p)} />
                </div>
              </>
            );
          }}
          footer={
            dirty && (
              <div className="rt-savebar">
                <div>
                  <SaveBar dirty={dirty} onSave={saveChanges} onDiscard={discard} />
                </div>
              </div>
            )
          }
        />
      )}

      <FormDrawer
        title="Change trigger reference — affected gates & phases"
        open={refOpen}
        onCancel={() => setRefOpen(false)}
        footer={null}
        width={720}
      >
        <TriggerReference categories={TRIGGER_CATEGORIES} />
      </FormDrawer>

      <section className="c-card cc-raci">
        <div className="cc-raci-head">
          <h2 className="cc-raci-title">RACI / Closure control</h2>
          <p className="cc-raci-sub">Who must contribute before a change can close</p>
        </div>
        <ul className="cc-raci-list">
          {CHANGE_RACI.map((r) => (
            <li key={r.functionName}>
              <div className="cc-raci-name">
                <b>{r.functionName}</b>
                <span className={`c-tag${RACI_ROLE_TONE[r.role]}`}>{r.role}</span>
              </div>
              <div className="cc-raci-text">{r.contribution}</div>
              <div className="cc-raci-ev">{r.linkedEvidence}</div>
            </li>
          ))}
        </ul>
      </section>

      <FormDrawer
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
              <AffectedGates gates={selectedTrigger.gates} />
            </Form.Item>
          )}
          <div className="cc-form-grid">
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
      </FormDrawer>
    </div>
  );
}
