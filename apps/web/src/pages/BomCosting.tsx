import { useMemo, useState } from 'react';
import { Alert, Button, Card, Col, DatePicker, Descriptions, Empty, Input, InputNumber, Popconfirm, Row, Select, Statistic, Table, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { PlusOutlined, DeleteOutlined, CloudDownloadOutlined, UserOutlined, LockOutlined } from '@ant-design/icons';
import { Link, useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import type { BomLine, CostingInputs, PackagingBomLine, RegisterRow } from '@mbc360/shared/types';
import PhaseDependencyAlert from '../components/PhaseDependencyAlert';
import ProjectIdentificationCard from '../components/ProjectIdentificationCard';
import FormulaPropertiesCard from '../components/FormulaPropertiesCard';
import CosmetriImportModal from '../components/CosmetriImportModal';
import FormulaVersionModal from '../components/FormulaVersionModal';
import FormulaVersionCompareModal, { type FormulaVersionOption } from '../components/FormulaVersionCompareModal';
import { hasReachedPhase, isGateRefLocked, positionSentence } from '@mbc360/shared/utils/gateProgress';
import { bomWatchMatches } from '@mbc360/shared/utils/ingredientWatch';
import { useCosmetriStatus } from '../integrations/useCosmetriStatus';
import { composeReviewOwner, type ReviewOwnerSpec } from '@mbc360/shared/config/reviewers';
import { COSTING_FEASIBILITY_STATUSES, COSTING_STATUS_NOT_APPLICABLE } from '@mbc360/shared/config/gates';
import UserSelect from '../components/UserSelect';
import { patchArray, useDraft } from '../hooks/useDraft';
import { NUMERIC_CELL, NUMERIC_COLUMN } from '../utils/numeric';
import SaveBar from '../components/SaveBar';
import { TEXT, TABLE_STICKY } from '../theme/tokens';

// Formula BOM's own review-owner combo (workbook): Formulation owner, Quality
// co-review (Formula BOM & sensory testing), Project Manager co-sign (appended
// by composeReviewOwner). Composed per project from identity.reviewers.
const FORMULA_BOM_REVIEW_OWNER: ReviewOwnerSpec = {
  owner: { role: 'formulation' },
  coReview: [{ role: 'quality', hat: 'Formula BOM & sensory testing' }],
};

function money(v: number) {
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

export default function BomCosting() {
  const { projectId, section } = useParams();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const setBom = useAppStore((s) => s.setBom);
  const setPackagingBomBulk = useAppStore((s) => s.setPackagingBomBulk);
  const setCosting = useAppStore((s) => s.setCosting);
  const cosmetriConnected = useCosmetriStatus().status.connected;
  const [importOpen, setImportOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [compare, setCompare] = useState<{ from?: string; to?: string } | undefined>();

  // Hooks must run unconditionally, so seed drafts from empty defaults when
  // there's no project yet — the early return below happens after.
  const bomDraft = useDraft<BomLine[]>(project?.bom ?? []);
  const packagingDraft = useDraft<PackagingBomLine[]>(project?.packagingBom ?? []);
  const costingDraft = useDraft<CostingInputs>(
    project?.costing ?? {
      batchSizeKg: 0,
      fillSizeG: 0,
      targetUnits: 0,
      packagingCostPerUnit: 0,
      labourOverheadPerUnit: 0,
      freightOtherPerUnit: 0,
      targetSellPrice: 0,
      feasibilityStatus: '',
    },
  );

  // Two lines pointing at the same Cosmetri raw material (whichever source —
  // a full-formula import or the manual picker) is always a mistake: combine
  // the % w/w into one line instead. Lines with no raw material picked yet
  // (empty rmCode) are excluded — several blank rows while filling in a BOM
  // is normal, not a duplicate. Blocks Save entirely rather than just warning,
  // since a duplicate would double-count cost/composition and could hide a
  // watch-list match relevant to the merged quantity.
  //
  // Must run before the `!project` early return below (Rules of Hooks — every
  // hook runs on every render regardless of that condition), so it reads
  // `bomDraft.draft` directly rather than the `draftBom` alias defined after
  // the return.
  const duplicateRawMaterials = useMemo(() => {
    const lineNumbersByRmCode = new Map<string, number[]>();
    for (const l of bomDraft.draft) {
      if (!l.rmCode) continue;
      lineNumbersByRmCode.set(l.rmCode, [...(lineNumbersByRmCode.get(l.rmCode) ?? []), l.line]);
    }
    for (const [rmCode, lines] of lineNumbersByRmCode) {
      if (lines.length < 2) lineNumbersByRmCode.delete(rmCode);
    }
    return lineNumbersByRmCode;
  }, [bomDraft.draft]);

  if (!project) return <Empty description="Project not found" />;

  const { bom, packagingBom } = project;
  const id = project.identity.id;
  const versionOptions: FormulaVersionOption[] = [
    ...project.formulaVersionHistory.map((r) => ({ version: r.previousVersion, bom: r.previousBomSnapshot })),
    { version: project.formulaVersion, bom: project.bom },
  ];
  const draftBom = bomDraft.draft;
  const draftPackaging = packagingDraft.draft;
  const costing = costingDraft.draft;

  // Each of the three BOM/Costing sheets belongs to a different department, so the
  // page can render just one section (via /bom/:section) or all of them (/bom).
  const showFormula = !section || section === 'formula';
  const showPackaging = !section || section === 'packaging';
  const showCosting = !section || section === 'costing';

  const totalPercent = draftBom.reduce((sum, l) => sum + (l.percentWw || 0), 0);
  // F14: manual lines not yet reconciled to a Cosmetri formula.
  const unreconciledBom = draftBom.filter((l) => !l.fromCosmetri && !l.reconciled);

  const hasDuplicateRawMaterials = duplicateRawMaterials.size > 0;

  // A line with no raw material picked at all (only possible on a manual/
  // picker line — a Cosmetri import always sets rmCode) blocks Save the same
  // way a duplicate does: an incomplete identity can't be reconciled, priced
  // or watch-list screened.
  const emptyRawMaterialLines = draftBom.filter((l) => !l.rmCode);
  const hasEmptyRawMaterialLines = emptyRawMaterialLines.length > 0;

  // A material may only be picked into the Formula BOM once R&I/Procurement
  // has screened AND approved it in Supplier_RM_Evidence (Gate 4) — Gate 4's
  // ingredient screening must happen before Gate 5 locks the formula (see
  // registers.ts's `linkedGate: '05_Formula_BOM_Costing'` note and
  // F1_Per_Gate_Open_Questions.md). Tightened 2026-07-23 (user-requested):
  // previously this only required *some* Supplier & RM Evidence row to
  // exist (even an identity-only stub auto-created by CosmetriImportModal,
  // or one added but not yet actually screened) — now it requires that
  // row's `approvedForUse` checkbox to be checked, so a manual line can't
  // reference a raw material that's been added to the register but hasn't
  // actually cleared screening yet. Only applies to manually-picked lines
  // below; a full-formula Cosmetri import (`fromCosmetri`) is a different,
  // already-established trust boundary and is intentionally exempt.
  // 2026-07-23, further tightened (user-requested): the manual-line picker
  // used to search Cosmetri's *entire* raw-material catalogue live (a
  // network call on every page visit) and only then filter down to the
  // approved subset. Since a manual line can only ever reference an already-
  // approved row anyway, that live fetch was both wasteful and the source of
  // a load-order flicker (existing lines briefly looked "not in Cosmetri" on
  // every visit until the fetch resolved) — the approved subset is already
  // sitting locally in `project.registers`, so the picker is built from that
  // directly with no network round-trip and no loading state at all. None of
  // this (nor `rawMaterialOptions`/`rawMaterialById` below) needs
  // memoizing any more either — they now only scan the project's own
  // (small, at most a few dozen rows) Supplier & RM Evidence register,
  // unlike the old up-to-1,000-row live Cosmetri catalogue scan that
  // memoization used to guard against.
  const approvedRmRows = (project.registers['supplierRmEvidence'] ?? []).filter(
    (r) => r.approvedForUse === true && r.rmCode,
  );
  const rmCodesApprovedForUse = new Set(approvedRmRows.map((r) => String(r.rmCode)));

  // A manually-picked line whose raw material has no *approved* Supplier_RM_
  // Evidence record (never had one, it was later removed, the checkbox was
  // unchecked again, or legacy data from before this constraint existed)
  // blocks Save the same way — Gate 4 screening + approval must be done
  // before Gate 5 locks the formula around it. Exempts `fromCosmetri` lines
  // (full-formula import, a different trust boundary).
  const unapprovedManualLines = draftBom.filter(
    (l) => !l.fromCosmetri && l.rmCode && !rmCodesApprovedForUse.has(l.rmCode),
  );
  const hasUnapprovedManualLines = unapprovedManualLines.length > 0;

  // Gate-level edit lock (2026-07-23): Formula BOM & Costing belong to Gate 05,
  // Packaging BOM to Gate 06 — read-only once that gate has passed (edit via
  // Backtrack). `formulaLocked` also gates New-version / Import / Add line.
  const formulaLocked = isGateRefLocked(project, '05');
  const packagingLocked = isGateRefLocked(project, '06');
  const LOCK_REASON =
    'This gate has already passed — its evidence is read-only. Backtrack to reopen the gate first if you need to correct it.';

  const bomSaveBlocked =
    hasDuplicateRawMaterials || hasEmptyRawMaterialLines || hasUnapprovedManualLines || formulaLocked;

  const watchMatches = bomWatchMatches(project);
  const unitsPerBatch = costing.fillSizeG > 0 ? (costing.batchSizeKg * 1000) / costing.fillSizeG : 0;

  const derived = (l: BomLine) => {
    const kgNeeded = (l.percentWw / 100) * costing.batchSizeKg;
    const costPerBatch = kgNeeded * (l.costPerKg || 0);
    const costPerUnit = unitsPerBatch > 0 ? costPerBatch / unitsPerBatch : 0;
    return { kgNeeded, costPerBatch, costPerUnit };
  };

  // "{grade/trade name} | {rmCode}" — same format `rmDisplayName` uses for
  // `fromCosmetri` lines, so a manual line's picker shows an identical style
  // once something is selected. No quality-status suffix needed any more:
  // every row here already passed the `approvedForUse` filter above.
  const rawMaterialLabel = (r: RegisterRow) => `${String(r.grade || r.inciName || r.rmCode)} | ${String(r.rmCode)}`;

  // Built from the (already-filtered, already-local) `approvedRmRows` — see
  // the comment above it for why this no longer needs memoizing.
  const rawMaterialOptions = approvedRmRows.map((r) => ({ value: String(r.rmCode), label: rawMaterialLabel(r) }));
  const rawMaterialById = new Map(approvedRmRows.map((r) => [String(r.rmCode), r]));
  // The Supplier & RM Evidence row a manual line is pointed at, if any — used
  // to lock/pre-fill the fields that register already carries (Supplier);
  // INCI/CAS stay user-entered either way (see the Ingredient/INCI column).
  const matchedRawMaterial = (l: BomLine) => rawMaterialById.get(l.rmCode);

  const packagingDerived = (l: PackagingBomLine) =>
    l.unitCost * l.unitsPerFinishedUnit * (1 + (l.wastagePercent || 0) / 100);
  const packagingCostTotal = draftPackaging.reduce((sum, l) => sum + packagingDerived(l), 0);

  const formulaCostPerUnit = draftBom.reduce((sum, l) => sum + derived(l).costPerUnit, 0);
  const cogs =
    formulaCostPerUnit +
    costing.packagingCostPerUnit +
    costing.labourOverheadPerUnit +
    costing.freightOtherPerUnit;
  const margin = costing.targetSellPrice > 0 ? ((costing.targetSellPrice - cogs) / costing.targetSellPrice) * 100 : 0;

  const patchBomLine = (index: number, patch: Partial<BomLine>) =>
    bomDraft.update((prev) => patchArray(prev, index, patch));
  const addBomLine = () =>
    bomDraft.update((prev) => [
      ...prev,
      { line: prev.length + 1, rmCode: '', inciName: '', functionRole: '', supplier: '', percentWw: 0, costPerKg: 0 },
    ]);
  const removeBomLine = (index: number) =>
    bomDraft.update((prev) => prev.filter((_, i) => i !== index).map((l, i) => ({ ...l, line: i + 1 })));
  const saveBom = () => {
    // Defense in depth — the Save button is already disabled in this case
    // (see the SaveBar `disabled` prop below), but never silently commit a
    // duplicate or incomplete (no raw material picked) line even if that's
    // somehow bypassed.
    if (bomSaveBlocked) return;
    setBom(id, draftBom);
    bomDraft.markSaved();
  };

  const patchPackagingLine = (index: number, patch: Partial<PackagingBomLine>) =>
    packagingDraft.update((prev) => patchArray(prev, index, patch));
  const addPackagingLine = () =>
    packagingDraft.update((prev) => [
      ...prev,
      {
        line: prev.length + 1,
        component: '',
        componentType: '',
        supplier: '',
        unitsPerFinishedUnit: 1,
        unitCost: 0,
        wastagePercent: 0,
      },
    ]);
  const removePackagingLine = (index: number) =>
    packagingDraft.update((prev) => prev.filter((_, i) => i !== index).map((l, i) => ({ ...l, line: i + 1 })));
  const savePackaging = () => {
    setPackagingBomBulk(id, draftPackaging);
    packagingDraft.markSaved();
  };

  const saveCosting = () => {
    setCosting(id, costing);
    costingDraft.markSaved();
  };

  const numberInput = (field: keyof CostingInputs, label: string, step = 0.01) => (
    <Descriptions.Item label={label}>
      <InputNumber
        min={0}
        step={step}
        value={costing[field]}
        disabled={formulaLocked}
        onChange={(v) => costingDraft.update((prev) => ({ ...prev, [field]: v ?? 0 }))}
      />
    </Descriptions.Item>
  );

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <ProjectIdentificationCard project={project} />
      <FormulaPropertiesCard project={project} />

      <PhaseDependencyAlert
        reached={hasReachedPhase(project, 2)}
        title="Phase 2 activity (Gate 05-06)"
        description={`Formula BOM & Costing is normally completed once the formula and packaging route is confirmed in Phase 2. ${positionSentence(project)} You can enter data now — it stays provisional until then.`}
      />

      {/* Formula BOM's own review owner — specific to this section (Packaging/
          Costing below have different owners: Packaging / Supply Chain respectively), so
          scoped to `showFormula` rather than shown page-wide like Project
          Identification above (2026-07-23, user-requested). */}
      {showFormula && (
        <Card size="small">
          <Descriptions size="small" column={1}>
            <Descriptions.Item
              label={
                <span>
                  <UserOutlined style={{ marginRight: 6 }} />
                  Review owner
                </span>
              }
            >
              <b>{composeReviewOwner(FORMULA_BOM_REVIEW_OWNER, project.identity.reviewers)}</b>
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {/* C3: automatic watch-list cross-check on every BOM ingredient. */}
      {showFormula && watchMatches.length > 0 && (
        <Alert
          type="error"
          showIcon
          title={`Automatic ingredient screen: ${watchMatches.length} formula line${watchMatches.length > 1 ? 's' : ''} matched a watch-list — review required`}
          description={
            <div style={{ display: 'grid', gap: 4 }}>
              {watchMatches.map((m) => (
                <div key={m.line}>
                  Line {m.line} — <b>{m.inciName}</b>:{' '}
                  {m.hits.map((h) => (
                    <Tag key={`${h.kind}-${h.group}`} color={h.kind === 'prohibited' ? 'red' : 'orange'}>
                      {h.kind === 'prohibited' ? 'Prohibited list' : 'PB caution'} · {h.group}
                      {h.matchedBy === 'cas' ? ` (CAS ${h.matchedValue})` : ''}
                    </Tag>
                  ))}
                </div>
              ))}
              <div style={{ marginTop: 4 }}>
                Record the review conclusion in{' '}
                <Link to={`/projects/${id}/registers/reg/prohibitedIngredients`}>
                  Prohibited Ingredient Watch-list
                </Link>{' '}
                and{' '}
                <Link to={`/projects/${id}/registers/reg/pbCautionLimits`}>
                  Pregnancy / Breastfeeding Caution Limits
                </Link>
                .
              </div>
            </div>
          }
        />
      )}

      {showFormula && (
      <Card
        size="small"
        title={
          <span>
            Formula BOM — {project.identity.productSku}{' '}
            <Tag color="blue">{project.formulaVersion}</Tag>
          </span>
        }
        extra={
          <span style={{ display: 'inline-flex', gap: 8 }}>
            <Button size="small" onClick={() => setVersionOpen(true)}>
              New formula version
            </Button>
            <Tooltip
              title={
                formulaLocked
                  ? LOCK_REASON
                  : cosmetriConnected
                    ? 'Import composition, INCI/CAS and supplier names read-only from Cosmetri'
                    : 'Connect Cosmetri in Integrations first'
              }
            >
              <Button
                size="small"
                icon={<CloudDownloadOutlined />}
                disabled={!cosmetriConnected || formulaLocked}
                onClick={() => setImportOpen(true)}
              >
                Import from Cosmetri
              </Button>
            </Tooltip>
          </span>
        }
      >
        {formulaLocked && (
          <Alert
            type="info"
            showIcon
            icon={<LockOutlined />}
            style={{ marginBottom: 12 }}
            title="Read-only — Gate 05 passed"
            description={LOCK_REASON}
          />
        )}
        {hasEmptyRawMaterialLines && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 12 }}
            title="Raw material not selected — cannot save"
            description={`Every Formula BOM line needs a raw material picked from an approved Supplier & RM Evidence record before it can be saved. Affected: line${emptyRawMaterialLines.length > 1 ? 's' : ''} ${emptyRawMaterialLines.map((l) => l.line).join(', ')}.`}
          />
        )}
        {hasDuplicateRawMaterials && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 12 }}
            title="Duplicate raw material — cannot save"
            description={
              <>
                Each Formula BOM line must reference a different raw material — combine the % w/w
                into a single line instead of repeating it. Affected:{' '}
                {[...duplicateRawMaterials.entries()]
                  .map(([rmCode, lines]) => {
                    const label = draftBom.find((l) => l.rmCode === rmCode)?.rmDisplayName || rmCode;
                    return `${label} (lines ${lines.join(', ')})`;
                  })
                  .join('; ')}
                .
              </>
            }
          />
        )}
        {hasUnapprovedManualLines && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 12 }}
            title="Raw material not approved for use — cannot save"
            description={`Every manually-picked Formula BOM line must reference a material whose Supplier & RM Evidence record has "Approved for use?" checked (Gate 4 screening + approval before Gate 5 locks the formula). Affected: line${unapprovedManualLines.length > 1 ? 's' : ''} ${unapprovedManualLines.map((l) => l.line).join(', ')} — check "Approved for use?" on that material's Supplier & RM Evidence record first.`}
          />
        )}
        {unreconciledBom.length > 0 && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            title={`${unreconciledBom.length} manual BOM line${unreconciledBom.length > 1 ? 's' : ''} not reconciled to Cosmetri (Draft)`}
            description="Manual composition must be reconciled to a controlled Cosmetri formula before Gate 7 final safety approval; Gates 10 and 11 require the controlled Cosmetri formula. Click the orange “Draft — reconcile” tag on each line once it has been matched in Cosmetri."
          />
        )}
        <Table
          size="small"
          rowKey={(l) => l.line}
          dataSource={draftBom}
          pagination={false}
          sticky={TABLE_STICKY}
          scroll={{ x: 2070 }}
          columns={[
            { title: '#', width: 40, fixed: 'left', dataIndex: 'line' },
            {
              // F14: source & reconciliation state. Cosmetri lines are inherently
              // reconciled; a manual line is "Draft - Not Reconciled" until it is
              // reconciled to a controlled Cosmetri formula (blocks Gate 7 / 10 / 11).
              title: 'Source',
              width: 170,
              fixed: 'left',
              render: (_, l, i) =>
                l.fromCosmetri ? (
                  <Tag color="green">Cosmetri</Tag>
                ) : l.reconciled ? (
                  <Tooltip title="Manual line reconciled to a Cosmetri formula">
                    <Tag color="blue" style={{ cursor: 'pointer' }} onClick={() => patchBomLine(i, { reconciled: false })}>
                      Reconciled
                    </Tag>
                  </Tooltip>
                ) : (
                  <Tooltip title="Reconcile this manual line against a controlled Cosmetri formula (required before Gate 7)">
                    <Tag
                      color="orange"
                      style={{ cursor: 'pointer' }}
                      onClick={() => patchBomLine(i, { reconciled: true })}
                    >
                      Draft — reconcile
                    </Tag>
                  </Tooltip>
                ),
            },
            {
              // F14/Gate 4: a manual line identifies its raw material by
              // picking it from the already-approved Supplier & RM Evidence
              // list — not free text, and (2026-07-23) no longer a live
              // Cosmetri catalogue search either, since only materials that
              // already cleared Gate 4 screening (`approvedForUse`) are ever
              // selectable here anyway. A material not yet screened/approved
              // goes through Supplier & RM Evidence first (which has its own
              // Cosmetri picker for adding a new row), or the Power Apps
              // "create new raw material" request if it's not in Cosmetri at
              // all (see the Integrations page).
              // Title dropped its "(Cosmetri)" qualifier (2026-07-23,
              // user-reported): the picker here no longer searches Cosmetri
              // directly (see the comment above), and the per-row "Source"
              // column already shows provenance (Cosmetri tag vs Draft —
              // reconcile) — repeating "Cosmetri" in this header was stale
              // and misleading now that the real source is Supplier & RM
              // Evidence.
              title: 'Raw material',
              width: 260,
              fixed: 'left',
              render: (_, l, i) => {
                const isDuplicate = !!l.rmCode && duplicateRawMaterials.has(l.rmCode);
                const isEmpty = !l.rmCode;
                return l.fromCosmetri ? (
                  // Read-only, same label format as the picker below — a
                  // full-formula import used to just show the raw internal
                  // join key (rmCode, e.g. "RM-57136"), which isn't anything
                  // a human sees inside Cosmetri itself.
                  <Tooltip title={isDuplicate ? 'Duplicate raw material — cannot save' : 'From Cosmetri — read-only'}>
                    <span style={{ color: isDuplicate ? '#cf1322' : '#666' }}>
                      {l.rmDisplayName || l.rmCode}
                    </span>
                  </Tooltip>
                ) : (
                  <Select
                    style={{ width: '100%' }}
                    showSearch
                    allowClear
                    status={isDuplicate || isEmpty ? 'error' : undefined}
                    placeholder="Search approved raw material…"
                    value={l.rmCode || undefined}
                    optionFilterProp="label"
                    options={
                      // Keep the line's current value selectable/visible even if
                      // it's no longer pickable for any reason (legacy data, its
                      // Supplier_RM_Evidence row was later deleted, or the
                      // `approvedForUse` checkbox was unchecked again) — never
                      // silently blank out existing data just by rendering it.
                      l.rmCode && !rawMaterialOptions.some((o) => o.value === l.rmCode)
                        ? [
                            {
                              value: l.rmCode,
                              label: `${l.rmDisplayName || l.rmCode} — not approved for use in Supplier & RM Evidence`,
                            },
                            ...rawMaterialOptions,
                          ]
                        : rawMaterialOptions
                    }
                    onChange={(value: string | undefined) => {
                      const match = value ? rawMaterialById.get(value) : undefined;
                      patchBomLine(i, {
                        rmCode: value ?? '',
                        rmDisplayName: match ? rawMaterialLabel(match) : undefined,
                        // Supplier is a real field already captured on the
                        // Supplier & RM Evidence row — safe to set as an
                        // actual value. INCI is left to the user (see the
                        // Ingredient/INCI column's placeholder instead), so
                        // this never silently sets `inciName` from a value
                        // that could masquerade as verified data feeding the
                        // prohibited/caution ingredient screen.
                        ...(match && { supplier: String(match.supplier ?? '') }),
                      });
                    }}
                  />
                );
              },
            },
            {
              title: 'Ingredient / INCI',
              width: 240,
              render: (_, l, i) => {
                const match = matchedRawMaterial(l);
                return (
                  <Input
                    value={l.inciName}
                    // Always editable, even on a `fromCosmetri` (full-formula
                    // import) line: unlike Supplier, INCI here isn't a direct
                    // Cosmetri field on that path — the formula-import endpoint
                    // joins it from /compliance/{formulaId} by raw-material
                    // TRADE NAME (that endpoint carries no raw-material id), a
                    // best-effort match that can come back blank or wrong.
                    // Locking it read-only would leave no way to fix a bad/
                    // missing join. On a manually-picked line, the placeholder
                    // is the actual screened INCI name from that material's
                    // Supplier & RM Evidence row (only a hint, not auto-filled —
                    // still user-entered/confirmed either way).
                    placeholder={match?.inciName ? String(match.inciName) : undefined}
                    onChange={(e) => patchBomLine(i, { inciName: e.target.value })}
                  />
                );
              },
            },
            {
              title: 'CAS no.',
              width: 120,
              render: (_, l, i) => (
                <Input
                  value={l.casNo}
                  placeholder="from Cosmetri"
                  // Same reasoning as Ingredient/INCI above — CAS comes from
                  // the same best-effort compliance join, not a reliable
                  // direct field, so it stays editable on imported lines too.
                  onChange={(e) => patchBomLine(i, { casNo: e.target.value })}
                />
              ),
            },
            {
              title: 'Function',
              width: 160,
              render: (_, l, i) => (
                <Input value={l.functionRole} onChange={(e) => patchBomLine(i, { functionRole: e.target.value })} />
              ),
            },
            {
              title: 'Supplier',
              width: 150,
              render: (_, l, i) => {
                const match = matchedRawMaterial(l);
                // Read-only whenever the supplier is a value already captured
                // elsewhere — a full formula import (fromCosmetri) or a
                // manual line pointed at an approved Supplier & RM Evidence
                // row — since a silent local edit here would just drift from
                // what that record actually says.
                return l.fromCosmetri || match ? (
                  <Tooltip title="From Supplier & RM Evidence — read-only">
                    <span style={{ color: '#666' }}>{match ? String(match.supplier ?? '') : l.supplier}</span>
                  </Tooltip>
                ) : (
                  <Input value={l.supplier} onChange={(e) => patchBomLine(i, { supplier: e.target.value })} />
                );
              },
            },
            {
              title: '% w/w',
              width: 100,
              ...NUMERIC_COLUMN,
              render: (_, l, i) =>
                l.fromCosmetri ? (
                  <Tooltip title="From Cosmetri — read-only">
                    <span style={{ color: '#666', ...NUMERIC_CELL }}>{money(l.percentWw)}</span>
                  </Tooltip>
                ) : (
                  <InputNumber
                    min={0}
                    max={100}
                    step={0.1}
                    style={NUMERIC_CELL}
                    value={l.percentWw}
                    onChange={(v) => patchBomLine(i, { percentWw: v ?? 0 })}
                  />
                ),
            },
            {
              title: 'Batch kg',
              width: 90,
              ...NUMERIC_COLUMN,
              render: () => (
                <Tooltip title="Set on the Costing tab (batch size), shared by every line">
                  <span style={{ color: '#666', ...NUMERIC_CELL }}>{money(costing.batchSizeKg)}</span>
                </Tooltip>
              ),
            },
            {
              title: 'kg needed',
              width: 100,
              ...NUMERIC_COLUMN,
              render: (_, l) => <span style={NUMERIC_CELL}>{money(derived(l).kgNeeded)}</span>,
            },
            {
              title: 'Cost / kg',
              width: 110,
              ...NUMERIC_COLUMN,
              render: (_, l, i) => (
                <InputNumber
                  min={0}
                  step={0.1}
                  style={NUMERIC_CELL}
                  value={l.costPerKg}
                  onChange={(v) => patchBomLine(i, { costPerKg: v ?? 0 })}
                />
              ),
            },
            {
              title: 'Cost / batch',
              width: 110,
              ...NUMERIC_COLUMN,
              render: (_, l) => <span style={NUMERIC_CELL}>{money(derived(l).costPerBatch)}</span>,
            },
            {
              title: 'Cost / unit',
              width: 100,
              ...NUMERIC_COLUMN,
              render: (_, l) => <span style={NUMERIC_CELL}>{money(derived(l).costPerUnit)}</span>,
            },
            {
              title: 'Evidence link',
              width: 140,
              render: (_, l, i) => (
                <Input
                  value={l.evidenceLink}
                  onChange={(e) => patchBomLine(i, { evidenceLink: e.target.value })}
                />
              ),
            },
            {
              title: 'Method ref',
              width: 120,
              render: (_, l, i) => (
                <Input value={l.methodRef} onChange={(e) => patchBomLine(i, { methodRef: e.target.value })} />
              ),
            },
            {
              title: 'Notes',
              width: 160,
              render: (_, l, i) => (
                <Input value={l.notes} onChange={(e) => patchBomLine(i, { notes: e.target.value })} />
              ),
            },
            {
              title: '',
              width: 50,
              fixed: 'right',
              render: (_, __, i) => (
                <Popconfirm title="Remove line?" onConfirm={() => removeBomLine(i)}>
                  <Button size="small" danger type="text" aria-label="Remove this formula line" icon={<DeleteOutlined />} />
                </Popconfirm>
              ),
            },
          ]}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={7}>
                <b>Total</b>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                <b>{money(totalPercent)}%</b>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} colSpan={4} />
              <Table.Summary.Cell index={3}>
                <b>{money(formulaCostPerUnit)}</b>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} colSpan={4} />
            </Table.Summary.Row>
          )}
        />
        {/* Moved inside the Formula BOM card, below the table (2026-07-23,
            user-requested) — it used to sit above the card, at the very top
            of the page. */}
        {Math.round(totalPercent * 100) / 100 !== 100 && draftBom.length > 0 && (
          <Alert
            type="warning"
            showIcon
            style={{ marginTop: 12 }}
            title={`Formula total is ${money(totalPercent)} % w/w — a complete formula should total 100%.`}
          />
        )}
        {!formulaLocked && (
          <Button size="small" type="dashed" block icon={<PlusOutlined />} onClick={addBomLine} style={{ marginTop: 8 }}>
            Add line
          </Button>
        )}
        <SaveBar
          dirty={bomDraft.dirty}
          onSave={saveBom}
          onDiscard={bomDraft.discard}
          disabled={bomSaveBlocked}
          disabledReason={formulaLocked ? LOCK_REASON : 'Resolve the issue(s) flagged above before saving.'}
        />
      </Card>
      )}

      {showFormula && project.formulaVersionHistory.length > 0 && (
        <Card
          size="small"
          title="Formula version history (audit)"
          extra={
            <Button size="small" onClick={() => setCompare({})}>
              Compare versions
            </Button>
          }
        >
          <Table
            size="small"
            rowKey={(r) => `${r.version}-${r.date}`}
            dataSource={[...project.formulaVersionHistory].reverse()}
            pagination={false}
            sticky={TABLE_STICKY}
            scroll={{ x: 900 }}
            columns={[
              { title: 'Date', width: 110, fixed: 'left', dataIndex: 'date' },
              {
                title: 'Version',
                width: 160,
                render: (_, r) => (
                  <span>
                    {r.previousVersion} → <b>{r.version}</b>
                  </span>
                ),
              },
              {
                title: 'Type',
                width: 90,
                render: (_, r) => (
                  <Tag color={r.changeType === 'Major' ? 'red' : 'default'}>{r.changeType}</Tag>
                ),
              },
              { title: 'Initiated by', width: 140, render: (_, r) => r.initiatedBy ?? '—' },
              { title: 'Reason', render: (_, r) => r.reason ?? '—' },
              {
                title: '',
                width: 90,
                fixed: 'right',
                render: (_, r) => (
                  <Button size="small" type="link" onClick={() => setCompare({ from: r.previousVersion, to: r.version })}>
                    Compare
                  </Button>
                ),
              },
            ]}
          />
        </Card>
      )}
      <FormulaVersionCompareModal
        open={!!compare}
        onClose={() => setCompare(undefined)}
        options={versionOptions}
        initialFrom={compare?.from}
        initialTo={compare?.to}
      />

      <CosmetriImportModal
        projectId={id}
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => bomDraft.markSaved()}
        hasExistingBom={bom.length > 0}
      />
      <FormulaVersionModal
        projectId={id}
        currentVersion={project.formulaVersion}
        open={versionOpen}
        onClose={() => setVersionOpen(false)}
      />

      {showPackaging && (
      <Card size="small" title="Packaging BOM">
        {packagingLocked && (
          <Alert
            type="info"
            showIcon
            icon={<LockOutlined />}
            style={{ marginBottom: 12 }}
            title="Read-only — Gate 06 passed"
            description={LOCK_REASON}
          />
        )}
        <Table
          size="small"
          rowKey={(l) => l.line}
          dataSource={draftPackaging}
          pagination={false}
          sticky={TABLE_STICKY}
          scroll={{ x: 1300 }}
          columns={[
            { title: '#', width: 40, fixed: 'left', dataIndex: 'line' },
            {
              title: 'Component',
              width: 160,
              fixed: 'left',
              render: (_, l, i) => (
                <Input value={l.component} onChange={(e) => patchPackagingLine(i, { component: e.target.value })} />
              ),
            },
            {
              title: 'Component type',
              width: 140,
              render: (_, l, i) => (
                <Input value={l.componentType} onChange={(e) => patchPackagingLine(i, { componentType: e.target.value })} />
              ),
            },
            {
              title: 'Supplier',
              width: 140,
              render: (_, l, i) => (
                <Input value={l.supplier} onChange={(e) => patchPackagingLine(i, { supplier: e.target.value })} />
              ),
            },
            {
              title: 'Units / finished unit',
              width: 110,
              render: (_, l, i) => (
                <InputNumber
                  min={0}
                  step={1}
                  value={l.unitsPerFinishedUnit}
                  onChange={(v) => patchPackagingLine(i, { unitsPerFinishedUnit: v ?? 0 })}
                />
              ),
            },
            {
              title: 'Unit cost',
              width: 100,
              render: (_, l, i) => (
                <InputNumber
                  min={0}
                  step={0.01}
                  value={l.unitCost}
                  onChange={(v) => patchPackagingLine(i, { unitCost: v ?? 0 })}
                />
              ),
            },
            {
              title: 'Wastage %',
              width: 100,
              render: (_, l, i) => (
                <InputNumber
                  min={0}
                  step={0.5}
                  value={l.wastagePercent}
                  onChange={(v) => patchPackagingLine(i, { wastagePercent: v ?? 0 })}
                />
              ),
            },
            { title: 'Cost / unit', width: 100, render: (_, l) => money(packagingDerived(l)) },
            {
              title: 'Lead time',
              width: 100,
              render: (_, l, i) => (
                <Input value={l.leadTime} onChange={(e) => patchPackagingLine(i, { leadTime: e.target.value })} />
              ),
            },
            {
              title: 'MOQ',
              width: 90,
              render: (_, l, i) => (
                <Input value={l.moq} onChange={(e) => patchPackagingLine(i, { moq: e.target.value })} />
              ),
            },
            {
              title: 'Evidence link',
              width: 130,
              render: (_, l, i) => (
                <Input value={l.evidenceLink} onChange={(e) => patchPackagingLine(i, { evidenceLink: e.target.value })} />
              ),
            },
            {
              title: 'Approval',
              width: 110,
              render: (_, l, i) => (
                <Input value={l.approval} onChange={(e) => patchPackagingLine(i, { approval: e.target.value })} />
              ),
            },
            {
              title: '',
              width: 50,
              fixed: 'right',
              render: (_, __, i) => (
                <Popconfirm title="Remove component?" onConfirm={() => removePackagingLine(i)}>
                  <Button size="small" danger type="text" aria-label="Remove this packaging component" icon={<DeleteOutlined />} />
                </Popconfirm>
              ),
            },
          ]}
          summary={() =>
            draftPackaging.length > 0 ? (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={6}>
                  <b>Total packaging cost / unit</b>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <b>{money(packagingCostTotal)}</b>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            ) : null
          }
        />
        {!packagingLocked && (
          <Button
            size="small"
            type="dashed"
            block
            icon={<PlusOutlined />}
            onClick={addPackagingLine}
            style={{ marginTop: 8 }}
          >
            Add component
          </Button>
        )}
        <SaveBar
          dirty={packagingDraft.dirty}
          onSave={savePackaging}
          onDiscard={packagingDraft.discard}
          disabled={packagingLocked}
          disabledReason={LOCK_REASON}
        />
      </Card>
      )}

      {showCosting && (
      <>
      {section === 'costing' && (
        <>
          <Card size="small" title="Formula BOM (read-only reference)">
            <Table
              size="small"
              rowKey={(l) => l.line}
              dataSource={bom}
              pagination={false}
              sticky={TABLE_STICKY}
              scroll={{ x: 1200 }}
              locale={{ emptyText: 'No formula lines entered yet' }}
              columns={[
                { title: '#', width: 40, fixed: 'left', dataIndex: 'line' },
                // Trade name isn't its own `BomLine` field — every path that
                // sets `rmDisplayName` (CosmetriImportModal's whole-formula
                // import, and the manual picker's `rawMaterialLabel`) writes
                // it as "{trade name} | {rmCode}", so the trade name is
                // whatever comes before that separator.
                { title: 'Trade name', width: 200, fixed: 'left', render: (_, l) => l.rmDisplayName?.split(' | ')[0] ?? '' },
                { title: 'RM Code', width: 110, dataIndex: 'rmCode' },
                { title: 'Ingredient / INCI', width: 240, dataIndex: 'inciName' },
                { title: 'Function', width: 160, dataIndex: 'functionRole' },
                { title: 'Supplier', width: 150, dataIndex: 'supplier' },
                { title: '% w/w', width: 90, ...NUMERIC_COLUMN, render: (_, l) => <span style={NUMERIC_CELL}>{money(l.percentWw)}</span> },
                { title: 'Cost / kg', width: 100, ...NUMERIC_COLUMN, render: (_, l) => <span style={NUMERIC_CELL}>{money(l.costPerKg || 0)}</span> },
                { title: 'kg needed', width: 100, ...NUMERIC_COLUMN, render: (_, l) => <span style={NUMERIC_CELL}>{money(derived(l).kgNeeded)}</span> },
                { title: 'Cost / batch', width: 110, ...NUMERIC_COLUMN, render: (_, l) => <span style={NUMERIC_CELL}>{money(derived(l).costPerBatch)}</span> },
                { title: 'Cost / unit', width: 100, ...NUMERIC_COLUMN, render: (_, l) => <span style={NUMERIC_CELL}>{money(derived(l).costPerUnit)}</span> },
              ]}
              summary={() =>
                bom.length > 0 ? (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={6}>
                      <b>Total</b>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}>
                      <b>{money(totalPercent)}%</b>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} colSpan={3} />
                    <Table.Summary.Cell index={3}>
                      <b>{money(formulaCostPerUnit)}</b>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                ) : null
              }
            />
          </Card>

          <Card size="small" title="Packaging BOM (read-only reference)">
            <Table
              size="small"
              rowKey={(l) => l.line}
              dataSource={packagingBom}
              pagination={false}
              sticky={TABLE_STICKY}
              scroll={{ x: 900 }}
              locale={{ emptyText: 'No packaging components entered yet' }}
              columns={[
                { title: '#', width: 40, fixed: 'left', dataIndex: 'line' },
                { title: 'Component', width: 160, fixed: 'left', dataIndex: 'component' },
                { title: 'Component type', width: 140, dataIndex: 'componentType' },
                { title: 'Supplier', width: 140, dataIndex: 'supplier' },
                { title: 'Units / finished unit', width: 110, dataIndex: 'unitsPerFinishedUnit' },
                { title: 'Unit cost', width: 100, render: (_, l) => money(l.unitCost || 0) },
                { title: 'Wastage %', width: 90, dataIndex: 'wastagePercent' },
                { title: 'Cost / unit', width: 100, render: (_, l) => money(packagingDerived(l)) },
              ]}
              summary={() =>
                packagingBom.length > 0 ? (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={7}>
                      <b>Total packaging cost / unit</b>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}>
                      <b>{money(packagingCostTotal)}</b>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                ) : null
              }
            />
          </Card>
        </>
      )}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card size="small" title="Costing inputs">
            {formulaLocked && (
              <Alert
                type="info"
                showIcon
                icon={<LockOutlined />}
                style={{ marginBottom: 12 }}
                title="Read-only — Gate 05 passed"
                description={LOCK_REASON}
              />
            )}
            <Descriptions size="small" column={1} bordered>
              {numberInput('batchSizeKg', 'Batch size (kg)', 1)}
              {numberInput('fillSizeG', 'Fill size (g or mL)', 1)}
              {numberInput('targetUnits', 'Target units', 100)}
              <Descriptions.Item label="Packaging cost / unit">
                <InputNumber
                  min={0}
                  step={0.01}
                  value={costing.packagingCostPerUnit}
                  disabled={formulaLocked}
                  onChange={(v) => costingDraft.update((prev) => ({ ...prev, packagingCostPerUnit: v ?? 0 }))}
                />
                {draftPackaging.length > 0 && (
                  <span style={{ marginLeft: 8, fontSize: 12, color: TEXT.secondary }}>
                    Packaging BOM total: {money(packagingCostTotal)}
                  </span>
                )}
              </Descriptions.Item>
              {numberInput('labourOverheadPerUnit', 'Labour / overhead / unit')}
              {numberInput('freightOtherPerUnit', 'Freight / other / unit')}
              {numberInput('targetSellPrice', 'Target sell price / unit')}
            </Descriptions>

            {/* Round 4 question 36(b), 2026-08-29. Kept in its own block below the
                numbers because it is a JUDGEMENT about them, not another input to
                them: every number above is pre-filled at project creation, which
                is exactly why the Gate 5 readiness item reading this screen had
                no signal to read until now. */}
            <Descriptions
              size="small"
              column={1}
              bordered
              style={{ marginTop: 12 }}
              title="Commercial feasibility"
            >
              <Descriptions.Item label="Costing / commercial feasibility status">
                <Select
                  style={{ minWidth: 260 }}
                  allowClear
                  placeholder="Not assessed"
                  value={costing.feasibilityStatus || undefined}
                  disabled={formulaLocked}
                  options={COSTING_FEASIBILITY_STATUSES.map((o) => ({ value: o, label: o }))}
                  onChange={(v?: string) =>
                    costingDraft.update((prev) => ({ ...prev, feasibilityStatus: v ?? '' }))
                  }
                />
              </Descriptions.Item>
              <Descriptions.Item label="Assessor">
                <UserSelect
                  value={costing.assessor}
                  disabled={formulaLocked}
                  onChange={(v) => costingDraft.update((prev) => ({ ...prev, assessor: v }))}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Review date">
                <DatePicker
                  value={costing.reviewDate ? dayjs(costing.reviewDate) : null}
                  disabled={formulaLocked}
                  onChange={(d) =>
                    costingDraft.update((prev) => ({ ...prev, reviewDate: d ? d.format('YYYY-MM-DD') : undefined }))
                  }
                />
              </Descriptions.Item>
              <Descriptions.Item label="Assumptions or conditions">
                <Input.TextArea
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  // The one status that names its own obligation, so it is the one
                  // the readiness check refuses without this field.
                  status={
                    costing.feasibilityStatus === COSTING_STATUS_NOT_APPLICABLE &&
                    (costing.assumptions ?? '').trim() === ''
                      ? 'error'
                      : undefined
                  }
                  placeholder={
                    costing.feasibilityStatus === COSTING_STATUS_NOT_APPLICABLE
                      ? 'Why costing does not apply to this project'
                      : 'Assumptions or conditions behind this status'
                  }
                  value={costing.assumptions}
                  disabled={formulaLocked}
                  onChange={(e) => costingDraft.update((prev) => ({ ...prev, assumptions: e.target.value }))}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Evidence or costing-version link">
                <Input
                  placeholder="link"
                  value={costing.evidenceLink}
                  disabled={formulaLocked}
                  onChange={(e) => costingDraft.update((prev) => ({ ...prev, evidenceLink: e.target.value }))}
                />
              </Descriptions.Item>
            </Descriptions>
            <SaveBar
              dirty={costingDraft.dirty}
              onSave={saveCosting}
              onDiscard={costingDraft.discard}
              disabled={formulaLocked}
              disabledReason={LOCK_REASON}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card size="small" title="Costing outputs (auto-calculated)">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic title="Units per batch" value={Math.floor(unitsPerBatch)} />
              </Col>
              <Col span={12}>
                <Statistic title="Formula cost / unit" value={money(formulaCostPerUnit)} />
              </Col>
              <Col span={12}>
                <Statistic title="COGS / unit" value={money(cogs)} />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Gross margin"
                  value={money(margin)}
                  suffix="%"
                  styles={{ content: { color: margin >= 50 ? '#3f8600' : margin > 0 ? '#fa8c16' : '#cf1322' } }}
                />
              </Col>
              <Col span={12}>
                <Statistic title="Batch formula cost" value={money(formulaCostPerUnit * unitsPerBatch)} />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Forecast COGS (target units)"
                  value={money(cogs * costing.targetUnits)}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
      </>
      )}
    </div>
  );
}
