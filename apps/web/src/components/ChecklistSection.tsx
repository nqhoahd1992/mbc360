import { Card, Checkbox, Input, Select, Table, Tag, Tooltip } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import type { ChecklistItem, YNNA } from '@mbc360/shared/types';
import { isMandatoryChecklistSection } from '@mbc360/shared/utils/gateProgress';
import { useAppStore } from '../store/useAppStore';
import { patchArray, useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';
import { TABLE_STICKY, TEXT } from '../theme/tokens';

const YNNA_OPTIONS = ['Y', 'N', 'NA'].map((v) => ({ value: v, label: v }));

export default function ChecklistSection({
  projectId,
  sectionKey,
  title,
  gate,
  items,
  currentGateNumber,
  readOnly,
  // Why a given option cannot be UN-ticked right now (2026-08-11). Returns a
  // reason to show in a tooltip, or undefined when the tick is free to remove.
  // Used for Target Users, where un-ticking Pregnancy would orphan the
  // Vulnerable-User Assessment row that exists because of it — the same
  // dependency guard as a Supplier & RM Evidence row the Formula BOM still
  // references. Ticking something ON is never restricted.
  untickBlockedReason,
}: {
  projectId: string;
  sectionKey: string;
  title: string;
  gate: string;
  items: ChecklistItem[];
  // Gate `number` (e.g. '02') currently open for work — see the highlight below.
  currentGateNumber?: string;
  // Gate-level edit lock (2026-07-23): true once this section's gate has
  // passed — inputs disabled, no Save; edit requires Backtrack.
  readOnly?: boolean;
  untickBlockedReason?: (label: string) => string | undefined;
}) {
  const setSection = useAppStore((s) => s.setChecklistSection);
  const { draft, dirty, update, markSaved, discard } = useDraft(items);
  const selectedCount = draft.filter((i) => i.selected).length;
  const hasSelection = draft.some((i) => i.status === 'Y');
  const required = isMandatoryChecklistSection(sectionKey) && !hasSelection;
  const isCurrentGate = gate === currentGateNumber;

  const patch = (index: number, p: Partial<ChecklistItem>) => update((prev) => patchArray(prev, index, p));
  const save = () => {
    setSection(projectId, sectionKey, draft);
    markSaved();
  };

  return (
    <Card
      size="small"
      style={required && isCurrentGate ? { background: '#fffbe6' } : undefined}
      title={
        <span>
          {title} <Tag>Gate {gate}</Tag>
          {readOnly && (
            <Tag icon={<LockOutlined />} color="default">
              Read-only — gate passed
            </Tag>
          )}
          {required && !readOnly && (
            <Tooltip title="At least one option must be recorded (status Y) before this gate can pass (F1/C7 mandatory evidence)">
              <span style={{ color: '#ff4d4f' }}> *</span>
            </Tooltip>
          )}
        </span>
      }
      extra={<span style={{ color: TEXT.secondary }}>{selectedCount} selected</span>}
    >
      <Table
        size="small"
        rowKey={(r) => r.label}
        dataSource={draft}
        pagination={false}
        sticky={TABLE_STICKY}
        scroll={{ x: 900 }}
        columns={[
          {
            title: '',
            width: 40,
            render: (_, r, i) => {
              const blocked = r.selected ? untickBlockedReason?.(r.label) : undefined;
              const box = (
                <Checkbox
                  checked={r.selected}
                  disabled={readOnly || !!blocked}
                  onChange={(e) => {
                    // Defence in depth: the box is disabled, and the handler
                    // refuses anyway. The API refuses too.
                    if (blocked && !e.target.checked) return;
                    patch(i, { selected: e.target.checked, status: e.target.checked ? 'Y' : 'NA' });
                  }}
                />
              );
              return blocked ? <Tooltip title={blocked}>{box}</Tooltip> : box;
            },
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
                disabled={readOnly}
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
                  disabled={readOnly}
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
                <Input size="small" value={r.notes} disabled={readOnly} onChange={(e) => patch(i, { notes: e.target.value })} />
              ) : (
                <span style={{ color: '#d9d9d9' }}>—</span>
              ),
          },
        ]}
      />
      {!readOnly && <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />}
    </Card>
  );
}
