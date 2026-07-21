import { Button, Card, Checkbox, DatePicker, Input, InputNumber, Popconfirm, Select, Table, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { RegisterColumn, RegisterConfig } from '@mbc360/shared/config/registers';
import type { RegisterRow } from '@mbc360/shared/types';
import { patchArray, useDraft } from '../hooks/useDraft';
import { createEmptyRegisterRow } from '../store/factory';
import SaveBar from './SaveBar';

export default function DynamicTable({
  config,
  rows,
  onSave,
}: {
  config: RegisterConfig;
  rows: RegisterRow[];
  onSave: (rows: RegisterRow[]) => void;
}) {
  const isRegister = config.mode === 'register';
  const { draft, dirty, update, markSaved, discard } = useDraft(rows);

  const patch = (index: number, key: string, value: string | number | boolean | undefined) =>
    update((prev) => patchArray(prev, index, { [key]: value } as Partial<RegisterRow>));
  const addRow = () => update((prev) => [...prev, createEmptyRegisterRow(config.key)]);
  const removeRow = (index: number) => update((prev) => prev.filter((_, i) => i !== index));
  const save = () => {
    onSave(draft);
    markSaved();
  };

  const renderCell = (column: RegisterColumn, row: RegisterRow, index: number) => {
    const editable = column.editable !== false;
    const value = row[column.key];

    if (!editable) {
      return <span style={{ color: '#666' }}>{value != null ? String(value) : ''}</span>;
    }

    switch (column.type) {
      case 'checkbox':
        return (
          <Checkbox checked={!!value} onChange={(e) => patch(index, column.key, e.target.checked)} />
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
        <p style={{ color: '#888', fontSize: 12, marginTop: -4, marginBottom: config.reviewOwner ? 4 : 12 }}>{config.description}</p>
      )}
      {config.reviewOwner && (
        <p style={{ color: '#999', fontSize: 12, marginTop: 0, marginBottom: 12 }}>Review owner: {config.reviewOwner}</p>
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
      />
      {/* Below the table, right after the last row, rather than in the card
          header — the add affordance belongs next to the rows it appends to. */}
      {isRegister && (
        <Button
          size="small"
          type="dashed"
          block
          icon={<PlusOutlined />}
          onClick={addRow}
          style={{ marginTop: 8 }}
        >
          Add row
        </Button>
      )}
      <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
    </Card>
  );
}
