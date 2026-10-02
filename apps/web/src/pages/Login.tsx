import { useState } from 'react';
import { Button } from 'antd';
import type { AccessDenial } from '../auth/useSession';
import Notice from '../components/Notice';
import '../styles/concept.css';
import './Login.css';

// The only entry point when there is no usable session. Microsoft 365 is the
// single sign-in method (dev-login stays a raw endpoint for local testing).
//
// Access rule (project owner, 2026-10-02): signing in with Microsoft 365 only
// proves the person belongs to the company tenant. Entering the app needs an
// active account with a role, granted by an administrator — the server refuses
// otherwise, both at sign-in (`?auth_error=no_role|inactive|tenant`) and on
// every request (a 403 the session hook turns into `denied`).
//
// 2026-10-02 redesign (wireframe option A): one flat card; any notice sits
// ABOVE the button, so it is read before acting; the button shows a redirect
// state so it cannot be pressed twice.

type Reason = 'error' | 'no_role' | 'inactive' | 'tenant';

const MESSAGES: Record<Reason, { tone: 'warn' | 'bad'; title: string; body: (email?: string) => React.ReactNode }> = {
  error: {
    tone: 'bad',
    title: "Sign-in didn't complete",
    body: () => 'Something went wrong while signing in with Microsoft. Try again — if it keeps failing, contact your administrator.',
  },
  no_role: {
    tone: 'warn',
    title: "Your account doesn't have access yet",
    body: (email) => (
      <>
        {email ? (
          <>
            You're signed in as <b>{email}</b>, but no role
          </>
        ) : (
          'No role'
        )}{' '}
        has been assigned to you in MBc360. Ask an administrator to assign one, then sign in again.
      </>
    ),
  },
  inactive: {
    tone: 'bad',
    title: 'This account has been deactivated',
    body: (email) => (
      <>
        {email ? <b>{email}</b> : 'This account'} can no longer use MBc360. Contact your administrator if this is a mistake.
      </>
    ),
  },
  tenant: {
    tone: 'bad',
    title: 'Use your company account',
    body: () => 'That Microsoft account belongs to another organisation. Sign in with your company Microsoft 365 account.',
  },
};

function MicrosoftLogo() {
  return (
    <svg viewBox="0 0 21 21" width="18" height="18" aria-hidden>
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

export default function Login({ denied }: { denied?: AccessDenial | null }) {
  const [redirecting, setRedirecting] = useState(false);
  const params = new URLSearchParams(window.location.search);
  const queryError = params.get('auth_error');
  const reason: Reason | undefined = denied
    ? denied.reason
    : queryError === 'no_role' || queryError === 'inactive' || queryError === 'tenant'
      ? queryError
      : queryError
        ? 'error'
        : undefined;
  const email = denied?.email ?? params.get('as') ?? undefined;
  // Refused for WHO they are, not for a glitch: Microsoft's own session is
  // still alive, so a plain retry would silently sign the same account in
  // again. Offer the account picker instead.
  const switchAccount = reason === 'no_role' || reason === 'inactive' || reason === 'tenant';
  const message = reason ? MESSAGES[reason] : undefined;

  const signIn = async () => {
    setRedirecting(true);
    // A session that exists but may not enter (its role was removed) is
    // ended first, so the next sign-in starts clean.
    if (denied) await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    window.location.href = switchAccount ? '/api/auth/login?prompt=select_account' : '/api/auth/login';
  };

  return (
    <div className="concept-tokens ln">
      <main className="c-card ln-card">
        <div className="ln-brand">
          <span className="ln-mark" aria-hidden>
            M
          </span>
          <div>
            <div className="ln-name">MBc360</div>
            <div className="ln-sub">Development &amp; Quality System</div>
          </div>
        </div>

        <h1 className="ln-title">Sign in</h1>

        {message && (
          <Notice tone={message.tone} title={message.title}>
            {message.body(email)}
          </Notice>
        )}

        <Button block size="large" className="ln-btn" loading={redirecting} onClick={() => void signIn()}>
          {!redirecting && <MicrosoftLogo />}
          {redirecting ? 'Redirecting to Microsoft…' : switchAccount ? 'Sign in with a different account' : 'Sign in with Microsoft 365'}
        </Button>

        <p className="ln-foot">
          {switchAccount
            ? 'Signed in to Microsoft as the wrong person? The button above lets you choose another account.'
            : 'Use your company Microsoft 365 account. Access is granted by an administrator — signing in only confirms you belong to the company.'}
        </p>
      </main>
    </div>
  );
}
