import { useEffect, useRef } from 'react';

// One detail drawer per screen (2026-10-02, user-reported overlap). Every
// drawer in the register concept — DynamicTable, RecordList, ChecklistSection,
// WatchlistRegister — owns its own open state, so opening one while another
// was open stacked two panels on top of each other. Each drawer calls this hook
// with whether it is open and how to close it: opening a drawer makes it the
// owner, and every other open drawer closes itself.
let owner: symbol | null = null;
const listeners = new Set<() => void>();

export function useExclusiveDrawer(isOpen: boolean, close: () => void) {
  const id = useRef(Symbol('drawer'));
  const isOpenRef = useRef(isOpen);
  const closeRef = useRef(close);
  isOpenRef.current = isOpen;
  closeRef.current = close;

  useEffect(() => {
    const onOwnerChange = () => {
      if (owner !== id.current && isOpenRef.current) closeRef.current();
    };
    listeners.add(onOwnerChange);
    return () => {
      listeners.delete(onOwnerChange);
      if (owner === id.current) owner = null;
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      owner = id.current;
      for (const listener of listeners) listener();
    } else if (owner === id.current) {
      owner = null;
    }
  }, [isOpen]);
}
