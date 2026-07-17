import { Card, Checkbox, Input, Select, Table, Tag } from 'antd';
import type { ChecklistItem, YNNA } from '@mbc360/shared/types';
import { useAppStore } from '../store/useAppStore';
import { patchArray, useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';

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
  const setSection = useAppStore((s) => s.setChecklistSection);
  const { draft, dirty, update, markSaved, discard } = useDraft(items);
  const selectedCount = draft.filter((i) => i.selected).length;

  const patch = (index: number, p: Partial<ChecklistItem>) => update((prev) => patchArray(prev, index, p));
  const save = () => {
    setSection(projectId, sectionKey, draft);
    markSaved();
  };

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
        dataSource={draft}
        pagination={false}
        scroll={{ x: 900 }}
        columns={[
          {
            title: '',
            width: 40,
            render: (_, r, i) => (
              <Checkbox
                checked={r.selected}
                onChange={(e) => patch(i, { selected: e.target.checked, status: e.target.checked ? 'Y' : 'NA' })}
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
                onChange={(v: YNNA) => patch(i, { status: v })}
              />
            ),
          },
          {
            title: 'Evidence / internal link',
            width: 200,
            render: (_, r, i) =>
              r.selected ? (
                <Input
                  size="small"
                  value={r.evidenceLink}
                  placeholder="link"
                  onChange={(e) => patch(i, { evidenceLink: e.target.value })}
                />
              ) : (
                <span style={{ color: '#d9d9d9' }}>—</span>
              ),
          },
          {
            title: 'Notes / rationale',
            width: 240,
            render: (_, r, i) =>
              r.selected ? (
                <Input size="small" value={r.notes} onChange={(e) => patch(i, { notes: e.target.value })} />
              ) : (
                <span style={{ color: '#d9d9d9' }}>—</span>
              ),
          },
        ]}
      />
      <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
    </Card>
  );
}
