import { useEffect, useState } from 'react';
import { Button, Input, Popconfirm, QRCode, Typography, message } from 'antd';
import {
  activateTotp,
  beginTotpEnrollment,
  getMyTotpStatus,
  removeTotp,
  type TotpEnrollment,
  type TotpStatus,
} from '../api/accountApi';
import '../styles/concept.css';
import './TotpEnrollCard.css';

// My Account → "Authenticator app" (2026-08-21). The second factor a signer
// proves before their saved signature may be attached to a phase sign-off.
// Whether the review team wants a second factor (and a drawn signature) at
// all is not something D1 answers: [ASSUMPTION: R5-Q4]
//
// Enrolment is two steps on purpose: scanning the QR proves nothing, so the
// factor only becomes usable once a first correct code is entered. Removing it
// likewise needs a current code — otherwise a hijacked session could strip the
// very control that protects a signature. A user who lost their phone asks an
// administrator to reset it (Users & Roles → Reset authenticator).
export default function TotpEnrollCard() {
  const [status, setStatus] = useState<TotpStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeCode, setRemoveCode] = useState('');

  useEffect(() => {
    getMyTotpStatus()
      .then(setStatus)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load authenticator status'))
      .finally(() => setLoading(false));
  }, []);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const start = () =>
    run(async () => {
      setEnrollment(await beginTotpEnrollment());
      setCode('');
    });

  const confirm = () =>
    run(async () => {
      setStatus(await activateTotp(code));
      setEnrollment(null);
      setCode('');
      message.success('Authenticator is on — signing with your signature will ask for a code');
    });

  const remove = () =>
    run(async () => {
      setStatus(await removeTotp(removeCode));
      setRemoving(false);
      setRemoveCode('');
      message.success('Authenticator removed');
    });

  // Rendered inside whichever step is active, next to the button that was
  // pressed — a rejected code pinned far above it read as "nothing happened".
  const errorLine = error ? <p className="te-error">{error}</p> : null;

  const codeInput = (value: string, set: (v: string) => void, onEnter: () => void, name: string, autoFocus?: boolean) => (
    <Input
      className="te-code"
      maxLength={6}
      placeholder="000000"
      inputMode="numeric"
      autoComplete="one-time-code"
      spellCheck={false}
      name={name}
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => set(e.target.value.replace(/\D/g, ''))}
      onPressEnter={onEnter}
    />
  );

  // 2026-10-02 (My Account redesign): no card of its own — it is the right half
  // of the page's "Ready to sign" card — and the two-step setup is numbered
  // steps instead of three stacked colour banners.
  if (loading) return <div className="c-skel" style={{ height: 40 }} />;

  if (enrollment) {
    return (
      <ol className="te-steps">
        <li>
          <span className="te-n">1</span>
          <div className="te-body">
            <div className="te-title">Scan with your authenticator app</div>
            <QRCode value={enrollment.otpauthUri} size={152} bordered={false} />
            <p className="te-hint">
              Can&apos;t scan? Enter this key:{' '}
              <Typography.Text code copyable={{ text: enrollment.secret.replace(/\s/g, '') }}>
                {enrollment.secret}
              </Typography.Text>
            </p>
            <p className="te-hint">
              Only this QR works. If you scanned an earlier one for MBc360, delete that entry in your app first — codes
              from it will be rejected.
            </p>
          </div>
        </li>
        <li>
          <span className="te-n">2</span>
          <div className="te-body">
            <div className="te-title">Enter the 6-digit code it shows now</div>
            <div className="te-row">
              {codeInput(code, setCode, confirm, 'totpEnrollCode', true)}
              <Button type="primary" loading={busy} disabled={code.length !== 6} onClick={confirm}>
                Activate
              </Button>
              <Button type="text" onClick={() => setEnrollment(null)}>
                Cancel
              </Button>
            </div>
            <p className="te-hint">The code changes every 30 seconds — if it rolls over while you type, use the new one.</p>
            {errorLine}
          </div>
        </li>
      </ol>
    );
  }

  if (status?.enrolled) {
    return (
      <div className="te">
        <div className="te-row">
          {status.lockedUntil ? (
            <>
              <span className="c-tag c-tag-bad">Locked</span>
              <span className="te-hint">
                Too many incorrect codes — try again after {new Date(status.lockedUntil).toLocaleTimeString()}.
              </span>
            </>
          ) : (
            <>
              <span className="c-tag c-tag-ok">Active</span>
              <span className="te-hint">
                Set up on {status.activatedAt ? new Date(status.activatedAt).toLocaleDateString() : '—'}
              </span>
            </>
          )}
        </div>
        {removing ? (
          <>
            <p className="te-hint">Enter a current code to confirm it is you removing it.</p>
            <div className="te-row">
              {codeInput(removeCode, setRemoveCode, remove, 'totpRemoveCode')}
              <Button danger loading={busy} disabled={removeCode.length !== 6} onClick={remove}>
                Remove
              </Button>
              <Button type="text" onClick={() => setRemoving(false)}>
                Cancel
              </Button>
            </div>
            {errorLine}
          </>
        ) : (
          <>
            {errorLine}
            <div>
              <Popconfirm
                title="Remove your authenticator?"
                description="You will not be able to attach your signature to a sign-off until you set one up again."
                okText="Continue"
                okButtonProps={{ danger: true }}
                onConfirm={() => setRemoving(true)}
              >
                <Button>Remove authenticator</Button>
              </Popconfirm>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="te">
      <p className="te-hint">
        Not set up. Any authenticator app works — Microsoft Authenticator, Google Authenticator, 1Password.
      </p>
      {status?.pending && (
        <p className="te-warn">
          A setup was started but never confirmed, so it does not work yet. Start again, and delete any earlier MBc360
          entry in your app — the new QR uses a different key.
        </p>
      )}
      <div>
        <Button type="primary" loading={busy} onClick={start}>
          Set up authenticator
        </Button>
      </div>
      {errorLine}
    </div>
  );
}
