import { Button, Space, Tooltip } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { useSession } from '../auth/useSession';

// A "confirmed by / reviewed by / assessed by" field (SME rule audit C6,
// 2026-10-04). It records an act, so it can only hold the person who did it —
// the server refuses any other name. Instead of a picker that offers everyone,
// it shows who is recorded and lets the signed-in person record themselves.
export default function SelfAttestField({
  value,
  onChange,
  disabled,
  status,
}: {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  status?: 'error';
}) {
  const me = useSession().user?.displayName;
  const recorded = value?.trim() ?? '';
  const isMe = !!me && recorded === me;
  return (
    <Space size={6} wrap style={status === 'error' && !recorded ? { outline: '1px solid #ff4d4f', borderRadius: 6, padding: '0 4px' } : undefined}>
      <span>{recorded || <span style={{ color: '#999' }}>Not recorded</span>}</span>
      {!isMe && me && (
        <Button size="small" disabled={disabled} onClick={() => onChange(me)}>
          Record as me
        </Button>
      )}
      {isMe && (
        <Tooltip title="Clear">
          <Button size="small" type="text" icon={<CloseOutlined />} disabled={disabled} onClick={() => onChange('')} />
        </Tooltip>
      )}
    </Space>
  );
}
