import { Alert, Button, Card, Col, Descriptions, Empty, Input, InputNumber, Popconfirm, Row, Statistic, Table } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import type { BomLine, CostingInputs } from '../types';
import PhaseDependencyAlert from '../components/PhaseDependencyAlert';
import { hasReachedPhase, positionSentence } from '../utils/gateProgress';

function money(v: number) {
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

export default function BomCosting() {
  const { projectId } = useParams();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const setBomLine = useAppStore((s) => s.setBomLine);
  const addBomLine = useAppStore((s) => s.addBomLine);
  const removeBomLine = useAppStore((s) => s.removeBomLine);
  const setCosting = useAppStore((s) => s.setCosting);

  if (!project) return <Empty description="Project not found" />;

  const { bom, costing } = project;
  const id = project.identity.id;

  const totalPercent = bom.reduce((sum, l) => sum + (l.percentWw || 0), 0);
  const unitsPerBatch = costing.fillSizeG > 0 ? (costing.batchSizeKg * 1000) / costing.fillSizeG : 0;

  const derived = (l: BomLine) => {
    const kgNeeded = (l.percentWw / 100) * costing.batchSizeKg;
    const costPerBatch = kgNeeded * (l.costPerKg || 0);
    const costPerUnit = unitsPerBatch > 0 ? costPerBatch / unitsPerBatch : 0;
    return { kgNeeded, costPerBatch, costPerUnit };
  };

  const formulaCostPerUnit = bom.reduce((sum, l) => sum + derived(l).costPerUnit, 0);
  const cogs =
    formulaCostPerUnit +
    costing.packagingCostPerUnit +
    costing.labourOverheadPerUnit +
    costing.freightOtherPerUnit;
  const margin = costing.targetSellPrice > 0 ? ((costing.targetSellPrice - cogs) / costing.targetSellPrice) * 100 : 0;

  const numberInput = (field: keyof CostingInputs, label: string, step = 0.01) => (
    <Descriptions.Item label={label}>
      <InputNumber
        size="small"
        min={0}
        step={step}
        value={costing[field]}
        onChange={(v) => setCosting(id, { [field]: v ?? 0 })}
      />
    </Descriptions.Item>
  );

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <PhaseDependencyAlert
        reached={hasReachedPhase(project, 2)}
        message="Phase 2 activity (Gate 05-06)"
        description={`Formula BOM & Costing is normally completed once the formula and packaging route is confirmed in Phase 2. ${positionSentence(project)} You can enter data now — it stays provisional until then.`}
      />

      {Math.round(totalPercent * 100) / 100 !== 100 && bom.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message={`Formula total is ${money(totalPercent)} % w/w — a complete formula should total 100%.`}
        />
      )}

      <Card
        size="small"
        title={`Formula BOM — ${project.identity.productSku}`}
        extra={
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => addBomLine(id)}>
            Add line
          </Button>
        }
      >
        <Table
          size="small"
          rowKey={(l) => l.line}
          dataSource={bom}
          pagination={false}
          scroll={{ x: 1200 }}
          columns={[
            { title: '#', width: 40, dataIndex: 'line' },
            {
              title: 'RM Code',
              width: 110,
              render: (_, l, i) => (
                <Input size="small" value={l.rmCode} onChange={(e) => setBomLine(id, i, { rmCode: e.target.value })} />
              ),
            },
            {
              title: 'Ingredient / INCI',
              width: 240,
              render: (_, l, i) => (
                <Input size="small" value={l.inciName} onChange={(e) => setBomLine(id, i, { inciName: e.target.value })} />
              ),
            },
            {
              title: 'Function',
              width: 160,
              render: (_, l, i) => (
                <Input size="small" value={l.functionRole} onChange={(e) => setBomLine(id, i, { functionRole: e.target.value })} />
              ),
            },
            {
              title: 'Supplier',
              width: 150,
              render: (_, l, i) => (
                <Input size="small" value={l.supplier} onChange={(e) => setBomLine(id, i, { supplier: e.target.value })} />
              ),
            },
            {
              title: '% w/w',
              width: 100,
              render: (_, l, i) => (
                <InputNumber
                  size="small"
                  min={0}
                  max={100}
                  step={0.1}
                  value={l.percentWw}
                  onChange={(v) => setBomLine(id, i, { percentWw: v ?? 0 })}
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
                  onChange={(v) => setBomLine(id, i, { costPerKg: v ?? 0 })}
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
                <Popconfirm title="Remove line?" onConfirm={() => removeBomLine(id, i)}>
                  <Button size="small" danger type="text" icon={<DeleteOutlined />} />
                </Popconfirm>
              ),
            },
          ]}
          summary={() => (
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
              <Table.Summary.Cell index={4} />
            </Table.Summary.Row>
          )}
        />
      </Card>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Card size="small" title="Costing inputs">
            <Descriptions size="small" column={1} bordered>
              {numberInput('batchSizeKg', 'Batch size (kg)', 1)}
              {numberInput('fillSizeG', 'Fill size (g or mL)', 1)}
              {numberInput('targetUnits', 'Target units', 100)}
              {numberInput('packagingCostPerUnit', 'Packaging cost / unit')}
              {numberInput('labourOverheadPerUnit', 'Labour / overhead / unit')}
              {numberInput('freightOtherPerUnit', 'Freight / other / unit')}
              {numberInput('targetSellPrice', 'Target sell price / unit')}
            </Descriptions>
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
                  valueStyle={{ color: margin >= 50 ? '#3f8600' : margin > 0 ? '#fa8c16' : '#cf1322' }}
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
    </div>
  );
}
