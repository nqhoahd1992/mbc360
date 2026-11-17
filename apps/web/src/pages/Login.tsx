import { useEffect, useState } from 'react';
import { Button, Spin } from 'antd';
import type { AccessDenial } from '../auth/useSession';
import Notice from '../components/Notice';
import '../styles/concept.css';
import './Login.css';

// The only entry point when there is no usable session — rendered in place, at
// whatever page was being opened (App.tsx). Microsoft 365 through AppHub is the
// single sign-in method (dev-login stays a raw endpoint for local testing);
// MBc360 has never had a password sign-in.
//
// Since 2026-11-17 (AppHub repo docs/11-ai-remove-password-login.md) this
// screen does not wait for a click: it sends the browser straight to
// /api/auth/login?next=<this page>, which the server redirects to AppHub
// (/launch/{HUB_APP}?next=); AppHub signs in with Microsoft (or still has a
// session) and opens MBc360 through the signed hub handshake, back on that same
// page. It STOPS — notice + "Sign in with Microsoft 365" button — only where
// going on would loop or cannot work:
//  - an answer to explain: ?hub_error= (from AppHub's handshake),
//    ?auth_error=no_role|inactive or a 403 session (`denied`) — AppHub's
//    session is still alive, so sending the browser back would land here again;
//  - AppHub not configured on the server (GET /api/auth/options → microsoft:
//    false, or the call failed).
// ?signed_out=1 does not stop it: AppHub decides (still signed in → straight
// back in; otherwise Microsoft first).
//
// Access rule (project owner, 2026-10-02): signing in with Microsoft 365 only
// proves who the person is. Entering the app needs an active account with a
// role, granted by an administrator — the server refuses otherwise, both at
// sign-in (`?auth_error=no_role|inactive`) and on every request (a 403 the
// session hook turns into `denied`). An email MBc360 does not know gets
// `?hub_error=no_account`. The first administrator is added on the server
// (PINNED_ADMINS).
//
// 2026-10-02 redesign (wireframe option A): one flat card; any notice sits
// ABOVE the button, so it is read before acting.

type Reason = 'no_role' | 'inactive' | 'no_account' | 'hub_expired' | 'hub_failed';

const MESSAGES: Record<Reason, { tone: 'warn' | 'bad'; title: string; body: (email?: string) => React.ReactNode }> = {
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
  no_account: {
    tone: 'warn',
    title: "You don't have access to MBc360 yet",
    body: () => 'Ask an MBc360 Admin to add your Microsoft email.',
  },
  hub_expired: {
    tone: 'warn',
    title: 'That AppHub sign-in link has expired',
    body: () => 'It has expired or was already used. Try again.',
  },
  hub_failed: {
    tone: 'bad',
    title: 'Sign-in through AppHub failed',
    body: () => 'Try again.',
  },
};

// Query parameters that are answers to THIS screen, never part of the page to come back to.
const LOGIN_PARAMS = ['auth_error', 'hub_error', 'as', 'signed_out'];

/** The page being opened (path + query, without this screen's own parameters), or null for the home page. */
function nextPath(): string | null {
  const params = new URLSearchParams(window.location.search);
  for (const key of LOGIN_PARAMS) params.delete(key);
  const query = params.toString();
  const path = `${window.location.pathname}${query ? `?${query}` : ''}`;
  return path === '/' ? null : path;
}

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
  // null while asking the server whether AppHub is configured.
  const [microsoft, setMicrosoft] = useState<boolean | null>(null);
  const params = new URLSearchParams(window.location.search);
  const queryError = params.get('auth_error');
  const hubError = params.get('hub_error');
  const reason: Reason | undefined = denied
    ? denied.reason
    : queryError === 'no_role' || queryError === 'inactive'
      ? queryError
      : hubError === 'no_account'
        ? 'no_account'
        : hubError === 'expired'
          ? 'hub_expired'
          : hubError
            ? 'hub_failed'
            : undefined;
  const email = denied?.email ?? params.get('as') ?? undefined;
  // Refused for WHO they are: AppHub's (and Microsoft's) session is still
  // alive, so a plain retry signs the same account in again.
  const refused = reason === 'no_role' || reason === 'inactive';
  const message = reason ? MESSAGES[reason] : undefined;
  const next = nextPath();
  // Full-page navigation: the server redirects to AppHub (api auth/auth.controller.ts login).
  const signInUrl = `/api/auth/login${next ? `?${new URLSearchParams({ next })}` : ''}`;

  useEffect(() => {
    fetch('/api/auth/options')
      .then((res) => (res.ok ? (res.json() as Promise<{ microsoft?: boolean }>) : undefined))
      .then((options) => {
        const on = options?.microsoft === true;
        setMicrosoft(on);
        // Nothing to explain → straight on to AppHub; replace() keeps this screen out of the Back history.
        if (on && !reason) window.location.replace(signInUrl);
      })
      .catch(() => setMicrosoft(false));
    // Once per mount: the URL (and so reason / signInUrl) does not change while this screen is shown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async () => {
    setRedirecting(true);
    // A session that exists but may not enter (its role was removed) is
    // ended first, so the next sign-in starts clean.
    if (denied) await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    window.location.href = signInUrl;
  };

  // On the way to AppHub (or still asking whether it is configured).
  const goingOn = !reason && microsoft !== false;

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

        {goingOn && (
          <div className="ln-foot" role="status" aria-live="polite">
            <Spin size="small" /> &nbsp;Taking you to AppHub…
          </div>
        )}

        {message && (
          <Notice tone={message.tone} title={message.title}>
            {message.body(email)}
          </Notice>
        )}

        {microsoft === false && (
          <Notice tone="bad" title="Sign-in isn't available">
            AppHub is not configured on this server (HUB_URL, HUB_APP). Contact your administrator.
          </Notice>
        )}

        {reason && microsoft && (
          <Button block size="large" className="ln-btn" loading={redirecting} onClick={() => void signIn()}>
            {!redirecting && <MicrosoftLogo />}
            {redirecting ? 'Redirecting to AppHub…' : 'Sign in with Microsoft 365'}
          </Button>
        )}

        {reason && microsoft && (
          <p className="ln-foot">
            {refused
              ? 'Signed in as the wrong person? Sign out of AppHub, then sign in again with the right account.'
              : 'Use your company Microsoft 365 account. An administrator must add you to MBc360 and assign a role first.'}
          </p>
        )}
      </main>
    </div>
  );
}
