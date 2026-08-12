# F1/C7 — Per-Gate Open Questions for the Subject-Matter Team

**Date:** 2026-07-22 (last updated 2026-08-10)

> # ✅ ROUND 3 CLOSED — 24 new questions open (R4-Q1 … R4-Q24)
>
> The subject-matter team answered every question here in their Round 3 reply (`docs/rounds/2026-08-07-sme-reply-round3.txt`), sent as Parts A–E — the questions that reply answers are `docs/rounds/2026-07-31-our-questions-round3.md` (recovered into the folder on 2026-08-11; note its `A1`/`A2`/`A3` are a different three topics from Round 2's). **The answers are recorded in full in `Business_Rules_Confirmation_{EN,VN}.md` → "Appendix 2 (2026-08-07)"** — that appendix, not this file, is the authoritative record. Each section below now carries a short ✅ resolution note pointing at the part of the reply that answers it, so the question and its answer stay together for anyone re-reading the history.
>
> **The Round-3 questions are closed; the file is not.** Twenty-four new questions — raised *while implementing* those answers and *while designing* the Conditional triggers — are in the final section, **"Round 4"**, each with a stable ID (`R4-Q1` … `R4-Q24`). Everything above that section is settled history.
>
> **This file is the only question list.** Other documents (notably `F1_Conditional_Triggers.md`) reference these IDs instead of keeping a parallel list, and every decision site — code and docs alike — carries a grep-able `[ASSUMPTION: R4-Qn]` tag, so "show me every unconfirmed assumption" is a search rather than a manual audit.
>
> Four Round-3 answers **overturn behaviour already built** — the per-gate sign-off (D1), two of the four Published-Information claim rules (D2), the unconditional pregnancy screen at Gate 7 (E1) and the project-level treatment of Gates 10–11 (E3a); see "What this round changes in the application" in Appendix 2 for the consolidated work list.

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

## Round 4 — raised while implementing Round 3 (2026-08-07 → 2026-08-09)

**Everything above this line is closed.** The entries below are new. They follow the standing rule, sharpened by the project owner on 2026-08-09: *do not speculate; speculate only where the signal is overwhelming; and put every speculation on this list for the SME to confirm — kept if confirmed, fixed if not.*

**Conventions for this round:**

- Every entry has a **stable ID** (`R4-Q1` …). This file is the **only** question list; other documents reference these IDs instead of keeping a parallel list of their own.
- The decision site — in code and in docs — carries a grep-able tag `[ASSUMPTION: R4-Qn]`, so "list every unconfirmed assumption" is a search, not a manual audit.
- Each entry ends with **"Nếu trả lời khác thì sửa ở đâu"** naming the file/function, because Round 3 showed that locating a shipped wrong assumption is the slow part.

**Status:** 🔴 = already shipped on this assumption (wrong answer means rework) · 🟡 = designed, not yet built (wrong answer means redesign, no rework).

**Bản gửi đi:** [`../rounds/2026-08-09-our-questions-round4.md`](../rounds/2026-08-09-our-questions-round4.md) — viết bằng ngôn ngữ nghiệp vụ, đánh số 1–32, gộp thêm 3 câu còn tồn từ vòng 21/07 (A1 "critical" · A2 Infant pathway · A3 kết thúc version cũ). Cột **Gửi số** dưới đây là cầu nối: khi SME trả lời "5 — option (b)" thì biết ngay nó đóng câu nội bộ nào. Câu **1** trong bản gửi gộp `R4-Q2` với A2 vì hai câu là hai mặt của cùng một lỗ hổng.

| ID | Chủ đề | Trạng thái | Gửi số |
|---|---|---|---|
| R4-Q1 | Gate 7 — "restricted/caution assessment closed" nghĩa hẹp hay rộng | 🔴 | 5 |
| R4-Q2 | Gate 7 — sản phẩm chỉ cho trẻ sơ sinh hiện không có đánh giá nào | 🔴 | **1** |
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
| R4-Q29 | D3 — "flagged" gồm status nào · giá trị Resolution status · "authorised acceptance" là gì · dòng chưa đánh giá có được PwC gỡ · có áp cho PB Caution Limits | 🔴 | 32 |
| R4-Q28 | D4 — "applicable" gồm nguyên liệu nào · trạng thái "đã cân nhắc, không dùng" · "controlled conditional decision" là PwC hay trường riêng | 🔴 | 31 |
| R4-Q27 | D2 — 4 quyết định trong phần vừa xây (ngưỡng chặn ở release · 3 giá trị so sánh wording · khác biệt nào tính · "material change" chỉ chặn chứ không tự tạo claim mới) + 2 vế chưa có chỗ gắn (artwork approval · external publication) | 🔴 | 30 |

---

### Nhóm 1 — Phát sinh từ bản sửa Gate 7 (đã ship 2026-08-07)

#### R4-Q1 · Gate 7 — "restricted/caution assessment closed" nghĩa hẹp hay rộng 🔴

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

#### R4-Q2 · Gate 7 — sản phẩm chỉ cho trẻ sơ sinh hiện không có đánh giá nào 🔴

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

#### R4-Q3 · Ngưỡng chặn Gate 4 vs Gate 7 của cùng một sổ caution 🔴

`sg04-pb-screen` trước đây là Conditional nên không bao giờ chặn được; nay chặn thật khi trigger maternal active. Ngưỡng của nó **cố ý hẹp hơn** Gate 7:

| Gate | Item | Chặn khi |
|---|---|---|
| 4 | `sg04-pb-screen` | có dòng ở `"Needs Safety Review"` hoặc `"Needs Regulatory Review"` — **không** tính `"Not assessed"` |
| 7 | `sg07-caution-closed` | còn bất kỳ dòng nào ở `"Not assessed"`, `"Exceeds limit - reformulate"`, `"Needs Safety Review"`, `"Needs Regulatory Review"` |

Nghĩa là dự án maternal **không** bị chặn ở Gate 4 ngay ngày đầu; chỉ khi có người thực sự đẩy một dòng lên "cần review". Việc đóng đủ mọi dòng là nhiệm vụ của Gate 7. Cách chia này theo mô hình *Gate 4 sàng lọc — Gate 7 đóng hồ sơ*, nhưng đó là suy luận của chúng tôi, không phải điều phụ lục nói.

**Câu hỏi:** cách chia này có đúng ý không, hay Gate 4 cũng phải đòi mọi dòng được đánh giá trước khi qua?

**Nếu Gate 4 cũng phải đòi đủ:** `gateReadiness.ts` → thêm `'Not assessed'` vào `badValues` của `sg04-pb-screen`.

---

### Nhóm 2 — Ánh xạ trigger sang dữ liệu (mới thiết kế, chưa build)

> Toàn bộ nhóm này đến từ `docs/rules/F1_Conditional_Triggers.md`. A3 cấp **điều kiện** trigger; những câu dưới đây là chỗ chúng tôi phải tự chọn **dữ liệu nào trong app** đại diện cho điều kiện đó. Ánh xạ kiểu này trông như việc cơ học nhưng là diễn giải — đúng loại đã sai hai lần trước đây (`sg01-source`, `sg01-owner`).

#### R4-Q4 · `openChangeControl` — bỏ vế *"or should be opened"* 🟡

**Luật (A3):** *"Mandatory where a Change Control record has been opened **or should be opened** because of the post-market finding."*

Vế thứ hai là phán định của con người — không dữ liệu nào đánh giá được "lẽ ra phải mở". Chúng tôi định **chỉ cài vế thứ nhất** (có record đang mở, theo `isChangeOpen()` của luật F9), còn vế thứ hai để item hiện ra như một lời nhắc khi Gate 12 có ghi nhận post-market finding.

**Câu hỏi:** cắt bớt như vậy có chấp nhận được không? Hay cần một bước xác nhận tường minh kiểu *"đã xem xét và kết luận không cần mở Change Control"* để vế thứ hai cũng được ghi nhận?

**Nếu cần bước xác nhận:** thêm một dòng Key Gate Check ở Gate 12, hoặc một cột trên bảng post-market.

#### R4-Q5 · `humanStudyPlanned` — cái gì đánh dấu "đã dự định làm study" 🟡

**Luật (A3):** *"Mandatory **before** any internal or external study involving human participants…"*

Chữ *"before"* nghĩa là phải bắt được **ý định** làm study, không đợi tới lúc đã duyệt. Ba nguồn có sẵn, chúng tôi chọn nguồn 1:

| Nguồn | Nhận xét |
|---|---|
| ✅ Register **Study Protocol Setup** có `plannedValue` được điền | gần nghĩa "đã có kế hoạch" nhất. Lưu ý register này `mode: 'fixed'`, rows seed sẵn — nên phải kiểm cột có giá trị chứ không phải "có row" |
| ❌ `studyApprovals` có bản ghi | chỉ xuất hiện **sau** khi study tới bước duyệt — muộn hơn chữ "before" |
| ❌ Phase 3 requirement `humanStudy` | chính là cái item này đang kiểm — dùng làm trigger sẽ thành vòng lặp |

**Câu hỏi:** "một nghiên cứu đã được dự định" nên được đánh dấu ở đâu? Nguồn 1 có đúng không, hay các anh muốn một trường tường minh kiểu *"Dự án này có nghiên cứu trên người: Có / Không"*?

**Nếu muốn trường tường minh:** thêm trường vào Phase 3 hoặc `ProjectIdentity`, và `isReadinessTriggerActive()` đọc trường đó.

#### R4-Q6 · Ba trigger Gate 12 ↔ option nào của checklist Post-Market Sources 🟡

Checklist **Post-Market / PV-PMS Feedback Sources** (Gate 12) có 16 option. A3 cấp trigger cho 3 item bằng văn xuôi; chúng tôi tự ánh xạ sang option cụ thể:

| Item | Luật (A3) | Option chúng tôi chọn |
|---|---|---|
| `sg12-performance` | *"product efficacy, consumer experience, product failure or claim performance is part of the post-market review scope"* | `Formula issue` · `Quality issue` · `Product optimisation` · `Claim question` |
| `sg12-feedback` | *"complaint, customer issue, distributor request, claim challenge or recurring performance concern is recorded"* | `Complaint` · `Consumer feedback` · `Distributor feedback` · `Claim question` |
| `sg12-pv-pms` | *"safety signal … complaint trend …"* | `Adverse event / PV signal` · `PMS trend` · `Complaint` |

16 option đầy đủ: `Consumer feedback` · `HCP feedback` · `Distributor feedback` · `Retailer feedback` · `Sales feedback` · `Social media feedback` · `Complaint` · `Adverse event / PV signal` · `PMS trend` · `Claim question` · `Packaging issue` · `Formula issue` · `Quality issue` · `FAQ update` · `CAPA` · `Product optimisation`.

**Câu hỏi:** ba tập option trên có đúng không? Cụ thể: `HCP feedback` / `Retailer feedback` / `Sales feedback` / `Social media feedback` có tính là *"customer issue"* cho `sg12-feedback` không? `CAPA` và `Packaging issue` hiện không thuộc tập nào — có đúng vậy không?

**Nếu ánh xạ sai:** `gateProgress.ts` → `isReadinessTriggerActive()`, sửa danh sách option của trigger tương ứng.

#### R4-Q7 · Gate 3 — "purely administrative change" gồm những loại nào 🟡

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

#### R4-Q8 · Gate 9 — "major reformulation" và "process/site change" đọc từ đâu 🟡

**Luật (A3):** *"Mandatory for new formulas, major reformulations, new manufacturing processes, manufacturing-site transfers, meaningful equipment/process changes, or products with identified scale-up risk."*

Chúng tôi định đọc từ ba nguồn:

| Vế | Nguồn định dùng | Chỗ suy đoán |
|---|---|---|
| new formula / major reformulation | `formulaVersions` + `MAJOR_CHANGE_CRITERIA` (luật F5) | Coi phân loại **Major** của F5 chính là *"major reformulation"* của A3. Hai khái niệm này do hai vòng khác nhau đặt ra — có chắc là một không? |
| site transfer / equipment / process change | `ChangeRecord.affectedArea` | Chưa biết giá trị `affectedArea` nào tính |
| *"identified scale-up risk"* | không có chỗ ghi | Định bỏ qua vế này |

**Câu hỏi:** (a) phân loại Major của F5 có đúng là *"major reformulation"* ở đây không? (b) giá trị `affectedArea` nào tính là chuyển nhà máy / đổi thiết bị / đổi quy trình? (c) *"identified scale-up risk"* cần chỗ ghi riêng, hay bỏ qua được?

**Nếu (a) là không:** cần tiêu chí riêng cho "major reformulation" ở Gate 9, tách khỏi `MAJOR_CHANGE_CRITERIA`.

#### R4-Q9 · Cross-cutting — dữ liệu của trigger *chưa được ghi* thì tính là đã trigger hay chưa 🔴

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

#### R4-Q10 · Gate 12 — mốc "scheduled post-launch review", và "đã launch" khi nhiều thị trường 🟡

**Luật (A1/A3):** `sg12-feedback` *"becomes Conditional where the project has launched and a scheduled post-market review is due"* / *"when the scheduled post-launch review milestone is reached"*.

Hai chỗ không có dữ liệu:

1. **Mốc review là bao lâu sau launch?** App không có lịch/mốc nào. Rẻ nhất là suy từ `MarketTrack.launchApprovedDate` + N tháng, nhưng **N là con số chưa ai đưa** nên chúng tôi không tự đặt.
2. **"Dự án đã launch" khi có nhiều thị trường** nghĩa là **một** thị trường được duyệt launch, hay **mọi** thị trường đang hoạt động? Liên quan trực tiếp tới E3(a).

**Câu hỏi:** (a) mốc post-launch review là bao lâu sau ngày duyệt launch — và có khác nhau theo nhóm sản phẩm hay thị trường không? (b) với dự án nhiều thị trường, "đã launch" tính theo thị trường đầu tiên hay tất cả?

**Nếu là "mọi thị trường":** `isReadinessTriggerActive()` phải đọc toàn bộ `marketTracks`, không chỉ tìm một cái Approved.

#### R4-Q11 · Gate 12 — "product category / market / company policy" nào bắt buộc PV/PMS 🟡

**Luật (A3):** *"Mandatory where required by **product category, market, company policy**, safety signal, vulnerable-user population, complaint trend or scheduled surveillance plan."*

Bốn vế sau đọc được (xem R4-Q6 và cờ vulnerable-user của B5). Ba vế đầu là **danh sách chúng tôi không có**: nhóm sản phẩm nào, thị trường nào, chính sách nào thì bắt buộc PV/PMS.

**Câu hỏi:** xin cho danh sách cụ thể, cùng dạng như A3 đã làm với các trigger khác. Nếu chưa có, chúng tôi sẽ cài trước 4 vế đọc được và ghi 3 vế còn lại là nợ có chủ đích — nói rõ để không bị hiểu là đã phủ hết.

---

### Nhóm 3 — Tier và cách ghi N/A

#### R4-Q12 · Gate 12 — tier của "Product-performance feedback" và "Market feedback" 🟡

A1 nói rõ về hai item: `Change-control links` (Supporting → **Conditional**) và `Market feedback` (Supporting cho review định kỳ, **Conditional** khi đã launch và tới kỳ review). Nhưng A3 lại cấp trigger cho **cả** `Product-performance feedback` — mà item này A1 không nhắc tới, nên trong app nó vẫn là Supporting.

**Vấn đề:** một item Supporting thì trigger **vô nghĩa**, vì Supporting không bao giờ chặn dù trigger có bật hay không. Nên hoặc item đó thực ra là Conditional, hoặc trigger đó chỉ mang tính tham khảo.

**Câu hỏi:** `Product-performance feedback` (Gate 12) là **Supporting** hay **Conditional**? Và `Market feedback` — đúng là một item đổi tier theo trạng thái dự án (Supporting trước launch, Conditional sau), hay nên tách thành hai item riêng?

**Nếu là Conditional:** `gateReadiness.ts` → đổi `tier` của `sg12-performance` (và làm rõ cách biểu diễn cho `sg12-feedback`).

#### R4-Q13 · Ghi N/A kèm lý do có bắt buộc cả khi trigger không kích hoạt? 🟡

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

### Nhóm 4 — Thiết kế lưu trữ có ảnh hưởng nghiệp vụ

#### R4-Q14 · Cờ rủi ro thành phần là thuộc tính của nguyên liệu hay của dự án 🟡

Trigger `rmCompositionRisk` (Gate 4) cần biết nguyên liệu có chứa *fragrance, essential oils, botanical extracts, proteins, known allergens, residual solvents, heavy-metal risk, microbiological risk, restricted impurities, processing residues, variable natural-source composition* hay không — 11 loại, lấy nguyên văn từ A3.

Các cột hiện có (`allergenStatement`, `impurities`, `microInfo`) đều là **free text**, không đánh giá tự động được. Cần một cột multi-select mới.

**Chỗ cần quyết:** cột đó thuộc về **nguyên liệu** (một lần, dùng lại cho mọi dự án) hay thuộc về **dòng evidence trong một dự án** (nhập lại mỗi dự án)?

- Thuộc nguyên liệu thì hợp lý hơn — bản chất một nguyên liệu chứa tinh dầu hay không thì không đổi theo dự án. Nhưng master data nguyên liệu nằm ở **Cosmetri**, và luật A3 gốc nói MBc360 **chỉ đọc**, không ghi.
- Thuộc dự án thì lưu được ngay trong MBc360, nhưng phải nhập lại cho **từng nguyên liệu, từng dự án** — đắt nhất trong toàn bộ danh sách trigger.

**Câu hỏi:** phân loại này nên nằm ở đâu — trong Cosmetri (nếu Cosmetri hỗ trợ và các anh chấp nhận nhập ở đó), hay chấp nhận nhập lại theo từng dự án trong MBc360? Có cách thứ ba là MBc360 giữ một bảng tra riêng theo nguyên liệu, không đồng bộ với Cosmetri — nhưng như vậy sinh ra master data thứ hai, điều luật A3 cố tránh.

**Nếu chọn "trong Cosmetri":** phụ thuộc bên ngoài, cần xác nhận Cosmetri có trường tương ứng — cùng loại phụ thuộc với F12.

#### R4-Q15 · Gate 10/11 — chữ ký 3 vai trò là mỗi thị trường một bộ hay một bộ chung 🟡

**Phát sinh khi:** chốt shape dữ liệu cho D1, xem [`../plans/Post_Round3_Design_Decisions.md`](../plans/Post_Round3_Design_Decisions.md) → Quyết định 1.

D1 nói mỗi gate cần **Prepared / Reviewed / Approved**. E3(a) nói mỗi thị trường có Gate 10 readiness, regulatory approval và launch approval **riêng**. Ghép hai điều đó lại thì Gate 10 và 11 cần **3 chữ ký cho mỗi thị trường** — dự án 4 thị trường là 24 chữ ký chỉ cho hai gate. Có thể đúng (mỗi thị trường là một quyết định pháp lý độc lập), nhưng không câu trả lời nào nói ra.

**Hệ quả thứ hai chưa ai xét:** Gate 10 và 11 nằm trong **Phase 4**, mà sign-off cấp phase (`phase_closures`) không có chiều thị trường. Nếu Gate 10–11 thành per-market thì Phase 4 đóng khi nào?

**Câu hỏi:** (a) ở Gate 10 và 11, bộ Prepared/Reviewed/Approved là mỗi thị trường một bộ hay một bộ chung cho cả gate? (b) Phase 4 đóng khi **mọi** thị trường hoàn tất, hay đóng riêng theo từng thị trường?

**Nếu là per-market:** bảng chữ ký gate cần cột `market` nullable ngay từ đầu (`@@unique([projectId, gateId, market, role])`) — thêm sau khi đã có chữ ký thật là migration trên dữ liệu không được phép sai. Nếu là (b) per-market thì `phase_closures` cũng phải đổi khoá.

**Quyết định của project owner 2026-08-12: D1 CHỜ câu trả lời này rồi mới triển khai** — không đoán khoá rồi migrate chữ ký sau. Nhưng phần "12 item đang xanh trên bằng chứng sai" **không phụ thuộc** câu trả lời (khoá kiểu nào thì `owner + evidenceLink` vẫn không phải chữ ký), nên đã xử lý ngay bằng `coverageNote` trên cả 12 item `sgNN-signoff` — cùng cơ chế đã dùng cho C1. Item **vẫn chặn y như cũ**, không nới không siết; chỉ thôi trình bày Owner + Evidence link như thể đó là bộ ba chữ ký. Khi câu này có đáp án: bỏ `GATE_SIGNOFF_COVERAGE_NOTE` cùng lúc với việc thay `check` của 12 item đó.

#### R4-Q16 · Cột `Claim category` sẵn có trên SKU Claims / PIF Register vốn ghi gì 🟡

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


#### R4-Q17 · Trường Gate 1 để tuỳ chọn lúc tạo dự án, bắt buộc ở Gate 1 🔴

**Đã build 2026-08-09** cùng lúc với B1/B2/B3.

Mọi chỗ ghi mới của Gate 1 — 5 trường trên thẻ Project Identification (người yêu cầu + phòng ban · phạm vi ban đầu · người dùng và thị trường mục tiêu ban đầu) và 2 bảng checklist gate 01 (nguồn yêu cầu · loại dự án, xem `R4-Q19`) — **không** bắt buộc trên form Tạo dự án mới, dù chúng là Mandatory ở Gate 1.

**Lý do:** phụ lục liệt kê chúng là yêu cầu **của Gate 1**, không phải yêu cầu để tạo dự án; và ở giai đoạn cơ hội, vài trường thật sự chưa biết (thị trường ban đầu chẳng hạn). Quan trọng hơn: nếu bắt buộc lúc tạo thì check đọc chúng trở thành **vacuous** — luôn luôn thoả, không bao giờ chặn được. Đó đúng là lỗi `sg01-owner` đã mắc và phải hoàn nguyên: một check đọc trường mà form đã bảo đảm thì chỉ là trang trí.

Đánh đổi: dự án vừa tạo xong sẽ hiện 3 mục chưa đạt ở Gate 1 cho tới khi có người vào điền. Chúng tôi coi đó là đúng — Gate 1 là bước phải làm, không phải bước tự xong.

**Câu hỏi:** có đúng là các trường này thuộc về **Gate 1** chứ không phải điều kiện để mở dự án không? Nếu các anh muốn bắt buộc ngay lúc tạo, chúng tôi sẽ chuyển — nhưng khi đó ba mục Gate 1 tương ứng sẽ luôn xanh và không còn ý nghĩa kiểm soát; lúc đó nên bỏ chúng khỏi danh sách readiness thay vì giữ một mục không bao giờ chặn.

**Nếu trả lời khác:** `ProjectList.tsx` (form tạo dự án) đặt các trường thành bắt buộc, và bỏ 3 item `sg01-source` / `sg01-scope` / `sg01-market-user` khỏi `gateReadiness.ts` hoặc chuyển chúng về chỉ đọc dòng Key Gate Check.

#### R4-Q18 · Bảng requirements Phase 1 — giá trị cột Priority, và bao nhiêu dòng phải xong 🔴

**Đã build 2026-08-09** cùng B6. Hai chỗ B6 không nói, chúng tôi phải tự chọn:

**(a) Giá trị của cột Priority.** B6 yêu cầu bảng có cột `priority` nhưng **không đưa giá trị nào**. Chúng tôi dùng lại đúng danh sách đã được xác nhận ở F8 cho Next Action: **Low / Medium / High / Critical**. Dùng lại một danh sách đã chốt là suy đoán nhẹ hơn nhiều so với bịa ra danh sách mới, nhưng vẫn là suy đoán.

**(b) Bao nhiêu trong 16 dòng phải hoàn tất thì Gate 2 mới qua.** B6 cho danh sách 16 dòng nhưng không nói cần bao nhiêu. Bắt cả 16 là **bịa ra một quy tắc** — vài dòng thật sự không áp dụng cho một số dự án ("Benchmark or reference product" trên dự án không có benchmark nào). Các dòng còn lại vẫn hiện trên bảng và vẫn đóng được bằng trạng thái, chỉ là không chặn gate.

Bản 09/08 kiểm **2 dòng**, theo hai vế trong chính tiêu đề của phụ lục (*"requirements **and** exclusions"*): `Must-have product requirements` và `Explicit exclusions`.

⚠️ **Sửa 2026-08-11 (project owner phản biện: "đâu phải dự án nào cũng có Explicit exclusions").** Đúng, và lý lẽ biện minh viết trong config lúc đó — *"WorkStatus đã cho phép đóng dòng không áp dụng"* — **là sai sự thật**: `WorkStatus` chỉ có `Not Started / In Progress / Completed / On Hold / Backtracked`, **không có N/A**, khác hẳn `GateCheck.ynna` và `ChecklistItem.status` vốn có Y/N/NA kèm lý do. Mà `requirementDone` chỉ chấp nhận đúng `Completed`. Nên dự án không có exclusion nào chỉ còn hai đường, đều sai: đánh `Completed` cho việc không tồn tại, hoặc bị chặn Gate 02 vĩnh viễn.

`docs/archive/F1_Gate_Readiness_Mapping_Proposal.md` đã ghi sẵn quy tắc này từ trước — *"`requirementDone` chỉ hard-block trên dòng **universally applicable** ở gate đó"* — và dòng exclusions vi phạm nó. Nay chỉ còn kiểm **1 dòng**: `Must-have product requirements`, thứ mọi dự án đều có theo định nghĩa.

**Khoảng trống nền vẫn còn, ghi nhận chứ không lách:** dòng requirement **không có** cách đóng "không áp dụng, kèm lý do". Nếu SME muốn `Explicit exclusions` (hay dòng nào khác không phổ quát) là bắt buộc, việc cần làm là **thêm đường N/A + lý do cho requirement row** rồi mới bật check — chứ không phải bắt người dùng đánh `Completed` cho một ô trống.

**Câu hỏi:** (a) Low / Medium / High / Critical có đúng ý cho Priority không, hay các anh muốn thang khác (ví dụ Must / Should / Could)? (b) ngoài `Must-have product requirements`, còn dòng nào **bắt buộc** phải hoàn tất trước khi Gate 2 qua không — và nếu có dòng không áp dụng cho một dự án cụ thể, các anh muốn đóng nó bằng cách nào (hiện chưa có trạng thái "N/A kèm lý do" cho bảng này)?

**Nếu trả lời khác:** (a) `NEXT_ACTION_PRIORITIES` trong `types/index.ts`, hoặc tách một danh sách riêng cho requirement; (b) thêm/bớt `requirementDone` trong `sg02-requirements` ở `gateReadiness.ts`.

#### R4-Q19 · Hai option list của B1/B2 trình bày dạng bảng checklist, và được chọn nhiều giá trị 🔴

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

Một hệ quả kỹ thuật đáng ghi: trigger `newOrRepositionedProject` (điều kiện competitor review ở Gate 3) đọc 2 bảng này, nên vế 1 thành `natures.some(...)` — một dự án tick `Packaging change` + `Market extension` sẽ **fire**, vì `Market extension` nằm trong nhóm không-phải-administrative `[ASSUMPTION: R4-Q7]`.

**(d) Tên của bảng thứ hai — chữ của ta, không phải của SME (thêm 2026-08-11, project owner phát hiện).** B1 cho hẳn tên field (*"Please add the field: **Request Origin / Source**"*) nên bảng thứ nhất mang đúng tên SME viết. B2 **không cho tên nào** — nó là một mệnh đề (*"whether it is new development, reformulation, claim change, packaging change, market extension or lifecycle improvement"*) — nên tiêu đề buộc phải do ta đặt. Bản 10/08 đặt là **`Project Nature`**; kiểm lại thì chữ *"nature"* **không có trong bất kỳ phản hồi nào của SME** và trong toàn workbook chỉ xuất hiện ở *"de**nature**d alcohol"*. Tức hai bảng mới đứng cạnh nhau, một cái tên nguyên văn của SME, một cái ta bịa.

Đổi thành **`Development / Change Type`** (11/08): mọi chữ đều lấy từ chính mệnh đề B2 (*new **development** … packaging **change**, claim **change***), cộng "Type" lặp mẫu tiêu đề `PRODUCT TYPE` của bảng anh em; và đối chiếu quy ước đặt tên của 6 bảng workbook (`TARGET AREA OF BODY` · `PRODUCT TYPE` · `TARGET USERS / LIFE STAGE` · `TARGET COUNTRIES / MARKETS` · `CLAIM / BENEFIT AREAS` · `INITIAL EVIDENCE / PROOF ROUTE` — cụm danh từ, lựa chọn nối bằng `/`). Cân nhắc và loại `Project Type` vì dễ nhầm với bảng `Product Type` gate 02 nằm ngay dưới. **Vẫn là chữ của ta**, nên phải hỏi. `key`/`sectionKey` giữ nguyên `projectNature` (định danh nội bộ, đổi thì phải migrate dữ liệu mà người dùng không thấy gì).

**(e) Chỗ đặt 5 field free-text của B1/B2/B3 (thêm 2026-08-11).** Requester name · Requester department · Initial product scope · Initial target user / life-stage · Initial target market(s) hiện nằm trong một khối phụ **"Opportunity & Request (Gate 01)"** ta tự thêm ngay dưới bảng PROJECT IDENTIFICATION. Đây là **lựa chọn bố cục của ta**, không có tiền lệ trong workbook.

⚠️ **Đính chính một bằng chứng đã dùng sai:** trước 11/08 chỗ này được biện minh bằng nhận định *"khối PROJECT IDENTIFICATION của workbook để trống 5 slot parameter bên phải, ta chỉ điền vào"*. **Nhận định đó sai.** Khối đó có đủ 10 nhãn (`A8:A12` Project ID → Brand / Customer; `D8:D12` Date opened · Target launch date · Product / SKU · Owner / Department · Countries / Markets), khớp 1:1 với 10 dòng app đang hiển thị, **không còn slot trống nào**. Sai vì lỗi script đọc `.xlsx`: ô rỗng ghi dạng tự đóng `<c r="B8" s="24"/>`, regex chỉ khớp `<c …>…</c>` nên nuốt ô rỗng vào ô kế tiếp và gán giá trị của `D8` cho `B8`. Đã sửa script; các kết luận khác từ script đó (shape 7 cột của 6 bảng, `Owner / function` đều 2 tên, `Stage_Map!F8`, Gate 01 không có bảng nhập liệu) đã kiểm lại và vẫn đúng.

**Câu hỏi:** (a) hai danh sách này nên là bảng option như 6 bảng sẵn có của workbook, hay các anh thực sự muốn một ô chọn nhanh một giá trị? (b) một dự án có được mang **nhiều** loại cùng lúc không (ví dụ vừa cải tiến công thức vừa mở rộng thị trường), hay bắt buộc chọn đúng một? (c) hai giá trị `Owner / function` trên có đúng người chịu trách nhiệm ở Gate 1 không? (d) tên bảng thứ hai nên là gì — `Development / Change Type` như ta đang tạm dùng, hay tên các anh muốn (như B1 đã cho tên "Request Origin / Source")? (e) 5 field free-text nên nằm ở đâu — một khối riêng dưới Project Identification như hiện nay, hay các anh muốn chúng thành parameter của chính bảng PROJECT IDENTIFICATION?

**Nếu trả lời khác:** (a)+(b) bỏ 2 section trong `PHASE_1.checklistSections` (`config/phases.ts`), trả `requestOrigin`/`projectNature` về `ProjectIdentity` + cột `projects` (migration `20260810041500_gate1_origin_nature_checklists` là bản mẫu để đảo chiều, gồm cả bước chuyển dữ liệu), đổi `sg01-source`/`sg01-scope` về `identityFieldFilled` trong `gateReadiness.ts`, và sửa `newOrRepositionedProject` trong `gateProgress.ts` về so sánh bằng; (c) sửa `ownerFunction` của 2 section trong `config/phases.ts`.

#### R4-Q20 · Hai item do dev tự thêm đang hard-block gate mà chưa từng được hỏi 🔴

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

#### R4-Q21 · `initialTargetMarkets` trùng với `Countries / Markets` đã bắt buộc lúc tạo dự án — và B3 được trả lời trên tiền đề ta nêu sai 🔴

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

#### R4-Q22 · Map option Target Users (Gate 02) sang Vulnerable group — mức chắc chắn không đều 🔴

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

#### R4-Q23 · Sổ Claim → Evidence Traceability thuộc gate nào (quyết định lúc nào nó khoá) 🔴

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

#### R4-Q24 · C1 — bằng chứng nào chứng minh "đã Regulatory review", và 4/7 điều kiện chưa kiểm được 🔴

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

#### R4-Q25 · Claims Library nằm ở cấp nào — và dự án tham chiếu tới nó ra sao 🔴

**Chưa build gì cả.** Đây là câu hỏi hỏi **trước khi** build, khác với R4-Q20…R4-Q24 (đều là thứ đã ship rồi mới đi xác nhận). Nêu ra 2026-08-12 sau khi project owner hỏi *"Claims Library mục đích để làm gì, workbook có phần này chưa"*.

**Đã kiểm, không phải phỏng đoán:** giải nén danh sách sheet của **cả hai** workbook (`MBc360 Master Product Development System File.xlsx` và bản `v2`) — **không có tab nào là Claims Library**. Bốn tab dính chữ "claim" đều ở cấp dự án: `George-Mechanism_Claims`, `George-Twinkle5_Claims`, `ChiChu-SKU_Claims_PIF`, `4. Evidence & Claim Support`. Chúng ghi *sản phẩm này nói gì*, không ghi *công ty được phép nói gì*.

**Cách đọc của ta:** Claims Library ở **cấp công ty**, đứng trên mọi dự án — một bộ từ vựng đã duyệt mà mọi dự án tra vào, không dự án nào sở hữu. Hai căn cứ: (1) chính C1 viết *"wording is **not in** the approved Claims Library"* — một phép đối chiếu với thứ nằm **ngoài** dự án; (2) workbook là hồ sơ của **một** dự án, nên về nguyên tắc không chứa được thư viện dùng chung — thiếu ở đây là thiếu thật, không phải ta bỏ sót khi số hoá.

**Phần SME đã nói rồi, không cần hỏi lại:** F11 (21/07) cấp đủ **8 trường** mỗi entry (approved term · prohibited alternatives · required evidence type · applicable products · applicable markets · approved context/channel · limitations/qualifiers · owner) và nói **Technical + Regulatory cùng duy trì**. Nên câu hỏi này **chỉ về cấp lưu trữ và cách tham chiếu**, không hỏi lại hình dạng entry.

**Vì sao cấp lưu trữ quyết định kiến trúc:** không dựng được bằng `RegisterConfig` như ~30 sổ còn lại. Register được **scaffold cho từng dự án** lúc tạo project (`store/factory.ts` + `project-scaffold.ts`), tức mỗi dự án một bản sao — sai hoàn toàn với thứ phải là **một** danh sách dùng chung. Phải là bảng Prisma toàn cục + trang admin riêng, gần `admin-users.controller.ts` hơn là gần `registers.ts`. Xây nhầm cấp thì không sửa được bằng đổi config.

**Câu hỏi:** (a) cấp công ty như ta đọc, hay theo brand / thị trường / product family? (b) claim của dự án có **bắt buộc trỏ tới một entry** không — nếu có thì *"không nằm trong library"* là dữ kiện máy biết, nếu không thì nó vẫn là phán định của người review và vế C1 này **không bao giờ tự động hoá được**; (c) ai được thêm/sửa entry, entry có quy trình duyệt riêng không, *"cùng duy trì"* có nghĩa cả hai phải đồng ý từng entry? (d) claim được duyệt trên một dự án với wording chưa có trong library thì có **đẩy ngược** vào library cho dự án sau dùng lại không? (e) entry bị sửa/thu hồi sau đó thì các claim đã duyệt từ nó trên sản phẩm **đang bán** xử lý thế nào — bật cờ review lại được, nhưng đó là quyết định có hệ quả thương mại, ta không tự đặt.

**Liên đới:** (b) quyết định vế *"not in the approved Claims Library"* của C1 có bao giờ rời khỏi `UNEVALUATED_C1_CONDITIONS` hay không. Câu (e) của `R4-Q24` (*"previously approved"* là của claim này hay của dự án khác) nếu trả lời là "dự án khác" thì cũng chỉ library mới trả lời được — lúc đó hai câu nhập làm một.

**Nếu trả lời khác:** chưa có code nào để sửa — đó là lý do hỏi trước. Nơi sẽ chịu ảnh hưởng: bảng Prisma mới + trang admin (nếu cấp công ty) **hoặc** một `RegisterConfig` mới trong `packages/shared/src/config/registers.ts` (nếu hoá ra là per-project); và `UNEVALUATED_C1_CONDITIONS` trong `packages/shared/src/config/claimReview.ts` bớt một vế nếu (b) là "bắt buộc trỏ".

#### R4-Q26 · D1 — 5 điểm đặc tả chữ ký gate chưa nói tới 🔴

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

#### R4-Q27 · D2 — 4 quyết định trong phần vừa xây, và 2 vế chưa có chỗ gắn 🔴

**Đã build 2026-08-12** sau khi project owner rà D2 và yêu cầu *"sửa cả các vấn đề trong D2"*. Trước đó **1 trong 4 quy tắc** của D2 được thực hiện, và **1 quy tắc đang chạy ngược đặc tả**.

**Hai hành vi D2 bác bỏ, nay đã bỏ:**

1. **Khoá wording tuyệt đối.** `exactWording` bị auto-fill rồi **lock** từ claim, và `save()` **ghi đè** lại mỗi lần lưu. D2: *"Do not enforce an absolute character-for-character lock across every channel."* Trên thực tế còn tệ hơn một cái lock: muốn rút gọn câu cho caption mạng xã hội thì chỉ còn cách sửa chính claim gốc — tức để một bài đăng viết lại wording đã duyệt của toàn dự án. Nay: cột `masterWording` (**read-only**, do API ghi từ claim) đứng cạnh `exactWording` (sửa tự do, nhãn mới *"Proposed wording as published"*); khác nhau thì phải có `wordingEquivalence` + `equivalenceConfirmedBy` + `equivalenceConfirmedDate` mới release được.
2. **Claim ID trống = "dòng này không claim gì".** `claimEvidence.ts` đọc trống là miễn trừ, nên **mọi dòng thoát toàn bộ luật bằng cách không điền gì** — ngoại lệ hẹp của D2 đang là mặc định của phần mềm. Nay trống chỉ được release khi tick `noProductClaim`, và `noProductClaimBy` do **server đóng dấu** từ session.

**Một cơ chế mới, cố ý chỉ là cảnh báo:** `wordingSimilarity()` (Jaccard trên từ) hiện % trùng từ. **Không chỗ nào rẽ nhánh theo con số này** — D2 nói rõ *"similarity checking may be used as a warning, but final equivalence must be confirmed by an authorised reviewer"*.

**Bốn quyết định của dev [ASSUMPTION: R4-Q27]:**

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

#### R4-Q28 · D4 — "applicable" gồm những nguyên liệu nào, và "controlled conditional decision" là gì 🔴

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

#### R4-Q29 · D3 — "flagged" gồm status nào, giá trị Resolution status, và "authorised acceptance" là gì 🔴

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

**Câu hỏi:** (a) "flagged" có gồm `Needs Regulatory Review` không, hay chỉ `REVIEW - possible formula match`? (b) `Resolution status` gồm những giá trị nào? (c) *"authorised acceptance"* là gì — cùng cơ chế acknowledge của F9, một phép kiểm quyền riêng, hay ghi PwC là đủ? (d) dòng flagged **chưa ai đánh giá** thì PwC có gỡ được không (ta đang chặn)? (e) `PB_Caution_Limits` — watch-list thứ hai — có cần cùng bộ 7 trường không? D3 viết *"each flagged watch-list result"* nhưng tiêu đề chỉ nói possible formula match.

**Không cần migration:** `prohibitedIngredients` là `mode:'fixed'` — thêm **cột** không đổi số dòng, và 12 dòng seed đều ở `No formula match recorded` nên **không dòng nào flagged** trên dự án mới → check tự thoả, không chặn oan (đúng chiều S3 muốn).

**Nếu trả lời khác:** `WATCHLIST_*` trong `packages/shared/src/config/registers.ts`; 5 hàm trong `packages/shared/src/utils/watchlistReview.ts`; 2 item `sg04-watchlist-*`.
