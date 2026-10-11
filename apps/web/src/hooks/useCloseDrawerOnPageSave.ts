import { useEffect, useRef } from 'react';

// A page-level Save (or Discard) settles the whole table's draft, so a detail drawer still open over it has
// nothing left to show — it closes (project owner, 2026-10-11). The drawer's OWN Save & next must keep it open,
// so those call the returned `markOwn()` first and the transition they cause is ignored.
// Only a real dirty → clean transition counts: a refused save leaves the draft dirty and the drawer open.
export function useCloseDrawerOnPageSave(dirty: boolean, isOpen: boolean, close: () => void) {
  const prevDirty = useRef(dirty);
  const own = useRef(false);
  useEffect(() => {
    const settled = prevDirty.current && !dirty;
    prevDirty.current = dirty;
    if (!settled) return;
    const fromDrawer = own.current;
    own.current = false;
    if (isOpen && !fromDrawer) close();
  });
  return () => {
    own.current = true;
  };
}
