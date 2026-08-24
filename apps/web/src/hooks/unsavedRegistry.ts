import { useSyncExternalStore } from 'react';

// A module-level count of table sections holding unsaved edits.
//
// Every editable table in this app is a local draft committed by an explicit
// Save (see useDraft.ts) — which means a single click on the always-visible
// sidebar used to throw the work away with no warning at all. `useDraft`
// registers itself here while dirty, and UnsavedChangesGuard reads the count
// to intercept navigation and page unload.
//
// Deliberately NOT part of useAppStore: that store is persisted, and "am I
// mid-edit" is per-tab, per-mount transient state that must never be written
// to localStorage or survive a reload.
const dirtyIds = new Set<string>();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function setSectionDirty(id: string, dirty: boolean): void {
  const had = dirtyIds.has(id);
  if (dirty === had) return;
  if (dirty) dirtyIds.add(id);
  else dirtyIds.delete(id);
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Returns a NUMBER, not a derived object — a snapshot compared by reference
// would re-render forever (the same trap documented in CLAUDE.md for zustand
// selectors).
const getSnapshot = () => dirtyIds.size;

export function useUnsavedCount(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
