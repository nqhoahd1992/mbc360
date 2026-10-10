import { useEffect, useState } from 'react';
import { Alert, Collapse, Modal, Spin, Table, Tag, Typography } from 'antd';
import type { PhaseSignPreview } from '@mbc360/shared/types';
import { previewPhaseSignOff } from '../api/projectsApi';

// What a phase signature attests to, on one screen, before the authenticator step: everything the phase
// page shows for that phase, exactly as it is now. Same idea as GateSignPreviewModal. What is shown is
// the server's own content — the object the hash is taken from — so there is no second rendering that
// could drift from what is actually signed, and the server refuses the signature if the phase changes
// after this screen was loaded.
export default function PhaseSignPreviewModal({
  open,
  projectId,
  phase,
  roleLabel,
  onCancel,
  onContinue,
}: {
  open: boolean;
  projectId: string;
  phase: number;
  roleLabel: string;
  onCancel: () => void;
  onContinue: (preview: PhaseSignPreview) => void;
}) {
  const [preview, setPreview] = useState<PhaseSignPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Reloaded every time it opens: the point is that the signer reads what is there NOW.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPreview(null);
    previewPhaseSignOff(projectId, phase)
      .then((p) => {
        if (!cancelled) setPreview(p);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load the phase');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, projectId, phase]);

  return (
    <Modal
      open={open}
      width={980}
      title={`Review before signing — ${roleLabel}, Phase ${phase}`}
      okText="Continue to sign"
      okButtonProps={{ disabled: !preview || loading }}
      onOk={() => preview && onContinue(preview)}
      onCancel={onCancel}
      destroyOnHidden
    >
      <Typography.Paragraph type="secondary">
        This is everything the phase page shows for Phase {phase}, as it is right now — what your signature will
        attest to. If any of it changes before you submit, you will be asked to review it again.
      </Typography.Paragraph>
      {error && <Alert type="error" showIcon title={error} />}
      {loading && !preview && <Spin />}
      {preview && (
        <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
          <Collapse
            size="small"
            defaultActiveKey={preview.sections.map((_, i) => String(i)).filter((_, i) => preview.sections[i].rows.length > 0).slice(0, 2)}
            items={preview.sections.map((section, i) => ({
              key: String(i),
              label: (
                <span>
                  {section.title} <Tag>{section.rows.length}</Tag>
                </span>
              ),
              children:
                section.rows.length === 0 ? (
                  <Typography.Text type="secondary">Nothing recorded.</Typography.Text>
                ) : (
                  <Table
                    size="small"
                    pagination={false}
                    scroll={{ x: 'max-content' }}
                    rowKey="__n"
                    dataSource={section.rows.map((r, n) => ({ ...r, __n: String(n) }))}
                    columns={section.columns.map((c) => ({
                      title: c.label,
                      dataIndex: c.key,
                      render: (v: string | undefined) => v || <Typography.Text type="secondary">—</Typography.Text>,
                    }))}
                  />
                ),
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
