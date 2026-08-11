import { Card, Input, Select, Table, Tag, Tooltip } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import type { RequirementItem, WorkStatus } from '@mbc360/shared/types';
import type { ColumnsType } from 'antd/es/table';
import type { RequirementColumnKey } from '@mbc360/shared/config/phases';
import { NEXT_ACTION_PRIORITIES } from '@mbc360/shared/types';
import { WORK_STATUSES } from '@mbc360/shared/config/gates';
import { isMandatoryRequirementRow } from '@mbc360/shared/utils/gateProgress';
import { useAppStore } from '../store/useAppStore';
import { patchArray, useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';

export default function RequirementTable({
  projectId,
  sectionKey,
  title,
  items,
  currentGateNumber,
  isRowLocked,
  columns: visibleColumns,
}: {
  projectId: string;
  sectionKey: string;
  title: string;
  items: RequirementItem[];
  // Gate `number` (e.g. '05') currently open for work — see the highlight below.
  currentGateNumber?: string;
  // Gate-level edit lock (2026-07-23): a row whose gate has passed is
  // read-only (inputs disabled). A requirement section can span several gates,
  // so this is per-row, not per-table.
  isRowLocked?: (item: RequirementItem) => boolean;
  // Which columns this section shows (RequirementSectionConfig.columns).
  // Omitted = the Phases 2-4 default set. Added 2026-08-09 so Phase 1's B6
  // table can drop the columns that mean nothing at the opportunity stage and
  // add `priority`, without forking this component.
  columns?: RequirementColumnKey[];
}) {
  const shows = (key: RequirementColumnKey) => !visibleColumns || visibleColumns.includes(key);
  // Owner is config-set (from the workbook) on Phases 2-4 and read-only there;
  // on a section that declares its own columns it is the user's to fill in.
  const ownerEditable = !!visibleColumns;
  const setSection = useAppStore((s) => s.setRequirementSection);
  const { draft, dirty, update, markSaved, discard } = useDraft(items);

  const patch = (index: number, p: Partial<RequirementItem>) => update((prev) => patchArray(prev, index, p));
  const save = () => {
    setSection(projectId, sectionKey, draft);
    markSaved();
  };

  // Every column carries its `key` so a section can select a subset; the
  // annotation keeps antd's render callbacks typed (an `as const` array
  // widens them to `any`).
  const allColumns: (ColumnsType<RequirementItem>[number] & { key: RequirementColumnKey })[] = [
          {
            key: 'gate',
            title: 'Gate',
            width: 60,
            render: (_, r) => (
              <Tag icon={isRowLocked?.(r) ? <LockOutlined /> : undefined}>{r.gate}</Tag>
            ),
          },
          {
            key: 'requirement',
            title: 'Requirement / field',
            width: 200,
            dataIndex: 'requirement',
            render: (v, r) => {
              const required = isMandatoryRequirementRow(sectionKey, r.requirement) && r.status !== 'Completed';
              return (
                <b>
                  {v}
                  {required && (
                    <Tooltip title="Required to pass this gate (F1/C7 mandatory evidence)">
                      <span style={{ color: '#ff4d4f' }}> *</span>
                    </Tooltip>
                  )}
                </b>
              );
            },
          },
          {
            // Same data as 'requirement' above, different heading: B6's 16 rows
            // ARE categories, so Phase 1 labels the column that way and puts the
            // project's own requirement in 'detail' beside it.
            key: 'category',
            title: 'Category',
            width: 210,
            dataIndex: 'requirement',
            render: (v, r) => {
              const required = isMandatoryRequirementRow(sectionKey, r.requirement) && r.status !== 'Completed';
              return (
                <b>
                  {v}
                  {required && (
                    <Tooltip title="Required to pass this gate (F1/C7 mandatory evidence)">
                      <span style={{ color: '#ff4d4f' }}> *</span>
                    </Tooltip>
                  )}
                </b>
              );
            },
          },
          {
            key: 'detail',
            title: 'Requirement',
            width: 280,
            render: (_, r, i) => (
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 4 }}
                size="small"
                placeholder="What this category means for this project"
                value={r.requirementText}
                disabled={isRowLocked?.(r)}
                onChange={(e) => patch(i, { requirementText: e.target.value })}
              />
            ),
          },
          { key: 'minimum', title: 'Minimum requirement', width: 260, dataIndex: 'minimumRequirement' },
          {
            key: 'rationale',
            title: 'Rationale / control reason',
            width: 260,
            dataIndex: 'rationale',
            render: (v) => <span style={{ color: '#666' }}>{v}</span>,
          },
          {
            key: 'priority',
            title: 'Priority',
            width: 130,
            render: (_, r, i) => (
              <Select
                size="small"
                style={{ width: '100%' }}
                allowClear
                disabled={isRowLocked?.(r)}
                value={r.priority || undefined}
                options={NEXT_ACTION_PRIORITIES.map((o) => ({ value: o, label: o }))}
                onChange={(v?: string) => patch(i, { priority: v ?? '' })}
              />
            ),
          },
          {
            key: 'owner',
            title: 'Owner',
            width: 150,
            dataIndex: 'owner',
            render: ownerEditable
              ? (_, r, i) => (
                  <Input
                    size="small"
                    disabled={isRowLocked?.(r)}
                    value={r.owner}
                    onChange={(e) => patch(i, { owner: e.target.value })}
                  />
                )
              : undefined,
          },
          {
            key: 'status',
            title: 'Status',
            width: 140,
            render: (_, r, i) => (
              <Select
                size="small"
                style={{ width: 130 }}
                value={r.status}
                disabled={isRowLocked?.(r)}
                options={WORK_STATUSES.map((s) => ({ value: s, label: s }))}
                onChange={(v: WorkStatus) => patch(i, { status: v })}
              />
            ),
          },
          {
            key: 'evidenceLink',
            title: 'Evidence link',
            width: 160,
            render: (_, r, i) => (
              <Input
                size="small"
                value={r.evidenceLink}
                placeholder="link"
                disabled={isRowLocked?.(r)}
                onChange={(e) => patch(i, { evidenceLink: e.target.value })}
              />
            ),
          },
          {
            key: 'notes',
            title: 'Notes / action',
            width: 200,
            render: (_, r, i) => (
              <Input size="small" value={r.notes} disabled={isRowLocked?.(r)} onChange={(e) => patch(i, { notes: e.target.value })} />
            ),
          },
        ];

  return (
    <Card size="small" title={title}>
      <Table
        size="small"
        rowKey={(r) => r.requirement}
        dataSource={draft}
        pagination={false}
        scroll={{ x: 1100 }}
        onRow={(r) => {
          const required = isMandatoryRequirementRow(sectionKey, r.requirement) && r.status !== 'Completed';
          const isCurrentGate = r.gate === currentGateNumber;
          return required && isCurrentGate ? { style: { background: '#fffbe6' } } : {};
        }}
        columns={allColumns.filter((c) => shows(c.key))}
      />
      <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
    </Card>
  );
}
