import { useState } from 'react';
import { Button, DatePicker, Drawer, Empty, Form, Grid, Input, Rate, Select, Switch, message } from 'antd';
import { MessageOutlined, PlusOutlined, RightOutlined, WarningOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import type { FeedbackEntry } from '@mbc360/shared/types';
import { useAppStore } from '../store/useAppStore';
import { hasReachedPhase, positionSentence } from '@mbc360/shared/utils/gateProgress';
import { useExclusiveDrawer } from '../hooks/exclusiveDrawer';
import Notice from '../components/Notice';
import '../styles/concept.css';
import './AdminUsers.css';
import './ProductFeedback.css';

import FormDrawer from '../components/FormDrawer';
// Panel feedback on development samples (Phase 3, Gates 07-08) — internal
// pre-launch testing, not post-market consumer feedback.
//
// 2026-10-02 redesign (wireframe option A): two stacked colour banners became a
// header and, only while the project has not reached Phase 3, a white notice;
// five uneven Statistic cards became one row of figures; the slip-risk flag —
// a SAFETY finding, which used to be a red tag in the eighth column of a
// 1100px table — is its own notice with a filter; and each entry is one row
// (scores, flags, the first comment) opening a read-only drawer. Entries stay
// add-only, as before.

type Filter = 'all' | 'flagged' | 'notRecommended';

interface FeedbackForm {
  testerName: string;
  gender: 'M' | 'F';
  dept: string;
  dateTested?: Dayjs;
  texture: number;
  fragrance: number;
  overall: number;
  tooOilySlippery: boolean;
  wouldRecommend: boolean;
  bestLiked?: string;
  concerns?: string;
}

// FB-NNN from the highest number in use, not from the count: a count-based id
// repeats once any entry is ever removed (the same fix as the CHG / FC ids).
function nextFeedbackId(entries: FeedbackEntry[]): string {
  const max = entries.reduce((m, e) => {
    const n = Number(/^FB-(\d+)$/.exec(e.id)?.[1] ?? 0);
    return n > m ? n : m;
  }, 0);
  return `FB-${String(max + 1).padStart(3, '0')}`;
}

export default function ProductFeedback() {
  const { projectId } = useParams();
  const screens = Grid.useBreakpoint();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const addFeedback = useAppStore((s) => s.addFeedback);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [form] = Form.useForm<FeedbackForm>();
  useExclusiveDrawer(openId !== null, () => setOpenId(null));

  if (!project) return <Empty description="Project not found" />;
  const id = project.identity.id;
  const entries = project.feedback;
  const n = entries.length;

  const avg = (field: 'texture' | 'fragrance' | 'overall') =>
    n ? (entries.reduce((s, e) => s + e[field], 0) / n).toFixed(1) : '—';
  const flagged = entries.filter((e) => e.tooOilySlippery).length;
  const notRecommended = entries.filter((e) => !e.wouldRecommend).length;
  const recommendRate = n ? Math.round(((n - notRecommended) / n) * 100) : 0;

  const visible = entries.filter((e) =>
    filter === 'all' ? true : filter === 'flagged' ? e.tooOilySlippery : !e.wouldRecommend,
  );
  const open = entries.find((e) => e.id === openId);

  const onCreate = async () => {
    const values = await form.validateFields();
    addFeedback(id, {
      ...values,
      id: nextFeedbackId(entries),
      dateTested: values.dateTested ? values.dateTested.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
    });
    message.success('Feedback recorded');
    setAdding(false);
    form.resetFields();
  };

  const flags = (e: FeedbackEntry) => (
    <>
      {e.tooOilySlippery && <span className="c-tag c-tag-bad">Slip risk</span>}
      {!e.wouldRecommend && <span className="c-tag">Would not recommend</span>}
    </>
  );
  const scores = (e: FeedbackEntry) => (
    <span className="fb-scores" aria-label={`Texture ${e.texture}, fragrance ${e.fragrance}, overall ${e.overall}`}>
      {(
        [
          ['T', e.texture],
          ['F', e.fragrance],
          ['O', e.overall],
        ] as const
      ).map(([k, v]) => (
        <span key={k} className="fb-score">
          <span>{k}</span>
          <b>{v}</b>
        </span>
      ))}
    </span>
  );

  const chips: [Filter, string, number][] = [
    ['all', 'All', n],
    ['flagged', 'Safety flagged', flagged],
    ['notRecommended', 'Would not recommend', notRecommended],
  ];

  return (
    <div className="concept au">
      <header className="au-header fb-header">
        <div style={{ minWidth: 0 }}>
          <h1 className="au-title">Product / Sample Feedback</h1>
          <p className="au-meta">
            {id} · {project.identity.productSku} · Phase 3 · Gates 07–08
          </p>
          <p className="au-desc">
            Internal panel testing of development samples before launch — not consumer feedback after launch (that is
            Post-Market / CAPA).
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAdding(true)}>
          Add feedback
        </Button>
      </header>

      {!hasReachedPhase(project, 3) && (
        <Notice tone="warn" title="Phase 3 activity (Gates 07–08)">
          Panel feedback is normally collected on development samples during validation; you can still record it now.{' '}
          {positionSentence(project)}
        </Notice>
      )}

      {n === 0 ? (
        <div className="c-card au-empty">
          <MessageOutlined className="au-empty-icon" />
          <div className="au-empty-title">No panel feedback yet</div>
          <p>Each tester scores texture, fragrance and overall 1–5 and answers the slip-risk question.</p>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAdding(true)}>
            Add the first feedback
          </Button>
        </div>
      ) : (
        <>
          <div className="c-card fb-stats">
            {(
              [
                ['Testers', String(n), ''],
                ['Texture', avg('texture'), '/5'],
                ['Fragrance', avg('fragrance'), '/5'],
                ['Overall', avg('overall'), '/5'],
                ['Would recommend', String(recommendRate), '%'],
              ] as const
            ).map(([label, value, suffix]) => (
              <div key={label} className="fb-stat">
                <div className="fb-stat-label">{label}</div>
                <div className="fb-stat-value">
                  {value}
                  <span>{suffix}</span>
                </div>
              </div>
            ))}
          </div>

          {flagged > 0 && (
            <Notice
              tone="bad"
              title={`${flagged} of ${n} testers flagged it too oily / slippery`}
              action={
                <Button icon={<WarningOutlined />} onClick={() => setFilter('flagged')}>
                  Show flagged
                </Button>
              }
            >
              A slip risk — a safety finding, not a preference. Review these before Gate 08.
            </Notice>
          )}

          <div className="au-toolbar">
            {chips.map(([key, label, count]) => (
              <button key={key} type="button" className="au-chip" aria-pressed={filter === key} onClick={() => setFilter(key)}>
                {label} <b>{count}</b>
              </button>
            ))}
          </div>

          <div className="c-card au-list">
            {visible.length === 0 ? (
              <div className="au-empty">
                <div className="au-empty-title">No entry here</div>
                <Button onClick={() => setFilter('all')}>Show all</Button>
              </div>
            ) : (
              visible.map((e) => (
                <div
                  key={e.id}
                  className="au-row fb-row"
                  role="button"
                  tabIndex={0}
                  aria-selected={openId === e.id}
                  onClick={() => setOpenId(e.id)}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                      ev.preventDefault();
                      setOpenId(e.id);
                    }
                  }}
                >
                  <div className="fb-who">
                    <div className="au-name-text">{e.testerName}</div>
                    <div className="au-email">
                      {e.dept} · {e.dateTested}
                    </div>
                  </div>
                  {scores(e)}
                  <div className="fb-note">
                    {(e.tooOilySlippery || !e.wouldRecommend) && <span className="fb-flags">{flags(e)}</span>}
                    {/* The concern first: it is what the panel exists to surface. */}
                    <span className="fb-comment">{e.concerns || e.bestLiked || '—'}</span>
                  </div>
                  <RightOutlined className="au-chev fb-chev" />
                </div>
              ))
            )}
          </div>
        </>
      )}

      <Drawer
        open={!!open}
        onClose={() => setOpenId(null)}
        size={screens.md ? 480 : '100%'}
        mask={!screens.xxl}
        rootClassName="concept-tokens"
        title={
          open && (
            <span className="fb-drawer-title">
              {open.id} {flags(open)}
            </span>
          )
        }
        footer={<span className="fb-hint">Feedback is a record — it cannot be edited after it is saved.</span>}
      >
        {open && (
          <dl className="fb-dl">
            {(
              [
                ['Tester', `${open.testerName} · ${open.gender}`],
                ['Dept / site', open.dept],
                ['Date tested', open.dateTested],
                ['Texture', `${open.texture} / 5`],
                ['Fragrance', `${open.fragrance} / 5`],
                ['Overall', `${open.overall} / 5`],
                ['Too oily / slippery?', open.tooOilySlippery ? 'Yes — slip risk' : 'No'],
                ['Would recommend?', open.wouldRecommend ? 'Yes' : 'No'],
                ['Best liked', open.bestLiked || '—'],
                ['Concerns / ideas', open.concerns || '—'],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="fb-dl-row">
                <dt>{label}</dt>
                <dd className={label.startsWith('Too oily') && open.tooOilySlippery ? 'fb-bad' : undefined}>{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Drawer>

      <FormDrawer
        title="Add panel feedback"
        open={adding}
        onOk={() => void onCreate()}
        onCancel={() => setAdding(false)}
        okText="Save"
        width={620}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ texture: 3, fragrance: 3, overall: 3, tooOilySlippery: false, wouldRecommend: true, gender: 'F' }}
        >
          <div className="fb-form-sec">Tester</div>
          <div className="fb-form-grid">
            <Form.Item name="testerName" label="Tester name" rules={[{ required: true, message: 'Enter the tester’s name' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="gender" label="Gender">
              <Select options={[{ value: 'F', label: 'F' }, { value: 'M', label: 'M' }]} />
            </Form.Item>
            <Form.Item name="dept" label="Dept / site" rules={[{ required: true, message: 'Enter the department or site' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="dateTested" label="Date tested" extra="Defaults to today">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <div className="fb-form-sec">
            Scores <span>1 = Poor / unacceptable · 3 = Acceptable · 5 = Excellent</span>
          </div>
          <div className="fb-form-grid fb-form-grid-3">
            <Form.Item name="texture" label="Texture">
              <Rate />
            </Form.Item>
            <Form.Item name="fragrance" label="Fragrance">
              <Rate />
            </Form.Item>
            <Form.Item name="overall" label="Overall">
              <Rate />
            </Form.Item>
          </div>

          <div className="fb-form-sec">Safety and recommendation</div>
          <div className="fb-switch-row">
            <div>
              <div>Too oily / slippery?</div>
              <div className="fb-hint">A safety question — a slippery film is a slip risk, not a matter of taste.</div>
            </div>
            <Form.Item name="tooOilySlippery" valuePropName="checked" noStyle>
              <Switch checkedChildren="Yes" unCheckedChildren="No" />
            </Form.Item>
          </div>
          <div className="fb-switch-row">
            <div>Would recommend?</div>
            <Form.Item name="wouldRecommend" valuePropName="checked" noStyle>
              <Switch checkedChildren="Yes" unCheckedChildren="No" />
            </Form.Item>
          </div>

          <div className="fb-form-sec">Comments</div>
          <Form.Item name="bestLiked" label="Best liked">
            <Input />
          </Form.Item>
          <Form.Item name="concerns" label="Concerns / improvement ideas">
            <Input.TextArea autoSize={{ minRows: 2 }} />
          </Form.Item>
        </Form>
      </FormDrawer>
    </div>
  );
}
