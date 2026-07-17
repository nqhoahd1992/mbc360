import { useState } from 'react';

// Local "draft" copy of a table/section's data that the user edits freely —
// typing or picking a value only updates local React state, never the global
// store — until `save()` commits it in one write. Fixes the per-keystroke lag
// from writing the whole persisted store (JSON.stringify + localStorage) on
// every character typed or every cell changed in a large table.
export function useDraft<T>(committed: T) {
  const [draft, setDraft] = useState<T>(committed);
  const [dirty, setDirty] = useState(false);
  // "Adjusting state during render" (react.dev/reference/react/useState) so
  // the resync check runs on every render without an effect. It must be
  // compared by VALUE, not reference: many callers derive `committed` inline
  // (`.filter()`, `.map()`, `?? []`), which allocates a new array/object every
  // render even when its contents haven't changed — comparing by reference
  // would resync (and thus setState) on every render, and since resyncing
  // triggers a re-render that re-derives another new reference, that's an
  // infinite update loop, not just a wasted one.
  const [committedJson, setCommittedJson] = useState(() => JSON.stringify(committed));
  const nextCommittedJson = JSON.stringify(committed);
  if (nextCommittedJson !== committedJson) {
    setCommittedJson(nextCommittedJson);
    // Re-sync from the committed value only when there's no pending local
    // edit - otherwise an unrelated store update (e.g. a Cosmetri import,
    // another tab) would silently clobber in-progress typing.
    if (!dirty) setDraft(committed);
  }

  const update = (updater: T | ((prev: T) => T)) => {
    setDraft((prev) => (typeof updater === 'function' ? (updater as (prev: T) => T)(prev) : updater));
    setDirty(true);
  };

  const markSaved = () => setDirty(false);
  const discard = () => {
    setDraft(committed);
    setDirty(false);
  };

  return { draft, dirty, update, markSaved, discard };
}

// Shared helper for the common case: a draft is an array of rows and a cell
// edit patches one row by index.
export function patchArray<T>(arr: T[], index: number, patch: Partial<T>): T[] {
  return arr.map((item, i) => (i === index ? { ...item, ...patch } : item));
}
