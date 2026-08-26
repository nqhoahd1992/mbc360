import { useEffect, useState } from 'react';
import { Alert, Button, Card, Input, Popconfirm, QRCode, Space, Spin, Tag, Typography, message } from 'antd';
import {
  activateTotp,
  beginTotpEnrollment,
  getMyTotpStatus,
  removeTotp,
  type TotpEnrollment,
  type TotpStatus,
} from '../api/accountApi';

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

  // A tall card with the error pinned to its top means a rejected code shows
  // up ~700px above the button that was pressed, which reads as "nothing
  // happened" — so this is rendered inside whichever step is active instead.
  const errorAlert = error ? (
    <Alert type="error" showIcon title={error} style={{ marginTop: 4 }} />
  ) : null;

  return (
    <Card size="small" title="Authenticator app">
      <Typography.Paragraph type="secondary">
        Attaching your saved signature to a sign-off asks for the 6-digit code from an authenticator
        app (Microsoft Authenticator, Google Authenticator, 1Password — any of them). Set it up once
        here.
      </Typography.Paragraph>
      {loading ? (
        <Spin />
      ) : enrollment ? (
        <Space orientation="vertical" size={12}>
          <Alert
            type="info"
            showIcon
            title="Step 1 — scan this with your authenticator app"
            description="Scanning alone does not switch it on: the app will start showing a 6-digit code, and entering one below is what proves the device is yours."
          />
          <Alert
            type="warning"
            showIcon
            title="Only this QR works"
            description="If you scanned an earlier one for MBc360, delete that entry in your app first — starting setup again replaces the key, so codes from the old entry will be rejected, and both entries look identical in the app."
          />
          <QRCode value={enrollment.otpauthUri} size={168} />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Can&apos;t scan? Enter this key manually:{' '}
            <Typography.Text code copyable={{ text: enrollment.secret.replace(/\s/g, '') }}>
              {enrollment.secret}
            </Typography.Text>
          </Typography.Text>
          <Space orientation="vertical" size={4}>
            <Typography.Text strong>Step 2 — enter the code your app shows now</Typography.Text>
            <Space>
              <Input
                style={{ width: 140 }}
                maxLength={6}
                placeholder="000000"
                inputMode="numeric"
                autoComplete="one-time-code"
                spellCheck={false}
                name="totpEnrollCode"
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                onPressEnter={confirm}
              />
              <Button type="primary" loading={busy} disabled={code.length !== 6} onClick={confirm}>
                Confirm
              </Button>
              <Button onClick={() => setEnrollment(null)}>Cancel</Button>
            </Space>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              The code changes every 30 seconds — if it rolls over while you type, just use the new
              one.
            </Typography.Text>
            {errorAlert}
          </Space>
        </Space>
      ) : status?.enrolled ? (
        <Space orientation="vertical" size={12}>
          <Space>
            <Tag color="green">Active</Tag>
            <Typography.Text type="secondary">
              Set up on {status.activatedAt ? new Date(status.activatedAt).toLocaleString() : '—'}
            </Typography.Text>
          </Space>
          {status.lockedUntil && (
            <Alert
              type="warning"
              showIcon
              title={`Too many incorrect codes — locked until ${new Date(status.lockedUntil).toLocaleTimeString()}`}
            />
          )}
          {!removing && errorAlert}
          {removing ? (
            <Space orientation="vertical" size={8}>
              <Typography.Text type="secondary">
                Enter a current code to confirm it is you removing it.
              </Typography.Text>
              <Space>
                <Input
                  style={{ width: 140 }}
                  maxLength={6}
                  placeholder="000000"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  spellCheck={false}
                  name="totpRemoveCode"
                  value={removeCode}
                  onChange={(e) => setRemoveCode(e.target.value.replace(/\D/g, ''))}
                  onPressEnter={remove}
                />
                <Button danger loading={busy} disabled={removeCode.length !== 6} onClick={remove}>
                  Remove
                </Button>
                <Button onClick={() => setRemoving(false)}>Cancel</Button>
              </Space>
              {errorAlert}
            </Space>
          ) : (
            <Popconfirm
              title="Remove your authenticator?"
              description="You will not be able to attach your signature to a sign-off until you set one up again."
              okText="Continue"
              okButtonProps={{ danger: true }}
              onConfirm={() => setRemoving(true)}
            >
              <Button danger>Remove authenticator</Button>
            </Popconfirm>
          )}
        </Space>
      ) : (
        <Space orientation="vertical">
          {status?.pending && (
            <Typography.Text type="warning">
              A setup was started but never confirmed — it does not work yet. Start again below, and
              delete any earlier MBc360 entry in your app: the new QR uses a different key.
            </Typography.Text>
          )}
          <Button type="primary" loading={busy} onClick={start}>
            Set up authenticator
          </Button>
          {errorAlert}
        </Space>
      )}
    </Card>
  );
}
