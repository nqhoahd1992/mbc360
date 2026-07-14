# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

MBc360 is a **demo UI** (no backend) for a Product Development & Quality "Phase-Gate" system, modeled 1:1 on a 55-sheet Excel workbook (`MBc360 Master Product Development System File.xlsx`, version "V18"). Workbook tabs are owner-prefixed (e.g. `ChiChu-Prohibited_Ingred`); each sheet carries a "REVIEW OWNER" header surfaced in the app via `reviewOwner` on phase/register configs. V18 added Phase 3 "Extended User-Safety Compartments" (Pregnancy/Breastfeeding/Infant/Swimmer), the Released Label Control register (3 blocks) and system-reference sheets (Template_Index, Requirements, MBC360 FEEDBACK). See `docs/APP_PLAN.md` (Vietnamese) for the full source-of-truth spec — business rules, data model, screen list — and `docs/Business_Rules_Confirmation_{EN,VN}.md` for confirmed business-rule decisions.

## Commands

```
npm run dev       # start Vite dev server
npm run build     # tsc -b (project-references type check) && vite build
npm run lint      # oxlint
npm run preview   # preview production build
```

There is no test runner configured. There is no per-file lint/build command beyond the scripts above (oxlint runs on the whole project).

## Language rule

All code — variable/function names, comments, strings, error messages, UI labels — must be **100% English**, matching the real workbook's dropdown/column names exactly (see "Config-driven" note below).

## Architecture

### Phase-Gate domain model

The business process is **4 Phases containing 12 Gates (SG01–SG12)**, plus cross-cutting Change Control. Phase/Gate metadata (owners, purpose, key outputs) lives in `src/config/gates.ts` (`PHASES`, `GATES`, `EIGHT_ANGLES`, status/decision enum arrays). Gate progression rules live in `src/utils/gateProgress.ts`:

- A gate is **passed** only when `status === 'Complete'` AND a positive `decision` (`Proceed` / `Proceed with Conditions`) is recorded.
- A **phase** is complete only when all its gates are passed AND its `Approved by` sign-off is filled in.
- Gates unlock **strictly in order** — `isGateUnlocked` / `currentGateIndex` compute the single gate currently open for work.
- The only way to move backwards is `backtrackGate` (in `useAppStore`), which reopens a gate range for rework and un-approves any phase closure that falls inside that range. There is no forward "skip."

When changing gate/phase logic, `gateProgress.ts` is the single place that encodes these rules — pages/components only call its exported helpers (`gateState`, `phaseProgress`, `isPhaseApproved`, etc.), they don't re-derive pass/lock state themselves.

### Config-driven pages, not hardcoded per-phase UI

Every phase sheet in the source Excel shares the same layout, so the app builds each phase page from **config + ~6 shared components** rather than one bespoke component per phase:

- `src/config/phases.ts` — `PHASE_CONFIGS` (keyed by phase 1-4): checklist sections, requirement-table rows, and key-gate-checks per phase, with option lists transcribed verbatim from the Excel.
- `src/config/registers.ts` — `REGISTER_CONFIGS` / `REGISTER_CATEGORIES`: ~30+ "evidence register" sheets (Supplier_RM_Evidence, Prohibited_Ingredients, PIF_Checklist_ASEAN, Formula_Change_Control, ...), each declared as a `RegisterConfig` (columns + `mode: 'register' | 'fixed'` + optional `fixedRows`). `mode: 'fixed'` = predefined reference rows the user annotates (status/evidence/notes editable, everything else `editable: false`); `mode: 'register'` = free-form rows the user adds/removes.
- `src/config/evidence.ts` — `EVIDENCE_AREAS` for the Evidence Summary status board.
- `src/pages/PhasePage.tsx` renders one phase entirely from `PHASE_CONFIGS[phase]` using the shared components below.
- `src/pages/RegisterHubPage.tsx` renders a register category entirely from `REGISTER_CATEGORIES` + `DynamicTable`.

**When adding a new phase section or evidence register, add/edit a config entry — do not hand-write a new page/table component** unless the shape genuinely doesn't fit the existing 6 shared blocks.

The 6 reusable blocks (`src/components/`): `ProjectIdentificationCard`, `GateFlowTable`, `ChecklistSection`, `RequirementTable`, `GateChecksTable`, `EightAnglesTable` + `SignOffBlock`. `DynamicTable` is the generic renderer for `RegisterConfig`-driven register tables.

### State & data

- **Zustand store** (`src/store/useAppStore.ts`), persisted to `localStorage` (key `mbc360-demo-store`, versioned). All project mutations go through store actions (`setGate`, `setChecklistItem`, `setRegisterRow`, etc.) that call an internal `updateProject(id, updater)` — never mutate `ProjectData` in place from a component.
- The persist `migrate` function **re-seeds instead of migrating** on schema-breaking version bumps (see the v1→v3 comments) — because this is a demo, old localStorage data is disposable; bump `version` and update `migrate`'s comment when `ProjectData`'s shape changes incompatibly.
- `src/store/factory.ts` builds an empty `ProjectData` (and empty register rows) purely from the config files — so config is the single source of truth for what a brand-new project's forms look like.
- `src/data/seed.ts` provides the demo seed projects/changes.
- `src/types/index.ts` is the canonical data model (mirrors `docs/APP_PLAN.md` section 3, intended to translate ~1:1 to a future backend schema per that doc's section 7).

### Routing / shell

`src/App.tsx` — `HashRouter` with a persistent sidebar (`Shell`/`SideMenu`) that tracks the "active project" across global pages, plus per-project workspace nav (phase pages, BOM & Costing, Formulation Safety, Evidence Summary, Panel Feedback, Post-Market/CAPA, and register categories). Routes are all under `/projects/:projectId/...` except `/`, `/projects`, and `/change-control`.
