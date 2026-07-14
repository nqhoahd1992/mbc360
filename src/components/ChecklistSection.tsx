import { Card, Checkbox, Input, Select, Table, Tag } from 'antd';
import type { ChecklistItem, YNNA } from '../types';
import { useAppStore } from '../store/useAppStore';

const YNNA_OPTIONS = ['Y', 'N', 'NA'].map((v) => ({ value: v, label: v }));

export default function ChecklistSection({
  projectId,
  sectionKey,
  title,
  gate,
  items,
}: {
  projectId: string;
  sectionKey: string;
  title: string;
  gate: string;
  items: ChecklistItem[];
}) {
  const setItem = useAppStore((s) => s.setChecklistItem);
  const selectedCount = items.filter((i) => i.selected).length;

  return (
    <Card
      size="small"
      title={
        <span>
          {title} <Tag>Gate {gate}</Tag>
        </span>
      }
      extra={<span style={{ color: '#999' }}>{selectedCount} selected</span>}
    >
      <Table
        size="small"
        rowKey={(r) => r.label}
        dataSource={items}
        pagination={false}
        scroll={{ x: 900 }}
        columns={[
          {
            title: '',
            width: 40,
            render: (_, r, i) => (
              <Checkbox
                checked={r.selected}
                onChange={(e) =>
                  setItem(projectId, sectionKey, i, {
                    selected: e.target.checked,
                    status: e.target.checked ? 'Y' : 'NA',
                  })
                }
              />
            ),
          },
          {
            title: 'Option',
            width: 240,
            render: (_, r) => (
              <span style={{ fontWeight: r.selected ? 600 : 400 }}>{r.label}</span>
            ),
          },
          { title: 'Owner / function', width: 190, dataIndex: 'ownerFunction' },
          {
            title: 'Status',
            width: 80,
            render: (_, r, i) => (
              <Select
                size="small"
                style={{ width: 70 }}
                value={r.status}
                options={YNNA_OPTIONS}
                onChange={(v: YNNA) => setItem(projectId, sectionKey, i, { status: v })}
              />
            ),
          },
          {
            title: 'Evidence / internal link',
            width: 200,
            render: (_, r, i) => (
              <Input
                size="small"
                value={r.evidenceLink}
                placeholder="link"
                disabled={!r.selected}
                onChange={(e) => setItem(projectId, sectionKey, i, { evidenceLink: e.target.value })}
              />
            ),
          },
          {
            title: 'Notes / rationale',
            width: 240,
            render: (_, r, i) => (
              <Input
                size="small"
                value={r.notes}
                disabled={!r.selected}
                onChange={(e) => setItem(projectId, sectionKey, i, { notes: e.target.value })}
              />
            ),
          },
        ]}
      />
    </Card>
  );
}
