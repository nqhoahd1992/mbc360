# F1/C7 — Per-Gate Open Questions for the Subject-Matter Team

**Date:** 2026-07-22 (last updated 2026-07-28)
**Companion to:** `F1_Gate_Readiness_Mapping_Proposal.md` (the full per-gate mapping proposal — now superseded/stale, kept only as historical reference; do not send it to the team) and `Business_Rules_Followup_Round2.md` §B ("we will map your per-gate lists to the specific registers in the app and tag each as Mandatory/Conditional/Supporting — we will send that mapping back to you to confirm").

**How this file works:** as each gate's F1 items get implemented, most turn out to be a mechanical mapping to a register/field that already exists — those are coded directly (no team input needed) and are **not** listed here. This file collects only the items that turned out to be **genuinely ambiguous or missing data** once we tried to wire them — one section per gate, added as we go. **All 12 gates have now been analyzed** — every remaining open item across Gates 1–12 is listed below, plus three cross-cutting sections (tier-assignment methodology; the Supplier & RM Evidence / Formula BOM gating design; and "Prepared, reviewed and approved sign-off" applying to all 12 gates). This is the file to send to the subject-matter team for confirmation.

---

## Cross-cutting (2026-07-27): tier assignment from "where applicable" / "where relevant" wording — decided by the project owner, needs SME confirmation

**What we found:** re-reading the F1 appendix (`docs/Response.txt`) closely, every gate's item list sits under one flat **"Required:"** heading — the appendix does not tag any individual item as Mandatory, Conditional or Supporting. Those three tiers are only defined once, up front, as a general framework:

> Mandatory: hard-blocks gate passage. Conditional: becomes mandatory when triggered by product type, user, market, claim or change. Supporting: may be incomplete without blocking the gate, provided any resulting risk is documented. ... These rules should be hard blocks for mandatory safety, regulatory, PIF, claim and release evidence. Supporting information may generate warnings rather than blocks.

So every per-item tier in `gateReadiness.ts` that is not Mandatory is something the team inferred, not something the appendix states outright. **This was raised because two Gate 3 items were briefly changed to Mandatory** (on the reading "the appendix just says Required, so tier them all the same"), then reconsidered: the project owner's decision is to **keep the inference rule below** rather than tier everything Mandatory, and have it formally confirmed here instead of left as a silent assumption.

**The rule being confirmed:**
1. An item whose own wording carries a qualifier — **"where applicable"**, **"where relevant"**, **"where triggered"**, or a self-limiting phrase like **"high-risk or borderline"** (i.e. only some claims are) — is tiered **Conditional**. This matches the appendix's own definition of Conditional word-for-word: it "becomes mandatory when triggered by product type, user, market, claim or change."
2. An item that is inherently soft business/lifecycle context rather than safety, regulatory, PIF or release evidence (e.g. a costing status, a market-feedback log) is tiered **Supporting**, matching the appendix's own closing line about "Supporting information."
3. Everything else is **Mandatory** — hard-blocks the gate.

**Every item tiered this way** (Conditional unless marked Supporting):

| Gate | Item | Appendix wording | Tier |
|---|---|---|---|
| 3 | Competitor or benchmark review where applicable | "...where applicable" | Conditional |
| 3 | Regulatory review of high-risk or borderline claims | "...high-risk or borderline" | Conditional |
| 4 | Pregnancy/breastfeeding caution screen when triggered | "...when triggered" | Conditional (also backed by the confirmed rule C1 — this one has a real trigger, not just a wording inference) |
| 4 | Allergen, impurity and contaminant review where relevant | "...where relevant" | Conditional |
| 5 | Preservative strategy where applicable | "...where applicable" | Conditional |
| 5 | Costing or commercial feasibility status | *(no qualifier — tiered on the "soft business context" reading instead)* | Supporting |
| 7 | Maternal and infant-contact assessment when Skincare for Two is triggered | "...when triggered" | Conditional (rule C1, real trigger) |
| 8 | Human-study approval workflow completed before participant recruitment, where applicable | "...where applicable" | Conditional |
| 9 | Preservative efficacy status where applicable | "...where applicable" | Conditional |
| 9 | Scale-up or pilot status where applicable | "...where applicable" | Conditional |
| 10 | Product-performance evidence attached where relevant | "...where relevant" | Conditional |
| 12 | Market feedback | *(no qualifier — soft business context)* | Supporting |
| 12 | PV/PMS review where applicable | "...where applicable" | Conditional |
| 12 | Product-performance feedback | *(no qualifier — soft business context)* | Supporting |
| 12 | Change-control links | *(no qualifier — soft business context)* | Supporting |

**One inconsistency found while compiling this list, flagged rather than silently fixed:**

| Gate | Item | Appendix wording | Current tier | Problem |
|---|---|---|---|---|
| 6 | Market-specific pack requirements | No qualifier at all — reads exactly like the other 5 Mandatory items on Gate 6's list | Conditional | Doesn't fit either rule above (no "where applicable" wording, and it's not "soft business context" either — packaging requirements are release-relevant). Left as Conditional for now since changing it is exactly the kind of judgment call this section exists to avoid making silently. |

**Question for the team:** does this tiering rule (qualifier wording → Conditional; soft business/lifecycle info → Supporting; everything else → Mandatory) match what you intended when you wrote "Required" for every item? And separately: should Gate 6's "Market-specific pack requirements" be Mandatory (it has no qualifying wording) or Conditional (packaging can genuinely vary by market)?

**A second, more important caveat the project owner raised (2026-07-27): the appendix's own Conditional definition — "becomes mandatory when triggered by product type, user, market, claim or change" — is too generic to actually act on.** It names five possible KINDS of trigger but not, for any specific item, which product types / which markets / which claim types / which change actually flips it to mandatory. Concretely, that means: of the 11 items above tiered Conditional, **only 2 have a real, working trigger today** — "Pregnancy/breastfeeding caution screen" and "Maternal and infant-contact assessment" both key off the confirmed rule C1 (Pregnancy/Breastfeeding/Postpartum selected as a target user). The other 9 Conditional items (and the 4 Supporting ones) have **no trigger definition of any kind wired** — there is nothing in the app that can evaluate "has this been triggered," so today they behave as permanently advisory: they will show green when satisfied and amber when not, but can **never** actually hard-block a gate, no matter what the project's real product type, market, user or claim is. That is a real gap against the appendix's own words ("becomes mandatory"), not a deliberate design choice — we don't have enough information to close it ourselves.

**Question:** for each of the 9 untriggered Conditional items and the Gate 4/7 pattern they're modelled on, can the team specify the exact condition that should flip it to mandatory (e.g. "Preservative strategy where applicable" — mandatory whenever the formula is NOT a single-use/anhydrous product that can't support microbial growth; not mandatory otherwise)? Until that's supplied, these items stay permanently advisory in practice, whatever tier they're labelled with.

**Practical effect until then:** Conditional/Supporting items never hard-block the gate today — they show on the "What's blocking Gate X" panel in amber, satisfied or not, purely for visibility. If the team supplies a real trigger condition for one of them, it can be wired the same way rule C1 already is, and it will then genuinely hard-block once triggered — matching the appendix's definition in practice, not just in label.

---

## Gate 1 — Opportunity & Request

2 of the 5 F1 items for Gate 1 are now implemented in `packages/shared/src/config/gateReadiness.ts` (`SG01`), reading real "Key Gate Check" rows (`ProjectData.gateChecks`, the same data behind the "Key Gate Checks" table on the Phase 1 page):

- "Product request record" → reads the check row **"Product request, opportunity and requester captured"**
- "Project owner" → auto-satisfied from the moment the project exists, because Project Lead is a **required field on the Create New Project form** — a project cannot be created without one.

The other 3 items are **not** implemented — because the underlying data doesn't cleanly exist yet, not because of a mapping preference:

### Q1. "Request source" — was reusing "Product request record"'s evidence; reopened

We had initially read this the same way as "Product request record", on the theory that the Key Gate Check row's wording ("...requester captured") already covers where the request came from. **That was our own assumption, not confirmed by you** — correctly challenged: the appendix lists "Product request record" and "Request source" as two separate lines with no further detail, and if a single piece of evidence covered both, we'd expect them written as one line. We've reverted this item to unimplemented rather than keep a guessed mapping.

**Question:** is "Request source" a distinct piece of information from the requester who filed the request (e.g. *where* the request originated — internal proposal, customer feedback, distributor request, market research, regulatory change, etc.)? If yes, please confirm the exact wording of the field/options you'd want recorded, the same way the existing rows were transcribed verbatim from the workbook.

### Q2. "Initial product scope" — no matching field exists

The only other Key Gate Check at Gate 1 is **"Initial constraints, known deadlines and risk flags recorded"**. That is not the same thing as "scope" — a team member could tick it (constraints/deadlines/risks captured) without ever having recorded what the product actually *is*. Using it as a stand-in would create a false "ready" signal: the gate could show as passed while nobody has actually written down the initial product scope.

**Question:** should we add a **new** Key Gate Check row for Gate 1, e.g. *"Initial product scope defined"*, alongside the existing 3? If yes, please confirm the exact wording you'd want recorded (we'd transcribe it verbatim, the same way the existing 3 rows were transcribed from the workbook).

### Q3. "Initial target market and user" — the only matching data belongs to Gate 2, not Gate 1

The app's only target-market/target-user data (`checklists['targetMarkets']`, `checklists['targetUsers']`) is explicitly tagged **Gate 02** in the phase config (`packages/shared/src/config/phases.ts`), not Gate 01 — it's the fuller "Target User & Brief" selection (life stage, body area, full market list). The F1 Appendix calls Gate 1's version "**initial**" target market and user, which reads as a distinct, rougher capture at the opportunity stage — not the same data as Gate 2's refined selection.

**Why this matters (not just wording):** if we hard-block Gate 1 on the Gate-02-tagged checklist, we'd effectively force the team to finish Gate 2's full target-user/market work before Gate 1 can even close — collapsing two gates into one and contradicting the phase's own gate order (SG01 → SG02 → SG03 unlock sequentially, per `PHASE_1.gateIds`).

**Question:** which do you want?
- **(a)** A separate, lightweight "initial market/user" capture at Gate 1 (e.g. a new Key Gate Check row, or a short free-text/tag field) that's distinct from Gate 2's full selection, or
- **(b)** Treat this as effectively already covered by "Product request, opportunity and requester captured" (i.e. no separate signal needed — Gate 1 doesn't need its own market/user field at all, and the F1 Appendix wording is just descriptive, not a distinct required item)?

---

## Gate 2 — Target User & Brief

4 of 6 F1 items implemented (`SG02` in `gateReadiness.ts`): "Target user and life stage", "Intended use and body area" and "Selected markets" each read BOTH the matching Key Gate Check row done+Y/NA AND the underlying detail checklist actually having a real selection (merged into one visible line per item, 2026-07-26, user-requested — see the "detailed selection recorded" discussion). "Vulnerable-user flags" reuses the same evidence as "Target user and life stage" — see **Q2 below, reopened for confirmation**.

2 items are still not implemented (`manual`):

### Q1. "Approved development brief" — no matching field exists anywhere

Checked every candidate: not a Key Gate Check row (the 3 Gate-02 rows are about target user/markets/commercial planning, not a "brief" document), not a Phase 1 checklist section, not a field on `ProjectIdentity`. There is currently no representation of "the brief" as a discrete, approvable artifact anywhere in the data model.

**Question:** does "approved development brief" mean a **separate document/link** we should add a field for (e.g. on the Project Identification card, or a new Key Gate Check row), or does it mean **the combination of the 4 Phase 1 checklist sections** (Target Area, Product Type, Target Users, Target Markets) — i.e., once those are filled in, that collectively *is* the brief, and no new field is needed, just an aggregate check that all 4 sections have at least one selection?

### Q2. "Vulnerable-user flags" — reopened for confirmation (interim decision in place, not yet SME-confirmed)

**Currently implemented as an interim decision, 2026-07-26 — reopened by the project owner to get this exactly right rather than leave it as our own call.** The only vulnerable-user data in the app is the `targetUsers` checklist itself (`Pregnancy`, `Breastfeeding`, `Postpartum`, `Infant 0+`, `Child 2+/3+`, `Sensitive skin`, `Cancer patient support`, `Kidney disease support`, etc. — the same list `skincareForTwoTriggers()` already reads for the C1 safety screen), mixed in the same table alongside plain life-stage options (`General adult`, `Family use`, `Swimmers`, …) — there is no separate "vulnerable flags" table in the workbook. So today "Vulnerable-user flags" is wired to `checklistHasSelection: targetUsers` — the same evidence as "Target user and life stage" (they share one Key Gate Check and this one checklist). Reusing one piece of evidence for two appendix items has precedent here (Gate 1's "Product request record" and "Request source" also share one Key Gate Check), but that precedent is itself a judgment call, not something the team confirmed either — so treat this whole pattern as still open, not settled.

**What this means concretely:** the item is satisfied as soon as the `targetUsers` checklist has ANY selection at all — even a plain "General adult" product with no vulnerable flag ticked counts as satisfied. There is no distinct signal for "we specifically considered whether this product touches a vulnerable-use group."

**Question:** is that acceptable, or do you want something stricter tied to whether a vulnerable label is actually selected? Two candidates if stricter:
- (a) Keep it as-is — satisfied once the `targetUsers` checklist has any selection, regardless of which option (current behavior); or
- (b) Require a distinct step once a vulnerable label IS selected — e.g. an additional acknowledgement/note — before Gate 2 can proceed, so the two ideas ("a life stage was picked" vs. "a vulnerable-use group was flagged") are no longer collapsed into one signal.

### Q3. "Project requirements and exclusions" — Phase 1 has no requirement-table data at all

`PHASE_1.requirementSections` is an **empty array** in `packages/shared/src/config/phases.ts` — Phases 2, 3 and 4 all have real requirement rows, but Phase 1 was transcribed with none. So `project.requirements` has no Phase-1 keys to check against; this isn't a wrong-mapping problem, there is simply nothing to point at yet.

**Question:** should we add a Phase 1 requirement section (and if so, what rows — e.g. minimum viable requirements, exclusions/claims not to pursue, budget/timeline constraints)? Or does "requirements and exclusions" already live somewhere else we haven't found (e.g. free text in an existing checklist item's notes field)?

---

## Gate 3 — Product Concept & Claims

4 of 6 F1 items implemented (`SG03` in `gateReadiness.ts`), same pattern as Gates 1-2: Key Gate Check rows as the primary signal, plus a `checklistHasSelection` detail guard where a matching checklist section exists (`claimAreas`, `evidenceRoute`). Also wired the pre-existing Gate 03 Key Gate Check that wasn't one of the 6 F1-named items ("Gate 1-3 decision and open actions recorded") for the same reason as Gate 1's "constraints" row and Gate 2's "commercial planning" row.

2 items are not implemented. **Corrected 2026-07-31 (this paragraph previously said both were Conditional tier and therefore low priority — that was wrong for Q1):** `sg03-classification` ("Preliminary claim classification") is **Mandatory** in `gateReadiness.ts`, correctly so under the tier rule in the cross-cutting section above (its appendix wording carries no qualifier). It does not block today only because its check is `manual` — i.e. `pending`, so no data source exists to evaluate — not because of its tier. Wire it and it hard-blocks Gate 3 for real, which puts it in the SAME priority band as the still-open Mandatory items on Gates 1-2, not below them. Only Q2 is genuinely Conditional (never hard-blocks while its "high-risk/borderline" trigger is undefined).

### Q1. "Preliminary claim classification" — no field represents a claim's classification/risk tier (Mandatory)

`claimAreas` only lists benefit *wording* (Moisturising, Brightening, Anti-redness appearance, etc.) — there's no attribute anywhere marking a claim as, say, cosmetic vs. functional vs. medical-adjacent, or low-risk vs. high-risk.

**The workbook itself shows the team already does this classification informally, with nowhere to record the result:** the `claimAreas` option list is written defensively — `Stretch mark appearance` / `Scar appearance` / `Blemish appearance` / `Anti-redness appearance` all say *appearance* rather than a treatment verb, `Itch relief support` / `Barrier support` add *support*, and `Pregnancy suitable` / `Breastfeeding suitable` say *suitable* rather than *safe*. Each of those word choices IS a claim-classification decision (keeping the claim on the cosmetic side of the cosmetic/therapeutic line), made while transcribing the sheet and then lost, because no field captures it.

**Question:** should we add a classification field per selected claim area (e.g. a dropdown next to each `claimAreas` row), or is "preliminary claim classification" meant as a single project-level judgement (e.g. one field: "this concept's claims are/aren't borderline")?

### Q2. "Regulatory review of high-risk or borderline claims" — depends on the same undefined "high-risk/borderline" flag as Q1

This is the Gate 3 instance of the same gap `Business_Rules_Followup_Round2.md` §A1 already flags for "critical" — we don't yet have a confirmed definition of what makes a claim high-risk/borderline, so there's nothing to trigger this Conditional item on. Once Q1 (or Round 2's A1) is answered, this item likely follows directly.

### Q3. Claim-support hard block on Published Information — the whole design is a dev/project-owner decision, not yet put to the SME team

Gate 3's list is followed by one more sentence, outside the numbered items: *"A claim may remain under development, but unsupported wording must not be marked as approved."* Previously this was only tracked (a "Supporting" register note, not enforced — see `Business_Rules_Confirmation_EN.md`'s NPD Front-End Roadmap section). **2026-07-27, the project owner asked to make this a real hard block**, explicitly flagging (per standing instruction) that every dev-made call along the way — even ones the project owner personally signed off on in the moment — should be written up here for the SME team to confirm, not left implicit in code comments.

**What was actually built**, so the team can review the whole shape of it, not just the headline rule:

1. **Published Information Approval** rows gained an optional **Claim ID** field, referencing a row in **Claim → Evidence Traceability**. Left blank, the row is treated as not making a specific claim (e.g. plain company information) and none of the below applies to it.
2. The Claim ID field is a **picker showing only claims already marked `Supported`** in Claim → Evidence Traceability — a still-`Pending` claim cannot be selected at all, even to note "this is the claim we intend to use once it's ready."
3. Selecting a Claim ID **auto-fills "Exact wording / technical statement" from that claim's own approved wording, and locks the field** — it can no longer be hand-typed while linked (to change it: unlink the claim, or edit the source wording on Claim → Evidence Traceability itself).
4. A row cannot be **saved** with its workflow state at "Approved for Release" or "Released" while its linked claim is not `Supported` — enforced both in the UI (Save disabled with a reason) and, authoritatively, in the API (a direct API call is rejected too).

**Questions for the team, on each design point above:**
- **(1)** Should linking a Claim ID be optional (today's behaviour), or should every row that states any product benefit be required to link one?
- **(2)** Should the picker really be restricted to `Supported` claims only, or should a still-developing (`Pending`) claim be linkable too — so the intended claim is documented early — with the hard block applying only at the point of actually reaching a released state (which is where rule (4) already bites)? Restricting the picker itself is stricter than the sentence strictly requires ("may remain under development" arguably means it should be *linkable* while developing, just not *releasable*).
- **(3)** Is auto-fill-and-lock the right level of strictness, or should content owners be allowed to adapt the wording per channel (e.g. shorten for a social media caption) as long as the underlying meaning is unchanged, with a save-time check that it still matches closely enough rather than a byte-for-byte lock?

---

## Gate 4 — Ingredient & RM Screening

6 of 7 F1 items implemented (`SG04` in `gateReadiness.ts`) — same Key-Gate-Check + detail-guard pattern as Gates 1-3, plus two new detail-guard kinds (`registerHasRows`, `bomHasLines`/`bomIdentityComplete`) that generalize cleanly to later gates too. 2 items open: Q2 (low priority — Conditional-adjacent escape valve, not yet enforced either way) and Q3 (a Mandatory item's mapping, added 2026-07-28 after review found it was never actually sent for confirmation):

### Q1. ~~"Allergen, impurity and contaminant review where relevant" — no checkable data exists~~ — **NO LONGER NEEDED (2026-07-26)**

> **Resolved without an SME round.** Wired to `registerRowsComplete: supplierRmEvidence ['allergenStatement','impurities']` — i.e. every screened raw material must have *something* recorded in both columns. This asserts only that they are **not empty**, never a judgement on the content (that would be the invented rule the original question was worried about). It is non-vacuous by design (an untouched register does not pass), and the item is Conditional tier, so it warns rather than hard-blocks. A stricter content rule would still need the team.

<details><summary>Original question (kept for the record)</summary>



`Supplier_RM_Evidence`'s `allergenStatement` and `impurities` columns are free text, not a status/enum — there's nothing to compare against a "bad values" list without inventing what counts as "reviewed" (a blank string? a specific keyword? a Y/N column that doesn't exist yet?).

**Question:** should we add a status column (e.g. Y/N/NA) next to `allergenStatement`/`impurities` in `Supplier_RM_Evidence` specifically for this check, or is this meant to stay a manual reviewer judgement call with no automated signal?

---

</details>

### Q2. "An unresolved possible match may permit Proceed with Conditions only where a qualified reviewer has assessed it as non-critical and created a controlled action" — not implemented at all, only just noticed (2026-07-27)

This sentence follows Gate 4's Required list in the appendix but was never analysed or wired — it isn't in `F1_Gate_Readiness_Mapping_Proposal.md` either. It describes a specific escape-valve rule for the Prohibited Ingredient Watch-list's `"REVIEW - possible formula match"` status (distinct from `"Prohibited - remove"`, which `sg04-no-remove` already hard-blocks unconditionally): an unresolved possible match should **block a plain Proceed**, and be passable only via **Proceed with Conditions**, and only when a qualified reviewer has assessed it as non-critical **and** a controlled action has been created for it.

**Current behaviour:** `sg04-no-remove`'s bad-values list only checks for `"Prohibited - remove"` — a row sitting at `"REVIEW - possible formula match"` does not block Gate 4 at all today, plain Proceed included. That is looser than the appendix describes.

**Why this isn't simply wired like the other items:** the two conditions in the sentence have no matching field yet —
- "a qualified reviewer has assessed it as non-critical" — the register has an `owner` (free text) and `evidenceLink`, but no explicit critical/non-critical assessment column.
- "created a controlled action" — is this a real linked `NextAction` record (the app's existing F8 workflow), or just a note in the register's own `notes` column?

**Question:** how should each of these be represented in the data model — e.g., a new `reviewerAssessment` (Critical/Non-critical) column on `Prohibited_Ingredients`, and should "controlled action" require an actual open `NextAction` linked to that row, or is a free-text note sufficient? Once that's answered, the enforcement itself follows the same soft-lock pattern already used for open Change Control records (F9/C4: blocks plain Proceed, requires acknowledgement, allowed only via Proceed with Conditions).

---

### Q3. "Prohibited and restricted ingredient screen" → Key Gate Check "Restrictions, exclusions and supplier risks screened" — mapping assumed, never sent for confirmation (2026-07-28)

`sg04-prohibited-screen` (`gateReadiness.ts`) reads the `gateChecks` row **"Restrictions, exclusions and supplier risks screened"** (gate '04') as the sole signal for the F1 appendix item **"Prohibited and restricted ingredient screen"**. `F1_Gate_Readiness_Mapping_Proposal.md` marks this row "✅ Implemented" with no "Needs confirmation" note, unlike most other Gate 4 rows — the mapping was judged obvious from wording alone and wired directly, the same shortcut already reverted once for `sg01-owner` (see the "Gate readiness panel rebuilt" note, 2026-07-27: a dev-made interpretive call is not exempt from SME confirmation just because it looks obvious in the moment).

**Why it might not actually be a clean match:** the Key Gate Check's own wording bundles three distinct things — "restrictions," "exclusions," and "supplier risks" — screened together as one row. "Prohibited and restricted ingredient screen" in the F1 appendix could mean specifically the ingredient-level watch-list screen (`Prohibited_Ingredients`/`PB_Caution_Limits`, already separately enforced by `sg04-no-remove` and `sg04-pb-screen`), in which case this Key Gate Check row would be evidence of a *broader* screening step (including supplier risk, which is not an ingredient-prohibition matter at all), not a dedicated confirmation of the prohibited-ingredient screen specifically.

**Question:** does "Restrictions, exclusions and supplier risks screened" fully cover what the appendix means by "Prohibited and restricted ingredient screen," or is a narrower/separate signal needed (e.g. a Key Gate Check row split into an ingredient-screen-specific line, or relying only on `sg04-no-remove`/`sg04-pb-screen` for this item and dropping the `gateCheckDone` mapping)?

---

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

## Cross-cutting (2026-07-28): "Prepared, reviewed and approved sign-off" — applies to all 12 gates, not one

**Not specific to any single gate — pulled out of the Gate 7 section because it turned out to affect every gate equally.** The F1 appendix (`docs/Response.txt`) closes **every one of the 12 gates'** Required lists with the same line: "Prepared, reviewed and approved sign-off." (worded "...review closure" for Gate 12 only). This had previously been read as referring to the app's existing PHASE-closure sign-off (`phaseCompletionChecklist`'s Prepared/Reviewed/Approved roles, `SignOffBlock`) and was deliberately left un-duplicated per gate — see the note above `GATE_READINESS` in `gateReadiness.ts` for that history.

**Decision (made by the project owner, not yet seen by the SME team):** this is a **per-GATE** requirement, distinct from the existing per-PHASE sign-off block. Concretely:

- It is satisfied when that gate's own **Phase Gate Flow row** has both **Owner** and **Evidence link** filled in — i.e. a named person has taken responsibility for the gate and left a link to their review evidence.
- Wired as a Mandatory hard-block item on **all 12 gates** (`sg01-signoff` … `sg12-signoff` in `gateReadiness.ts`).
- **Enforcement consequence:** a gate's decision can only be recorded as **Proceed** (or **Proceed with Conditions**) once Owner + Evidence link are filled in, same as any other Mandatory item.
- This is separate from, and does not replace, the existing PHASE-level sign-off (`SignOffBlock` — Prepared by / Reviewed by / Approved by, 3 named roles) that already gates a whole Phase's completion (B3). That phase-level block is unchanged.

**Two other readings were considered and rejected before landing on this one:**
- Checking a field that's guaranteed non-empty elsewhere (the way `sg01-owner` once, briefly, used `identityFieldFilled`) — rejected as vacuous; `Owner`/`Evidence link` on a gate record start blank, so this isn't that case.
- Adding a new Key Gate Check row per gate instead (the Gates-1-6 pattern for "an explicit confirmation action") — rejected in favor of the gate row's own fields, which already exist and don't require a new tick-box.

**Question for the team: is this reading correct — yes or no?** Specifically: (1) is "Owner + Evidence link filled in on the gate's own row" the right evidence for this item, across all 12 gates equally, and (2) should it truly hard-block the gate decision (no Proceed until both are filled), or did you intend something looser (e.g. a warning, not a hard block)? If the reading is wrong, please describe what evidence you actually meant.

---

## Gates 6–12 (added 2026-07-26)

**Status:** Gates 6, 7, 8, 9 and 12 are now **fully wired** (every Mandatory item hard-blocks), and Gates 10–11 are wired except the items below. Nothing in this section was previously asked, because when this document was written Gates 6–12 had not been analysed yet. Two questions that *were* raised in `F1_Gate_Readiness_Mapping_Proposal.md`'s "Needs confirmation" column for Gate 7 have since been answered from the workbook itself and need no SME round:

- *"At Gate 7, does the Pregnancy/Breastfeeding caution screen apply to **every** project, or only Skincare-for-Two ones?"* → The F1 appendix lists the Gate 7 item as **Mandatory and unconditional**, unlike the Gate 4 version which is Conditional on the trigger. It is now enforced unconditionally at Gate 7. Tell us if that reading is wrong.
- ~~*"Is a separate **gate-level** safety sign-off needed, or is the phase-level Prepared/Reviewed/Approved block sufficient at Gate 7?"*~~ — **Answered by the SME's own Gate 7 item order (2026-07-28): both are wanted.** The list the team provided names "Prepared, reviewed and approved sign-off" as its own, 10th, distinct line — separate from "Required safety reviewer approval" (the gate-level Final Safety Sign-off `owner`/`decisionDate`, already wired as `sg07-reviewer`). So the original guess (gate-level Final Safety Sign-off substitutes for the phase-level block) was wrong — this turned out to affect all 12 gates, not just Gate 7, so it's now its own cross-cutting section below ("Prepared, reviewed and approved sign-off" applies to every gate) rather than a Gate-7-only note.

**Also resolved without an SME round (2026-07-26): every gate's own Key Gate Check rows are now enforced at the gate level, not just at phase close.** Rule **B3(b)** — already confirmed by the team ("All Key Gate Checks for the phase = Done/Y (or N/A)" is mandatory) — applies to *every* Key Gate Check row, not a curated subset. A completeness sweep found 3 of the 36 Key Gate Check rows (12 gates × 3 rows each) had never been given their own gate-level check, even though B3(b) already made them mandatory in effect: Gate 7's "Pregnancy/breastfeeding and baby-contact screen completed where triggered", and all three of Gate 10's rows ("Evidence hierarchy applied and claims wording checked", "Countries/regulatory pathway matched and PIF/evidence file mapped", "Approved wording / limitations recorded") — Gate 10 was the widest gap, having none of its three rows wired — plus Gate 11's "Launch sign-off completed and blockers recorded". These are now wired the same way as the earlier `sg01-constraints`/`sg02-commercial`/`sg03-decision`/`sg05-decision` rows: moving an already-confirmed requirement earlier (gate-level instead of phase-level), not inventing a new one, so no SME question was needed.

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

