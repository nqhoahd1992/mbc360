# F1/C7 — Per-Gate Open Questions for the Subject-Matter Team

**Date:** 2026-07-22
**Companion to:** `F1_Gate_Readiness_Mapping_Proposal.md` (the full per-gate mapping proposal) and `Business_Rules_Followup_Round2.md` §B ("we will map your per-gate lists to the specific registers in the app and tag each as Mandatory/Conditional/Supporting — we will send that mapping back to you to confirm").

**How this file works:** as each gate's F1 items get implemented, most turn out to be a mechanical mapping to a register/field that already exists — those are coded directly (no team input needed) and are **not** listed here. This file collects only the items that turned out to be **genuinely ambiguous or missing data** once we tried to wire them — one section per gate, added as we go. Right now it only covers Gate 1 (Gates 2–12 not analyzed yet).

---

## Gate 1 — Opportunity & Request

3 of the 5 F1 items for Gate 1 are now implemented in `packages/shared/src/config/gateReadiness.ts` (`SG01`), reading real "Key Gate Check" rows (`ProjectData.gateChecks`, the same data behind the "Key Gate Checks" table on the Phase 1 page):

- "Product request record" and "Request source" → both read the check row **"Product request, opportunity and requester captured"**
- "Project owner" → reads the check row **"Initial project record opened and owner assigned"**

The other 2 items are **not** implemented — both because the underlying data doesn't cleanly exist yet, not because of a mapping preference:

### Q1. "Initial product scope" — no matching field exists

The only other Key Gate Check at Gate 1 is **"Initial constraints, known deadlines and risk flags recorded"**. That is not the same thing as "scope" — a team member could tick it (constraints/deadlines/risks captured) without ever having recorded what the product actually *is*. Using it as a stand-in would create a false "ready" signal: the gate could show as passed while nobody has actually written down the initial product scope.

**Question:** should we add a **new** Key Gate Check row for Gate 1, e.g. *"Initial product scope defined"*, alongside the existing 3? If yes, please confirm the exact wording you'd want recorded (we'd transcribe it verbatim, the same way the existing 3 rows were transcribed from the workbook).

### Q2. "Initial target market and user" — the only matching data belongs to Gate 2, not Gate 1

The app's only target-market/target-user data (`checklists['targetMarkets']`, `checklists['targetUsers']`) is explicitly tagged **Gate 02** in the phase config (`packages/shared/src/config/phases.ts`), not Gate 01 — it's the fuller "Target User & Brief" selection (life stage, body area, full market list). The F1 Appendix calls Gate 1's version "**initial**" target market and user, which reads as a distinct, rougher capture at the opportunity stage — not the same data as Gate 2's refined selection.

**Why this matters (not just wording):** if we hard-block Gate 1 on the Gate-02-tagged checklist, we'd effectively force the team to finish Gate 2's full target-user/market work before Gate 1 can even close — collapsing two gates into one and contradicting the phase's own gate order (SG01 → SG02 → SG03 unlock sequentially, per `PHASE_1.gateIds`).

**Question:** which do you want?
- **(a)** A separate, lightweight "initial market/user" capture at Gate 1 (e.g. a new Key Gate Check row, or a short free-text/tag field) that's distinct from Gate 2's full selection, or
- **(b)** Treat this as effectively already covered by "Product request, opportunity and requester captured" (i.e. no separate signal needed — Gate 1 doesn't need its own market/user field at all, and the F1 Appendix wording is just descriptive, not a distinct required item)?

---

## Gate 2 — Target User & Brief

3 of 6 F1 items implemented (`SG02` in `gateReadiness.ts`), reusing the same "Key Gate Check" mechanism as Gate 1 — plus one extra row ("Commercial planning inputs entered or marked N/A") wired for the same reason as Gate 1's "constraints/deadlines/risk" row: it was already mandatory-in-effect via phase close (B3), just not yet enforced at Gate 2 itself.

- "Target user and life stage" and "Intended use and body area" → both read the check row **"Target user / life stage / use context selected"**
- "Selected markets" → reads **"Target markets and success criteria linked"**

3 items are not implemented:

### Q1. "Approved development brief" — no matching field exists anywhere

Checked every candidate: not a Key Gate Check row (the 3 Gate-02 rows are about target user/markets/commercial planning, not a "brief" document), not a Phase 1 checklist section, not a field on `ProjectIdentity`. There is currently no representation of "the brief" as a discrete, approvable artifact anywhere in the data model.

**Question:** does "approved development brief" mean a **separate document/link** we should add a field for (e.g. on the Project Identification card, or a new Key Gate Check row), or does it mean **the combination of the 4 Phase 1 checklist sections** (Target Area, Product Type, Target Users, Target Markets) — i.e., once those are filled in, that collectively *is* the brief, and no new field is needed, just an aggregate check that all 4 sections have at least one selection?

### Q2. ~~"Vulnerable-user flags" — ambiguous against the same evidence as "Target user and life stage"~~ — **NO LONGER NEEDED (2026-07-26)**

> **Resolved without an SME round.** The vulnerable-user flags genuinely *are* the target-user checklist entries (Pregnancy / Breastfeeding / Postpartum / Infant 0+ / Sensitive skin / Cancer patient support / Kidney disease support …), so the item is now wired to `checklistHasSelection: targetUsers` — the same evidence as "Target user and life stage". Reusing one piece of evidence for two appendix items is an established pattern here (Gate 1's "Product request record" and "Request source" already share a Key Gate Check). The alternative reading — a per-flag cardinality rule ("which flags must each be answered") — was NOT adopted, because that would be inventing a rule nobody confirmed. Raise it again only if the team wants per-flag enforcement.

<details><summary>Original question (kept for the record)</summary>



The only vulnerable-user data in the app is the `targetUsers` checklist itself (`Pregnancy`, `Breastfeeding`, `Postpartum`, `Infant 0+`, `Child 2+/3+`, `Sensitive skin`, etc. — the same list `skincareForTwoTriggers()` already reads for the C1 safety screen). Mapping "Vulnerable-user flags" to the same Key Gate Check as "Target user and life stage" would make 3 different F1 wordings ("target user and life stage", "intended use and body area", "vulnerable-user flags") all resolve to one identical signal, which stops being meaningful as a distinct mandatory item.

**Question:** should this item instead check the **`targetUsers` checklist data directly** — and if so, satisfied by what condition? Two candidates:
- (a) At least one `targetUsers` item is `selected`, regardless of which one (i.e., "the question was considered" — satisfied even for a plain "General adult" product with no vulnerable flag), or
- (b) Something stricter tied to whether a vulnerable label is selected — e.g. once a vulnerable label is selected, some additional acknowledgement/note is required before Gate 2 can proceed.

</details>

### Q3. "Project requirements and exclusions" — Phase 1 has no requirement-table data at all

`PHASE_1.requirementSections` is an **empty array** in `packages/shared/src/config/phases.ts` — Phases 2, 3 and 4 all have real requirement rows, but Phase 1 was transcribed with none. So `project.requirements` has no Phase-1 keys to check against; this isn't a wrong-mapping problem, there is simply nothing to point at yet.

**Question:** should we add a Phase 1 requirement section (and if so, what rows — e.g. minimum viable requirements, exclusions/claims not to pursue, budget/timeline constraints)? Or does "requirements and exclusions" already live somewhere else we haven't found (e.g. free text in an existing checklist item's notes field)?

---

## Gate 3 — Product Concept & Claims

4 of 6 F1 items implemented (`SG03` in `gateReadiness.ts`), same pattern as Gates 1-2: Key Gate Check rows as the primary signal, plus a `checklistHasSelection` detail guard where a matching checklist section exists (`claimAreas`, `evidenceRoute`). Also wired the pre-existing Gate 03 Key Gate Check that wasn't one of the 6 F1-named items ("Gate 1-3 decision and open actions recorded") for the same reason as Gate 1's "constraints" row and Gate 2's "commercial planning" row.

2 items are not implemented — both Conditional tier, so **neither can hard-block the gate even once wired** (only ever surfaces as a warning), which makes both lower priority than the still-open Mandatory items on Gates 1-2:

### Q1. "Preliminary claim classification" — no field represents a claim's classification/risk tier

`claimAreas` only lists benefit *wording* (Moisturising, Brightening, Anti-redness appearance, etc.) — there's no attribute anywhere marking a claim as, say, cosmetic vs. functional vs. medical-adjacent, or low-risk vs. high-risk.

**Question:** should we add a classification field per selected claim area (e.g. a dropdown next to each `claimAreas` row), or is "preliminary claim classification" meant as a single project-level judgement (e.g. one field: "this concept's claims are/aren't borderline")?

### Q2. "Regulatory review of high-risk or borderline claims" — depends on the same undefined "high-risk/borderline" flag as Q1

This is the Gate 3 instance of the same gap `Business_Rules_Followup_Round2.md` §A1 already flags for "critical" — we don't yet have a confirmed definition of what makes a claim high-risk/borderline, so there's nothing to trigger this Conditional item on. Once Q1 (or Round 2's A1) is answered, this item likely follows directly.

---

## Gate 4 — Ingredient & RM Screening

6 of 7 F1 items implemented (`SG04` in `gateReadiness.ts`) — same Key-Gate-Check + detail-guard pattern as Gates 1-3, plus two new detail-guard kinds (`registerHasRows`, `bomHasLines`/`bomIdentityComplete`) that generalize cleanly to later gates too. Only 1 item open, and it's low priority (Conditional — never hard-blocks even once wired):

### Q1. ~~"Allergen, impurity and contaminant review where relevant" — no checkable data exists~~ — **NO LONGER NEEDED (2026-07-26)**

> **Resolved without an SME round.** Wired to `registerRowsComplete: supplierRmEvidence ['allergenStatement','impurities']` — i.e. every screened raw material must have *something* recorded in both columns. This asserts only that they are **not empty**, never a judgement on the content (that would be the invented rule the original question was worried about). It is non-vacuous by design (an untouched register does not pass), and the item is Conditional tier, so it warns rather than hard-blocks. A stricter content rule would still need the team.

<details><summary>Original question (kept for the record)</summary>



`Supplier_RM_Evidence`'s `allergenStatement` and `impurities` columns are free text, not a status/enum — there's nothing to compare against a "bad values" list without inventing what counts as "reviewed" (a blank string? a specific keyword? a Y/N column that doesn't exist yet?).

**Question:** should we add a status column (e.g. Y/N/NA) next to `allergenStatement`/`impurities` in `Supplier_RM_Evidence` specifically for this check, or is this meant to stay a manual reviewer judgement call with no automated signal?

---

</details>

## Gate 5 — Formula Design & Development

6 of 8 F1 items implemented (`SG05` in `gateReadiness.ts`) — same Key-Gate-Check + detail-guard pattern as Gates 1-4, but the detail guard is new: a `requirementDone` check reading `ProjectData.requirements` (PHASE_2's `formulationDesign`/`efficacyProcess` requirement-table rows already matched most F1 wording almost verbatim). Plus the BOM checks relocated from Gate 4 (see that gate's note above). 2 items open, both low priority (never hard-block regardless of the answer):

### Q1. "Preservative strategy where applicable" — no data source and no defined trigger (Conditional)

None of Phase 2's requirement rows are preservative-specific. Even if they were, "where applicable" needs a trigger condition — same open gap noted for Gate 9's preservative item in the mapping doc.

**Question:** is "applicable" meant to key off a product-type flag (e.g. "contains water" / "aqueous formula") that doesn't exist in the data model yet? If so, where should that flag live — a new Phase 1 checklist option, or a BOM/costing field?

### Q2. "Costing or commercial feasibility status" — `CostingInputs` has no status field (Supporting)

`CostingInputs` (batchSizeKg, fillSizeG, targetUnits, packagingCostPerUnit, ...) is always pre-filled with non-blank defaults from project creation — there's no status/completion field to check, and inventing one (e.g. "values differ from the hardcoded defaults") would mean guessing what counts as "considered."

**Question:** should a status field be added to `CostingInputs` (e.g. Not Started/In Progress/Completed), or is this meant to stay a manual, un-tracked judgement call? Low priority either way — Supporting tier never blocks.

---

## Cross-cutting (2026-07-22): Formula BOM gated on Supplier & RM Evidence

**Not an F1 item — a dev decision made while implementing Gate 4/5, confirmed with the user, not yet run past the SME team.** Following the same Gate 4 (ingredient screening) → Gate 5 (formula lock) sequencing already established (`registers.ts`'s `linkedGate` tags), the Formula BOM's Cosmetri raw-material picker (`BomCosting.tsx`) now only offers materials that already have a `Supplier_RM_Evidence` row — a manually-picked BOM line pointing at a material with no evidence record blocks Save (mirrors the existing duplicate/empty-raw-material guards).

**Full-formula Cosmetri import (`CosmetriImportModal.tsx`, `fromCosmetri` lines) is not blocked by this**, since a whole formula's composition doesn't go through the per-line picker — but it no longer silently bypasses the traceability goal either: importing now **auto-creates an identity-only `Supplier_RM_Evidence` stub row** (`rmCode`/`inciName`/`supplier`/`grade` filled from the import data) for any material that doesn't already have one, leaving the actual evidence columns (SDS/CoA/TDS/allergen/etc.) blank for R&I/Procurement to fill in afterward. This was the user's explicit choice over two alternatives (hard-blocking the import entirely, or leaving it fully exempt).

**Question for the team:** does auto-creating a stub evidence record on import match intended practice, or should a formula import instead require every material to already have a *complete* evidence record (hard block, no stub-creation) before it can be imported at all?

---

## Gates 6–12 (added 2026-07-26)

**Status:** Gates 6, 7, 8, 9 and 12 are now **fully wired** (every Mandatory item hard-blocks), and Gates 10–11 are wired except the items below. Nothing in this section was previously asked, because when this document was written Gates 6–12 had not been analysed yet. Two questions that *were* raised in `F1_Gate_Readiness_Mapping_Proposal.md`'s "Needs confirmation" column for Gate 7 have since been answered from the workbook itself and need no SME round:

- *"At Gate 7, does the Pregnancy/Breastfeeding caution screen apply to **every** project, or only Skincare-for-Two ones?"* → The F1 appendix lists the Gate 7 item as **Mandatory and unconditional**, unlike the Gate 4 version which is Conditional on the trigger. It is now enforced unconditionally at Gate 7. Tell us if that reading is wrong.
- *"Is a separate **gate-level** safety sign-off needed, or is the phase-level Prepared/Reviewed/Approved block sufficient at Gate 7?"* → The workbook already ships a gate-level one: the Final Safety Sign-off sheet has an owner and a decision date against each of its 10 safety questions. That is now what the gate checks, and the phase-level sign-off remains a separate condition. Tell us if you intended only one of the two.

### Q1. "No unresolved critical safety finding" (Gate 7) — no separate field exists for it

Gate 7 is now enforced by requiring **all 10 Final Safety Sign-off questions** to be Completed (including the last one, "Final safety release"), plus a safety decision recorded against every ingredient in the safety matrix. We treat that as being the same thing as "no unresolved critical safety finding" — there is no separate "critical finding" flag anywhere in the workbook.

**Question:** is that acceptable, or do you want a **distinct field** (e.g. a "Critical safety finding: Yes/No + description" row) that must be explicitly cleared before Gate 7 can pass? This links to Round-2 question **A1** (the definition of "critical").

### Q2. "Applicable regulatory checklist (per market)" (Gate 10) — only the ASEAN checklist exists

The app has a complete ASEAN PIF checklist, but the non-ASEAN equivalents (EU CPSR, Australia, US) are the **F10 / C5 "Market Dossier Profile"** work that is confirmed in principle but not yet supplied as content. We have deliberately **not** enforced the ASEAN checklist for all projects, because that would wrongly block a product that is not being sold in ASEAN.

**Question:** until the per-market profiles exist, should Gate 10 (a) stay unenforced on this item, (b) enforce the ASEAN checklist only for projects whose markets include an ASEAN country, or (c) something else?

### Q3. Three items are per-market and need the F4 decision first

These cannot be enforced at project level at all, because a project can legitimately be approved in one market and pending in another (rule A1/C5):

| Gate | Item |
|---|---|
| 10 | Regulatory approval |
| 11 | Gate 10 complete for the relevant market |
| 11 | Launch approval |

A project-level check would either pass as soon as **one** market is approved (too lax) or block while **any** market is pending (too strict). Launch approval already has a real per-market hard block (PIF must be Approved — C5) in the Market Tracking screen; what is missing is how a per-market state should feed the **gate**'s own readiness.

**Question:** when a project sells into several markets, should Gate 10/11 be considered "ready" (a) only when **every** market is approved, (b) as soon as **any** market is approved, with the rest tracked separately, or (c) should the gate itself become per-market (which is the larger F4 change)?

### Q4. "Change controls closed or formally accepted" (Gate 11) — already enforced by a different mechanism

An open Change Control record **already** soft-locks the gate today through rule C4/F9 (it blocks a plain Proceed and requires an explicit acknowledgement to record Proceed with Conditions). Adding a second, readiness-level check for the same thing would either duplicate it or contradict it.

**Question:** is the existing C4/F9 soft-lock what you meant by this appendix item, or did you intend a **separate, harder** requirement at Gate 11 (i.e. no open change may exist at all, with no acknowledgement escape)?

