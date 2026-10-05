import { useState } from 'react';
import { Alert, Button, Drawer, Grid, Input, Radio, Select, Tooltip } from 'antd';
import { CheckOutlined, LinkOutlined, LockOutlined } from '@ant-design/icons';
import type { ChecklistItem, YNNA } from '@mbc360/shared/types';
import { isMandatoryChecklistSection } from '@mbc360/shared/utils/gateProgress';
import { useAppStore } from '../store/useAppStore';
import { patchArray, useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';
import '../styles/concept.css';
import './ChecklistSection.css';
import { useExclusiveDrawer } from '../hooks/exclusiveDrawer';

const YNNA_OPTIONS = ['Y', 'N', 'NA'].map((v) => ({ value: v, label: v }));
// Long option lists (Product Type has 28, Claim Areas 32) show this many plus
// every selected option until expanded — the unselected tail is rarely read.
const COLLAPSED_COUNT = 12;

// One workbook option list (Target Users, Product Type, …), redesigned
// 2026-10-02 (Phase page wireframe option A): a grid of tick tiles instead of a
// 7-column table. Ticking is the main act; owner/function, status, evidence link
// and notes belong to a SELECTED option and open in a drawer. Same draft + one
// Save as before, and the same rules: ticking sets status Y (un-ticking NA),
// `untickBlockedReason` can refuse an un-tick, and `requiresPrimary` needs one
// selected option marked Primary.
export default function ChecklistSection({
  projectId,
  sectionKey,
  title,
  gate,
  items,
  readOnly,
  // Why a given option cannot be UN-ticked right now (2026-08-11). Used for
  // Target Users, where un-ticking Pregnancy would orphan the Vulnerable-User
  // Assessment row that exists because of it. Ticking ON is never restricted.
  untickBlockedReason,
  requiresPrimary,
}: {
  projectId: string;
  sectionKey: string;
  title: string;
  gate: string;
  items: ChecklistItem[];
  // Gate `number` (e.g. '02') currently open for work — see the highlight below.
  currentGateNumber?: string;
  // Gate-level edit lock: true once this section's gate has passed.
  readOnly?: boolean;
  untickBlockedReason?: (label: string) => string | undefined;
  // Round 4 question 22(b): one selected development/change type must be the
  // Primary; only `projectNature` sets this.
  requiresPrimary?: boolean;
}) {
  const setSection = useAppStore((s) => s.setChecklistSection);
  const { draft, dirty, update, markSaved, discard } = useDraft(items);
  const [expanded, setExpanded] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  useExclusiveDrawer(openIndex !== null, () => setOpenIndex(null));
  const screens = Grid.useBreakpoint();
  const selectedCount = draft.filter((i) => i.selected).length;
  const hasSelection = draft.some((i) => i.status === 'Y');
  const required = isMandatoryChecklistSection(sectionKey) && !hasSelection;

  const patch = (index: number, p: Partial<ChecklistItem>) => update((prev) => patchArray(prev, index, p));
  // Primary is single-valued: picking one clears the others, otherwise
  // `checklistPrimarySelected` could be left permanently unsatisfiable.
  const setPrimary = (index: number) => update((prev) => prev.map((item, i) => ({ ...item, isPrimary: i === index })));
  const primaryMissing = requiresPrimary && draft.some((i) => i.selected) && !draft.some((i) => i.selected && i.isPrimary);
  const save = () => {
    setSection(projectId, sectionKey, draft);
    markSaved();
  };

  const toggle = (index: number) => {
    const item = draft[index];
    if (readOnly) return;
    const blocked = item.selected ? untickBlockedReason?.(item.label) : undefined;
    if (blocked) return; // defence in depth — the tile says why; the API refuses too
    patch(index, { selected: !item.selected, status: !item.selected ? 'Y' : 'NA' });
  };

  const visible = draft
    .map((item, index) => ({ item, index }))
    .filter(({ item, index }) => expanded || index < COLLAPSED_COUNT || item.selected);
  const hiddenCount = draft.length - visible.length;
  const open = openIndex === null ? undefined : draft[openIndex];

  return (
    <div className="concept-tokens c-card cl">
      <div className="cl-head">
        <div className="cl-title-row">
          <span className="cl-title">{title}</span>
          <span className="c-tag">Gate {gate}</span>
          {readOnly && (
            <span className="c-tag">
              <LockOutlined /> Read-only — gate passed
            </span>
          )}
          {required && !readOnly && (
            <Tooltip title="At least one option must be recorded (status Y) before this gate can pass (F1/C7 mandatory evidence)">
              <span className="c-tag c-tag-bad">Required</span>
            </Tooltip>
          )}
        </div>
        <span className="cl-count">
          {selectedCount ? `${selectedCount} selected` : 'None selected'} · {draft.length} options
        </span>
      </div>

      {primaryMissing && !readOnly && (
        <Alert
          type="warning"
          showIcon
          className="cl-alert"
          title="Mark one of the selected options as Primary"
          description="Where several apply, one must lead and the rest are recorded as secondary. Gate 01 cannot pass until one is marked — open a selected option to set it."
        />
      )}

      <div className="cl-grid" role="group" aria-label={title}>
        {visible.map(({ item, index }) => {
          const blocked = item.selected ? untickBlockedReason?.(item.label) : undefined;
          const tile = (
            <div className={`cl-tile${item.selected ? ' cl-on' : ''}${readOnly ? ' cl-ro' : ''}`} key={item.label}>
              <button
                type="button"
                role="checkbox"
                aria-checked={item.selected}
                aria-disabled={readOnly || !!blocked}
                className="cl-check"
                onClick={() => toggle(index)}
              >
                <span className="cl-box">{item.selected && <CheckOutlined />}</span>
                <span className="cl-label">{item.label}</span>
                {item.isPrimary && item.selected && <span className="c-tag c-tag-ok cl-primary">Primary</span>}
              </button>
              {item.selected && (
                // Ticking does NOT open the drawer here (options are often ticked
                // several in a row); an option still missing its evidence link is
                // marked instead, so the gap is visible without interrupting.
                <Tooltip title={item.evidenceLink ? 'Owner, status, evidence link and notes' : 'Add evidence'}>
                  <button
                    type="button"
                    className={`cl-detail${item.evidenceLink ? ' cl-detail-filled' : readOnly ? '' : ' cl-detail-missing'}`}
                    aria-label={`Details for ${item.label}`}
                    onClick={() => setOpenIndex(index)}
                  >
                    <LinkOutlined />
                  </button>
                </Tooltip>
              )}
            </div>
          );
          return blocked ? (
            <Tooltip key={item.label} title={blocked}>
              {tile}
            </Tooltip>
          ) : (
            tile
          );
        })}
      </div>
      {(hiddenCount > 0 || expanded) && draft.length > COLLAPSED_COUNT && (
        <div className="cl-more">
          <Button type="link" onClick={() => setExpanded((v) => !v)} style={{ paddingInline: 0 }}>
            {expanded ? 'Show fewer options' : `Show ${hiddenCount} more options`}
          </Button>
        </div>
      )}

      {!readOnly && dirty && (
        <div className="cl-save">
          <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
        </div>
      )}

      <Drawer
        open={open !== undefined}
        onClose={() => setOpenIndex(null)}
        size={screens.md ? 480 : '100%'}
        // Same as every other detail drawer: no mask on a very wide screen,
        // where the page beside it stays usable.
        mask={!screens.xxl}
        rootClassName="concept-tokens"
        title={
          open && (
            <div>
              <div className="cl-drawer-sub">{title}</div>
              <div>{open.label}</div>
            </div>
          )
        }
        footer={readOnly ? undefined : <span className="cl-hint">Changes stay in this section's draft until you Save it.</span>}
      >
        {open && openIndex !== null && (
          <div className="cl-form">
            <div>
              <span className="cl-field-label">Owner / function</span>
              <div>{open.ownerFunction || '—'}</div>
            </div>
            {requiresPrimary && (
              <div>
                <span className="cl-field-label">Primary</span>
                <Radio checked={!!open.isPrimary} disabled={readOnly} onChange={() => setPrimary(openIndex)}>
                  {open.isPrimary ? 'This is the primary type' : 'Make this the primary type'}
                </Radio>
              </div>
            )}
            <label>
              <span className="cl-field-label">Status</span>
              <Select
                style={{ width: 120 }}
                value={open.status}
                disabled={readOnly}
                options={YNNA_OPTIONS}
                onChange={(v: YNNA) => patch(openIndex, { status: v })}
              />
            </label>
            <label>
              <span className="cl-field-label">Evidence / internal link</span>
              <Input
                value={open.evidenceLink}
                placeholder="Link to the supporting record"
                disabled={readOnly}
                onChange={(e) => patch(openIndex, { evidenceLink: e.target.value })}
              />
            </label>
            <label>
              <span className="cl-field-label">Notes / rationale</span>
              <Input.TextArea
                autoSize={{ minRows: 3 }}
                value={open.notes}
                disabled={readOnly}
                onChange={(e) => patch(openIndex, { notes: e.target.value })}
              />
            </label>
          </div>
        )}
      </Drawer>
    </div>
  );
}
