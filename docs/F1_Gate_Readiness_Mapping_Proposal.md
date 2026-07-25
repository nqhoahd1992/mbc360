# F1/C7 — Per-Gate Evidence & Sign-off: Register Mapping Proposal

**Date:** 2026-07-22
**Purpose:** `Business_Rules_Followup_Round2.md` (§B, "Per-gate evidence classification") committed to sending the subject-matter team a proposed mapping of each F1/C7 per-gate item (see `Business_Rules_Confirmation_EN.md`, Appendix) to a concrete register/field in the app, for their confirmation. This document is that proposal — **nothing here is implemented yet**; it is a draft for the team to review, correct and confirm before `packages/shared/src/config/gateReadiness.ts` is updated to hard-block on it.

**How to read this table:**
- **Item** — transcribed verbatim from the F1 Appendix.
- **Tier** — as already confirmed (Mandatory / Conditional / Supporting).
- **Proposed source** — the concrete register (`sheetName` from `registers.ts`), phase checklist item, or data field this item should read.
- **Proposed check** — how the engine would evaluate it automatically. `manual` means we could not find a clean 1:1 data source and are asking the team to tell us what should drive it.
- **Needs confirmation** — the specific question for the team, where the mapping is not obvious or the trigger condition needs a decision.

Once confirmed, each row becomes one `ReadinessRequirement` entry in `gateReadiness.ts` with a real `check` (replacing `{ kind: 'manual' }`).

---

## Gate 1 — Opportunity & Request

**Status (2026-07-22): implemented for 3 of 5 items — see `SG01` in `gateReadiness.ts`.** The original proposed sources below (Project Identification card fields) turned out not to exist once checked against `ProjectIdentity`/`ChecklistItem` in `packages/shared/src/types/index.ts` and `PHASE_1` in `config/phases.ts`; the real, wired sources are the **Key Gate Check rows** (`ProjectData.gateChecks`, seeded from `PHASE_1.keyGateChecks`) — a mechanism that already existed and already had a done/Y-N-NA/justification model, just not yet applied per-gate (only at phase level).

| Item | Tier | Actual source | Check | Status |
|---|---|---|---|---|
| Product request record | Mandatory | `gateChecks` row: "Product request, opportunity and requester captured" (gate '01') | `gateCheckDone` | ✅ Implemented |
| Project owner | Mandatory | `ProjectIdentity.projectLead` — **required** on the Create New Project form, so a project can never exist without one (2026-07-25 fix: previously reused the "Initial project record opened and owner assigned" Key Gate Check row, which made the user re-confirm something project creation already guarantees) | `identityFieldFilled` | ✅ Implemented (always satisfied) |
| Request source | Mandatory | Same row as "Product request record" — no separate signal exists | `gateCheckDone` | ✅ Implemented (shared evidence) |
| Initial product scope | Mandatory | *(none — no field matches)* | `manual` | ⛔ Open question — see `F1_Per_Gate_Open_Questions.md` Q1 |
| Initial target market and user | Mandatory | *(none — only Gate-02-tagged checklist data exists)* | `manual` | ⛔ Open question — see `F1_Per_Gate_Open_Questions.md` Q2 |

## Gate 2 — Target User & Brief

**Status (2026-07-22): implemented for 3 of 6 F1 items, plus 1 extra (non-F1) item — see `SG02` in `gateReadiness.ts`.** As with Gate 1, the primary wired source is the Key Gate Check rows (`ProjectData.gateChecks`, gate '02'). The richer per-item checklist sections (`targetArea`/`targetUsers`/`targetMarkets`) don't participate in **any** existing gating rule today (`project.checklists` is read only once in the whole engine, for the Skincare-for-Two trigger), so a full "section is complete" definition would be inventing a new rule — but a **minimum-bar** guard doesn't require that invention: a new `checklistHasSelection` check requires at least one row with `status === 'Y'` in the relevant section, added as an **additional** Mandatory requirement alongside (not replacing) each Key Gate Check item. This closes a real gap the Key-Gate-Check-only approach left open: someone could tick the coarse Key Gate Check "done" without ever touching the detailed checklist underneath it.

| Item | Tier | Actual source | Check | Status |
|---|---|---|---|---|
| Approved development brief | Mandatory | *(none — no field represents "the brief" anywhere)* | `manual` | ⛔ Open question — see `F1_Per_Gate_Open_Questions.md` Q1 |
| Target user and life stage | Mandatory | `gateChecks` row: "Target user / life stage / use context selected" (gate '02') **+** ≥1 `targetUsers` row with status Y | `gateCheckDone` + `checklistHasSelection` | ✅ Implemented |
| Intended use and body area | Mandatory | Same Key Gate Check row as above **+** ≥1 `targetArea` row with status Y | `gateCheckDone` + `checklistHasSelection` | ✅ Implemented |
| Selected markets | Mandatory | `gateChecks` row: "Target markets and success criteria linked" (gate '02') **+** ≥1 `targetMarkets` row with status Y | `gateCheckDone` + `checklistHasSelection` | ✅ Implemented |
| Vulnerable-user flags | Mandatory | *(ambiguous — would otherwise reuse "Target user and life stage" a 3rd time)* | `manual` | ⛔ Open question — see `F1_Per_Gate_Open_Questions.md` Q2 |
| Project requirements and exclusions | Mandatory | *(none — `PHASE_1.requirementSections` is empty, unlike Phases 2-4)* | `manual` | ⛔ Open question — see `F1_Per_Gate_Open_Questions.md` Q3 |
| *(not an F1 item)* Commercial planning inputs entered or marked N/A | Mandatory | `gateChecks` row (gate '02') — same generalizable rule as Gate 1's "constraints" row | `gateCheckDone` | ✅ Implemented |

## Gate 3 — Product Concept & Claims

**Status (2026-07-22): implemented for 4 of 6 F1 items, plus 1 extra (non-F1) item — see `SG03` in `gateReadiness.ts`.** The original guesses below (`Mechanism_Claims_Map`, `Product_Development_Report`) turned out to be the wrong layer — those registers hold the *deeper* claims-evidence work done later (Gate 10), not Phase 1's initial concept/claims capture, which — like Gates 1-2 — is driven by Key Gate Checks (gate '03') plus the `claimAreas`/`evidenceRoute` checklist sections.

| Item | Tier | Actual source | Check | Status |
|---|---|---|---|---|
| Product concept | Mandatory | `gateChecks` row: "Concept direction and benchmark/competitor review recorded" (gate '03') | `gateCheckDone` | ✅ Implemented |
| Proposed claims list | Mandatory | `gateChecks` row: "Claim/benefit areas selected and evidence route identified" **+** ≥1 `claimAreas` row with status Y | `gateCheckDone` + `checklistHasSelection` | ✅ Implemented |
| Preliminary claim classification | Mandatory | *(none — `claimAreas` has no classification/risk-tier attribute)* | `manual` | ⛔ Open question — see `F1_Per_Gate_Open_Questions.md` Q1 |
| Evidence requirements identified for each proposed claim | Mandatory | Same Key Gate Check as "Proposed claims list" **+** ≥1 `evidenceRoute` row with status Y | `gateCheckDone` + `checklistHasSelection` | ✅ Implemented |
| Competitor or benchmark review where applicable | Conditional | Same Key Gate Check as "Product concept" — its own wording already bundles benchmark/competitor review | `gateCheckDone` | ✅ Implemented (never hard-blocks — Conditional) |
| Regulatory review of high-risk or borderline claims | Conditional | *(none — depends on an undefined "high-risk/borderline claim" flag, same gap as Round 2 §A1)* | `manual` | ⛔ Open question — see `F1_Per_Gate_Open_Questions.md` Q2 (low priority — Conditional, never hard-blocks) |
| *(not an F1 item)* Gate 1-3 decision and open actions recorded | Mandatory | `gateChecks` row (gate '03') — same generalizable rule as Gates 1-2's extra rows | `gateCheckDone` | ✅ Implemented |

## Gate 4 — Ingredient & RM Screening

**Status (2026-07-22): implemented for 6 of 7 F1 items — see `SG04` in `gateReadiness.ts`.** Same "coarse Key Gate Check + detail guard" pattern as Gates 1-3. **Correction (same day):** the detail guards were originally wired against Formula BOM (`bomHasLines`/`bomIdentityComplete`), but `registers.ts` tags Formula_BOM `linkedGate: '05_Formula_BOM_Costing'` ("Formula_BOM must be current") — the locked recipe belongs to **Gate 5**, not Gate 4. Every `Prohibited_Ingredients` row is tagged `04_Ingredient_Screening` instead, confirming Gate 4 is the candidate-ingredient screening stage, before the formula is locked. Moved the BOM checks to `sg05-composition` and rewired Gate 4's identity check to `Supplier_RM_Evidence` (the register that actually owns per-ingredient identity — `rmCode`/`inciName` columns — at this stage) via a new generalized `registerColumnFilled` check kind.

| Item | Tier | Actual source | Check | Status |
|---|---|---|---|---|
| Formula ingredients or intended ingredient set | Mandatory | `gateChecks` row "Ingredient functions identified and RM document pack requested" | `gateCheckDone` (no separate detail check — would duplicate the row below) | ✅ Implemented |
| Ingredient identity and Cosmetri reference where available | Mandatory | Same Key Gate Check **+** every `Supplier_RM_Evidence` row has `inciName` filled (Cosmetri ref not required — F14) | `gateCheckDone` + `registerColumnFilled` | ✅ Implemented |
| Supplier and raw-material evidence status | Mandatory | `gateChecks` row "Ingredient evidence / registry links added or gap actions opened" **+** ≥1 `Supplier_RM_Evidence` row **+** ≥1 `Raw Material Document Pack` selection (`rmDocPack` checklist, phases.ts gate '04' — initially missed, added 2026-07-22) | `gateCheckDone` + `registerHasRows` + `checklistHasSelection` | ✅ Implemented |
| Prohibited and restricted ingredient screen | Mandatory | `gateChecks` row "Restrictions, exclusions and supplier risks screened" | `gateCheckDone` | ✅ Implemented |
| **No unresolved "Prohibited – remove"** | Mandatory | `Prohibited_Ingredients`, `productStatus` | **already implemented** (`sg04-no-remove`) | ✅ Implemented |
| Pregnancy/breastfeeding caution screen | Conditional (`skincareForTwo`) | `PB_Caution_Limits`, `productStatus` ∉ {Needs Safety Review, Needs Regulatory Review} | `registerNoBadRows`, trigger = skincareForTwo | ✅ Implemented |
| Allergen, impurity and contaminant review where relevant | Conditional | *(none — `allergenStatement`/`impurities` are free text, no status enum to check)* | `manual` | ⛔ Open question — see `F1_Per_Gate_Open_Questions.md` (low priority — Conditional, never hard-blocks) |

## Gate 5 — Formula Design & Development

**Status (2026-07-22): implemented for 6 of 8 F1 items, plus 1 extra (non-F1) item — see `SG05` in `gateReadiness.ts`.** The original guesses below (`Formulation_Safety`, `Potency_Process_Control`, `Micro_PET_Evidence`, `Stability_Release`, `Mechanism_Claims_Map`) turned out to be the wrong layer — PHASE_2's `requirementSections` (`formulationDesign`, `efficacyProcess` — `phases.ts`) already have fixed rows matching most of these items almost verbatim (Target pH / pH range, Compatibility / use-with constraints, Mechanism-to-formula route, Scale-up or manufacturing notes), each with a real `status: WorkStatus` field — a new `requirementDone` check (satisfied when that row's status is `'Completed'`) reads them directly. Same "coarse Key Gate Check + detail guard" pattern as prior gates.

| Item | Tier | Actual source | Check | Status |
|---|---|---|---|---|
| Current formula version | Mandatory | `gateChecks` row "Formula route, BOM and costing started" (`project.formulaVersion` itself is always non-empty from creation, not a meaningful signal) | `gateCheckDone` | ✅ Implemented |
| Formula composition or controlled Cosmetri formula reference | Mandatory | Formula BOM — has ≥1 line **+** every line has an identity (Cosmetri ref not required — F14) | `bomHasLines` + `bomIdentityComplete` | ✅ Implemented |
| Target pH and acceptable pH range | Mandatory | `gateChecks` row "Sensory target, pH/process limits and compatibility risks logged" **+** `requirements.formulationDesign` row "Target pH / pH range" = Completed | `gateCheckDone` + `requirementDone` | ✅ Implemented |
| Manufacturing/process requirements affecting product function | Mandatory | Same Key Gate Check **+** `requirements.formulationDesign` row "Scale-up or manufacturing notes" = Completed | `gateCheckDone` + `requirementDone` | ✅ Implemented |
| Preservative strategy where applicable | Conditional | *(none — no requirement row is preservative-specific, and the "where applicable" trigger is undefined)* | `manual` | ⛔ Open question — see `F1_Per_Gate_Open_Questions.md` (low priority — Conditional, never hard-blocks) |
| Formula compatibility assessment | Mandatory | Same Key Gate Check **+** `requirements.formulationDesign` row "Compatibility / use-with constraints" = Completed | `gateCheckDone` + `requirementDone` | ✅ Implemented |
| Initial efficacy rationale and mechanism-of-action mapping | Mandatory | `requirements.efficacyProcess` row "Mechanism-to-formula route" = Completed | `requirementDone` | ✅ Implemented |
| Costing or commercial feasibility status | Supporting | *(none — `CostingInputs` has no status field and is always pre-filled with non-blank defaults)* | `manual` | ⛔ Open question — low priority (Supporting, never hard-blocks) |
| *(not an F1 item)* Development decision recorded with evidence or conditions | Mandatory | `gateChecks` row (gate '05') — same generalizable rule as prior gates' extra rows | `gateCheckDone` | ✅ Implemented |

**Caveat noted in code:** `RequirementItem.status` (`WorkStatus`) has no Y/N/NA-style "not applicable, justified" escape the way `ChecklistItem`/`GateCheck` do — so `requirementDone` only hard-blocks on rows universally applicable at that gate (pH, compatibility, mechanism-to-formula, scale-up notes all qualify for any cosmetic formulation).

## Gate 6 — Packaging & Components

| Item | Tier | Proposed source | Proposed check | Needs confirmation |
|---|---|---|---|---|
| Proposed pack specification | Mandatory | `Packaging_Specs_Artwork` (packagingSpecsArtwork), `specLink` | no row blank | — |
| Packaging compatibility requirements | Mandatory | `Packaging_Specs_Artwork`, `compatibilityEvidence`/`migrationRisk` | no row blank | — |
| Label and artwork requirements | Mandatory | `Packaging_Specs_Artwork`, `artworkVersion` | no row blank | — |
| Component supplier status | Mandatory | `Packaging_Specs_Artwork`, `supplier` + `approval` | no row blank/unapproved | — |
| Market-specific pack requirements | Conditional | `Packaging_Specs_Artwork`, `market` column | manual (trigger = per-market, ties into `marketTracks`) | Confirm: conditional per selected market, i.e. active only for markets already in `marketTracks`? |
| Link to controlled packaging evidence | Mandatory | `Packaging_Specs_Artwork`, `evidenceLink` | no row blank | — |

## Gate 7 — Safety Review (SAFETY-CRITICAL HARD BLOCK)

| Item | Tier | Proposed source | Proposed check | Needs confirmation |
|---|---|---|---|---|
| Final formulation safety review completed | Mandatory | `Formulation_Safety` → Final Safety Sign-off (formulationSafetyFinalSignOff), row "Final safety release" | that fixed row's `status` = Completed | — |
| **Formula BOM reconciled to Cosmetri** | Mandatory | Formula BOM, `reconciled` flag | **already implemented** (`bomReconciled`) | — |
| **Prohibited ingredient screen closed** | Mandatory | `Prohibited_Ingredients`, `productStatus` | **already implemented** (`sg07-prohibited-closed`) | — |
| Restricted/caution ingredient assessment closed | Mandatory | `PB_Caution_Limits`, `productStatus` — no "Needs Safety/Regulatory Review" rows (unconditional at Gate 7, unlike Gate 4's conditional screen) | registerNoBadRows | Confirm: at Gate 7 this check should apply to **every** project, not just Skincare-for-Two ones — right? |
| Exposure and intended-use assessment | Mandatory | `Formulation_Safety` matrix (formulationSafetyMatrix), `exposureRationale` column | no row blank | — |
| Allergen and impurity review | Mandatory | `Fragrance_Safety` allergen log (fragranceAllergenLog) + `Formulation_Safety` matrix `allergenIfra`/`impurityProof` | no row blank across both | — |
| Maternal and infant-contact assessment (when Skincare for Two triggered) | Conditional (`skincareForTwo`) | Skincare-for-Two completion logic (C1, already exists) | **already implemented** (`sg07-maternal-infant`) | — |
| Safety conclusion and identified limitations | Mandatory | Final Safety Sign-off, row "Final safety release" `notes`/`decisionDate` | row has decisionDate + notes | — |
| Required safety reviewer approval | Mandatory | Final Safety Sign-off, `owner` = "Accountable approver" row, or the Phase 2/3 sign-off block (Safety role) | manual — likely duplicates phase-level `SignOffBlock` | Should this be a **separate gate-level** sign-off, or is the existing phase-level Prepared/Reviewed/Approved sufficient at Gate 7? |
| No unresolved critical safety finding | Mandatory | Depends on the A1 "critical" definition (open, Round 2 §A1) | blocked | **Blocked on A1** — cannot implement until "critical" is defined |

## Gate 8 — Testing & Validation

| Item | Tier | Proposed source | Proposed check | Needs confirmation |
|---|---|---|---|---|
| Testing plan | Mandatory | `Efficacy_Study_Plan` (efficacyStudyPlan) or `Study_Protocol` setup | register has ≥1 row / fixed rows complete | Which register is "the" testing plan when both efficacy and safety testing exist? |
| Test methods or method references | Mandatory | `Test_Report_Index` (testReportIndex), `methodProtocol` | no row blank | — |
| Acceptance criteria | Mandatory | `Test_Report_Index`, `acceptanceCriteria` | no row blank | — |
| Required safety, efficacy, preservative, QC and performance testing identified | Mandatory | `Test_Report_Index`, `evidenceType` coverage | manual — needs a defined "required test types" list per product type | What's the minimum required `evidenceType` set? (currently no config enumerates this) |
| Human-study approval workflow completed before participant recruitment, where applicable | Conditional | `StudyApprovalCard` / `ProjectData.studyApprovals` (3-role workflow, already built per C2) | all 3 `StudyApproval` roles have a positive `decision`, trigger = a Study_Protocol row exists | — |
| Test reports or controlled actions for tests still in progress | Mandatory | `Test_Report_Index`, `status` ≠ blank, OR a linked open `NextAction` | registerNoBadRows-style / nextActionsClosed hybrid | — |

## Gate 9 — Stability & Release Readiness

| Item | Tier | Proposed source | Proposed check | Needs confirmation |
|---|---|---|---|---|
| Stability status | Mandatory | `Stability_Release` (stabilityRelease), stability rows `result`/`releaseDecision` | no row blank | — |
| Packaging compatibility status | Mandatory | `Stability_Release`, packaging-compatibility rows | no row blank | — |
| Preservative efficacy status where applicable | Conditional | `Micro_PET_Evidence` (microPetEvidence), PET rows | manual (trigger = same "preserved product" flag as Gate 5) | Same open question as Gate 5's preservative trigger |
| Physical, chemical and microbiological acceptance criteria | Mandatory | `Micro_PET_Evidence`, `acceptanceCriteria` | no row blank | — |
| Scale-up or pilot status where applicable | Conditional | `Potency_Process_Control` or a new field | manual (trigger = ?) | No scale-up flag exists today — what marks a project as needing this? |
| Deviations and open risks reviewed | Mandatory | Open `NextAction`s linked to SG09 | **reuse existing** `nextActionsClosed` | — |
| Release-readiness conclusion | Mandatory | `Stability_Release`, `releaseDecision` present on the latest row | manual | — |

## Gate 10 — Regulatory, Claims & PIF (MARKET-SPECIFIC HARD BLOCK, per market)

| Item | Tier | Proposed source | Proposed check | Needs confirmation |
|---|---|---|---|---|
| Applicable regulatory checklist (per market) | Mandatory | `PIF_Checklist_ASEAN` (pifChecklistAsean) today; future Market Dossier Profiles (F10, pending content) | fixed rows all `status` = Completed, per `marketTracks[market]` | Only ASEAN checklist content exists — EU/AU/US checklists (F10) block this for non-ASEAN markets |
| **Uses the controlled Cosmetri formula** | Mandatory | Formula BOM, `reconciled` | **already implemented** (`bomReconciled`) | — |
| PIF/CPSR/Product Master File or equivalent dossier status | Mandatory | `MarketTrack.pifStatus` | `pifStatus === 'Approved'` (already the basis of C5) | — |
| SKU-level claims register | Mandatory | `SKU_Claims_PIF_Register` (skuClaimsPifRegister), ≥1 row per market | register has ≥1 row for this market | — |
| Evidence attached or linked for every approved product claim | Mandatory | `SKU_Claims_PIF_Register`, `evidenceLink` | no row blank | — |
| Ingredient and product safety evidence attached | Mandatory | `PIF_Evidence_Export` (pifEvidenceExport), safety-section rows | no row blank | — |
| Product-performance evidence attached where relevant | Conditional | `PIF_Evidence_Export`, performance-section rows | manual (trigger = a performance claim exists in `SKU_Claims_PIF_Register`) | — |
| Label and artwork review | Mandatory | `Packaging_Specs_Artwork` approval + `Released_Label_Ctrl` | manual | Which register wins if they disagree — artwork dev evidence vs released-label control? |
| Published information status | Mandatory | `Published_Info_Approval` (publishedInfoApproval), `workflowState` | no record stuck before "Approved for Release"/"Released" for this SKU/market | — |
| Regulatory approval | Mandatory | `MarketTrack.regulatoryStatus` | `regulatoryStatus === 'Approved'` | — |

## Gate 11 — Production & Launch (MARKET-SPECIFIC HARD BLOCK)

| Item | Tier | Proposed source | Proposed check | Needs confirmation |
|---|---|---|---|---|
| Gate 10 complete for the relevant market | Mandatory | Gate 10 readiness result for the same market | reuse Gate 10's evaluation, market-scoped | — |
| GMP document links | Mandatory | `GMP_Links` (gmpLinks), ≥1 row per market/SKU with `status` = Completed | no row blank | — |
| Approved current formula version | Mandatory | `Product_Family_Register` (productFamilyRegister), `currentMarketVersion` checked | flag = true | — |
| **Uses the controlled Cosmetri formula** | Mandatory | Formula BOM, `reconciled` | **already implemented** (`bomReconciled`) | — |
| Approved artwork version | Mandatory | `Lily-Released_Label_Ctrl` (releasedLabelRegister), `newLabelReleased` = Y | field = Y | — |
| Production readiness | Mandatory | `Batch_Formula_Trace` (batchFormulaTrace) or a manufacturing-readiness flag | manual | No clean "production readiness" field exists — is this GMP_Links coverage, or a separate flag? |
| Quality release pathway | Mandatory | `Batch_Formula_Trace`, `coaReleaseLink` | manual | — |
| Change controls closed or formally accepted | Mandatory | `ChangeRecord[]` for this project, `status` | **reuse existing** `isChangeOpen()` (F9) — no open change for this market/SKU | — |
| Published product information approved | Mandatory | `Published_Info_Approval`, `workflowState` ∈ {Approved for Release, Released} | same as Gate 10's check | — |
| Launch approval | Mandatory | `MarketTrack.launchApproval` | `launchApproval === 'Approved'` (already the basis of C5) | — |

## Gate 12 — Post-Market & Improvement

Read `PostMarketCapa.tsx` and `ChangeControl.tsx` to confirm the exact data shape (2026-07-22). `ProjectData.capa` is a flat array of records — `{ id, market, eventType, summary, severity: RiskLevel, owner, notes?, status: WorkStatus }` — with **one shared `eventType` dropdown** covering feedback, complaints, AE/PV, CAPA and even packaging/formula/quality issues (`EVENT_TYPES` in `PostMarketCapa.tsx`). There is no separate register per topic — all of Gate 12's items live in this **one array**, distinguished only by `eventType`. `ChangeRecord[]` is a **global** list (not per-project), filtered by `projectId`.

| Item | Tier | Proposed source | Proposed check | Needs confirmation |
|---|---|---|---|---|
| Market feedback | Supporting | `project.capa` rows where `eventType` ∈ {Consumer/HCP/Distributor/Retailer/Sales/Social media feedback} | manual (warn-only): any row `status` = "Not Started" | — |
| Complaint and adverse-event status | Mandatory | `project.capa` rows where `eventType` ∈ {Complaint, Adverse event / PV signal} | no row blank / `status` ≠ "Not Started" past a reasonable age | Is any open complaint/AE row acceptable at Gate 12 (post-market is ongoing by nature), or only ones still "Not Started" with no owner assigned? |
| PV/PMS review where applicable | Conditional | `project.capa` rows where `eventType` = "PMS trend" | manual (trigger = a PMS-trend row exists) | — |
| Product-performance feedback | Supporting | `project.capa` rows where `eventType` ∈ {"Product optimisation", "Formula issue", "Quality issue"} | manual (warn-only) | — |
| CAPA or improvement actions | Mandatory | `project.capa` rows where `eventType` = "CAPA" | no row `status` = "Not Started" | — |
| Change-control links | Supporting | `changes` (global) filtered by `projectId` | manual (warn-only): list count / any still open | Reuses the same `isChangeOpen()` already used for Gate 11 — likely just a "show, don't block" variant here |

**Implication for the engine:** all six Gate 12 items reduce to **one new check kind** — "no `project.capa` row with a given `eventType` set stuck at a blank/`Not Started` status" — parameterized by which `eventType` values count as Mandatory vs Supporting for that row. This is structurally identical to the existing `registerNoBadRows` check, just reading `capa` instead of a `RegisterConfig` register; a small generalization of that check function (or a sibling `capaNoOpenRows` check) covers all of Gate 12 without new UI.

---

## Cross-cutting notes

1. **Every gate additionally requires Prepared/Reviewed/Approved sign-off.** This is already enforced at **phase-closure** level (`phaseCompletionChecklist` in `gateProgress.ts`), not duplicated per-gate in `gateReadiness.ts` (see the comment at the top of that file). The proposal above does **not** re-add a sign-off row per gate — flag if the team wants gate-level (not just phase-level) sign-off enforcement.
2. **Blocked items:** "No unresolved critical safety finding" (Gate 7) and any other item whose hard-block depends on a severity judgement cannot be implemented until **Round 2 §A1** ("definition of critical") is answered.
3. **Items needing new fields/flags that don't exist in the app today** (not just a mapping question): Gate 5's target-pH field, a "preserved product" trigger flag (Gates 5 & 9), a "high-risk/borderline claim" flag (Gate 3), a "scale-up/pilot" flag (Gate 9). These need a decision on where that flag lives (a new column on an existing register vs. a new project-level field) before they can be wired even after the team confirms tiers.
4. **`PostMarket_CAPA` and `Change_Control` are dedicated pages, not `registers.ts` configs** — now read (2026-07-22) and mapped into the Gate 12 table above: `ProjectData.capa` is one flat array keyed by `eventType`, not per-topic registers; `changes` is a global array filtered by `projectId`.
5. **Already implemented today** (no team input needed): SG04/SG07 prohibited-ingredient check, SG07/SG10/SG11 BOM-reconciliation check, SG04/SG07 Skincare-for-Two check, SG10/SG11 PIF/regulatory/launch approval via `marketTracks`, SG11 change-control soft-lock via `isChangeOpen()`.
6. **Every gate's pre-existing Key Gate Check rows should be wired too, not just the ones named in the F1 Appendix.** Discovered on Gate 1: `PHASE_CONFIGS[*].keyGateChecks` rows tagged to a single specific gate were already mandatory-in-effect (rule B3 blocks phase close until every row is done/justified) — they just weren't yet enforced at their *own* gate. Wiring a `gateCheckDone` requirement for a gate-tagged row that isn't one of the F1-named items is **not** a new business decision (it only moves an already-confirmed requirement's enforcement earlier, never adds a new one) — so treat this as mechanical/dev-decidable for every gate, the same way it was for Gate 1's third row, unless a specific row's wording is ambiguous enough to need its own question.

## Suggested next step

Send this document (or a trimmed version) to the subject-matter team for the "Needs confirmation" cells only — most rows are a mechanical mapping to an existing register and likely need just a sanity check, not a decision. Prioritize per the Round 2 doc's own ordering: **A1 (critical definition)** unblocks the single hardest row (Gate 7's "no unresolved critical safety finding"); the four "new field" items in note 3 are the next-highest-leverage since two other gates depend on each.
