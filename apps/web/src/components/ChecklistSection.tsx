import { useState } from 'react';
import { Alert, Drawer, Grid, Input, Radio, Select, Tooltip } from 'antd';
import { CheckOutlined, LinkOutlined, LockOutlined } from '@ant-design/icons';
import type { ChecklistItem, YNNA } from '@mbc360/shared/types';
import { assessmentAnchor } from '@mbc360/shared/config/assessments';
import { foreseeableContactAsked, isMandatoryChecklistSection } from '@mbc360/shared/utils/gateProgress';
import { useAppStore } from '../store/useAppStore';
import { patchArray, useDraft } from '../hooks/useDraft';
import RequiredMark from './RequiredMark';
import DrawerSaveFooter from './DrawerSaveFooter';
import { useCloseDrawerOnPageSave } from '../hooks/useCloseDrawerOnPageSave';
import SaveBar from './SaveBar';
import SelfAttestField from './SelfAttestField';
import '../styles/concept.css';
import './ChecklistSection.css';
import { useExclusiveDrawer } from '../hooks/exclusiveDrawer';

// Stored as 'NA'; shown as the workbook's own "N/A".
const YNNA_OPTIONS = ['Y', 'N', 'NA'].map((v) => ({ value: v, label: v === 'NA' ? 'N/A' : v }));

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
  items,
  readOnly,
  // Why a given option cannot be UN-ticked right now (2026-08-11). Used for
  // Target Users, where un-ticking Pregnancy would orphan the Vulnerable-User
  // Assessment row that exists because of it. Ticking ON is never restricted.
  untickBlockedReason,
  tickBlockedReason,
  requiresPrimary,
  foreseeableContact,
}: {
  projectId: string;
  sectionKey: string;
  title: string;
  // Which gate the section belongs to. Not displayed: the page already sits on
  // that gate's tab.
  gate: string;
  items: ChecklistItem[];
  // Gate `number` (e.g. '02') currently open for work — see the highlight below.
  currentGateNumber?: string;
  // Gate-level edit lock: true once this section's gate has passed.
  readOnly?: boolean;
  untickBlockedReason?: (label: string) => string | undefined;
  // Why a given option cannot be TICKED right now (2026-11-06): a target user that would make an acknowledged "not applicable"
  // untrue stays unticked until that acknowledgement is withdrawn.
  tickBlockedReason?: (label: string) => string | undefined;
  // Round 4 question 22(b): one selected development/change type must be the
  // Primary; only `projectNature` sets this.
  requiresPrimary?: boolean;
  // Target Users only (Round 5 question 1(d), project owner 2026-11-09): the ONE foreseeable-contact question lives in this card and
  // is shown while no maternal or infant user is ticked in the draft. Its answer is saved with the section, by the same Save.
  foreseeableContact?: { rationale: string; confirmedBy: string };
}) {
  const setSection = useAppStore((s) => s.setChecklistSection);
  const setAssessments = useAppStore((s) => s.setAssessments);
  const { draft, dirty: itemsDirty, update, markSaved: markItemsSaved, discard: discardItems } = useDraft(items);
  const contact = useDraft({ rationale: foreseeableContact?.rationale ?? '', confirmedBy: foreseeableContact?.confirmedBy ?? '' });
  const dirty = itemsDirty || contact.dirty;
  const markSaved = () => {
    markItemsSaved();
    contact.markSaved();
  };
  const discard = () => {
    discardItems();
    contact.discard();
  };
  // Shown, and required, only while the draft has no pregnant, breastfeeding, postpartum or infant user ticked. Un-ticking brings it
  // back; ticking one hides it while the answer is kept (and ignored by the rules).
  const contactAsked = !!foreseeableContact && foreseeableContactAsked(draft.filter((i) => i.selected).map((i) => i.label));
  // The reason and the person standing behind it (same shape as Administrative-only [ASSUMPTION: R6-Q5]); both before it can be saved.
  const contactNeedsReason = contactAsked && !readOnly && contact.draft.rationale.trim() === '';
  const contactNeedsConfirmer = contactAsked && !readOnly && !contactNeedsReason && contact.draft.confirmedBy.trim() === '';
  const contactBlocking = contactNeedsReason
    ? 'Explain why no maternal or infant contact is foreseeable before saving'
    : contactNeedsConfirmer
      ? 'Record yourself as the person confirming this reason before saving'
      : undefined;
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  useExclusiveDrawer(openIndex !== null, () => setOpenIndex(null));
  useCloseDrawerOnPageSave(dirty, openIndex !== null, () => setOpenIndex(null));
  const screens = Grid.useBreakpoint();
  const selectedCount = draft.filter((i) => i.selected).length;
  const hasSelection = draft.some((i) => i.status === 'Y');
  const mandatory = isMandatoryChecklistSection(sectionKey);

  const patch = (index: number, p: Partial<ChecklistItem>) => update((prev) => patchArray(prev, index, p));
  // Primary is single-valued: picking one clears the others, otherwise
  // `checklistPrimarySelected` could be left permanently unsatisfiable.
  const setPrimary = (index: number) => update((prev) => prev.map((item, i) => ({ ...item, isPrimary: i === index })));
  const primaryMissing = requiresPrimary && draft.some((i) => i.selected) && !draft.some((i) => i.selected && i.isPrimary);
  const save = async () => {
    if (contactBlocking) return false;
    let ok = true;
    if (itemsDirty) ok = await setSection(projectId, sectionKey, draft);
    // The answer goes only while the question is asked and only if it changed; a hidden answer is left as it is.
    if (ok && contactAsked && contact.dirty) {
      ok = await setAssessments(projectId, {
        foreseeableContactRationale: contact.draft.rationale.trim(),
        foreseeableContactConfirmedBy: contact.draft.confirmedBy.trim(),
      });
    }
    // An answer typed while hidden behind a ticked user is not sent, so it must not stay behind as an unsaved draft.
    if (ok && !contactAsked) contact.discard();
    if (ok) markSaved();
    return ok;
  };

  const toggle = (index: number) => {
    const item = draft[index];
    if (readOnly) return;
    const blocked = item.selected ? untickBlockedReason?.(item.label) : tickBlockedReason?.(item.label);
    if (blocked) return; // defence in depth — the tile says why; the API refuses too
    patch(index, { selected: !item.selected, status: !item.selected ? 'Y' : 'NA' });
  };

  // Every option is always shown, however long the list.
  const visible = draft.map((item, index) => ({ item, index }));
  const open = openIndex === null ? undefined : draft[openIndex];

  return (
    <div className="concept-tokens c-card cl">
      <div className="cl-head">
        <div className="cl-title-row">
          <span className="cl-title">
            {title}
            {mandatory && (
              <RequiredMark
                met={hasSelection}
                title="At least one option must be recorded (status Y) before this gate can pass (F1/C7 mandatory evidence)"
              />
            )}
          </span>
          {readOnly && (
            <span className="c-tag">
              <LockOutlined /> Read-only — gate passed or signed
            </span>
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
          const blocked = item.selected ? untickBlockedReason?.(item.label) : tickBlockedReason?.(item.label);
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

      {contactAsked && (
        <div className={`cl-contact${contactBlocking ? ' cl-contact-open' : ''}`} id={assessmentAnchor('foreseeableContact')}>
          <div className="cl-contact-head">
            <span className="cl-contact-title">Foreseeable maternal and infant contact</span>
            {!readOnly && contactBlocking && (
              <span className="c-tag cl-contact-need">{contactNeedsReason ? 'Reason required' : 'Confirmation required'}</span>
            )}
          </div>
          <label className="cl-contact-reason">
            <span className="cl-field-label">
              No pregnant, breastfeeding, postpartum or infant user is ticked. Why is contact with such a user, or with an infant, not reasonably
              foreseeable?
              {!readOnly && <span className="cl-req"> *</span>}
            </span>
            <Input.TextArea
              autoSize={{ minRows: 2, maxRows: 5 }}
              disabled={readOnly}
              placeholder="e.g. An adult-only product; no pregnant, breastfeeding or infant use or contact is expected"
              value={contact.draft.rationale}
              // Editing the reason withdraws the confirmation: the confirmer vouched for those words, not the next ones.
              onChange={(e) => contact.update((prev) => ({ ...prev, rationale: e.target.value, confirmedBy: '' }))}
            />
          </label>
          <div className="cl-contact-confirm">
            <span className="cl-field-label">
              Confirmed by
              {!readOnly && contactAsked && contact.draft.rationale.trim() !== '' && <span className="cl-req"> *</span>}
            </span>
            <SelfAttestField
              disabled={readOnly || contact.draft.rationale.trim() === ''}
              status={contactNeedsConfirmer ? 'error' : undefined}
              value={contact.draft.confirmedBy}
              onChange={(v) => contact.update((prev) => ({ ...prev, confirmedBy: v }))}
            />
          </div>
          <p className="cl-hint">If such contact is foreseeable, tick the user above instead: that switches the pathway on.</p>
        </div>
      )}

      {!readOnly && dirty && (
        <div className="cl-save">
          {contactBlocking && <span className="cl-save-why">{contactBlocking}</span>}
          <SaveBar dirty={dirty} onSave={save} onDiscard={discard} disabled={!!contactBlocking} disabledReason={contactBlocking} />
        </div>
      )}

      <Drawer

        closable={{ placement: 'end' }}
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
        footer={readOnly ? undefined : <DrawerSaveFooter dirty={dirty} onSave={save} onClose={() => setOpenIndex(null)} />}
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
