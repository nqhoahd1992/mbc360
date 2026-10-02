import { useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, DatePicker, Drawer, Grid, Input, Select, message } from 'antd';
import { ExperimentOutlined, PlusOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import type { RawMaterialRisk, RmRiskFlag } from '@mbc360/shared/config/referenceData';
import { RM_RISK_FLAGS } from '@mbc360/shared/config/referenceData';
import { useAppStore } from '../store/useAppStore';
import { useSession } from '../auth/useSession';
import { canEditReferenceData, EMPTY_GRANTS } from '../utils/permissions';
import { useDraft } from '../hooks/useDraft';
import { useExclusiveDrawer } from '../hooks/exclusiveDrawer';
import Notice from '../components/Notice';
import { cosmetriListRawMaterials, type CosmetriRawMaterialSummary } from '../integrations/cosmetri';
import { useCosmetriStatus } from '../integrations/useCosmetriStatus';
import '../styles/concept.css';
// rt-drawer-hint / rt-sec-title: the drawer text styles every register drawer uses.
import '../components/DynamicTable.css';
import './AdminUsers.css';
import './AdminMarketProfiles.css';
import './AdminRmRisk.css';

// Round 4 question 17 (2026-08-24): "Do not re-enter this per project… MBc360
// maintains a shared Raw Material Risk Overlay keyed to the Cosmetri raw-material
// ID. This is not a second raw-material master."
//
// A COMPANY-level screen, like Market profiles beside it. What makes this one
// different from a per-project register is precisely the thing the answer asks for:
// a material is classified ONCE and every project that uses it reads the same
// classification.
//
// The Gate 4 readiness item `sg04-allergen` reads this list through
// `ProjectData.reference.rmRisk`. A material with no row here counts as
// UNCLASSIFIED, which blocks Gate 4 — so an empty table is not a quiet default, it
// is visible as work outstanding. Which is why this page exists at all: without it
// the rule would be permanently unsatisfiable.
//
// 2026-10-02 redesign, same pattern as Market profiles: one compact row per
// material with its classifications as tags, every field in a detail drawer that
// also shows the material's revision history. The 11 flags used to be a wrap of
// checkboxes inside a 560px table cell of a 1400px-wide table.

type Row = RawMaterialRisk & { isNew?: boolean };
type Filter = 'all' | 'flagged' | 'clean' | 'unsaved';

interface Revision {
  revision: number;
  reason?: string;
  changedBy?: string;
  changedAt: string;
}

const rawMaterialLabel = (r: CosmetriRawMaterialSummary) =>
  [r.tradeName || r.code, r.supplierName].filter(Boolean).join(' · ');

// How many flag tags a row shows before folding the rest into "+N".
const ROW_TAG_LIMIT = 3;

export default function AdminRmRisk() {
  const screens = Grid.useBreakpoint();
  const overlay = useAppStore((s) => s.rmRisk);
  const loadRmRisk = useAppStore((s) => s.loadRmRisk);
  const grants = useAppStore((s) => s.permissionGrid?.grants ?? EMPTY_GRANTS);
  const { user } = useSession();
  const connected = useCosmetriStatus().status.connected;
  const [saving, setSaving] = useState(false);
  const [catalogue, setCatalogue] = useState<CosmetriRawMaterialSummary[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [history, setHistory] = useState<{ rmCode: string; revisions: Revision[] } | null>(null);
  useExclusiveDrawer(openCode !== null, () => setOpenCode(null));

  useEffect(() => {
    if (overlay === null) void loadRmRisk();
  }, [overlay, loadRmRisk]);

  // The catalogue is only needed to ADD a material — an existing row is keyed by
  // rmCode and readable without it, so a Cosmetri outage degrades this page to
  // "you can edit what is here, you cannot add" instead of breaking it.
  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    void cosmetriListRawMaterials()
      .then((rows) => {
        if (!cancelled) setCatalogue(rows);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [connected]);

  // Checked against the REAL signed-in roles, not the "View as" simulator: this
  // edits a company-wide classification every project reads.
  const roleKeys = useMemo(() => (user?.roles ?? []).map((r) => r.key), [user]);
  const canEdit = canEditReferenceData(grants, roleKeys, 'rm-risk');

  const committed = useMemo<Row[]>(() => overlay ?? [], [overlay]);
  const { draft, dirty, update, markSaved, discard } = useDraft(committed);

  const patch = (rmCode: string, p: Partial<Row>) =>
    update((prev) => prev.map((r) => (r.rmCode === rmCode ? { ...r, ...p } : r)));

  const classified = new Set(draft.map((r) => r.rmCode));
  const addOptions = catalogue
    .filter((r) => !classified.has(`RM-${r.id}`))
    .map((r) => ({ value: `RM-${r.id}`, label: rawMaterialLabel(r) }));

  const addMaterial = (rmCode: string) => {
    const material = catalogue.find((r) => `RM-${r.id}` === rmCode);
    update((prev) => [
      // A brand-new row carries revision 0 and no flags, which is NOT yet a
      // classification: it becomes one on Save, when the server assigns revision 1.
      // Until then the material still counts as unclassified everywhere else.
      {
        id: rmCode,
        rmCode,
        displayName: material ? rawMaterialLabel(material) : undefined,
        flags: [],
        revision: 0,
        isNew: true,
      },
      ...prev,
    ]);
    // Open it straight away — a new row's only job is to be classified.
    setFilter('all');
    setQuery('');
    setOpenCode(rmCode);
  };
  // Only an unsaved row can be taken out again: the API has no delete, and a
  // saved classification is history every project's Gate 4 has already read.
  const removeNew = (rmCode: string) => {
    update((prev) => prev.filter((r) => r.rmCode !== rmCode));
    setOpenCode(null);
  };

  const byCode = useMemo(() => new Map(committed.map((r) => [r.rmCode, r])), [committed]);
  const changedRows = draft.filter((d) => JSON.stringify({ ...d, isNew: undefined }) !== JSON.stringify(byCode.get(d.rmCode)));

  // One request per changed row: the endpoint is an upsert keyed by rmCode and each
  // write gets its own revision, so batching would collapse several distinct
  // classification changes into one history entry.
  const save = async () => {
    if (changedRows.length === 0) return;
    setSaving(true);
    try {
      for (const row of changedRows) {
        // A cleared text field must be SENT as cleared: JSON drops `undefined`, and
        // the API reads an absent key as "leave unchanged".
        const body = {
          ...row,
          isNew: undefined,
          evidenceLink: row.evidenceLink ?? '',
          reviewDate: row.reviewDate ?? '',
          notes: row.notes ?? '',
        };
        const res = await fetch(`/api/reference/rm-risk/${encodeURIComponent(row.rmCode)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patch: body }),
        });
        if (!res.ok) throw new Error((await res.json())?.message ?? 'Could not save');
      }
      await loadRmRisk();
      markSaved();
      setHistory(null);
      message.success(`${changedRows.length} raw material(s) classified`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  // The revision history of the material whose drawer is open, read on demand.
  useEffect(() => {
    if (!openCode || history?.rmCode === openCode) return;
    if (!byCode.has(openCode)) return;
    let cancelled = false;
    void fetch(`/api/reference/rm-risk/${encodeURIComponent(openCode)}/revisions`)
      .then((res) => (res.ok ? (res.json() as Promise<Revision[]>) : []))
      .then((revisions) => {
        if (!cancelled) setHistory({ rmCode: openCode, revisions });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [openCode, history, byCode]);

  const saved = draft.filter((r) => !r.isNew);
  const flagged = saved.filter((r) => r.flags.length > 0).length;
  const unsaved = draft.filter((r) => r.isNew).length;
  const visible = draft.filter((r) => {
    const byFilter =
      filter === 'all' ||
      (filter === 'flagged' ? !r.isNew && r.flags.length > 0 : filter === 'clean' ? !r.isNew && r.flags.length === 0 : !!r.isNew);
    const q = query.trim().toLowerCase();
    return byFilter && (!q || `${r.displayName ?? ''} ${r.rmCode}`.toLowerCase().includes(q));
  });
  const chips: [Filter, string, number][] = [
    ['all', 'All', draft.length],
    ['flagged', 'With risk flags', flagged],
    ['clean', 'No risk flag', saved.length - flagged],
    ...(unsaved > 0 ? [['unsaved', 'Not saved yet', unsaved] as [Filter, string, number]] : []),
  ];

  const status = (r: Row) =>
    r.isNew ? <span className="c-tag c-tag-warn">Not saved yet</span> : <span className="c-tag c-tag-ok">rev {r.revision}</span>;
  const open = draft.find((r) => r.rmCode === openCode);
  const revisions = history?.rmCode === openCode ? history.revisions : undefined;

  return (
    <div className="concept au">
      <header className="au-header">
        <div className="mp-title-row">
          <h1 className="au-title">Raw-material risk overlay</h1>
          {!canEdit && <span className="c-tag">Read-only</span>}
        </div>
        {overlay !== null && (
          <div className="au-meta">
            {saved.length} classified · {flagged} with risk flags · {saved.length - flagged} with none
            {unsaved > 0 && (
              <>
                {' · '}
                <b className="au-meta-warn">{unsaved} not saved yet</b>
              </>
            )}
          </div>
        )}
        <p className="au-desc">
          Company-level reference data — classify a material once and every project reads it. A material with no entry
          here is <b>unclassified</b>, not risk-free: Gate 4's allergen, impurity and contaminant review blocks until every
          material a project uses has been classified. Saving with no flag ticked is a real answer — assessed, carries none
          of these risks.
          {!canEdit && ' Editing needs the raw-material risk capability.'}
        </p>
      </header>

      {canEdit && !connected && (
        <Notice tone="warn" title="Cosmetri is not connected" action={<Link to="/integrations">Open Integrations</Link>}>
          You can edit the materials already here, but adding one needs the Cosmetri raw-material catalogue.
        </Notice>
      )}

      <div className="au-toolbar">
        <Input
          className="au-search"
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search material or code"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {chips.map(([key, label, n]) => (
          <button key={key} type="button" className="au-chip" aria-pressed={filter === key} onClick={() => setFilter(key)}>
            {label} <b>{n}</b>
          </button>
        ))}
        {canEdit && connected && (
          <Select
            className="rr-add"
            showSearch={{ optionFilterProp: 'label' }}
            value={null}
            onChange={(v: string | null) => v && addMaterial(v)}
            placeholder="Add a material from Cosmetri"
            options={addOptions}
            popupMatchSelectWidth={false}
            suffixIcon={<PlusOutlined />}
            notFoundContent={catalogue.length === 0 ? 'Loading the catalogue…' : 'Every material is already here'}
          />
        )}
      </div>

      <div className="c-card au-list">
        {overlay === null ? (
          <div className="au-skel">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="c-skel" style={{ height: 36 }} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="au-empty">
            <ExperimentOutlined className="au-empty-icon" />
            {draft.length === 0 ? (
              <>
                <div className="au-empty-title">No material classified yet</div>
                <p>Every project shows its raw materials as unclassified at Gate 4 until they are.</p>
              </>
            ) : (
              <>
                <div className="au-empty-title">{query ? `No material matches “${query}”` : 'No material here'}</div>
                <p>Search by trade name, supplier or RM code.</p>
                {query && <Button onClick={() => setQuery('')}>Clear search</Button>}
              </>
            )}
          </div>
        ) : (
          visible.map((r) => (
            <div
              key={r.rmCode}
              className="au-row mp-row"
              aria-selected={openCode === r.rmCode}
              role="button"
              tabIndex={0}
              onClick={() => setOpenCode(r.rmCode)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setOpenCode(r.rmCode);
                }
              }}
            >
              <div className="rr-name">
                <div className="au-name-text">{r.displayName || r.rmCode}</div>
                {r.displayName && <div className="au-email">{r.rmCode}</div>}
              </div>
              <div className="mp-status">{status(r)}</div>
              <div className="mp-tags">
                {r.isNew ? (
                  <span className="au-email">Still unclassified — open it to record the assessment</span>
                ) : r.flags.length === 0 ? (
                  <span className="au-email">Assessed — no risk flag</span>
                ) : (
                  <>
                    {r.flags.slice(0, ROW_TAG_LIMIT).map((f) => (
                      <span key={f} className="c-tag">
                        {f}
                      </span>
                    ))}
                    {r.flags.length > ROW_TAG_LIMIT && <span className="c-tag">+{r.flags.length - ROW_TAG_LIMIT}</span>}
                  </>
                )}
              </div>
              <div className="mp-updated">
                {r.updatedBy ? `${r.updatedBy}${r.updatedAt ? ` · ${r.updatedAt.slice(0, 10)}` : ''}` : '—'}
              </div>
              <RightOutlined className="au-chev mp-chev" />
            </div>
          ))
        )}
      </div>

      {canEdit && dirty && (
        <div className="c-card mp-savebar" role="status">
          <span className="mp-savebar-text">
            <b>Unsaved changes</b>
            <span className="mp-muted">
              {' · '}
              {changedRows.length} {changedRows.length === 1 ? 'material' : 'materials'} changed — each gets its own revision
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
        onClose={() => setOpenCode(null)}
        size={screens.md ? 520 : '100%'}
        mask={!screens.xxl}
        rootClassName="concept-tokens"
        title={
          open && (
            <span className="mp-drawer-title">
              <span className="rr-drawer-name">{open.displayName || open.rmCode}</span> {status(open)}
            </span>
          )
        }
        footer={
          canEdit ? (
            <div className="rt-drawer-foot">
              <span className="rt-drawer-hint">Changes stay in this page's draft until you Save it.</span>
              {open?.isNew && (
                <Button danger onClick={() => removeNew(open.rmCode)}>
                  Remove
                </Button>
              )}
            </div>
          ) : undefined
        }
      >
        {open && (
          <div className="au-detail">
            <dl className="au-dl">
              <dt>RM code</dt>
              <dd>{open.rmCode}</dd>
              <dt>Source</dt>
              <dd>Cosmetri raw material — name and supplier are read from there</dd>
            </dl>

            <section>
              <div className="rt-sec-title">Risk classifications</div>
              <Checkbox.Group
                className="rr-flags"
                disabled={!canEdit}
                value={open.flags}
                onChange={(next) => patch(open.rmCode, { flags: next as RmRiskFlag[] })}
              >
                {RM_RISK_FLAGS.map((flag) => (
                  <Checkbox key={flag} value={flag}>
                    {flag}
                  </Checkbox>
                ))}
              </Checkbox.Group>
              <p className="au-field-help rr-flags-help">
                {open.flags.length === 0
                  ? 'None ticked — saving records “assessed, carries none of these risks”.'
                  : `${open.flags.length} of ${RM_RISK_FLAGS.length} ticked.`}
              </p>
            </section>

            <section className="mp-fields">
              <label className="au-field">
                <span className="au-field-label">Evidence link</span>
                <Input
                  disabled={!canEdit}
                  placeholder="SDS, CoA or assessment URL"
                  value={open.evidenceLink}
                  onChange={(e) => patch(open.rmCode, { evidenceLink: e.target.value })}
                />
              </label>
              <label className="au-field">
                <span className="au-field-label">Reviewed</span>
                <DatePicker
                  style={{ width: '100%' }}
                  disabled={!canEdit}
                  value={open.reviewDate ? dayjs(open.reviewDate) : null}
                  onChange={(d) => patch(open.rmCode, { reviewDate: d ? d.format('YYYY-MM-DD') : undefined })}
                />
              </label>
              <label className="au-field mp-wide">
                <span className="au-field-label">Notes</span>
                <Input.TextArea
                  autoSize={{ minRows: 2 }}
                  disabled={!canEdit}
                  value={open.notes}
                  onChange={(e) => patch(open.rmCode, { notes: e.target.value })}
                />
              </label>
            </section>

            <section>
              <div className="rt-sec-title">History</div>
              {open.isNew ? (
                <p className="au-field-help">Not saved yet — saving this material creates revision 1.</p>
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
