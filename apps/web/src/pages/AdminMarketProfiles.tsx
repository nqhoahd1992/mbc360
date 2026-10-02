import { useEffect, useMemo, useState } from 'react';
import { Button, DatePicker, Drawer, Grid, Input, InputNumber, Switch, message } from 'antd';
import { GlobalOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { MarketProfile } from '@mbc360/shared/config/referenceData';
import { PHASE_CONFIGS } from '@mbc360/shared/config/phases';
import { ASEAN_MARKETS } from '@mbc360/shared/config/registers';
import { useAppStore } from '../store/useAppStore';
import { useSession } from '../auth/useSession';
import { canEditReferenceData, EMPTY_GRANTS } from '../utils/permissions';
import { useDraft } from '../hooks/useDraft';
import { useExclusiveDrawer } from '../hooks/exclusiveDrawer';
import '../styles/concept.css';
// rt-drawer-hint / rt-sec-title: the drawer text styles every register drawer uses.
import '../components/DynamicTable.css';
import './AdminUsers.css';
import './AdminMarketProfiles.css';

// Round 4 question 4 (2026-08-24): "Do not use a permanently hard-coded country
// list. Regulatory maintains a configurable market profile indicating whether each
// market requires particular adverse-event reporting, PMS records or review
// intervals."
//
// This page is that surface. Without it the dataset would be unreachable and every
// rule reading it permanently unsatisfiable — the same trap câu 34(c) nearly fell
// into, where seven required fields had no input anywhere.
//
// It is a COMPANY-level screen, not a project one: one list every project reads and
// no project can edit (question 28's phrasing, which applies to all three reference
// datasets). That is why it sits under the admin routes rather than inside a
// project workspace.
//
// 2026-10-02 redesign (wireframe option A): the 11-column, 1500px-wide table of
// inputs became one compact row per market — its state (revision or "Not set
// up") and the requirements it switches on as tags — with every field in a
// detail drawer, which also gained the Notes input the data always had and the
// market's revision history.

type Row = MarketProfile & { configured: boolean };
type Filter = 'all' | 'configured' | 'unset' | 'asean';

interface Revision {
  revision: number;
  reason?: string;
  changedBy?: string;
  changedAt: string;
}

// Every market the app can record, so Regulatory sees the full list rather than
// only the ones already configured. Taken from the Target Countries / Markets
// option list — the same controlled list a project picks from — so the two can
// never disagree about what a market is called.
function allMarkets(): string[] {
  const options = PHASE_CONFIGS[1]?.checklistSections.find((s) => s.key === 'targetMarkets')?.options ?? [];
  return options.filter((m) => m !== 'Other - specify');
}

// What a configured profile actually switches on, as short tags for its row.
function requirementTags(r: MarketProfile): string[] {
  return [
    r.adverseEventReporting && 'AE reporting',
    r.pmsRecordsRequired && 'PMS records',
    r.enhancedSurveillance && 'Enhanced surveillance',
    r.reviewIntervalMonths && `Review ${r.reviewIntervalMonths}m`,
    r.dossierType,
  ].filter((t): t is string => !!t);
}

export default function AdminMarketProfiles() {
  const screens = Grid.useBreakpoint();
  const profiles = useAppStore((s) => s.marketProfiles);
  const loadMarketProfiles = useAppStore((s) => s.loadMarketProfiles);
  const grants = useAppStore((s) => s.permissionGrid?.grants ?? EMPTY_GRANTS);
  const { user } = useSession();
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [openMarket, setOpenMarket] = useState<string | null>(null);
  const [history, setHistory] = useState<{ market: string; revisions: Revision[] } | null>(null);
  useExclusiveDrawer(openMarket !== null, () => setOpenMarket(null));

  useEffect(() => {
    if (profiles === null) void loadMarketProfiles();
  }, [profiles, loadMarketProfiles]);

  // Checked against the REAL signed-in roles, not the "View as" simulator: this
  // edits company-wide rules, so a demo role switch must not grant it — the same
  // reasoning as archive/delete.
  const roleKeys = useMemo(() => (user?.roles ?? []).map((r) => r.key), [user]);
  const canEdit = canEditReferenceData(grants, roleKeys, 'market-profile');

  // One row per known market, merged with whatever Regulatory has configured. A
  // market with no profile row shows as unconfigured rather than being absent —
  // "Regulatory has not set this up" is a state the reader needs to see.
  const rows = useMemo(() => {
    const byMarket = new Map((profiles ?? []).map((p) => [p.market, p]));
    return allMarkets().map<Row>((market) => {
      const p = byMarket.get(market);
      return {
        id: p?.id ?? market,
        market,
        adverseEventReporting: p?.adverseEventReporting ?? false,
        pmsRecordsRequired: p?.pmsRecordsRequired ?? false,
        reviewIntervalMonths: p?.reviewIntervalMonths,
        enhancedSurveillance: p?.enhancedSurveillance ?? false,
        dossierType: p?.dossierType,
        claimRestrictions: p?.claimRestrictions,
        evidenceLink: p?.evidenceLink,
        reviewDate: p?.reviewDate,
        notes: p?.notes,
        revision: p?.revision ?? 0,
        updatedBy: p?.updatedBy,
        updatedAt: p?.updatedAt,
        configured: !!p,
      };
    });
  }, [profiles]);

  const { draft, dirty, update, markSaved, discard } = useDraft(rows);
  const patch = (market: string, p: Partial<MarketProfile>) =>
    update((prev) => prev.map((r) => (r.market === market ? { ...r, ...p } : r)));
  const changedMarkets = draft.filter((d, i) => JSON.stringify(d) !== JSON.stringify(rows[i]));

  // Only the rows that actually changed are sent, one request each: the endpoint
  // is an upsert keyed by market and each write gets its own revision, so batching
  // them into one call would collapse several distinct rule changes into one
  // revision entry.
  const save = async () => {
    if (changedMarkets.length === 0) return;
    setSaving(true);
    try {
      for (const row of changedMarkets) {
        // A cleared field must be SENT as cleared: JSON drops `undefined`, and the
        // API reads an absent key as "leave unchanged", so emptying the interval or
        // the dossier type used to be silently ignored. `null` resets the interval
        // to the company default; '' clears a text field.
        const body = {
          ...row,
          reviewIntervalMonths: row.reviewIntervalMonths ?? null,
          dossierType: row.dossierType ?? '',
          claimRestrictions: row.claimRestrictions ?? '',
          evidenceLink: row.evidenceLink ?? '',
          reviewDate: row.reviewDate ?? '',
          notes: row.notes ?? '',
        };
        const res = await fetch(`/api/reference/market-profiles/${encodeURIComponent(row.market)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patch: body }),
        });
        if (!res.ok) throw new Error((await res.json())?.message ?? 'Could not save');
      }
      await loadMarketProfiles();
      markSaved();
      setHistory(null);
      message.success(`${changedMarkets.length} market profile(s) saved`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  // The revision history of the market whose drawer is open, read on demand.
  useEffect(() => {
    if (!openMarket || history?.market === openMarket) return;
    let cancelled = false;
    void fetch(`/api/reference/market-profiles/${encodeURIComponent(openMarket)}/revisions`)
      .then((res) => (res.ok ? (res.json() as Promise<Revision[]>) : []))
      .then((revisions) => {
        if (!cancelled) setHistory({ market: openMarket, revisions });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [openMarket, history]);

  const configured = draft.filter((r) => r.configured).length;
  const aseanCount = draft.filter((r) => ASEAN_MARKETS.includes(r.market)).length;
  const visible = draft.filter((r) => {
    const byFilter =
      filter === 'all' ||
      (filter === 'configured' ? r.configured : filter === 'unset' ? !r.configured : ASEAN_MARKETS.includes(r.market));
    return byFilter && (!query.trim() || r.market.toLowerCase().includes(query.trim().toLowerCase()));
  });
  const chips: [Filter, string, number][] = [
    ['all', 'All', draft.length],
    ['configured', 'Configured', configured],
    ['unset', 'Not set up', draft.length - configured],
    ['asean', 'ASEAN', aseanCount],
  ];

  const status = (r: Row) =>
    r.configured ? <span className="c-tag c-tag-ok">rev {r.revision}</span> : <span className="c-tag c-tag-warn">Not set up</span>;
  const open = draft.find((r) => r.market === openMarket);
  const revisions = history?.market === openMarket ? history.revisions : undefined;
  const switches: [keyof MarketProfile, string, string][] = [
    ['adverseEventReporting', 'Adverse-event reporting', 'This market requires adverse events to be reported to its regulator.'],
    ['pmsRecordsRequired', 'PMS records', 'Post-market surveillance records must be kept for products sold here.'],
    // One of question 4's fourteen enhanced-review conditions is "market-specific
    // vigilance requirement" — this is that flag.
    [
      'enhancedSurveillance',
      'Enhanced surveillance',
      'A market-specific vigilance requirement — one of the conditions that triggers the enhanced post-market review.',
    ],
  ];

  return (
    <div className="concept au">
      <header className="au-header">
        <div className="mp-title-row">
          <h1 className="au-title">Market profiles</h1>
          {!canEdit && <span className="c-tag">Read-only</span>}
        </div>
        {profiles !== null && (
          <div className="au-meta">
            {draft.length} markets · {configured} configured
            {draft.length - configured > 0 && (
              <>
                {' · '}
                <b className="au-meta-warn">{draft.length - configured} not set up</b>
              </>
            )}
          </div>
        )}
        <p className="au-desc">
          Company-level reference data — one list every project's rules read. A market with no profile is treated as
          having no market-specific requirement, so leaving one unset is a decision, not a gap.
          {!canEdit && ' Editing needs the market-profile capability.'}
        </p>
      </header>

      <div className="au-toolbar">
        <Input
          className="au-search"
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search market"
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
        {profiles === null ? (
          <div className="au-skel">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="c-skel" style={{ height: 36 }} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="au-empty">
            <GlobalOutlined className="au-empty-icon" />
            <div className="au-empty-title">{query ? `No market matches “${query}”` : 'No market here'}</div>
            <p>Markets come from the Target Markets list a project picks from.</p>
            {query && <Button onClick={() => setQuery('')}>Clear search</Button>}
          </div>
        ) : (
          visible.map((r) => {
            const tags = requirementTags(r);
            return (
              <div
                key={r.market}
                className="au-row mp-row"
                aria-selected={openMarket === r.market}
                role="button"
                tabIndex={0}
                onClick={() => setOpenMarket(r.market)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setOpenMarket(r.market);
                  }
                }}
              >
                <div className="mp-name">
                  <span className="au-name-text">{r.market}</span>
                  {ASEAN_MARKETS.includes(r.market) && <span className="c-tag">ASEAN</span>}
                </div>
                <div className="mp-status">{status(r)}</div>
                <div className="mp-tags">
                  {!r.configured ? (
                    <span className="au-email">Treated as no market-specific requirement</span>
                  ) : tags.length > 0 ? (
                    tags.map((t) => (
                      <span key={t} className="c-tag">
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="au-email">No market-specific requirement</span>
                  )}
                </div>
                <div className="mp-updated">
                  {r.updatedBy ? `${r.updatedBy}${r.updatedAt ? ` · ${r.updatedAt.slice(0, 10)}` : ''}` : '—'}
                </div>
                <RightOutlined className="au-chev mp-chev" />
              </div>
            );
          })
        )}
      </div>

      {canEdit && dirty && (
        <div className="c-card mp-savebar" role="status">
          <span className="mp-savebar-text">
            <b>Unsaved changes</b>
            <span className="mp-muted">
              {' · '}
              {changedMarkets.length} {changedMarkets.length === 1 ? 'market' : 'markets'} changed — each gets its own revision
            </span>
          </span>
          <span className="mp-savebar-actions">
            <Button onClick={discard} disabled={saving}>
              Discard
            </Button>
            <Button type="primary" loading={saving} onClick={() => void save()}>
              Save
            </Button>
          </span>
        </div>
      )}

      <Drawer
        open={!!open}
        onClose={() => setOpenMarket(null)}
        size={screens.md ? 520 : '100%'}
        mask={!screens.xxl}
        rootClassName="concept-tokens"
        title={
          open && (
            <span className="mp-drawer-title">
              {open.market} {status(open)}
            </span>
          )
        }
        footer={canEdit ? <span className="rt-drawer-hint">Changes stay in this page's draft until you Save it.</span> : undefined}
      >
        {open && (
          <div className="au-detail">
            <section className="au-detail-fields">
              {switches.map(([key, label, help]) => (
                <div key={key} className="au-field-inline">
                  <div>
                    <div>{label}</div>
                    <div className="au-field-help">{help}</div>
                  </div>
                  <Switch
                    disabled={!canEdit}
                    checked={!!open[key]}
                    aria-label={label}
                    onChange={(v) => patch(open.market, { [key]: v })}
                  />
                </div>
              ))}
            </section>

            <section className="mp-fields">
              <label className="au-field">
                <span className="au-field-label">Review interval (months)</span>
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  max={120}
                  disabled={!canEdit}
                  placeholder="Company default"
                  value={open.reviewIntervalMonths}
                  onChange={(v) => patch(open.market, { reviewIntervalMonths: v ?? undefined })}
                />
                <span className="au-field-help">Replaces the 1 / 3 / 12-month ladder for this market.</span>
              </label>
              <label className="au-field">
                <span className="au-field-label">Required dossier type</span>
                <Input
                  disabled={!canEdit}
                  placeholder="e.g. ASEAN PIF, EU CPSR"
                  value={open.dossierType}
                  onChange={(e) => patch(open.market, { dossierType: e.target.value })}
                />
              </label>
              <label className="au-field mp-wide">
                <span className="au-field-label">Claim restrictions</span>
                <Input.TextArea
                  autoSize={{ minRows: 3 }}
                  disabled={!canEdit}
                  placeholder="Any restriction this market imposes on claims"
                  value={open.claimRestrictions}
                  onChange={(e) => patch(open.market, { claimRestrictions: e.target.value })}
                />
              </label>
              <label className="au-field">
                <span className="au-field-label">Evidence link</span>
                <Input
                  disabled={!canEdit}
                  placeholder="Regulation or guidance URL"
                  value={open.evidenceLink}
                  onChange={(e) => patch(open.market, { evidenceLink: e.target.value })}
                />
              </label>
              <label className="au-field">
                <span className="au-field-label">Reviewed</span>
                <DatePicker
                  style={{ width: '100%' }}
                  disabled={!canEdit}
                  value={open.reviewDate ? dayjs(open.reviewDate) : null}
                  onChange={(d) => patch(open.market, { reviewDate: d ? d.format('YYYY-MM-DD') : undefined })}
                />
              </label>
              <label className="au-field mp-wide">
                <span className="au-field-label">Notes</span>
                <Input.TextArea
                  autoSize={{ minRows: 2 }}
                  disabled={!canEdit}
                  value={open.notes}
                  onChange={(e) => patch(open.market, { notes: e.target.value })}
                />
              </label>
            </section>

            <section>
              <div className="rt-sec-title">History</div>
              {!open.configured ? (
                <p className="au-field-help">Not set up yet — saving this market creates revision 1.</p>
              ) : revisions === undefined ? (
                <div className="c-skel" style={{ height: 20 }} />
              ) : (
                <ol className="mp-history">
                  {revisions.map((rev) => (
                    <li key={rev.revision}>
                      <span className="c-tag">rev {rev.revision}</span>
                      <span>
                        {rev.changedBy ?? 'Unknown'} · {rev.changedAt.slice(0, 10)}
                        {rev.revision === 1 && ' · created'}
                        {rev.reason && <span className="au-field-help"> — {rev.reason}</span>}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        )}
      </Drawer>
    </div>
  );
}
