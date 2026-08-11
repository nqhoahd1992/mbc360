# F1/C7 — Per-Gate Open Questions for the Subject-Matter Team

**Date:** 2026-07-22 (last updated 2026-08-10)

> # ✅ ROUND 3 CLOSED — 20 new questions open (R4-Q1 … R4-Q20)
>
> The subject-matter team answered every question here in their Round 3 reply (`docs/rounds/2026-08-07-sme-reply-round3.txt`), sent as Parts A–E — the questions that reply answers are `docs/rounds/2026-07-31-our-questions-round3.md` (recovered into the folder on 2026-08-11; note its `A1`/`A2`/`A3` are a different three topics from Round 2's). **The answers are recorded in full in `Business_Rules_Confirmation_{EN,VN}.md` → "Appendix 2 (2026-08-07)"** — that appendix, not this file, is the authoritative record. Each section below now carries a short ✅ resolution note pointing at the part of the reply that answers it, so the question and its answer stay together for anyone re-reading the history.
>
> **The Round-3 questions are closed; the file is not.** Twenty new questions — raised *while implementing* those answers and *while designing* the Conditional triggers — are in the final section, **"Round 4"**, each with a stable ID (`R4-Q1` … `R4-Q20`). Everything above that section is settled history.
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

**Bản gửi đi:** [`../rounds/2026-08-09-our-questions-round4.md`](../rounds/2026-08-09-our-questions-round4.md) — viết bằng ngôn ngữ nghiệp vụ, đánh số 1–23, gộp thêm 3 câu còn tồn từ vòng 21/07 (A1 "critical" · A2 Infant pathway · A3 kết thúc version cũ). Cột **Gửi số** dưới đây là cầu nối: khi SME trả lời "5 — option (b)" thì biết ngay nó đóng câu nội bộ nào. Câu **1** trong bản gửi gộp `R4-Q2` với A2 vì hai câu là hai mặt của cùng một lỗ hổng.

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

#### R4-Q16 · Cột `Claim category` sẵn có trên SKU Claims / PIF Register vốn ghi gì 🟡

**Phát sinh khi:** tìm chỗ đặt phân loại claim của B7 — xem [`../plans/Post_Round3_Design_Decisions.md`](../plans/Post_Round3_Design_Decisions.md) → Quyết định 3.

Register **SKU Claims / PIF** (gate 03/10) **đã có sẵn** một cột tên `Claim category`, có từ trước Vòng 3. B7 lại yêu cầu thêm một dropdown cũng tên "Claim category" với 10 giá trị cụ thể.

Nếu hai cái là một, tạo cột thứ hai sẽ sinh ra hai chỗ ghi cùng một thứ — đúng loại trùng lặp mà rồi sẽ lệch nhau. Nếu là hai khái niệm khác nhau, cần đổi tên một trong hai để người dùng không nhầm.

**Câu hỏi:** cột `Claim category` sẵn có trên sổ đó vốn dùng để ghi gì, và nó có phải chính là "Claim category" trong đáp án B7 (Cosmetic · Product performance · Sensory · Ingredient-level · Safety/tolerance · Environmental · Professional/technical · Borderline · Therapeutic — not permitted · Other) không?

**Nếu là một:** mở rộng cột sẵn có thành dropdown 10 giá trị, không tạo cột mới.

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

**(b) Bao nhiêu trong 16 dòng phải hoàn tất thì Gate 2 mới qua.** B6 cho danh sách 16 dòng nhưng không nói cần bao nhiêu. Bắt cả 16 là **bịa ra một quy tắc** — vài dòng thật sự không áp dụng cho một số dự án ("Benchmark or reference product" trên dự án không có benchmark nào). Nên hiện chỉ kiểm **2 dòng**, đúng hai vế mà chính phụ lục gọi tên trong tiêu đề *"requirements **and** exclusions"*: `Must-have product requirements` và `Explicit exclusions`. Các dòng còn lại vẫn hiện trên bảng và vẫn đóng được bằng trạng thái, chỉ là không chặn gate.

**Câu hỏi:** (a) Low / Medium / High / Critical có đúng ý cho Priority không, hay các anh muốn thang khác (ví dụ Must / Should / Could)? (b) Có dòng nào trong 16 dòng **bắt buộc** phải hoàn tất trước khi Gate 2 qua ngoài hai dòng trên không?

**Nếu trả lời khác:** (a) `NEXT_ACTION_PRIORITIES` trong `types/index.ts`, hoặc tách một danh sách riêng cho requirement; (b) thêm/bớt `requirementDone` trong `sg02-requirements` ở `gateReadiness.ts`.

#### R4-Q19 · Hai option list của B1/B2 trình bày dạng bảng checklist, và được chọn nhiều giá trị 🔴

**Đã build 2026-08-10**, thay cho bản 09/08. Đây là câu hỏi về **cách trình bày**, nhưng vế (b) là câu hỏi về **luật**.

B1 đưa 16 option cho Request Origin / Source, B2 đưa 6 option cho loại dự án. Cả hai lần SME chỉ đưa *danh sách*, không nói nó hiện lên như thế nào. Bản 09/08 làm 2 **dropdown một giá trị** trên thẻ Project Identification. Bản 10/08 chuyển thành **2 bảng checklist gate 01** (`checklists['requestOrigin']` · `checklists['projectNature']` trong `config/phases.ts`).

**Vì sao đổi.** Đối chiếu trực tiếp với file `.xlsx` (sheet `PHASE1 G1-3 MKTG`, các ô `A20` · `A35` · `A65` · `A85` · `A109` · `A144`): cả **6** bảng chọn-từ-danh-sách của workbook dùng đúng một shape 7 cột — `Gate │ option │ Select │ Owner/function │ Status Y-N-NA │ Evidence/internal link │ Free-type notes/rationale`, **mỗi option một dòng**. Workbook không dùng dropdown cho danh sách option ở bất kỳ đâu. Dropdown làm mất 4 cột cuối, tức mất chỗ ghi *ai xác nhận option này* và *bằng chứng nào* (ví dụ số ticket của một `Sales request`).

Cần nói rõ một dữ kiện: Gate 01 trong workbook **không có bảng nhập liệu nào** — chỉ 3 dòng Key Gate Check, mọi checklist trong PHASE1 đều tag gate 02/03. Nên hai bảng này là **hai bảng đầu tiên của Gate 01**; chúng không sao chép một tab nào có sẵn, chỉ đi theo shape của 6 bảng anh em.

**Ba thứ chúng tôi tự quyết, không có trong B1/B2:**

**(a) Layout** — bảng option như 6 bảng kia, thay vì dropdown.

**(b) Chọn nhiều giá trị.** Đây là **hệ quả về luật**, không phải thẩm mỹ: shape bảng cho tick nhiều dòng, nên một dự án giờ có thể vừa `Reformulation` vừa `Market extension`. Dropdown cũ ép đúng một giá trị — mà chính việc ép đó cũng là suy đoán, chỉ là suy đoán ngầm, chưa bao giờ được ghi ra. Câu B2 (*"whether it is new development, reformulation, claim change, …"*) đọc theo cả hai cách đều được.

**(c) Cột `Owner / function`.** Workbook có cột này cho cả 6 bảng, và nó phải có giá trị. Không bịa: lấy từ `GATES['SG01'].primaryOwner` = **Project owner / Sales / NPD** cho Request Origin, và **Project owner / NPD** cho Project Nature.

Một hệ quả kỹ thuật đáng ghi: trigger `newOrRepositionedProject` (điều kiện competitor review ở Gate 3) đọc 2 bảng này, nên vế 1 thành `natures.some(...)` — một dự án tick `Packaging change` + `Market extension` sẽ **fire**, vì `Market extension` nằm trong nhóm không-phải-administrative `[ASSUMPTION: R4-Q7]`.

**Câu hỏi:** (a) hai danh sách này nên là bảng option như 6 bảng sẵn có của workbook, hay các anh thực sự muốn một ô chọn nhanh một giá trị? (b) một dự án có được mang **nhiều** loại cùng lúc không (ví dụ vừa cải tiến công thức vừa mở rộng thị trường), hay bắt buộc chọn đúng một? (c) hai giá trị `Owner / function` trên có đúng người chịu trách nhiệm ở Gate 1 không?

**Nếu trả lời khác:** (a)+(b) bỏ 2 section trong `PHASE_1.checklistSections` (`config/phases.ts`), trả `requestOrigin`/`projectNature` về `ProjectIdentity` + cột `projects` (migration `20260810041500_gate1_origin_nature_checklists` là bản mẫu để đảo chiều, gồm cả bước chuyển dữ liệu), đổi `sg01-source`/`sg01-scope` về `identityFieldFilled` trong `gateReadiness.ts`, và sửa `newOrRepositionedProject` trong `gateProgress.ts` về so sánh bằng; (c) sửa `ownerFunction` của 2 section trong `config/phases.ts`.

#### R4-Q20 · Hai item do dev tự thêm đang hard-block gate mà chưa từng được hỏi 🔴

**Phát hiện 2026-08-11 khi rà nhãn `source` trên panel.** Bốn item trong `GATE_READINESS` mang `source: 'dev-decision'` — panel in đúng chữ *"not SME-confirmed"* bên cạnh từng cái — nhưng **không cái nào từng xuất hiện trong bất kỳ vòng nào** gửi SME. Rà lại thì 2 trong 4 là dán nhãn sai và đã sửa (`sg07-restrictions-linked` → `b3`, vì nó đọc một dòng Key Gate Check của workbook y như `sg07-safety-questions`; `sg07-bom-reconciled` → `f-series` mới, vì F14 đã confirm luật này từ 21/07). Còn lại đúng 2 item là quyết định của dev, và cả hai đều **Mandatory**:

**(a) Gate 2 — `sg02-product-type`: "Product type — at least one selected".** Thêm 2026-07-23 theo yêu cầu của project owner. Hôm nay nó chặn cứng quyết định Gate 02 trên mọi dự án. Phụ lục F1 của SME **không** có item này; trong 19 câu vòng 31/07, chữ "Product type" xuất hiện đúng **một lần**, nằm trong phương án **(b)** của B4 (*"the combination of the four Phase 1 checklist sections"*) — mà B4 được trả lời là **(a)**, tức brief là một record riêng, không phải tổ hợp 4 checklist. Nên không thể coi câu trả lời B4 là đã xác nhận item này; nếu có, nó nghiêng về phía ngược lại.

**(b) Gate 7 — `sg07-matrix-rows`: "Formulation safety matrix — every formula ingredient assessed".** Cần tách hai vế: bản thân việc **phải có ít nhất một dòng** là guard kỹ thuật của ta và không cần ai xác nhận (`.every()` trên register rỗng là vacuously true — chính là hạng lỗi S2 tồn tại để bắt). Vế cần xác nhận là **cardinality** mà nhãn item đang khẳng định: matrix phải có một dòng cho **mọi** ingredient trong công thức. Con số đó chưa ai nói.

**Câu hỏi:** (a) Gate 2 có được phép qua khi chưa chọn loại sản phẩm nào không? (b) Ở Gate 7, safety matrix có bắt buộc phủ **mọi** ingredient của công thức, hay chỉ những ingredient thuộc diện cần đánh giá (hoạt chất, chất bảo quản, hương…) — và nếu chỉ một phần thì tiêu chí là gì?

**Nếu trả lời khác:** (a) bỏ `sg02-product-type` khỏi `GATE_READINESS.SG02` trong `gateReadiness.ts`, hoặc hạ `tier` xuống `Supporting`; (b) đổi `sg07-matrix-rows` từ `registerHasRows` sang một check hẹp hơn, hoặc giữ nguyên và sửa `label` cho khỏi khẳng định quá.

**Luật mới để chuyện này không lặp lại:** `npm run verify:readiness` sweep **S4** — item nào mang `source: 'dev-decision'` mà không khai `assumption` trỏ tới một câu hỏi thật thì fail. Nghĩa là từ nay không thể ship một quyết định của dev đang chặn gate mà chưa đưa vào danh sách hỏi.
