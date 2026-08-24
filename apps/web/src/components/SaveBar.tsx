import { Button, Space, Tooltip, Typography } from 'antd';
import { SaveOutlined, UndoOutlined } from '@ant-design/icons';

// Paired with useDraft: appears only while a table/section has unsaved local
// edits, and commits (or discards) them all at once in a single store write.
export default function SaveBar({
  dirty,
  onSave,
  onDiscard,
  // Blocks Save (e.g. a validation error in the draft, like a duplicate raw
  // material) — Discard stays available so the user can still back out.
  // The caller is expected to also surface `disabledReason` as a visible
  // Alert near the table; this tooltip is a secondary hint, not the primary
  // explanation.
  disabled,
  disabledReason,
  // Set while an async save is in flight: the button shows a spinner and
  // stops accepting a second click.
  loading,
}: {
  dirty: boolean;
  onSave: () => void;
  onDiscard: () => void;
  disabled?: boolean;
  disabledReason?: string;
  loading?: boolean;
}) {
  if (!dirty) return null;
  return (
    <Space size={8} style={{ marginTop: 8 }}>
      <Typography.Text type="warning" style={{ fontSize: 12 }}>
        Unsaved changes
      </Typography.Text>
      {/* A disabled antd Button's root DOM node is a genuine `disabled`
          <button>, which doesn't fire the hover events Tooltip listens for —
          wrapping in a plain <span> gives it a non-disabled hover target
          (the standard antd workaround; see Tooltip's own FAQ). */}
      <Tooltip title={disabled ? disabledReason : undefined}>
        <span>
          <Button
            size="small"
            type="primary"
            icon={<SaveOutlined />}
            onClick={onSave}
            disabled={disabled}
            loading={loading}
          >
            Save
          </Button>
        </span>
      </Tooltip>
      <Button size="small" icon={<UndoOutlined />} onClick={onDiscard} disabled={loading}>
        Discard
      </Button>
    </Space>
  );
}
