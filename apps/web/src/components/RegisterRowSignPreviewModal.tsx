import { useEffect, useState } from 'react';
import { Alert, Descriptions, Modal, Spin, Typography } from 'antd';
import type { RegisterRowSignPreview } from '@mbc360/shared/types';
import { previewRegisterRowSignature } from '../api/projectsApi';

// What a signature cell attests to, on one screen, before the authenticator step: the row exactly as
// it is now. Same idea as GateSignPreviewModal and RegisterClosePreviewModal. What is shown is the
// server's own content — the object the hash is taken from — and the server refuses the signature if
// the row changes after this screen was loaded.
export default function RegisterRowSignPreviewModal({
  open,
  projectId,
  registerKey,
  rowIndex,
  column,
  columnLabel,
  onCancel,
  onContinue,
}: {
  open: boolean;
  projectId: string;
  registerKey: string;
  rowIndex: number;
  column: string;
  columnLabel: string;
  onCancel: () => void;
  onContinue: (preview: RegisterRowSignPreview) => void;
}) {
  const [preview, setPreview] = useState<RegisterRowSignPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Reloaded every time it opens: the point is that the signer reads what is there NOW.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPreview(null);
    previewRegisterRowSignature(projectId, registerKey, rowIndex, column)
      .then((p) => {
        if (!cancelled) setPreview(p);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load the row');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, projectId, registerKey, rowIndex, column]);

  return (
    <Modal
      open={open}
      width={720}
      title={`Review before signing — ${columnLabel}${preview ? `, ${preview.title}, row ${rowIndex + 1}` : ''}`}
      okText="Continue to sign"
      okButtonProps={{ disabled: !preview || loading }}
      onOk={() => preview && onContinue(preview)}
      onCancel={onCancel}
      destroyOnHidden
    >
      <Typography.Paragraph type="secondary">
        This is the row your signature will attest to, as it is right now. If it changes before you submit, you
        will be asked to review it again.
      </Typography.Paragraph>
      {error && <Alert type="error" showIcon title={error} />}
      {loading && !preview && <Spin />}
      {preview && (
        <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
          <Descriptions
            size="small"
            bordered
            column={1}
            items={preview.columns.map((c) => ({
              key: c.key,
              label: c.label,
              children: preview.row[c.key] || <Typography.Text type="secondary">—</Typography.Text>,
            }))}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Content fingerprint {preview.hash.slice(0, 16)}… · loaded {new Date(preview.previewedAt).toLocaleTimeString()}
          </Typography.Text>
        </div>
      )}
    </Modal>
  );
}
