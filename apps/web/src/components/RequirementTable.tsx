import { Input, Select } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import type { RequirementItem, RequirementStatus } from '@mbc360/shared/types';
import type { RequirementColumnKey } from '@mbc360/shared/config/phases';
import { REQUIREMENT_NOT_APPLICABLE, REQUIREMENT_PRIORITIES, WORK_STATUSES } from '@mbc360/shared/config/gates';
import { isMandatoryRequirementRow } from '@mbc360/shared/utils/gateProgress';
import { useAppStore } from '../store/useAppStore';
import { patchArray, useDraft } from '../hooks/useDraft';
import RequiredMark from './RequiredMark';
import SaveBar from './SaveBar';
import RecordList, { RecordField } from './RecordList';

// A phase requirement table. Since 2026-10-02 laid out as a RecordList: the
// row's requirement, its priority (where the section has one) and status stay
// on the row; the project's own text, owner, N/A rationale, evidence and notes
// open in the drawer, with the workbook's minimum requirement and rationale as
// reference. Same draft, same Save, same per-row gate lock and N/A rule.
export default function RequirementTable({
  projectId,
  sectionKey,
  title,
  items,
  isRowLocked,
  columns: visibleColumns,
  allowNotApplicable,
}: {
  projectId: string;
  sectionKey: string;
  title: string;
  items: RequirementItem[];
  // Gate `number` (e.g. '05') currently open for work — still-required rows of
  // that gate are flagged.
  currentGateNumber?: string;
  // Gate-level edit lock, per row (a section can span several gates).
  isRowLocked?: (item: RequirementItem) => boolean;
  // Which fields this section uses (RequirementSectionConfig.columns). Omitted =
  // the Phases 2-4 default set.
  columns?: RequirementColumnKey[];
  // Round 4 question 21: this section offers 'N/A' as a disposition, and a row
  // set to it must give a rationale. Off everywhere except Phase 1's B6 table.
  allowNotApplicable?: boolean;
}) {
  // 'category' is an alternative heading for the same data as 'requirement',
  // opt-in only (Phase 1's B6 rows are categories).
  const OPT_IN_ONLY: RequirementColumnKey[] = ['category'];
  const shows = (key: RequirementColumnKey) => (visibleColumns ? visibleColumns.includes(key) : !OPT_IN_ONLY.includes(key));
  // Owner is config-set (from the workbook) on Phases 2-4 and read-only there;
  // on a section that declares its own columns it is the user's to fill in.
  const ownerEditable = !!visibleColumns;
  const setSection = useAppStore((s) => s.setRequirementSection);
  const { draft, dirty, update, markSaved, discard } = useDraft(items);

  // 'N/A' is offered only where the section declares it — the Phases 2-4
  // sections are read by checks that accept nothing but 'Completed'.
  const statusOptions = [
    ...WORK_STATUSES.map((s) => ({ value: s, label: s })),
    ...(allowNotApplicable ? [{ value: REQUIREMENT_NOT_APPLICABLE, label: `${REQUIREMENT_NOT_APPLICABLE} — rationale required` }] : []),
  ];

  const patch = (index: number, p: Partial<RequirementItem>) => update((prev) => patchArray(prev, index, p));
  const save = () => {
    setSection(projectId, sectionKey, draft);
    markSaved();
  };
  // Switching AWAY from N/A drops the rationale in the same edit, so a stale
  // reason cannot sit beside a Completed row (the API clears it too).
  const setStatus = (i: number, v: RequirementStatus) =>
    patch(i, v === REQUIREMENT_NOT_APPLICABLE ? { status: v } : { status: v, naRationale: '' });
  const naMissing = (r: RequirementItem) => r.status === REQUIREMENT_NOT_APPLICABLE && (r.naRationale ?? '').trim() === '';

  const priorityControl = (r: RequirementItem, i: number) => (
    <Select
      style={{ width: '100%' }}
      allowClear
      // A row dispositioned N/A has no priority to give.
      disabled={isRowLocked?.(r) || r.status === REQUIREMENT_NOT_APPLICABLE}
      placeholder="Must / Should / Could"
      value={r.priority || undefined}
      options={REQUIREMENT_PRIORITIES.map((o) => ({ value: o, label: o }))}
      onChange={(v?: string) => patch(i, { priority: v ?? '' })}
    />
  );
  const statusControl = (r: RequirementItem, i: number) => (
    <Select
      style={{ width: '100%' }}
      value={r.status}
      disabled={isRowLocked?.(r)}
      status={naMissing(r) ? 'error' : undefined}
      options={statusOptions}
      popupMatchSelectWidth={false}
      onChange={(v: RequirementStatus) => setStatus(i, v)}
    />
  );
  const done = draft.filter((r) => r.status === 'Completed' || r.status === REQUIREMENT_NOT_APPLICABLE).length;

  return (
    <RecordList
      // Every row's gate has passed: nothing here can change, so the drawer
      // drops its "changes stay in the draft" hint.
      readOnly={draft.length > 0 && draft.every((r) => !!isRowLocked?.(r))}
      title={title}
      count={`${done}/${draft.length} ${allowNotApplicable ? 'dispositioned' : 'completed'}`}
      rows={draft}
      rowKey={(r) => r.requirement}
      rowBadge={
        shows('gate')
          ? (r) => (
              <span className="c-tag" style={{ flexShrink: 0 }}>
                {isRowLocked?.(r) && <LockOutlined />}
                {r.gate}
              </span>
            )
          : undefined
      }
      rowTitle={(r) => (
        <>
          {r.requirement}
          {isMandatoryRequirementRow(sectionKey, r.requirement) && <RequiredMark met={r.status === 'Completed'} />}
        </>
      )}
      rowSubtitle={(r) => (shows('detail') ? r.requirementText : r.minimumRequirement) || undefined}
      rowFlag={naMissing}
      inline={[
        ...(shows('priority') ? [{ label: 'Priority', width: 168, render: priorityControl }] : []),
        ...(shows('status') ? [{ label: 'Status', width: 184, render: statusControl }] : []),
      ]}
      drawer={(r, i) => {
        const locked = isRowLocked?.(r);
        const reference = [
          ...(shows('minimum') && r.minimumRequirement ? [['Minimum requirement', r.minimumRequirement]] : []),
          ...(shows('rationale') && r.rationale ? [['Rationale / control reason', r.rationale]] : []),
          ...(!ownerEditable && shows('owner') && r.owner ? [['Owner', r.owner]] : []),
          ...(shows('gate') ? [['Gate', r.gate]] : []),
        ];
        return (
          <>
            <section>
              <div className="rt-grid">
                {shows('detail') && (
                  <RecordField label="Requirement" wide>
                    <Input.TextArea
                      autoSize={{ minRows: 2 }}
                      placeholder="What this category means for this project"
                      value={r.requirementText}
                      disabled={locked}
                      onChange={(e) => patch(i, { requirementText: e.target.value })}
                    />
                  </RecordField>
                )}
                {shows('priority') && <RecordField label="Priority">{priorityControl(r, i)}</RecordField>}
                {shows('status') && <RecordField label="Status">{statusControl(r, i)}</RecordField>}
                {ownerEditable && shows('owner') && (
                  <RecordField label="Owner">
                    <Input disabled={locked} value={r.owner} onChange={(e) => patch(i, { owner: e.target.value })} />
                  </RecordField>
                )}
                {shows('naRationale') && r.status === REQUIREMENT_NOT_APPLICABLE && (
                  <RecordField label="N/A rationale" wide>
                    <Input.TextArea
                      autoSize={{ minRows: 2 }}
                      status={naMissing(r) ? 'error' : undefined}
                      placeholder="Why this does not apply to this project"
                      value={r.naRationale}
                      disabled={locked}
                      onChange={(e) => patch(i, { naRationale: e.target.value })}
                    />
                  </RecordField>
                )}
                {shows('evidenceLink') && (
                  <RecordField label="Evidence link" wide>
                    <Input value={r.evidenceLink} placeholder="Link to the supporting record" disabled={locked} onChange={(e) => patch(i, { evidenceLink: e.target.value })} />
                  </RecordField>
                )}
                {shows('notes') && (
                  <RecordField label="Notes / action" wide>
                    <Input.TextArea autoSize={{ minRows: 2 }} value={r.notes} disabled={locked} onChange={(e) => patch(i, { notes: e.target.value })} />
                  </RecordField>
                )}
              </div>
            </section>
            {reference.length > 0 && (
              <section>
                <div className="rt-sec-title">Reference</div>
                <dl className="rt-dl">
                  {reference.map(([label, value]) => (
                    <div key={label} className="rt-dl-row">
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </>
        );
      }}
      footer={
        dirty ? (
          <div className="rt-savebar">
            <div>
              <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
            </div>
          </div>
        ) : null
      }
    />
  );
}
