import { useEffect, useId, useState } from 'react';
import { setSectionDirty } from './unsavedRegistry';

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
  // Skip the JSON.stringify comparison entirely while dirty (2026-08-26,
  // perf fix): the result is only ever ACTED on when `!dirty` (the resync
  // below), so computing it while the user has an in-progress edit was pure
  // waste — and, worse, `committed` is often the WHOLE table's data, so this
  // ran on every keystroke of every controlled input using this hook,
  // stringifying the full register on every character typed. That is exactly
  // the per-keystroke-cost problem this hook exists to eliminate; it had just
  // moved from "stringify + localStorage.setItem" to "stringify alone".
  // `committedJson` is simply left stale until dirty clears — harmless, since
  // nothing reads it while dirty, and the next `!dirty` render re-checks it
  // against whatever `committed` has become by then (after Save, that's the
  // very value just written, so this immediately resolves to a no-op resync).
  if (!dirty) {
    const nextCommittedJson = JSON.stringify(committed);
    if (nextCommittedJson !== committedJson) {
      setCommittedJson(nextCommittedJson);
      setDraft(committed);
    }
  }

  const update = (updater: T | ((prev: T) => T)) => {
    setDraft((prev) => (typeof updater === 'function' ? (updater as (prev: T) => T)(prev) : updater));
    setDirty(true);
  };

  // Publish this section's dirty state so UnsavedChangesGuard can warn before
  // a navigation or reload throws the edits away. Keyed by the component's own
  // useId, so several tables on one page are counted separately, and cleared
  // on unmount — otherwise a section left dirty and then unmounted would warn
  // about edits that no longer exist anywhere.
  const id = useId();
  useEffect(() => {
    setSectionDirty(id, dirty);
    return () => setSectionDirty(id, false);
  }, [id, dirty]);

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
