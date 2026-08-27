# Change Control auto-reopens the passed gates it affects — implementation plan

> **Status: NOT STARTED.** Per the project owner's decision (2026-08-27), this plan is parked here until the SME team answers [`R5-Q20`](../rules/F1_Per_Gate_Open_Questions.md) (drafted in [`../rounds/DRAFT-our-questions-round5.md`](../rounds/DRAFT-our-questions-round5.md) as Question 20). Do not implement from this plan until that question is answered, or unless the project owner explicitly says to proceed on the current assumption anyway.

## Context

Right now, opening a Change Control record that affects an already-passed gate (e.g. Gate 5) has **zero effect** on that gate: the stored decision stays "Proceed", the gate still shows as passed, and the only visible trace is a warning tag on the Gate Flow row — which nobody may ever look at again, since work has moved on to a later gate. Closing the Change Control (recording its final disposition) is completely disconnected from the gate side too: `ChangeControl.tsx`'s save path has **zero validation** tying a change's status to any gate state.

The user's requested fix: opening a Change Control that names an already-passed gate should **automatically reopen that gate** (status → `Not Started`, same reset `backtrack()` already does), make it editable again through the *existing* single-current-gate mechanism (no new unlock condition needed — see below), restrict its next decision to **"Proceed with Conditions" only**, and **block the Change Control from reaching a closing status** until every gate it reopened has been re-decided. Confirmed via a follow-up question: this applies even if the Change Control is later Rejected/Cancelled, not just Completed — a change that reopened gates always requires someone to explicitly re-decide them (no silent auto-restore), matching this codebase's "no silent corrections" (B4) principle.

This is a genuinely new interpretation, not something the SME workbook specifies — logged as `R5-Q20` in `docs/rules/F1_Per_Gate_Open_Questions.md`, per this repo's standing working agreement (do not build ahead of a logged assumption without tagging it, and for this one specifically: do not build at all until answered).

## Key design finding from exploration (changes the shape of the work)

`currentGateIndex()` (`packages/shared/src/utils/gateProgress.ts:1301-1308`) already returns **the first not-yet-passed gate** — nothing else. So the moment we reset Gate 3/5's `status`/`decision` (exactly what `backtrack()` already does), `currentGateIndex` automatically snaps back to Gate 3, `isGateUnlocked` (`gateProgress.ts:1321-1323`, still `gateIndex(gateId) === currentGateIndex(project)`) automatically makes it — and only it — editable, and once Gate 3 re-passes the same mechanism automatically advances to Gate 5, then back to Gate 10. **No changes are needed to `isGateUnlocked`, `currentGateIndex`, or their 2 call sites** (`updateGate`/`updateGates` in `projects.service.ts`). The only genuinely new pieces are: (1) computing *which* passed gates to reset when a change opens, (2) restricting those specific gates' next decision to PwC only, and (3) blocking the Change Control's own closing transition until they're resolved.

## Scope: discrete gates, not a range

The user's own example names Gate 3 **and** 5, not "3 through 5" — unlike `backtrack()`/`createFormulaVersion()`, which reset a contiguous index range (`fromIdx..toIdx` inclusive) and would incorrectly nuke Gate 4's untouched data too. This feature computes gates to reopen as **`CHANGE_TRIGGERS[triggerId].gates` (or every gate if `['ALL']`) intersected with gates that are currently passed** — a discrete set, mirroring how the existing F9 soft-lock (`openChangeGateNumbers`, `projects.service.ts:2229-2246`) already reads `trigger.gates`, just applied backward (already-passed) instead of forward (not-yet-decided).

## Data model changes

New migration `apps/api/prisma/migrations/<timestamp>_change_control_gate_reopen/migration.sql`:

1. **`GateRecord.reopenedByChangeId String?`** (+ optional relation to `ChangeRecord`) — which open Change Control most recently reopened this gate; drives the PwC-only restriction; cleared to `null` the moment the gate genuinely re-passes (nobody can silently re-touch it after that anyway, since `isGateUnlocked` re-locks it once it's no longer the current gate).
2. **`ChangeRecord.reopenedGateIds String[] @default([])`** — the exact gate ids this record reopened, computed and snapshotted **once**, server-side, when the record is first created open-with-a-trigger. This is what the closing-transition guard checks against (`isGatePassed` on each id) — independent of `reopenedByChangeId`'s current value, so it stays correct even if two open changes happen to target the same gate concurrently.
3. **`BacktrackEvent.source String @default('backtrack')`** (`'backtrack' | 'formula-version' | 'change-control'`) **+ `changeRecordId String?`** (nullable relation) — extends the existing generic reopen ledger (already shared by `backtrack()` and `createFormulaVersion()`, confirmed in exploration) to a third source, so the Gate Flow "History" modal shows this reopening too, consistent with the other two.

Mirrors the existing migration convention (see `20260826120000_register_row_signatures`): one `migration.sql`, a doc-comment block citing the date/reason before the DDL.

## Server-side changes — `apps/api/src/projects/projects.service.ts`

**1. Extract a shared private helper**, `reopenGates(tx, projectId, gateIds, affectedPhases, source, changeRecordId, initiatedBy, reason)`, from the near-duplicated logic already in `backtrack()` (lines ~2387-2508) and `createFormulaVersion()`'s Major-change branch (lines ~1917-2060): reset `GateRecord.status/decision` for `gateIds`, clear the **full** SignOff field set for every affected phase (`name/initials/date/decision/comments/signedByUserId/signedAt/roleAtSigning/recordVersion/signatureImage/signatureVerifiedAt` — note `backtrack()` today is missing the last two fields per exploration; fix that as part of this extraction), snapshot into one `BacktrackEvent` row (now carrying `source`/`changeRecordId`), bump version, write one audit row. All three call sites (`backtrack`, `createFormulaVersion`, and the new change-control path) call this one helper instead of each hand-rolling it.

**2. `setChanges` (`projects.service.ts:2108-2153`)** — currently a blind `deleteMany` + `createMany` with zero validation. Change to:
   - Fetch existing rows (`tx.changeRecord.findMany({ where: { projectId: id } })`) **before** deleting, keyed by `changeId`.
   - For each incoming record that is newly open-with-a-trigger and unprocessed (`reopenedGateIds` empty on the existing row, or no existing row at all): compute `gatesToReopen = intersect(passed gates, getChangeTrigger(triggerId).gates)`; if non-empty, call `reopenGates(...)`, set `reopenedByChangeId` on each of those `GateRecord`s, and stamp `reopenedGateIds` on the record being written (server-computed — never trust a client-supplied value for this field).
   - For each incoming record whose status is **transitioning from open to a `CHANGE_CLOSED_STATUSES` value** (`Completed`/`Rejected`/`Cancelled`/`Superseded`, compared against the *existing* row's status): check every id in that row's `reopenedGateIds` via `isGatePassed(project, id)`; if any is still not passed, `throw new BadRequestException` naming the unresolved gates. This applies uniformly to all 4 terminal statuses per the confirmed follow-up answer — Rejected/Cancelled still requires someone to explicitly re-decide the reopened gates, never an automatic restore.

**3. `resolveDecision` (`projects.service.ts:2161-2227`)** — add a new branch, structurally identical to the existing F9 branch, but keyed off `existing.reopenedByChangeId` rather than `openChangeGateNumbers`, and checked for **both** `Proceed` and `Proceed with Conditions` requests (F9 only intercepts `Proceed`; this one must reject plain `Proceed` while allowing `Proceed with Conditions`, which is already the top-level filter's only two live branches). Implement as a new shared pure function `changeReopenBlocksDecision(gate: GateRecord, requested: GateDecision)` in `packages/shared/src/utils/gateProgress.ts` (same shape as `gapBlocksDecision`, imported by both the API and `GateFlowTable.tsx` — "the two cannot drift" pattern already used for gap-blocking) — `null` when `requested === 'Proceed with Conditions'` or `!gate.reopenedByChangeId`, else a rejection reason.

**4. Clear `reopenedByChangeId` on re-pass** — in `updateGate`/`updateGates`, right after `resolveDecision` returns the final decision: if the merged record now satisfies `isGatePassed`-equivalent conditions (`status === 'Complete' && decision is a passing decision && gateBlockers(...).length === 0`), write `reopenedByChangeId: null` alongside the rest of the patch.

## Shared package — `packages/shared/src/utils/gateProgress.ts` / types

- `changeReopenBlocksDecision(gate, requested)` — new pure function, described above.
- `GateRecord` type (`packages/shared/src/types/index.ts:177-201`) gains `reopenedByChangeId?: string`.
- `ChangeRecord` type (`packages/shared/src/types/index.ts:663-721`) gains `reopenedGateIds?: string[]`.
- `BacktrackEvent` type gains `source` and `changeRecordId`.

## Frontend changes

**`apps/web/src/components/GateFlowTable.tsx`**:
- Fold the new check into the existing `saveInvalidReason` derivation (lines ~208-236), the same way `gapVerdict` already is — so a reopened gate's row shows the red "cannot save" banner + disabled Save button with a clear message when the draft decision is plain "Proceed", consistent with how gap-blocking already behaves (leave the dropdown option selectable; disable Save with an explanation, per the established 2026-07-23 UX decision — don't silently disable options).
- Add a badge next to the gate number reusing the existing `WarningFilled` + `Tooltip` pattern (lines ~392-401, same spot as the F9 icon) — distinct tooltip text: `Reopened by Change Control ${changeId} — only "Proceed with Conditions" can be recorded until it closes.`
- Extend the "History" modal's Backtrack-events table with a `source` badge (Backtrack / Formula version / Change control) so a CC-triggered reopen is distinguishable from a manual Backtrack, and show the linked `changeId` when `source === 'change-control'`.

**`apps/web/src/pages/ChangeControl.tsx` / `apps/web/src/components/ChangeDispositionBlock.tsx`**: the real guard is server-side (per this app's "server-side validation is the sole authoritative enforcement" principle already documented in `BACKEND_PLAN.md`), but add a client-side warning in `ChangeDispositionBlock` — when `change.reopenedGateIds` contains a gate that isn't currently passed, show it in the same warning-banner style already used for `missingDispositionFields`, so the user sees why Save will be rejected before they try.

## Documentation

- `docs/rules/F1_Per_Gate_Open_Questions.md` / `docs/rounds/DRAFT-our-questions-round5.md` — `R5-Q20` / Question 20 already recorded (2026-08-27).
- Tag the code: `[ASSUMPTION: R5-Q20]` at the `reopenGates` call site in `setChanges` and at `changeReopenBlocksDecision`'s definition, once built.
- Update `CLAUDE.md` with a dated note describing the feature, following its existing changelog-style convention.

## Verification (once built)

1. `npm run verify:readiness` (TAG sweep must find `R5-Q20` tagged) and `npm run verify:scaffold` — both must pass clean.
2. `npx tsc --noEmit -p apps/web/tsconfig.app.json` and `npm run build -w @mbc360/shared` — typecheck the new fields/functions.
3. `npm run db:migrate -w @mbc360/api` against dev Postgres, confirm the new columns exist.
4. Manual end-to-end walkthrough on a scratch/dev project (never the shared dev DB without cleanup): advance a project to Gate 10 with Gates 3 and 5 already Proceed/PwC → open a Change Control with a trigger whose `gates` includes `'03'` and `'05'` (confirm an existing trigger's exact `gates` list first, or combine two triggers) → confirm Gates 3 and 5 flip to `Not Started` and Gate 3 becomes the new current/editable gate, Gate 10's own data is untouched → try recording plain "Proceed" on Gate 3, confirm the API rejects it and the UI shows the disabled-Save banner → record "Proceed with Conditions", confirm it succeeds and `reopenedByChangeId` clears → repeat for Gate 5 → attempt to close the Change Control (any of the 4 terminal statuses) before both are resolved, confirm 400 rejection → after both resolved, confirm the close succeeds → check the History modal shows the reopen event with `source: 'change-control'` and the linked change id. Clean up the test project/change afterward.
