import { useState } from 'react';
import { Button, Drawer, Empty, Form, Grid, Input, Select, message } from 'antd';
import { InboxOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import type { CapaRecord, RiskLevel, WorkStatus } from '@mbc360/shared/types';
import { RISK_LEVELS } from '@mbc360/shared/types';
import { WORK_STATUSES } from '@mbc360/shared/config/gates';
import { isGatePassed, positionSentence } from '@mbc360/shared/utils/gateProgress';
import UserSelect from '../components/UserSelect';
import Notice from '../components/Notice';
import { patchArray, useDraft } from '../hooks/useDraft';
import { useExclusiveDrawer } from '../hooks/exclusiveDrawer';
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
}

const isOpen = (r: CapaRecord) => r.status !== 'Completed';
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
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [form] = Form.useForm<CapaForm>();
  const { draft, dirty, update, markSaved, discard } = useDraft(project?.capa ?? []);
  useExclusiveDrawer(openId !== null, () => setOpenId(null));

  if (!project) return <Empty description="Project not found" />;
  const id = project.identity.id;

  const patch = (index: number, p: Partial<CapaRecord>) => update((prev) => patchArray(prev, index, p));
  const save = () => {
    setCapaBulk(id, draft);
    markSaved();
  };

  const onCreate = async () => {
    const values = await form.validateFields();
    const record: CapaRecord = { ...values, id: nextRecordId(project.capa), status: 'Not Started' as WorkStatus };
    addCapa(id, record);
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
  const statusTag = (s: WorkStatus) => <span className={`c-tag${s === 'Completed' ? ' c-tag-ok' : ''}`}>{s}</span>;

  return (
    <div className="concept au">
      <header className="au-header pm-header">
        <div style={{ minWidth: 0 }}>
          <h1 className="au-title">Post-Market / Complaint &amp; CAPA</h1>
          <p className="au-meta">
            {id} · {project.identity.productSku} · Gate 12
          </p>
          <p className="au-desc">
            Events after launch — complaints, adverse events, feedback and the actions taken. Internal panel testing before
            launch is on Product / Sample Feedback.
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

      {!isGatePassed(project, 'SG11') && (
        <Notice tone="warn" title="Post-launch activity (Gate 12)">
          Records normally start once Gate 11 (launch sign-off) has passed. {positionSentence(project)} You can pre-fill
          records now.
        </Notice>
      )}

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
                <Button onClick={() => setFilter('all')}>Show all</Button>
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
            <div className="c-card pm-savebar">
              <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
            </div>
          )}
        </>
      )}

      <Drawer
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
        footer={<span className="pm-hint">Changes stay in this page's draft until you Save it.</span>}
      >
        {open && (
          <div className="pm-detail">
            <dl className="pm-dl">
              <div>
                <dt>Market</dt>
                <dd>{open.market}</dd>
              </div>
              <div>
                <dt>Event type</dt>
                <dd>{open.eventType}</dd>
              </div>
              <div>
                <dt>Severity / risk</dt>
                <dd>{severityTag(open.severity)}</dd>
              </div>
            </dl>
            <div>
              <div className="pm-label">Complaint / AE summary</div>
              <p className="pm-summary-full">{open.summary}</p>
            </div>
            <div className="pm-fields">
              <label className="au-field">
                <span className="au-field-label">Status</span>
                <Select
                  value={open.status}
                  options={WORK_STATUSES.map((s) => ({ value: s, label: s }))}
                  onChange={(v: WorkStatus) => patch(openIndex, { status: v })}
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
        )}
      </Drawer>

      <FormDrawer
        title="New post-market record"
        open={adding}
        onOk={() => void onCreate()}
        onCancel={() => setAdding(false)}
        okText="Add"
        width={620}
      >
        <Form form={form} layout="vertical" initialValues={{ severity: 'Low' }}>
          <Form.Item name="summary" label="Complaint / AE summary" rules={[{ required: true, message: 'Describe what happened' }]}>
            <Input.TextArea autoSize={{ minRows: 2 }} />
          </Form.Item>
          <div className="pm-form-grid">
            <Form.Item name="market" label="Market" rules={[{ required: true, message: 'Pick the market' }]}>
              <Select options={project.identity.markets.map((m) => ({ value: m, label: m }))} />
            </Form.Item>
            <Form.Item name="eventType" label="Event type" rules={[{ required: true, message: 'Pick the event type' }]}>
              <Select options={EVENT_TYPES.map((t) => ({ value: t, label: t }))} showSearch={{ optionFilterProp: 'label' }} />
            </Form.Item>
            <Form.Item
              name="severity"
              label="Severity / risk"
              rules={[{ required: true }]}
              extra="Critical sits above High — the shared scale from Round 4, question 3."
            >
              <Select options={RISK_LEVELS.map((r) => ({ value: r, label: r }))} />
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
