import { Alert, Button, Card, Checkbox, DatePicker, Input, InputNumber, Popconfirm, Select, Table, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, LockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { RegisterColumn, RegisterConfig } from '@mbc360/shared/config/registers';
import { isRegisterRowBlank } from '@mbc360/shared/config/registers';
import type { RegisterRow } from '@mbc360/shared/types';
import { patchArray, useDraft } from '../hooks/useDraft';
import { createEmptyRegisterRow } from '../store/factory';
import SaveBar from './SaveBar';
import UserSelect from './UserSelect';

export default function DynamicTable({
  config,
  rows,
  onSave,
  // Already-composed "Review owner · Co-sign: …" caption for this project.
  // 2026-07-23: review owners are now per-project (composeReviewOwner over
  // identity.reviewers), so the parent composes the string and passes it in —
  // DynamicTable no longer reads config.reviewOwner (now a structure, not a
  // string). RegisterHubPage's single-register view shows its own dedicated
  // "Review owner" card instead and passes nothing here; FormulationSafety's
  // 3-table composite passes this so each table keeps its inline caption.
  reviewOwnerText,
  // Gate-level edit lock (2026-07-23): true once every gate this register is
  // tied to has passed. The whole table renders read-only (static cells, no
  // Add/Delete/Save) — editing a passed gate's evidence requires Backtrack.
  readOnly,
  readOnlyReason,
  // Register-specific extras (2026-08-11), so a register with its own
  // consistency rules does not have to fork the whole table the way
  // SupplierRmEvidenceTable did — those needed different CELL renderers, these
  // only need to add to the frame around them:
  //   extraActions — a control beside "Add row" (e.g. a preset quick-add);
  //   saveBlockers — reasons Save must stay disabled, on top of the blank-row
  //     guard every register already has;
  //   warnings     — inconsistencies worth flagging that must NOT block, because
  //     the rule behind them is our reading rather than a confirmed one.
  extraActions,
  saveBlockers,
  warnings,
}: {
  config: RegisterConfig;
  rows: RegisterRow[];
  onSave: (rows: RegisterRow[]) => void;
  reviewOwnerText?: string;
  readOnly?: boolean;
  readOnlyReason?: string;
  extraActions?: (draft: RegisterRow[], update: (fn: (prev: RegisterRow[]) => RegisterRow[]) => void) => React.ReactNode;
  saveBlockers?: (draft: RegisterRow[]) => string[];
  warnings?: (draft: RegisterRow[]) => string[];
}) {
  const isRegister = config.mode === 'register' && !readOnly;
  const { draft, dirty, update, markSaved, discard } = useDraft(rows);

  const patch = (index: number, key: string, value: string | number | boolean | undefined) =>
    update((prev) => patchArray(prev, index, { [key]: value } as Partial<RegisterRow>));
  const addRow = () => update((prev) => [...prev, createEmptyRegisterRow(config.key)]);
  const removeRow = (index: number) => update((prev) => prev.filter((_, i) => i !== index));
  const hasBlankRows = isRegister && draft.some((r) => isRegisterRowBlank(config, r));
  const blockers = readOnly ? [] : (saveBlockers?.(draft) ?? []);
  const softWarnings = readOnly ? [] : (warnings?.(draft) ?? []);
  const save = () => {
    if (hasBlankRows || blockers.length > 0) return;
    onSave(draft);
    markSaved();
  };

  const renderCell = (column: RegisterColumn, row: RegisterRow, index: number) => {
    const editable = column.editable !== false && !readOnly;
    const value = row[column.key];

    if (!editable) {
      if (column.type === 'checkbox') return <Checkbox checked={!!value} disabled />;
      return <span style={{ color: '#666' }}>{value != null ? String(value) : ''}</span>;
    }

    switch (column.type) {
      case 'checkbox':
        return (
          <Checkbox checked={!!value} onChange={(e) => patch(index, column.key, e.target.checked)} />
        );
      case 'user':
        return (
          <UserSelect
            value={value as string | undefined}
            onChange={(v) => patch(index, column.key, v)}
          />
        );
      case 'select':
        return (
          <Select
            size="small"
            allowClear
            style={{ width: '100%', minWidth: 110 }}
            value={value as string | undefined}
            options={(column.options ?? []).map((o) => ({ value: o, label: o }))}
            onChange={(v) => patch(index, column.key, v)}
          />
        );
      case 'date':
        return (
          <DatePicker
            size="small"
            style={{ width: '100%' }}
            value={value ? dayjs(String(value)) : null}
            onChange={(d) => patch(index, column.key, d ? d.format('YYYY-MM-DD') : undefined)}
          />
        );
      case 'number':
        return (
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            value={value as number | undefined}
            onChange={(v) => patch(index, column.key, v ?? 0)}
          />
        );
      case 'textarea':
        return (
          <Input.TextArea
            autoSize={{ minRows: 1, maxRows: 4 }}
            size="small"
            value={value as string | undefined}
            onChange={(e) => patch(index, column.key, e.target.value)}
          />
        );
      case 'text':
      default:
        return (
          <Input size="small" value={value as string | undefined} onChange={(e) => patch(index, column.key, e.target.value)} />
        );
    }
  };

  const columns = [
    ...config.columns.map((col) => ({
      title: col.label,
      width: col.width ?? 140,
      render: (_: unknown, row: RegisterRow, index: number) => renderCell(col, row, index),
    })),
    ...(isRegister
      ? [
          {
            title: '',
            width: 44,
            render: (_: unknown, __: RegisterRow, index: number) => (
              <Popconfirm title="Remove this row?" onConfirm={() => removeRow(index)}>
                <Button size="small" danger type="text" icon={<DeleteOutlined />} />
              </Popconfirm>
            ),
          },
        ]
      : []),
  ];

  const totalWidth = config.columns.reduce((sum, c) => sum + (c.width ?? 140), 0) + (isRegister ? 44 : 0);

  return (
    <Card
      size="small"
      title={
        <span>
          {config.title} {config.gate && <Tag>Gate {config.gate}</Tag>}
        </span>
      }
      extra={
        <span style={{ color: '#999', fontSize: 12 }}>
          {draft.length} {isRegister ? (draft.length === 1 ? 'row' : 'rows') : 'items'}
        </span>
      }
    >
      {config.description && (
        <p style={{ color: '#888', fontSize: 12, marginTop: -4, marginBottom: reviewOwnerText ? 4 : 12 }}>
          {config.description}
        </p>
      )}
      {reviewOwnerText && (
        <p style={{ color: '#999', fontSize: 12, marginTop: 0, marginBottom: 12 }}>Review owner: {reviewOwnerText}</p>
      )}
      {readOnly && (
        <Alert
          type="info"
          showIcon
          icon={<LockOutlined />}
          style={{ marginBottom: 12 }}
          message="Read-only — gate passed"
          description={readOnlyReason ?? 'This evidence belongs to a gate that has already passed. To correct it, Backtrack to reopen that gate first.'}
        />
      )}
      {softWarnings.length > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="Check this against the Gate 02 target users"
          description={
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {softWarnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          }
        />
      )}
      <Table
        size="small"
        // RegisterRow has no natural id, so key by array position. antd
        // deprecated the (record, index) two-arg rowKey signature, so derive
        // the position from the row's identity in `draft` instead (`draft` is
        // exactly what's passed as `dataSource`, so reference equality holds).
        rowKey={(row) => draft.indexOf(row)}
        dataSource={draft}
        columns={columns}
        pagination={false}
        scroll={{ x: totalWidth }}
        onRow={(row) => (isRegister && isRegisterRowBlank(config, row) ? { style: { background: '#fff1f0' } } : {})}
      />
      {/* Below the table, right after the last row, rather than in the card
          header — the add affordance belongs next to the rows it appends to. */}
      {isRegister && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <Button size="small" type="dashed" block icon={<PlusOutlined />} onClick={addRow}>
            Add row
          </Button>
          {extraActions?.(draft, update)}
        </div>
      )}
      <SaveBar
        dirty={dirty}
        onSave={save}
        onDiscard={discard}
        disabled={hasBlankRows || blockers.length > 0}
        disabledReason={
          hasBlankRows
            ? 'One or more rows have no data entered — fill in at least one field or remove the row before saving.'
            : blockers.join(' · ')
        }
      />
    </Card>
  );
}
