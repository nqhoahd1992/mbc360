import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Descriptions, Empty, Input, InputNumber, Popconfirm, Row, Select, Statistic, Table, Tag, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, CloudDownloadOutlined } from '@ant-design/icons';
import { Link, useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import type { BomLine, CostingInputs, PackagingBomLine } from '@mbc360/shared/types';
import PhaseDependencyAlert from '../components/PhaseDependencyAlert';
import CosmetriImportModal from '../components/CosmetriImportModal';
import FormulaVersionModal from '../components/FormulaVersionModal';
import FormulaVersionCompareModal, { type FormulaVersionOption } from '../components/FormulaVersionCompareModal';
import { hasReachedPhase, positionSentence } from '@mbc360/shared/utils/gateProgress';
import { bomWatchMatches } from '@mbc360/shared/utils/ingredientWatch';
import { useCosmetriStatus } from '../integrations/useCosmetriStatus';
import { cosmetriListRawMaterials, type CosmetriRawMaterialSummary } from '../integrations/cosmetri';
import { patchArray, useDraft } from '../hooks/useDraft';
import SaveBar from '../components/SaveBar';

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

  // F14: manual BOM lines identify their raw material by picking it from
  // Cosmetri's catalogue rather than typing free text — fetched once per
  // page visit (same simplifying assumption as the formula picker used by
  // CosmetriImportModal; no caching layer yet, see the backend comment).
  const [rawMaterials, setRawMaterials] = useState<CosmetriRawMaterialSummary[]>([]);
  const [loadingRawMaterials, setLoadingRawMaterials] = useState(false);
  useEffect(() => {
    if (!cosmetriConnected) {
      setRawMaterials([]);
      return;
    }
    setLoadingRawMaterials(true);
    cosmetriListRawMaterials()
      .then(setRawMaterials)
      .catch(() => setRawMaterials([]))
      .finally(() => setLoadingRawMaterials(false));
  }, [cosmetriConnected]);

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
    },
  );

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

  // Two lines pointing at the same Cosmetri raw material (whichever source —
  // a full-formula import or the manual picker) is always a mistake: combine
  // the % w/w into one line instead. Lines with no raw material picked yet
  // (empty rmCode) are excluded — several blank rows while filling in a BOM
  // is normal, not a duplicate. Blocks Save entirely rather than just warning,
  // since a duplicate would double-count cost/composition and could hide a
  // watch-list match relevant to the merged quantity.
  const duplicateRawMaterials = useMemo(() => {
    const lineNumbersByRmCode = new Map<string, number[]>();
    for (const l of draftBom) {
      if (!l.rmCode) continue;
      lineNumbersByRmCode.set(l.rmCode, [...(lineNumbersByRmCode.get(l.rmCode) ?? []), l.line]);
    }
    for (const [rmCode, lines] of lineNumbersByRmCode) {
      if (lines.length < 2) lineNumbersByRmCode.delete(rmCode);
    }
    return lineNumbersByRmCode;
  }, [draftBom]);
  const hasDuplicateRawMaterials = duplicateRawMaterials.size > 0;

  // A line with no raw material picked at all (only possible on a manual/
  // picker line — a Cosmetri import always sets rmCode) blocks Save the same
  // way a duplicate does: an incomplete identity can't be reconciled, priced
  // or watch-list screened.
  const emptyRawMaterialLines = draftBom.filter((l) => !l.rmCode);
  const hasEmptyRawMaterialLines = emptyRawMaterialLines.length > 0;
  const bomSaveBlocked = hasDuplicateRawMaterials || hasEmptyRawMaterialLines;

  const watchMatches = bomWatchMatches(project);
  const unitsPerBatch = costing.fillSizeG > 0 ? (costing.batchSizeKg * 1000) / costing.fillSizeG : 0;

  const derived = (l: BomLine) => {
    const kgNeeded = (l.percentWw / 100) * costing.batchSizeKg;
    const costPerBatch = kgNeeded * (l.costPerKg || 0);
    const costPerUnit = unitsPerBatch > 0 ? costPerBatch / unitsPerBatch : 0;
    return { kgNeeded, costPerBatch, costPerUnit };
  };

  // "{trade name} | {code}" matches how Cosmetri's own UI labels a raw
  // material (see the raw-material composition table on a Cosmetri formula)
  // — kept identical to `rmDisplayName` (used for fromCosmetri lines) so a
  // manual line's picker shows the exact same format once something is
  // selected. Supplier is deliberately NOT part of the label (code is already
  // a unique-enough identifier); quality status still surfaces as a warning
  // when it isn't "Approved".
  const rawMaterialLabel = (r: CosmetriRawMaterialSummary) =>
    `${r.tradeName} | ${r.code}${r.qualityStatus !== 'Approved' ? ` (${r.qualityStatus})` : ''}`;

  // Built ONCE per `rawMaterials` fetch (not per row, not per keystroke) —
  // BomCosting re-renders on every draft edit, so mapping/scanning up to
  // 1,000 raw materials inline inside a per-row cell render was the actual
  // source of the typing lag (not an API call; nothing here calls the
  // network per keystroke — every input already only writes to the local
  // useDraft state, committed to the store solely by the Save button).
  const rawMaterialOptions = useMemo(
    () => rawMaterials.map((r) => ({ value: `RM-${r.id}`, label: rawMaterialLabel(r) })),
    [rawMaterials],
  );
  const rawMaterialById = useMemo(
    () => new Map(rawMaterials.map((r) => [`RM-${r.id}`, r])),
    [rawMaterials],
  );
  // F14: the Cosmetri raw material a manual line is pointed at, if any — used
  // to lock the fields Cosmetri's raw-material API actually supplies (only
  // Supplier; it has no INCI/CAS, so those stay user-entered either way).
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
        size="small"
        min={0}
        step={step}
        value={costing[field]}
        onChange={(v) => costingDraft.update((prev) => ({ ...prev, [field]: v ?? 0 }))}
      />
    </Descriptions.Item>
  );

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <PhaseDependencyAlert
        reached={hasReachedPhase(project, 2)}
        title="Phase 2 activity (Gate 05-06)"
        description={`Formula BOM & Costing is normally completed once the formula and packaging route is confirmed in Phase 2. ${positionSentence(project)} You can enter data now — it stays provisional until then.`}
      />

      {showFormula && Math.round(totalPercent * 100) / 100 !== 100 && draftBom.length > 0 && (
        <Alert
          type="warning"
          showIcon
          title={`Formula total is ${money(totalPercent)} % w/w — a complete formula should total 100%.`}
        />
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
                cosmetriConnected
                  ? 'Import composition, INCI/CAS and supplier names read-only from Cosmetri'
                  : 'Connect Cosmetri in Integrations first'
              }
            >
              <Button
                size="small"
                icon={<CloudDownloadOutlined />}
                disabled={!cosmetriConnected}
                onClick={() => setImportOpen(true)}
              >
                Import from Cosmetri
              </Button>
            </Tooltip>
          </span>
        }
      >
        {hasEmptyRawMaterialLines && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 12 }}
            message="Raw material not selected — cannot save"
            description={`Every Formula BOM line needs a raw material picked from Cosmetri before it can be saved. Affected: line${emptyRawMaterialLines.length > 1 ? 's' : ''} ${emptyRawMaterialLines.map((l) => l.line).join(', ')}.`}
          />
        )}
        {hasDuplicateRawMaterials && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 12 }}
            message="Duplicate raw material — cannot save"
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
        {unreconciledBom.length > 0 && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message={`${unreconciledBom.length} manual BOM line${unreconciledBom.length > 1 ? 's' : ''} not reconciled to Cosmetri (Draft)`}
            description="Manual composition must be reconciled to a controlled Cosmetri formula before Gate 7 final safety approval; Gates 10 and 11 require the controlled Cosmetri formula. Click the orange “Draft — reconcile” tag on each line once it has been matched in Cosmetri."
          />
        )}
        <Table
          size="small"
          rowKey={(l) => l.line}
          dataSource={draftBom}
          pagination={false}
          scroll={{ x: 2070 }}
          columns={[
            { title: '#', width: 40, dataIndex: 'line' },
            {
              // F14: source & reconciliation state. Cosmetri lines are inherently
              // reconciled; a manual line is "Draft - Not Reconciled" until it is
              // reconciled to a controlled Cosmetri formula (blocks Gate 7 / 10 / 11).
              title: 'Source',
              width: 170,
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
              // F14: a manual line identifies its raw material by picking it
              // from Cosmetri's catalogue — not free text — so the identity
              // always references a real, existing Cosmetri record. Cosmetri
              // has no "create" flow via this API; a material not yet there
              // goes through the Power Apps request (see the Integrations
              // page / CosmetriImportModal for that link).
              title: 'Raw material (Cosmetri)',
              width: 260,
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
                    size="small"
                    style={{ width: '100%' }}
                    showSearch
                    allowClear
                    status={isDuplicate || isEmpty ? 'error' : undefined}
                    loading={loadingRawMaterials}
                    disabled={!cosmetriConnected}
                    placeholder={cosmetriConnected ? 'Search raw material…' : 'Connect Cosmetri in Integrations first'}
                    value={l.rmCode || undefined}
                    optionFilterProp="label"
                    options={
                      // Keep the line's current value selectable/visible even if
                      // it isn't in the fetched catalogue (legacy data, or a
                      // material since renamed/removed in Cosmetri) — never
                      // silently blank out existing data just by rendering it.
                      // Reuses the memoized `rawMaterialOptions` array as-is
                      // (same reference every render) rather than remapping —
                      // only the rare "not in catalogue" case allocates a new
                      // (tiny) array, and only for that one row.
                      l.rmCode && !rawMaterialById.has(l.rmCode)
                        ? [
                            {
                              value: l.rmCode,
                              label: `${l.rmDisplayName || l.rmCode} — not in the current Cosmetri catalogue`,
                            },
                            ...rawMaterialOptions,
                          ]
                        : rawMaterialOptions
                    }
                    onChange={(value: string | undefined) => {
                      const match = value ? rawMaterialById.get(value) : undefined;
                      patchBomLine(i, {
                        rmCode: value ?? '',
                        rmDisplayName: match ? `${match.tradeName} | ${match.code}` : undefined,
                        // Supplier is a real field Cosmetri's raw-material API
                        // supplies — safe to set as an actual value. INCI is
                        // NOT: the raw-material endpoint has no INCI field at
                        // all (confirmed against a real API response), so this
                        // never sets `inciName` — only a placeholder hint below
                        // shows the trade name, never a stored value that could
                        // masquerade as real Cosmetri data feeding the
                        // prohibited/caution ingredient screen.
                        ...(match && { supplier: match.supplierName }),
                      });
                    }}
                  />
                );
              },
            },
            {
              title: 'Ingredient / INCI',
              width: 240,
              render: (_, l, i) =>
                l.fromCosmetri ? (
                  <Tooltip title="From Cosmetri — read-only">
                    <span style={{ color: '#666' }}>{l.inciName}</span>
                  </Tooltip>
                ) : (
                  <Input
                    size="small"
                    value={l.inciName}
                    // Cosmetri's raw-material API has no INCI field (only
                    // /compliance/{formulaId} does, per formula) — the trade
                    // name is shown as a grey HINT only (never stored/typed
                    // in automatically), so the user always types the real
                    // INCI themselves rather than trusting a guess that could
                    // silently feed the prohibited/caution ingredient screen.
                    placeholder={matchedRawMaterial(l)?.tradeName}
                    onChange={(e) => patchBomLine(i, { inciName: e.target.value })}
                  />
                ),
            },
            {
              title: 'CAS no.',
              width: 120,
              render: (_, l, i) =>
                l.fromCosmetri ? (
                  <Tooltip title="From Cosmetri — read-only">
                    <span style={{ color: '#666' }}>{l.casNo}</span>
                  </Tooltip>
                ) : (
                  <Input
                    size="small"
                    value={l.casNo}
                    placeholder="from Cosmetri"
                    onChange={(e) => patchBomLine(i, { casNo: e.target.value })}
                  />
                ),
            },
            {
              title: 'Function',
              width: 160,
              render: (_, l, i) => (
                <Input size="small" value={l.functionRole} onChange={(e) => patchBomLine(i, { functionRole: e.target.value })} />
              ),
            },
            {
              title: 'Supplier',
              width: 150,
              render: (_, l, i) => {
                const match = matchedRawMaterial(l);
                // Read-only whenever the supplier is a value Cosmetri's own
                // raw-material API supplies — a full formula import
                // (fromCosmetri) or a manual line pointed at a picked
                // Cosmetri raw material — since a silent local edit would
                // just drift from what Cosmetri actually says.
                return l.fromCosmetri || match ? (
                  <Tooltip title="From Cosmetri — read-only">
                    <span style={{ color: '#666' }}>{match?.supplierName ?? l.supplier}</span>
                  </Tooltip>
                ) : (
                  <Input size="small" value={l.supplier} onChange={(e) => patchBomLine(i, { supplier: e.target.value })} />
                );
              },
            },
            {
              title: '% w/w',
              width: 100,
              render: (_, l, i) =>
                l.fromCosmetri ? (
                  <Tooltip title="From Cosmetri — read-only">
                    <span style={{ color: '#666' }}>{money(l.percentWw)}</span>
                  </Tooltip>
                ) : (
                  <InputNumber
                    size="small"
                    min={0}
                    max={100}
                    step={0.1}
                    value={l.percentWw}
                    onChange={(v) => patchBomLine(i, { percentWw: v ?? 0 })}
                  />
                ),
            },
            {
              title: 'Batch kg',
              width: 90,
              render: () => (
                <Tooltip title="Set on the Costing tab (batch size), shared by every line">
                  <span style={{ color: '#666' }}>{money(costing.batchSizeKg)}</span>
                </Tooltip>
              ),
            },
            { title: 'kg needed', width: 100, render: (_, l) => money(derived(l).kgNeeded) },
            {
              title: 'Cost / kg',
              width: 110,
              render: (_, l, i) => (
                <InputNumber
                  size="small"
                  min={0}
                  step={0.1}
                  value={l.costPerKg}
                  onChange={(v) => patchBomLine(i, { costPerKg: v ?? 0 })}
                />
              ),
            },
            { title: 'Cost / batch', width: 110, render: (_, l) => money(derived(l).costPerBatch) },
            { title: 'Cost / unit', width: 100, render: (_, l) => money(derived(l).costPerUnit) },
            {
              title: 'Evidence link',
              width: 140,
              render: (_, l, i) => (
                <Input
                  size="small"
                  value={l.evidenceLink}
                  onChange={(e) => patchBomLine(i, { evidenceLink: e.target.value })}
                />
              ),
            },
            {
              title: 'Method ref',
              width: 120,
              render: (_, l, i) => (
                <Input size="small" value={l.methodRef} onChange={(e) => patchBomLine(i, { methodRef: e.target.value })} />
              ),
            },
            {
              title: 'Notes',
              width: 160,
              render: (_, l, i) => (
                <Input size="small" value={l.notes} onChange={(e) => patchBomLine(i, { notes: e.target.value })} />
              ),
            },
            {
              title: '',
              width: 50,
              render: (_, __, i) => (
                <Popconfirm title="Remove line?" onConfirm={() => removeBomLine(i)}>
                  <Button size="small" danger type="text" icon={<DeleteOutlined />} />
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
        <Button size="small" type="dashed" block icon={<PlusOutlined />} onClick={addBomLine} style={{ marginTop: 8 }}>
          Add line
        </Button>
        <SaveBar
          dirty={bomDraft.dirty}
          onSave={saveBom}
          onDiscard={bomDraft.discard}
          disabled={bomSaveBlocked}
          disabledReason="Resolve the issue(s) flagged above before saving."
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
            scroll={{ x: 900 }}
            columns={[
              { title: 'Date', width: 110, dataIndex: 'date' },
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
        <Table
          size="small"
          rowKey={(l) => l.line}
          dataSource={draftPackaging}
          pagination={false}
          scroll={{ x: 1300 }}
          columns={[
            { title: '#', width: 40, dataIndex: 'line' },
            {
              title: 'Component',
              width: 160,
              render: (_, l, i) => (
                <Input size="small" value={l.component} onChange={(e) => patchPackagingLine(i, { component: e.target.value })} />
              ),
            },
            {
              title: 'Component type',
              width: 140,
              render: (_, l, i) => (
                <Input size="small" value={l.componentType} onChange={(e) => patchPackagingLine(i, { componentType: e.target.value })} />
              ),
            },
            {
              title: 'Supplier',
              width: 140,
              render: (_, l, i) => (
                <Input size="small" value={l.supplier} onChange={(e) => patchPackagingLine(i, { supplier: e.target.value })} />
              ),
            },
            {
              title: 'Units / finished unit',
              width: 110,
              render: (_, l, i) => (
                <InputNumber
                  size="small"
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
                  size="small"
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
                  size="small"
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
                <Input size="small" value={l.leadTime} onChange={(e) => patchPackagingLine(i, { leadTime: e.target.value })} />
              ),
            },
            {
              title: 'MOQ',
              width: 90,
              render: (_, l, i) => (
                <Input size="small" value={l.moq} onChange={(e) => patchPackagingLine(i, { moq: e.target.value })} />
              ),
            },
            {
              title: 'Evidence link',
              width: 130,
              render: (_, l, i) => (
                <Input size="small" value={l.evidenceLink} onChange={(e) => patchPackagingLine(i, { evidenceLink: e.target.value })} />
              ),
            },
            {
              title: 'Approval',
              width: 110,
              render: (_, l, i) => (
                <Input size="small" value={l.approval} onChange={(e) => patchPackagingLine(i, { approval: e.target.value })} />
              ),
            },
            {
              title: '',
              width: 50,
              render: (_, __, i) => (
                <Popconfirm title="Remove component?" onConfirm={() => removePackagingLine(i)}>
                  <Button size="small" danger type="text" icon={<DeleteOutlined />} />
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
        <SaveBar dirty={packagingDraft.dirty} onSave={savePackaging} onDiscard={packagingDraft.discard} />
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
              scroll={{ x: 1000 }}
              locale={{ emptyText: 'No formula lines entered yet' }}
              columns={[
                { title: '#', width: 40, dataIndex: 'line' },
                { title: 'RM Code', width: 110, dataIndex: 'rmCode' },
                { title: 'Ingredient / INCI', width: 240, dataIndex: 'inciName' },
                { title: 'Function', width: 160, dataIndex: 'functionRole' },
                { title: 'Supplier', width: 150, dataIndex: 'supplier' },
                { title: '% w/w', width: 90, render: (_, l) => money(l.percentWw) },
                { title: 'Cost / kg', width: 100, render: (_, l) => money(l.costPerKg || 0) },
                { title: 'kg needed', width: 100, render: (_, l) => money(derived(l).kgNeeded) },
                { title: 'Cost / batch', width: 110, render: (_, l) => money(derived(l).costPerBatch) },
                { title: 'Cost / unit', width: 100, render: (_, l) => money(derived(l).costPerUnit) },
              ]}
              summary={() =>
                bom.length > 0 ? (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={5}>
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
              scroll={{ x: 900 }}
              locale={{ emptyText: 'No packaging components entered yet' }}
              columns={[
                { title: '#', width: 40, dataIndex: 'line' },
                { title: 'Component', width: 160, dataIndex: 'component' },
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
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Card size="small" title="Costing inputs">
            <Descriptions size="small" column={1} bordered>
              {numberInput('batchSizeKg', 'Batch size (kg)', 1)}
              {numberInput('fillSizeG', 'Fill size (g or mL)', 1)}
              {numberInput('targetUnits', 'Target units', 100)}
              <Descriptions.Item label="Packaging cost / unit">
                <InputNumber
                  size="small"
                  min={0}
                  step={0.01}
                  value={costing.packagingCostPerUnit}
                  onChange={(v) => costingDraft.update((prev) => ({ ...prev, packagingCostPerUnit: v ?? 0 }))}
                />
                {draftPackaging.length > 0 && (
                  <span style={{ marginLeft: 8, fontSize: 12, color: '#999' }}>
                    Packaging BOM total: {money(packagingCostTotal)}
                  </span>
                )}
              </Descriptions.Item>
              {numberInput('labourOverheadPerUnit', 'Labour / overhead / unit')}
              {numberInput('freightOtherPerUnit', 'Freight / other / unit')}
              {numberInput('targetSellPrice', 'Target sell price / unit')}
            </Descriptions>
            <SaveBar dirty={costingDraft.dirty} onSave={saveCosting} onDiscard={costingDraft.discard} />
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
