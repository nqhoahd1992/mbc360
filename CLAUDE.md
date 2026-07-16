# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

MBc360 is a Product Development & Quality "Phase-Gate" system, modeled 1:1 on a 55-sheet Excel workbook (`MBc360 Master Product Development System File.xlsx`, version "V18"). Workbook tabs are owner-prefixed (e.g. `ChiChu-Prohibited_Ingred`); each sheet carries a "REVIEW OWNER" header surfaced in the app via `reviewOwner` on phase/register configs. V18 added Phase 3 "Extended User-Safety Compartments" (Pregnancy/Breastfeeding/Infant/Swimmer), the Released Label Control register (3 blocks) and system-reference sheets (Template_Index, Requirements, MBC360 FEEDBACK). See `docs/APP_PLAN.md` (Vietnamese) for the full source-of-truth spec — business rules, data model, screen list — `docs/Business_Rules_Confirmation_{EN,VN}.md` for confirmed business-rule decisions, and `docs/BACKEND_PLAN.md` (Vietnamese) for the backend build plan.

The frontend started as a backend-less demo UI (state in localStorage) and still behaves that way; the production backend is being built per `docs/BACKEND_PLAN.md` (milestone M0 — monorepo + API skeleton + Docker packaging — is done).

## Monorepo layout (npm workspaces)

- `apps/web` — `@mbc360/web`: the React + Vite frontend (all the original demo code).
- `apps/api` — `@mbc360/api`: NestJS backend (skeleton: `/api/health`, `/api/meta/*`).
- `packages/shared` — `@mbc360/shared`: canonical types (`src/types`), workbook config (`src/config`), and the rule engines (`src/utils/gateProgress.ts`, `src/utils/ingredientWatch.ts`). **Both web and api must consume rules from here — never fork a copy.** Imported via subpaths: `@mbc360/shared/types`, `@mbc360/shared/config/gates`, `@mbc360/shared/utils/gateProgress`.

## Commands

All from the repo root:

```
npm run dev       # build shared once, then run shared (tsc -w) + api (:3000) + web (Vite HMR) concurrently
npm run build     # build shared -> api -> web (order matters: apps compile against shared's dist)
npm run lint      # oxlint across the whole repo
docker compose -f docker-compose.dev.yml up -d   # dev Postgres (apps are NOT containerized in dev)
```

Per-workspace: `npm run <script> -w @mbc360/web|@mbc360/api|@mbc360/shared`. If TypeScript can't resolve `@mbc360/shared/*`, build the shared package first (`npm run build -w @mbc360/shared`). The Vite dev server proxies `/api` → `localhost:3000` (same-origin, mirroring production nginx routing) — the frontend must always call relative `/api/...` URLs.

There is no test runner configured. Production packaging: `apps/{api,web}/Dockerfile` (build context = repo root) + `docker-compose.prod.yml`, fronted by the host nginx (`deploy/nginx.host.example.conf`).

## Language rule

All code — variable/function names, comments, strings, error messages, UI labels — must be **100% English**, matching the real workbook's dropdown/column names exactly (see "Config-driven" note below).

## Architecture

### Phase-Gate domain model

The business process is **4 Phases containing 12 Gates (SG01–SG12)**, plus cross-cutting Change Control. Phase/Gate metadata (owners, purpose, key outputs) lives in `packages/shared/src/config/gates.ts` (`PHASES`, `GATES`, `EIGHT_ANGLES`, status/decision enum arrays). Gate progression rules live in `packages/shared/src/utils/gateProgress.ts` and implement the **confirmed business rules** in `docs/Business_Rules_Confirmation_{EN,VN}.md` (rule IDs like B1/B3/C1 below refer to that document — read it before changing any rule):

- A gate is **passed** (B1) only when `status === 'Complete'`, a positive `decision` (`Proceed` / `Proceed with Conditions`) is recorded, AND `gateBlockers()` is empty — open next actions block a plain `Proceed` (allowed to stay open only under `Proceed with Conditions`, B2), and the Skincare-for-Two safety screen hard-blocks SG07 when the Gate 02 target users include Pregnancy/Breastfeeding/Postpartum (C1). A `Gap` status prevents a normal `Proceed` (enforced in both `GateFlowTable` and the store's `setGate`).
- A **phase** is complete (B3) only per `phaseCompletionChecklist`: all gates passed + key gate checks done (or N/A **with justification** in notes) + all 8 angles covered (or justified N/A) + next actions closed (unless Proceed with Conditions) + all three sign-off roles signed. `SignOffBlock` stays locked until `canSignOff` is true.
- Gates unlock **strictly in order** — `isGateUnlocked` / `currentGateIndex` compute the single gate currently open for work.
- `backtrackGate` (B4, "no silent corrections") reopens a gate range and invalidates affected approvals but **never deletes**: pre-backtrack gate records and sign-offs are snapshotted into `ProjectData.backtrackEvents` (shown on Project Overview). `createFormulaVersion` (A2) reuses this for Major formula changes: bumps `formulaVersion`, reopens SG04–SG09, invalidates Phase 2–3 approvals and appends to the Formulation Change Register.
- Gates 10–12 are additionally tracked **per market** in `ProjectData.marketTracks` (A1); a market's launch approval is hard-blocked until its PIF status is Approved (C5) — enforced in `setMarketTrack` and `MarketTrackingCard`.
- The Study/Human Trial approval trail (C2) is a dedicated 3-role workflow (`ProjectData.studyApprovals`, `StudyApprovalCard` on the Study Protocol register); the Independent Reviewer must not share the Study Author's department (enforced in `setStudyApproval` and the UI).

When changing gate/phase logic, `gateProgress.ts` is the single place that encodes these rules — pages/components only call its exported helpers (`gateState`, `phaseProgress`, `gateBlockers`, `phaseCompletionChecklist`, etc.), they don't re-derive pass/lock state themselves.

### RBAC simulation & integrations

- **RBAC (A4, demo simulation):** the header's "View as" selector (`viewRole` in the store) stands in for the logged-in user's role. `apps/web/src/utils/roles.ts` derives authorization from each gate's `primaryOwner` / phase `department` by keyword match — gate decisions, the phase "Approved by" row and market-track approvals are restricted; evidence fields stay open to contributors. The real role matrix / SSO source is follow-up **F6** — replace `roles.ts` when confirmed.
- **Integrations (A3):** `/integrations` page + `apps/web/src/integrations/cosmetri.ts`, a **mock** Cosmetri client mirroring `docs/swagger-init.json` (OAuth2 password grant → access/refresh tokens; formulas, raw materials incl. `supplier_name`, compliance with INCI/CAS). Cosmetri is strictly read-only; the Formula BOM can be imported from it (`CosmetriImportModal`). Data the API doesn't provide (supplier details beyond the name, SDS/CoA/TDS links) is entered manually. New raw materials go through the Power Apps "Create new raw material" change request (URL configurable on the Integrations page — currently a placeholder).
- **Ingredient screening (C3):** `packages/shared/src/utils/ingredientWatch.ts` auto-checks every Formula BOM line against the prohibited / PB-caution watch-lists — by **CAS number first** (exact; from the Cosmetri import), then INCI-name keywords. The per-group CAS mapping is a demo stand-in (follow-up F3).

### Status & pending work (as of 2026-07-16)

**Frontend:** all decisions confirmed by the subject-matter team are implemented (rules A1–A4, B1–B4, C1–C6; C7 unanswered). What remains is blocked on the open follow-up questions **F1–F12** in `docs/Business_Rules_Confirmation_{EN,VN}.md` — that document is the decision record; when a rule changes, update BOTH the code and that document (and keep its follow-up table free of code jargon: it is read by the research team).

**Backend:** being built per the milestone roadmap in `docs/BACKEND_PLAN.md` (M0–M6). Done: **M0** (2026-07-16) — monorepo (`apps/web`, `apps/api`, `packages/shared`), NestJS skeleton with `/api/health` + `/api/meta/*`, production Dockerfiles + `docker-compose.{dev,prod}.yml` (self-hosted, host nginx routes `/` and `/api`), CI workflow. **Next: M1** — Prisma schema (per BACKEND_PLAN section 4: current-state tables + append-only `audit_events`, `formula_versions` as its own entity, rule-config tables like `gate_requirements`), migrations, and a seeder ported from `apps/web/src/store/factory.ts`. After M1: M2 auth/RBAC (Entra ID), M3 core API + switch the frontend from localStorage to the API, M4 Cosmetri proxy, M5 advanced workflows, M6 ops/UAT. None of F1–F12 blocks starting; only F4 (needed before M5) and the e-signature part of F6 (before M6) are schedule-relevant.

Where each follow-up answer lands when it arrives:

| Follow-up | Wire the answer into |
|---|---|
| F1 — per-gate mandatory sign-offs/evidence (blocks B1/C7) | add conditions in `gateBlockers()` (`packages/shared/src/utils/gateProgress.ts`) |
| F2 — does "Infant 0+" trigger Skincare for Two | `SKINCARE_FOR_TWO_TRIGGERS` in `gateProgress.ts` |
| F3 — real CAS mapping + market restriction lists | replace the demo tables in `packages/shared/src/utils/ingredientWatch.ts` |
| F4 — Major version × launched markets, concurrent versions | `createFormulaVersion` in the store + the `marketTracks` model |
| F5 — Major vs Minor criteria | auto-classification in `FormulaVersionModal` / `createFormulaVersion` |
| F6 — real role matrix / SSO / e-signature | replace `apps/web/src/utils/roles.ts` (the whole "View as" simulation) |
| F7 — does Gap also block Proceed with Conditions | decision-option disabling in `GateFlowTable` + the `setGate` guard |
| F8 — who may close a Next Action; priority list | `NextActionsCard` + `NextAction` types |
| F9 — change soft-lock semantics ("open" statuses, acknowledgement) | `openChangesForGate` in `GateFlowTable` |
| F10 — non-ASEAN market checklists (EU CPSR, AU, US) | new `RegisterConfig` entries in `packages/shared/src/config/registers.ts` |
| F11 — published-info workflow states/roles per content type | `publishedInfoApproval` config + the violation warning in `RegisterHubPage` |
| F12(c) — Cosmetri compliance coverage of ASEAN/VN | informational (affects C5 checklist choice per market) |

Deferred until the production phase (not answerable by config):
- Swap the mock Cosmetri client (`apps/web/src/integrations/cosmetri.ts`) for real calls **through a backend proxy** (CORS + credentials; keep Cosmetri strictly read-only — never call its `PUT /raw-material/update`).
- Replace the Power Apps placeholder URL on the Integrations page when the real "Create new raw material" app link is available (stored in the settings, no code change needed).
- Real authentication/users (prerequisite for F6) and the backend per `docs/APP_PLAN.md` section 7.

### Config-driven pages, not hardcoded per-phase UI

Every phase sheet in the source Excel shares the same layout, so the app builds each phase page from **config + ~6 shared components** rather than one bespoke component per phase:

- `packages/shared/src/config/phases.ts` — `PHASE_CONFIGS` (keyed by phase 1-4): checklist sections, requirement-table rows, and key-gate-checks per phase, with option lists transcribed verbatim from the Excel.
- `packages/shared/src/config/registers.ts` — `REGISTER_CONFIGS` / `REGISTER_CATEGORIES`: ~30+ "evidence register" sheets (Supplier_RM_Evidence, Prohibited_Ingredients, PIF_Checklist_ASEAN, Formula_Change_Control, ...), each declared as a `RegisterConfig` (columns + `mode: 'register' | 'fixed'` + optional `fixedRows`). `mode: 'fixed'` = predefined reference rows the user annotates (status/evidence/notes editable, everything else `editable: false`); `mode: 'register'` = free-form rows the user adds/removes.
- `packages/shared/src/config/evidence.ts` — `EVIDENCE_AREAS` for the Evidence Summary status board.
- `apps/web/src/pages/PhasePage.tsx` renders one phase entirely from `PHASE_CONFIGS[phase]` using the shared components below.
- `apps/web/src/pages/RegisterHubPage.tsx` renders a register category entirely from `REGISTER_CATEGORIES` + `DynamicTable`.

**When adding a new phase section or evidence register, add/edit a config entry — do not hand-write a new page/table component** unless the shape genuinely doesn't fit the existing 6 shared blocks.

The 6 reusable blocks (`apps/web/src/components/`): `ProjectIdentificationCard`, `GateFlowTable`, `ChecklistSection`, `RequirementTable`, `GateChecksTable`, `EightAnglesTable` + `SignOffBlock`. `DynamicTable` is the generic renderer for `RegisterConfig`-driven register tables.

### State & data

- **Zustand store** (`apps/web/src/store/useAppStore.ts`), persisted to `localStorage` (key `mbc360-demo-store`, versioned). All project mutations go through store actions (`setGate`, `setChecklistItem`, `setRegisterRow`, `addNextAction`, `setMarketTrack`, `createFormulaVersion`, etc.) that call an internal `updateProject(id, updater)` — never mutate `ProjectData` in place from a component. Some actions also **enforce rules** (Gap blocks Proceed; launch approval requires PIF Approved; independent reviewer ≠ author department) — keep UI guards and store guards in sync.
- The persist `migrate` function **re-seeds instead of migrating** on schema-breaking version bumps (see the v1→v3 comments) — because this is a demo, old localStorage data is disposable; bump `version` and update `migrate`'s comment when `ProjectData`'s shape changes incompatibly.
- `apps/web/src/store/factory.ts` builds an empty `ProjectData` (and empty register rows) purely from the config files — so config is the single source of truth for what a brand-new project's forms look like.
- `apps/web/src/data/seed.ts` provides the demo seed projects/changes.
- `packages/shared/src/types/index.ts` is the canonical data model (mirrors `docs/APP_PLAN.md` section 3, intended to translate ~1:1 to a future backend schema per that doc's section 7).

### Routing / shell

`apps/web/src/App.tsx` — `HashRouter` with a persistent sidebar (`Shell`/`SideMenu`) that tracks the "active project" across global pages, plus per-project workspace nav (phase pages, BOM & Costing, Formulation Safety, Evidence Summary, Panel Feedback, Post-Market/CAPA, and register categories). Routes are all under `/projects/:projectId/...` except `/`, `/projects`, and `/change-control`.
