# F1/C7 — Per-Gate Open Questions for the Subject-Matter Team

**Date:** 2026-07-22 (last updated 2026-08-24)

> # ✅ ROUND 4 CLOSED — 4 questions open (R5-Q1 … R5-Q4)
>
> **All 33 Round-4 questions were answered on 2026-08-24** (`docs/rounds/2026-08-24-sme-reply-round4.md`, replying to the 36-question `docs/rounds/2026-08-12-our-questions-round4.md`). **The answers are recorded in full in `Business_Rules_Confirmation_{EN,VN}.md` → "Appendix 3 (2026-08-24)"** — that appendix, not this file, is the authoritative record; each question below now carries a one-block ✅ resolution note so the question and its answer stay together.
>
> Every `R4-Qn` heading is prefixed ✅, which is what takes it out of `verify:readiness`'s TAG sweep, and every `[ASSUMPTION: R4-Qn]` tag has been removed from the code. **Where an answer contradicts shipped behaviour, the decision site now carries `R4-REWORK: câu …` (in square brackets, with the sent question number) instead** — a marker that says "the rule is settled and this code is known to be wrong", which is a different and more useful thing than an open assumption. `npm run verify:readiness` prints the count every run. The build order for clearing them is `docs/plans/Round4_Implementation_Roadmap.md`.
>
> **The only open questions in this file are Round 5's four** (`R5-Q1` … `R5-Q4`, raised while implementing D1 at phase level) plus whatever the Round-4 answers themselves left ambiguous — added to that same section.
>
> <details><summary>Round 3 banner (settled history)</summary>
>
> The subject-matter team answered every question here in their Round 3 reply (`docs/rounds/2026-08-07-sme-reply-round3.txt`), sent as Parts A–E — the questions that reply answers are `docs/rounds/2026-07-31-our-questions-round3.md` (recovered into the folder on 2026-08-11; note its `A1`/`A2`/`A3` are a different three topics from Round 2's). **The answers are recorded in full in `Business_Rules_Confirmation_{EN,VN}.md` → "Appendix 2 (2026-08-07)"** — that appendix, not this file, is the authoritative record. Each section below now carries a short ✅ resolution note pointing at the part of the reply that answers it, so the question and its answer stay together for anyone re-reading the history.
>
> **The Round-3 questions are closed; the file is not.** Twenty-four new questions — raised *while implementing* those answers and *while designing* the Conditional triggers — are in the final section, **"Round 4"**, each with a stable ID (`R4-Q1` … `R4-Q24`). Everything above that section is settled history.
>
> **This file is the only question list.** Other documents (notably `F1_Conditional_Triggers.md`) reference these IDs instead of keeping a parallel list, and every decision site — code and docs alike — carries a grep-able `[ASSUMPTION: R4-Qn]` tag, so "show me every unconfirmed assumption" is a search rather than a manual audit.
>
> Four Round-3 answers **overturn behaviour already built** — the per-gate sign-off (D1), two of the four Published-Information claim rules (D2), the unconditional pregnancy screen at Gate 7 (E1) and the project-level treatment of Gates 10–11 (E3a); see "What this round changes in the application" in Appendix 2 for the consolidated work list.
>
> </details>

**Companion to:** `F1_Gate_Readiness_Mapping_Proposal.md` (the full per-gate mapping proposal — now superseded/stale, kept only as historical reference; do not send it to the team) and `Business_Rules_Followup_Round2.md` §B ("we will map your per-gate lists to the specific registers in the app and tag each as Mandatory/Conditional/Supporting — we will send that mapping back to you to confirm").

**How this file works:** as each gate's F1 items get implemented, most turn out to be a mechanical mapping to a register/field that already exists — those are coded directly (no team input needed) and are **not** listed here. This file collects only the items that turned out to be **genuinely ambiguous or missing data** once we tried to wire them — one section per gate, added as we go. **All 12 gates have now been analyzed** — every remaining open item across Gates 1–12 is listed below, plus three cross-cutting sections (tier-assignment methodology; the Supplier & RM Evidence / Formula BOM gating design; and "Prepared, reviewed and approved sign-off" applying to all 12 gates). This is the file to send to the subject-matter team for confirmation.

---

## Cross-cutting (2026-07-27): tier assignment from "where applicable" / "where relevant" wording — ✅ CONFIRMED 2026-08-07 (Round 3 A1: *"Your rule is broadly correct … The tier assignments in your table are accepted, with two adjustments … All other assignments are accepted"*)

**What we found:** re-reading the F1 appendix (`docs/rounds/2026-07-21-sme-reply-F1-F14.txt`) closely, every gate's item list sits under one flat **"Required:"** heading — the appendix does not tag any individual item as Mandatory, Conditional or Supporting. Those three tiers are only defined once, up front, as a general framework:

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

> ### ✅ Answered (2026-08-07) — Response2 Parts A1, A2, A3
>
> - **The tiering rule is confirmed** ("broadly correct"), with the three tier definitions restated: Mandatory always hard-blocks · Conditional hard-blocks **only when its defined trigger applies** · Supporting does not automatically block, but unresolved risk may require a warning, an action or a Proceed-with-Conditions decision. The tier table above is accepted, with **two reassignments**: Gate 12 "Change-control links" Supporting → **Conditional** (triggered by a complaint / post-market finding / CAPA / formula or artwork change / safety signal / improvement action having generated a Change Control record), and Gate 12 "Market feedback" stays Supporting for routine lifecycle review but becomes **Conditional once the project has launched and a scheduled post-market review is due**.
> - **Gate 6 "Market-specific pack requirements" = Conditional** (our inconsistency table was resolved in favour of Conditional), triggered by a market requirement affecting language / mandatory warnings / ingredient declaration / responsible-party details / notification or registration numbers / pack size / tamper evidence / barcode or traceability / recycling markings / primary or secondary packaging information. Where none applies, **N/A with a rationale must be recorded** — blank is not the same as not-applicable.
> - **All 9 missing triggers were supplied**, plus definitions for the Supporting items that can escalate. The full trigger table is in Appendix 2 → A3. Costing/commercial feasibility stays Supporting, but the project owner may place the project on **Hold** where commercial feasibility is essential.
>
> **Consequence:** the "permanently advisory in practice" gap described above is closed as a *rule* question. It is not yet closed as an *implementation* one — several triggers read data the app does not capture (project/change type, microbiological susceptibility, raw-material composition risk, per-claim classification), so wiring them depends on the new capture confirmed in Part B.

---

## Gate 1 — Opportunity & Request

2 of the 5 F1 items for Gate 1 are now implemented in `packages/shared/src/config/gateReadiness.ts` (`SG01`), reading real "Key Gate Check" rows (`ProjectData.gateChecks`, the same data behind the "Key Gate Checks" table on the Phase 1 page):

- "Product request record" → reads the check row **"Product request, opportunity and requester captured"**
- "Project owner" → reads the check row **"Initial project record opened and owner assigned"**. *(Corrected 2026-08-07: this line used to say the item was auto-satisfied from the moment the project exists, since Project Lead is a required field on the Create New Project form. That mapping was withdrawn in the code on 2026-07-26 — it conflated "the underlying fact is guaranteed" with "the confirmation step is redundant", and every sibling Key Gate Check requires an explicit tick regardless. Never asked of the team; see `Business_Rules_Confirmation_EN.md` → Project lifecycle authority → D5.)*

The other 3 items are **not** implemented — because the underlying data doesn't cleanly exist yet, not because of a mapping preference:

### Q1. "Request source" — was reusing "Product request record"'s evidence; reopened

We had initially read this the same way as "Product request record", on the theory that the Key Gate Check row's wording ("...requester captured") already covers where the request came from. **That was our own assumption, not confirmed by you** — correctly challenged: the appendix lists "Product request record" and "Request source" as two separate lines with no further detail, and if a single piece of evidence covered both, we'd expect them written as one line. We've reverted this item to unimplemented rather than keep a guessed mapping.

**Question:** is "Request source" a distinct piece of information from the requester who filed the request (e.g. *where* the request originated — internal proposal, customer feedback, distributor request, market research, regulatory change, etc.)? If yes, please confirm the exact wording of the field/options you'd want recorded, the same way the existing rows were transcribed verbatim from the workbook.

> ✅ **Answered (2026-08-07) — Response2 B1.** Yes, distinct from the person who submitted the request. Add a field **"Request Origin / Source"** with 15 supplied options (Internal product-development proposal · Management request · Sales request · Marketing request · Customer request · Distributor request · Healthcare-professional request · Consumer feedback · Complaint or post-market signal · Market research or identified opportunity · Competitor or benchmark response · Regulatory change · Supplier or ingredient opportunity · Manufacturing or quality improvement · Reformulation or lifecycle improvement · Other — specify). **The requester's name and department remain separate fields.** Reverting the guessed mapping was the right call.

### Q2. "Initial product scope" — no matching field exists

The only other Key Gate Check at Gate 1 is **"Initial constraints, known deadlines and risk flags recorded"**. That is not the same thing as "scope" — a team member could tick it (constraints/deadlines/risks captured) without ever having recorded what the product actually *is*. Using it as a stand-in would create a false "ready" signal: the gate could show as passed while nobody has actually written down the initial product scope.

**Question:** should we add a **new** Key Gate Check row for Gate 1, e.g. *"Initial product scope defined"*, alongside the existing 3? If yes, please confirm the exact wording you'd want recorded (we'd transcribe it verbatim, the same way the existing 3 rows were transcribed from the workbook).

> ✅ **Answered (2026-08-07) — Response2 B2.** Yes. Add the Key Gate Check **"Initial product scope defined"** (our proposed wording, confirmed verbatim). Its supporting field briefly captures: proposed product type · intended purpose · whether this is new development, reformulation, claim change, packaging change, market extension or lifecycle improvement · known boundaries of the request.

### Q3. "Initial target market and user" — the only matching data belongs to Gate 2, not Gate 1

The app's only target-market/target-user data (`checklists['targetMarkets']`, `checklists['targetUsers']`) is explicitly tagged **Gate 02** in the phase config (`packages/shared/src/config/phases.ts`), not Gate 01 — it's the fuller "Target User & Brief" selection (life stage, body area, full market list). The F1 Appendix calls Gate 1's version "**initial**" target market and user, which reads as a distinct, rougher capture at the opportunity stage — not the same data as Gate 2's refined selection.

**Why this matters (not just wording):** if we hard-block Gate 1 on the Gate-02-tagged checklist, we'd effectively force the team to finish Gate 2's full target-user/market work before Gate 1 can even close — collapsing two gates into one and contradicting the phase's own gate order (SG01 → SG02 → SG03 unlock sequentially, per `PHASE_1.gateIds`).

**Question:** which do you want?
- **(a)** A separate, lightweight "initial market/user" capture at Gate 1 (e.g. a new Key Gate Check row, or a short free-text/tag field) that's distinct from Gate 2's full selection, or
- **(b)** Treat this as effectively already covered by "Product request, opportunity and requester captured" (i.e. no separate signal needed — Gate 1 doesn't need its own market/user field at all, and the F1 Appendix wording is just descriptive, not a distinct required item)?

> ✅ **Answered (2026-08-07) — Response2 B3: option (a).** Add a lightweight Gate 1 capture — **"Initial target user / life-stage"** and **"Initial target market(s)"**. These are explicitly preliminary and **do not replace** the full Gate 2 assessment; Gate 2 confirms, refines and formally approves them. The "collapsing two gates into one" concern raised above is therefore avoided by design.

---

## Gate 2 — Target User & Brief

4 of 6 F1 items implemented (`SG02` in `gateReadiness.ts`): "Target user and life stage", "Intended use and body area" and "Selected markets" each read BOTH the matching Key Gate Check row done+Y/NA AND the underlying detail checklist actually having a real selection (merged into one visible line per item, 2026-07-26, user-requested — see the "detailed selection recorded" discussion). "Vulnerable-user flags" reuses the same evidence as "Target user and life stage" — see **Q2 below, reopened for confirmation**.

2 items are still not implemented (`manual`):

### Q1. "Approved development brief" — no matching field exists anywhere

Checked every candidate: not a Key Gate Check row (the 3 Gate-02 rows are about target user/markets/commercial planning, not a "brief" document), not a Phase 1 checklist section, not a field on `ProjectIdentity`. There is currently no representation of "the brief" as a discrete, approvable artifact anywhere in the data model.

**Question:** does "approved development brief" mean a **separate document/link** we should add a field for (e.g. on the Project Identification card, or a new Key Gate Check row), or does it mean **the combination of the 4 Phase 1 checklist sections** (Target Area, Product Type, Target Users, Target Markets) — i.e., once those are filled in, that collectively *is* the brief, and no new field is needed, just an aggregate check that all 4 sections have at least one selection?

> ✅ **Answered (2026-08-07) — Response2 B4: option (a).** The brief is a **discrete controlled record or linked document**, not an inference from completed checklists. Add: **Development Brief status · Development Brief link · Brief version · Brief owner · Approval date.** The four Phase 1 checklist sections *contribute to* the brief but explicitly **do not substitute** for formal brief approval.

### Q2. "Vulnerable-user flags" — reopened for confirmation (interim decision in place, not yet SME-confirmed)

**Currently implemented as an interim decision, 2026-07-26 — reopened by the project owner to get this exactly right rather than leave it as our own call.** The only vulnerable-user data in the app is the `targetUsers` checklist itself (`Pregnancy`, `Breastfeeding`, `Postpartum`, `Infant 0+`, `Child 2+/3+`, `Sensitive skin`, `Cancer patient support`, `Kidney disease support`, etc. — the same list `skincareForTwoTriggers()` already reads for the C1 safety screen), mixed in the same table alongside plain life-stage options (`General adult`, `Family use`, `Swimmers`, …) — there is no separate "vulnerable flags" table in the workbook. So today "Vulnerable-user flags" is wired to `checklistHasSelection: targetUsers` — the same evidence as "Target user and life stage" (they share one Key Gate Check and this one checklist). Reusing one piece of evidence for two appendix items has precedent here (Gate 1's "Product request record" and "Request source" also share one Key Gate Check), but that precedent is itself a judgment call, not something the team confirmed either — so treat this whole pattern as still open, not settled.

**What this means concretely:** the item is satisfied as soon as the `targetUsers` checklist has ANY selection at all — even a plain "General adult" product with no vulnerable flag ticked counts as satisfied. There is no distinct signal for "we specifically considered whether this product touches a vulnerable-use group."

**Question:** is that acceptable, or do you want something stricter tied to whether a vulnerable label is actually selected? Two candidates if stricter:
- (a) Keep it as-is — satisfied once the `targetUsers` checklist has any selection, regardless of which option (current behavior); or
- (b) Require a distinct step once a vulnerable label IS selected — e.g. an additional acknowledgement/note — before Gate 2 can proceed, so the two ideas ("a life stage was picked" vs. "a vulnerable-use group was flagged") are no longer collapsed into one signal.

> ✅ **Answered (2026-08-07) — Response2 B5: option (b).** The system must distinguish selecting a target user from explicitly recognising a vulnerable-use context. Where any vulnerable group is selected, require: **explicit vulnerable-user flag · applicable safety pathway · responsible reviewer · notes on additional assessments required.** Vulnerable triggers: Pregnancy · Breastfeeding · Postpartum · Infant 0+ · Young child · Sensitive or compromised skin · Oncology or medically vulnerable support context · Renal or other health-related support context · any population Safety or Regulatory identifies as needing enhanced review. **A general-adult project must still record "No vulnerable-user group identified"** rather than being satisfied by default — i.e. the current behaviour described above is explicitly rejected.
>
> *Note on the shared-evidence pattern:* this answer also settles, by example, the wider precedent flagged in this question — two appendix items sharing one piece of evidence is not acceptable where the two ideas are genuinely distinct. The same reasoning is what closed Gate 1 Q1 (Request source) and Gate 4 Q3 (prohibited-ingredient screen).

### Q3. "Project requirements and exclusions" — Phase 1 has no requirement-table data at all

`PHASE_1.requirementSections` is an **empty array** in `packages/shared/src/config/phases.ts` — Phases 2, 3 and 4 all have real requirement rows, but Phase 1 was transcribed with none. So `project.requirements` has no Phase-1 keys to check against; this isn't a wrong-mapping problem, there is simply nothing to point at yet.

**Question:** should we add a Phase 1 requirement section (and if so, what rows — e.g. minimum viable requirements, exclusions/claims not to pursue, budget/timeline constraints)? Or does "requirements and exclusions" already live somewhere else we haven't found (e.g. free text in an existing checklist item's notes field)?

> ✅ **Answered (2026-08-07) — Response2 B6.** Yes, add a Phase 1 requirements section, as a structured table (**category · requirement · priority · owner · notes**) with 16 rows: Must-have product requirements · Must-not-have ingredients or features · Intended claims · Claims not to pursue · Target pH or physical requirements where known · Sensory requirements · Packaging requirements · Target cost or commercial boundary · Target timeline · Target markets · Regulatory constraints · User/life-stage constraints · Benchmark or reference product · Known technical risks · Explicit exclusions · Other project assumptions. Note this is a **richer shape than Phases 2–4's requirement tables** (which have no category/priority/owner columns), so it is not simply a matter of filling in `PHASE_1.requirementSections` with the existing row model.

---

## Gate 3 — Product Concept & Claims

4 of 6 F1 items implemented (`SG03` in `gateReadiness.ts`), same pattern as Gates 1-2: Key Gate Check rows as the primary signal, plus a `checklistHasSelection` detail guard where a matching checklist section exists (`claimAreas`, `evidenceRoute`). Also wired the pre-existing Gate 03 Key Gate Check that wasn't one of the 6 F1-named items ("Gate 1-3 decision and open actions recorded") for the same reason as Gate 1's "constraints" row and Gate 2's "commercial planning" row.

2 items are not implemented. **Corrected 2026-07-31 (this paragraph previously said both were Conditional tier and therefore low priority — that was wrong for Q1):** `sg03-classification` ("Preliminary claim classification") is **Mandatory** in `gateReadiness.ts`, correctly so under the tier rule in the cross-cutting section above (its appendix wording carries no qualifier). It does not block today only because its check is `manual` — i.e. `pending`, so no data source exists to evaluate — not because of its tier. Wire it and it hard-blocks Gate 3 for real, which puts it in the SAME priority band as the still-open Mandatory items on Gates 1-2, not below them. Only Q2 is genuinely Conditional (never hard-blocks while its "high-risk/borderline" trigger is undefined).

### Q1. "Preliminary claim classification" — no field represents a claim's classification/risk tier (Mandatory)

`claimAreas` only lists benefit *wording* (Moisturising, Brightening, Anti-redness appearance, etc.) — there's no attribute anywhere marking a claim as, say, cosmetic vs. functional vs. medical-adjacent, or low-risk vs. high-risk.

**The workbook itself shows the team already does this classification informally, with nowhere to record the result:** the `claimAreas` option list is written defensively — `Stretch mark appearance` / `Scar appearance` / `Blemish appearance` / `Anti-redness appearance` all say *appearance* rather than a treatment verb, `Itch relief support` / `Barrier support` add *support*, and `Pregnancy suitable` / `Breastfeeding suitable` say *suitable* rather than *safe*. Each of those word choices IS a claim-classification decision (keeping the claim on the cosmetic side of the cosmetic/therapeutic line), made while transcribing the sheet and then lost, because no field captures it.

**Question:** should we add a classification field per selected claim area (e.g. a dropdown next to each `claimAreas` row), or is "preliminary claim classification" meant as a single project-level judgement (e.g. one field: "this concept's claims are/aren't borderline")?

> ✅ **Answered (2026-08-07) — Response2 B7: per-claim classification**, explicitly *not* project-level ("a single project-level classification would be too broad because different claims within one project can carry different risk"). Two controlled dropdowns per claim — **Claim category** (Cosmetic · Product performance · Sensory · Ingredient-level · Safety/tolerance · Environmental or sustainability · Professional or technical information · Borderline / therapeutic-adjacent · Therapeutic — not permitted within the cosmetic claim pathway · Other — Regulatory review required) and **Claim risk** (Low · Medium · High · Prohibited / not acceptable · Pending classification) — plus 9 further attributes: exact proposed wording · applicable SKU · applicable market · intended channel · evidence required · evidence status · Regulatory review required Y/N · approved wording · limitations or mandatory qualifiers. Both axes we offered as alternatives are wanted, as two separate fields.

### Q2. "Regulatory review of high-risk or borderline claims" — depends on the same undefined "high-risk/borderline" flag as Q1

This is the Gate 3 instance of the same gap `Business_Rules_Followup_Round2.md` §A1 already flags for "critical" — we don't yet have a confirmed definition of what makes a claim high-risk/borderline, so there's nothing to trigger this Conditional item on. Once Q1 (or Round 2's A1) is answered, this item likely follows directly.

> ✅ **Answered (2026-08-07) — Response2 C1, and it did follow directly from Q1 as predicted.** The trigger uses the per-claim classification from B7. Regulatory review is mandatory where: category = Borderline / therapeutic-adjacent · category = Therapeutic — not permitted · risk = High · the wording is not in the approved Claims Library · the claim varies from previously approved wording · the market imposes a specific restriction · the claim relates to pregnancy, breastfeeding, infant use, disease, treatment, prevention, healing or medical endorsement. **Dependency to note:** the "not in the approved Claims Library" condition cannot be evaluated until that library's content exists (F11's outstanding content input).

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

> ⚠️ **Answered (2026-08-07) — Response2 D2. Three of the four design choices are changed; rework required.**
>
> - **(1) Claim ID becomes required**, not optional, for every external product-benefit, safety, efficacy, performance or suitability statement. It stays optional **only** for genuinely non-product corporate information containing no product claim or technical statement.
> - **(2) The picker must offer Developing/Pending claims** — "the purpose is to document the intended claim early", exactly the reading floated in the question. What a Pending claim must not allow is Approved for Release · Released · final artwork approval · external publication.
> - **(3) No absolute character-for-character lock.** Hold **master approved wording** and **proposed channel wording** side by side, plus a comparison/review status and reviewer approval. Minor adaptation is allowed where meaning, scope, qualifiers and evidence burden are unchanged; any material change must create a new or revised claim record. Automated similarity checking may be used **as a warning only** — final equivalence is confirmed by an authorised reviewer.
> - **(4) The release block is confirmed and widened:** the linked claim must be Supported **and approved for the relevant SKU, formula version, market and channel** before content can reach Approved for Release or Released.

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

> ✅ **Answered (2026-08-07) — Response2 D3, with a fuller field list and a 4-way rule than we proposed.** Each flagged watch-list result gains: **Reviewer assessment** (Critical · Non-critical · Not a true match · Further information required — four values, not the two we suggested) · Reviewer · Review date · Rationale · Evidence link · **Linked Next Action ID** · Resolution status. **A genuine controlled Next Action is required; a note alone is not sufficient.** Enforcement per assessment: *Critical* hard-blocks both Proceed and Proceed with Conditions · *Further information required* blocks Proceed, allows Proceed with Conditions only with authorised acceptance and a linked controlled action · *Non-critical* blocks plain Proceed until assessment, rationale and action are recorded, then permits Proceed with Conditions · *Not a true match* may be closed once reviewer rationale and evidence are recorded.

---

### Q3. "Prohibited and restricted ingredient screen" → Key Gate Check "Restrictions, exclusions and supplier risks screened" — mapping assumed, never sent for confirmation (2026-07-28)

`sg04-prohibited-screen` (`gateReadiness.ts`) reads the `gateChecks` row **"Restrictions, exclusions and supplier risks screened"** (gate '04') as the sole signal for the F1 appendix item **"Prohibited and restricted ingredient screen"**. `F1_Gate_Readiness_Mapping_Proposal.md` marks this row "✅ Implemented" with no "Needs confirmation" note, unlike most other Gate 4 rows — the mapping was judged obvious from wording alone and wired directly, the same shortcut already reverted once for `sg01-owner` (see the "Gate readiness panel rebuilt" note, 2026-07-27: a dev-made interpretive call is not exempt from SME confirmation just because it looks obvious in the moment).

**Why it might not actually be a clean match:** the Key Gate Check's own wording bundles three distinct things — "restrictions," "exclusions," and "supplier risks" — screened together as one row. "Prohibited and restricted ingredient screen" in the F1 appendix could mean specifically the ingredient-level watch-list screen (`Prohibited_Ingredients`/`PB_Caution_Limits`, already separately enforced by `sg04-no-remove` and `sg04-pb-screen`), in which case this Key Gate Check row would be evidence of a *broader* screening step (including supplier risk, which is not an ingredient-prohibition matter at all), not a dedicated confirmation of the prohibited-ingredient screen specifically.

**Question:** does "Restrictions, exclusions and supplier risks screened" fully cover what the appendix means by "Prohibited and restricted ingredient screen," or is a narrower/separate signal needed (e.g. a Key Gate Check row split into an ingredient-screen-specific line, or relying only on `sg04-no-remove`/`sg04-pb-screen` for this item and dropping the `gateCheckDone` mapping)?

> ✅ **Answered (2026-08-07) — Response2 C2: a narrower signal is needed.** The suspicion above was correct. Keep *"Restrictions, exclusions and supplier risks screened"* as the **broader** Gate 4 check, and add a **separate Mandatory item: "Prohibited, restricted and caution ingredient screen completed"**, drawing directly from the automated watch-list results and the associated qualified review.

---

## Gate 5 — Formula Design & Development

6 of 8 F1 items implemented (`SG05` in `gateReadiness.ts`) — same Key-Gate-Check + detail-guard pattern as Gates 1-4, but the detail guard is new: a `requirementDone` check reading `ProjectData.requirements` (PHASE_2's `formulationDesign`/`efficacyProcess` requirement-table rows already matched most F1 wording almost verbatim). Plus the BOM checks relocated from Gate 4 (see that gate's note above). 2 items open, both low priority (never hard-block regardless of the answer):

### Q1. "Preservative strategy where applicable" — no data source and no defined trigger (Conditional)

None of Phase 2's requirement rows are preservative-specific. Even if they were, "where applicable" needs a trigger condition — same open gap noted for Gate 9's preservative item in the mapping doc.

**Question:** is "applicable" meant to key off a product-type flag (e.g. "contains water" / "aqueous formula") that doesn't exist in the data model yet? If so, where should that flag live — a new Phase 1 checklist option, or a BOM/costing field?

> ✅ **Answered (2026-08-07) — Response2 A3.** The trigger is: **water-containing, water-available, multi-use or otherwise microbiologically susceptible products.** N/A is permitted for genuinely anhydrous, self-preserving, sterile or single-use products **with a documented rationale**. So yes — it keys off a formula property the data model does not hold today; **where that property lives is our design call** (the team specified the rule, not the field). The same property also drives Gate 9's preservative-efficacy trigger, so it should be modelled once.

### Q2. "Costing or commercial feasibility status" — `CostingInputs` has no status field (Supporting)

`CostingInputs` (batchSizeKg, fillSizeG, targetUnits, packagingCostPerUnit, ...) is always pre-filled with non-blank defaults from project creation — there's no status/completion field to check, and inventing one (e.g. "values differ from the hardcoded defaults") would mean guessing what counts as "considered."

**Question:** should a status field be added to `CostingInputs` (e.g. Not Started/In Progress/Completed), or is this meant to stay a manual, un-tracked judgement call? Low priority either way — Supporting tier never blocks.

> ✅ **Answered (2026-08-07) — Response2 A3, closing line.** "Costing or commercial feasibility may remain **Supporting**, although the accountable project owner may still place the project on **Hold** where commercial feasibility is essential to continuation." The tier is settled and the escalation route is an existing mechanism (Hold), so no new blocking logic is needed. Whether to add a status field to `CostingInputs` was not answered and is now **ours to decide** — low impact either way.

---

## Cross-cutting (2026-07-22): Formula BOM gated on Supplier & RM Evidence

**Not an F1 item — a dev decision made while implementing Gate 4/5, confirmed with the user, not yet run past the SME team.** Following the same Gate 4 (ingredient screening) → Gate 5 (formula lock) sequencing already established (`registers.ts`'s `linkedGate` tags), the Formula BOM's Cosmetri raw-material picker (`BomCosting.tsx`) now only offers materials that already have a `Supplier_RM_Evidence` row — a manually-picked BOM line pointing at a material with no evidence record blocks Save (mirrors the existing duplicate/empty-raw-material guards).

**Full-formula Cosmetri import (`CosmetriImportModal.tsx`, `fromCosmetri` lines) is not blocked by this**, since a whole formula's composition doesn't go through the per-line picker — but it no longer silently bypasses the traceability goal either: importing now **auto-creates an identity-only `Supplier_RM_Evidence` stub row** (`rmCode`/`inciName`/`supplier`/`grade` filled from the import data) for any material that doesn't already have one, leaving the actual evidence columns (SDS/CoA/TDS/allergen/etc.) blank for R&I/Procurement to fill in afterward. This was the user's explicit choice over two alternatives (hard-blocking the import entirely, or leaving it fully exempt).

**Question for the team:** does auto-creating a stub evidence record on import match intended practice, or should a formula import instead require every material to already have a *complete* evidence record (hard block, no stub-creation) before it can be imported at all?

> ✅ **Answered (2026-08-07) — Response2 D4: the stub is "acceptable and preferred".** A formula import must not fail merely because the MBc360 evidence record has not been populated yet. **Five conditions apply, and three are not met by the current implementation:** the stub must be clearly labelled **"Incomplete — evidence review required"** (not implemented) · it must **not** default to Approved for Use (already the case) · missing evidence must appear in **Gate Readiness** (not implemented) · **Gate 4 must not pass until all applicable raw materials are adequately reviewed or formally accepted through a controlled conditional decision** (not implemented — today Gate 4 does not read stub completeness at all) · Gate 7 final safety approval must use the completed evidence status · **Gates 10 and 11 must not rely on unresolved identity-only stubs.**

---

## Cross-cutting (2026-07-28): "Prepared, reviewed and approved sign-off" — applies to all 12 gates, not one

**Not specific to any single gate — pulled out of the Gate 7 section because it turned out to affect every gate equally.** The F1 appendix (`docs/rounds/2026-07-21-sme-reply-F1-F14.txt`) closes **every one of the 12 gates'** Required lists with the same line: "Prepared, reviewed and approved sign-off." (worded "...review closure" for Gate 12 only). This had previously been read as referring to the app's existing PHASE-closure sign-off (`phaseCompletionChecklist`'s Prepared/Reviewed/Approved roles, `SignOffBlock`) and was deliberately left un-duplicated per gate — see the note above `GATE_READINESS` in `gateReadiness.ts` for that history.

**Decision (made by the project owner, not yet seen by the SME team):** this is a **per-GATE** requirement, distinct from the existing per-PHASE sign-off block. Concretely:

- It is satisfied when that gate's own **Phase Gate Flow row** has both **Owner** and **Evidence link** filled in — i.e. a named person has taken responsibility for the gate and left a link to their review evidence.
- Wired as a Mandatory hard-block item on **all 12 gates** (`sg01-signoff` … `sg12-signoff` in `gateReadiness.ts`).
- **Enforcement consequence:** a gate's decision can only be recorded as **Proceed** (or **Proceed with Conditions**) once Owner + Evidence link are filled in, same as any other Mandatory item.
- This is separate from, and does not replace, the existing PHASE-level sign-off (`SignOffBlock` — Prepared by / Reviewed by / Approved by, 3 named roles) that already gates a whole Phase's completion (B3). That phase-level block is unchanged.

**Two other readings were considered and rejected before landing on this one:**
- Checking a field that's guaranteed non-empty elsewhere (the way `sg01-owner` once, briefly, used `identityFieldFilled`) — rejected as vacuous; `Owner`/`Evidence link` on a gate record start blank, so this isn't that case.
- Adding a new Key Gate Check row per gate instead (the Gates-1-6 pattern for "an explicit confirmation action") — rejected in favor of the gate row's own fields, which already exist and don't require a new tick-box.

**Question for the team: is this reading correct — yes or no?** Specifically: (1) is "Owner + Evidence link filled in on the gate's own row" the right evidence for this item, across all 12 gates equally, and (2) should it truly hard-block the gate decision (no Proceed until both are filled), or did you intend something looser (e.g. a warning, not a hard block)? If the reading is wrong, please describe what evidence you actually meant.

> ⚠️ **Answered (2026-08-07) — Response2 D1: "the current implementation is not sufficient."** The half we got right: it **is** a per-gate requirement, distinct from the phase-level block, and it **does** hard-block the gate decision. The half we got wrong: **Owner + Evidence link is not equivalent to Prepared, Reviewed and Approved.** Each gate must carry **three distinct recorded sign-offs** — Prepared by, Reviewed by, Approved by — each capturing **authenticated user · role · date/time · decision · record version · comment where required**. The phase-level sign-off block remains as an additional phase-closure approval and is **not** replaced. Where risk is low the same person may prepare multiple gate records, but **the reviewer or approver must be independent for safety-, regulatory-, claims- or release-critical decisions** (consistent with F6's "contributors cannot approve their own approval-critical work").
>
> **Rework:** `sg01-signoff` … `sg12-signoff` currently read the gate row's `owner`/`evidenceLink`. They need a real gate-level sign-off record instead — closest existing model is the phase `SignOffBlock` plus the F6 electronic-approval field list. This is the largest single item in the round.

---

## Gates 6–12 (added 2026-07-26)

**Status:** Gates 6, 7, 8, 9 and 12 are now **fully wired** (every Mandatory item hard-blocks), and Gates 10–11 are wired except the items below. Nothing in this section was previously asked, because when this document was written Gates 6–12 had not been analysed yet. Two questions that *were* raised in `F1_Gate_Readiness_Mapping_Proposal.md`'s "Needs confirmation" column for Gate 7 have since been answered from the workbook itself and need no SME round:

- *"At Gate 7, does the Pregnancy/Breastfeeding caution screen apply to **every** project, or only Skincare-for-Two ones?"* → ~~The F1 appendix lists the Gate 7 item as **Mandatory and unconditional**, unlike the Gate 4 version which is Conditional on the trigger. It is now enforced unconditionally at Gate 7.~~ ⚠️ **That reading was wrong — corrected by the team 2026-08-07 (Response2 E1).** It is **not** unconditional: it is mandatory **when Pregnancy, Breastfeeding or Postpartum is selected** (same trigger as Gate 4); **infant-only products trigger the Infant/Baby Safety pathway instead** (consistent with F2); general products **record N/A with a rationale** where neither pathway applies. This is a concrete instance of the standing lesson that inferring a rule from the *absence* of a qualifier is a guess, not a reading — the same mistake as the two Gate 3 tier promotions reverted on 2026-07-27.
- ~~*"Is a separate **gate-level** safety sign-off needed, or is the phase-level Prepared/Reviewed/Approved block sufficient at Gate 7?"*~~ — **Answered by the SME's own Gate 7 item order (2026-07-28): both are wanted.** The list the team provided names "Prepared, reviewed and approved sign-off" as its own, 10th, distinct line — separate from "Required safety reviewer approval" (the gate-level Final Safety Sign-off `owner`/`decisionDate`, already wired as `sg07-reviewer`). So the original guess (gate-level Final Safety Sign-off substitutes for the phase-level block) was wrong — this turned out to affect all 12 gates, not just Gate 7, so it's now its own cross-cutting section below ("Prepared, reviewed and approved sign-off" applies to every gate) rather than a Gate-7-only note.

**Also resolved without an SME round (2026-07-26): every gate's own Key Gate Check rows are now enforced at the gate level, not just at phase close.** Rule **B3(b)** — already confirmed by the team ("All Key Gate Checks for the phase = Done/Y (or N/A)" is mandatory) — applies to *every* Key Gate Check row, not a curated subset. A completeness sweep found 3 of the 36 Key Gate Check rows (12 gates × 3 rows each) had never been given their own gate-level check, even though B3(b) already made them mandatory in effect: Gate 7's "Pregnancy/breastfeeding and baby-contact screen completed where triggered", and all three of Gate 10's rows ("Evidence hierarchy applied and claims wording checked", "Countries/regulatory pathway matched and PIF/evidence file mapped", "Approved wording / limitations recorded") — Gate 10 was the widest gap, having none of its three rows wired — plus Gate 11's "Launch sign-off completed and blockers recorded". These are now wired the same way as the earlier `sg01-constraints`/`sg02-commercial`/`sg03-decision`/`sg05-decision` rows: moving an already-confirmed requirement earlier (gate-level instead of phase-level), not inventing a new one, so no SME question was needed.

### Q1. "No unresolved critical safety finding" (Gate 7) — no separate field exists for it

Gate 7 is now enforced by requiring **all 10 Final Safety Sign-off questions** to be Completed (including the last one, "Final safety release"), plus a safety decision recorded against every ingredient in the safety matrix. We treat that as being the same thing as "no unresolved critical safety finding" — there is no separate "critical finding" flag anywhere in the workbook.

**Question:** is that acceptable, or do you want a **distinct field** (e.g. a "Critical safety finding: Yes/No + description" row) that must be explicitly cleared before Gate 7 can pass? This links to Round-2 question **A1** (the definition of "critical").

> ✅ **Answered (2026-08-07) — Response2 E1: a distinct control is required.** The Final Safety Sign-off alone is not sufficient. Add: **Critical safety finding identified (Yes/No) · Finding description · Affected ingredient/formula/use context · Severity · Required action · Owner · Status · Safety reviewer conclusion · Evidence link.** **Gate 7 cannot pass while any critical safety finding is open.** (`sg07-no-critical` therefore stops sharing `sg07-final-safety`'s check and gets its own data source, as the config comment anticipated.)

### Q2. "Applicable regulatory checklist (per market)" (Gate 10) — only the ASEAN checklist exists

The app has a complete ASEAN PIF checklist, but the non-ASEAN equivalents (EU CPSR, Australia, US) are the **F10 / C5 "Market Dossier Profile"** work that is confirmed in principle but not yet supplied as content. We have deliberately **not** enforced the ASEAN checklist for all projects, because that would wrongly block a product that is not being sold in ASEAN.

**Question:** until the per-market profiles exist, should Gate 10 (a) stay unenforced on this item, (b) enforce the ASEAN checklist only for projects whose markets include an ASEAN country, or (c) something else?

> ✅ **Answered (2026-08-07) — Response2 E2: option (b), plus an interim record.** Enforce the ASEAN checklist **only where an ASEAN market is selected**. For non-ASEAN markets, require a temporary **Regulatory Checklist Status** capturing: applicable market · required dossier type · owner · checklist or evidence link · status · Regulatory approval. Explicitly: **"the absence of a built-in country template should not mean the item is unenforced"** — Regulatory may link an approved external checklist until the app profile is configured. So option (a) is rejected even as a stopgap.

### Q3. Three items are per-market and need the F4 decision first

These cannot be enforced at project level at all, because a project can legitimately be approved in one market and pending in another (rule A1/C5):

| Gate | Item |
|---|---|
| 10 | Regulatory approval |
| 11 | Gate 10 complete for the relevant market |
| 11 | Launch approval |

A project-level check would either pass as soon as **one** market is approved (too lax) or block while **any** market is pending (too strict). Launch approval already has a real per-market hard block (PIF must be Approved — C5) in the Market Tracking screen; what is missing is how a per-market state should feed the **gate**'s own readiness.

**Question:** when a project sells into several markets, should Gate 10/11 be considered "ready" (a) only when **every** market is approved, (b) as soon as **any** market is approved, with the rest tracked separately, or (c) should the gate itself become per-market (which is the larger F4 change)?

> ⚠️ **Answered (2026-08-07) — Response2 E3(a): option (c), the larger change.** "Gate 10 and Gate 11 should operate **per market**, as previously confirmed." Each active market carries its own: Gate 10 readiness · dossier/PIF status · claims approval · Regulatory approval · Gate 11 readiness · launch approval · approval dates · **applicable formula version** · **applicable artwork version**. Overall project status shows one of: *No market approved · Some markets approved · All active markets approved · Market transition in progress*. Explicitly: **"one approved market must not cause all markets to appear ready."** This is the F4 work — previously deferred as heavy data-model change — and it is now unblocked and required.

### Q4. "Change controls closed or formally accepted" (Gate 11) — already enforced by a different mechanism

An open Change Control record **already** soft-locks the gate today through rule C4/F9 (it blocks a plain Proceed and requires an explicit acknowledgement to record Proceed with Conditions). Adding a second, readiness-level check for the same thing would either duplicate it or contradict it.

**Question:** is the existing C4/F9 soft-lock what you meant by this appendix item, or did you intend a **separate, harder** requirement at Gate 11 (i.e. no open change may exist at all, with no acknowledgement escape)?

> ✅ **Answered (2026-08-07) — Response2 E3(b): neither — it is impact-dependent.** The existing soft lock is suitable for low- and medium-risk open changes, but **"Gate 11 requires more than a duplicate warning. It must evaluate the impact classification and closure status of each open Change Control."** Rules: *Critical or launch-impacting* → **hard-blocks launch** · *formula, artwork, claims, safety, regulatory, packaging or release-impacting* → **hard-blocks unless implementation and verification are complete** · *low-risk administrative* → may permit Proceed with Conditions after authorised acknowledgement (today's behaviour) · *completed, rejected, cancelled or superseded* → does not block, provided the final disposition is recorded. So the answer is not "duplicate" and not "blanket harder": Gate 11's readiness must read each open change's impact classification, which means the Change Control record needs one.


---

## ✅ Round 4 — CLOSED 2026-08-24 (raised 2026-08-07 → 2026-08-09)

> **Cả 33 câu đã có đáp án.** Bản trả lời: `docs/rounds/2026-08-24-sme-reply-round4.md`; bản ghi có thẩm quyền: `Business_Rules_Confirmation_{EN,VN}.md` → **Phụ lục 3 (24/08/2026)**. Mỗi câu dưới đây kết bằng một khối `> ✅ **Đã trả lời (24/08/2026)**` tóm tắt đáp án và nói nó là ✅ xác nhận, ⚠️ đảo ngược, hay 🆕 xây mới.
>
> **Mọi tag `[ASSUMPTION: R4-Qn]` đã được gỡ khỏi code.** Nơi nào đáp án mâu thuẫn với hành vi đã ship thì chỗ đó mang `R4-REWORK: câu …` (in square brackets, with the sent question number) — không phải một giả định đang chờ, mà một quy tắc đã chốt và một đoạn code biết là sai. Thứ tự xử lý: `docs/plans/Round4_Implementation_Roadmap.md`.
>
> **Con số đáng nhớ:** 20 chỗ phải làm lại · 6 mảng xây mới (chữ ký per-gate · luồng infant 6 gate · 3 tập dữ liệu cấp công ty · mô hình revision claim · vòng đời per-market · 5 trường đánh giá tường minh) · 7 mục độc lập làm song song được · 1 câu (20) không phải sửa gì.

**Everything above this line is closed.** The entries below follow the standing rule, sharpened by the project owner on 2026-08-09: *do not speculate; speculate only where the signal is overwhelming; and put every speculation on this list for the SME to confirm — kept if confirmed, fixed if not.*

**Conventions for this round:**

- Every entry has a **stable ID** (`R4-Q1` …). This file is the **only** question list; other documents reference these IDs instead of keeping a parallel list of their own.
- The decision site — in code and in docs — carried a grep-able tag `[ASSUMPTION: R4-Qn]`, so "list every unconfirmed assumption" was a search, not a manual audit. On closure each tag was either removed (answer confirms the code) or replaced by `R4-REWORK: câu …` (in square brackets, with the sent question number) (answer contradicts it).
- Each entry ends with **"Nếu trả lời khác thì sửa ở đâu"** naming the file/function, because Round 3 showed that locating a shipped wrong assumption is the slow part. That line is what made the 2026-08-24 closure pass mechanical rather than archaeological — it earned its keep and should stay a convention.

**Status:** 🔴 = already shipped on this assumption (wrong answer means rework) · 🟡 = designed, not yet built (wrong answer means redesign, no rework). *Retained as written on 2026-08-12 — the ✅ block on each entry carries what actually happened.*

**Bản gửi đi:** [`../rounds/2026-08-12-our-questions-round4.md`](../rounds/2026-08-12-our-questions-round4.md) — viết bằng ngôn ngữ nghiệp vụ, đánh số 1–36, gộp thêm 3 câu còn tồn từ vòng 21/07 (A1 "critical" · A2 Infant pathway · A3 kết thúc version cũ). Cột **Gửi số** dưới đây là cầu nối: khi SME trả lời "5 — option (b)" thì biết ngay nó đóng câu nội bộ nào. Câu **1** trong bản gửi gộp `R4-Q2` với A2 vì hai câu là hai mặt của cùng một lỗ hổng.

| ID | Chủ đề | Trạng thái | Gửi số |
|---|---|---|---|
| R4-Q1 | Gate 7 — "restricted/caution assessment closed" nghĩa hẹp hay rộng | 🔴 | 5 |
| R4-Q2 | Gate 7 — Compartment 3 có đúng là Infant pathway SME muốn không (lỗ hổng đã đóng 12/08) | 🔴 | **1** |
| R4-Q3 | Ngưỡng chặn Gate 4 vs Gate 7 của cùng một sổ caution | 🔴 | 6 |
| R4-Q4 | `openChangeControl` — bỏ vế *"or should be opened"* | 🟡 | 8 |
| R4-Q5 | `humanStudyPlanned` — cái gì đánh dấu "đã dự định làm study" | 🟡 | 9 |
| R4-Q6 | 3 trigger Gate 12 ↔ option nào của checklist Post-Market Sources | 🟡 | 10 |
| R4-Q7 | Gate 3 — "purely administrative change" gồm những loại nào | 🟡 | 11 |
| R4-Q8 | Gate 9 — "major reformulation" và "process/site change" đọc từ đâu | 🟡 | 12 |
| R4-Q9 | **Cross-cutting** — dữ liệu của trigger *chưa được ghi* thì tính là đã trigger hay chưa | 🔴 | 7 |
| R4-Q10 | Gate 12 — mốc "scheduled post-launch review", và "đã launch" khi nhiều thị trường | 🟡 | 13 + 14 |
| R4-Q11 | Gate 12 — "product category / market / company policy" nào bắt buộc PV/PMS | 🟡 | 4 |
| R4-Q12 | Gate 12 — tier của "Product-performance feedback" và "Market feedback" | 🟡 | 15 |
| R4-Q13 | Ghi N/A kèm lý do có bắt buộc cả khi trigger không kích hoạt? | 🟡 | 16 |
| R4-Q14 | Cờ rủi ro thành phần là thuộc tính của nguyên liệu hay của dự án | 🟡 | 17 |
| R4-Q15 | Gate 10/11 — chữ ký 3 vai trò là mỗi thị trường một bộ hay một bộ chung; Phase 4 đóng thế nào | 🟡 | 18 |
| R4-Q16 | Cột `Claim category` sẵn có trên SKU Claims / PIF Register vốn ghi gì | 🟡 | 19 |
| R4-Q17 | Trường Gate 1 để tuỳ chọn lúc tạo dự án, bắt buộc ở Gate 1 | 🔴 | 20 |
| R4-Q18 | Bảng requirements Phase 1 — giá trị của cột Priority, và bao nhiêu dòng phải xong | 🔴 | 21 |
| R4-Q19 | Hai option list của B1/B2 trình bày dạng bảng checklist như 6 bảng sẵn có của workbook, và được chọn nhiều giá trị | 🔴 | 22 |
| R4-Q20 | Hai item do dev tự thêm (`sg02-product-type`, `sg07-matrix-rows`) đang hard-block gate mà chưa từng được hỏi | 🔴 | 23 |
| R4-Q21 | `initialTargetMarkets` trùng `Countries / Markets` bắt buộc lúc tạo dự án; B3 trả lời trên tiền đề ta nêu sai | 🔴 | 24 |
| R4-Q22 | Map option Target Users sang Vulnerable group — 5 cặp đổi tên + 8 option không map | 🔴 | 25 |
| R4-Q23 | Sổ Claim → Evidence Traceability thuộc gate nào — lệch với dòng SG05/SG08 của roadmap | 🔴 | 26 |
| R4-Q24 | C1 — bằng chứng nào là "đã Regulatory review"; 4/7 điều kiện chưa kiểm được | 🔴 | 27 |
| R4-Q25 | Claims Library ở cấp công ty hay cấp dự án, và claim có bắt buộc trỏ tới entry không | 🔴 | 28 |
| R4-Q26 | D1 — 5 điểm chưa nói: record version của cái gì · comment bắt buộc khi nào · gate nào là "critical" · độc lập nghĩa là gì · chặn ở thời điểm nào | 🔴 | 29 |
| R4-Q33 | A3 — claim `Cosmetic` có cần bằng chứng product-level không · trạng thái costing đọc từ đâu | 🔴 | 36 |
| R4-Q32 | E2 — giá trị Status/Regulatory approval của sổ per-market · "Other - specify" là ASEAN hay không · có buộc đủ 6 trường | 🔴 | 35 |
| R4-Q31 | E3(b) — "Critical" là High? · change chưa phân loại có chặn? · "final disposition" gồm gì · "authorised acknowledgement" là bước nào | 🔴 | 34 |
| R4-Q30 | E1 — sổ Critical Safety Findings: giá trị Severity/Status · "Required action" có phải controlled action · dòng chưa phán định có chặn | 🔴 | 33 |
| R4-Q29 | D3 — "flagged" gồm status nào · giá trị Resolution status · "authorised acceptance" là gì · dòng chưa đánh giá có được PwC gỡ · có áp cho PB Caution Limits | 🔴 | 32 |
| R4-Q28 | D4 — "applicable" gồm nguyên liệu nào · trạng thái "đã cân nhắc, không dùng" · "controlled conditional decision" là PwC hay trường riêng | 🔴 | 31 |
| R4-Q27 | D2 — 4 quyết định trong phần vừa xây (ngưỡng chặn ở release · 3 giá trị so sánh wording · khác biệt nào tính · "material change" chỉ chặn chứ không tự tạo claim mới) + 2 vế chưa có chỗ gắn (artwork approval · external publication) | 🔴 | 30 |

---

### Nhóm 1 — Phát sinh từ bản sửa Gate 7 (đã ship 2026-08-07)

#### ✅ R4-Q1 · Gate 7 — "restricted/caution assessment closed" nghĩa hẹp hay rộng 🔴

**Đã đổi gì:** `sg07-caution-closed` từ **Mandatory + không điều kiện** thành **Conditional + trigger `skincareForTwo`**, nên nay chỉ chặn Gate 7 với dự án có chọn Pregnancy / Breastfeeding / Postpartum.

**Vì sao phải đổi:** register `pbCautionLimits` là `mode: 'fixed'`, seed sẵn 12 dòng ở `productStatus: 'Not assessed'` — mà giá trị này nằm trong `badValues` của check. Hệ quả: **mọi dự án**, kể cả sản phẩm cho người lớn thông thường, không thể qua Gate 7 cho tới khi có người đi hết 12 dòng của sổ caution dành cho thai kỳ. Đúng hành vi không-điều-kiện mà E1 nói là sai.

**Chỗ suy đoán:** E1 viết *"the pregnancy/breastfeeding assessment at Gate 7"*. Trong app có **hai** item có thể ứng với câu đó:

| Item | Đọc gì | Đã làm gì |
|---|---|---|
| `sg07-caution-closed` — "Restricted/caution ingredient assessment closed" | mọi dòng **PB Caution Limits** đã resolved | đổi thành Conditional |
| `sg07-screen-check` — "Pregnancy/breastfeeding and baby-contact screen completed where triggered" | dòng **Key Gate Check** của Gate 07 | giữ Mandatory — nó đã có đường NA-kèm-lý-do, đúng điều E1 yêu cầu cho sản phẩm thông thường |

Chúng tôi đọc cái thứ nhất là cái E1 nói tới, vì nó chính là cái đang bắt mọi dự án phải làm sổ PB.

**Điều cần kiểm:** chữ trong phụ lục F1 là *"restricted/caution assessment closed"* — đọc **rộng hơn** "pregnancy/breastfeeding". Nó chỉ mang tính thai kỳ trong app vì check được trỏ vào sổ PB. Nếu ý các anh là **một đánh giá restricted/caution tổng quát vẫn phải áp cho mọi dự án**, thì việc hạ xuống Conditional đã gỡ mất phần cover đáng lẽ phải giữ.

**Câu hỏi:** "restricted/caution assessment closed" ở Gate 7 nghĩa là **(a)** riêng đánh giá thai kỳ/cho con bú — thì thay đổi trên là đúng; hay **(b)** một đánh giá restricted/caution tổng quát cho mọi dự án, còn phần thai kỳ là một item Conditional riêng chồng lên?

**Nếu trả lời (b):** `gateReadiness.ts` → `sg07-caution-closed` quay lại Mandatory, và thêm một item Conditional riêng cho phần PB; cần một register hoặc cột mới cho phần restricted/caution tổng quát, vì hiện chỉ có sổ PB.


> ✅ **Đã trả lời (24/08/2026) — bản gửi câu 5.** ⚠️ **Option (b) — hành vi đã ship là sai shape.** Gate 7 đòi một đánh giá restricted-and-caution **tổng quát cho mọi sản phẩm**; màn hình Pregnancy/Breastfeeding là *lớp điều kiện bổ sung*, và Infant/Baby Safety là lớp thứ ba. Một item Conditional trên `skincareForTwo` phải tách thành ba, và lớp general chưa có register nào — `prohibitedIngredients` và `pbCautionLimits` là tất cả những gì đang có. Xem Phụ lục 3 Phần 6.

#### ✅ R4-Q2 · Gate 7 — sản phẩm chỉ cho trẻ sơ sinh hiện không có đánh giá nào 🔴

E1 có ba vế, mới làm được vế đầu:

1. ✅ đánh giá thai kỳ/cho con bú thành Conditional theo trigger maternal;
2. ❌ **sản phẩm chỉ cho trẻ sơ sinh phải đi Infant/Baby Safety pathway** — nội dung pathway là câu **A2 của Vòng 2**, chưa có trả lời, nên không có gì để định tuyến tới;
3. ❌ **sản phẩm thông thường ghi N/A kèm lý do** — hiện chỉ có dòng Key Gate Check `sg07-screen-check`, là một cái tick chung cho cả màn hình chứ không phải lý do theo từng mục.

**Điều phải báo rõ:** kiểm tra code cho thấy Phase 3 **đã có sẵn** requirement section `infantSafety`, tiêu đề *"Compartment 3 - Infant / Baby-Contact Safety"*. Nhưng nó chỉ được kiểm bên trong `skincareForTwoIncompleteSections()`, mà hàm này thoát ngay khi trigger maternal không active:

```ts
const triggers = skincareForTwoTriggers(project);
if (triggers.length === 0) return [];   // ← sản phẩm chỉ-cho-trẻ-sơ-sinh thoát ở đây
```

Nên dự án chọn `Infant 0+` mà không chọn maternal thì **section an toàn cho trẻ sơ sinh không bao giờ bị đòi** — dù nó tồn tại đầy đủ trong config. Trước 2026-08-07 nó còn được che **tình cờ** bởi `sg07-caution-closed` chặn không điều kiện; bản sửa ở R4-Q1 gỡ cái chặn oan đó và làm lỗ hổng này lộ ra thật.

**Câu hỏi:** trạng thái tạm này có chấp nhận được trong lúc chờ A2 không, hay sản phẩm chỉ-cho-trẻ-sơ-sinh phải tiếp tục bị chặn Gate 7 bằng bằng chứng nào đó đang có? Nếu có, xin nêu rõ là cái nào.

> Phương án còn lại — giữ nguyên chặn không-điều-kiện tới khi A2 về — sẽ tiếp tục chặn oan mọi dự án general-adult, đúng điều E1 bác bỏ. Nên đây là chọn giữa hai cái sai, và chúng tôi chọn cái không chặn oan, rồi báo cáo lỗ hổng thay vì che nó.

**Nếu trả lời "phải chặn":** `gateProgress.ts` → `skincareForTwoIncompleteSections()`, bỏ điều kiện thoát sớm cho nhánh `infantSafety` và cho nó trigger riêng theo `Infant 0+`.


> ✅ **Đã trả lời (24/08/2026) — bản gửi câu 1.** ✅ **Compartment 3 đúng** — "Retain Compartment 3 as the core Gate 7 Infant & Baby Safety assessment… Existing controls INF-01 to INF-08 remain appropriate", và chặn cứng ở Gate 7 được xác nhận nguyên văn. ⚠️ **Nhưng nó là cấu phần CUỐI** của một luồng trải Gate 2, 4, 5, 6, 7, 8–9 và 10; sáu gate kia mang yêu cầu app chưa có gì cả. Xem Phụ lục 3 Phần 7.

#### ✅ R4-Q3 · Ngưỡng chặn Gate 4 vs Gate 7 của cùng một sổ caution 🔴

`sg04-pb-screen` trước đây là Conditional nên không bao giờ chặn được; nay chặn thật khi trigger maternal active. Ngưỡng của nó **cố ý hẹp hơn** Gate 7:

| Gate | Item | Chặn khi |
|---|---|---|
| 4 | `sg04-pb-screen` | có dòng ở `"Needs Safety Review"` hoặc `"Needs Regulatory Review"` — **không** tính `"Not assessed"` |
| 7 | `sg07-caution-closed` | còn bất kỳ dòng nào ở `"Not assessed"`, `"Exceeds limit - reformulate"`, `"Needs Safety Review"`, `"Needs Regulatory Review"` |

Nghĩa là dự án maternal **không** bị chặn ở Gate 4 ngay ngày đầu; chỉ khi có người thực sự đẩy một dòng lên "cần review". Việc đóng đủ mọi dòng là nhiệm vụ của Gate 7. Cách chia này theo mô hình *Gate 4 sàng lọc — Gate 7 đóng hồ sơ*, nhưng đó là suy luận của chúng tôi, không phải điều phụ lục nói.

**Câu hỏi:** cách chia này có đúng ý không, hay Gate 4 cũng phải đòi mọi dòng được đánh giá trước khi qua?

**Nếu Gate 4 cũng phải đòi đủ:** `gateReadiness.ts` → thêm `'Not assessed'` vào `badValues` của `sg04-pb-screen`.

---


> ✅ **Đã trả lời (24/08/2026) — bản gửi câu 6.** ⚠️ **Ngưỡng Gate 4 của ta quá lỏng.** Gate 4 vừa sàng lọc **vừa disposition** mọi ứng viên, mỗi dòng vào 1 trong 6 giá trị, và **không được pass khi còn dòng chưa đánh giá**. Phần close-out đầy đủ vẫn dành cho Gate 7. PwC ở Gate 4 được phép dưới 4 điều kiện. Xem Phụ lục 3 Phần 6.

### Nhóm 2 — Ánh xạ trigger sang dữ liệu (mới thiết kế, chưa build)

> Toàn bộ nhóm này đến từ `docs/rules/F1_Conditional_Triggers.md`. A3 cấp **điều kiện** trigger; những câu dưới đây là chỗ chúng tôi phải tự chọn **dữ liệu nào trong app** đại diện cho điều kiện đó. Ánh xạ kiểu này trông như việc cơ học nhưng là diễn giải — đúng loại đã sai hai lần trước đây (`sg01-source`, `sg01-owner`).

#### ✅ R4-Q4 · `openChangeControl` — bỏ vế *"or should be opened"* 🟡

**Luật (A3):** *"Mandatory where a Change Control record has been opened **or should be opened** because of the post-market finding."*

Vế thứ hai là phán định của con người — không dữ liệu nào đánh giá được "lẽ ra phải mở". Chúng tôi định **chỉ cài vế thứ nhất** (có record đang mở, theo `isChangeOpen()` của luật F9), còn vế thứ hai để item hiện ra như một lời nhắc khi Gate 12 có ghi nhận post-market finding.

**Câu hỏi:** cắt bớt như vậy có chấp nhận được không? Hay cần một bước xác nhận tường minh kiểu *"đã xem xét và kết luận không cần mở Change Control"* để vế thứ hai cũng được ghi nhận?

**Nếu cần bước xác nhận:** thêm một dòng Key Gate Check ở Gate 12, hoặc một cột trên bảng post-market.


> ✅ **Đã trả lời (24/08/2026) — bản gửi câu 8.** ⚠️ **Không cắt bớt — ghi lại phán định.** Thêm bước tường minh **"Change Control required? → Yes / No / Pending assessment"** kèm reviewer · review date · rationale · Change Control ID liên kết (khi Yes) · evidence link. **Pending assessment chặn việc đóng post-market finding.** Được nêu rõ là tốt hơn "chỉ dựa vào một lời nhắc". Xem Phụ lục 3 Phần 10.

#### ✅ R4-Q5 · `humanStudyPlanned` — cái gì đánh dấu "đã dự định làm study" 🟡

**Luật (A3):** *"Mandatory **before** any internal or external study involving human participants…"*

Chữ *"before"* nghĩa là phải bắt được **ý định** làm study, không đợi tới lúc đã duyệt. Ba nguồn có sẵn, chúng tôi chọn nguồn 1:

| Nguồn | Nhận xét |
|---|---|
| ✅ Register **Study Protocol Setup** có `plannedValue` được điền | gần nghĩa "đã có kế hoạch" nhất. Lưu ý register này `mode: 'fixed'`, rows seed sẵn — nên phải kiểm cột có giá trị chứ không phải "có row" |
| ❌ `studyApprovals` có bản ghi | chỉ xuất hiện **sau** khi study tới bước duyệt — muộn hơn chữ "before" |
| ❌ Phase 3 requirement `humanStudy` | chính là cái item này đang kiểm — dùng làm trigger sẽ thành vòng lặp |

**Câu hỏi:** "một nghiên cứu đã được dự định" nên được đánh dấu ở đâu? Nguồn 1 có đúng không, hay các anh muốn một trường tường minh kiểu *"Dự án này có nghiên cứu trên người: Có / Không"*?

**Nếu muốn trường tường minh:** thêm trường vào Phase 3 hoặc `ProjectIdentity`, và `isReadinessTriggerActive()` đọc trường đó.


> ✅ **Đã trả lời (24/08/2026) — bản gửi câu 9.** ⚠️ **Cần trường tường minh**, đúng phương án ta nêu như lựa chọn thay thế: **"Human-participant study planned? → Yes / No / Undecided"**, rà soát ở Gate 8. Tạo một Study Protocol **tự động đặt thành Yes** — nên nguồn 1 vẫn dùng, chỉ là một đầu vào chứ không phải toàn bộ trigger. **Undecided phải ngăn Gate 8 đóng.** Xem Phụ lục 3 Phần 10.

#### ✅ R4-Q6 · Ba trigger Gate 12 ↔ option nào của checklist Post-Market Sources 🟡

Checklist **Post-Market / PV-PMS Feedback Sources** (Gate 12) có 16 option. A3 cấp trigger cho 3 item bằng văn xuôi; chúng tôi tự ánh xạ sang option cụ thể:

| Item | Luật (A3) | Option chúng tôi chọn |
|---|---|---|
| `sg12-performance` | *"product efficacy, consumer experience, product failure or claim performance is part of the post-market review scope"* | `Formula issue` · `Quality issue` · `Product optimisation` · `Claim question` |
| `sg12-feedback` | *"complaint, customer issue, distributor request, claim challenge or recurring performance concern is recorded"* | `Complaint` · `Consumer feedback` · `Distributor feedback` · `Claim question` |
| `sg12-pv-pms` | *"safety signal … complaint trend …"* | `Adverse event / PV signal` · `PMS trend` · `Complaint` |

16 option đầy đủ: `Consumer feedback` · `HCP feedback` · `Distributor feedback` · `Retailer feedback` · `Sales feedback` · `Social media feedback` · `Complaint` · `Adverse event / PV signal` · `PMS trend` · `Claim question` · `Packaging issue` · `Formula issue` · `Quality issue` · `FAQ update` · `CAPA` · `Product optimisation`.

**Câu hỏi:** ba tập option trên có đúng không? Cụ thể: `HCP feedback` / `Retailer feedback` / `Sales feedback` / `Social media feedback` có tính là *"customer issue"* cho `sg12-feedback` không? `CAPA` và `Packaging issue` hiện không thuộc tập nào — có đúng vậy không?

**Nếu ánh xạ sai:** `gateProgress.ts` → `isReadinessTriggerActive()`, sửa danh sách option của trigger tương ứng.


> ✅ **Đã trả lời (24/08/2026) — bản gửi câu 10.** ⚠️ **Ánh xạ được chấp nhận nhưng bản thân danh sách là sai.** 16 option đang trộn ba khái niệm và nên tách thành **Feedback source** (9) · **Issue type** (8) · **Resulting action** (6). HCP, retailer, sales và social media đều tính là market feedback; **CAPA là hành động kết quả, không phải nguồn**. Xem Phụ lục 3 Phần 8.

#### ✅ R4-Q7 · Gate 3 — "purely administrative change" gồm những loại nào 🟡

**Luật (A3):** *"Mandatory where the project is a new product, claim extension, repositioning project, customer/distributor-led request, or where a benchmark/reference product is named. **Not mandatory for a purely administrative change.**"*

B2 cấp 6 giá trị cho loại dự án: `new development` · `reformulation` · `claim change` · `packaging change` · `market extension` · `lifecycle improvement`. A3 **không nói** giá trị nào là "purely administrative". Chúng tôi tạm xếp:

| Giá trị B2 | Tạm xếp | Ghi chú |
|---|---|---|
| `new development` | bắt buộc | khớp *"new product"* |
| `claim change` | bắt buộc | khớp *"claim extension"* |
| `market extension` | bắt buộc | mở thị trường mới thường kèm định vị lại |
| `reformulation` | **chưa rõ** | có phải "repositioning" không? |
| `packaging change` | **không** bắt buộc | tạm coi là administrative |
| `lifecycle improvement` | **không** bắt buộc | tạm coi là administrative |

**Câu hỏi:** trong 6 giá trị đó, cái nào là *"purely administrative change"* được miễn?

**Nếu xếp sai:** `gateProgress.ts` → `isReadinessTriggerActive()`, nhánh `newOrRepositionedProject`.


> ✅ **Đã trả lời (24/08/2026) — bản gửi câu 11.** ⚠️ **Tiền đề của câu hỏi bị bác.** "None of the six project types is automatically administrative" — thay đổi bao bì, cải tiến vòng đời hay tái công thức đều có thể quan trọng. Thêm phân loại riêng **"Administrative-only change: Yes / No"** do reviewer có thẩm quyền xác nhận, **và** miễn trừ chỉ áp khi không có thay đổi nào về claim, công thức, định vị, hiệu năng, chức năng bao bì hay ý nghĩa hướng khách hàng. Xem Phụ lục 3 Phần 10.

#### ✅ R4-Q8 · Gate 9 — "major reformulation" và "process/site change" đọc từ đâu 🟡

**Luật (A3):** *"Mandatory for new formulas, major reformulations, new manufacturing processes, manufacturing-site transfers, meaningful equipment/process changes, or products with identified scale-up risk."*

Chúng tôi định đọc từ ba nguồn:

| Vế | Nguồn định dùng | Chỗ suy đoán |
|---|---|---|
| new formula / major reformulation | `formulaVersions` + `MAJOR_CHANGE_CRITERIA` (luật F5) | Coi phân loại **Major** của F5 chính là *"major reformulation"* của A3. Hai khái niệm này do hai vòng khác nhau đặt ra — có chắc là một không? |
| site transfer / equipment / process change | `ChangeRecord.affectedArea` | Chưa biết giá trị `affectedArea` nào tính |
| *"identified scale-up risk"* | không có chỗ ghi | Định bỏ qua vế này |

**Câu hỏi:** (a) phân loại Major của F5 có đúng là *"major reformulation"* ở đây không? (b) giá trị `affectedArea` nào tính là chuyển nhà máy / đổi thiết bị / đổi quy trình? (c) *"identified scale-up risk"* cần chỗ ghi riêng, hay bỏ qua được?

**Nếu (a) là không:** cần tiêu chí riêng cho "major reformulation" ở Gate 9, tách khỏi `MAJOR_CHANGE_CRITERIA`.


> ✅ **Đã trả lời (24/08/2026) — bản gửi câu 12.** ✅ **Major = major reformulation**, đúng như ta đề xuất. 🆕 Kèm 18 vùng ảnh hưởng kích hoạt review scale-up/pilot, và một trường mới **"Scale-up risk identified? → Yes / No / Pending assessment"** cùng 6 trường đi kèm. **Pending assessment chặn readiness Gate 9.** Xem Phụ lục 3 Phần 10.

#### ✅ R4-Q9 · Cross-cutting — dữ liệu của trigger *chưa được ghi* thì tính là đã trigger hay chưa 🔴

**Mở rộng 2026-08-09 từ một câu riêng của Gate 3 thành câu cross-cutting**, sau khi cài trigger `microbiologicallySusceptible` làm lộ ra **cùng một câu hỏi ở chỗ thứ hai**. Đây là một quyết định chính sách, không phải hai ca lẻ.

**Vấn đề chung:** một item Conditional chỉ chặn khi trigger active. Nhưng khi **chưa ai ghi dữ liệu mà trigger đọc**, trigger trả về "không active" → item **tự thoả**. Tức là *chưa đánh giá* đang được đối xử giống *đã đánh giá và kết luận không áp dụng*.

Hai chỗ đang như vậy:

| Item | Trigger đọc | Khi chưa ghi gì |
|---|---|---|
| Gate 5 `sg05-preservative` · Gate 9 `sg09-pet` | phân loại nhạy cảm vi sinh của công thức | **đã ship** — cả hai gate tự pass |
| Gate 3 `sg03-reg-claims` | Claim risk của B7 | chưa build; `Pending classification` là ca tương tự |

**Câu hỏi:** khi dữ liệu mà trigger đọc **chưa được ghi**, item Conditional nên **(a)** tự thoả như hiện nay — chưa phân loại thì coi như chưa trigger; hay **(b)** coi như **đã trigger** — chưa biết thì phải giả định là có, cho tới khi ai đó phân loại và nói không?

Chúng tôi nghiêng về **(b)** cho những item liên quan an toàn (bảo quản, claim rủi ro): chưa biết không phải là an toàn. Nhưng (b) nghĩa là mọi dự án mới đều chặn ở Gate 5 cho tới khi có người phân loại công thức — một bước bắt buộc thêm, nên đó là quyết định của các anh chứ không phải của chúng tôi.

**Nếu chọn (b):** `isReadinessTriggerActive()` trong `gateProgress.ts` — nhánh `microbiologicallySusceptible` trả `true` khi giá trị rỗng, và nhánh claim risk làm tương tự.

<details><summary>Câu hỏi gốc (chỉ Gate 3), giữ để tra lịch sử</summary>


B7 cấp 5 giá trị cho **Claim risk**: `Low` · `Medium` · `High` · `Prohibited / not acceptable` · `Pending classification`. C1 nói regulatory review bắt buộc khi `risk = High` (cùng các điều kiện khác), nhưng **không nói** `Pending classification` xử lý thế nào.

Chúng tôi nghiêng về **tính là đã trigger** — chưa phân loại thì chưa biết có rủi ro hay không, nên phải review. Nhưng đó là suy đoán.

**Câu hỏi:** một claim còn ở `Pending classification` có bắt buộc Regulatory review không?

**Nếu là "không":** `gateProgress.ts` → `isReadinessTriggerActive()`, nhánh `claimNeedsRegulatoryReview`.

</details>


> ✅ **Đã trả lời (24/08/2026) — bản gửi câu 7.** ⚠️ **Option (b), và đây là đáp án xuyên suốt toàn hệ.** Phân biệt ba trạng thái — đã xét-có áp dụng / đã xét-không áp dụng / **chưa xét** — và "chưa xét" **phải chặn** với item Mandatory hoặc Conditional. Cách đọc `Pending classification` của ta được xác nhận thành một quy tắc riêng. Trường hợp `microbiologicallySusceptible` được nêu đích danh. Xem Phụ lục 3 Phần 1.

#### ✅ R4-Q10 · Gate 12 — mốc "scheduled post-launch review", và "đã launch" khi nhiều thị trường 🟡

**Luật (A1/A3):** `sg12-feedback` *"becomes Conditional where the project has launched and a scheduled post-market review is due"* / *"when the scheduled post-launch review milestone is reached"*.

Hai chỗ không có dữ liệu:

1. **Mốc review là bao lâu sau launch?** App không có lịch/mốc nào. Rẻ nhất là suy từ `MarketTrack.launchApprovedDate` + N tháng, nhưng **N là con số chưa ai đưa** nên chúng tôi không tự đặt.
2. **"Dự án đã launch" khi có nhiều thị trường** nghĩa là **một** thị trường được duyệt launch, hay **mọi** thị trường đang hoạt động? Liên quan trực tiếp tới E3(a).

**Câu hỏi:** (a) mốc post-launch review là bao lâu sau ngày duyệt launch — và có khác nhau theo nhóm sản phẩm hay thị trường không? (b) với dự án nhiều thị trường, "đã launch" tính theo thị trường đầu tiên hay tất cả?

**Nếu là "mọi thị trường":** `isReadinessTriggerActive()` phải đọc toàn bộ `marketTracks`, không chỉ tìm một cái Approved.


> ✅ **Đã trả lời (24/08/2026) — bản gửi câu 13 và 14.** 🆕 **Cả hai vế.** Lịch: **1 tháng** (sản phẩm giám sát tăng cường) · **3 tháng** (chuẩn) · **12 tháng** · hằng năm — tính từ **ngày launch thương mại thực tế**, không phải ngày phê duyệt. Launch xét **theo từng thị trường**, kèm 5 trạng thái roll-up cấp dự án; thị trường đầu launch không làm các thị trường khác trông như đã launch. Xem Phụ lục 3 Phần 8.

#### ✅ R4-Q11 · Gate 12 — "product category / market / company policy" nào bắt buộc PV/PMS 🟡

**Luật (A3):** *"Mandatory where required by **product category, market, company policy**, safety signal, vulnerable-user population, complaint trend or scheduled surveillance plan."*

Bốn vế sau đọc được (xem R4-Q6 và cờ vulnerable-user của B5). Ba vế đầu là **danh sách chúng tôi không có**: nhóm sản phẩm nào, thị trường nào, chính sách nào thì bắt buộc PV/PMS.

**Câu hỏi:** xin cho danh sách cụ thể, cùng dạng như A3 đã làm với các trigger khác. Nếu chưa có, chúng tôi sẽ cài trước 4 vế đọc được và ghi 3 vế còn lại là nợ có chủ đích — nói rõ để không bị hiểu là đã phủ hết.

---


> ✅ **Đã trả lời (24/08/2026) — bản gửi câu 4.** 🆕 **Có danh sách, và có một nguyên tắc kèm theo.** PMS **baseline cho mọi sản phẩm đang bán**, cộng **enhanced** khi trúng 1 trong 14 điều kiện. Yêu cầu theo thị trường đến từ một **market profile cấu hình được** do Regulatory duy trì — *"Do not use a permanently hard-coded country list."* Xem Phụ lục 3 Phần 4.

### Nhóm 3 — Tier và cách ghi N/A

#### ✅ R4-Q12 · Gate 12 — tier của "Product-performance feedback" và "Market feedback" 🟡

A1 nói rõ về hai item: `Change-control links` (Supporting → **Conditional**) và `Market feedback` (Supporting cho review định kỳ, **Conditional** khi đã launch và tới kỳ review). Nhưng A3 lại cấp trigger cho **cả** `Product-performance feedback` — mà item này A1 không nhắc tới, nên trong app nó vẫn là Supporting.

**Vấn đề:** một item Supporting thì trigger **vô nghĩa**, vì Supporting không bao giờ chặn dù trigger có bật hay không. Nên hoặc item đó thực ra là Conditional, hoặc trigger đó chỉ mang tính tham khảo.

**Câu hỏi:** `Product-performance feedback` (Gate 12) là **Supporting** hay **Conditional**? Và `Market feedback` — đúng là một item đổi tier theo trạng thái dự án (Supporting trước launch, Conditional sau), hay nên tách thành hai item riêng?

**Nếu là Conditional:** `gateReadiness.ts` → đổi `tier` của `sg12-performance` (và làm rõ cách biểu diễn cho `sg12-feedback`).


> ✅ **Đã trả lời (24/08/2026) — bản gửi câu 15.** ⚠️ **Đúng như ta ngờ.** Product-performance feedback → **Conditional** với 5 trigger. Market feedback **tách thành hai item** thay vì đổi tier theo thời gian: *Continuous Market Feedback Capture* (Supporting) và *Scheduled Market Feedback Review* (Conditional). Xem Phụ lục 3 Phần 8.

#### ✅ R4-Q13 · Ghi N/A kèm lý do có bắt buộc cả khi trigger không kích hoạt? 🟡

Ba chỗ trong Vòng 3 yêu cầu ghi N/A **kèm lý do**:

| Nguồn | Nguyên văn |
|---|---|
| A3, Gate 5 preservative | *"N/A may be used for genuinely anhydrous, self-preserving, sterile or single-use products **with documented rationale**"* |
| A2, Gate 6 pack | *"Where no market-specific requirement applies, the user should **record N/A with rationale**"* |
| E1, Gate 7 | *"General products should **record N/A with rationale**"* |

Điều này mâu thuẫn với cách engine đang xử lý trigger không active: item **tự thoả** kèm câu giải thích tự sinh, người dùng không phải làm gì. Nếu các anh muốn có lý do do người viết, thì trigger tắt **không** đồng nghĩa với "không phải làm gì" — vẫn còn một việc phải làm.

**Câu hỏi:** khi trigger không kích hoạt, câu giải thích tự động của hệ thống (*"không áp dụng vì dự án không chọn Pregnancy/Breastfeeding/Postpartum"*) đã đủ chưa, hay vẫn cần một người ghi N/A kèm lý do của riêng họ?

**Nếu cần người ghi:** phải thêm ô lý do cho từng item Conditional có trigger tắt — đây là thay đổi đáng kể về cách panel hoạt động, không phải chỉnh nhỏ.

---


> ✅ **Đã trả lời (24/08/2026) — bản gửi câu 16.** 🆕 **Hệ thống được tự sinh lý do N/A** khi suy được từ dữ liệu có kiểm soát (ba ví dụ được nêu). Nhưng với item **safety-, regulatory-, claims- hoặc release-critical**, lý do tự sinh **vẫn phải được reviewer chịu trách nhiệm xác nhận** trước khi đóng gate; với Supporting thì lời giải thích của hệ thống là đủ. Xem Phụ lục 3 Phần 10.

### Nhóm 4 — Thiết kế lưu trữ có ảnh hưởng nghiệp vụ

#### ✅ R4-Q14 · Cờ rủi ro thành phần là thuộc tính của nguyên liệu hay của dự án 🟡

Trigger `rmCompositionRisk` (Gate 4) cần biết nguyên liệu có chứa *fragrance, essential oils, botanical extracts, proteins, known allergens, residual solvents, heavy-metal risk, microbiological risk, restricted impurities, processing residues, variable natural-source composition* hay không — 11 loại, lấy nguyên văn từ A3.

Các cột hiện có (`allergenStatement`, `impurities`, `microInfo`) đều là **free text**, không đánh giá tự động được. Cần một cột multi-select mới.

**Chỗ cần quyết:** cột đó thuộc về **nguyên liệu** (một lần, dùng lại cho mọi dự án) hay thuộc về **dòng evidence trong một dự án** (nhập lại mỗi dự án)?

- Thuộc nguyên liệu thì hợp lý hơn — bản chất một nguyên liệu chứa tinh dầu hay không thì không đổi theo dự án. Nhưng master data nguyên liệu nằm ở **Cosmetri**, và luật A3 gốc nói MBc360 **chỉ đọc**, không ghi.
- Thuộc dự án thì lưu được ngay trong MBc360, nhưng phải nhập lại cho **từng nguyên liệu, từng dự án** — đắt nhất trong toàn bộ danh sách trigger.

**Câu hỏi:** phân loại này nên nằm ở đâu — trong Cosmetri (nếu Cosmetri hỗ trợ và các anh chấp nhận nhập ở đó), hay chấp nhận nhập lại theo từng dự án trong MBc360? Có cách thứ ba là MBc360 giữ một bảng tra riêng theo nguyên liệu, không đồng bộ với Cosmetri — nhưng như vậy sinh ra master data thứ hai, điều luật A3 cố tránh.

**Nếu chọn "trong Cosmetri":** phụ thuộc bên ngoài, cần xác nhận Cosmetri có trường tương ứng — cùng loại phụ thuộc với F12.


> ✅ **Đã trả lời (24/08/2026) — bản gửi câu 17.** 🆕 **Phương án thứ ba, có điều kiện.** Không nhập lại theo dự án. Nơi lưu tốt nhất về lâu dài là Cosmetri; cho tới lúc đó MBc360 giữ một **Raw Material Risk Overlay** dùng chung, khoá theo raw-material ID của Cosmetri, chỉ chứa 11 phân loại rủi ro mà API không cung cấp — *không phải* một master nguyên liệu thứ hai. Xem Phụ lục 3 Phần 4.

#### ✅ R4-Q15 · Gate 10/11 — chữ ký 3 vai trò là mỗi thị trường một bộ hay một bộ chung 🟡

**Phát sinh khi:** chốt shape dữ liệu cho D1, xem [`../plans/Post_Round3_Design_Decisions.md`](../plans/Post_Round3_Design_Decisions.md) → Quyết định 1.

D1 nói mỗi gate cần **Prepared / Reviewed / Approved**. E3(a) nói mỗi thị trường có Gate 10 readiness, regulatory approval và launch approval **riêng**. Ghép hai điều đó lại thì Gate 10 và 11 cần **3 chữ ký cho mỗi thị trường** — dự án 4 thị trường là 24 chữ ký chỉ cho hai gate. Có thể đúng (mỗi thị trường là một quyết định pháp lý độc lập), nhưng không câu trả lời nào nói ra.

**Hệ quả thứ hai chưa ai xét:** Gate 10 và 11 nằm trong **Phase 4**, mà sign-off cấp phase (`phase_closures`) không có chiều thị trường. Nếu Gate 10–11 thành per-market thì Phase 4 đóng khi nào?

**Câu hỏi:** (a) ở Gate 10 và 11, bộ Prepared/Reviewed/Approved là mỗi thị trường một bộ hay một bộ chung cho cả gate? (b) Phase 4 đóng khi **mọi** thị trường hoàn tất, hay đóng riêng theo từng thị trường?

**Nếu là per-market:** bảng chữ ký gate cần cột `market` nullable ngay từ đầu (`@@unique([projectId, gateId, market, role])`) — thêm sau khi đã có chữ ký thật là migration trên dữ liệu không được phép sai. Nếu là (b) per-market thì `phase_closures` cũng phải đổi khoá.

**Quyết định của project owner 2026-08-12: D1 CHỜ câu trả lời này rồi mới triển khai** — không đoán khoá rồi migrate chữ ký sau. Nhưng phần "12 item đang xanh trên bằng chứng sai" **không phụ thuộc** câu trả lời (khoá kiểu nào thì `owner + evidenceLink` vẫn không phải chữ ký), nên đã xử lý ngay bằng `coverageNote` trên cả 12 item `sgNN-signoff` — cùng cơ chế đã dùng cho C1. Item **vẫn chặn y như cũ**, không nới không siết; chỉ thôi trình bày Owner + Evidence link như thể đó là bộ ba chữ ký. Khi câu này có đáp án: bỏ `GATE_SIGNOFF_COVERAGE_NOTE` cùng lúc với việc thay `check` của 12 item đó.


> ✅ **Đã trả lời (24/08/2026) — bản gửi câu 18.** 🆕 **Per market — đúng phương án C của tài liệu thiết kế.** Prepared/Reviewed/Approved ghi theo từng thị trường ở Gate 10 và 11. Gate 12 cũng vận hành per market, và **Phase 4 có trạng thái theo từng thị trường**; bản tóm tắt cấp dự án được giữ nhưng **chỉ như roll-up**. Xem Phụ lục 3 Phần 3.

#### ✅ R4-Q16 · Cột `Claim category` sẵn có trên SKU Claims / PIF Register vốn ghi gì 🟡

**Phát sinh khi:** tìm chỗ đặt phân loại claim của B7 — xem [`../plans/Post_Round3_Design_Decisions.md`](../plans/Post_Round3_Design_Decisions.md) → Quyết định 3.

Register **SKU Claims / PIF** (gate 03/10) **đã có sẵn** một cột tên `Claim category`, có từ trước Vòng 3. B7 lại yêu cầu thêm một dropdown cũng tên "Claim category" với 10 giá trị cụ thể.

Nếu hai cái là một, tạo cột thứ hai sẽ sinh ra hai chỗ ghi cùng một thứ — đúng loại trùng lặp mà rồi sẽ lệch nhau. Nếu là hai khái niệm khác nhau, cần đổi tên một trong hai để người dùng không nhầm.

**Câu hỏi:** cột `Claim category` sẵn có trên sổ đó vốn dùng để ghi gì, và nó có phải chính là "Claim category" trong đáp án B7 (Cosmetic · Product performance · Sensory · Ingredient-level · Safety/tolerance · Environmental · Professional/technical · Borderline · Therapeutic — not permitted · Other) không?

**Nếu là một:** mở rộng cột sẵn có thành dropdown 10 giá trị, không tạo cột mới.

---

**✅ ĐÃ QUYẾT (2026-08-11, project owner) — build luôn, chờ SME xác nhận sau.** Đọc theo hướng "hai cái là một": cột `Claim category` sẵn có **chính là** thứ B7 nói, nên nó **được mở rộng thành dropdown 10 giá trị** thay vì sinh cột thứ hai. Cụ thể đã build:

| Thay đổi | Ở đâu |
|---|---|
| `claimCategory`: free text → **select 10 giá trị** của B7 (nguyên văn) | `skuClaimsPifRegister` |
| `claimRisk`: **select 5 giá trị** — Low · Medium · High · Prohibited / not acceptable · Pending classification | `skuClaimsPifRegister` |
| `claimCategory` + `claimRisk` cùng bộ giá trị | `claimEvidenceTraceability` |
| `intendedChannel` (text) và `regulatoryReviewRequired` (Y/N/NA) — 2 trong 9 thuộc tính B7 chưa có chỗ ghi | `skuClaimsPifRegister` |

**Ba phán định của dev nằm trong đó, cần SME xác nhận:**

**(a) Phân loại đặt ở CẢ HAI register.** Lý lẽ: phân loại là thuộc tính của **bản thân claim** ("Borderline / therapeutic-adjacent" thì borderline ở mọi SKU), nên nó phải có ở `claimEvidenceTraceability`; nhưng `skuClaimsPifRegister` đã mang sẵn một cột đúng tên đó từ trước, và nó là register **gate 03** — nơi Gate 3 thực sự làm việc phân loại — nên không thể bỏ trống.

⚠️ **Hệ quả phải nói rõ:** hai register giờ cùng ghi category/risk, mà `skuClaimsPifRegister` **không có cột `claimId`** để tham chiếu về claim gốc. Nên hai bên **có thể lệch nhau và hệ thống không biết**. Đây đúng loại trùng lặp mà chính R4-Q16 cảnh báo, và ta đang chấp nhận nó có ý thức, không phải vô tình. Cách sửa tận gốc là thêm `claimId` vào `skuClaimsPifRegister` rồi cho category/risk **kế thừa** từ claim (giống cách `publishedInfoApproval` đã làm với Claim ID + wording), nhưng đó là thay đổi mô hình dữ liệu, không phải thêm cột.

**(b) Chỗ đặt 2 thuộc tính còn thiếu.** `intendedChannel` và `regulatoryReviewRequired` đặt ở `skuClaimsPifRegister` vì cả hai thuộc **cách dùng** claim, không thuộc claim: cùng một câu chữ bị soi khác nhau giữa nhãn on-pack và một caption social, và yêu cầu review có thể có ở thị trường/kênh này mà không ở kênh khác.

**(c) `sg03-classification` vẫn để `manual`, chưa wire thành check thật.** Đã có chỗ ghi rồi, nhưng còn thiếu **quy tắc số lượng**: Gate 3 đòi *bao nhiêu* dòng phải được phân loại? Nếu đòi "mọi dòng của `skuClaimsPifRegister` phải có category + risk" thì phải trả lời trước: dự án ở Gate 3 đã buộc phải có dòng nào trong sổ đó chưa (sổ này là gate 03/10, phần lớn nội dung PIF thuộc Gate 10). Bịa ra cardinality là đúng sai lầm đã mắc ở `sg02-requirements`. Câu hỏi này gộp vào (d) dưới đây.

**Câu hỏi bổ sung:** (b) 2 thuộc tính `intended channel` / `Regulatory review required` đặt ở register nào là đúng? (c) khi category/risk ở hai sổ lệch nhau thì sổ nào là gốc — hay các anh muốn `skuClaimsPifRegister` tham chiếu Claim ID để khỏi lệch? (d) ở Gate 3, **bao nhiêu** claim phải được phân loại xong thì gate qua được?
---

**✅ QUYẾT ĐỊNH TIẾP (2026-08-11, cùng ngày, project owner) — vế (c) tự trả lời bằng cách sửa mô hình, không chờ.** Project owner đặt đúng câu hỏi: *"hai select đó có ổn không nếu hai bảng không nằm trong nhau — nếu nằm trong nhau thì thậm chí không cần chọn lại"*, và *"chỗ nào khai báo claim đầu tiên thì chỗ đó cần 2 select"*.

**Rà lại thì app không có chỗ khai báo claim nào cả** — cùng một claim bị gõ tay ở **6 bảng** trước khi được cấp ID:

| Gate | Nơi | Ghi gì |
|---|---|---|
| 03 | checklist `claimAreas` | vùng lợi ích, chưa phải câu claim |
| 03/10 | `skuClaimsPifRegister` | **câu chữ claim đầu tiên**, theo SKU × thị trường |
| 03/10 | `mechanismClaimsMap` | claim/benefit gõ lại |
| 05 | `evidencePlanProspective` | "Claim / benefit to prove" gõ lại |
| 08 | `efficacyStudyPlan` | "Claim / endpoint" gõ lại |
| 08/10 | `functionalEfficacy`, `clinicalHumanEvidence` | gõ lại |
| **10/11** | `claimEvidenceTraceability` | **Claim ID** — định danh duy nhất, lại nằm CUỐI |

Và "chỗ đầu tiên" cũng không phải một khai báo đúng nghĩa: một claim dùng cho 3 SKU × 2 thị trường là **6 dòng**, phân loại từng dòng thì lệch ngay trong nội bộ một bảng.

**Đã sửa gốc:**

1. `claimEvidenceTraceability` thành **nơi khai báo claim duy nhất**, gate `10/11` → **`03/10/11`** — Claim ID được cấp ngay ở Gate 3 khi claim mới được đề xuất. (Khoá vẫn cần **mọi** gate trong danh sách đã qua, nên nó vẫn viết được suốt PIF/Published Information như trước.)
2. `skuClaimsPifRegister` thêm cột **`Claim ID`** (kiểu `claimRef`, picker đọc sổ claim của chính dự án).
3. `Claim category` + `Claim risk` ở `skuClaimsPifRegister` chuyển thành **kế thừa** (`inheritFromClaim`): có link thì hiện giá trị của claim, read-only, kèm tooltip "sửa ở Claim → Evidence Traceability"; chưa link thì **khoá** kèm chữ *"Link a Claim ID first"* — vì để một dòng chưa link tự phân loại chính là cách hai bản sao lệch nhau.

**Thêm 2026-08-11 (cùng ngày, project owner):** *"một dòng claim hình thành qua gate 3/10/11, vậy để qua Gate 3 chỉ cần Claim ID + Approved wording + Claim category là đủ đúng không — và cột cũng nên chia theo gate"*. Đúng, và mô hình cũ không diễn đạt được: `gate` chỉ có ở **cấp register**, không có ở **cấp cột**.

Đã thêm `RegisterColumn.gate` và gán cho 9 cột của sổ claim: **Gate 03** = `claimId` · `approvedWording` · `claimCategory` · `claimRisk` — đây là "khai báo claim"; **Gate 05** = `mechanism` (đến từ Target Product & Tech); **Gate 08** = `evidenceGrade` · `supportingEvidence` (chỉ tồn tại khi đã test); **Gate 10** = `status` (Supported — thứ `unsupportedClaimRows()` đọc trước khi cho phát hành) · `approvedByDate`.

`sg03-classification` do đó **hết `manual`**: nay kiểm `registerRowsComplete` trên **đúng 4 cột gate 03**. Bắt cả dòng sẽ chặn Gate 3 bằng evidence grade và trạng thái Supported — những thứ không thể tồn tại trước Gate 8/10.

`claimRisk` nằm trong nhóm Gate 3 vì chính bộ giá trị của nó đã có câu trả lời "chưa biết" (`Pending classification`), nên đòi cột này không phải đòi một phán định non.

**Việc gán cột→gate là cách đọc của ta** — sheet không ghi gate cho từng cột. Với **33 sổ đa gate còn lại**, tag gate **tự suy từ `GATE_READINESS`** (check ở gate N đọc cột nào thì cột đó hiện G-N) chứ không gán tay: hiện 25 cột có tag, phần còn lại **cố ý để trống** vì gán tay ~380 cột là bịa ra một lịch trình không ai xác nhận.

**Phán định của dev nằm trong đó, cần SME xác nhận:** (h) 4 cột nào thuộc Gate 3 của sổ claim (danh sách trên) có đúng không, và (i) `mechanism` thuộc Gate 5 hay Gate 3? (e) claim có nên được **cấp ID ngay từ Gate 3** không, hay ID chỉ nên tồn tại sau khi có bằng chứng (nếu vậy thì Gate 3 phân loại **cái gì**)? (f) picker Claim ID **không** giới hạn ở claim `Supported` — theo đúng D2 vòng 3 (*"claim đang phát triển vẫn phải chọn được"*), chặn nằm ở khâu phát hành; đúng ý các anh chứ? (g) 4 bảng còn lại (mechanism map, evidence plan, efficacy study plan, clinical evidence) hiện **vẫn gõ tay câu claim** — có nên cùng chuyển sang tham chiếu Claim ID không?



> ✅ **Đã trả lời (24/08/2026) — bản gửi câu 19.** ✅ **Cột `claimCategory` sẵn có CHÍNH LÀ phân loại B7** — đừng tạo cột thứ hai. Mô hình khai báo claim, thời điểm sinh Claim ID ở Gate 3 và picker mở cho mọi claim đều được xác nhận. ⚠️ **Bảy** register tham chiếu Claim ID chứ không phải bốn, và **mechanism là giả thuyết sơ bộ ở Gate 3**, xác nhận kỹ thuật ở Gate 5. Xem Phụ lục 3 Phần 5.

#### ✅ R4-Q17 · Trường Gate 1 để tuỳ chọn lúc tạo dự án, bắt buộc ở Gate 1 🔴

**Đã build 2026-08-09** cùng lúc với B1/B2/B3.

Mọi chỗ ghi mới của Gate 1 — 5 trường trên thẻ Project Identification (người yêu cầu + phòng ban · phạm vi ban đầu · người dùng và thị trường mục tiêu ban đầu) và 2 bảng checklist gate 01 (nguồn yêu cầu · loại dự án, xem `R4-Q19`) — **không** bắt buộc trên form Tạo dự án mới, dù chúng là Mandatory ở Gate 1.

**Lý do:** phụ lục liệt kê chúng là yêu cầu **của Gate 1**, không phải yêu cầu để tạo dự án; và ở giai đoạn cơ hội, vài trường thật sự chưa biết (thị trường ban đầu chẳng hạn). Quan trọng hơn: nếu bắt buộc lúc tạo thì check đọc chúng trở thành **vacuous** — luôn luôn thoả, không bao giờ chặn được. Đó đúng là lỗi `sg01-owner` đã mắc và phải hoàn nguyên: một check đọc trường mà form đã bảo đảm thì chỉ là trang trí.

Đánh đổi: dự án vừa tạo xong sẽ hiện 3 mục chưa đạt ở Gate 1 cho tới khi có người vào điền. Chúng tôi coi đó là đúng — Gate 1 là bước phải làm, không phải bước tự xong.

**Câu hỏi:** có đúng là các trường này thuộc về **Gate 1** chứ không phải điều kiện để mở dự án không? Nếu các anh muốn bắt buộc ngay lúc tạo, chúng tôi sẽ chuyển — nhưng khi đó ba mục Gate 1 tương ứng sẽ luôn xanh và không còn ý nghĩa kiểm soát; lúc đó nên bỏ chúng khỏi danh sách readiness thay vì giữ một mục không bao giờ chặn.

**Nếu trả lời khác:** `ProjectList.tsx` (form tạo dự án) đặt các trường thành bắt buộc, và bỏ 3 item `sg01-source` / `sg01-scope` / `sg01-market-user` khỏi `gateReadiness.ts` hoặc chuyển chúng về chỉ đọc dòng Key Gate Check.


> ✅ **Đã trả lời (24/08/2026) — bản gửi câu 20.** ✅ **Đúng y như đã xây, không đổi gì.** *"Current approach is correct — fields optional when the project shell is first created, mandatory before Gate 1 passes."* Lập luận "field bắt buộc lúc tạo ⇒ check thành trang trí" được chấp nhận cùng với nó.

#### ✅ R4-Q18 · Bảng requirements Phase 1 — giá trị cột Priority, và bao nhiêu dòng phải xong 🔴

**Đã build 2026-08-09** cùng B6. Hai chỗ B6 không nói, chúng tôi phải tự chọn:

**(a) Giá trị của cột Priority.** B6 yêu cầu bảng có cột `priority` nhưng **không đưa giá trị nào**. Chúng tôi dùng lại đúng danh sách đã được xác nhận ở F8 cho Next Action: **Low / Medium / High / Critical**. Dùng lại một danh sách đã chốt là suy đoán nhẹ hơn nhiều so với bịa ra danh sách mới, nhưng vẫn là suy đoán.

**(b) Bao nhiêu trong 16 dòng phải hoàn tất thì Gate 2 mới qua.** B6 cho danh sách 16 dòng nhưng không nói cần bao nhiêu. Bắt cả 16 là **bịa ra một quy tắc** — vài dòng thật sự không áp dụng cho một số dự án ("Benchmark or reference product" trên dự án không có benchmark nào). Các dòng còn lại vẫn hiện trên bảng và vẫn đóng được bằng trạng thái, chỉ là không chặn gate.

Bản 09/08 kiểm **2 dòng**, theo hai vế trong chính tiêu đề của phụ lục (*"requirements **and** exclusions"*): `Must-have product requirements` và `Explicit exclusions`.

⚠️ **Sửa 2026-08-11 (project owner phản biện: "đâu phải dự án nào cũng có Explicit exclusions").** Đúng, và lý lẽ biện minh viết trong config lúc đó — *"WorkStatus đã cho phép đóng dòng không áp dụng"* — **là sai sự thật**: `WorkStatus` chỉ có `Not Started / In Progress / Completed / On Hold / Backtracked`, **không có N/A**, khác hẳn `GateCheck.ynna` và `ChecklistItem.status` vốn có Y/N/NA kèm lý do. Mà `requirementDone` chỉ chấp nhận đúng `Completed`. Nên dự án không có exclusion nào chỉ còn hai đường, đều sai: đánh `Completed` cho việc không tồn tại, hoặc bị chặn Gate 02 vĩnh viễn.

`docs/archive/F1_Gate_Readiness_Mapping_Proposal.md` đã ghi sẵn quy tắc này từ trước — *"`requirementDone` chỉ hard-block trên dòng **universally applicable** ở gate đó"* — và dòng exclusions vi phạm nó. Nay chỉ còn kiểm **1 dòng**: `Must-have product requirements`, thứ mọi dự án đều có theo định nghĩa.

**Khoảng trống nền vẫn còn, ghi nhận chứ không lách:** dòng requirement **không có** cách đóng "không áp dụng, kèm lý do". Nếu SME muốn `Explicit exclusions` (hay dòng nào khác không phổ quát) là bắt buộc, việc cần làm là **thêm đường N/A + lý do cho requirement row** rồi mới bật check — chứ không phải bắt người dùng đánh `Completed` cho một ô trống.

**Câu hỏi:** (a) Low / Medium / High / Critical có đúng ý cho Priority không, hay các anh muốn thang khác (ví dụ Must / Should / Could)? (b) ngoài `Must-have product requirements`, còn dòng nào **bắt buộc** phải hoàn tất trước khi Gate 2 qua không — và nếu có dòng không áp dụng cho một dự án cụ thể, các anh muốn đóng nó bằng cách nào (hiện chưa có trạng thái "N/A kèm lý do" cho bảng này)?

**Nếu trả lời khác:** (a) `NEXT_ACTION_PRIORITIES` trong `types/index.ts`, hoặc tách một danh sách riêng cho requirement; (b) thêm/bớt `requirementDone` trong `sg02-requirements` ở `gateReadiness.ts`.


> ✅ **Đã trả lời (24/08/2026) — bản gửi câu 21.** ⚠️ **Priority = Must / Should / Could**, không phải thang Next Action — "criticality remains a risk concept, not a requirements-priority value". 🆕 Và **khoảng trống nền được lấp thay vì né**: thêm **N/A kèm lý do** làm disposition hợp lệ, vì *"hệ thống không được bắt người dùng đánh Completed cho một requirement trống"*. Mọi Must phải xong; Should/Could chỉ hoãn qua PwC. Xem Phụ lục 3 Phần 9.

#### ✅ R4-Q19 · Hai option list của B1/B2 trình bày dạng bảng checklist, và được chọn nhiều giá trị 🔴

**Đã build 2026-08-10**, thay cho bản 09/08. Đây là câu hỏi về **cách trình bày**, nhưng vế (b) là câu hỏi về **luật**.

B1 đưa 16 option cho Request Origin / Source, B2 đưa 6 option cho loại dự án. Cả hai lần SME chỉ đưa *danh sách*, không nói nó hiện lên như thế nào. Bản 09/08 làm 2 **dropdown một giá trị** trên thẻ Project Identification. Bản 10/08 chuyển thành **2 bảng checklist gate 01** (`checklists['requestOrigin']` · `checklists['projectNature']` trong `config/phases.ts`).

**Vì sao đổi.** Đối chiếu trực tiếp với file `.xlsx` (sheet `PHASE1 G1-3 MKTG`, các ô `A20` · `A35` · `A65` · `A85` · `A109` · `A144`): cả **6** bảng chọn-từ-danh-sách của workbook dùng đúng một shape 7 cột — `Gate │ option │ Select │ Owner/function │ Status Y-N-NA │ Evidence/internal link │ Free-type notes/rationale`, **mỗi option một dòng**. Workbook không dùng dropdown cho danh sách option ở bất kỳ đâu. Dropdown làm mất 4 cột cuối, tức mất chỗ ghi *ai xác nhận option này* và *bằng chứng nào* (ví dụ số ticket của một `Sales request`).

Cần nói rõ một dữ kiện: Gate 01 trong workbook **không có bảng nhập liệu nào** — chỉ 3 dòng Key Gate Check, mọi checklist trong PHASE1 đều tag gate 02/03. Nên hai bảng này là **hai bảng đầu tiên của Gate 01**; chúng không sao chép một tab nào có sẵn, chỉ đi theo shape của 6 bảng anh em.

**Ba thứ chúng tôi tự quyết, không có trong B1/B2:**

**(a) Layout** — bảng option như 6 bảng kia, thay vì dropdown.

**(b) Chọn nhiều giá trị.** Đây là **hệ quả về luật**, không phải thẩm mỹ: shape bảng cho tick nhiều dòng, nên một dự án giờ có thể vừa `Reformulation` vừa `Market extension`. Dropdown cũ ép đúng một giá trị — mà chính việc ép đó cũng là suy đoán, chỉ là suy đoán ngầm, chưa bao giờ được ghi ra. Câu B2 (*"whether it is new development, reformulation, claim change, …"*) đọc theo cả hai cách đều được.

**(c) Cột `Owner / function`.** Workbook có cột này cho cả 6 bảng, và nó phải có giá trị. Gate 01 không có bảng nào trong workbook nên **không có ô nào để tra** → phải tự chọn.

Bản 10/08 lấy `GATES['SG01'].primaryOwner` = `Project owner / Sales / NPD` (nguyên văn ô `Stage_Map!F8`) cho cả hai. **Sửa 11/08 sau khi project owner phát hiện nó lệch:** đó là copy từ **sai cột**. `Stage_Map!F8` là cột *"Primary owner"* — ai sở hữu cả gate, và ở sheet đó mọi gate đều 3 tên (F9 `Project owner / Marketing / Regulatory`, F10 `Marketing / Regulatory / R&I`, F11 `R&I / Regulatory / Procurement`…). Còn cột `Owner / function` trong các bảng option ghi *ai tick và chứng minh dòng này*, và cả 6 bảng của workbook đều **2 tên** (`Marketing / Project owner` · `Marketing / NPD` · `Marketing / Regulatory` · `Regulatory / Scientific Review`), y như 14 section có sẵn trong config. Hệ quả: `requestOrigin` từng là section duy nhất trong 16 cái đọc khác mọi anh em của nó.

Nay theo quy tắc: **2 tên, cả hai đều nằm trong 3 chức năng mà chính workbook cấp cho Gate 01**, chọn theo nội dung bảng — `Project owner / Sales` cho Request Origin (phần lớn option của B1 đến qua Sales: Sales/Customer/Distributor request) và `Project owner / NPD` cho Project Nature (mới/tái công thức/đổi claim là phán định phạm vi phát triển, không phải thương mại). Không thêm chức năng mới nào, nhưng **cách chia là phán định của ta**. Giá trị lưu theo từng dòng nên đã kèm migration `20260811033000_gate1_owner_function_two_names` để cập nhật các dòng đã tạo.

Một hệ quả kỹ thuật đáng ghi: trigger `newOrRepositionedProject` (điều kiện competitor review ở Gate 3) đọc 2 bảng này, nên vế 1 thành `natures.some(...)` — một dự án tick `Packaging change` + `Market extension` sẽ **fire**, vì `Market extension` nằm trong nhóm không-phải-administrative (nay đã có đáp án — bản gửi câu 11: **không** loại nào tự động là hành chính).

**(d) Tên của bảng thứ hai — chữ của ta, không phải của SME (thêm 2026-08-11, project owner phát hiện).** B1 cho hẳn tên field (*"Please add the field: **Request Origin / Source**"*) nên bảng thứ nhất mang đúng tên SME viết. B2 **không cho tên nào** — nó là một mệnh đề (*"whether it is new development, reformulation, claim change, packaging change, market extension or lifecycle improvement"*) — nên tiêu đề buộc phải do ta đặt. Bản 10/08 đặt là **`Project Nature`**; kiểm lại thì chữ *"nature"* **không có trong bất kỳ phản hồi nào của SME** và trong toàn workbook chỉ xuất hiện ở *"de**nature**d alcohol"*. Tức hai bảng mới đứng cạnh nhau, một cái tên nguyên văn của SME, một cái ta bịa.

Đổi thành **`Development / Change Type`** (11/08): mọi chữ đều lấy từ chính mệnh đề B2 (*new **development** … packaging **change**, claim **change***), cộng "Type" lặp mẫu tiêu đề `PRODUCT TYPE` của bảng anh em; và đối chiếu quy ước đặt tên của 6 bảng workbook (`TARGET AREA OF BODY` · `PRODUCT TYPE` · `TARGET USERS / LIFE STAGE` · `TARGET COUNTRIES / MARKETS` · `CLAIM / BENEFIT AREAS` · `INITIAL EVIDENCE / PROOF ROUTE` — cụm danh từ, lựa chọn nối bằng `/`). Cân nhắc và loại `Project Type` vì dễ nhầm với bảng `Product Type` gate 02 nằm ngay dưới. **Vẫn là chữ của ta**, nên phải hỏi. `key`/`sectionKey` giữ nguyên `projectNature` (định danh nội bộ, đổi thì phải migrate dữ liệu mà người dùng không thấy gì).

**(e) Chỗ đặt 5 field free-text của B1/B2/B3 (thêm 2026-08-11).** Requester name · Requester department · Initial product scope · Initial target user / life-stage · Initial target market(s) hiện nằm trong một khối phụ **"Opportunity & Request (Gate 01)"** ta tự thêm ngay dưới bảng PROJECT IDENTIFICATION. Đây là **lựa chọn bố cục của ta**, không có tiền lệ trong workbook.

⚠️ **Đính chính một bằng chứng đã dùng sai:** trước 11/08 chỗ này được biện minh bằng nhận định *"khối PROJECT IDENTIFICATION của workbook để trống 5 slot parameter bên phải, ta chỉ điền vào"*. **Nhận định đó sai.** Khối đó có đủ 10 nhãn (`A8:A12` Project ID → Brand / Customer; `D8:D12` Date opened · Target launch date · Product / SKU · Owner / Department · Countries / Markets), khớp 1:1 với 10 dòng app đang hiển thị, **không còn slot trống nào**. Sai vì lỗi script đọc `.xlsx`: ô rỗng ghi dạng tự đóng `<c r="B8" s="24"/>`, regex chỉ khớp `<c …>…</c>` nên nuốt ô rỗng vào ô kế tiếp và gán giá trị của `D8` cho `B8`. Đã sửa script; các kết luận khác từ script đó (shape 7 cột của 6 bảng, `Owner / function` đều 2 tên, `Stage_Map!F8`, Gate 01 không có bảng nhập liệu) đã kiểm lại và vẫn đúng.

**Câu hỏi:** (a) hai danh sách này nên là bảng option như 6 bảng sẵn có của workbook, hay các anh thực sự muốn một ô chọn nhanh một giá trị? (b) một dự án có được mang **nhiều** loại cùng lúc không (ví dụ vừa cải tiến công thức vừa mở rộng thị trường), hay bắt buộc chọn đúng một? (c) hai giá trị `Owner / function` trên có đúng người chịu trách nhiệm ở Gate 1 không? (d) tên bảng thứ hai nên là gì — `Development / Change Type` như ta đang tạm dùng, hay tên các anh muốn (như B1 đã cho tên "Request Origin / Source")? (e) 5 field free-text nên nằm ở đâu — một khối riêng dưới Project Identification như hiện nay, hay các anh muốn chúng thành parameter của chính bảng PROJECT IDENTIFICATION?

**Nếu trả lời khác:** (a)+(b) bỏ 2 section trong `PHASE_1.checklistSections` (`config/phases.ts`), trả `requestOrigin`/`projectNature` về `ProjectIdentity` + cột `projects` (migration `20260810041500_gate1_origin_nature_checklists` là bản mẫu để đảo chiều, gồm cả bước chuyển dữ liệu), đổi `sg01-source`/`sg01-scope` về `identityFieldFilled` trong `gateReadiness.ts`, và sửa `newOrRepositionedProject` trong `gateProgress.ts` về so sánh bằng; (c) sửa `ownerFunction` của 2 section trong `config/phases.ts`.


> ✅ **Đã trả lời (24/08/2026) — bản gửi câu 22.** ✅ **(a)(d)(e)** — bố cục bảng được chấp nhận đúng trên lập luận ta nêu ("provides owner, status, evidence and rationale fields"), tên bảng được chấp nhận, và năm trường free-text giữ nguyên ở khối riêng. ⚠️ **(b)** nhiều loại thì được, nhưng phải chỉ định một loại là **Primary**. ⚠️ **(c)** cả hai giá trị owner/function đều đổi: **Requesting Function / Project Owner** và **NPD / Project Owner**. Xem Phụ lục 3 Phần 9.

#### ✅ R4-Q20 · Hai item do dev tự thêm đang hard-block gate mà chưa từng được hỏi 🔴

**Phát hiện 2026-08-11 khi rà nhãn `source` trên panel.** Bốn item trong `GATE_READINESS` mang `source: 'dev-decision'` — panel in đúng chữ *"not SME-confirmed"* bên cạnh từng cái — nhưng **không cái nào từng xuất hiện trong bất kỳ vòng nào** gửi SME. Rà lại thì 2 trong 4 là dán nhãn sai và đã sửa (`sg07-restrictions-linked` → `b3`, vì nó đọc một dòng Key Gate Check của workbook y như `sg07-safety-questions`; `sg07-bom-reconciled` → `f-series` mới, vì F14 đã confirm luật này từ 21/07). Còn lại đúng 2 item là quyết định của dev, và cả hai đều **Mandatory**:

**(a) Gate 2 — `sg02-product-type`: "Product type — at least one selected".** Thêm 2026-07-23 theo yêu cầu của project owner. Hôm nay nó chặn cứng quyết định Gate 02 trên mọi dự án. Phụ lục F1 của SME **không** có item này; trong 19 câu vòng 31/07, chữ "Product type" xuất hiện đúng **một lần**, nằm trong phương án **(b)** của B4 (*"the combination of the four Phase 1 checklist sections"*) — mà B4 được trả lời là **(a)**, tức brief là một record riêng, không phải tổ hợp 4 checklist. Nên không thể coi câu trả lời B4 là đã xác nhận item này; nếu có, nó nghiêng về phía ngược lại.

**Dữ kiện làm suy đoán này yếu đi hẳn (thêm 2026-08-11 khi project owner phản biện rằng đây là suy đoán quá dễ):** Phase 1 có **4** checklist tag gate 02, và danh sách Gate 2 của SME gọi tên đúng **3** — `targetUsers` ("Target user and life stage"), `targetArea` ("Intended use and body area"), `targetMarkets` ("Selected markets") — **bỏ ra đúng `productType`**. Bỏ sót một cái giữa ba cái anh em được gọi tên đích danh khó đọc là ngẫu nhiên. Đây không phải "dấu hiệu quá rõ ràng" theo hướng ta đoán; nó là dấu hiệu rõ ràng theo hướng **ngược lại**.

**Cân nhắc thẳng thắn về khả năng (thêm 2026-08-11, sau khi project owner phản biện phép so sánh dưới đây):** khả năng cao là **quy tắc này đúng** — trong thực tế NPD, brief hầu như luôn nêu dạng sản phẩm, và một brief không nói làm cream hay serum thì khó gọi là hoàn chỉnh. Lý do hỏi **không phải** vì ta nghĩ mình sai, mà vì **ta không giải thích được vì sao SME gọi tên 3 bảng và bỏ đúng bảng thứ 4**. Nếu chỗ bỏ trống đó có chủ ý thì hẳn có lý do ta chưa biết (dạng sản phẩm chốt ở Gate 3/5 và ghi chỗ khác; hoặc bảng Product Type dùng cho mục đích khác như đăng ký product family). Câu hỏi cần đặt là *"chỗ trống đó có chủ ý không"*, không phải *"quy tắc này có hợp lý không"* — hỏi kiểu sau thì chắc chắn nhận được "có", và không học được gì.

**Kịch bản hỏng nếu ta sai:** dự án cố ý chưa chốt dạng bào chế ở Gate 2 (*"sản phẩm bảo vệ da cho trẻ sơ sinh, cream hay balm để formulation quyết ở Gate 5"*) không thể qua Gate 2 dù brief đầy đủ.

**So sánh với bug `pbCautionLimits` ở Gate 7 — chỉ đúng một nửa, đừng dùng quá tay.** Giống nhau ở **cách phát hiện**: cả hai đều là lỗi không hiện trong code (build sạch, lint sạch), chỉ lộ khi có dự án thật đụng vào. Khác nhau ở **mức độ khả năng sai**, và đây là chỗ phép so sánh đổ: ca Gate 7 sai theo kiểu không cần hỏi ai cũng biết — sản phẩm không có người dùng maternal thì bảng giới hạn thai kỳ *không thể* áp dụng, đó là thực tế chứ không phải chính sách. Còn "brief có bắt buộc chốt dạng bào chế chưa" là một quyết định nghiệp vụ, không có đúng/sai hiển nhiên. Đặt hai ca cạnh nhau mà không nói rõ vế nào giống vế nào thì thành ra ngụ ý "cái này cũng sai rành rành như cái kia", điều không ai chứng minh được.

**(b) Gate 7 — `sg07-matrix-rows`: "Formulation safety matrix — every formula ingredient assessed".** Cần tách hai vế: bản thân việc **phải có ít nhất một dòng** là guard kỹ thuật của ta và không cần ai xác nhận (`.every()` trên register rỗng là vacuously true — chính là hạng lỗi S2 tồn tại để bắt). Vế cần xác nhận là **cardinality** mà nhãn item đang khẳng định: matrix phải có một dòng cho **mọi** ingredient trong công thức. Con số đó chưa ai nói.

**Câu hỏi:** (a) Gate 2 có được phép qua khi chưa chọn loại sản phẩm nào không? (b) Ở Gate 7, safety matrix có bắt buộc phủ **mọi** ingredient của công thức, hay chỉ những ingredient thuộc diện cần đánh giá (hoạt chất, chất bảo quản, hương…) — và nếu chỉ một phần thì tiêu chí là gì?

**Nếu trả lời khác:** (a) bỏ `sg02-product-type` khỏi `GATE_READINESS.SG02` trong `gateReadiness.ts`, hoặc hạ `tier` xuống `Supporting`; (b) đổi `sg07-matrix-rows` từ `registerHasRows` sang một check hẹp hơn, hoặc giữ nguyên và sửa `label` cho khỏi khẳng định quá.

**Luật mới để chuyện này không lặp lại:** `npm run verify:readiness` sweep **S4** — item nào mang `source: 'dev-decision'` mà không khai `assumption` trỏ tới một câu hỏi thật thì fail. Nghĩa là từ nay không thể ship một quyết định của dev đang chặn gate mà chưa đưa vào danh sách hỏi.


> ✅ **Đã trả lời (24/08/2026) — bản gửi câu 23.** ✅ **Cả hai yêu cầu dev tự thêm đều đúng.** Gate 2 đòi ít nhất một product type; Gate 7 đòi mọi thành phần trong công thức có safety disposition. 🆕 Kèm hai điều chỉnh: thêm option **"Product form under evaluation — to be confirmed by Gate 5"**, và matrix được phủ bằng 1 trong **4 đường** chứ không bắt mỗi thứ một monograph. Xem Phụ lục 3 Phần 6 và 9.

#### ✅ R4-Q21 · `initialTargetMarkets` trùng với `Countries / Markets` đã bắt buộc lúc tạo dự án — và B3 được trả lời trên tiền đề ta nêu sai 🔴

**Phát hiện 2026-08-11 (project owner: "Initial target market(s) có cảm giác thừa, dưới đã có Target Countries / Markets rồi").**

Vế Gate 1 vs Gate 2 thì **không** thừa và đã được SME xác nhận: B3 chọn phương án (a), *"These are preliminary fields and do not replace the complete Gate 2 assessment"* — hai mốc thời gian khác nhau, và nếu Gate 1 đọc checklist Gate 2 thì hai gate gộp thành một.

**Chỗ trùng thật là với `ProjectIdentity.markets`:** parameter `Countries / Markets` của workbook (ô `D12` sheet PHASE1), **bắt buộc** trên form Tạo dự án (`ProjectList.tsx`, `rules={[{ required: true }]}`), chọn từ danh sách có kiểm soát, và hiển thị ngay trong cùng thẻ Project Identification — cách ô `Initial target market(s)` hai dòng. Người dùng chọn thị trường một lần lúc tạo, rồi gõ tay lần nữa.

⚠️ **Và email B3 của ta nói sai tiền đề:** *"The only target-market and target-user information in the system is the Gate 2 selection"* (`docs/rounds/2026-07-31-our-questions-round3.md` dòng 113). `identity.markets` đã tồn tại từ trước. SME trả lời B3 mà không biết điều đó — riêng phần **thị trường**; phần **người dùng** thì câu đó đúng (không có field identity nào cho target user), nên `initialTargetUsers` không mắc vấn đề này.

**Vì sao không sửa bằng cách hiển nhiên:** bỏ `initialTargetMarkets` rồi cho check đọc `identity.markets` sẽ làm check **vacuous** — form bắt buộc nên nó luôn thoả, không bao giờ chặn. Đúng lỗi `sg01-owner` đã phải hoàn nguyên (xem `R4-Q17`).

| | Cách | Đánh đổi |
|---|---|---|
| (i) | Giữ nguyên | Gõ trùng; check Gate 1 chặn được thật |
| (ii) | Bỏ field, đọc `identity.markets` | Hết trùng; item Gate 1 không bao giờ chặn → phải gỡ khỏi readiness thay vì giữ một mục trang trí |
| (iii) | Bỏ `markets` khỏi diện bắt buộc lúc tạo dự án | Hết trùng **và** check vẫn chặn được; nhưng đổi form tạo dự án và đổi ý nghĩa một parameter của workbook |

Hiện đang ở **(i)**, không đổi hành vi khi chưa có trả lời.

**Câu hỏi:** thị trường ban đầu nên ghi ở đâu — ô `Countries / Markets` đã có sẵn lúc mở dự án, hay một ô "initial" riêng như hiện nay? Nếu ô sẵn có là đủ thì thị trường có nên thôi bắt buộc lúc tạo dự án, để việc ghi nó trở thành một phần công việc của Gate 1?

**Nếu trả lời khác:** (ii) bỏ `initialTargetMarkets` khỏi `ProjectIdentity` + `projects` + `OPPORTUNITY_FIELDS` trong `ProjectIdentificationCard.tsx`, và gỡ vế `initialTargetMarkets` khỏi `sg01-market-user` trong `gateReadiness.ts`; (iii) bỏ `required` của field `markets` trên form `ProjectList.tsx` rồi trỏ `sg01-market-user` sang `identity.markets`.


> ✅ **Đã trả lời (24/08/2026) — bản gửi câu 24.** ⚠️ **Bỏ trường trùng.** Countries / Markets là nguồn sự thật duy nhất; trường free-text *Initial target market* bị gỡ. Và phản biện "check sẽ thành trang trí" được giải quyết trực tiếp: **Countries / Markets thôi bắt buộc lúc tạo dự án**, trở thành bắt buộc trước khi Gate 1 pass. *Initial target user* giữ nguyên. Xem Phụ lục 3 Phần 9.

#### ✅ R4-Q22 · Map option Target Users (Gate 02) sang Vulnerable group — mức chắc chắn không đều 🔴

**Đã build 2026-08-11, do project owner đề xuất** ("map tương ứng với các đối tượng trong target user phase 2, ứng dụng sẽ logic và đỡ sai sót hơn").

**Lỗ hổng nó bịt:** B5 cố ý tách hai bản ghi — *"distinguish between selecting a target user and explicitly recognising a vulnerable-use context"* — nhưng **không ai kiểm hai bản ghi có KHỚP nhau**. Trước 11/08, một dự án tick `Pregnancy` ở Target Users mà ghi `No vulnerable-user group identified` ở Vulnerable-User Assessment thì **Gate 2 vẫn qua**. Đó không phải hai phán định độc lập, đó là tự mâu thuẫn.

Check mới `vulnerableGroupsCovered` (`gateProgress.ts`) đọc bảng `TARGET_USER_TO_VULNERABLE_GROUP` (`config/vulnerableGroups.ts`): mọi target user đã tick mà có map thì phải có một dòng assessment mang đúng group đó. Nó chỉ **thêm** yêu cầu, không bao giờ tự thoả hộ — dòng đó vẫn phải đủ safety pathway + reviewer + notes.

**Ba mức chắc chắn của bảng map — đây là phần cần xác nhận:**

| Mức | Cặp map | Ghi chú |
|---|---|---|
| 1 · trùng chữ | `Pregnancy` · `Breastfeeding` · `Postpartum` · `Infant 0+` | không có suy luận nào |
| 2 · đổi tên cùng một nhóm dân số | `Child 2+` / `Child 3+` → **Young child** · `Cancer patient support` → **Oncology or medically vulnerable support context** · `Kidney disease support` → **Renal or other health-related support context** · `Sensitive skin` → **Sensitive or compromised skin** | gần như nguyên văn danh sách B5 |
| 3 · **KHÔNG map** | `Dry / eczema-prone skin` (da eczema có phải "compromised skin"? y học đọc là có, nhưng B5 không nói) · `Intimate area` · `Swimmers` · `Family use` (sản phẩm gia đình có thể tới tay trẻ nhỏ — workbook không nói) · `Oily skin` · `General adult` · `Professional / HCP recommendation` · `Other - specify` | map là cách đọc của ta, không phải đổi tên |

Hệ quả của mức 3: dự án **chỉ** nhắm `Dry / eczema-prone skin` vẫn ghi được "none" và qua Gate 2.

**Câu hỏi:** (a) 5 cặp ở mức 2 có đúng là cùng một nhóm dân số không? (b) `Dry / eczema-prone skin` có thuộc *"sensitive or compromised skin"* không? (c) `Family use`, `Intimate area`, `Swimmers` có ngụ ý nhóm dễ tổn thương nào không?

**Nếu trả lời khác:** thêm/bớt cặp trong `TARGET_USER_TO_VULNERABLE_GROUP` (`packages/shared/src/config/vulnerableGroups.ts`) — sweep S1 đã kiểm cả hai đầu của mỗi cặp phải tồn tại trong config, nên gõ sai tên sẽ fail build chứ không âm thầm vô hiệu hoá.

**Bổ sung 2026-08-11 (cùng ngày, project owner yêu cầu 4 việc):** ràng buộc nay đi **cả hai chiều**, và chỗ đáng chú ý là **mức cứng không đồng đều — có chủ ý**:

| Quy tắc | Mức | Vì sao |
|---|---|---|
| Một group chỉ một dòng | **chặn lưu** | 2 dòng Pregnancy không phải 2 đánh giá, mà là 1 đánh giá nhập 2 lần — sẽ lệch nhau ngay khi sửa một bên |
| Dòng "none" không đứng cạnh dòng nào khác | **chặn lưu** | "không xác định nhóm nào" là một khẳng định vắng mặt, mâu thuẫn trực tiếp |
| Ghi group **trùng chữ** với target user (Pregnancy · Breastfeeding · Postpartum · Infant 0+) mà target user đó chưa tick | **chặn lưu** | cùng một chữ, ai đọc cũng thấy mâu thuẫn — không cần map gì |
| Ghi group thuộc **map mức 2** (Young child · Sensitive or compromised skin · Oncology… · Renal…) mà không target user nào tương ứng | **chỉ cảnh báo** | các group này có thể đến hợp lệ từ một target user ta **chưa map** (Family use → trẻ nhỏ; Dry/eczema-prone → compromised skin) hoặc từ phán định của Safety/Regulatory — chính là chỗ B5 để sẵn option *"Other population identified by Safety or Regulatory"*. Chặn cứng ở đây là biến **cách đọc chưa xác nhận của ta** thành luật người dùng không lách được — đúng sai lầm mà màn hình caution thai kỳ đã mắc một lần |
| Bỏ tick target user đang có dòng assessment tham chiếu | **chặn** (UI disable + API từ chối) | cùng dạng với "không xoá được dòng Supplier & RM Evidence khi Formula BOM còn tham chiếu". Hai target user chung một group (`Child 2+`/`Child 3+` → `Young child`) thì chỉ **cái cuối cùng** bị ghim |

**Câu hỏi bổ sung (d):** hướng ngược lại có nên chặn cứng cho **cả** 4 cặp mức 2 không, hay giữ cảnh báo như hiện tại vì một nhóm dễ tổn thương có thể được Safety/Regulatory nhận diện mà không cần target user tương ứng?


> ✅ **Đã trả lời (24/08/2026) — bản gửi câu 25.** ✅ **Chín cặp ánh xạ và cách xử lý hai chiều đều đúng.** ⚠️ Bốn option chưa map đều KHÔNG phải "thêm vào map": **tách** Dry / eczema-prone (da khô đơn thuần không phải nhóm dễ tổn thương, da dễ chàm thì có) · family use phải **hỏi lại nhóm tuổi** · intimate area kích hoạt đánh giá use-site riêng · swimmers xác nhận là không. Xem Phụ lục 3 Phần 9 và 7.

#### ✅ R4-Q23 · Sổ Claim → Evidence Traceability thuộc gate nào (quyết định lúc nào nó khoá) 🔴

**Project owner phát hiện 2026-08-11:** NPD Front-End Roadmap ghi bước 4 — *"Evidence Plan & Claim Support"* — có **Sign-off gate: SG05 / SG08**. Nhưng trong app, ba register sinh ra từ sheet đó không cùng một hướng:

| Register | Mục của sheet | Gate trong app | Khớp roadmap? |
|---|---|---|---|
| `evidencePlanProspective` | §1 *"agree BEFORE formula lock — Gate 3/5"* | `05` | ✅ |
| `evidenceTestProtocol` | §2 *"complete once prototype exists — Gate 8"* | `08` | ✅ |
| `claimEvidenceTraceability` | §3 *"CLAIM → EVIDENCE TRACEABILITY (permanent claim IDs)"* — **header không ghi gate nào** | **`10/11`** | ❌ |

**Vì sao chuyện này không nhỏ:** `RegisterConfig.gate` điều khiển `isGateRefLocked`, tức **thời điểm bảng đóng băng**. `10/11` = còn sửa được đến khi qua cả Gate 10 lẫn 11. Nếu theo roadmap thành `05/08` thì nó khoá ngay sau Gate 8.

**Lý lẽ giữ `10/11` (cách đọc của ta):** §1 và §2 là **hai bước có sign-off**; §3 là **sổ cái sống**, không phải một bước. Claim vẫn phát sinh ở Gate 10 khi làm PIF và Published Information — `publishedInfoApproval` (gate 10) link tới Claim ID ở đây, và `unsupportedClaimRows()` chặn phát hành dựa trên trạng thái claim. Khoá sau Gate 8 nghĩa là **không thêm được claim ở Gate 10 nếu không Backtrack**, tức bắt người dùng mở lại một gate đã đóng chỉ để ghi một claim mới.

**Lý lẽ ngược lại:** roadmap là văn bản do chuyên gia soạn và nói rõ SG05/SG08 cho cả sheet; ta đang để một trong ba bảng lệch khỏi con số đó mà chưa ai xác nhận.

**Câu hỏi:** sổ Claim → Evidence Traceability nên đóng băng ở đâu — sau **SG08** như dòng roadmap của sheet, hay giữ mở tới **SG10/SG11** vì claim còn được tạo trong lúc làm PIF và Published Information? Nếu chọn SG08 thì việc thêm claim ở Gate 10 sẽ phải Backtrack — các anh chấp nhận điều đó chứ?

**Nếu trả lời khác:** đổi `gate` của `claimEvidenceTraceability` trong `packages/shared/src/config/registers.ts` (chỉ một chuỗi; `isGateRefLocked` và badge gate tự theo).


> ✅ **Đã trả lời (24/08/2026) — bản gửi câu 26.** ✅ **Sổ không đóng băng ở Gate 8** — mở suốt Gate 10 và 11, đúng như đã xây, nên không có chuyện thêm claim ở Gate 10 phải Backtrack. 🆕 Cái được thêm là **kiểm soát revision**: revision đã được Regulatory hoặc Gate 10 duyệt trở thành read-only. Xem Phụ lục 3 Phần 5.

#### ✅ R4-Q24 · C1 — bằng chứng nào chứng minh "đã Regulatory review", và 4/7 điều kiện chưa kiểm được 🔴

**Đã build 2026-08-11** sau khi project owner hỏi *"cơ chế này đã làm chưa"* và *"regulatory review đánh giá ở màn hình nào"*.

**Phần luật thì SME đã nói đủ, không phải suy đoán:** phụ lục F1 (21/07) liệt kê *"Regulatory review of high-risk or borderline claims"* trong mục **Required** của Gate 3; A1 vòng 3 xác nhận *"Conditional: hard-blocks only when its defined trigger applies"* và chấp nhận tier Conditional của item này; C1 cấp 7 điều kiện kích hoạt. Ghép lại: claim rơi vào diện đó thì review là **bắt buộc** và item **chặn Gate 3**.

**Phần SME chưa nói — ta phải bù, và đây là chỗ cần xác nhận:**

**(a) Bằng chứng nào tính là "đã review".** C1 không nói. Trước hôm nay app **không có ô nào** ghi ai review claim, ngày nào, kết luận gì — nên nếu chỉ wire trigger thì Gate 3 sẽ bị chặn mà không có cách nào gỡ. Đã thêm 5 cột vào sổ claim (nhóm gate 03), **mượn nguyên khuôn D3** — khuôn chính SME viết cho tình huống y hệt ở Gate 4 (*Reviewer assessment · Reviewer · Review date · Rationale · Evidence link*): `regulatoryReviewOutcome` · `regulatoryReviewer` · `regulatoryReviewDate` · `regulatoryReviewRationale` · `regulatoryReviewEvidence`. Item thoả khi **mọi claim đang trigger** có đủ 3 cột đầu.

**(b) Bộ giá trị của Outcome là của ta:** `Approved` · `Approved with conditions` · `Not approved` · `Further information required`. Bốn giá trị của D3 nói về việc một hit watch-list có thật hay không, không chuyển sang claim được.

**(c-bis) Vế *"varies from previously approved wording"* — cài được sau khi project owner phản biện.** Project owner chỉ ra: *"đến Evidence Plan & Claim Support mới bắt đầu khai báo claim thì làm gì có claim nào trước đó"*. Đúng ở thời điểm khai báo — và chính điều đó nói lên vế này **không nói về lúc khai báo**, mà về **thay đổi theo thời gian**. Thêm nữa, C1 đã có vế riêng *"not in the approved Claims Library"*, nên vế này không thể lại là chuyện thư viện claim, nếu không hai vế trùng nhau.

Đọc là: **câu chữ bị sửa SAU khi đã được duyệt**. Kịch bản thật nó chặn: Gate 3 duyệt *"helps soothe the **appearance** of dry skin"*, ba tuần sau thành *"soothes irritated skin"* — chữ ký cũ nằm dưới một câu chưa ai duyệt.

Đã cài: cột `reviewedWording` (**read-only**, do API ghi trong `snapshotReviewedWording`) chụp lại câu chữ **mỗi khi ngày review được ghi hoặc đổi**. Trigger bật lại — và item ngừng thoả — khi `approvedWording` khác `reviewedWording`. Snapshot do server tính chứ không phải người gõ: một ảnh chụp mà ai cũng sửa được thì không chứng minh gì.

Nhờ vậy **4/7** vế của C1 đã cưỡng chế được, không còn 3.

**Hai điểm mờ mới, vẫn là cách đọc:** (e) *"previously approved"* là lần duyệt trước **của chính claim này** (cách đọc trên) hay một claim đã duyệt ở **dự án/SKU khác** — nếu là vế sau thì lại phải chờ Claims Library; (f) sửa **chính tả hoặc rút gọn** có tính là "varies" không? Hiện so sánh **chuỗi thuần**, tức mọi khác biệt đều tính. D2 vòng 3 có tinh thần ngược lại cho nội dung published (*"Minor adaptation may be allowed where the meaning, scope, qualifiers and evidence burden remain unchanged"*), nhưng áp tinh thần đó ở đây cần một người xác nhận "khác nhưng cùng nghĩa", không phải một phép so chuỗi.

**(c) Chỉ 4/7 điều kiện của C1 đánh giá được (3 vế phân loại + vế wording ở trên).** Ba vế đọc phân loại B7 (category = Borderline / category = Therapeutic — not permitted / risk = High) đã chạy. Ba vế còn lại **không có nguồn dữ liệu**: wording không nằm trong Claims Library (F11 chưa có nội dung — và trước cả nội dung là câu hỏi nó nằm ở cấp nào, `R4-Q25`) · thị trường áp hạn chế (F10 chưa có) · claim liên quan pregnancy/breastfeeding/infant/disease… (đọc từ wording là phán định).

Ba vế đó **hiện thẳng trên item** qua trường mới `coverageNote` (*"Partly checked: …"*) thay vì im lặng — vì bỏ vế không đánh giá được rồi báo cáo như đã phủ hết luật đúng là một trong hai sai lầm CLAUDE.md ghi tên.

**(d) `Pending classification` được coi là đã trigger.** C1 không nhắc giá trị này. Ta đọc: chưa phân loại thì chưa biết rủi ro, nên phải review. (Đã ghi từ trước ở `R4-Q9`.)

**Câu hỏi:** (a) 5 cột review trên có đủ và đúng tên không, hay các anh muốn khuôn khác? (b) 4 giá trị Outcome có đúng không? (c) claim `Not approved` thì Gate 3 qua được nếu claim đó vẫn nằm trong sổ, hay phải xoá/đánh dấu bỏ? (d) review theo **claim** (một lần) hay theo **thị trường** — vế *"the market imposes a specific restriction"* của chính C1 hàm ý có thể phải theo thị trường?

**Nếu trả lời khác:** đổi `CLAIM_REVIEW_COLUMNS` / `CLAIM_REVIEW_OUTCOMES` trong `packages/shared/src/config/claimReview.ts`, và các cột tương ứng ở `claimEvidenceTraceability`.


> ✅ **Đã trả lời (24/08/2026) — bản gửi câu 27.** ✅ **Năm trường và bốn outcome đều được chấp nhận**, và cơ chế snapshot wording được xác nhận ("A later change to the reviewed wording must invalidate the previous review"). 🆕 Thêm **11 cờ chủ đề claim có cấu trúc**, làm cho điều kiện C1 thứ ba hết là phán định. ⚠️ Outcome trong bản trả lời viết hoa (Approved with Conditions…). Xem Phụ lục 3 Phần 5.

#### ✅ R4-Q25 · Claims Library nằm ở cấp nào — và dự án tham chiếu tới nó ra sao 🔴

**Chưa build gì cả.** Đây là câu hỏi hỏi **trước khi** build, khác với R4-Q20…R4-Q24 (đều là thứ đã ship rồi mới đi xác nhận). Nêu ra 2026-08-12 sau khi project owner hỏi *"Claims Library mục đích để làm gì, workbook có phần này chưa"*.

**Đã kiểm, không phải phỏng đoán:** giải nén danh sách sheet của **cả hai** workbook (`MBc360 Master Product Development System File.xlsx` và bản `v2`) — **không có tab nào là Claims Library**. Bốn tab dính chữ "claim" đều ở cấp dự án: `George-Mechanism_Claims`, `George-Twinkle5_Claims`, `ChiChu-SKU_Claims_PIF`, `4. Evidence & Claim Support`. Chúng ghi *sản phẩm này nói gì*, không ghi *công ty được phép nói gì*.

**Cách đọc của ta:** Claims Library ở **cấp công ty**, đứng trên mọi dự án — một bộ từ vựng đã duyệt mà mọi dự án tra vào, không dự án nào sở hữu. Hai căn cứ: (1) chính C1 viết *"wording is **not in** the approved Claims Library"* — một phép đối chiếu với thứ nằm **ngoài** dự án; (2) workbook là hồ sơ của **một** dự án, nên về nguyên tắc không chứa được thư viện dùng chung — thiếu ở đây là thiếu thật, không phải ta bỏ sót khi số hoá.

**Phần SME đã nói rồi, không cần hỏi lại:** F11 (21/07) cấp đủ **8 trường** mỗi entry (approved term · prohibited alternatives · required evidence type · applicable products · applicable markets · approved context/channel · limitations/qualifiers · owner) và nói **Technical + Regulatory cùng duy trì**. Nên câu hỏi này **chỉ về cấp lưu trữ và cách tham chiếu**, không hỏi lại hình dạng entry.

**Vì sao cấp lưu trữ quyết định kiến trúc:** không dựng được bằng `RegisterConfig` như ~30 sổ còn lại. Register được **scaffold cho từng dự án** lúc tạo project (`store/factory.ts` + `project-scaffold.ts`), tức mỗi dự án một bản sao — sai hoàn toàn với thứ phải là **một** danh sách dùng chung. Phải là bảng Prisma toàn cục + trang admin riêng, gần `admin-users.controller.ts` hơn là gần `registers.ts`. Xây nhầm cấp thì không sửa được bằng đổi config.

**Câu hỏi:** (a) cấp công ty như ta đọc, hay theo brand / thị trường / product family? (b) claim của dự án có **bắt buộc trỏ tới một entry** không — nếu có thì *"không nằm trong library"* là dữ kiện máy biết, nếu không thì nó vẫn là phán định của người review và vế C1 này **không bao giờ tự động hoá được**; (c) ai được thêm/sửa entry, entry có quy trình duyệt riêng không, *"cùng duy trì"* có nghĩa cả hai phải đồng ý từng entry? (d) claim được duyệt trên một dự án với wording chưa có trong library thì có **đẩy ngược** vào library cho dự án sau dùng lại không? (e) entry bị sửa/thu hồi sau đó thì các claim đã duyệt từ nó trên sản phẩm **đang bán** xử lý thế nào — bật cờ review lại được, nhưng đó là quyết định có hệ quả thương mại, ta không tự đặt.

**Liên đới:** (b) quyết định vế *"not in the approved Claims Library"* của C1 có bao giờ rời khỏi `UNEVALUATED_C1_CONDITIONS` hay không. Câu (e) của `R4-Q24` (*"previously approved"* là của claim này hay của dự án khác) nếu trả lời là "dự án khác" thì cũng chỉ library mới trả lời được — lúc đó hai câu nhập làm một.

**Nếu trả lời khác:** chưa có code nào để sửa — đó là lý do hỏi trước. Nơi sẽ chịu ảnh hưởng: bảng Prisma mới + trang admin (nếu cấp công ty) **hoặc** một `RegisterConfig` mới trong `packages/shared/src/config/registers.ts` (nếu hoá ra là per-project); và `UNEVALUATED_C1_CONDITIONS` trong `packages/shared/src/config/claimReview.ts` bớt một vế nếu (b) là "bắt buộc trỏ".


> ✅ **Đã trả lời (24/08/2026) — bản gửi câu 28.** 🆕 **Cấp công ty, đúng như ta đọc.** Technical **và** Regulatory phải cùng duyệt mỗi entry; dự án đọc nhưng không sửa; claim mới được phép không có link nhưng phải mang dấu **"New claim — not yet in Claims Library"**; thăng hạng cần hành động riêng **"Propose for Claims Library"**; đổi/thu hồi kéo theo cascade đánh giá tác động. Xem Phụ lục 3 Phần 4.

#### ✅ R4-Q26 · D1 — 5 điểm đặc tả chữ ký gate chưa nói tới 🔴

**Chưa build gì cả** — cùng loại với `R4-Q25`: hỏi **trước khi** xây. Nêu ra 2026-08-12 khi project owner xác nhận lại rằng D1 là đặc tả của SME (không phải ta đề xuất rồi họ không phản đối) và hỏi phạm vi của nó.

**Phần KHÔNG cần hỏi, đã chốt:** D1 mở đầu *"The current implementation is not sufficient"* rồi tự viết ra cấu trúc thay thế — nên "mỗi gate 3 chữ ký riêng" và "6 trường mỗi chữ ký" là **đặc tả**, không phải suy đoán, không cần tag. Cũng đã rõ: chữ ký gate **cộng thêm** chữ ký phase chứ không thay (*"should not be replaced by the per-gate sign-offs"*) — 12 bộ gate + 4 bộ phase, không phải chuyển từ cái này sang cái kia. Và `R4-Q15` (câu 18) **không** phải chờ họ đồng ý per-gate; nó chỉ hỏi khoá bảng ở Gate 10/11.

**5 chỗ để hở — đều phải trả lời trước khi viết dòng code đầu tiên:**

| # | Nguyên văn D1 | Chưa nói | Hệ quả nếu đoán sai |
|---|---|---|---|
| 1 | *record version* | version **của cái gì**, và phủ **bao nhiêu** | xem phân tích riêng ngay dưới bảng — đây là điểm sâu nhất trong 5 điểm |
| 2 | *comment **where required*** | required **khi nào** | Đoán: khi decision ≠ Proceed thuần (PwC / Hold / Not approved). Đoán sai theo hướng lỏng thì mất lý do của một quyết định có điều kiện |
| 3 | *safety-, regulatory-, claims- hoặc release-critical decisions* | **gate số mấy** | Họ nêu LOẠI, hệ thống cần SỐ. Rõ: SG07 / SG10 / SG11. Tranh cãi được: SG04 (prohibited ingredients — vừa safety vừa regulatory), SG03 (phân loại claim), SG08 (bằng chứng claim), **SG09** (release criteria — chữ "release" nằm trong chính tên gate). Chọn hẹp = bỏ mất tính độc lập ở gate cần nó |
| 4 | *independent* | khác **người** hay khác **phòng ban** | Tiền lệ trong app là C2 (`setStudyApprovalsBulk`): Independent Reviewer ≠ phòng ban của Study Author. Nếu D1 chỉ cần khác người thì ta đang siết quá tay; nếu cần khác phòng ban mà ta chỉ kiểm khác người thì ta đang nới |
| 5 | *This should hard-block the gate decision* | chặn **lúc nào** | Đủ 3 chữ ký mới **ghi được** decision, hay mới **pass** được gate? |

**Điểm 1 nói rõ hơn (2026-08-12) — vì sao `projects.version` không dùng được, và khe hở nó để lộ:**

Chữ ký ghi version để trả lời hai câu: *người ký đã nhìn thấy nội dung nào* và *nội dung đó có đổi kể từ lúc ký không*. `projects.version` không trả lời được câu nào: `mutate()` gọi `bumpVersion()` ở **mọi** lần ghi trong cả 19 endpoint section, nên thêm một dòng CAPA ở Gate 12 cũng tăng đúng bộ đếm mà chữ ký Gate 3 trích. Chữ ký ghi `412`, ba tuần sau dự án ở `900` — nội dung Gate 3 có đổi không thì không suy ra được.

Hỏng theo **cả hai** hướng dùng: làm cờ vô hiệu hoá thì mọi sửa đổi không liên quan đều huỷ mọi chữ ký (và dạy người ta ký lại theo phản xạ, tức giết luôn ý nghĩa của việc ký); chỉ lưu để đó thì con số không so được với cái gì. Một số **hoặc luôn đổi, hoặc không so được** thì không phải version của thứ được ký.

**Câu hỏi nằm dưới: "the record" là (i) chỉ dòng `GateRecord` (status/decision/owner/evidenceLink/notes), hay (ii) toàn bộ bằng chứng của gate (gate checks + checklist + register gắn gate đó)?** (i) → một bộ đếm revision cho riêng dòng đó là đủ và chính xác. (ii) → version phải phủ nhiều bảng, tức hash một snapshot, hoặc một quy tắc định nghĩa bảng nào tính. Và (ii) mới là thứ **biện minh** cho quyết định.

**Khe hở cụ thể, hôm nay không phát hiện được.** `isGateRefLocked` chỉ khoá bằng chứng khi gate đã **PASS**. D1 lại nói chữ ký **chặn** quyết định — nên cả 3 chữ ký nằm **trước** thời điểm pass, đúng lúc bằng chứng còn sửa được:

> Prepared-by ký → có người sửa bằng chứng → Approved-by ký.

Hai chữ ký về hai nội dung khác nhau, không gì trên bản ghi lộ ra. Có thể đó là bình thường (bằng chứng vẫn đang hoàn thiện trong lúc ký) — nhưng nếu không bình thường thì version phải đủ mịn để lộ ra, tức **loại bỏ luôn bộ đếm cấp dự án**. Hình dạng bài toán **giống hệt** vế *"varies from previously approved wording"* của C1 vừa giải bằng `reviewedWording` (chụp nội dung tại thời điểm review, so lại sau) — nếu SME trả lời theo hướng (ii) thì đã có sẵn khuôn.

| Ứng viên | Nói được gì |
|---|---|
| `projects.version` | ❌ không gì |
| `formulaVersion` | có nghĩa Gate 4–9, vô nghĩa Gate 1–3 |
| bộ đếm revision riêng của gate record | ✅ *"chữ ký này thuộc lần thứ mấy của Gate 4"* — hữu ích vì gate có thể ký → backtrack → mở lại → ký lại |
| hash nội dung được ký | ✅ mạnh nhất, lộ được cả khe hở giữa chữ ký 1 và 3 — nhưng phải định nghĩa "nội dung" gồm bảng nào |

**Vòng lặp ở điểm 5, đáng nêu riêng:** D1 nói mỗi chữ ký ghi `decision`, mà `GateRecord` cũng có `decision`. Nếu decision của người *Approved by* **chính là** quyết định của gate thì "ký đủ 3 rồi mới quyết định" tự mâu thuẫn — chữ ký thứ ba **là** quyết định. Còn nếu là hai thứ khác nhau thì mỗi người đang quyết định điều gì? Câu này quyết định luôn `GateSignOff.decision` là enum riêng hay dùng lại `GateDecision`.

**Câu hỏi:** trả lời 1–5 ở trên (bản gửi: câu 29).

**Nếu trả lời khác:** chưa có code. Nơi sẽ chịu ảnh hưởng khi build: bảng `gate_sign_offs` mới (`schema.prisma`), 12 item `sgNN-signoff` trong `packages/shared/src/config/gateReadiness.ts` (bỏ luôn `GATE_SIGNOFF_COVERAGE_NOTE`), guard ở `ProjectsService.setGate`/`setGatesBulk`, và một `ReadinessCheck` kind mới cho "đủ 3 chữ ký hợp lệ". Điểm 3 và 4 là **cấu hình**, không phải logic — nên đặt thành hằng số cạnh nhau để sửa được khi họ trả lời.


> ✅ **Đã trả lời (24/08/2026) — bản gửi câu 29.** 🆕 **Cả năm điểm có đáp án.** (1) record version = **ảnh chụp bằng chứng riêng của gate** (8 thành phần), chữ ký thành stale khi bằng chứng đổi — *"a project-wide save counter is not sufficient"*, tức loại `projects.version`. (2) 10 loại quyết định bắt buộc comment. (3) Gate critical = **3, 4, 7, 8, 9, 10, 11**. (4) độc lập = khác **người** ở mọi gate, cộng đúng **chức năng** ở 7 gate critical. (5) **quyết định của Approver CHÍNH LÀ quyết định gate** — gỡ đúng vòng lặp ta nêu. Xem Phụ lục 3 Phần 3.

#### ✅ R4-Q27 · D2 — 4 quyết định trong phần vừa xây, và 2 vế chưa có chỗ gắn 🔴

**Đã build 2026-08-12** sau khi project owner rà D2 và yêu cầu *"sửa cả các vấn đề trong D2"*. Trước đó **1 trong 4 quy tắc** của D2 được thực hiện, và **1 quy tắc đang chạy ngược đặc tả**.

**Hai hành vi D2 bác bỏ, nay đã bỏ:**

1. **Khoá wording tuyệt đối.** `exactWording` bị auto-fill rồi **lock** từ claim, và `save()` **ghi đè** lại mỗi lần lưu. D2: *"Do not enforce an absolute character-for-character lock across every channel."* Trên thực tế còn tệ hơn một cái lock: muốn rút gọn câu cho caption mạng xã hội thì chỉ còn cách sửa chính claim gốc — tức để một bài đăng viết lại wording đã duyệt của toàn dự án. Nay: cột `masterWording` (**read-only**, do API ghi từ claim) đứng cạnh `exactWording` (sửa tự do, nhãn mới *"Proposed wording as published"*); khác nhau thì phải có `wordingEquivalence` + `equivalenceConfirmedBy` + `equivalenceConfirmedDate` mới release được.
2. **Claim ID trống = "dòng này không claim gì".** `claimEvidence.ts` đọc trống là miễn trừ, nên **mọi dòng thoát toàn bộ luật bằng cách không điền gì** — ngoại lệ hẹp của D2 đang là mặc định của phần mềm. Nay trống chỉ được release khi tick `noProductClaim`, và `noProductClaimBy` do **server đóng dấu** từ session.

**Một cơ chế mới, cố ý chỉ là cảnh báo:** `wordingSimilarity()` (Jaccard trên từ) hiện % trùng từ. **Không chỗ nào rẽ nhánh theo con số này** — D2 nói rõ *"similarity checking may be used as a warning, but final equivalence must be confirmed by an authorised reviewer"*.

**Bốn quyết định của dev (cả bốn đã được xác nhận — bản gửi câu 30):**

| # | Quyết định | Vì sao chọn thế, và rủi ro |
|---|---|---|
| 1 | **Mọi điều kiện chỉ bật ở `RELEASED_INFO_STATES`**, không bật lúc nhập | Chính luật picker của D2 (*"Developing or Pending claims should be selectable… to document the intended claim early"*) chỉ có nghĩa nếu việc nhập sớm không bị chặn. Rủi ro: một dòng có thể nằm dở dang rất lâu mà không có claim nào |
| 2 | **3 giá trị** `WORDING_EQUIVALENCE_OPTIONS` | D2 nêu hai kết cục (minor adaptation / material change) nhưng không cấp từ vựng. Giá trị giữa **trích nguyên** phép thử của họ |
| 3 | **Chỉ khác nhau về khoảng trắng thì không tính** (`normaliseWording` gộp whitespace) | Hai dấu cách liền không đáng bắt ai phân loại. Chữ hoa/dấu câu **vẫn tính** — coi *"helps soothe"* = *"soothes"* là để **máy** phán tương đương, đúng thứ D2 giao cho người |
| 4 | **`Material change` chỉ CHẶN release, không tự tạo claim mới** | D2 nói *"must create a new or revised claim record"* nhưng không nói "revised" là **Claim ID mới** hay **cùng ID ở revision cao hơn**. Chọn hộ = quyết định lịch sử claim nằm trong một dòng hay nhiều dòng |

**Hai vế của D2 CHƯA xây, cố ý không đoán:** *"final artwork approval"* — `packagingSpecsArtwork` không có khái niệm claim nào, nối vào là quyết định thiết kế; và *"external publication"* như một hành vi tách khỏi việc đạt trạng thái released — nếu tách thì bản ghi nào thể hiện? Cả hai nằm ở câu 30 (c)(d).

**Một lỗ hổng tự tạo, tự phát hiện và đã bít trong cùng lượt:** bản đầu của `syncPublishedInfoDerived` chỉ đóng dấu `noProductClaimBy` khi ô **chuyển từ chưa tick sang tick**, và giữ nguyên giá trị client gửi trong các lần lưu sau — nên lưu lần hai với tên bất kỳ là **thay được người đã khai**. Nay giá trị client **luôn bị bỏ**: đang tick thì lấy giá trị đã lưu, chưa có thì đóng dấu người đang đăng nhập, bỏ tick thì xoá. Đã test bằng cách gửi thẳng `"Someone Else Entirely"` — server giữ tên thật.

**Nếu trả lời khác:** `WORDING_EQUIVALENCE_OPTIONS` / `WORDING_MATERIAL_CHANGE` trong `packages/shared/src/config/registers.ts`; ngưỡng release và 3 nhánh kiểm trong `publishedInfoViolations()` (`packages/shared/src/utils/claimEvidence.ts`); `normaliseWording` cho câu 3; `syncPublishedInfoDerived` (`apps/api/src/projects/projects.service.ts`) cho phần đóng dấu. Cả UI và API gọi **cùng một** `publishedInfoViolations`, nên sửa luật ở một chỗ là cả hai lớp theo.

**Bổ sung cùng ngày (project owner):** cột `noProductClaim` **đứng trước** `claimId` — nó là câu hỏi có trước (*bản ghi này có phát biểu gì về sản phẩm không?*), chỉ khi có thì Claim ID mới là thứ điền tiếp. Và hai cái **loại trừ nhau**, nên chặn **cả hai chiều**: tick rồi thì picker Claim ID disable; đang có Claim ID thì **không tick được** (tooltip "unlink the claim first"). Cố ý **không** tự xoá `claimId` khi tick — âm thầm bỏ một liên kết ai đó đã ghi đúng là lỗi "no silent corrections" (B4); người dùng tự unlink. Guard nằm ở `contradictoryClaimRows()` và được API từ chối ở **mọi** workflow state (khác 3 điều kiện release kia) vì dữ liệu đó vô nghĩa ở bất kỳ trạng thái nào. Đã test: gửi thẳng row có cả hai → 400.


> ✅ **Đã trả lời (24/08/2026) — bản gửi câu 30.** ✅ **Cả bốn quyết định được chấp nhận**, kể cả việc mọi thứ chỉ bite ở release và việc bỏ qua khác biệt khoảng trắng. 🆕 Ba vế còn lại có đáp án: **(b)** tiêu chí revision-mới vs Claim-ID-mới, do reviewer Technical/Regulatory quyết; **(c)** artwork approval phải link mọi Claim ID và chặn cứng ở 5 trạng thái; **(d)** bản ghi **Publication / Deployment** tách khỏi Approved for Release; **(e)** miễn trừ phải do Technical hoặc Regulatory xác nhận. Xem Phụ lục 3 Phần 5.

#### ✅ R4-Q28 · D4 — "applicable" gồm những nguyên liệu nào, và "controlled conditional decision" là gì 🔴

**Đã build 2026-08-12.** Trước đó **3 trong 8 điều của D4** được thực hiện — và cả 3 là những điều D4 nói *"được phép"* (stub identity-only là acceptable/preferred; import không fail; không default Approved for Use). **4 trong 5 điều ở phần "However:"** — tức phần yêu cầu thật — thì chưa.

**Lỗ hổng nặng nhất, và nó không phải "chưa chặn" mà là "đang PASS":** `sg04-identity` đòi mọi dòng `supplierRmEvidence` có `inciName`. Import stub điền đúng `rmCode`/`inciName`/`supplier`/`grade`. Nên một sổ **toàn stub** vẫn thoả `sg04-identity`, thoả luôn `sg04-supplier` (chỉ đòi *có dòng*), còn `sg04-allergen` — cái duy nhất đọc evidence thật — là Conditional không trigger, tức advisory. **Import 20 nguyên liệu, không ai xem xét gì, Gate 4 hiện xanh.** Và **không một `ReadinessCheck` nào đọc `approvedForUse`** (nó chỉ được dùng ở BOM picker + guard xoá/thu hồi).

**Đã cài:** cột `evidenceStatus` (3 giá trị, giá trị đầu là **nguyên văn D4**), `defaultValue` trên `RegisterColumn` để mọi dòng mới bắt đầu ở `Incomplete — evidence review required`, 2 check kind mới (`rmEvidenceDispositioned` / `rmEvidenceNoneConditional`), cờ `clearedByConditions` trên `ReadinessRequirement`, và 5 item mới ở SG04 (2) / SG07 / SG10 / SG11.

**Ba quyết định của dev:**

| # | Quyết định | Vì sao |
|---|---|---|
| 1 | **"applicable" = mọi dòng trong sổ** | Ở Gate 4 **chưa có BOM** (BOM là Gate 5), nên sổ *chính là* tập ứng viên đang sàng — đúng như comment của `sg04-ingredients` đã ghi từ trước |
| 2 | Thêm trạng thái **`Considered — not used in this formula`**, thứ D4 **không** nhắc | Không có nó thì quyết định (1) làm một nguyên liệu đã loại **chặn Gate 4 vĩnh viễn** — đúng kiểu check-không-bao-giờ-thoả mà sweep S1 sinh ra để bắt. Cố ý là **một trạng thái, không phải xoá dòng**: xoá là mất bằng chứng đã sàng lọc |
| 3 | *"formally accepted through a controlled conditional decision"* = **`Proceed with Conditions` + controlled action**, không phải một trường mới | Cụm đó trùng khớp cơ chế F9 (Change Control đang mở) và D3 (*"assessed it as non-critical and created a controlled action"*, cùng Gate 4) mà SME đã tự viết. Cài bằng `clearedByConditions`: chặn `Proceed` thuần, không chặn PwC |
| 4 | Thêm **`sg04-rm-usable`** — ít nhất một nguyên liệu **dùng được** | **Project owner phát hiện lỗ hổng, 2026-08-12.** Hai check ở trên đều dạng *"mọi dòng thoả P"*, nên một sổ mà **mọi dòng** đều `Considered — not used` thoả **cả hai** — Gate 4 pass sau khi sàng lọc xong và không cho qua thứ gì. Sàng lọc kết luận "không có gì dùng được" thì chưa xong. **Cố ý KHÔNG phải "≥1 dòng approved"**, vì thế thì chặn đúng đường conditional mà D4 cho phép (dự án có mọi material conditionally accepted có **0** dòng approved và vẫn hợp lệ) — nên "dùng được" = approved **hoặc** conditionally accepted |

**Quyết định 4 là một quy tắc số lượng (cardinality), thứ config này thường tránh bịa** — nhưng `sg04-supplier` **đã** đòi ≥1 **dòng** ở gate này từ trước, nên tiền lệ "Gate 4 cần có nguyên liệu" không phải mới; cái mới chỉ là "không được loại hết". Và nó **non-vacuous by construction**: sổ rỗng thì **fail**, khác hai check `.every()` kia — nên trường hợp sổ rỗng giờ bị bắt bởi một check trên chính sổ này, không còn phụ thuộc duy nhất vào `registerHasRows` của `sg04-supplier`.

**Vì sao không được chỉ hard-block trên `approvedForUse`:** D4 cho **hai** đường (*"adequately reviewed" **hoặc** "formally accepted"*). Bỏ đường thứ hai là **lặng lẽ thu hẹp quy tắc** — đúng sai lầm CLAUDE.md ghi tên (vụ *"has been opened **or should be opened**"*). Nên đường thứ hai phải có chỗ ghi **trước** khi bật chặn.

**Một cách đọc nữa, ở Gate 7:** *"Gate 7 final safety approval must use the **completed** evidence status"* — một conditional acceptance có controlled action **đang mở** theo định nghĩa, nên không phải "completed". Vì thế SG07 (và SG10/SG11) đòi **cả hai** vế và **không** clear được bằng PwC, khác Gate 4.

**"Adequately reviewed" đọc là `approvedForUse`, không phải phép đếm ô đã điền** — chính câu *"It must not default to Approved for Use"* nói ô đó là thứ dòng chưa review **không được** có. Tính adequacy từ các cột sẽ buộc ta quyết định cột nào bắt buộc cho loại nguyên liệu nào, thứ chưa ai nói: `Micro / preservative info` và `Origin / vegan proof` rõ ràng không áp cho mọi material.

**Một hệ quả của (1) chỉ lộ ra khi giải thích lại cho project owner (2026-08-12), nên ghi thêm:** lý lẽ *"sổ chính là tập ứng viên"* chỉ đúng **ở Gate 4** — vì ở đó BOM chưa tồn tại. Đến **Gate 7/10/11 thì BOM đã có**, nên ở ba gate ấy tồn tại một cách đọc **hẹp hơn**: chỉ tính material đang thực sự nằm trong công thức. Ta đang áp cách đọc rộng (mọi dòng) ở cả bốn gate, vì nhất quán và vì trạng thái `Considered — not used` đã làm nó thoả được.

Khác biệt thực tế giữa hai cách đọc rất hẹp nhưng có thật: **một dòng để ở `Incomplete` cho material KHÔNG nằm trong công thức** sẽ chặn Gate 7/10/11 theo cách đọc rộng, và không chặn theo cách đọc hẹp. Lý lẽ cho cách rộng: một dòng chưa dispositioned là việc sàng lọc còn dở. Lý lẽ cho cách hẹp: chính chữ của D4 là *"must not **rely on** unresolved identity-only stubs"* — mà material không có trong công thức thì gate không "rely on" nó. Chưa ai xác nhận vế nào → câu 31(e).

**Câu hỏi:** (a) một nguyên liệu **đã cân nhắc rồi không dùng** ghi thế nào — trạng thái riêng như ta làm, hay cách khác? (b) *"controlled conditional decision"* có phải `Proceed with Conditions` + controlled action như F9/D3, hay một trường riêng trên từng dòng? (c) ở Gate 7/10/11, conditional acceptance có phải đóng hết không, hay được mang theo? (d) ở Gate 7/10/11 — nơi BOM đã tồn tại — "applicable" là **mọi dòng trong sổ** hay **chỉ material trong công thức**? (e) "ít nhất 1 nguyên liệu dùng được" có đúng không, hay Gate 4 có thể pass hợp lệ khi mọi ứng viên đều bị loại?

**Không cần migration:** dòng cũ trong DB không có `evidenceStatus`. Dòng đã `approvedForUse` vẫn resolved (approval thắng); dòng chưa approve thì **đúng là chưa được dispositioned** nên chặn là đúng — backfill một disposition mà không ai ghi mới là bịa.

**Nếu trả lời khác:** `RM_EVIDENCE_*` trong `packages/shared/src/config/registers.ts`; `packages/shared/src/utils/rmEvidence.ts` (4 predicate); `clearedByConditions` trong `gateReadiness.ts` + nhánh của nó trong `gateReadinessChecklist()`; 5 item `sg04-rm-*` / `sgNN-rm-evidence-complete`.


> ✅ **Đã trả lời (24/08/2026) — bản gửi câu 31.** ✅ **Năm trên sáu ý đúng như đã xây** — (a) mọi dòng phải disposition trước Gate 4 · (b) giữ trạng thái "không dùng" thay vì xoá · (c) PwC + controlled action, không cần trường phê duyệt riêng · (d) chấp nhận có điều kiện phải đóng trước Gate 7 · (e) không được Proceed khi mọi ứng viên bị loại. ⚠️ **(f) đổi cách đọc**: ở Gate 7/10/11 chặn cứng chỉ áp cho nguyên liệu **có trong công thức hiện tại**; dòng ngoài công thức thì cảnh báo. Xem Phụ lục 3 Phần 6.

#### ✅ R4-Q29 · D3 — "flagged" gồm status nào, giá trị Resolution status, và "authorised acceptance" là gì 🔴

**Đã build 2026-08-12.** Trước đó D3 **chưa có gì cả** — chính ta đã báo điều đó với SME ở vòng 3 (*"we have to report that it is not implemented at all"*), và họ trả lời bằng một đặc tả đầy hơn thứ ta đề xuất: **7 trường** + **4 giá trị** assessment + **4 luật chặn** riêng cho từng giá trị.

**Lỗ hổng nó đóng:** một dòng ở `REVIEW - possible formula match` đi qua Gate 4 bằng **`Proceed` thuần**, không cần ai đánh giá. Cùng giá trị đó chỉ bị chặn ở **Gate 7** (`sg07-prohibited-closed`) — mà tới đó công thức đã chốt ở Gate 5. Tức app đang xử lý "có thể trùng chất cấm" bằng cách bỏ qua ở đúng gate sinh ra để sàng nó.

**Phần lớn là chép lại, không phải suy đoán:** 7 cột (`reviewerAssessment` · `reviewer` · `reviewDate` · `reviewRationale` · `evidenceLink` (đã có) · `linkedNextActionId` · `resolutionStatus`), 4 giá trị **nguyên văn và đúng thứ tự** của SME, và 4 luật map vào cơ chế `hardBlock` / `clearedByConditions` vừa dựng cho D4.

**Bốn quyết định của dev:**

| # | Quyết định | Vì sao |
|---|---|---|
| 1 | **"flagged" = `REVIEW - possible formula match` + `Needs Regulatory Review`** | D3 chỉ đặt tên vế đầu (tiêu đề là *"Possible formula match"*). Gộp vế sau vào vì **cùng tình huống** (đã đẩy cho người có chuyên môn, chưa xong) và bỏ ra thì escalation đó **không chặn gì ở Gate 4**. Hướng sai an toàn hơn: reviewer luôn gỡ được bằng `Not a true match` + rationale. `Prohibited - remove` **không** thuộc đây — nó không phải "possible", và `sg04-no-remove` đã chặn thẳng |
| 2 | **`Resolution status` = `Open` / `Closed`** | D3 nêu trường, không nêu giá trị. Suy từ chính câu *"Not a true match **may be closed** after…"* |
| 3 | **Dòng flagged CHƯA ai đánh giá → chặn cả PwC** | D3 nói từng *giá trị* làm gì, không nói dòng **chưa có giá trị** làm gì. Nếu "chưa đánh giá" mà PwC gỡ được thì cả cơ chế thành tùy chọn — chọn PwC là khỏi cần đánh giá — điều không thể là ý của một quy tắc mà mọi câu đều mở đầu *"blocks Proceed until…"* |
| 4 | *"authorised acceptance"* của mức `Further information required` **chưa cài riêng** | Ghi decision PwC đã là hành vi có audit của một role được phép quyết gate, nhưng **không phải một bước acceptance riêng**. Không im lặng: item mang `coverageNote` nói đúng chỗ chưa cài |

**Map 4 luật của D3:**

| Assessment | D3 nói | Cài thế nào |
|---|---|---|
| `Critical` | chặn cả Proceed và PwC | `watchlistReviewed` → `hardBlock` |
| chưa đánh giá / thiếu hồ sơ | *(D3 không nói)* | cùng check trên → `hardBlock` **[quyết định 3]** |
| `Non-critical` | chặn Proceed thuần tới khi có assessment + rationale + action; cho PwC | `watchlistNoneConditional` → `clearedByConditions` |
| `Further information required` | chặn Proceed; cho PwC **chỉ khi** có authorised acceptance + linked action | như trên + `coverageNote` **[quyết định 4]** |
| `Not a true match` | đóng được sau khi có rationale + evidence | không chặn gì khi đã đủ hai thứ đó |

**"A genuine controlled Next Action must be used. A note alone is not sufficient."** → `linkedNextActionId` là **picker** trỏ tới bản ghi thật (`NextActionSelect`, khuôn `ClaimSelect`), và API **từ chối** id không resolve được (`brokenNextActionLinks`) — một id gõ tay chính là "a note", đúng thứ câu đó cấm.


**Hai chỗ nữa lộ ra khi project owner hỏi *"Linked Next Action ID trỏ tới đâu?"* (2026-08-12):**

**(i) Một action `Cancelled` từng tính là hợp lệ — đã sửa.** Bản đầu của `verdictDocumented` chỉ kiểm id **resolve được**, nên một finding `Non-critical` có thể dựa trên một action đã bị **huỷ** — không theo dõi gì cả, đúng thứ câu *"a note alone is not sufficient"* muốn chặn. Nay có `isControlledAction()`: mọi status **trừ `Cancelled`** đều tính. `Closed` **vẫn tính** — action đã hoàn tất và được verify nghĩa là finding đã xử lý xong, tốt hơn action đang mở chứ không tệ hơn. Cố ý **không** dùng lại `NEXT_ACTION_TERMINAL_STATUSES` (gộp `Closed` + `Cancelled`), vì hằng số đó trả lời câu khác: *"action này còn chặn gate không"*. Picker cũng gắn tag đỏ *"not a controlled action"* lên dòng `Cancelled` để người chọn biết trước.

**(ii) Picker offer action của MỌI gate, không lọc theo Gate 4** — chưa tag, ghi lại ở đây. Cân nhắc rồi để nguyên: một controlled action hợp lệ có thể nằm ở gate sau (*"verify lại ở Gate 7"*), nên lọc cứng về SG04 sẽ chặn việc đúng; còn không lọc thì chỉ rủi ro link cẩu thả, mà `gateId` đã hiện thành tag trong picker. Nếu SME muốn buộc cùng gate: sửa `NextActionSelect` (lọc `options`) + `linkedNextAction()`.

**Câu hỏi:** (a) "flagged" có gồm `Needs Regulatory Review` không, hay chỉ `REVIEW - possible formula match`? (b) `Resolution status` gồm những giá trị nào? (c) *"authorised acceptance"* là gì — cùng cơ chế acknowledge của F9, một phép kiểm quyền riêng, hay ghi PwC là đủ? (d) dòng flagged **chưa ai đánh giá** thì PwC có gỡ được không (ta đang chặn)? (e) `PB_Caution_Limits` — watch-list thứ hai — có cần cùng bộ 7 trường không? D3 viết *"each flagged watch-list result"* nhưng tiêu đề chỉ nói possible formula match. (f) action linked có buộc phải cùng gate với finding không, hay được nằm ở gate sau?

**Không cần migration:** `prohibitedIngredients` là `mode:'fixed'` — thêm **cột** không đổi số dòng, và 12 dòng seed đều ở `No formula match recorded` nên **không dòng nào flagged** trên dự án mới → check tự thoả, không chặn oan (đúng chiều S3 muốn).

**Nếu trả lời khác:** `WATCHLIST_*` trong `packages/shared/src/config/registers.ts`; 5 hàm trong `packages/shared/src/utils/watchlistReview.ts`; 2 item `sg04-watchlist-*`.


> ✅ **Đã trả lời (24/08/2026) — bản gửi câu 32.** ⚠️ **(a)** "Flagged" gồm **ba** status — ta thiếu **Needs Safety Review**. ⚠️ **(b)** Resolution status có **năm** giá trị, kèm trường đánh giá tách riêng. ✅ **(c)** PwC là đủ, nhưng phải kèm điều kiện **người duyệt gate có thẩm quyền Safety/Regulatory**. ✅ **(d)** dòng chưa đánh giá chặn cả PwC. 🆕 **(e)** sổ PB Caution Limits cần **cùng bộ trường**. ✅ **(f)** action được ở gate sau, nhưng phải hiện ở gate gốc và đến hạn trước gate đóng; **finding critical không được hoãn**. Xem Phụ lục 3 Phần 6.

#### ✅ R4-Q30 · E1 — bộ giá trị Severity / Status, "Required action" có phải controlled action, và dòng chưa phán định 🔴

**Đã build 2026-08-12.** E1 có **4 vế**; trước hôm nay chỉ **1** vế được làm.

| Vế E1 | Trước | Sau |
|---|---|---|
| Safety-finding control **riêng** (9 trường) + *"Gate 7 cannot pass while any critical safety finding is open"* | ❌ | ✅ sổ `criticalSafetyFindings` |
| Pregnancy/breastfeeding ở Gate 7 **không** unconditional | ✅ 07/08 | ✅ |
| Infant-only → Infant/Baby Safety pathway | ❌ chờ A2 | ❌ **vẫn là lỗ hổng an toàn** (câu 1) |
| General products **ghi N/A kèm lý do** | ✅ (đã đúng từ trước, tôi đánh giá sai) | ✅ + siết chiều ngược |

**E1 bác thẳng thứ đang chạy:** `sg07-no-critical` **dùng chung check** với `sg07-final-safety` (cả hai đọc *"10 câu Final Safety Sign-off đều Completed"*), tức đúng thứ câu đầu của E1 phủ định — *"rather than relying **solely** on the Final Safety Sign-off"*. Comment trong code còn đoán trước: *"if the team wants a distinct critical-finding field, that is a config addition, not a rule change"*. Họ muốn.

**Chữ "solely" tự trả lời một câu thiết kế:** sổ mới là `mode:'register'` (dự án có thể **không có** finding nào), nên sổ rỗng → check tự thoả. Đúng nghiệp vụ, nhưng ai xác nhận *"đã soi và không thấy gì"*? → **`sg07-final-safety` vẫn Mandatory, giữ nguyên**. Hai cơ chế, hai câu hỏi: *"đã review chưa"* vs *"còn finding nào mở không"*. Vì thế check này **cố ý không** đi kèm `registerHasRows` như S2 đòi ở các check `.every()` — đòi ≥1 dòng finding sẽ buộc mọi dự án bịa ra một cái. Đã ghi lý do ngay tại kind để người sau không "sửa" ngược.

**9 tên trường là của E1.** Bốn chỗ là của dev:

| # | Quyết định | Vì sao |
|---|---|---|
| 1 | `Severity` = `Low` / `Medium` / `High` | E1 nêu trường, không nêu giá trị |
| 2 | `Status` = `Open` / `Closed` | E1 chỉ hàm ý phải có `Open` (*"while any … is open"*). Đã cân nhắc dùng `WORK_STATUS_OPTIONS` và **loại** — `Backtracked` vô nghĩa với một safety finding |
| 3 | **`Required action` là free text**, không phải picker Next Action như D3 | E1 viết *"Required action"* và **không** nói *"a genuine controlled Next Action must be used"* như D3 đã nói. Không tự nâng chuẩn — nhưng đây là **khác biệt giữa hai luật cùng vòng**, đáng hỏi |
| 4 | Dòng **chưa phán định** (`criticalFinding` trống) **chặn**; và dòng `Yes` + `Closed` mà **thiếu** reviewer conclusion hoặc evidence cũng chặn | E1 nói *open critical finding* làm gì, không nói dòng **chưa ai phán** làm gì — để pass được thì có thể park một finding vô thời hạn, ngược hẳn nghĩa "control". Vế thứ hai **mượn khuôn D3**, nơi SME **đã** nói cho tình huống tương tự: *"may be closed after reviewer rationale and evidence are recorded"* |

Dòng đánh `No` **không chặn gì**, bất kể status — luật E1 nói về *critical* finding.

**Tự sửa nhận định, 2026-08-12 (project owner hỏi *"dòng Key Gate Check đó chưa xử lý à?"*):** tôi đã báo vế 4 là 🟡 *"app tự pass"*. Sai — điều đó chỉ đúng với `sg07-caution-closed`. Dòng **`sg07-screen-check`** là Mandatory và `gateCheckDone` chỉ thoả khi `done+Y` **hoặc** `NA + có notes`, tức nó **chính là** đường N/A-kèm-lý-do E1 đòi. Comment cũ trong code cũng đã ghi *"the only N/A route"*. Vế 4 **đã đạt từ trước**.

**Nhưng có lỗ hổng ở chiều ngược lại, và đã sửa:** dòng đó mang chữ *"where triggered"*, app **biết** trigger bật hay không, mà **NA vẫn được nhận bất kể**. Nên trên dự án đã chọn Pregnancy, dòng này có thể bị đánh `NA` + ghi bừa một chữ là qua — tuyên bố "không áp dụng" cho đúng thứ đang áp dụng, trong khi `sg07-maternal-infant` chặn cùng gate vì lý do ngược lại. Thêm `naInvalidWhenTrigger` trên `gateCheckDone`: trigger bật thì **chỉ `done+Y`** mới thoả.

**Không thành câu hỏi mới:** E1 nói thẳng *"It is mandatory when Pregnancy, Breastfeeding or Postpartum is selected"* — chặn N/A ở đó là **thi hành** câu đó, không phải diễn giải. Đã test 8 nhánh: general + NA-có-lý-do → qua (đúng vế 4); maternal + NA-có-lý-do → **chặn**; cả hai đều cần notes nếu dùng NA.

**Câu hỏi:** (a) `Severity` gồm giá trị nào? (b) `Status` gồm giá trị nào? (c) `Required action` có phải là một Next Action có kiểm soát như D3 đòi ở Gate 4, hay free text là đủ? (d) một finding **chưa ai phán định critical hay không** thì Gate 7 có được qua không (ta đang chặn)? (e) đóng một critical finding có buộc phải có reviewer conclusion + evidence link không (ta đang buộc, mượn khuôn D3)?

**Không cần migration:** `mode:'register'` nên không có dòng nào được seed; dự án cũ có sổ rỗng và **không bị chặn thêm** — đúng, vì họ chưa từng ghi finding nào.

**Nếu trả lời khác:** `SAFETY_FINDING_*` trong `packages/shared/src/config/registers.ts`; `openCriticalSafetyFindings()` trong `packages/shared/src/utils/safetyFindings.ts`; cột của `criticalSafetyFindings`.

**Cập nhật `R4-Q2` (2026-08-12) — lỗ hổng an toàn infant-only đã đóng phần lớn, KHÔNG bằng nội dung do dev viết.**

Project owner hỏi *"E1 Gate 7 hoàn thiện rồi chứ"*. Rà lại thì phát hiện: **nội dung pathway cho trẻ sơ sinh đã có trong app từ trước** — Phase 3, section `infantSafety`, *"Compartment 3 — Infant / Baby-Contact Safety & Characteristics"*, **8 dòng INF-01…INF-08, mọi dòng gate 07** (use context · MOS điều chỉnh cho infant · hand-to-mouth · sensitiser screen · pH/barrier · eye safety · claim wording · label/PIF). Đến từ workbook V18, không phải ta viết.

**Nó bị gác sau trigger sai:** section đó chỉ được đánh giá qua `skincareForTwoIncompleteSections()`, tức **chỉ khi có target user maternal**. Dự án chỉ-cho-trẻ-sơ-sinh (chọn `Infant 0+`, không chọn Pregnancy/Breastfeeding/Postpartum) **không bị đòi hoàn thành gì** ở Gate 7.

**Đã sửa:** trigger mới `infantContact` (đọc `Infant 0+` trên checklist Target Users), check kind mới `requirementSectionComplete`, và item `sg07-infant-safety` (Conditional, trigger `infantContact`). Cộng với việc `sg07-screen-check` giờ **không cho đánh N/A** khi trigger nào trong `['skincareForTwo','infantContact']` đang bật — dòng đó mang chữ *"and baby-contact"*, mà sản phẩm cho trẻ sơ sinh chính là baby contact.

Test 5 nhánh: general adult → item tự pass (advisory), không chặn · **Infant 0+ → chặn cả `sg07-infant-safety` lẫn `sg07-screen-check`** · Infant 0+ với 8 dòng Completed → item thoả · Pregnancy → item advisory (đã phủ qua `skincare-for-two`, không chặn trùng) · Pregnancy + Infant 0+ → chặn.

**Câu hỏi vẫn MỞ, và lý do đổi:** ta đang cưỡng chế **assessment của workbook**, không phải của SME. Họ nói `Infant 0+` kích hoạt một pathway riêng và liệt kê các chủ đề nó phải phủ; 8 dòng này **có thể hẹp hơn**, có thể thuộc gate khác, hoặc cần bằng chứng mà các dòng đó không đòi. Nên câu 1 đổi từ *"xin nội dung, hiện chưa có gì"* thành *"Compartment 3 có đúng là thứ các anh muốn, hay pathway còn rộng hơn"*.


> ✅ **Đã trả lời (24/08/2026) — bản gửi câu 33.** ⚠️ **(a)** Severity = Low · Medium · High · **Critical**. ⚠️ **(b)** Status = Open · Under Review · Action Pending · Verification Pending · Closed · **Superseded**. ⚠️ **(c)** "Required action" **phải** là controlled Next Action với Critical/High/Medium-cần-hành-động — free text không thay thế được. ✅ **(d)(e)** hai cách đọc của ta đều đúng, và (e) được mở rộng thêm verification/verifier/ngày đóng. Kèm luật chặn theo bậc. Xem Phụ lục 3 Phần 2.

#### ✅ R4-Q31 · E3(b) — "Critical" ánh xạ sang thang rủi ro nào, và "authorised acknowledgement" là gì 🔴

**Đã build 2026-08-12.** `sg11-changes-closed` trước đó là `manual` với comment: *"adding a readiness check here would either duplicate it or contradict it. Left for the SME round."* Vòng đó đã trả lời — và trả lời **ngược lại**:

> *"Therefore, Gate 11 requires more than a duplicate warning. It must evaluate the impact classification and closure status of each open Change Control."*

Soft-lock F9/C4 đối xử **mọi** open change như nhau; E3(b) đòi **phân hạng**. Nên nó không phải trùng lặp — nó là thứ soft-lock không làm.

**Trường mới, vì không trường nào sẵn có là "impact classification":** `riskLevel` là Low/Medium/High, `affectedArea` là text tự do. Thêm `ChangeRecord.impactAreas: string[]` (cột Postgres `TEXT[]`, migration `20260812120000`), giá trị **chép nguyên câu của SME**: *Formula · Artwork · Claims · Safety · Regulatory · Packaging · Release*, cộng hai đầu thang họ nêu riêng — `Launch-impacting` và `Administrative only`.

**Và `changes` phải vào `ProjectData`.** Trước đây nó chỉ nằm ở một slice global của store (di sản thời demo) — API **đã** load per project nhưng không gắn vào `ProjectData`, nên engine readiness không **nhìn thấy** thứ E3(b) bảo nó đánh giá. Đã thêm.

**Map 4 mức:**

| E3(b) | Cài thế nào |
|---|---|
| *Critical hoặc launch-impacting → hard-block* | `impactAreas` chứa `Launch-impacting` **hoặc** `riskLevel === 'High'` → `changeControlNoHardImpact`, PwC không gỡ |
| *Formula/artwork/claims/safety/regulatory/packaging/release → hard-block unless implementation and verification are complete* | cùng check trên. *"Implementation và verification xong"* trên lifecycle này **chính là** đạt trạng thái terminal, nên một change **đang mở** với các impact đó luôn chặn |
| *Low-risk administrative → PwC sau authorised acknowledgement* | `changeControlNoAdminImpact` + `clearedByConditions` |
| *Completed/rejected/cancelled/superseded → không chặn **nếu final disposition được ghi*** | `isChangeDispositionRecorded()` — xem dưới |

**Ba quyết định của dev:**

| # | Quyết định | Vì sao |
|---|---|---|
| 1 | *"Critical"* đọc là **`riskLevel === 'High'`** | thang rủi ro của app là Low/Medium/High, **không có** `Critical`. Cần một ánh xạ, và High là ứng viên duy nhất |
| 2 | Change **chưa phân loại** (`impactAreas` rỗng) → **chặn** | E3(b) đòi Gate 11 *"must evaluate the impact classification"*; không có gì để evaluate thì không đánh giá được. Cho qua sẽ biến cả luật thành tuỳ chọn — cùng lập luận với D3 và E1 |
| 3 | *"final disposition is recorded"* = có `closureEvidence` **hoặc** `closedDate` | `isChangeOpen()` chỉ đọc **status**, nên một change `Completed` mà không ghi gì về cách đóng vẫn tính là đã đóng — tức **vế thứ hai của câu đó bị bỏ từ F9**. Nay bổ sung |

**Một chỗ chưa cài, đã ghi rõ trên item:** *"authorised acknowledgement"* ở mức administrative — đang dùng lại bước acknowledge sẵn có của F9 trên hàng Phase Gate Flow, **không** dựng bước riêng. `coverageNote` nói thẳng điều đó.

**Câu hỏi:** (a) *"Critical"* có phải là `High` trên thang Low/Medium/High không, hay cần thêm giá trị `Critical`? (b) change **chưa phân loại impact** thì Gate 11 có được qua không (ta đang chặn)? (c) *"final disposition is recorded"* gồm những gì — closure evidence, ngày đóng, hay cả hai? (d) *"authorised acknowledgement"* có phải bước acknowledge của F9, hay là một phê duyệt riêng có kiểm tra quyền?

**Test 11 nhánh:** không có change → qua · chưa phân loại → chặn · launch-impacting → chặn · High + admin-only → chặn (rủi ro thắng) · Formula → chặn, **PwC cũng không gỡ** · admin-only low risk → chặn `Proceed` thuần, **PwC gỡ** · Completed + có disposition → qua · Completed **không** disposition → chặn · change của dự án khác → không ảnh hưởng. Link blocker trỏ `/change-control` với `absolute: true` (trang global, không có prefix `/projects/:id`).

**Nếu trả lời khác:** `CHANGE_IMPACT_*` trong `packages/shared/src/config/changeTriggers.ts`; 4 hàm trong `packages/shared/src/utils/changeImpact.ts`; 2 item `sg11-changes-*`.


> ✅ **Đã trả lời (24/08/2026) — bản gửi câu 34.** ⚠️ **(a)** Critical là mức riêng **trên** High — không được gộp vào High như đang làm. ✅ **(b)** change chưa phân loại chặn Gate 11, đúng như đã xây. ⚠️ **(c)** "final disposition" gồm **tám** thứ, một ngày đóng hay một ghi chú là không đủ. ✅ **(d)** acknowledgement sẵn có dùng được, **nhưng phải giới hạn theo role** và ghi 6 trường. Xem Phụ lục 3 Phần 2.

#### ✅ R4-Q32 · E2 — giá trị Status/Regulatory approval, và "Other - specify" xử lý ra sao 🔴

**Đã build 2026-08-12.** `sg10-checklist` trước đó là `manual`, với lý do đã ghi trong config: *"deliberately not enforced the ASEAN checklist for all projects, because that would wrongly block a product not being sold in ASEAN."*

**Tiền đề đúng, kết luận sai.** E2 chọn option (b) và nói thẳng: *"The absence of a built-in country template should not mean the item is unenforced."* Đáp án là cưỡng chế **theo từng thị trường**, không phải không cưỡng chế gì.

**Đã cài:**

| Thị trường | Yêu cầu |
|---|---|
| Thuộc ASEAN | sổ **ASEAN PIF Checklist** phải xong — item `sg10-checklist-asean`, **Conditional** trigger `aseanMarket` |
| Không thuộc ASEAN | phải có dòng trong sổ mới **Regulatory Checklist Status** với đủ 6 trường E2 liệt kê — item `sg10-checklist`, **Mandatory** |

Sổ mới `regulatoryChecklistStatus` — 6 cột **đúng tên E2**: applicable market · required dossier type · owner · checklist or evidence link · status · Regulatory approval.

**Tách làm 2 item vì hai vế có tier khác nhau:** dự án chỉ bán ngoài ASEAN **không được** bị đòi checklist ASEAN, và dự án chỉ bán trong ASEAN **không cần** dòng per-market nào. Gộp một item thì không diễn đạt được điều đó.

**Ba quyết định của dev:**

| # | Quyết định | Vì sao |
|---|---|---|
| 1 | `Status` dùng lại `WORK_STATUS_OPTIONS`, `Regulatory approval` dùng lại `MARKET_APPROVAL_STATUSES` | E2 nêu hai trường, **không nêu giá trị**. Dùng lại từ vựng app đã có thay vì bịa thêm hai bộ nữa |
| 2 | **`Other - specify` tính là NON-ASEAN** | một thị trường chưa đặt tên thì không thể mặc định coi là đã được template ASEAN phủ. Hướng an toàn: đòi một dòng ghi nhận |
| 3 | Dòng chỉ tính là đủ khi có **cả 6** trường | E2 liệt kê đủ 6; thiếu một là placeholder, không phải bản ghi họ đòi |

Danh sách `ASEAN_MARKETS` là **10 nước thành viên** — dữ kiện, không phải phán định. Chỉ 6 nước có mặt trong danh sách thị trường của workbook; 4 nước còn lại liệt kê sẵn để sau này thêm vào danh sách đó không phải sửa chỗ này.

**Test 8 nhánh:** chỉ ASEAN + checklist xong → qua · chỉ ASEAN + checklist dở → chặn · chỉ EU, chưa ghi → chặn (item ASEAN hiện **advisory "không trigger"**) · chỉ EU, ghi đủ → qua · chỉ EU, ghi thiếu → chặn · Vietnam+EU → hai vế độc lập · `Other - specify` chưa ghi → chặn.

**Câu hỏi:** (a) `Status` và `Regulatory approval` nên có giá trị gì — dùng lại như trên có ổn không? (b) một thị trường ghi là `Other - specify` xử lý thế nào? (c) dòng có buộc đủ cả 6 trường mới tính không, hay chỉ cần link + approval?

**Nếu trả lời khác:** `ASEAN_MARKETS` và `regulatoryChecklistStatus` trong `packages/shared/src/config/registers.ts`; 5 hàm trong `packages/shared/src/utils/marketDossier.ts`; 2 item `sg10-checklist*`.


> ✅ **Đã trả lời (24/08/2026) — bản gửi câu 35.** ⚠️ **(a)** Dùng **hai bộ giá trị riêng** chứ không tái sử dụng WorkStatus và thang market-track. 🆕 **(b)** "Other — specify" phải ghi quốc gia hoặc khu vực pháp lý thật; chưa nêu tên và chưa xác định dossier type thì bản ghi là chưa đầy đủ và **chặn Gate 10**. ✅ **(c)** phải đủ sáu trường, và N/A phải kèm lý do **cùng reviewer có thẩm quyền**. Xem Phụ lục 3 Phần 8.

#### ✅ R4-Q33 · A3 — claim loại `Cosmetic` có phụ thuộc bằng chứng product-level không, và trạng thái costing 🔴

**Hai chuyện nhỏ, gộp một câu vì cùng là "SME chưa nói gì".**

**(a) Ranh giới của `claimNeedsPerformanceEvidence` (Gate 10).** A3: *"Mandatory where any external claim depends on **product-level** efficacy, performance, sensory, clinical, instrumental, in vitro, in vivo, consumer-use or comparative evidence."* Catalogue ghi item này *"chờ B7"*; B7 đã xong 11/08 nên mở khoá — nhưng phải chọn **category nào của B7 thì tính**:

| Category | Tính? | Vì sao |
|---|---|---|
| `Product performance` · `Sensory` | ✅ | **trùng nguyên văn** hai chữ A3 dùng |
| `Ingredient-level` | ❌ | A3 nói **product-level**, đây là ingredient-level |
| `Borderline` · `Therapeutic` | ❌ | nói về rủi ro pháp lý, không phải loại bằng chứng |
| **`Cosmetic`** | ❌ **(đang để ngoài)** | đây là ranh giới thật: *"moisturising"* là claim cosmetic nhưng vẫn dựa trên bằng chứng hiệu năng. Lấy đúng chữ của họ là cách đọc **hẹp hơn**; nới rộng bằng phán đoán của mình là cách một gate bắt đầu đòi bằng chứng không ai yêu cầu |

Đã ghi `coverageNote` nói rõ `Cosmetic` hiện không kích hoạt.

**(b) `sg05-costing` — chưa từng hỏi ai.** Item Mandatory *"Costing or commercial feasibility status"* vẫn là `manual` vì `CostingInputs` **không có trường status nào**: nó luôn có sẵn số liệu từ lúc tạo dự án, nên không có tín hiệu "đã xong chưa". Muốn cưỡng chế thì phải **tự bịa** một trường status + bộ giá trị.

Lọt lưới vì sweep **S4** chỉ soi item `source: 'dev-decision'` đang **chặn** gate; item `manual` thì chưa chặn gì nên không bị soi. Đây là giới hạn của S4, không phải lỗi của nó — nhưng đáng ghi lại.

**Câu hỏi:** (a) claim loại `Cosmetic` có được coi là phụ thuộc bằng chứng product-level không? (b) *"Costing or commercial feasibility status"* nên đọc từ đâu — thêm một trường trạng thái vào phần Costing (nếu vậy thì giá trị gồm những gì, ai chốt), hay nó đã nằm ở chỗ nào khác mà ta chưa thấy?

**Nếu trả lời khác:** `CLAIM_CATEGORIES_NEEDING_PERFORMANCE_EVIDENCE` trong `packages/shared/src/config/registers.ts`; `sg05-costing` trong `gateReadiness.ts` (hiện `manual`).

---


> ✅ **Đã trả lời (24/08/2026) — bản gửi câu 36.** ⚠️ **(a)** Claim **Cosmetic CÓ** kích hoạt yêu cầu bằng chứng product-level khi nó khẳng định kết quả của thành phẩm — cách đọc hẹp của ta là sai. Kèm trường **Evidence basis required** (7 giá trị) để giữ ranh giới ingredient-level. 🆕 **(b)** thêm **Costing / Commercial Feasibility Status** (6 giá trị) + assessor/ngày/giả định/link; vẫn **Supporting** trừ khi dự án được chỉ định phụ thuộc thương mại. Xem Phụ lục 3 Phần 5 và 9.

## Round 5 — soạn dần, GỬI SAU KHI XONG CẢ 36 CÂU VÒNG 4

> **Quyết định của chủ dự án, 24/08/2026:** *"Round 5 gửi SME sẽ là sau khi đã đi qua 36 câu ở round 4, khi đó round 5 mới không có sự thay đổi gì thêm. Có thể vừa làm vừa soạn câu hỏi round 5."*
>
> Vòng 4 đã cho thấy vì sao: hai câu (`R4-Q15`, `R4-Q16`) phải chèn thêm **sau** khi bản gửi đã soạn, vì chúng chỉ lộ ra lúc build. Nhóm 1 vừa xong cũng đã thêm `R5-Q11`. Gửi sớm là gửi một danh sách còn động.
>
> **Hệ quả với cách build — quan trọng hơn cả việc gửi lúc nào.** Không nhóm nào được *chờ* một câu R5, vì có một vòng lặp không lách được: nhóm 3 cần `R5-Q7`, nhưng `R5-Q7` chỉ gửi sau khi 36 câu xong, mà **câu 18 và 29 chính là nhóm 3**. Nên từ nay: **build trên giả định có tài liệu, gắn `[ASSUMPTION: R5-Qn]` tại chỗ quyết định**. Tag không còn nghĩa "đang chờ để làm" mà là "đã làm theo cách đọc này, sẽ sửa nếu trả lời khác" — đúng cơ chế repo đã có và sweep TAG đã canh.
>
> Vì code sẽ chạy trên các giả định này lâu hơn Vòng 4, dòng **"Nếu trả lời khác thì sửa ở đâu"** của mỗi câu nay là phần bắt buộc, không phải phần trang trí. Ở Vòng 4 chính nó đã biến việc đóng 33 câu thành việc máy móc thay vì khảo cổ.
>
> **Bản gửi đi:** [`../rounds/DRAFT-our-questions-round5.md`](../rounds/DRAFT-our-questions-round5.md) — soạn song song, đánh số 1–12 theo ngôn ngữ nghiệp vụ, không có tên file hay định danh code. Đổi tên thành `YYYY-MM-DD-our-questions-round5.md` **đúng ngày gửi**, và sau đó không sửa nữa.
>
> *Sửa 24/08 sau khi chủ dự án hỏi lại:* trước đó tôi đã kết luận là **chưa** tạo file trong `docs/rounds/`, lấy lý do "thư mục đó là bằng chứng". Đọc lại `rounds/README.md` thì lý do đó lẫn hai việc — *không sửa sau khi gửi* ≠ *không được soạn trong đó* — và chính README nêu bài học ngược lại: *"lưu bản gửi đi ngay khi gửi, đừng đợi bản trả lời về"*, sau khi bộ câu hỏi Vòng 3 bị thiếu khỏi repo. Vòng 4 cũng đã làm đúng cách này: bản gửi tồn tại trong `rounds/` suốt ba ngày soạn (09/08 → 12/08) rồi mới đổi tên theo ngày gửi.

**Cột Gửi số** là cầu nối giữa hai bản — khi SME trả lời "3 — option (b)" thì biết ngay nó đóng câu nội bộ nào.

| ID | Gửi số | Chủ đề |
|---|---|---|
| R5-Q5 | **1** | "Chưa đánh giá" ghi ở đâu, cho 7 trigger đọc từ bảng |
| R5-Q6 | **2** | "Responsible reviewer" của một item readiness là ai |
| R5-Q7 | **3** | Phạm vi ảnh chụp bằng chứng theo gate |
| R5-Q11 | **4** | Câu trả lời câu 8 — một lần cho dự án hay từng phát hiện |
| R5-Q12 | **5** | Safety finding `Superseded` có cần bằng chứng đóng như `Closed` |
| R5-Q10 | **6** | Sáu giá trị disposition Gate 4 thay thế hay bổ sung |
| R5-Q8 | **7** | Ai ký quyết định supersession theo thị trường |
| R5-Q9 | **8** | Ai phán định thay đổi Claims Library là "critical" |
| — | **9** | 18 vùng ảnh hưởng của trigger scale-up đọc từ đâu (vế còn lại của câu 12 Vòng 4) |
| R5-Q1 | **10** | Ai chỉ định người ký phase, ai được gỡ chữ ký |
| R5-Q2 | **11** | D1 có áp cho khối chữ ký phase không |
| R5-Q4 | **12** | Chữ ký vẽ tay + yếu tố thứ hai — có cần, và bắt buộc tới mức nào |
| R5-Q13 | **13** | Thiếu quyết định `Reject / Stop` — câu 3 và 29 đều nêu, dropdown workbook không có |
| R5-Q14 | **14** | "Safety **hoặc** Regulatory authority" — một trong hai là đủ, hay cần cả hai |
| R5-Q15 | **15** | Trang dữ liệu tham chiếu cấp công ty: ai *thấy*, ai *sửa* |
| R5-Q16 | **16** | Gap High — "controlled action" nghĩa là Next Action có kiểm soát?, và due date ghi đâu |
| R5-Q17 | **17** | Trigger Change Control có nên giới hạn theo gate dự án đã pass không |
| R5-Q3 | *chưa gửi* | Ba cái tên trong dòng "Approval route" của Guide — quá nhỏ để chiếm một số, gộp khi soạn bản cuối |

### Round 5, phần 1 — raised while implementing D1 ở cấp phase (2026-08-20)

**Chưa gửi.** Cùng quy ước với Round 4: ID ổn định, tag `[ASSUMPTION: Rn-Qm]` tại chỗ quyết định, và mỗi câu kết bằng "Nếu trả lời khác thì sửa ở đâu". Sweep TAG của `verify:readiness` trước đây hardcode `R4-Q…` nên **bỏ qua im lặng** tag `R5-Q1` đầu tiên vừa gắn — đã sửa thành `R\d+-Q\d+` cùng ngày; đây đúng là kiểu lỗi mà sweep đó tồn tại để bắt.

| ID | Chủ đề | Trạng thái |
|---|---|---|
| R5-Q1 | Chữ ký phase: Lead chỉ định người ký · chỉ người đó ký được · ai được gỡ chữ ký | 🔴 |
| R5-Q2 | D1 có áp cho khối chữ ký **phase** không, hay chỉ cho chữ ký **gate** | 🔴 |
| R5-Q3 | Ba cái tên trong dòng "Approval route" của Guide ứng với ba vai trò nào | 🔴 |
| R5-Q4 | Chữ ký vẽ tay + xác thực hai bước khi ký phase — có cần, và bắt buộc tới mức nào | 🔴 |

#### R5-Q1 · Chữ ký phase — ai chỉ định người ký, và ai được gỡ 🔴

**Đã làm (theo quyết định của chủ dự án 20/08):** khối Prepared / Reviewed / Approved của mỗi phase giờ hoạt động như sau — **Project Lead của dự án** (field `identity.projectLead`, bắt buộc chọn khi tạo dự án) chỉ định 1 người cho từng dòng; **chỉ đúng người được chỉ định mới ký được** dòng đó; dòng `Approved by` **ngoài ra** vẫn phải có capability `phase:N|approve`. Trước đây `Name`/`Signature / initials` là ô nhập tự do nên một dòng có thể ghi tên người này trong khi server ghi nhận người khác đã lưu.

**Ba điểm là suy đoán của dev, chưa hỏi ai:**

**(a) Lead được so bằng TÊN.** `identity.projectLead` lưu `displayName` (giống `reviewers`), nên kiểm tra là `session.displayName === identity.projectLead`. Hai người trùng tên sẽ cùng quyền chỉ định. Cách chắc chắn hơn là lưu user id trên `projects`, nhưng đó là đổi schema của `projects`, không phải của chữ ký.

**(b) Gỡ chữ ký: chỉ chính người đã ký (hoặc admin), kèm lý do bắt buộc.** Cố tình **không** cho Lead gỡ: Lead gỡ được chữ ký của reviewer thì Lead lật được kết luận mình không đồng ý. Admin được gỡ để xử lý trường hợp tài khoản đó đã rời công ty. Lý do bắt buộc theo B4.

**(c) Dòng đã ký thì không đổi được người.** Muốn đổi phải gỡ chữ ký trước — nếu không, bảng sẽ hiện một chữ ký nằm cạnh tên người khác.

**Câu hỏi:** (a) Người chỉ định người ký nên là **Project Lead** hay **Project Manager** (một trong 13 review role)? Hai từ này đang là hai thứ khác nhau trong hệ thống. (b) Ai được gỡ một chữ ký đã ký — chỉ chính người ký, hay Lead/Project Manager cũng được? (c) Người được chỉ định ký `Approved by` mà role không có quyền duyệt phase thì nên **chặn** (đang làm vậy) hay coi việc được chỉ định là đủ?

**Nếu trả lời khác:** `assertIsProjectLead`, `signSignOff`, `withdrawSignOff` trong `apps/api/src/projects/projects.service.ts`; `isLead`/`canApprove` trong `apps/web/src/components/SignOffBlock.tsx`.

#### R5-Q2 · D1 có áp cho khối chữ ký phase, hay chỉ cho chữ ký gate 🔴

D1 nói *"The phase-level sign-off block remains as an additional phase-closure approval and is not replaced"* — tức là **giữ nó**, nhưng **không nói** nó có phải mang đủ 6 trường (người đã xác thực · role · thời điểm · quyết định · phiên bản bản ghi · comment) như chữ ký gate hay không. Chúng tôi đã **áp cả 6 trường cho khối phase** với lập luận: một chữ ký lỏng hơn ở cấp phase thì làm hỏng luôn ý nghĩa của cấp gate, và ô nhập tự do là lỗ hổng thật (ghi tên A, hệ thống ghi B). Đây là hướng **siết chặt**, không nới, nhưng vẫn là suy đoán.

Hai hệ quả kèm theo, cũng chưa hỏi:

- **Comment bắt buộc khi quyết định khác `Proceed`.** D1 chỉ viết *"comment where required"* mà không nói khi nào. Đọc là: mọi thứ khác `Proceed` đều mang theo điều kiện hoặc lý do nên phải ghi ra. Cùng một chỗ trống với `R4-Q26`, đã gắn tag ở đó.
- **Tính độc lập ở cấp phase chỉ CẢNH BÁO, không chặn.** Điều khoản độc lập của D1 viết cho gate ("safety-, regulatory-, claims- or release-critical"), và không có định nghĩa nào cho biết phase nào là critical. Một người ký 2–3 dòng của cùng một phase hiện chỉ hiện banner vàng.

**Câu hỏi:** (a) Khối chữ ký phase có phải mang đủ 6 trường như chữ ký gate không? (b) Một người có được ký nhiều hơn một trong ba dòng của cùng một phase không — nếu không thì áp cho cả 4 phase hay chỉ những phase nhất định?

**Nếu trả lời khác:** `signSignOff` trong `apps/api/src/projects/projects.service.ts` (bỏ/nới các điều kiện); banner `sharedSigner` trong `apps/web/src/components/SignOffBlock.tsx`; `isSignedOff` trong `packages/shared/src/types/index.ts` và hai chỗ dùng nó trong `gateProgress.ts`.

#### R5-Q3 · Ba cái tên trong dòng "Approval route" của Guide ứng với ba vai trò nào 🔴

**Nguyên tắc chủ dự án nêu 20/08:** mọi tên người xuất hiện trong workbook, khi số hoá, đều là **dữ liệu động gán theo từng dự án**, không phải giá trị mặc định — Excel buộc phải viết tên cứng vào ô cho dễ hình dung, ứng dụng thì không.

Áp nguyên tắc đó, một dòng trong tab Guide phải đổi cách viết. Nguyên văn workbook: *"Current route: Chris prepares study proposal, George/Head of Department signs off, Sekar or nominated independent reviewer signs off outside the department."* Đã đổi thành ba **vai trò** mà workflow C2 đang có sẵn: Study Author chuẩn bị · Department Study Reviewer (head of department) ký · Independent Reviewer ngoài phòng ban ký.

**Vì sao vẫn là suy đoán:** câu gốc đúng cấu trúc 3 bước của C2 và chữ *"Head of Department"* / *"independent reviewer outside the department"* nằm ngay trong câu, nên tín hiệu rất mạnh — nhưng việc **Chris = Study Author** là suy ra từ ngữ cảnh câu, không phải từ một bảng ánh xạ nào. Trong `REVIEW_ROLES` thì Chris là **Project Manager**, không phải Study Author; nếu người viết câu đó thực sự muốn nói "Project Manager chuẩn bị proposal" thì bản dịch này sai một vai.

**Câu hỏi:** trong câu Approval route, ba người được nêu ứng với ba vai trò nào — Study Author / Department Study Reviewer / Independent Reviewer (đang hiểu vậy), hay là Project Manager / R&I / Quality & GMP theo đúng vùng phụ trách của họ trong workbook?

**Nếu trả lời khác:** dòng `Approval route` trong `SYSTEM_GUIDE` của `apps/web/src/pages/RegisterHubPage.tsx`.

#### R5-Q4 · Chữ ký vẽ tay + xác thực hai bước khi ký phase 🔴

**Đã làm (20–21/08):** ngoài 6 trường D1 yêu cầu, người ký có thể **đính thêm ảnh chữ ký vẽ tay** của mình vào dòng sign-off. Chữ ký được vẽ một lần ở My Account; mỗi lần đính vào một lần ký thì phải nhập **mã 6 số từ app authenticator** (TOTP) — mã được ràng buộc vào đúng một hành vi `(dự án, phase, vai trò)` và chỉ dùng được một lần. Ảnh được **chụp lại tại thời điểm ký**, không phải tham chiếu sống, nên sửa chữ ký sau này không làm thay đổi thứ một chữ ký cũ đã hiện. Gỡ chữ ký thì xoá cả ảnh.

Kênh xác thực là **quyết định của chủ dự án (21/08)**: chuyển từ mã gửi email sang app authenticator — không cần quyền `Mail.Send` cũng không cần mailbox có license, và yếu tố xác thực nằm trên thiết bị người ký giữ thay vì trong một hộp thư người khác cũng vào được. Cái **chưa hỏi ai** là ba điểm dưới đây.

**(a) D1 không hề nhắc tới ảnh chữ ký.** Danh sách 6 trường của D1 là: người đã xác thực · role · thời điểm · quyết định · phiên bản bản ghi · comment. Ảnh vẽ tay là **thứ chúng tôi thêm**, với lập luận: bản giấy/PDF xuất ra cho hồ sơ đọc như một chữ ký thật, và nó không thay thế bất cứ trường nào trong 6 trường kia. Nhưng nếu đội duyệt coi ảnh vẽ tay là **hình thức**, thậm chí gây nhầm là bằng chứng mạnh hơn thực tế, thì nên bỏ.

**(b) ~~Đính chữ ký là TÙY CHỌN~~ — ĐÃ CHỐT 22/08 bởi chủ dự án: BẮT BUỘC.** Bản đầu (21/08) để đính ảnh là tùy chọn qua một checkbox, nên ký "trơn" không hỏi mã và hai bước chỉ bảo vệ *cái ảnh*, không bảo vệ *hành vi ký*. Chủ dự án chỉ ra rằng đính chữ ký là việc bắt buộc để ký, nên đường ký "trơn" đã bị bỏ: **mọi** lần ký phase giờ đều đính chữ ký đã lưu và đều đòi mã authenticator mới. Ép ở **cả hai lớp** — UI chỉ còn một nút, và `signSignOff` ở API từ chối request không có proof (đã kiểm bằng curl: ký không token → 400, token bịa → 400, xin step-up khi chưa lưu chữ ký → 400).

**Hệ quả có chủ ý:** một người được chỉ định ký mà **chưa lưu chữ ký hoặc chưa đăng ký authenticator thì không ký được gì** — nút hiện lý do và link sang My Account, và phase không đóng được cho tới khi người đó tự thiết lập.

**(c) Mất điện thoại thì admin reset, không có backup code.** Người dùng tự gỡ authenticator phải nhập mã hiện hành (để session bị chiếm không gỡ được lớp bảo vệ). Mất thiết bị thì nhờ admin reset ở Users & Roles — admin không bao giờ thấy secret, người dùng tự đăng ký lại. Cố tình **không** làm backup code: một tờ mã in ra để trong ngăn bàn thì mở đúng cái cửa mà lớp này vừa khoá.

**Câu hỏi còn lại:** (a) Chữ ký vẽ tay có cần trong hồ sơ không, hay 6 trường D1 là đủ? Nếu đội duyệt trả lời "không cần" thì mức bắt buộc ở (b) phải xem lại theo, vì lớp thứ hai hiện gắn với việc đính ảnh. (b) ~~tùy chọn hay bắt buộc~~ — chủ dự án đã chốt BẮT BUỘC; phần còn mở là ở cấp **gate** sau này có áp cùng mức không. (c) Hai lớp có cần cho cả `Prepared by` / `Reviewed by`, hay chỉ `Approved by`? (Hiện áp cho cả ba.)

**Nếu trả lời khác:** khối `input.attachSignature` trong `signSignOff` và `verifySignOffStepUp` ở `apps/api/src/projects/projects.service.ts`; `apps/api/src/verification/totp.service.ts` (bỏ hẳn yếu tố thứ hai); `TotpEnrollCard.tsx` + thẻ Signature trong `apps/web/src/pages/MyAccount.tsx` (bỏ chỗ đăng ký); `wantsSignature`/`SignatureStepUpModal` trong `apps/web/src/components/SignOffBlock.tsx`.

---

### Round 5, phần 2 — phát sinh từ chính đáp án Vòng 4 (24/08/2026)

**Chưa gửi.** Vòng 4 đóng cả 33 câu, nhưng vài đáp án nêu ra một yêu cầu mà không nói nó được **ghi ở đâu** hoặc **ai quyết**. Sáu câu dưới đây là những chỗ đó — không phải chỗ ta bất đồng, mà chỗ ta không đủ thông tin để build mà không đoán. Cùng quy ước: ID ổn định, `[ASSUMPTION: Rn-Qm]` tại chỗ quyết định, và mỗi câu kết bằng "Nếu trả lời khác thì sửa ở đâu".

**Bảng này lớn dần theo từng nhóm được build** — cột cuối ghi nhóm nào làm nó lộ ra, để khi soạn bản gửi ở cuối biết câu nào đã chạy trên giả định bao lâu.

| ID | Chủ đề | Liên quan nhóm | Lộ ra khi |
|---|---|---|---|
| R5-Q5 | "Chưa đánh giá" hiển thị và được ghi ở đâu, cho 7 trigger đọc từ bảng | Nhóm 1 (nền tảng) | thiết kế nhóm 1 |
| R5-Q6 | "Responsible reviewer" của một *item readiness* là ai | Nhóm 1 (câu 16) | thiết kế nhóm 1 |
| R5-Q7 | Phạm vi của ảnh chụp bằng chứng theo gate | Nhóm 3 | đọc câu 29(1) |
| R5-Q8 | Ai được ký quyết định supersession theo thị trường | Nhóm 8 | đọc câu 2 |
| R5-Q9 | Ai phán định một thay đổi Claims Library là "critical" | Nhóm 4d | đọc câu 28(5) |
| R5-Q10 | Gate 4 sáu giá trị disposition ↔ ba status flagged sẵn có | Nhóm 6 | đối chiếu câu 6 với câu 32(a) |
| R5-Q11 | Câu trả lời câu 8 ghi một lần cho dự án hay từng phát hiện | Nhóm 1 (câu 8) | **build nhóm 1** |
| R5-Q12 | Safety finding `Superseded` có cần kết luận + bằng chứng như `Closed` | Nhóm 2 (câu 33) | **build nhóm 2** |
| R5-Q13 | Thiếu quyết định `Reject / Stop` mà câu 3 và 29 đều nêu | Nhóm 2 (câu 3) | **build nhóm 2** |
| R5-Q14 | "Safety **hoặc** Regulatory authority" — một trong hai đủ, hay cần cả hai | Nhóm 2 (câu 32c) | **build nhóm 2** |
| R5-Q15 | Trang dữ liệu tham chiếu cấp công ty: ai *thấy* khác ai *sửa* | Nhóm 4a/4b | **build nhóm 4b** |
| R5-Q16 | Gap High — "controlled action" là Next Action có kiểm soát?, due date ghi đâu | Nhóm 2 (câu 3) | **chủ dự án thử luồng gap** |

Sáu câu cuối đáng chú ý: chúng chỉ lộ ra **khi viết code hoặc khi bấm thử**, không phải khi đọc đáp án — Q11 khi thấy app không có bản ghi "post-market finding" nào để gắn câu trả lời vào · Q12 khi một ca kiểm hành vi cho kết quả chặn mà không có quy tắc nào nói nên chặn · Q15 khi trang admin vừa xây xong thì lộ ra người bảo trì dữ liệu lại không thấy link · Q16 khi chủ dự án đặt Gap `High` và câu hướng dẫn trên màn hình bảo làm sai điều luật cho phép. Đó là lý do quyết định "gửi sau khi xong 36 câu" đúng: bốn nhóm còn lại gần như chắc chắn sẽ thêm nữa.

#### R5-Q5 · "Chưa đánh giá" được ghi ở đâu, cho 10 trigger đang chạy 🔴

**Đáp án Vòng 4 câu 7 (option b):** phân biệt ba trạng thái — đã xét-có áp dụng · đã xét-không áp dụng · **chưa xét** — và "chưa xét" phải chặn readiness với item Mandatory hoặc Conditional.

**Cái đáp án không nói:** trạng thái thứ ba đó **người dùng ghi ở đâu**. Trong 10 trigger đang chạy ở `isReadinessTriggerActive()`, đúng **ba** cái nói được: `microbiologicallySusceptible` đã nói được sẵn (trường rỗng cho tới khi có người chọn 1 trong 5 giá trị — chính là ca đáp án nêu đích danh), còn `openChangeControl` và `humanStudyPlanned` sẽ có trường Yes/No/Pending từ câu 8 và câu 9. **Bảy cái còn lại suy ra từ một checklist, một register hoặc `identity.markets`, và không cái nào có chỗ để một người nói "tôi đã xét, không áp dụng"** — bảng nguồn rỗng không phân biệt được với một câu "không" đã cân nhắc:

| Trigger | Suy từ | "Đã xét, không áp dụng" ghi ở đâu? |
|---|---|---|
| `skincareForTwo` · `infantContact` | checklist Target Users | chưa có — không chọn Pregnancy có thể là "không áp dụng" hoặc "chưa ai điền Target Users" |
| `aseanMarket` | `identity.markets` | chưa có — và câu 24 vừa bỏ tính bắt buộc của trường này lúc tạo dự án, nên "rỗng" nay là trạng thái thật |
| `microbiologicallySusceptible` | `formulaProperties` | ✅ có sẵn — 5 giá trị + rationale bắt buộc. Đây là mẫu đúng |
| `claimNeedsRegulatoryReview` · `claimNeedsPerformanceEvidence` | register claim | một phần — `Pending classification` là "chưa xét", nhưng **register rỗng** thì sao? |
| `newOrRepositionedProject` | checklist gate 01 | chưa có |
| `humanStudyPlanned` | register study | câu 9 cấp trường mới, giải quyết |
| `openChangeControl` | `project.changes` | câu 8 cấp trường mới, giải quyết |
| `pvPmsRequired` | checklist + register | chưa có |

**Suy đoán của dev nếu không có đáp án:** coi "bảng nguồn hoàn toàn trống" là **chưa xét** (chặn), và "bảng có dữ liệu nhưng không dòng nào khớp điều kiện" là **đã xét, không áp dụng** (không chặn). Cách này không cần thêm trường nào, và nó khớp với ca `microSusceptibility` mà đáp án nêu đích danh. Nhưng nó vẫn là suy đoán, và nó làm mọi dự án mới bị chặn ở vài gate cho tới khi có người mở từng bảng ra — đúng cái đánh đổi mà câu 7 nói là "your call rather than ours" nhưng theo chiều ngược lại.

**Câu hỏi:** với một trigger suy ra từ một bảng, "bảng còn trống" nên tính là **chưa đánh giá** (chặn) hay vẫn cần một ô tường minh để người dùng nói đã xét? Nếu cần ô tường minh thì nó nên nằm ở đâu — một dòng Key Gate Check cho mỗi trigger, hay một trường trên chính bảng nguồn?

**Nếu trả lời khác:** `isReadinessTriggerActive()` và `TRIGGER_INACTIVE_EXPLANATIONS` trong `packages/shared/src/utils/gateProgress.ts`; `gateReadinessChecklist()` cùng file.

#### R5-Q6 · "Responsible reviewer" của một item readiness là ai 🔴

**Đáp án Vòng 4 câu 16:** hệ thống được tự sinh lý do N/A, nhưng với item **safety-, regulatory-, claims- hoặc release-critical** thì lý do đó *"must still be acknowledged by the responsible reviewer before gate closure"*.

**Cái đáp án không nói:** "responsible reviewer" của một **item readiness** là ai. Câu 29 định nghĩa vai trò rất rõ ở cấp **gate** (Preparer / Reviewer / Approver, và ở 7 gate critical thì phải đúng chức năng độc lập) — nhưng một gate có 10–20 item, và không có gì gắn một item với một người.

Ba cách đọc, ba lượng công việc rất khác nhau:

1. **Người Reviewer của gate** xác nhận tất cả item N/A tự sinh của gate đó, một lần. Rẻ nhất, và khớp với việc câu 29 dùng đúng bốn chữ "safety-, regulatory-, claims- or release-critical" cho gate.
2. **Chủ sở hữu review area của register mà item đó đọc** (`identity.reviewers` + `ReviewOwnerSpec` đã có sẵn). Đúng nghĩa "responsible" hơn, nhưng một item `allOf` đọc nhiều register thì có nhiều owner.
3. **Một người được chỉ định cho từng item.** Chính xác nhất, đắt nhất, và chưa có chỗ lưu.

**Câu hỏi:** cách nào? Và "item critical" ở đây có cùng nghĩa với "gate critical" của câu 29 (tức mọi item ở Gate 3/4/7/8/9/10/11) hay là một tính chất riêng của từng item?

**Nếu trả lời khác:** chỗ sẽ build là `gateReadinessChecklist()` (`gateProgress.ts`) + một bảng acknowledgement mới; hằng số danh sách gate critical đặt cạnh phép kiểm độc lập của câu 29.

#### R5-Q7 · Ảnh chụp bằng chứng theo gate gồm chính xác những gì 🔴

**Đáp án Vòng 4 câu 29(1)** liệt kê 8 thành phần của bản ghi được ký, và nói rõ nếu bằng chứng bên trong ảnh chụp thay đổi thì chữ ký thành stale, hệ thống phải **chỉ ra cái gì đã đổi**, và phải ký lại. Câu *"A project-wide save counter is not sufficient"* loại `projects.version`.

**Cái đáp án không nói:** biên của ảnh chụp. Ba thành phần trong tám là **rộng vô định**: *"applicable checklist results"* · *"mandatory and triggered evidence-register states"* · *"evidence links and document revisions"*. Ở Gate 10, "mandatory and triggered evidence-register states" là khoảng 15 register, mỗi cái vài chục dòng.

**Suy đoán của dev:** chụp đúng những gì `gateReadinessChecklist(project, gateId)` đọc — tức mọi leaf check của gate đó, và với mỗi check là giá trị nó đọc chứ không phải cả register. Ưu điểm: biên do chính engine định nghĩa nên không bao giờ lệch với "cái gì chặn gate này", và "chỉ ra cái gì đã đổi" trở thành một phép diff trên danh sách item. Nhược điểm: một dòng register nằm ngoài mọi readiness check sẽ đổi mà chữ ký không biết.

**Câu hỏi:** biên như trên có đủ không, hay ảnh chụp phải phủ **toàn bộ** nội dung của những register mà gate đó dùng — kể cả cột không readiness check nào đọc?

**Nếu trả lời khác:** bảng `gate_sign_offs` mới + hàm chụp ảnh trong `apps/api/src/projects/projects.service.ts`; nếu phủ toàn bộ register thì kích thước ảnh chụp và cách so sánh đều khác hẳn.

#### R5-Q8 · Ai ký quyết định supersession theo thị trường 🔴

**Đáp án Vòng 4 câu 2** liệt kê 10 dữ kiện phải xác nhận để một phiên bản công thức cũ chuyển từ *Transition in Progress* sang *Superseded*, và nhấn mạnh *"The supersession decision must be recorded by a person — never inferred automatically by the system."*

**Cái đáp án không nói:** *"an authorised person"* là ai. Mười dữ kiện trải khắp Regulatory (thông báo/đăng ký), Quality (lô cuối được xuất xưởng), Supply Chain (xử lý tồn kho), Sales & Marketing (truyền thông) và Packaging (chuyển tiếp artwork) — nên không hiển nhiên đây là một chữ ký hay năm chữ ký.

**Câu hỏi:** quyết định supersession là **một** chữ ký của một vai trò (nếu vậy: vai trò nào?), hay là một khối nhiều vai trò giống Prepared/Reviewed/Approved? Và nó có cần lớp xác thực thứ hai như chữ ký phase hiện nay không?

**Nếu trả lời khác:** mô hình dữ liệu formula version (`FormulaVersionRecord` trong `types/index.ts` + bảng `formula_versions`), và nhóm 8 của lộ trình.

#### R5-Q9 · Ai phán định một thay đổi Claims Library là "critical" 🔴

**Đáp án Vòng 4 câu 28(5)**: khi một entry thư viện bị đổi hoặc thu hồi thì phải xác định mọi claim/SKU/thị trường/tài liệu liên quan, đánh giá tác động, tạo Change Control khi cần, và — quan trọng nhất — *"Changing/withdrawing must not automatically remove a product from the market **unless the change is critical or required by Regulatory**."*

**Cái đáp án không nói:** ai quyết định một thay đổi là "critical", và điều đó có dùng lại thang bốn mức của câu 3/33/34 hay là một phán định riêng. Đây là quyết định có hệ quả thương mại trực tiếp — nó có thể kéo một sản phẩm đang bán ra khỏi thị trường — nên đúng là loại việc file này tồn tại để không đoán.

**Câu hỏi:** "critical" ở đây có phải mức `Critical` trên thang Low/Medium/High/Critical mà câu 3, 33 và 34 vừa thống nhất không? Ai được ghi nó — Regulatory một mình, hay Technical và Regulatory cùng như khi duyệt entry (câu 28(3))?

**Nếu trả lời khác:** phần cascade của Claims Library, nhóm 4d.

#### R5-Q10 · Sáu giá trị disposition của Gate 4 quan hệ thế nào với ba status "flagged" 🔴

**Hai đáp án Vòng 4 chồng lên cùng một cột.** Câu 6 nói mỗi dòng ở Gate 4 phải được phân loại vào 1 trong **sáu** giá trị: No issue identified · Needs Safety Review · Needs Regulatory Review · Prohibited — remove · Considered — not selected · Further information required. Câu 32(a) nói "flagged" gồm **ba** status: REVIEW — possible formula match · Needs Safety Review · Needs Regulatory Review.

**Chỗ không khớp:** `REVIEW - possible formula match` nằm trong danh sách flagged nhưng **không** nằm trong sáu giá trị disposition; ngược lại `No issue identified`, `Considered — not selected` và `Further information required` nằm trong sáu giá trị nhưng không nằm trong flagged. Hôm nay cột `productStatus` của `prohibitedIngredients` là **một** cột giữ cả hai ý.

Hai cách đọc:

1. **Sáu giá trị thay thế danh sách hiện tại**, và `REVIEW — possible formula match` trở thành kết quả tự động của phép so watch-list chứ không phải một disposition người chọn — tức hai cột: *kết quả sàng lọc tự động* và *disposition của người*.
2. **Sáu giá trị là danh sách đầy đủ mới**, `REVIEW — possible formula match` được thêm vào thành bảy, và "flagged" chỉ là một tập con của nó.

Cách 1 sạch hơn về mô hình (máy tìm ra, người phán định — hai việc khác nhau) nhưng là một migration trên dữ liệu đã có. Cách 2 rẻ hơn nhưng để một cột tiếp tục làm hai việc.

**Câu hỏi:** sáu giá trị của câu 6 là **thay thế** danh sách status hiện tại, hay **bổ sung** vào nó? Và `REVIEW — possible formula match` là kết quả máy sinh hay một lựa chọn của người?

**Nếu trả lời khác:** `WATCHLIST_FLAGGED_STATUSES` và cột `productStatus` của `prohibitedIngredients` trong `packages/shared/src/config/registers.ts`; `flaggedWatchlistRows()` trong `utils/watchlistReview.ts`; `sg04-no-remove` / `sg04-pb-screen` trong `gateReadiness.ts`.

#### R5-Q11 · Câu trả lời "có cần Change Control không" ghi một lần cho dự án hay từng phát hiện 🔴

**Đã build 24/08/2026** cùng nhóm 1. Câu 8 yêu cầu một bước đánh giá tường minh — *"Change Control required? → Yes / No / Pending assessment"* kèm reviewer · ngày · lý do · Change Control ID liên kết (khi Yes) · evidence link — và **"Pending assessment must block closure of the post-market finding"**.

**Chỗ phải chọn:** đáp án nói *"the post-market finding"* ở số ít, nghĩa là mỗi phát hiện một câu trả lời. Nhưng app **không có bản ghi "post-market finding"** nào để gắn vào:

| Ứng viên | Vì sao không phải "the finding" |
|---|---|
| checklist `postMarketSources` | là danh sách **nguồn** nào có áp dụng (16 option), không phải từng phát hiện |
| `project.capa` | là **hành động kết quả** — và chính câu 10 nói "CAPA là resulting action, không phải nguồn feedback" |
| `project.feedback` | phản hồi panel nội bộ, không phải phát hiện hậu thị trường |

**Đã làm:** giữ câu trả lời ở **cấp dự án** (`ProjectAssessments.changeControlRequired`), và Pending/chưa trả lời thì chặn **Gate 12**. Lập luận: `sg12-signoff` là *"Prepared, reviewed and approved review closure"* — Gate 12 **chính là** việc đóng kỳ review hậu thị trường, nên chặn Gate 12 là cách đọc sát nhất mà dữ liệu hiện có cho phép. Item mang `coverageNote` nói rõ câu trả lời là một-cho-cả-dự-án.

**Cái mất khi làm vậy:** có 5 phát hiện mà chỉ 1 cần Change Control thì một ô Yes/No cấp dự án không diễn tả được. Đổi lại, làm per-finding nghĩa là **phát minh ra bản ghi "post-market finding"** — một register mới không ai yêu cầu, ở đúng vùng mà câu 10 đang bảo tách lại 16 option thành ba danh sách, nên rất dễ phải làm hai lần.

**Câu hỏi:** câu trả lời này nên ghi **một lần cho cả dự án** (đang làm vậy), hay **từng phát hiện hậu thị trường một**? Nếu là từng phát hiện, xin cho biết cái gì tạo thành một "phát hiện" trong hệ thống — nó có phải là thứ sẽ ra đời khi tách ba danh sách của câu 10 không?

**Nếu trả lời khác:** `ProjectAssessments` trong `packages/shared/src/types/index.ts` (chuyển 6 trường sang một register mới), nhánh `openChangeControl` trong `evaluateTrigger()` ở `utils/gateProgress.ts`, và `AssessmentsCard.tsx`.

#### R5-Q12 · Một safety finding `Superseded` có cần kết luận + bằng chứng như `Closed` không 🔴

**Đã build 24/08/2026** cùng nhóm 2. Câu 33(b) cấp bộ trạng thái mới cho safety finding: Open · Under Review · Action Pending · Verification Pending · Closed · **Superseded**. Câu 33(e) nói riêng về việc *đóng*: *"Closing a High or Critical finding requires: Safety reviewer conclusion · Evidence link · Linked action completed · Verification · Verifier · Closure date."*

**Chỗ không có đáp án:** `Superseded` không phải `Closed`. Một finding bị thay thế bởi đánh giá sau về cùng mối nguy — bằng chứng của nó nằm ở *finding thay thế*, không phải ở chính nó. Nên câu 33(e) có áp cho `Superseded` hay không thì đáp án không nói.

**Đã làm — hướng an toàn:** áp cùng yêu cầu. Một finding High/Critical **không** được trở thành qua-được-gate chỉ nhờ bị đánh dấu Superseded; và nếu nó thật sự đã bị thay thế thì viết điều đó vào ô kết luận là một câu, không phải một gánh nặng.

**Cái mất khi làm vậy:** một dòng Superseded để trống ô kết luận sẽ **chặn Gate 7 vô hạn** cho tới khi có người điền. Với một finding đã bị thay thế, đòi "evidence link" nghe hơi lạ.

**Câu hỏi:** một safety finding ở trạng thái `Superseded` có phải ghi kết luận và bằng chứng như khi `Closed` không? Nếu không, thì cái gì thay thế — có cần trỏ tới finding đã thay nó không (kiểu "superseded by finding X")?

**Nếu trả lời khác:** `closedWithoutEvidence` và `RESOLUTION_CLOSED_STATES` trong `packages/shared/src/utils/safetyFindings.ts` + `config/registers.ts`.

#### R5-Q13 · Câu 3 nói "Hold, Backtrack **hoặc Reject/Stop**" — app không có quyết định Reject/Stop 🔴

**Đã build 24/08/2026** cùng nhóm 2. Câu 3 nói một gap **Critical** *"must result in **Hold, Backtrack or Reject/Stop**"*.

**Chỗ không khớp:** dropdown `Gate decision` của app có 5 giá trị — `Proceed` · `Proceed with Conditions` · `Hold` · `Backtrack` · `N/A` — **không có `Reject/Stop`**. Danh sách đó chép nguyên văn từ workbook, và workbook là nguồn thẩm quyền của nó.

**Đã làm:** chặn cả hai quyết định Proceed và chỉ đề xuất `Hold` hoặc `Backtrack`. Hai trong ba lối ra câu 3 nêu đều tồn tại, nên luật vẫn thi hành được — chỉ là lối thứ ba không có.

**Vì sao không tự thêm:** thêm một giá trị vào dropdown mà workbook không có là đúng loại việc file này tồn tại để không làm. `Reject/Stop` cũng khác `Hold` về nghĩa nghiệp vụ — Hold là tạm dừng, Reject/Stop là kết thúc dự án — nên nó có thể kéo theo cả một trạng thái dự án (`archived`? một trạng thái mới?), không chỉ một option.

**Câu hỏi:** `Reject/Stop` có phải một quyết định gate thứ sáu cần thêm vào dropdown không? Nếu có, nó khác `Hold` ở chỗ nào về hệ quả — dự án có bị đóng/lưu trữ luôn không, hay chỉ là một nhãn khác? Nếu không cần thêm, thì `Hold` và `Backtrack` có đủ cho một gap Critical không?

**Nếu trả lời khác:** `GATE_DECISIONS` trong `packages/shared/src/config/gates.ts` và `GateDecision` trong `types/index.ts`; các mảng `allowed` trong `packages/shared/src/utils/gapCriticality.ts`.

#### R5-Q14 · "Safety **hoặc** Regulatory authority" — bên nào cho finding nào 🔴

**Đã build 24/08/2026** cùng nhóm 2. Câu 32(c) nói việc ghi Proceed with Conditions có thể là authorised acceptance của một watch-list finding bị flag, *"không cần một bước acknowledgement trùng lặp riêng"* — nhưng một trong bốn điều kiện là **"the gate approver has the required Safety or Regulatory authority"**.

**Đã làm:** hai capability riêng (`watchlist-finding|accept-safety` và `|accept-regulatory`), và **một trong hai là đủ**. Seed gán theo đúng tên chức năng đáp án nêu: Safety Reviewer và Regulatory Reviewer.

**Chỗ không có đáp án:** chữ *"required"* hàm ý **có một bên đúng cho từng finding**, chứ không phải bên nào cũng được. Nhưng app thường không biết bên nào:

| Status bị flag | Bên nào là "required"? |
|---|---|
| `Needs Safety Review` | rõ — Safety |
| `Needs Regulatory Review` | rõ — Regulatory |
| `REVIEW - possible formula match` | **không rõ** — đây là kết quả máy so watch-list tự sinh, không ai escalate, nên không có chức năng nào được nêu tên |

Nếu siết thành "phải đúng bên" thì với dòng thứ ba không biết đòi bên nào; nếu để "một trong hai" thì một finding `Needs Safety Review` có thể được người chỉ có quyền Regulatory gánh qua — lỏng hơn chữ *"required"*.

**Câu hỏi:** với một dòng bị flag bởi phép so tự động (`REVIEW - possible formula match`), thẩm quyền nào là bắt buộc — Safety, Regulatory, hay bên nào cũng được? Và với `Needs Safety Review` / `Needs Regulatory Review`, có phải siết đúng bên tương ứng không?

**Nếu trả lời khác:** `canAcceptWatchlistFinding` trong `apps/api/src/rbac/permissions.service.ts` và `apps/web/src/utils/permissions.ts` (đổi từ OR sang chọn theo `productStatus` của dòng); `assertCanCarryConditions` trong `projects.service.ts` phải nhận từng dòng thay vì chỉ số lượng.

#### R5-Q15 · Dữ liệu tham chiếu cấp công ty — ai *thấy* trang, và ai *sửa* được 🔴

**Đã build 24/08/2026** cùng nhóm 4a/4b. Câu 4 nói *"Regulatory maintains a configurable market profile"*, câu 17 nói overlay nguyên liệu do *"authorised Technical, Safety and Regulatory users"* kiểm soát, câu 28 nói Claims Library cần **Technical VÀ Regulatory cùng duyệt**. Cả ba đều nói **ai được sửa**.

**Cái không đáp án nào nói:** ai được **thấy** trang quản trị các danh sách đó. Trong app hiện tại, link sidebar chỉ có một cờ `adminOnly`, và menu admin (`Users & Roles`) chỉ hiện với System Administrator.

**Đã làm — và nó lệch:** link `Market profiles` để `adminOnly`, còn nút Save khoá theo capability thật (`reference:market-profile|edit`, seed cho Regulatory). Hệ quả: **admin thấy link nhưng không phải người bảo trì dữ liệu; Regulatory là người bảo trì nhưng không thấy link** — phải vào qua ô tìm kiếm hoặc URL trực tiếp.

Ba cách sửa, ba mức việc:

1. **Cho link hiện với bất kỳ ai giữ capability sửa** — đúng nhất về nghĩa, nhưng `GlobalNavEntry` hiện chỉ có `adminOnly` (boolean), phải đổi thành một điều kiện đọc lưới quyền.
2. **Tách một nhóm sidebar riêng** ("Reference data") hiện với người giữ bất kỳ capability `reference:*|edit` nào — gọn hơn nếu cả ba dataset đều vào đó.
3. **Để nguyên admin-only** và coi Regulatory sửa qua link admin gửi cho họ — rẻ nhất, nhưng biến một quy trình thường xuyên thành thao tác cần người khác dẫn đường.

**Câu hỏi:** ai nên **thấy** các trang dữ liệu tham chiếu cấp công ty — chỉ admin, hay bất kỳ ai có quyền sửa dataset đó? Và ba dataset (market profile · raw material risk overlay · Claims Library) nên nằm chung một mục sidebar hay tách riêng?

**Nếu trả lời khác:** `GLOBAL_NAV` trong `apps/web/src/config/globalNav.tsx` (cờ `adminOnly` phải thành điều kiện đọc `permissionGrid`), và `globalNavFor()` cùng file.

#### R5-Q16 · Gap High — "a controlled action **and due date**": controlled nghĩa là gì, và due date ghi ở đâu 🔴

**Do chủ dự án phát hiện 25/08/2026**, khi thử đúng luồng: đặt Gate 01 `Gap`, chấm `High`, chọn `Proceed with Conditions` — Save khoá kèm câu `Record "Hold" or "Backtrack" instead`. Chặn thì đúng (ba ô control còn trống), nhưng **câu hướng dẫn sai**: nó bảo từ bỏ PwC, trong khi câu 3 nói High *được* mang qua PwC — chỉ là chưa, cho tới khi ghi đủ control. Đã sửa: `GapVerdict` giờ có `missing` tách khỏi `allowed`, nên thông báo nói *"Record a required action, an action owner, the assessor … or choose Hold / Backtrack instead"* và chỉ liệt kê ô **thật sự** còn trống. Đó là bug hiển thị, không phải câu hỏi.

**Câu hỏi thật lộ ra từ đó, hai vế của cùng một câu.** Điều kiện thứ 3 của câu 3 nguyên văn: *"A controlled action **and due date** are recorded."*

1. **"Controlled action" nghĩa là gì ở đây?** Câu 33(c) — cùng vòng, cùng người trả lời — định nghĩa rõ: *"A controlled Next Action is required… Free text may describe the action but must not replace the controlled action record."* Nhưng câu 3 lại liệt kê `Required action` và `Action owner` như **hai trường thường** trong danh sách 8 trường của gap, tức đọc như bản tự-chứa. Hai cách đọc cần hai kiểu dữ liệu khác nhau:
   - **(a) Next Action có kiểm soát** — thêm cột `linkedNextActionId` kiểu `nextActionRef`, đúng như đã làm cho safety finding ở câu 33(c). Due date đến kèm luôn vì Next Action vốn có. Khi đó `gapActionOwner` thành dư.
   - **(b) Trường tự-chứa trên gap** — giữ `gapRequiredAction` + `gapActionOwner`, và thêm **cột thứ 9** cho due date.
2. **Due date ghi ở đâu?** Danh sách 8 trường của chính câu 3 **không có** ô ngày cho action, nên vế "and due date" hôm nay **không được thực thi** — nửa điều kiện. Không đoán: đang thực thi phần có thật và **nói ra trên màn hình** phần chưa có (dòng cảnh báo dưới ô Criticality bảo tạm ghi ngày vào chính nội dung action).

**Vì sao không tự chọn:** hai cách đọc đổi cả data model và cả bề mặt nhập liệu, mà bên nào cũng có căn cứ trong đúng vòng trả lời này. Chọn sai thì phải migrate một cột đã có dữ liệu thật của gap.

**Câu hỏi:** với một gap High, "controlled action" có nghĩa là một **Next Action có kiểm soát** như câu 33(c) đã định nghĩa, hay là hai trường Required action / Action owner ngay trên gap? Và due date của action đó ghi vào đâu?

**Vế phụ, cùng chỗ:** điều kiện thứ 2 — *"the relevant authorised function accepts the risk"* — hôm nay chỉ được thay thế bằng "có tên assessor", vì việc kiểm **thẩm quyền** cần bảng chữ ký per-gate của câu 29 (nhóm 3) mới có nghĩa. Nếu (a) hoặc (b) được chốt trước nhóm 3, vế này vẫn là proxy.

**Nếu trả lời khác:** `HIGH_GAP_CONTROLS` + `missingHighGapControls()` trong `packages/shared/src/utils/gapCriticality.ts` · danh sách trường `gap*` trong `packages/shared/src/types/index.ts` và `GATE_RECORD_FIELDS`/`GATE_FIELD_LABELS` · `GAP_ASSESSMENT_FIELDS` trong `apps/api/src/projects/projects.service.ts` · `apps/web/src/components/GapAssessmentBlock.tsx` · và một migration trên `gate_records`.

#### R5-Q17 · Change Control: trigger có nên giới hạn theo gate dự án đã pass không 🔴

**Phát hiện khi thảo luận UI trang Change Control (26/08/2026).** Trang `/change-control` hiện cho chọn **bất kỳ trigger nào** trong `CHANGE_TRIGGERS`, cho **bất kỳ dự án nào**, không đối chiếu với tiến độ gate thật của dự án đó. Mỗi trigger tự khai `gates` nó ảnh hưởng (ví dụ *"Ingredient percentage or active level changed"* → Gate 05/08) — nhưng không gì ngăn 1 dự án đang ở Gate 02 chọn 1 trigger chỉ liên quan Gate 10 (ASEAN PIF, dossier...), dù ở gate đó dự án chưa từng có quyết định/dữ liệu nào được chốt để mà "change".

**Hướng cần phân biệt rõ trước khi làm, vì đi sai hướng sẽ chặn nhầm đúng use-case đã xác nhận hoạt động:** một dự án **đã qua** Gate 05/08 (ví dụ đang ở Gate 11) mở lại trigger liên quan Gate 05/08 là **hoàn toàn hợp lệ** — đó chính là lý do Change Control tồn tại: sửa formal một quyết định đã khoá ở gate trước (cùng tinh thần B4/`isGateRefLocked` — evidence gate đã pass thì khoá, muốn sửa phải qua quy trình kiểm soát chính thức). Chỉ trigger trỏ tới gate **dự án chưa từng tới** mới là trường hợp vô lý cần chặn.

**Nếu triển khai (chưa build, chỉ ghi lại theo yêu cầu chủ dự án 26/08):** so `trigger.gates` với **gate đã PASS cao nhất** của dự án đang chọn — không phải gate hiện tại đang làm dở, vì dữ liệu còn đang làm dở thì sửa trực tiếp, không cần qua Change Control. Trigger có `gates: ['ALL']` luôn cho phép. Khi chưa chọn Project thì không kiểm gì cả (không có tiến độ nào để so — xem cách field Project vừa được auto-điền theo `activeProjectId` cùng ngày).

**Câu hỏi:** trigger của Change Control có nên bị giới hạn theo tiến độ (gate đã pass) của dự án đang chọn không? Nếu có, ngưỡng đúng là "gate đã pass cao nhất" hay tiêu chí khác? Và nên chặn cứng (disable option trong dropdown, kèm tooltip) hay chỉ cảnh báo mềm, cho phép chọn vẫn được?

**Nếu trả lời khác:** `apps/web/src/pages/ChangeControl.tsx` (`Form.Item name="triggerId"`, `triggerSelectOptions`) — cần đọc `project.gates`/`isGatePassed` của dự án đang chọn (`Form.useWatch('projectId', form)`) để tính gate đã pass cao nhất, rồi lọc/disable option theo đó.
