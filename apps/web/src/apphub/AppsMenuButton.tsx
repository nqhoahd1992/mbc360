import { createElement, useEffect, useState } from 'react';
// Verbatim COPY of AppHub's client/public/apphub-switcher.js — never edit it here; change it in AppHub and copy it again.
// Imported with ?url: Vite gives the file a hashed name under /assets/, so the year-long nginx cache there
// (apps/web/nginx.conf) can never keep serving an old copy.
import switcherUrl from './apphub-switcher.js?url';
import './apps-menu-button.css';

// The AppHub "Apps" button (9-dot grid): AppHub draws the whole menu (AppHub repo docs/07-apps-menu.md); MBc360 only
// places the button. AppHub's address + this app's slug come at run time from GET /api/hub/menu (the API reads HUB_URL /
// HUB_APP), so no rebuild is needed when they change; while AppHub is not set up that answers 404 and no button shows.
// MBc360 and AppHub are on different root domains, so the list goes through our own API: data-apps="/api/hub-apps"
// (apps/api/src/hub/hub-apps.controller.ts), a path on this same origin. The session is the httpOnly cookie, sent along
// automatically — no AppHubSwitcher.setAuth needed (that is for apps keeping a Bearer token in localStorage).

let loading: Promise<boolean> | null = null;

/** Loads the script once for the whole page. true = there is a button to show. */
function loadSwitcher(): Promise<boolean> {
  loading ??= fetch('/api/hub/menu', { credentials: 'same-origin' })
    .then((res) => (res.ok ? (res.json() as Promise<{ hub?: string; app?: string }>) : null))
    .then((data) => {
      if (!data?.hub || !data?.app) return false;
      if (!document.querySelector('script[data-apphub-switcher]')) {
        const script = document.createElement('script');
        script.src = switcherUrl;
        script.dataset.apphubSwitcher = '';
        script.dataset.hub = data.hub;
        script.dataset.app = data.app;
        script.dataset.apps = '/api/hub-apps';
        document.head.appendChild(script);
      }
      return true;
    })
    .catch(() => false);
  return loading;
}

interface AppsMenuButtonProps {
  className?: string;
  /** A thin separator: `below` (vertical sidebar rail, before the logo) or `after` (header row). */
  divider?: 'below' | 'after';
}

export default function AppsMenuButton({ className = '', divider }: AppsMenuButtonProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    void loadSwitcher().then((ok) => {
      if (alive) setReady(ok);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!ready) return null;
  // A custom element (no JSX typing needed this way); its look is in apps-menu-button.css (::part(button)).
  const button = createElement('apphub-switcher', { className: `apps-menu-button ${className}`.trim() });
  if (!divider) return button;
  return (
    <>
      {button}
      <span aria-hidden className={`apps-menu-divider-${divider}`} />
    </>
  );
}
