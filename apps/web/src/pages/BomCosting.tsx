import { useState } from 'react';
import { Alert, Button, Card, Col, Descriptions, Empty, Input, InputNumber, Popconfirm, Row, Statistic, Table, Tag, Tooltip } from 'antd';
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
  const watchMatches = bomWatchMatches(project);
  const unitsPerBatch = costing.fillSizeG > 0 ? (costing.batchSizeKg * 1000) / costing.fillSizeG : 0;

  const derived = (l: BomLine) => {
    const kgNeeded = (l.percentWw / 100) * costing.batchSizeKg;
    const costPerBatch = kgNeeded * (l.costPerKg || 0);
    const costPerUnit = unitsPerBatch > 0 ? costPerBatch / unitsPerBatch : 0;
    return { kgNeeded, costPerBatch, costPerUnit };
  };

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
            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={addBomLine}>
              Add line
            </Button>
          </span>
        }
      >
        <Table
          size="small"
          rowKey={(l) => l.line}
          dataSource={draftBom}
          pagination={false}
          scroll={{ x: 1320 }}
          columns={[
            { title: '#', width: 40, dataIndex: 'line' },
            {
              title: 'RM Code',
              width: 110,
              render: (_, l, i) =>
                l.fromCosmetri ? (
                  <Tooltip title="From Cosmetri — read-only">
                    <span style={{ color: '#666' }}>{l.rmCode}</span>
                  </Tooltip>
                ) : (
                  <Input size="small" value={l.rmCode} onChange={(e) => patchBomLine(i, { rmCode: e.target.value })} />
                ),
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
                  <Input size="small" value={l.inciName} onChange={(e) => patchBomLine(i, { inciName: e.target.value })} />
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
              render: (_, l, i) =>
                l.fromCosmetri ? (
                  <Tooltip title="From Cosmetri — read-only">
                    <span style={{ color: '#666' }}>{l.supplier}</span>
                  </Tooltip>
                ) : (
                  <Input size="small" value={l.supplier} onChange={(e) => patchBomLine(i, { supplier: e.target.value })} />
                ),
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
            { title: 'kg needed', width: 100, render: (_, l) => money(derived(l).kgNeeded) },
            { title: 'Cost / batch', width: 110, render: (_, l) => money(derived(l).costPerBatch) },
            { title: 'Cost / unit', width: 100, render: (_, l) => money(derived(l).costPerUnit) },
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
              <Table.Summary.Cell index={4} />
            </Table.Summary.Row>
          )}
        />
        <SaveBar dirty={bomDraft.dirty} onSave={saveBom} onDiscard={bomDraft.discard} />
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
      <Card
        size="small"
        title="Packaging BOM"
        extra={
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={addPackagingLine}>
            Add component
          </Button>
        }
      >
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
