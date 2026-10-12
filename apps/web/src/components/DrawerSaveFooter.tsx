import { Button } from 'antd';
import './DrawerSaveFooter.css';

// The Save controls of a detail drawer that edits ONE row of a table whose draft is shared and saved at
// page level (project owner, 2026-10-11).
//
// The reviewer walks such a drawer through the rows, so there are two ways to save:
//   Save          writes the whole table's draft and CLOSES the drawer once the write was accepted (project owner,
//                 2026-10-12 — before that it stayed open on the row).
//   Save & next   writes it, then moves to the next row — the main action when dispositioning a list.
// Without these the drawer said "changes stay in the draft until you Save it" and offered no way to,
// leaving the page-level bar (possibly hidden behind the panel) as the only route.
//
// `onClose` is what Save calls once the save was accepted. A refused save (onSave resolves false) leaves the
// drawer open with what was typed.
//
// Drawers that CREATE a record are a different thing: they end in one commit and close once the server
// has accepted it (see FormDrawer).
export default function DrawerSaveFooter({
  dirty,
  onSave,
  onSaveAndNext,
  onClose,
  onOwnAction,
  saving,
  disabled,
  disabledReason,
}: {
  dirty: boolean;
  // Resolve `false` when the write was refused; anything else counts as accepted.
  onSave: () => void | boolean | Promise<unknown>;
  // Present only when there is a next row to go to.
  // Resolve false when nothing was saved, so the flag set by `onOwnAction` is released.
  onSaveAndNext?: () => void | boolean | Promise<unknown>;
  // Present only when there is no next row: closes the drawer once the save was accepted.
  onClose?: () => void;
  // Called before either button writes, so a page-level close-on-save knows this save came from the drawer. May return
  // a function that is called when the save was refused (see useCloseDrawerOnPageSave).
  onOwnAction?: () => void | (() => void);
  saving?: boolean;
  // A rule that blocks the save (a duplicate line, a missing field), as the page-level bar shows it.
  disabled?: boolean;
  disabledReason?: string;
}) {
  const saveThenClose = async () => {
    const release = onOwnAction?.();
    const result = await onSave();
    if (result !== false) onClose?.();
    else release?.();
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
          <Button type="primary" onClick={async () => {
              const release = onOwnAction?.();
              if ((await onSaveAndNext()) === false) release?.();
            }} disabled={dirty && disabled} loading={saving}>
            {dirty ? 'Save & next' : 'Next'}
          </Button>
        )}
      </span>
    </div>
  );
}
