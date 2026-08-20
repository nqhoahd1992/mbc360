import { useEffect, useState } from 'react';

// The app's active users, for every "who owns this / who reviewed this" field —
// register columns typed `user`, the gate Owner, Next Action owner and verifier.
// Before 2026-08-11 each of those was free text, so the same person appeared as
// "Chris", "chris" and "Chris N." and nothing could be counted or filtered.
//
// Same source as the Create New Project reviewer pickers: GET /api/rbac/users,
// readable by any signed-in user, returning active users only. Deliberately NOT
// filtered by role — the 13 workbook review areas do not map onto the 17
// assignable roles, so a strict filter would leave fields empty (see the
// reviewers note in CLAUDE.md); the role rides along as a tag.
//
// Fetched once per page load and shared: this hook is mounted by every register
// table on screen, and one request for a list that changes rarely is enough.

export interface PickerUser {
  id: string;
  displayName: string;
  email?: string;
  roleName?: string | null;
}

export interface UserOption {
  value: string; // displayName — what the field stores
  label: string;
  roleName: string;
}

let cache: Promise<PickerUser[]> | null = null;

function loadUsers(): Promise<PickerUser[]> {
  cache ??= fetch('/api/rbac/users')
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => []);
  return cache;
}

// The same list, unmapped. Needed by the one field that must reference a real
// ACCOUNT rather than a name: a phase sign-off's nominated signer (D1). A
// displayName is good enough for "who owns this"; it is not good enough for
// "only this person may sign", where two people sharing a name would share a
// signature — so that field stores the user id and this hook supplies it.
export function usePickerUsers(): PickerUser[] {
  const [users, setUsers] = useState<PickerUser[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadUsers().then((list) => {
      if (!cancelled) setUsers(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return users;
}

export function useUserOptions(): UserOption[] {
  const users = usePickerUsers();

  // Deduped by displayName (the stored value) so antd Select has unique option
  // values; each option carries its role for the tag and for text search.
  return Array.from(new Map(users.map((u) => [u.displayName, u])).values()).map((u) => ({
    value: u.displayName,
    label: u.displayName,
    roleName: u.roleName ?? '—',
  }));
}
