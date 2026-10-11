import { Button } from 'antd';
import './DrawerSaveFooter.css';

// The Save controls of a detail drawer that edits ONE row of a table whose draft is shared and saved at
// page level (project owner, 2026-10-11).
//
// Such a drawer is a workspace the reviewer walks through row by row, so saving must NOT close it:
//   Save          writes the whole table's draft and stays on the row.
//   Save & next   writes it, then moves to the next row — the main action when dispositioning a list.
// Without these the drawer said "changes stay in the draft until you Save it" and offered no way to,
// leaving the page-level bar (possibly hidden behind the panel) as the only route.
//
// A drawer with no next row (a single checklist option, a CAPA, a market profile) passes `onClose`: there is
// nothing to stay for, so a save the server accepted closes it. A refused save (onSave resolves false) leaves
// it open with what was typed.
//
// Drawers that CREATE a record are a different thing: they end in one commit and close once the server
// has accepted it (see FormDrawer).
export default function DrawerSaveFooter({
  dirty,
  onSave,
  onSaveAndNext,
  onClose,
  saving,
  disabled,
  disabledReason,
}: {
  dirty: boolean;
  // Resolve `false` when the write was refused; anything else counts as accepted.
  onSave: () => void | boolean | Promise<unknown>;
  // Present only when there is a next row to go to.
  onSaveAndNext?: () => void | Promise<unknown>;
  // Present only when there is no next row: closes the drawer once the save was accepted.
  onClose?: () => void;
  saving?: boolean;
  // A rule that blocks the save (a duplicate line, a missing field), as the page-level bar shows it.
  disabled?: boolean;
  disabledReason?: string;
}) {
  const saveThenClose = async () => {
    const result = await onSave();
    if (result !== false) onClose?.();
  };
  return (
    <div className="dsf">
      <span className={`dsf-state${dirty ? ' dsf-dirty' : ''}`} role="status">
        {disabled && disabledReason ? disabledReason : dirty ? 'Unsaved changes' : 'All changes saved'}
      </span>
      <span className="dsf-actions">
        <Button onClick={() => void saveThenClose()} disabled={!dirty || disabled} loading={saving}>
          Save
        </Button>
        {onSaveAndNext && (
          <Button type="primary" onClick={() => void onSaveAndNext()} disabled={dirty && disabled} loading={saving}>
            {dirty ? 'Save & next' : 'Next'}
          </Button>
        )}
      </span>
    </div>
  );
}
