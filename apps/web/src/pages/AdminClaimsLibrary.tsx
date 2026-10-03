import { useEffect, useState } from 'react';
import { App, Button, DatePicker, Drawer, Grid, Input, Modal, Select, message } from 'antd';
import { BookOutlined, CheckCircleFilled, CheckOutlined, InboxOutlined, PlusOutlined, RightOutlined, SearchOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ClaimLibraryEntry } from '@mbc360/shared/config/referenceData';
import {
  CLAIMS_LIBRARY_REGULATORY_APPROVAL,
  CLAIMS_LIBRARY_TECHNICAL_APPROVAL,
  CLAIM_LIBRARY_AUDIENCES,
} from '@mbc360/shared/config/referenceData';
import { useAppStore } from '../store/useAppStore';
import { usePermissionView } from '../auth/previewMode';
import { canEditReferenceData, EMPTY_GRANTS, hasCapability } from '../utils/permissions';
import { useExclusiveDrawer } from '../hooks/exclusiveDrawer';
import Notice from '../components/Notice';
import '../styles/concept.css';
// rt-drawer-hint / rt-sec-title: the drawer text styles every register drawer uses.
import '../components/DynamicTable.css';
import './AdminUsers.css';
import './AdminMarketProfiles.css';
import './AdminClaimsLibrary.css';

import FormDrawer from '../components/FormDrawer';
// Round 4 question 28 (2026-08-24), built 2026-08-30. The company-level Claims
// Library — the third reference dataset, and the only one with a workflow.
//
// What makes this page different from Market profiles and Raw material risk beside
// it is the two-party gate: "Technical AND Regulatory must both approve an entry
// before it becomes Approved Library Wording. Marketing/Brand may propose wording
// but not provide final technical/regulatory approval." So the status is never
// edited here — it is a consequence of the two approval buttons, and the server
// derives it on every write.
//
// The library is what finally makes C1's first condition readable: "wording is not
// in the approved Claims Library". A project claim links to an entry, and a claim
// linked to nothing — or to an entry that is only Proposed, or Withdrawn — triggers
// Regulatory review.
//
// 2026-10-02 redesign (wireframe option A): the 1400px table with four buttons
// per row became one compact row per entry with its status and a T / R mark for
// each approval, chips that filter to the entries awaiting each side, and a
// detail drawer holding the approvals, every field (dates as DatePickers instead
// of typed "YYYY-MM-DD" text), the linked-claim impact — readable BEFORE
// withdrawing, through the existing impact endpoint — and the revision history.

type Filter = 'all' | 'approved' | 'tech' | 'reg' | 'withdrawn';

interface LinkedClaim {
  projectId: string;
  claimId: string;
  wording: string;
  status: string;
  skus: string[];
  markets: string[];
  publishedRecords: number;
}

interface Revision {
  revision: number;
  reason?: string;
  changedBy?: string;
  changedAt: string;
}

const TAG_FIELDS: { key: keyof ClaimLibraryEntry; label: string }[] = [
  { key: 'brands', label: 'Brand' },
  { key: 'productFamilies', label: 'Product family' },
  { key: 'skus', label: 'SKU' },
  { key: 'markets', label: 'Market' },
  { key: 'languages', label: 'Language' },
  { key: 'channels', label: 'Channel' },
];

// The fields the drawer edits; compared to decide whether there is anything to save.
const EDITABLE: (keyof ClaimLibraryEntry)[] = [
  'wording',
  'claimCategory',
  'claimRisk',
  'evidenceRequirement',
  'audience',
  'effectiveDate',
  'reviewDate',
  'notes',
  ...TAG_FIELDS.map((t) => t.key),
];

const scopeOf = (e: ClaimLibraryEntry) =>
  TAG_FIELDS.flatMap(({ key }) =>
    String(e[key] ?? '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean),
  );

export default function AdminClaimsLibrary() {
  const { modal } = App.useApp();
  const screens = Grid.useBreakpoint();
  const entries = useAppStore((s) => s.claimsLibrary);
  const load = useAppStore((s) => s.loadClaimsLibrary);
  const grants = useAppStore((s) => s.permissionGrid?.grants ?? EMPTY_GRANTS);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  // 'new' while proposing; otherwise the open entry's id.
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<ClaimLibraryEntry>>({});
  const [linked, setLinked] = useState<{ id: string; claims: LinkedClaim[] } | null>(null);
  const [history, setHistory] = useState<{ id: string; revisions: Revision[] } | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [reason, setReason] = useState('');
  const [impact, setImpact] = useState<LinkedClaim[] | null>(null);

  useEffect(() => {
    if (entries === null) void load();
  }, [entries, load]);

  // The previewed role while View as is on, otherwise your own.
  const { roleKeys } = usePermissionView();
  const canEdit = canEditReferenceData(grants, roleKeys, 'claims-library');
  const canApproveTechnical = hasCapability(grants, roleKeys, CLAIMS_LIBRARY_TECHNICAL_APPROVAL);
  const canApproveRegulatory = hasCapability(grants, roleKeys, CLAIMS_LIBRARY_REGULATORY_APPROVAL);

  const open = openId && openId !== 'new' ? (entries ?? []).find((e) => e.id === openId) : undefined;
  const isNew = openId === 'new';
  const editable = canEdit && (isNew || (!!open && open.status !== 'Withdrawn'));
  const dirty = isNew
    ? (form.wording ?? '').trim() !== '' || EDITABLE.some((k) => k !== 'wording' && !!form[k])
    : !!open && EDITABLE.some((k) => (form[k] ?? '') !== (open[k] ?? ''));

  // Opening an entry (or the store refreshing it after an approval) resets the
  // form to the committed values — unless the reader has unsaved edits in it.
  const openEntry = (id: string | null) => {
    setOpenId(id);
    const e = id && id !== 'new' ? (entries ?? []).find((x) => x.id === id) : undefined;
    setForm(e ? { ...e } : {});
  };
  useEffect(() => {
    if (open && !dirty) setForm({ ...open });
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

  // The linked-claim impact and the revision history of the open entry, read on
  // demand — the impact BEFORE withdrawing, not only reported afterwards.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const id = open.id;
    if (linked?.id !== id) {
      void fetch(`/api/reference/claims-library/${encodeURIComponent(id)}/impact`)
        .then((res) => (res.ok ? (res.json() as Promise<LinkedClaim[]>) : []))
        .then((claims) => !cancelled && setLinked({ id, claims }))
        .catch(() => undefined);
    }
    if (history?.id !== id || history.revisions[0]?.revision !== open.revision) {
      void fetch(`/api/reference/claims-library/${encodeURIComponent(id)}/revisions`)
        .then((res) => (res.ok ? (res.json() as Promise<Revision[]>) : []))
        .then((revisions) => !cancelled && setHistory({ id, revisions }))
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
  }, [open, linked, history]);

  const call = async (path: string, init: RequestInit) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/reference/claims-library${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...init,
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        message.error(typeof body?.message === 'string' ? body.message : 'Request failed');
        return null;
      }
      await load();
      return body;
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    // A cleared field is sent as '' so the API clears it rather than keeping the
    // old value (it reads an absent key as "leave unchanged").
    const patch = Object.fromEntries(EDITABLE.map((k) => [k, form[k] ?? '']));
    const ok = await call(`/${isNew ? 'new' : openId}`, { method: 'PUT', body: JSON.stringify({ patch }) });
    if (!ok) return;
    message.success(isNew ? 'Entry proposed' : 'Entry saved');
    if (isNew) setOpenId(null);
  };

  const approve = (side: 'technical' | 'regulatory') => {
    if (!open) return;
    void call(`/${open.id}/approve/${side}`, { method: 'POST' }).then((ok) => ok && message.success('Approval recorded'));
  };

  const confirmWithdraw = async () => {
    if (!open) return;
    const result = await call(`/${open.id}/withdraw`, { method: 'POST', body: JSON.stringify({ reason }) });
    if (result) {
      setImpact(result.impact ?? []);
      setWithdrawing(false);
      setReason('');
      setLinked(null);
    }
  };

  const list = entries ?? [];
  const proposed = list.filter((e) => e.status === 'Proposed');
  const counts = {
    approved: list.filter((e) => e.status === 'Approved').length,
    tech: proposed.filter((e) => !e.technicalApprovedBy).length,
    reg: proposed.filter((e) => !e.regulatoryApprovedBy).length,
    withdrawn: list.filter((e) => e.status === 'Withdrawn').length,
  };
  const chips: [Filter, string, number][] = [
    ['all', 'All', list.length],
    ['approved', 'Approved', counts.approved],
    ['tech', 'Awaiting Technical', counts.tech],
    ['reg', 'Awaiting Regulatory', counts.reg],
    ['withdrawn', 'Withdrawn', counts.withdrawn],
  ];
  const q = query.trim().toLowerCase();
  const visible = list.filter((e) => {
    const byFilter =
      filter === 'all' ||
      (filter === 'approved'
        ? e.status === 'Approved'
        : filter === 'tech'
          ? e.status === 'Proposed' && !e.technicalApprovedBy
          : filter === 'reg'
            ? e.status === 'Proposed' && !e.regulatoryApprovedBy
            : e.status === 'Withdrawn');
    return byFilter && (!q || `${e.wording} ${e.claimCategory ?? ''}`.toLowerCase().includes(q));
  });

  const statusTag = (status: string) => (
    <span className={`c-tag ${status === 'Approved' ? 'c-tag-ok' : status === 'Withdrawn' ? '' : 'c-tag-warn'}`}>{status}</span>
  );
  const mark = (label: string, side: string, by?: string) => (
    <span className={`cl-mark${by ? ' cl-mark-on' : ''}`} title={by ? `${side}: approved by ${by}` : `${side}: pending`}>
      {by && <CheckOutlined />}
      {label}
    </span>
  );
  const set = (key: keyof ClaimLibraryEntry, value: string | undefined) => setForm((prev) => ({ ...prev, [key]: value }));
  const approvalBox = (side: 'technical' | 'regulatory') => {
    const by = side === 'technical' ? open?.technicalApprovedBy : open?.regulatoryApprovedBy;
    const at = side === 'technical' ? open?.technicalApprovedAt : open?.regulatoryApprovedAt;
    const may = side === 'technical' ? canApproveTechnical : canApproveRegulatory;
    return (
      <div className="cl-approval">
        <div className="au-field-label">{side === 'technical' ? 'Technical' : 'Regulatory'}</div>
        {by ? (
          <>
            <div className="cl-approved">
              <CheckCircleFilled />
              {by}
            </div>
            {at && <div className="au-field-help">{at.slice(0, 10)}</div>}
          </>
        ) : (
          <>
            <div className="mp-muted">Pending</div>
            {open?.status !== 'Withdrawn' &&
              (may ? (
                // Approving the entry as saved: unsaved wording edits would mean
                // approving words nobody has saved yet.
                <Button block disabled={busy || dirty} onClick={() => approve(side)} title={dirty ? 'Save your changes first' : undefined}>
                  Approve
                </Button>
              ) : (
                <div className="au-field-help">Needs the {side === 'technical' ? 'Technical' : 'Regulatory'} approval capability</div>
              ))}
          </>
        )}
      </div>
    );
  };

  const claims = open && linked?.id === open.id ? linked.claims : undefined;
  const revisions = open && history?.id === open.id ? history.revisions : undefined;

  return (
    <div className="concept au">
      <header className="au-header cl-header">
        <div style={{ minWidth: 0 }}>
          <div className="mp-title-row">
            <h1 className="au-title">Claims Library</h1>
            {!canEdit && <span className="c-tag">Read-only</span>}
          </div>
          {entries !== null && (
            <div className="au-meta">
              {list.length} entries · {counts.approved} approved
              {proposed.length > 0 && (
                <>
                  {' · '}
                  <b className="au-meta-warn">{proposed.length} awaiting approval</b>
                </>
              )}
              {' · '}
              {counts.withdrawn} withdrawn
            </div>
          )}
          <p className="au-desc">
            Approved wording every project can reuse. An entry is Approved only when both Technical and Regulatory have
            approved it; Marketing may propose but not approve. A project claim not linked to an Approved entry triggers
            Regulatory review.
            {!canEdit && ' Proposing and editing need the Claims Library edit capability.'}
          </p>
        </div>
        {canEdit && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openEntry('new')}>
            Propose an entry
          </Button>
        )}
      </header>

      <div className="au-toolbar">
        <Input
          className="au-search"
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search wording"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {chips.map(([key, label, n]) => (
          <button key={key} type="button" className="au-chip" aria-pressed={filter === key} onClick={() => setFilter(key)}>
            {label} <b>{n}</b>
          </button>
        ))}
      </div>

      <div className="c-card au-list">
        {entries === null ? (
          <div className="au-skel">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="c-skel" style={{ height: 40 }} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="au-empty">
            <BookOutlined className="au-empty-icon" />
            {list.length === 0 ? (
              <>
                <div className="au-empty-title">No library entries yet</div>
                <p>
                  Until an entry exists and is approved, every project claim counts as “not in the approved Claims
                  Library” and triggers Regulatory review.
                </p>
              </>
            ) : (
              <>
                <div className="au-empty-title">{q ? `No entry matches “${query}”` : 'No entry here'}</div>
                <p>Search the approved wording or category.</p>
                {q && <Button onClick={() => setQuery('')}>Clear search</Button>}
              </>
            )}
          </div>
        ) : (
          visible.map((e) => {
            const scope = scopeOf(e);
            return (
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
                  <div className={`cl-wording${e.status === 'Withdrawn' ? ' cl-withdrawn' : ''}`}>{e.wording}</div>
                  <div className="au-email cl-sub">
                    {[
                      `rev ${e.revision}`,
                      e.claimCategory,
                      scope.length ? `${scope.slice(0, 3).join(', ')}${scope.length > 3 ? ` +${scope.length - 3}` : ''}` : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
                <div className="cl-state">
                  {statusTag(e.status)}
                  {e.status !== 'Withdrawn' && (
                    <>
                      {mark('T', 'Technical', e.technicalApprovedBy)}
                      {mark('R', 'Regulatory', e.regulatoryApprovedBy)}
                    </>
                  )}
                </div>
                <RightOutlined className="au-chev mp-chev" />
              </div>
            );
          })
        )}
      </div>

      <Drawer
        open={openId !== null && (isNew || !!open)}
        onClose={close}
        size={screens.md ? 560 : '100%'}
        mask={!screens.xxl}
        rootClassName="concept-tokens"
        title={
          isNew ? (
            'Propose a library entry'
          ) : open ? (
            <span className="mp-drawer-title">
              Rev {open.revision} {statusTag(open.status)}
            </span>
          ) : null
        }
        footer={
          editable ? (
            <div className="rt-drawer-foot cl-foot">
              <Button onClick={close}>Cancel</Button>
              <Button type="primary" loading={busy} disabled={!dirty || !(form.wording ?? '').trim()} onClick={() => void save()}>
                {isNew ? 'Propose' : 'Save'}
              </Button>
            </div>
          ) : undefined
        }
      >
        {(isNew || open) && (
          <div className="au-detail">
            {open?.status === 'Withdrawn' && (
              <Notice tone="info" title="Withdrawn">
                {open.withdrawnReason ?? 'No reason recorded.'}
              </Notice>
            )}

            {open && (
              <section>
                <div className="rt-sec-title">Approval</div>
                <div className="cl-approvals">
                  {approvalBox('technical')}
                  {approvalBox('regulatory')}
                </div>
                {open.status === 'Proposed' && (
                  <p className="au-field-help cl-gap">Becomes Approved Library Wording once both have approved.</p>
                )}
              </section>
            )}

            <section className="mp-fields">
              <label className="au-field mp-wide">
                <span className="au-field-label">Approved wording</span>
                <Input.TextArea
                  autoSize={{ minRows: 2 }}
                  disabled={!editable}
                  status={isNew && dirty && !(form.wording ?? '').trim() ? 'error' : undefined}
                  value={form.wording}
                  onChange={(ev) => set('wording', ev.target.value)}
                />
                {open && open.status !== 'Withdrawn' && (open.technicalApprovedBy || open.regulatoryApprovedBy) && (
                  <span className="cl-warn">
                    <WarningOutlined />
                    Changing the wording retracts both approvals — the entry goes back to Proposed.
                  </span>
                )}
              </label>
              <label className="au-field">
                <span className="au-field-label">Claim category</span>
                <Input disabled={!editable} value={form.claimCategory} onChange={(ev) => set('claimCategory', ev.target.value)} />
              </label>
              <label className="au-field">
                <span className="au-field-label">Claim risk</span>
                <Input disabled={!editable} value={form.claimRisk} onChange={(ev) => set('claimRisk', ev.target.value)} />
              </label>
              <label className="au-field mp-wide">
                <span className="au-field-label">Evidence requirement</span>
                <Input.TextArea
                  autoSize={{ minRows: 1 }}
                  disabled={!editable}
                  value={form.evidenceRequirement}
                  onChange={(ev) => set('evidenceRequirement', ev.target.value)}
                />
              </label>
              <label className="au-field">
                <span className="au-field-label">Effective date</span>
                <DatePicker
                  style={{ width: '100%' }}
                  disabled={!editable}
                  value={form.effectiveDate ? dayjs(form.effectiveDate) : null}
                  onChange={(d) => set('effectiveDate', d ? d.format('YYYY-MM-DD') : undefined)}
                />
              </label>
              <label className="au-field">
                <span className="au-field-label">Review date</span>
                <DatePicker
                  style={{ width: '100%' }}
                  disabled={!editable}
                  value={form.reviewDate ? dayjs(form.reviewDate) : null}
                  onChange={(d) => set('reviewDate', d ? d.format('YYYY-MM-DD') : undefined)}
                />
              </label>
            </section>

            <section>
              <div className="rt-sec-title">Applies to</div>
              <div className="mp-fields">
                {TAG_FIELDS.map(({ key, label }) => (
                  <label key={key} className="au-field">
                    <span className="au-field-label">{label}</span>
                    <Input
                      disabled={!editable}
                      placeholder="Comma separated"
                      value={String(form[key] ?? '')}
                      onChange={(ev) => set(key, ev.target.value)}
                    />
                  </label>
                ))}
                <label className="au-field">
                  <span className="au-field-label">Audience</span>
                  <Select
                    allowClear
                    disabled={!editable}
                    placeholder="Consumer / professional"
                    value={form.audience || undefined}
                    options={CLAIM_LIBRARY_AUDIENCES.map((a) => ({ value: a, label: a }))}
                    onChange={(v?: string) => set('audience', v)}
                  />
                </label>
                <label className="au-field mp-wide">
                  <span className="au-field-label">Notes</span>
                  <Input.TextArea autoSize={{ minRows: 2 }} disabled={!editable} value={form.notes} onChange={(ev) => set('notes', ev.target.value)} />
                </label>
              </div>
            </section>

            {open && (
              <>
                <section>
                  <div className="rt-sec-title">
                    Linked claims {claims && <span className="mp-muted">{claims.length}</span>}
                  </div>
                  {claims === undefined ? (
                    <div className="c-skel" style={{ height: 20 }} />
                  ) : claims.length === 0 ? (
                    <p className="au-field-help">No project claim links to this entry yet.</p>
                  ) : (
                    <ul className="cl-linked">
                      {claims.map((c) => (
                        <li key={`${c.projectId}|${c.claimId}`}>
                          <b>
                            {c.projectId} · {c.claimId}
                          </b>
                          <span className="mp-muted">
                            {c.status}
                            {c.markets.length > 0 && ` · ${c.markets.join(', ')}`} · {c.publishedRecords} published record
                            {c.publishedRecords === 1 ? '' : 's'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section>
                  <div className="rt-sec-title">History</div>
                  {open.proposedBy && (
                    <p className="au-field-help cl-origin">
                      Proposed by {open.proposedBy}
                      {open.proposedFromProjectId && ` from ${open.proposedFromProjectId}`}
                      {open.proposedFromClaimId && ` · ${open.proposedFromClaimId}`}
                    </p>
                  )}
                  {revisions === undefined ? (
                    <div className="c-skel" style={{ height: 20 }} />
                  ) : (
                    <ol className="mp-history">
                      {revisions.map((rev) => (
                        <li key={rev.revision}>
                          <span className="c-tag">rev {rev.revision}</span>
                          <span>
                            {rev.changedBy ?? 'Unknown'} · {rev.changedAt.slice(0, 10)}
                            {rev.reason && <span className="au-field-help"> — {rev.reason}</span>}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>

                {canEdit && open.status !== 'Withdrawn' && (
                  <section className="au-danger">
                    <div className="au-danger-row" style={{ borderTop: 0 }}>
                      <div className="au-danger-text">
                        <div className="au-danger-name">Withdraw entry</div>
                        <div className="au-danger-desc">
                          Needs a reason. Flags every linked claim for re-review; nothing is removed from the market.
                        </div>
                      </div>
                      <Button danger icon={<InboxOutlined />} onClick={() => setWithdrawing(true)}>
                        Withdraw
                      </Button>
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        )}
      </Drawer>

      <Modal
        open={withdrawing}
        rootClassName="concept-tokens"
        title="Withdraw this entry?"
        okText="Withdraw"
        okButtonProps={{ danger: true, disabled: !reason.trim() }}
        confirmLoading={busy}
        onOk={() => void confirmWithdraw()}
        onCancel={() => {
          setWithdrawing(false);
          setReason('');
        }}
      >
        <p className="cl-modal-text">“{open?.wording}”</p>
        <p className="au-field-help cl-modal-text">
          Withdrawing flags affected material for re-review — it does not remove anything. Every project claim linked to
          this entry is listed afterwards so an impact assessment can be run.
        </p>
        <Input.TextArea rows={3} value={reason} placeholder="Why is this entry being withdrawn?" onChange={(e) => setReason(e.target.value)} />
      </Modal>

      <FormDrawer
        open={impact !== null}
        title="Affected claims"
        footer={null}
        onCancel={() => setImpact(null)}
        width={640}
      >
        {impact?.length === 0 ? (
          <p className="au-field-help">No project claim was linked to this entry.</p>
        ) : (
          <ul className="cl-linked">
            {(impact ?? []).map((c) => (
              <li key={`${c.projectId}|${c.claimId}`}>
                <b>
                  {c.projectId} · {c.claimId}
                </b>
                <span>{c.wording}</span>
                <span className="mp-muted">
                  {c.status}
                  {c.skus.length > 0 && ` · ${c.skus.join(', ')}`}
                  {c.markets.length > 0 && ` · ${c.markets.join(', ')}`} · {c.publishedRecords} published record
                  {c.publishedRecords === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </FormDrawer>
    </div>
  );
}
