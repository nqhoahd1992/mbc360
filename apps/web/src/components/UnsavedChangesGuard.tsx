import { useEffect } from 'react';
import { App } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUnsavedCount } from '../hooks/unsavedRegistry';

// Warns before unsaved table edits are thrown away — on a reload/tab close,
// and on in-app navigation.
//
// Why a capture-phase click listener rather than react-router's useBlocker:
// useBlocker needs a DATA router (createHashRouter + RouterProvider), while
// this app builds its shell around <HashRouter> + <Routes> so the layout can
// wrap the routes. Every navigation surface here is a real <a href="#/..."> —
// 32 <Link>s, mostly the sidebar — so intercepting the click covers them all
// without restructuring the shell. The three imperative navigate() calls
// (project switcher, gate blocker deep links) are not covered; they are all
// explicit user choices from inside one project, not the accidental
// sidebar-click case this exists for.
export default function UnsavedChangesGuard() {
  const unsaved = useUnsavedCount();
  const navigate = useNavigate();
  const location = useLocation();
  // Context-aware instance (2026-08-26) — the static `Modal.confirm` this used
  // to call renders outside React's tree, so it can never see ConfigProvider's
  // theme (antd's own warning: "Static function can not consume context like
  // dynamic theme. Please use 'App' component instead."). `App.useApp()`
  // requires an ancestor `<App>` — see App.tsx's root.
  const { modal } = App.useApp();

  useEffect(() => {
    if (unsaved === 0) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      // Browsers ignore custom text now; assigning returnValue is still what
      // triggers the native "leave site?" prompt.
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [unsaved]);

  useEffect(() => {
    if (unsaved === 0) return;
    const onClick = (e: MouseEvent) => {
      // Let the browser handle anything that isn't a plain left-click on an
      // in-app link: modified clicks and target=_blank open a new tab, which
      // leaves this page (and its edits) exactly where they are.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target === '_blank') return;
      const href = anchor.getAttribute('href');
      if (!href?.startsWith('#/')) return;
      const to = href.slice(1);
      // Compare the PATH only. A link that just changes the query string —
      // e.g. the gate-blocker deep links that add ?scrollTo=… to the page you
      // are already on — keeps the same component tree mounted, so the drafts
      // survive and a warning would be a false alarm. A different path
      // remounts (or re-parameterises) the page, which is exactly when an
      // unsaved draft is lost.
      if (to.split('?')[0] === location.pathname) return;

      e.preventDefault();
      // Capture phase + stopPropagation so antd's Menu never records a
      // selection for a navigation that has not happened yet.
      e.stopPropagation();
      modal.confirm({
        title: unsaved === 1 ? 'Leave with unsaved changes?' : `Leave with ${unsaved} unsaved sections?`,
        content:
          'Edits you have not saved on this page will be lost. Cancel, then use Save on the section you were editing.',
        okText: 'Leave without saving',
        okButtonProps: { danger: true },
        cancelText: 'Stay on this page',
        onOk: () => navigate(to),
      });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [unsaved, navigate, location.pathname, modal]);

  return null;
}
