import { useEffect, useState } from 'react';
import { Alert, Modal, Spin, Table, Typography } from 'antd';
import type { RegisterClosePreview } from '@mbc360/shared/types';
import { previewRegisterClose } from '../api/projectsApi';

// What a closing signature attests to, on one screen, before the authenticator step: the register's
// rows exactly as they are now. Same idea as GateSignPreviewModal. What is shown is the server's own
// content — the object the hash is taken from — so there is no second rendering that could drift from
// what is actually signed, and the server refuses the signature if the register changes after this
// screen was loaded.
export default function RegisterClosePreviewModal({
  open,
  projectId,
  registerKey,
  gateId,
  roleLabel,
  onCancel,
  onContinue,
}: {
  open: boolean;
  projectId: string;
  registerKey: string;
  gateId: string;
  roleLabel: string;
  onCancel: () => void;
  onContinue: (preview: RegisterClosePreview) => void;
}) {
  const [preview, setPreview] = useState<RegisterClosePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Reloaded every time it opens: the point is that the closer reads what is there NOW.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPreview(null);
    previewRegisterClose(projectId, registerKey, gateId)
      .then((p) => {
        if (!cancelled) setPreview(p);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load the register');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, projectId, registerKey, gateId]);

  return (
    <Modal
      open={open}
      width={920}
      title={`Review before signing — ${roleLabel}${preview ? `, ${preview.title}` : ''}`}
      okText="Continue to sign"
      okButtonProps={{ disabled: !preview || loading }}
      onOk={() => preview && onContinue(preview)}
      onCancel={onCancel}
      destroyOnHidden
    >
      <Typography.Paragraph type="secondary">
        Closing makes this register read-only. This is everything your signature will attest to, as it is right
        now. If any of it changes before you submit, you will be asked to review it again.
      </Typography.Paragraph>
      {error && <Alert type="error" showIcon title={error} />}
      {loading && !preview && <Spin />}
      {preview && (
        <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
          {preview.sections && <Typography.Title level={5}>{preview.tableTitle}</Typography.Title>}
          {preview.rows.length === 0 ? (
            <Alert
              type="info"
              showIcon
              title="This register has no rows."
              description="Closing it records that nothing was entered."
            />
          ) : (
            <Table
              size="small"
              pagination={false}
              scroll={{ x: 'max-content' }}
              rowKey="__n"
              dataSource={preview.rows.map((r, i) => ({ ...r, __n: String(i + 1) }))}
              columns={[
                { title: '#', dataIndex: '__n', width: 44 },
                ...preview.columns.map((c) => ({
                  title: c.label,
                  dataIndex: c.key,
                  render: (v: string | undefined) => v || <Typography.Text type="secondary">—</Typography.Text>,
                })),
              ]}
            />
          )}
          {preview.sections?.map((section) => (
            <div key={section.registerKey} style={{ marginTop: 16 }}>
              <Typography.Title level={5}>{section.title}</Typography.Title>
              {section.rows.length === 0 ? (
                <Alert type="info" showIcon title="No rows in this table." />
              ) : (
                <Table
                  size="small"
                  pagination={false}
                  scroll={{ x: 'max-content' }}
                  rowKey="__n"
                  dataSource={section.rows.map((r, i) => ({ ...r, __n: String(i + 1) }))}
                  columns={[
                    { title: '#', dataIndex: '__n', width: 44 },
                    ...section.columns.map((c) => ({
                      title: c.label,
                      dataIndex: c.key,
                      render: (v: string | undefined) => v || <Typography.Text type="secondary">—</Typography.Text>,
                    })),
                  ]}
                />
              )}
            </div>
          ))}
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {preview.rows.length + (preview.sections?.reduce((n, s) => n + s.rows.length, 0) ?? 0)} row(s) · content fingerprint {preview.hash.slice(0, 16)}… · loaded{' '}
            {new Date(preview.previewedAt).toLocaleTimeString()}
          </Typography.Text>
        </div>
      )}
    </Modal>
  );
}
