import { useRef, useState } from 'react';
import { Button, Modal, Typography } from 'antd';
import SignatureCanvas from 'react-signature-canvas';

// Crops the transparent margin off a drawn signature, so the saved PNG is the
// mark itself rather than the whole pad.
//
// This replaces react-signature-canvas's own `getTrimmedCanvas()` (2026-08-21),
// which throws `(0 , import_build.default) is not a function` in the browser.
// Not our bug and not fixable by upgrading — 1.1.0-alpha.2 is the latest
// release: its `dist/index.mjs` does `import trimCanvas from 'trim-canvas'`,
// but that package's UMD build assigns the function to
// `module.exports.default` and marks `__esModule`. Under Node's ESM semantics
// a default import of a CJS module IS `module.exports`, so the imported value
// is the wrapper OBJECT, not the function — webpack and esbuild's web-mode
// interop honour the `__esModule` marker and hand back the function, which is
// why the package works elsewhere, while the dev server's prebundle emits
// `__toESM(mod, 1)` (Node mode) and it does not. Verified by replicating both
// interop paths against that exact module shape.
//
// Trimming is ~20 lines of canvas arithmetic, so owning it beats aliasing a
// dependency's interop or shipping an untrimmed image.
function trimmedPngDataUrl(canvas: HTMLCanvasElement): string {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.toDataURL('image/png');
  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);
  let top = height;
  let left = width;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      // Alpha only: the pad is transparent where nothing was drawn.
      if (data[(y * width + x) * 4 + 3] === 0) continue;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
      if (x < left) left = x;
      if (x > right) right = x;
    }
  }
  // Nothing drawn — the caller already checks isEmpty(), so this is only a
  // guard against exporting a zero-sized canvas.
  if (right < left || bottom < top) return canvas.toDataURL('image/png');
  const out = document.createElement('canvas');
  out.width = right - left + 1;
  out.height = bottom - top + 1;
  out.getContext('2d')?.drawImage(canvas, left, top, out.width, out.height, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}

// My Account > Signature (2026-08-21): draw-with-the-mouse popup. Built on
// react-signature-canvas (a thin wrapper over signature_pad) rather than a
// hand-rolled <canvas> — it already solves pointer/touch normalization and
// devicePixelRatio scaling, the fiddly parts of this that aren't worth
// re-implementing. Only its trimming helper is bypassed, see above.
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
  const boxRef = useRef<HTMLDivElement>(null);
  const [padWidth, setPadWidth] = useState(0);
  // Measured once the dialog has opened (its body has a width only then).
  // Re-measuring on resize would clear a half-drawn signature, so it is not.
  const measure = () => setPadWidth(Math.floor((boxRef.current?.clientWidth ?? 0)));

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
      const imageData = trimmedPngDataUrl(pad.getCanvas());
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
      afterOpenChange={(visible) => (visible ? measure() : setPadWidth(0))}
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
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
        Draw with your mouse (or finger, on a touch screen) in the box below.
      </Typography.Text>
      {/* The pad fills the dialog's width (2026-10-02, user-reported: a fixed
          400px pad sat left-aligned in a wider dialog). The canvas's own pixel
          width must equal its displayed width or strokes land off the pointer,
          so it is measured rather than stretched with CSS. */}
      <div
        ref={boxRef}
        style={{ border: '1px solid #d9d9d9', borderRadius: 6, background: '#fff', touchAction: 'none' }}
      >
        {padWidth > 0 && (
          <SignatureCanvas
            ref={padRef}
            penColor="#1f1f1f"
            canvasProps={{ width: padWidth, height: 160, style: { display: 'block' } }}
          />
        )}
      </div>
      {error && <p style={{ margin: '8px 0 0', color: '#cf1322', fontSize: 13 }}>{error}</p>}
    </Modal>
  );
}
