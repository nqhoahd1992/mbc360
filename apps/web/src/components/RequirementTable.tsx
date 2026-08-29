import { Card, Input, Select, Table, Tag, Tooltip } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import type { RequirementItem, RequirementStatus } from '@mbc360/shared/types';
import type { ColumnsType } from 'antd/es/table';
import type { RequirementColumnKey } from '@mbc360/shared/config/phases';
import {
  REQUIREMENT_NOT_APPLICABLE,
  REQUIREMENT_PRIORITIES,
  WORK_STATUSES,
} from '@mbc360/shared/config/gates';
import { isMandatoryRequirementRow } from '@mbc360/shared/utils/gateProgress';
import { useAppStore } from '../store/useAppStore';
import { patchArray, useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';
import { TABLE_STICKY } from '../theme/tokens';

export default function RequirementTable({
  projectId,
  sectionKey,
  title,
  items,
  currentGateNumber,
  isRowLocked,
  columns: visibleColumns,
  allowNotApplicable,
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
  // Round 4 question 21: this section offers 'N/A' as a disposition, and a row
  // set to it must give a rationale. Off everywhere except Phase 1's B6 table —
  // see RequirementSectionConfig.allowNotApplicable for why.
  allowNotApplicable?: boolean;
}) {
  // 'category' is an ALTERNATIVE heading for the same data as 'requirement'
  // (Phase 1's B6 rows are categories, and the project's own requirement goes
  // in 'detail'). It is opt-in, so it must not appear in the default set —
  // otherwise Phases 2-4 print the row label twice, in bold, in adjacent
  // columns, which is what they were doing.
  const OPT_IN_ONLY: RequirementColumnKey[] = ['category'];
  const shows = (key: RequirementColumnKey) =>
    visibleColumns ? visibleColumns.includes(key) : !OPT_IN_ONLY.includes(key);
  // Owner is config-set (from the workbook) on Phases 2-4 and read-only there;
  // on a section that declares its own columns it is the user's to fill in.
  const ownerEditable = !!visibleColumns;
  const setSection = useAppStore((s) => s.setRequirementSection);
  const { draft, dirty, update, markSaved, discard } = useDraft(items);

  // Round 4 question 21: 'N/A' is offered only where the section declares it —
  // the Phases 2-4 sections are read by checks that accept nothing but
  // 'Completed', so quietly offering a fourth disposition there would let a user
  // pick a status that can never satisfy the rule reading the row.
  const statusOptions = [
    ...WORK_STATUSES.map((s) => ({ value: s, label: s })),
    ...(allowNotApplicable
      ? [{ value: REQUIREMENT_NOT_APPLICABLE, label: `${REQUIREMENT_NOT_APPLICABLE} — rationale required` }]
      : []),
  ];

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
                <span style={{ fontWeight: 600 }}>
                  {v}
                  {required && (
                    <Tooltip title="Required to pass this gate (F1/C7 mandatory evidence)">
                      <span style={{ color: '#ff4d4f' }}> *</span>
                    </Tooltip>
                  )}
                </span>
              );
            },
          },
          {
            // Same data as 'requirement' above, different heading: B6's 16 rows
            // ARE categories, so Phase 1 labels the column that way and puts the
            // project's own requirement in 'detail' beside it. Opt-in only —
            // see OPT_IN_ONLY above.
            key: 'category',
            title: 'Category',
            width: 210,
            dataIndex: 'requirement',
            render: (v, r) => {
              const required = isMandatoryRequirementRow(sectionKey, r.requirement) && r.status !== 'Completed';
              return (
                <span style={{ fontWeight: 600 }}>
                  {v}
                  {required && (
                    <Tooltip title="Required to pass this gate (F1/C7 mandatory evidence)">
                      <span style={{ color: '#ff4d4f' }}> *</span>
                    </Tooltip>
                  )}
                </span>
              );
            },
          },
          {
            key: 'detail',
            title: 'Requirement',
            // Widened (2026-08-26) — this is the main free-text entry for a
            // Phase 1 B6 row (what the category means for THIS project), not
            // a short reference field like its neighbours, so it gets more
            // room than the generic 280 default.
            width: 360,
            render: (_, r, i) => (
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 4 }}
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
                style={{ width: '100%' }}
                allowClear
                // A row dispositioned N/A has no priority to give: it is not a
                // requirement of this project at all.
                disabled={isRowLocked?.(r) || r.status === REQUIREMENT_NOT_APPLICABLE}
                placeholder="Must / Should / Could"
                value={r.priority || undefined}
                options={REQUIREMENT_PRIORITIES.map((o) => ({ value: o, label: o }))}
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
            width: 160,
            render: (_, r, i) => (
              <Select
                style={{ width: 150 }}
                value={r.status}
                disabled={isRowLocked?.(r)}
                options={statusOptions}
                // Switching AWAY from N/A drops the rationale in the same edit,
                // so a stale reason cannot sit beside a Completed row (the API
                // clears it too — this only keeps the screen honest before Save).
                onChange={(v: RequirementStatus) =>
                  patch(i, v === REQUIREMENT_NOT_APPLICABLE ? { status: v } : { status: v, naRationale: '' })
                }
              />
            ),
          },
          {
            key: 'naRationale',
            title: 'N/A rationale',
            width: 240,
            render: (_, r, i) =>
              r.status === REQUIREMENT_NOT_APPLICABLE ? (
                <Input.TextArea
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  status={(r.naRationale ?? '').trim() === '' ? 'error' : undefined}
                  placeholder="Why this does not apply to this project"
                  value={r.naRationale}
                  disabled={isRowLocked?.(r)}
                  onChange={(e) => patch(i, { naRationale: e.target.value })}
                />
              ) : (
                <span style={{ color: '#d9d9d9' }}>—</span>
              ),
          },
          {
            key: 'evidenceLink',
            title: 'Evidence link',
            width: 160,
            render: (_, r, i) => (
              <Input
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
              <Input value={r.notes} disabled={isRowLocked?.(r)} onChange={(e) => patch(i, { notes: e.target.value })} />
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
        sticky={TABLE_STICKY}
        scroll={{ x: 1100 }}
        onRow={(r) => {
          const required = isMandatoryRequirementRow(sectionKey, r.requirement) && r.status !== 'Completed';
          const isCurrentGate = r.gate === currentGateNumber;
          return required && isCurrentGate ? { style: { background: '#fffbe6' } } : {};
        }}
        // Pin whichever column ends up first after filtering (varies by
        // section — Phase 1's B6 leads with 'category', Phases 2-4 with
        // 'gate') so the identity of a row stays readable while scrolling
        // through the rest of a wide section (2026-08-26).
        columns={allColumns.filter((c) => shows(c.key)).map((c, i) => (i === 0 ? { ...c, fixed: 'left' } : c))}
      />
      <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
    </Card>
  );
}
