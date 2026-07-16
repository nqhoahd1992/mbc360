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

The business process is **4 Phases containing 12 Gates (SG01–SG12)**, plus cross-cutting Change Control. Phase/Gate metadata (owners, purpose, key outputs) lives in `src/config/gates.ts` (`PHASES`, `GATES`, `EIGHT_ANGLES`, status/decision enum arrays). Gate progression rules live in `src/utils/gateProgress.ts` and implement the **confirmed business rules** in `docs/Business_Rules_Confirmation_{EN,VN}.md` (rule IDs like B1/B3/C1 below refer to that document — read it before changing any rule):

- A gate is **passed** (B1) only when `status === 'Complete'`, a positive `decision` (`Proceed` / `Proceed with Conditions`) is recorded, AND `gateBlockers()` is empty — open next actions block a plain `Proceed` (allowed to stay open only under `Proceed with Conditions`, B2), and the Skincare-for-Two safety screen hard-blocks SG07 when the Gate 02 target users include Pregnancy/Breastfeeding/Postpartum (C1). A `Gap` status prevents a normal `Proceed` (enforced in both `GateFlowTable` and the store's `setGate`).
- A **phase** is complete (B3) only per `phaseCompletionChecklist`: all gates passed + key gate checks done (or N/A **with justification** in notes) + all 8 angles covered (or justified N/A) + next actions closed (unless Proceed with Conditions) + all three sign-off roles signed. `SignOffBlock` stays locked until `canSignOff` is true.
- Gates unlock **strictly in order** — `isGateUnlocked` / `currentGateIndex` compute the single gate currently open for work.
- `backtrackGate` (B4, "no silent corrections") reopens a gate range and invalidates affected approvals but **never deletes**: pre-backtrack gate records and sign-offs are snapshotted into `ProjectData.backtrackEvents` (shown on Project Overview). `createFormulaVersion` (A2) reuses this for Major formula changes: bumps `formulaVersion`, reopens SG04–SG09, invalidates Phase 2–3 approvals and appends to the Formulation Change Register.
- Gates 10–12 are additionally tracked **per market** in `ProjectData.marketTracks` (A1); a market's launch approval is hard-blocked until its PIF status is Approved (C5) — enforced in `setMarketTrack` and `MarketTrackingCard`.
- The Study/Human Trial approval trail (C2) is a dedicated 3-role workflow (`ProjectData.studyApprovals`, `StudyApprovalCard` on the Study Protocol register); the Independent Reviewer must not share the Study Author's department (enforced in `setStudyApproval` and the UI).

When changing gate/phase logic, `gateProgress.ts` is the single place that encodes these rules — pages/components only call its exported helpers (`gateState`, `phaseProgress`, `gateBlockers`, `phaseCompletionChecklist`, etc.), they don't re-derive pass/lock state themselves.

### RBAC simulation & integrations

- **RBAC (A4, demo simulation):** the header's "View as" selector (`viewRole` in the store) stands in for the logged-in user's role. `src/utils/roles.ts` derives authorization from each gate's `primaryOwner` / phase `department` by keyword match — gate decisions, the phase "Approved by" row and market-track approvals are restricted; evidence fields stay open to contributors. The real role matrix / SSO source is follow-up **F6** — replace `roles.ts` when confirmed.
- **Integrations (A3):** `/integrations` page + `src/integrations/cosmetri.ts`, a **mock** Cosmetri client mirroring `docs/swagger-init.json` (OAuth2 password grant → access/refresh tokens; formulas, raw materials incl. `supplier_name`, compliance with INCI/CAS). Cosmetri is strictly read-only; the Formula BOM can be imported from it (`CosmetriImportModal`). Data the API doesn't provide (supplier details beyond the name, SDS/CoA/TDS links) is entered manually. New raw materials go through the Power Apps "Create new raw material" change request (URL configurable on the Integrations page — currently a placeholder).
- **Ingredient screening (C3):** `src/utils/ingredientWatch.ts` auto-checks every Formula BOM line against the prohibited / PB-caution watch-lists — by **CAS number first** (exact; from the Cosmetri import), then INCI-name keywords. The per-group CAS mapping is a demo stand-in (follow-up F3).

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

- **Zustand store** (`src/store/useAppStore.ts`), persisted to `localStorage` (key `mbc360-demo-store`, versioned). All project mutations go through store actions (`setGate`, `setChecklistItem`, `setRegisterRow`, `addNextAction`, `setMarketTrack`, `createFormulaVersion`, etc.) that call an internal `updateProject(id, updater)` — never mutate `ProjectData` in place from a component. Some actions also **enforce rules** (Gap blocks Proceed; launch approval requires PIF Approved; independent reviewer ≠ author department) — keep UI guards and store guards in sync.
- The persist `migrate` function **re-seeds instead of migrating** on schema-breaking version bumps (see the v1→v3 comments) — because this is a demo, old localStorage data is disposable; bump `version` and update `migrate`'s comment when `ProjectData`'s shape changes incompatibly.
- `src/store/factory.ts` builds an empty `ProjectData` (and empty register rows) purely from the config files — so config is the single source of truth for what a brand-new project's forms look like.
- `src/data/seed.ts` provides the demo seed projects/changes.
- `src/types/index.ts` is the canonical data model (mirrors `docs/APP_PLAN.md` section 3, intended to translate ~1:1 to a future backend schema per that doc's section 7).

### Routing / shell

`src/App.tsx` — `HashRouter` with a persistent sidebar (`Shell`/`SideMenu`) that tracks the "active project" across global pages, plus per-project workspace nav (phase pages, BOM & Costing, Formulation Safety, Evidence Summary, Panel Feedback, Post-Market/CAPA, and register categories). Routes are all under `/projects/:projectId/...` except `/`, `/projects`, and `/change-control`.
