import { useEffect, useState } from 'react';
import { Alert, Button, Card, Popconfirm, Space, Spin, Typography } from 'antd';
import {
  deleteMySignature,
  getMySignature,
  saveMySignature,
  type SignatureResponse,
} from '../api/accountApi';
import SignatureCaptureModal from '../components/SignatureCaptureModal';

// My Account (2026-08-21): self-service settings, starting with the one
// setting that exists so far — a drawn signature reusable across phase
// sign-offs (SignOffBlock.tsx's "Attach my saved signature" option). Using
// it there still requires a fresh email step-up each time; saving it here
// does not.
export default function MyAccount() {
  const [signature, setSignature] = useState<SignatureResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMySignature()
      .then(setSignature)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load signature'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (imageData: string) => {
    setSignature(await saveMySignature(imageData));
  };

  const handleDelete = async () => {
    setSignature(await deleteMySignature());
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <Typography.Title level={4}>My Account</Typography.Title>
      <Card size="small" title="Signature">
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}
        <Typography.Paragraph type="secondary">
          Draw a signature once and reuse it when signing a phase. Attaching it to a sign-off
          still needs a one-time email verification code each time — saving it here does not.
        </Typography.Paragraph>
        {loading ? (
          <Spin />
        ) : signature?.hasSignature ? (
          <Space direction="vertical" size={12}>
            <div
              style={{
                border: '1px solid #f0f0f0',
                borderRadius: 4,
                padding: 8,
                background: '#fff',
                display: 'inline-block',
              }}
            >
              <img src={signature.imageData} alt="Your saved signature" style={{ display: 'block', maxWidth: 300 }} />
            </div>
            <Space>
              <Button onClick={() => setModalOpen(true)}>Update signature</Button>
              <Popconfirm
                title="Remove your saved signature?"
                description="You can draw a new one at any time."
                okText="Remove"
                okButtonProps={{ danger: true }}
                onConfirm={handleDelete}
              >
                <Button danger>Remove</Button>
              </Popconfirm>
            </Space>
          </Space>
        ) : (
          <Space direction="vertical">
            <Typography.Text type="secondary">No signature saved yet.</Typography.Text>
            <Button type="primary" onClick={() => setModalOpen(true)}>
              Add signature
            </Button>
          </Space>
        )}
      </Card>
      <SignatureCaptureModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} />
    </div>
  );
}
