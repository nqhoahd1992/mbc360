import { useState } from 'react';
import DrawerTabs from '../components/DrawerTabs';
import { Button, DatePicker, Drawer, Empty, Form, Grid, Input, Select, message } from 'antd';
import dayjs from 'dayjs';
import ChoiceSelect from '../components/ChoiceSelect';
import { InboxOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import type { CapaRecord, RiskLevel } from '@mbc360/shared/types';
import { isDoneStatus } from '@mbc360/shared/utils/doneStatus';
import { RISK_LEVELS } from '@mbc360/shared/types';
import { CAPA_STATUSES } from '@mbc360/shared/config/gates';
import UserSelect from '../components/UserSelect';
import ChangeRefSelect from '../components/ChangeRefSelect';
import SelfAttestField from '../components/SelfAttestField';
import {
  CHANGE_DECISIONS,
  CHANGE_DECISION_RAISED,
  ESCALATION_DECISIONS,
  POST_MARKET_CATEGORIES,
  POST_MARKET_SIGNIFICANCE,
} from '@mbc360/shared/config/postMarketReview';
import { capaFindingGaps, capaTriageGaps, isPerformanceFinding } from '@mbc360/shared/utils/postMarketReview';
import { patchArray, useDraft } from '../hooks/useDraft';
import { useExclusiveDrawer } from '../hooks/exclusiveDrawer';
import DrawerSaveFooter from '../components/DrawerSaveFooter';
import { useCloseDrawerOnPageSave } from '../hooks/useCloseDrawerOnPageSave';
import SaveBar from '../components/SaveBar';
import '../styles/concept.css';
import './AdminUsers.css';
import './PostMarketCapa.css';

import FormDrawer from '../components/FormDrawer';
// The original sixteen-option list. Round 4 question 10 confirmed it "mixes
// source, issue type and action" and the Gate 12 checklist was split into three
// accordingly (config/phases.ts) — but this per-record field was not, so it
// still mixes them. Splitting it changes the record's data shape (new columns, a
// migration), which is deliberately a separate piece of work from this screen.
const EVENT_TYPES = [
  'Consumer feedback', 'HCP feedback', 'Distributor feedback', 'Retailer feedback',
  'Sales feedback', 'Social media feedback', 'Complaint', 'Adverse event / PV signal',
  'PMS trend', 'Claim question', 'Packaging issue', 'Formula issue', 'Quality issue',
  'FAQ update', 'CAPA', 'Product optimisation',
];

type Filter = 'all' | 'open' | 'high' | 'completed';

interface CapaForm {
  market: string;
  eventType: string;
  summary: string;
  severity: RiskLevel;
  owner: string;
  notes?: string;
  productSku?: string;
  investigationLink?: string;
  capaLink?: string;
  pifPmfImpact?: string;
}

const isOpen = (r: CapaRecord) => !isDoneStatus(r.status);
const isHigh = (r: CapaRecord) => r.severity === 'High' || r.severity === 'Critical';

// PM-NNN from the highest number in use, not from the count: a count-based id
// repeats once a record is ever removed (the same fix as the CHG / FC / FB ids).
function nextRecordId(records: CapaRecord[]): string {
  const max = records.reduce((m, r) => {
    const n = Number(/^PM-(\d+)$/.exec(r.id)?.[1] ?? 0);
    return n > m ? n : m;
  }, 0);
  return `PM-${String(max + 1).padStart(3, '0')}`;
}

// Post-market events (Gate 12). 2026-10-02 redesign (wireframe option A): the
// 1000px table with in-cell Status / Notes became one row per record — summary
// on two lines, severity, status, owner — with chips for open / high-or-critical
// / completed and a drawer where Status, Owner and Notes are edited. Saving is
// unchanged: one local draft, one Save.
export default function PostMarketCapa() {
  const { projectId } = useParams();
  const screens = Grid.useBreakpoint();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const addCapa = useAppStore((s) => s.addCapa);
  const setCapaBulk = useAppStore((s) => s.setCapaBulk);
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [form] = Form.useForm<CapaForm>();
  const { draft, dirty, update, markSaved, discard } = useDraft(project?.capa ?? []);
  useExclusiveDrawer(openId !== null, () => setOpenId(null));
  useCloseDrawerOnPageSave(dirty, openId !== null, () => setOpenId(null));

  if (!project) return <Empty description="Project not found" />;
  const id = project.identity.id;

  const patch = (index: number, p: Partial<CapaRecord>) => update((prev) => patchArray(prev, index, p));
  const save = async () => {
    const ok = await setCapaBulk(id, draft);
    if (ok) markSaved();
    return ok;
  };

  // The drawer closes only once the server has the record. A refused write (locked data, a conflict) leaves it
  // open with what was typed, instead of showing "added" and throwing the input away.
  const onCreate = async () => {
    const values = await form.validateFields();
    const record: CapaRecord = { ...values, productSku: project.identity.productSku, id: nextRecordId(project.capa), status: 'Not Started' };
    setCreating(true);
    try {
      if (!(await addCapa(id, record))) return;
    } finally {
      setCreating(false);
    }
    message.success(`Record ${record.id} added`);
    setAdding(false);
    form.resetFields();
  };

  const openCount = draft.filter(isOpen).length;
  const highOpen = draft.filter((r) => isHigh(r) && isOpen(r)).length;
  const visible = draft
    .map((r, index) => ({ r, index }))
    .filter(({ r }) =>
      filter === 'all' ? true : filter === 'open' ? isOpen(r) : filter === 'high' ? isHigh(r) : !isOpen(r),
    );
  const chips: [Filter, string, number][] = [
    ['all', 'All', draft.length],
    ['open', 'Open', openCount],
    ['high', 'High / critical', draft.filter(isHigh).length],
    ['completed', 'Completed', draft.length - openCount],
  ];
  const openIndex = draft.findIndex((r) => r.id === openId);
  const open = openIndex >= 0 ? draft[openIndex] : undefined;

  const severityTag = (s: RiskLevel) => (
    <span className={`c-tag${s === 'Critical' || s === 'High' ? ' c-tag-bad' : s === 'Medium' ? ' c-tag-warn' : ''}`}>{s}</span>
  );
  const statusTag = (s: string) => <span className={`c-tag${isDoneStatus(s) ? ' c-tag-ok' : ''}`}>{s}</span>;

  return (
    <div className="concept au">
      <header className="au-header pm-header">
        <div style={{ minWidth: 0 }}>
          <h1 className="au-title">Post-Market / Complaint &amp; CAPA</h1>
          <p className="au-meta">
            {id} · {project.identity.productSku} · Gate 12
          </p>
          <p className="au-desc">
            Use after launch to capture complaints, adverse events, post-market surveillance and CAPA links. Internal panel
            testing before launch is on Product / Sample Feedback.
          </p>
          {draft.length > 0 && (
            <p className="au-meta pm-counts">
              {draft.length} {draft.length === 1 ? 'record' : 'records'} · {openCount} open
              {highOpen > 0 && (
                <>
                  {' · '}
                  <b className="pm-bad">{highOpen} high or critical still open</b>
                </>
              )}
            </p>
          )}
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAdding(true)}>
          New record
        </Button>
      </header>

      {draft.length === 0 ? (
        <div className="c-card au-empty">
          <InboxOutlined className="au-empty-icon" />
          <div className="au-empty-title">No post-market records yet</div>
          <p>Record each complaint, adverse event or market signal here, with its severity and owner.</p>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAdding(true)}>
            New record
          </Button>
        </div>
      ) : (
        <>
          <div className="au-toolbar">
            {chips.map(([key, label, n]) => (
              <button key={key} type="button" className="au-chip" aria-pressed={filter === key} onClick={() => setFilter(key)}>
                {label} <b>{n}</b>
              </button>
            ))}
          </div>
          <div className="c-card au-list">
            {visible.length === 0 ? (
              <div className="au-empty">
                <div className="au-empty-title">No record here</div>
                <Button disabled={false} onClick={() => setFilter('all')}>Show all</Button>
              </div>
            ) : (
              visible.map(({ r }) => (
                <div
                  key={r.id}
                  className={`au-row pm-row${r.severity === 'Critical' && isOpen(r) ? ' pm-row-critical' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-selected={openId === r.id}
                  onClick={() => setOpenId(r.id)}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                      ev.preventDefault();
                      setOpenId(r.id);
                    }
                  }}
                >
                  <div className="pm-text">
                    <div className="pm-line">
                      <b>{r.id}</b>
                      <span>
                        {r.market} · {r.eventType}
                      </span>
                    </div>
                    <div className="pm-summary">{r.summary}</div>
                  </div>
                  <div className="pm-sev">{severityTag(r.severity)}</div>
                  <div className="pm-status">{statusTag(r.status)}</div>
                  <div className="pm-owner">{r.owner || '—'}</div>
                  <RightOutlined className="au-chev pm-chev" />
                </div>
              ))
            )}
          </div>
          {dirty && (
            <div className="page-savebar">
              <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
            </div>
          )}
        </>
      )}

      <Drawer

        closable={{ placement: 'end' }}
        open={!!open}
        onClose={() => setOpenId(null)}
        size={screens.md ? 520 : '100%'}
        mask={!screens.xxl}
        rootClassName="concept-tokens"
        title={
          open && (
            <span className="pm-drawer-title">
              {open.id} {statusTag(open.status)}
            </span>
          )
        }
        footer={<DrawerSaveFooter dirty={dirty} onSave={save} onClose={() => setOpenId(null)} />}
      >
        {open && (
          <div className="pm-detail">
            {/* The sheet's columns, in its order: Product/SKU, Market, Event type, Complaint / AE summary, Severity / risk, Investigation
                link, CAPA link, PIF / PMF impact, Status, Owner, Notes. The first five describe the event and are not edited here. */}
            <DrawerTabs
              tabs={[
                {
                  key: 'event',
                  label: 'Event',
                  children: (
                    <div className="pm-detail">
            <dl className="pm-dl">
              <div>
                <dt>Product / SKU</dt>
                <dd>{open.productSku || project.identity.productSku}</dd>
              </div>
              <div>
                <dt>Market</dt>
                <dd>{open.market}</dd>
              </div>
              <div>
                <dt>Event type</dt>
                <dd>{open.eventType}</dd>
              </div>
            </dl>
            <div>
              <div className="pm-label">Complaint / AE summary</div>
              <p className="pm-summary-full">{open.summary}</p>
            </div>
            <dl className="pm-dl">
              <div>
                <dt>Severity / risk</dt>
                <dd>{severityTag(open.severity)}</dd>
              </div>
            </dl>
                    </div>
                  ),
                },
                {
                  // Round 5 question 22: "Record severity, significance, reviewer and escalation decision" for every report logged for triage.
                  key: 'triage',
                  label: 'Triage',
                  dot: capaTriageGaps(open).length > 0,
                  children: (
                    <div className="pm-detail">
                      <div className="pm-fields">
                        <label className="au-field">
                          <span className="au-field-label">Kind of report<span className="as-req">&nbsp;*</span></span>
                          <Select
                            value={open.category || undefined}
                            placeholder="Choose"
                            options={POST_MARKET_CATEGORIES.map((v) => ({ value: v, label: v }))}
                            onChange={(v?: string) => patch(openIndex, { category: v ?? '' })}
                          />
                        </label>
                        <label className="au-field">
                          <span className="au-field-label">Significance<span className="as-req">&nbsp;*</span></span>
                          <Select
                            value={open.significance || undefined}
                            placeholder="Choose"
                            options={POST_MARKET_SIGNIFICANCE.map((v) => ({ value: v, label: v }))}
                            onChange={(v?: string) => patch(openIndex, { significance: v ?? '' })}
                          />
                        </label>
                        <label className="au-field">
                          <span className="au-field-label">Reviewer<span className="as-req">&nbsp;*</span></span>
                          <UserSelect value={open.reviewer} onChange={(v) => patch(openIndex, { reviewer: v ?? '' })} />
                        </label>
                        <label className="au-field">
                          <span className="au-field-label">Escalation decision<span className="as-req">&nbsp;*</span></span>
                          <Select
                            value={open.escalation || undefined}
                            placeholder="Choose"
                            options={ESCALATION_DECISIONS.map((v) => ({ value: v, label: v }))}
                            onChange={(v?: string) => patch(openIndex, { escalation: v ?? '' })}
                          />
                        </label>
                      </div>
                      <p className="rt-note">
                        A significant adverse event, material quality signal, regulator request or meaningful trend brings the post-launch review forward; a minor
                        query is logged here and handled without starting a full review. Urgent safety triage does not wait for a scheduled milestone.
                      </p>
                    </div>
                  ),
                },
                {
                  // "The performance finding also needs a recorded assessment, conclusion, evidence, impact on claims/quality and CHG decision" — in this same record.
                  key: 'assessment',
                  label: 'Assessment',
                  dot: capaFindingGaps(open).length > 0,
                  children: !isPerformanceFinding(open) ? (
                    <p className="rt-note">
                      A performance or efficacy question is assessed here. Set the kind of report to “Performance or efficacy question” on the Triage tab to record
                      its assessment, conclusion, evidence, impact on claims and quality, and its Change Control decision.
                    </p>
                  ) : (
                    <div className="pm-detail">
                      <div className="pm-fields">
                        <label className="au-field pm-wide">
                          <span className="au-field-label">Assessment<span className="as-req">&nbsp;*</span></span>
                          <Input.TextArea autoSize={{ minRows: 2 }} value={open.assessment} onChange={(e) => patch(openIndex, { assessment: e.target.value })} />
                        </label>
                        <label className="au-field pm-wide">
                          <span className="au-field-label">Conclusion<span className="as-req">&nbsp;*</span></span>
                          <Input.TextArea autoSize={{ minRows: 2 }} value={open.conclusion} onChange={(e) => patch(openIndex, { conclusion: e.target.value })} />
                        </label>
                        <label className="au-field pm-wide">
                          <span className="au-field-label">Evidence<span className="as-req">&nbsp;*</span></span>
                          <Input value={open.evidenceLink} placeholder="link" onChange={(e) => patch(openIndex, { evidenceLink: e.target.value })} />
                        </label>
                        <label className="au-field pm-wide">
                          <span className="au-field-label">Impact on claims and quality<span className="as-req">&nbsp;*</span></span>
                          <Input.TextArea autoSize={{ minRows: 2 }} value={open.impactNote} onChange={(e) => patch(openIndex, { impactNote: e.target.value })} />
                        </label>
                        <label className="au-field">
                          <span className="au-field-label">Change Control decision<span className="as-req">&nbsp;*</span></span>
                          <Select
                            value={open.changeDecision || undefined}
                            placeholder="Choose"
                            options={CHANGE_DECISIONS.map((v) => ({ value: v, label: v }))}
                            onChange={(v?: string) => patch(openIndex, { changeDecision: v ?? '' })}
                          />
                        </label>
                        {open.changeDecision === CHANGE_DECISION_RAISED && (
                          <label className="au-field">
                            <span className="au-field-label">Change Control record<span className="as-req">&nbsp;*</span></span>
                            <ChangeRefSelect purpose="reference" value={open.changeId || undefined} onChange={(v) => patch(openIndex, { changeId: v ?? '' })} />
                          </label>
                        )}
                        {isDoneStatus(open.status) ? (
                          <label className="au-field pm-wide">
                            <span className="au-field-label">Corrective work verified by<span className="as-req">&nbsp;*</span></span>
                            <SelfAttestField value={open.verifiedBy} onChange={(v) => patch(openIndex, { verifiedBy: v })} />
                            {open.verifiedAt && <span className="au-meta">verified {open.verifiedAt}</span>}
                          </label>
                        ) : open.severity === 'Critical' ? (
                          <p className="rt-note pm-wide">A Critical issue cannot stay open: it blocks closing Gate 12. Close the corrective work and verify it.</p>
                        ) : (
                          <>
                            <label className="au-field">
                              <span className="au-field-label">Open action accepted by<span className="as-req">&nbsp;*</span></span>
                              <SelfAttestField value={open.acceptedOpenBy} onChange={(v) => patch(openIndex, { acceptedOpenBy: v })} />
                            </label>
                            <label className="au-field">
                              <span className="au-field-label">Due in the current review<span className="as-req">&nbsp;*</span></span>
                              <DatePicker
                                style={{ width: '100%' }}
                                value={open.acceptedOpenDue ? dayjs(open.acceptedOpenDue) : null}
                                onChange={(d) => patch(openIndex, { acceptedOpenDue: d ? d.format('YYYY-MM-DD') : undefined })}
                              />
                            </label>
                            <p className="rt-note pm-wide">
                              Corrective work still open can be carried only when verified closure is not yet possible: a non-critical action, explicitly accepted, with its
                              due date in the current review.
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'follow-up',
                  label: 'Follow-up',
                  children: (
                    <div className="pm-detail">
            <div className="pm-fields">
              <label className="au-field pm-wide">
                <span className="au-field-label">Investigation link</span>
                <Input value={open.investigationLink} onChange={(e) => patch(openIndex, { investigationLink: e.target.value })} />
              </label>
              <label className="au-field pm-wide">
                <span className="au-field-label">CAPA link</span>
                <Input value={open.capaLink} onChange={(e) => patch(openIndex, { capaLink: e.target.value })} />
              </label>
              <label className="au-field pm-wide">
                <span className="au-field-label">PIF / PMF impact</span>
                <Input value={open.pifPmfImpact} onChange={(e) => patch(openIndex, { pifPmfImpact: e.target.value })} />
              </label>
              <label className="au-field">
                <span className="au-field-label">Status</span>
                <Select
                  value={open.status}
                  options={CAPA_STATUSES.map((st) => ({ value: st, label: st }))}
                  onChange={(v: string) => patch(openIndex, { status: v })}
                />
              </label>
              <label className="au-field">
                <span className="au-field-label">Owner</span>
                <UserSelect value={open.owner} onChange={(v) => patch(openIndex, { owner: v ?? '' })} />
              </label>
              <label className="au-field pm-wide">
                <span className="au-field-label">Notes</span>
                <Input.TextArea
                  autoSize={{ minRows: 3 }}
                  value={open.notes}
                  onChange={(e) => patch(openIndex, { notes: e.target.value })}
                />
              </label>
            </div>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Drawer>

      <FormDrawer
        title="New post-market record"
        open={adding}
        onOk={() => void onCreate()}
        confirmLoading={creating}
        onCancel={() => setAdding(false)}
        okText="Add"
        width={620}
      >
        <Form form={form} layout="vertical" initialValues={{ severity: 'Low' }}>
          {/* Fields in the post-market sheet's column order. The product is the project's own (read-only) and Status starts at Not Started. */}
          <div className="pm-form-grid">
            <Form.Item label="Product / SKU">
              <Input value={project.identity.productSku} disabled />
            </Form.Item>
            <Form.Item name="market" label="Market" rules={[{ required: true, message: 'Pick the market' }]}>
              <Select options={project.identity.markets.map((m) => ({ value: m, label: m }))} />
            </Form.Item>
            <Form.Item
              name="eventType"
              label="Event type"
              rules={[{ required: true, message: 'Pick the event type' }]}
              className="pm-form-wide"
            >
              <Select options={EVENT_TYPES.map((t) => ({ value: t, label: t }))} showSearch={{ optionFilterProp: 'label' }} />
            </Form.Item>
          </div>
          <Form.Item name="summary" label="Complaint / AE summary" rules={[{ required: true, message: 'Describe what happened' }]}>
            <Input.TextArea autoSize={{ minRows: 2 }} />
          </Form.Item>
          <Form.Item name="severity" label="Severity / risk" rules={[{ required: true }]}>
            <ChoiceSelect options={[...RISK_LEVELS]} onChange={() => {}} />
          </Form.Item>
          <div className="pm-form-grid">
            <Form.Item name="investigationLink" label="Investigation link">
              <Input />
            </Form.Item>
            <Form.Item name="capaLink" label="CAPA link">
              <Input />
            </Form.Item>
            <Form.Item name="pifPmfImpact" label="PIF / PMF impact">
              <Input />
            </Form.Item>
            <Form.Item name="owner" label="Owner" rules={[{ required: true, message: 'Pick an owner' }]}>
              <UserSelect onChange={() => {}} />
            </Form.Item>
          </div>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea autoSize={{ minRows: 2 }} />
          </Form.Item>
        </Form>
      </FormDrawer>
    </div>
  );
}
