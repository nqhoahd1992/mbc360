import { Button, Space, Typography } from 'antd';
import { SaveOutlined, UndoOutlined } from '@ant-design/icons';

// Paired with useDraft: appears only while a table/section has unsaved local
// edits, and commits (or discards) them all at once in a single store write.
export default function SaveBar({
  dirty,
  onSave,
  onDiscard,
}: {
  dirty: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  if (!dirty) return null;
  return (
    <Space size={8} style={{ marginTop: 8 }}>
      <Typography.Text type="warning" style={{ fontSize: 12 }}>
        Unsaved changes
      </Typography.Text>
      <Button size="small" type="primary" icon={<SaveOutlined />} onClick={onSave}>
        Save
      </Button>
      <Button size="small" icon={<UndoOutlined />} onClick={onDiscard}>
        Discard
      </Button>
    </Space>
  );
}
