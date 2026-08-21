import { useRef, useState } from 'react';
import { Alert, Button, Modal, Typography } from 'antd';
import SignatureCanvas from 'react-signature-canvas';

// My Account > Signature (2026-08-21): draw-with-the-mouse popup. Built on
// react-signature-canvas (a thin wrapper over signature_pad) rather than a
// hand-rolled <canvas> — it already solves pointer/touch normalization and
// devicePixelRatio scaling, the fiddly parts of this that aren't worth
// re-implementing. `getTrimmedCanvas()` drops surrounding whitespace before
// export, keeping the saved PNG small.
export default function SignatureCaptureModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (imageData: string) => Promise<void>;
}) {
  const padRef = useRef<SignatureCanvas>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clear = () => {
    padRef.current?.clear();
    setError(null);
  };

  const save = async () => {
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) {
      setError('Draw your signature before saving');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const imageData = pad.getTrimmedCanvas().toDataURL('image/png');
      await onSave(imageData);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save signature');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Draw your signature"
      onCancel={onClose}
      destroyOnHidden
      footer={[
        <Button key="clear" onClick={clear}>
          Clear
        </Button>,
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="save" type="primary" loading={saving} onClick={save}>
          Save
        </Button>,
      ]}
    >
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
        Draw with your mouse (or finger, on a touch screen) in the box below.
      </Typography.Text>
      <div
        style={{
          border: '1px solid #d9d9d9',
          borderRadius: 4,
          width: 400,
          background: '#fff',
          touchAction: 'none',
        }}
      >
        <SignatureCanvas
          ref={padRef}
          penColor="#1f1f1f"
          canvasProps={{ width: 400, height: 150, style: { display: 'block' } }}
        />
      </div>
    </Modal>
  );
}
