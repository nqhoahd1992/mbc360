import { useCallback, useEffect, useState } from 'react';
import { App, Button, DatePicker, Drawer, Grid, Input, Modal, Select, message } from 'antd';
import { CheckCircleFilled, CheckOutlined, InboxOutlined, PlusOutlined, RightOutlined, SafetyCertificateOutlined, SearchOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { RestrictedCautionEntry } from '@mbc360/shared/types';
import { RESTRICTED_CAUTION_KINDS } from '@mbc360/shared/types';
import { RESTRICTED_CAUTION_REGULATORY_APPROVAL, RESTRICTED_CAUTION_SAFETY_APPROVAL } from '@mbc360/shared/config/referenceData';
import { isCurrentRestrictedCaution, restrictedCautionProblems } from '@mbc360/shared/utils/restrictedCaution';
import { PHASE_1 } from '@mbc360/shared/config/phases';
import { useAppStore } from '../store/useAppStore';
import { usePermissionView } from '../auth/previewMode';
import { canEditReferenceData, EMPTY_GRANTS, hasCapability } from '../utils/permissions';
import ChoiceSelect from '../components/ChoiceSelect';
import DrawerTabs from '../components/DrawerTabs';
import HistoryTimeline, { type HistoryItem } from '../components/HistoryTimeline';
import ListChangeSignal, { emptySignal, signalBody, signalProblem, type ChangeSignal } from '../components/ListChangeSignal';
import { useExclusiveDrawer } from '../hooks/exclusiveDrawer';
import '../styles/concept.css';
// rt-drawer-hint / rt-sec-title: the drawer text styles every register drawer uses.
import '../components/DynamicTable.css';
import './AdminUsers.css';
import './AdminMarketProfiles.css';
import './AdminClaimsLibrary.css';

// Round 5 question 16(a): the company's controlled restricted and caution ingredient list. "Regulatory and Safety supply and approve the controlled
// sources and company overlays, with versions and effective dates ... Load only the approved current company list." The two twelve-row workbook
// lists are screening prompts; THIS is the list a project's Gates 4 and 7 are checked against.
//
// An entry counts only while it is Approved (Regulatory AND Safety, each their own act) and effective today. Editing what it says retracts both
// approvals. Every act is an explicit button, not a field of a page-wide draft: an approval or a withdrawal is a decision with a name against it.
//
// The page is built like its sibling, the Claims Library (2026-11-23, user-requested: it was drawn as a table with inline styles and did not match):
// one row per entry with a status and one mark per approval, chips that filter by state, and a detail drawer with the current state first, the
// fields and the history in tabs, and Cancel / Save in its footer. [ASSUMPTION: R6-Q22]
const MARKET_OPTIONS = (PHASE_1.checklistSections.find((s) => s.key === 'targetMarkets')?.options ?? []).map((o) => ({ value: String(o), label: String(o) }));

type Filter = 'all' | 'approved' | 'awaiting' | 'withdrawn';

interface Revision {
  revision: number;
  event?: string;
  reason?: string;
  changedBy?: string;
  changedAt: string;
}

const EDITABLE: (keyof RestrictedCautionEntry)[] = ['ingredient', 'casNo', 'kind', 'condition', 'markets', 'sourceReference', 'version', 'effectiveFrom', 'effectiveTo'];

const blank = (): RestrictedCautionEntry => ({
  id: 'new',
  ingredient: '',
  kind: 'Restricted',
  markets: [],
  sourceReference: '',
  version: '',
  effectiveFrom: dayjs().format('YYYY-MM-DD'),
  status: 'Proposed',
  revision: 0,
});

const sameValue = (a: unknown, b: unknown) => JSON.stringify(a ?? '') === JSON.stringify(b ?? '');

export default function AdminRestrictedCaution() {
  const { modal } = App.useApp();
  const screens = Grid.useBreakpoint();
  const grants = useAppStore((s) => s.permissionGrid?.grants ?? EMPTY_GRANTS);
  const { roleKeys } = usePermissionView();
  const canEdit = canEditReferenceData(grants, roleKeys, 'restricted-caution');
  const canApproveRegulatory = hasCapability(grants, roleKeys, RESTRICTED_CAUTION_REGULATORY_APPROVAL);
  const canApproveSafety = hasCapability(grants, roleKeys, RESTRICTED_CAUTION_SAFETY_APPROVAL);

  const [entries, setEntries] = useState<RestrictedCautionEntry[] | null>(null);
  // 'new' while proposing; otherwise the open entry's id.
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RestrictedCautionEntry>(blank());
  const [signal, setSignal] = useState<ChangeSignal>(emptySignal);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [withdrawSignal, setWithdrawSignal] = useState<ChangeSignal>(emptySignal);
  const [history, setHistory] = useState<{ id: string; revisions: Revision[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(async () => {
    const res = await fetch('/api/reference/restricted-caution');
    if (res.ok) setEntries((await res.json()) as RestrictedCautionEntry[]);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const today = dayjs().format('YYYY-MM-DD');
  const isNew = openId === 'new';
  const open = openId && !isNew ? (entries ?? []).find((e) => e.id === openId) : undefined;
  const editable = canEdit && (isNew || (!!open && open.status !== 'Withdrawn'));
  const base = isNew ? blank() : open;
  const dirty = !!base && EDITABLE.some((k) => !sameValue(draft[k], base[k]));
  const wasApproved = open?.status === 'Approved';
  const problems = restrictedCautionProblems(draft);
  const signalIssue = wasApproved && dirty ? signalProblem(signal) : null;

  const openEntry = (id: string) => {
    setOpenId(id);
    const entry = id === 'new' ? blank() : (entries ?? []).find((e) => e.id === id);
    setDraft(entry ? { ...entry } : blank());
    setSignal(emptySignal);
  };
  // After an approval the server returns the entry as it now stands; take it unless the reader has unsaved edits.
  useEffect(() => {
    if (open && !dirty) setDraft({ ...open });
    // Only when the committed entry changes, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => {
    if (!dirty || !editable) {
      setOpenId(null);
      return;
    }
    modal.confirm({
      title: 'Discard your changes to this entry?',
      okText: 'Discard',
      okButtonProps: { danger: true },
      cancelText: 'Keep editing',
      onOk: () => setOpenId(null),
    });
  };
  useExclusiveDrawer(openId !== null, () => setOpenId(null));

  // The revision history of the open entry, read on demand and again after every change to it.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetch(`/api/reference/restricted-caution/${encodeURIComponent(open.id)}/revisions`)
      .then((r) => (r.ok ? (r.json() as Promise<Revision[]>) : []))
      .then((revisions) => !cancelled && setHistory({ id: open.id, revisions }))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open]);

  const call = async (url: string, method: string, body?: unknown) => {
    setBusy(true);
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.message ?? 'Could not save');
      const next = (await res.json()) as RestrictedCautionEntry[];
      setEntries(next);
      return next;
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Could not save');
      return undefined;
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    const next = await call(
      `/api/reference/restricted-caution/${encodeURIComponent(draft.id)}`,
      'PUT',
      { patch: { ...draft, casNo: draft.casNo ?? '', condition: draft.condition ?? '', effectiveTo: draft.effectiveTo ?? '' }, signal: signalBody(signal) },
    );
    if (!next) return;
    message.success(isNew ? 'Entry proposed' : 'Entry saved');
    setSignal(emptySignal);
    if (isNew) setOpenId(null);
  };
  const approve = async (side: 'regulatory' | 'safety') => {
    if (!open) return;
    const next = await call(`/api/reference/restricted-caution/${encodeURIComponent(open.id)}/approve/${side}`, 'POST', { signal: signalBody(emptySignal) });
    if (next) message.success('Approval recorded');
  };
  const confirmWithdraw = async () => {
    if (!open) return;
    const next = await call(`/api/reference/restricted-caution/${encodeURIComponent(open.id)}/withdraw`, 'POST', { reason: withdrawReason, signal: signalBody(withdrawSignal) });
    if (!next) return;
    message.success('Entry withdrawn');
    setWithdrawing(false);
    setWithdrawReason('');
    setWithdrawSignal(emptySignal);
  };
  const set = (patch: Partial<RestrictedCautionEntry>) => setDraft((d) => ({ ...d, ...patch }));

  const list = entries ?? [];
  const awaiting = list.filter((e) => e.status === 'Proposed');
  const approved = list.filter((e) => e.status === 'Approved');
  const withdrawn = list.filter((e) => e.status === 'Withdrawn');
  const chips: [Filter, string, number][] = [
    ['all', 'All', list.length],
    ['approved', 'Approved', approved.length],
    ['awaiting', 'Awaiting approval', awaiting.length],
    ['withdrawn', 'Withdrawn', withdrawn.length],
  ];
  const q = query.trim().toLowerCase();
  const visible = list.filter((e) => {
    const byFilter = filter === 'all' || (filter === 'approved' ? e.status === 'Approved' : filter === 'awaiting' ? e.status === 'Proposed' : e.status === 'Withdrawn');
    return byFilter && (!q || `${e.ingredient} ${e.casNo ?? ''} ${e.sourceReference}`.toLowerCase().includes(q));
  });

  const statusTag = (e: RestrictedCautionEntry) => {
    if (e.status === 'Withdrawn') return <span className="c-tag">Withdrawn</span>;
    if (e.status === 'Proposed') return <span className="c-tag c-tag-warn">Proposed</span>;
    return isCurrentRestrictedCaution(e, today) ? <span className="c-tag c-tag-ok">Approved</span> : <span className="c-tag">Approved · not in effect</span>;
  };
  const mark = (label: string, side: string, by?: string) => (
    <span className={`cl-mark${by ? ' cl-mark-on' : ''}`} title={by ? `${side}: approved by ${by}` : `${side}: pending`}>
      {by && <CheckOutlined />}
      {label}
    </span>
  );
  const scopeOf = (e: RestrictedCautionEntry) => (e.markets.length === 0 ? 'Every market' : e.markets.join(', '));
  const effectiveOf = (e: RestrictedCautionEntry) => `From ${e.effectiveFrom}${e.effectiveTo ? ` to ${e.effectiveTo}` : ''}`;

  const withdrawal = history && open && history.id === open.id ? history.revisions.find((r) => r.event === 'Withdrawn') : undefined;
  const approvalSide = (name: string, by: string | undefined, may: boolean, side: 'regulatory' | 'safety') => (
    <div className="cl-side">
      <div className="cl-side-text">
        <span className="au-field-label">{name}</span>
        {by ? (
          <b className="cl-approved">
            <CheckCircleFilled />
            {by}
          </b>
        ) : (
          <span className="mp-muted">Pending</span>
        )}
      </div>
      {!by &&
        (may ? (
          // Approving the entry as saved: unsaved edits would mean approving words nobody has saved yet.
          <Button type="primary" size="small" disabled={busy || dirty} onClick={() => void approve(side)} title={dirty ? 'Save your changes first' : undefined}>
            Approve
          </Button>
        ) : (
          <span className="au-field-help">Needs the {name} approval capability</span>
        ))}
    </div>
  );

  // The entry's CURRENT state, told once and shown first, as the Claims Library does.
  const statusPanel = () => {
    if (isNew) {
      return (
        <div className="cl-status cl-status-new">
          <div className="cl-status-head">New proposal</div>
          <div className="au-field-help">Needs a Regulatory and a Safety approval before a project is checked against it.</div>
        </div>
      );
    }
    if (!open) return null;
    if (open.status === 'Withdrawn') {
      return (
        <div className="cl-status cl-status-withdrawn">
          <div className="cl-status-head">Withdrawn</div>
          <dl className="cl-facts">
            <dt>Reason</dt>
            <dd>{withdrawal?.reason ?? 'No reason recorded.'}</dd>
          </dl>
          <div className="au-field-help">Closed. To use this entry again, propose a new one.</div>
        </div>
      );
    }
    const isApproved = open.status === 'Approved';
    const inEffect = isCurrentRestrictedCaution(open, today);
    return (
      <div className={`cl-status ${isApproved ? 'cl-status-approved' : 'cl-status-proposed'}`}>
        <div className="cl-status-head">{isApproved ? (inEffect ? 'Approved · checked against projects' : 'Approved · not in effect today') : 'Awaiting approval'}</div>
        <div className="cl-sides">
          {approvalSide('Regulatory', open.approvedByRegulatory, canApproveRegulatory, 'regulatory')}
          {approvalSide('Safety', open.approvedBySafety, canApproveSafety, 'safety')}
        </div>
        {!isApproved && <div className="au-field-help">Counts once both have approved and the entry is in effect.</div>}
      </div>
    );
  };

  const historyItems: HistoryItem[] = (history && open && history.id === open.id ? history.revisions : []).map((h) => ({
    key: String(h.revision),
    title: h.event ?? 'Updated',
    meta: `${h.changedBy ?? 'Unknown'} · ${h.changedAt.slice(0, 10)}`,
    detail: h.reason,
  }));
  const frozen = !editable;

  return (
    <div className="concept au">
      <header className="au-header cl-header">
        <div style={{ minWidth: 0 }}>
          <div className="mp-title-row">
            <h1 className="au-title">Restricted &amp; caution list</h1>
            {!canEdit && <span className="c-tag">Read-only</span>}
          </div>
          {entries !== null && (
            <div className="au-meta">
              {list.length} entries · {approved.length} approved
              {awaiting.length > 0 && (
                <>
                  {' · '}
                  <b className="au-meta-warn">{awaiting.length} awaiting approval</b>
                </>
              )}
              {' · '}
              {withdrawn.length} withdrawn
            </div>
          )}
          <p className="au-desc">
            The company&apos;s controlled list of restricted and caution ingredients, with the source, its version and its effective dates. Regulatory and Safety each approve an
            entry; only an approved entry that is in effect is checked against a project&apos;s formula at Gates 4 and 7. The workbook&apos;s two twelve-row lists are screening
            prompts, not this list.
            {!canEdit && ' Proposing and editing need the restricted and caution list edit capability.'}
          </p>
        </div>
        {canEdit && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openEntry('new')}>
            Propose an entry
          </Button>
        )}
      </header>

      <div className="au-toolbar">
        <Input className="au-search" allowClear prefix={<SearchOutlined />} placeholder="Search ingredient, CAS or source" value={query} onChange={(e) => setQuery(e.target.value)} />
        {chips.map(([key, label, n]) => (
          <button key={key} type="button" className="au-chip" aria-pressed={filter === key} onClick={() => setFilter(key)}>
            {label} <b>{n}</b>
          </button>
        ))}
      </div>

      <div className="c-card au-list">
        {entries === null ? (
          <div className="au-skel">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="c-skel" style={{ height: 40 }} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="au-empty">
            <SafetyCertificateOutlined className="au-empty-icon" />
            {list.length === 0 ? (
              <>
                <div className="au-empty-title">No restricted or caution entries yet</div>
                <p>Nothing is checked against a company list until Regulatory and Safety approve an entry.</p>
              </>
            ) : (
              <>
                <div className="au-empty-title">{q ? `No entry matches “${query}”` : 'No entry here'}</div>
                <p>Search the ingredient, CAS number or source.</p>
                {q && <Button onClick={() => setQuery('')}>Clear search</Button>}
              </>
            )}
          </div>
        ) : (
          visible.map((e) => (
            <div
              key={e.id}
              className="au-row cl-row"
              aria-selected={openId === e.id}
              role="button"
              tabIndex={0}
              onClick={() => openEntry(e.id)}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault();
                  openEntry(e.id);
                }
              }}
            >
              <div className="cl-text">
                <div className={`cl-wording${e.status === 'Withdrawn' ? ' cl-withdrawn' : ''}`}>
                  {e.ingredient}
                  {e.casNo ? <span className="mp-muted"> · {e.casNo}</span> : null}
                </div>
                <div className="au-email cl-sub">{[e.kind, scopeOf(e), `${e.sourceReference} · ${e.version}`, effectiveOf(e)].join(' · ')}</div>
              </div>
              <div className="cl-state">
                {statusTag(e)}
                {e.status !== 'Withdrawn' && (
                  <>
                    {mark('R', 'Regulatory', e.approvedByRegulatory)}
                    {mark('S', 'Safety', e.approvedBySafety)}
                  </>
                )}
              </div>
              <RightOutlined className="au-chev mp-chev" />
            </div>
          ))
        )}
      </div>

      <Drawer
        closable={{ placement: 'end' }}
        open={openId !== null && (isNew || !!open)}
        onClose={close}
        size={screens.md ? 560 : '100%'}
        mask={!screens.xxl}
        // The drawer is drawn outside the page, so the app's tag and card styles (`concept-tokens`) are given to it explicitly.
        rootClassName="concept-tokens"
        destroyOnHidden
        title={
          isNew ? (
            'Propose a restricted or caution entry'
          ) : open ? (
            <div className="cl-dtitle">
              <div className="cl-dwording">{open.ingredient}</div>
              <div className="cl-dmeta">
                {statusTag(open)}
                <span>
                  {open.kind} · {scopeOf(open)}
                </span>
              </div>
            </div>
          ) : null
        }
        footer={
          editable ? (
            <>
              {wasApproved && dirty && <ListChangeSignal value={signal} onChange={setSignal} />}
              <div className="rt-drawer-foot cl-foot">
                <Button onClick={close}>Cancel</Button>
                <Button type="primary" loading={busy} disabled={!dirty || problems.length > 0 || !!signalIssue} onClick={() => void save()}>
                  {isNew ? 'Propose' : 'Save'}
                </Button>
              </div>
            </>
          ) : undefined
        }
      >
        {(isNew || open) && (
          <div className="au-detail">
            {statusPanel()}
            <DrawerTabs
              tabs={[
                {
                  key: 'entry',
                  label: 'Entry',
                  dot: dirty && problems.length > 0,
                  children: (
                    <div className="mp-fields">
                      <label className="au-field mp-wide">
                        <span className="au-field-label">
                          Ingredient (INCI)<span className="as-req">&nbsp;*</span>
                        </span>
                        <Input disabled={frozen} value={draft.ingredient} onChange={(e) => set({ ingredient: e.target.value })} />
                        {open && open.status !== 'Withdrawn' && (open.approvedByRegulatory || open.approvedBySafety) && (
                          <span className="cl-warn">
                            <WarningOutlined />
                            Changing the entry retracts both approvals — it goes back to Proposed.
                          </span>
                        )}
                      </label>
                      <label className="au-field">
                        <span className="au-field-label">CAS number</span>
                        <Input disabled={frozen} value={draft.casNo ?? ''} onChange={(e) => set({ casNo: e.target.value })} />
                      </label>
                      <label className="au-field">
                        <span className="au-field-label">
                          Kind<span className="as-req">&nbsp;*</span>
                        </span>
                        <ChoiceSelect disabled={frozen} maxButtons={2} value={draft.kind} options={[...RESTRICTED_CAUTION_KINDS]} onChange={(v) => v && set({ kind: v })} />
                      </label>
                      <label className="au-field mp-wide">
                        <span className="au-field-label">Limit or condition</span>
                        <Input.TextArea disabled={frozen} autoSize={{ minRows: 2 }} value={draft.condition ?? ''} onChange={(e) => set({ condition: e.target.value })} />
                      </label>
                      <label className="au-field mp-wide">
                        <span className="au-field-label">Markets it applies to</span>
                        <Select
                          mode="multiple"
                          disabled={frozen}
                          style={{ width: '100%' }}
                          placeholder="Leave empty for every market"
                          value={draft.markets}
                          options={MARKET_OPTIONS}
                          onChange={(v) => set({ markets: v })}
                        />
                      </label>
                      <label className="au-field">
                        <span className="au-field-label">
                          Controlled source<span className="as-req">&nbsp;*</span>
                        </span>
                        <Input disabled={frozen} value={draft.sourceReference} onChange={(e) => set({ sourceReference: e.target.value })} />
                      </label>
                      <label className="au-field">
                        <span className="au-field-label">
                          Source version<span className="as-req">&nbsp;*</span>
                        </span>
                        <Input disabled={frozen} value={draft.version} onChange={(e) => set({ version: e.target.value })} />
                      </label>
                      <label className="au-field">
                        <span className="au-field-label">
                          Effective from<span className="as-req">&nbsp;*</span>
                        </span>
                        <DatePicker
                          style={{ width: '100%' }}
                          disabled={frozen}
                          value={draft.effectiveFrom ? dayjs(draft.effectiveFrom) : null}
                          onChange={(d) => set({ effectiveFrom: d ? d.format('YYYY-MM-DD') : '' })}
                        />
                      </label>
                      <label className="au-field">
                        <span className="au-field-label">Effective to</span>
                        <DatePicker
                          style={{ width: '100%' }}
                          disabled={frozen}
                          value={draft.effectiveTo ? dayjs(draft.effectiveTo) : null}
                          onChange={(d) => set({ effectiveTo: d ? d.format('YYYY-MM-DD') : '' })}
                        />
                      </label>
                    </div>
                  ),
                },
                ...(open
                  ? [
                      {
                        key: 'history',
                        label: `History${history?.id === open.id ? ` (${historyItems.length})` : ''}`,
                        children:
                          history?.id !== open.id ? <div className="c-skel" style={{ height: 20 }} /> : historyItems.length > 0 ? <HistoryTimeline items={historyItems} /> : <p className="au-field-help">No history yet.</p>,
                      },
                    ]
                  : []),
              ]}
            />
            {open && canEdit && open.status !== 'Withdrawn' && (
              <section className="au-danger">
                <div className="au-danger-row" style={{ borderTop: 0 }}>
                  <div className="au-danger-text">
                    <div className="au-danger-name">Withdraw entry</div>
                    <div className="au-danger-desc">Needs a reason. The entry stops being checked against projects; nothing is removed from any project.</div>
                  </div>
                  <Button danger icon={<InboxOutlined />} onClick={() => setWithdrawing(true)}>
                    Withdraw
                  </Button>
                </div>
              </section>
            )}
          </div>
        )}
      </Drawer>

      <Modal
        open={withdrawing}
        rootClassName="concept-tokens"
        title="Withdraw this entry?"
        okText="Withdraw"
        okButtonProps={{ danger: true, disabled: !withdrawReason.trim() || (wasApproved && !!signalProblem(withdrawSignal)) }}
        confirmLoading={busy}
        onOk={() => void confirmWithdraw()}
        onCancel={() => {
          setWithdrawing(false);
          setWithdrawReason('');
          setWithdrawSignal(emptySignal);
        }}
      >
        <p className="cl-modal-text">
          <b>{open?.ingredient}</b>
        </p>
        <p className="au-field-help cl-modal-text">A withdrawn entry is no longer checked against a project&apos;s formula. It cannot be changed or approved again; propose a new entry instead.</p>
        <Input.TextArea rows={3} value={withdrawReason} placeholder="Why is this entry being withdrawn?" onChange={(e) => setWithdrawReason(e.target.value)} />
        {wasApproved && (
          <div style={{ marginTop: 12 }}>
            <ListChangeSignal value={withdrawSignal} onChange={setWithdrawSignal} />
          </div>
        )}
      </Modal>
    </div>
  );
}
