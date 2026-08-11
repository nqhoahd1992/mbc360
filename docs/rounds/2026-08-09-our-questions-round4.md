# MBc360 — Follow-up questions, Round 4

**Date:** 2026-08-09
**For:** the subject-matter team (NPD / Quality / Regulatory / Safety)

Thank you for the Round 3 answers. They were detailed enough to act on immediately, and most of the work is now mechanical. Two of the corrections you gave us are already built and live; the rest are in progress.

This round has twenty-three questions in total. **Three are outstanding from 21 July and have now become urgent** — one of them is a safety gap we want to report to you plainly rather than leave in a document.

You can reply by number, for example "1 — option (b)". Anything you leave unanswered stays in its current state and we will re-raise it.

## What we need most, in order

1. **Question 1** — a safety gap that is open right now. It cannot be closed without content from you.
2. **Questions 2–4** — the three items from 21 July that are still open, two of which now block work we are ready to start.
3. **Questions 5–7** — decisions we have already built on our own reading of your Round 3 answer. If we read you wrongly, these need rework, so we would rather know early.
4. **Questions 8–19** — designed but not yet built. A wrong answer here costs a redesign, not rework.
5. **Questions 20–23** — choices we made while building the Gate 1 and Gate 2 fields you asked for, and two requirements we added ourselves.

---

## Question 1 — Infant-only products currently receive no Gate 7 safety assessment

**This is the one item in this list we would ask you to answer even if you answer nothing else.**

In Round 3 (E1) you corrected our reading of Gate 7: the pregnancy/breastfeeding assessment is **not** unconditional, it applies when Pregnancy, Breastfeeding or Postpartum is selected — and *"infant-only products should trigger the Infant/Baby Safety pathway instead."*

We have made the first half of that change, and it was necessary: before it, **every** project — including a plain adult face serum — was blocked at Gate 7 until someone worked through all twelve rows of the maternal caution list, including rows that could not possibly apply.

The second half we cannot make, because the Infant & Baby Safety pathway does not exist yet. Its content is question **A2 from our 21 July list**, which has not been answered. You confirmed in an earlier round that "Infant 0+" activates a dedicated infant safety workflow separate from Skincare for Two, and you listed the topics it should cover — but we have never received the workflow itself.

**The consequence today, stated plainly:** a product intended **only** for infants, with no maternal user selected, passes Gate 7 without either assessment. The maternal screen no longer applies to it, and the infant pathway it is supposed to be routed to does not exist.

We want to be clear this was a choice between two wrong states, not an oversight. The alternative was to keep blocking every general-adult project on a maternal caution list, which your own answer rejects. We chose the state that does not obstruct correct work, and are reporting the gap rather than leaving it hidden.

**Question:** can you supply the Infant & Baby Safety assessment content — the items it must cover, the evidence required for each, and the gate at which it must be complete? If that will take time, please tell us what an infant-only product should be blocked on in the meantime, and we will wire that as a temporary measure.

---

## Questions 2–4 — Still open from 21 July

### Question 2 — What formally ends an older formula version?

You confirmed that two formula versions can be on the market at the same time during a transition, and Round 3 (E3a) confirmed each market carries its own applicable formula and artwork version. What is still undefined is the **end** of that transition: does the old version close because someone records a deliberate "superseded" decision, or automatically when the new version receives its launch approval in that market?

This matters before we build the per-market tracking, because it decides whether "superseded" is an action a person takes or a state the system infers.

### Question 3 — The definition of "critical"

Several of your rules branch on whether something is *safety-critical, regulatory-critical or release-critical*. Round 3 gave us a concrete mechanism in three places — the reviewer assessment on watch-list findings, the critical safety finding record, and the impact classification of an open change control. In each of those, "critical" is a **named reviewer's recorded judgement**, not a predefined list, which we take as your answer to the general question.

One place still has no equivalent: your rule that a **critical gap** must go to Hold, Backtrack or Reject rather than Proceed with Conditions. There is nothing on a gap that records whether it is critical.

**Question:** should a gap carry its own criticality assessment, recorded by a named reviewer in the same way as the watch-list and safety-finding assessments? Or is the gap's criticality meant to be judged in the moment by whoever records the gate decision, with no separate field?

### Question 4 — Which product categories, markets or policies require PV/PMS?

Your Round 3 trigger for the post-market safety review reads: *"required by product category, market, company policy, safety signal, vulnerable-user population, complaint trend or scheduled surveillance plan."*

We can evaluate the last four. The first three need a list from you — which product categories, which markets, and which company policies make this review mandatory. Without it, we will enforce the four we can and record the other three as a known limitation rather than pretend the item is fully covered.

---

## Questions 5–7 — Already built on our reading of Round 3

### Question 5 — At Gate 7, does "restricted/caution assessment closed" mean pregnancy specifically, or all restricted ingredients?

Your Gate 7 list includes both *"prohibited screen closed"* and *"restricted/caution assessment closed"*. In our system, the second one is currently checked against the **Pregnancy / Breastfeeding Caution Limits** list — which is why it was blocking every project, and why we changed it to apply only to maternal products.

Reading your wording again, *"restricted/caution assessment closed"* could mean something broader than pregnancy: a general check that every restricted or caution-listed ingredient has been assessed, whichever product it is. If that is what you meant, our change has removed cover we should have kept, and the correct fix is a separate general assessment with the pregnancy one layered on top.

**Question:** does this item mean **(a)** the pregnancy and breastfeeding caution assessment specifically, or **(b)** a general restricted-and-caution ingredient assessment that applies to every product, with pregnancy as an additional conditional layer?

### Question 6 — At Gate 4, should the caution list block only when someone has escalated a row?

For a maternal product, the same caution list is now checked at two gates, deliberately at different strengths:

| Gate | Blocks when |
|---|---|
| **Gate 4** (ingredient screening) | someone has marked a row *"Needs Safety Review"* or *"Needs Regulatory Review"* |
| **Gate 7** (safety review) | any row is still unassessed, over limit, or awaiting review |

In other words, Gate 4 asks *"did screening surface a problem?"* and Gate 7 asks *"is every caution ingredient formally closed out?"* — so a maternal project is not blocked at Gate 4 on day one, only once a reviewer has actually raised something.

**Question:** is that split what you intended, or should Gate 4 also require every row to be assessed before it can pass?

### Question 7 — When the information a condition depends on has not been recorded yet, does the condition apply?

Your Round 3 answer (B7) gives each claim a risk level: Low, Medium, High, Prohibited, or **Pending classification**. Your review trigger names High risk, borderline and therapeutic-adjacent categories, but does not say what happens to a claim still marked Pending.

We have assumed **Pending counts as requiring review** — if the risk has not been assessed yet, we cannot know it is low.

This is not only about claims. The same question has just come up in a second place, which is why we are asking it as one policy rather than two cases.

A conditional item only blocks when its condition applies. But when **nobody has recorded the information the condition depends on**, the system currently reads that as "the condition does not apply", and the item passes on its own. In other words, *not yet assessed* is being treated the same as *assessed and found not to apply*.

| Item | Depends on | Today, when nothing has been recorded |
|---|---|---|
| Gate 5 preservative strategy, Gate 9 preservative efficacy | whether the formula is microbiologically susceptible | both pass automatically |
| Gate 3 regulatory review of claims | the claim's risk level | the same, once claim classification is built |

**Question:** when that information has not been recorded, should the item **(a)** pass automatically, as it does now; or **(b)** be treated as applying — on the basis that "we have not checked" is not the same as "it does not apply"?

We lean towards (b) for the safety-related ones, since not knowing is not the same as being safe. But (b) means every new project is blocked at Gate 5 until someone classifies the formula — an extra required step — so it is your call rather than ours.

---

## Questions 8–19 — Designed, not yet built

These are all the same kind of question: your Round 3 answer gives the **condition**, and we have had to choose **which record in the system represents it**. That choice looks mechanical but is interpretation, and twice before we have got exactly this kind of mapping wrong, so we are asking rather than assuming.

### Question 8 — A change control that "should be opened"

Your trigger reads: *"where a Change Control record has been opened **or should be opened** because of the post-market finding."*

The first half we can evaluate. The second half is a judgement no system can make — nothing tells us a record *ought* to exist. We plan to enforce the first half, and show the second as a reminder rather than a block.

**Question:** is that acceptable, or would you rather have an explicit step — *"reviewed, and no change control is required"* — so the judgement is recorded either way?

### Question 9 — What marks a study as planned?

Your trigger requires the human-study approval workflow to be complete **before** any study involving participants. To enforce "before", we need to know when a study first becomes intended.

We plan to treat the **Study Protocol** record as that signal: as soon as someone begins filling it in, the approval workflow becomes mandatory. The alternative — waiting until approvals are recorded — is too late to be a "before" check.

**Question:** is the Study Protocol record the right signal, or would you prefer an explicit field, *"this project involves a human study: Yes / No"*?

### Question 10 — Which feedback sources drive which post-market item?

The Post-Market feedback list has sixteen options. Your Round 3 answer gives three different triggers in prose, and we have mapped each to a set of those options:

| Item | Options we mapped to it |
|---|---|
| Product-performance feedback | Formula issue · Quality issue · Product optimisation · Claim question |
| Market feedback | Complaint · Consumer feedback · Distributor feedback · Claim question |
| PV / PMS review | Adverse event or PV signal · PMS trend · Complaint |

The full list, for reference: Consumer feedback · HCP feedback · Distributor feedback · Retailer feedback · Sales feedback · Social media feedback · Complaint · Adverse event or PV signal · PMS trend · Claim question · Packaging issue · Formula issue · Quality issue · FAQ update · CAPA · Product optimisation.

**Question:** are those three groupings right? In particular: do HCP, retailer, sales or social-media feedback count as a "customer issue" for market feedback? And **CAPA** and **Packaging issue** currently belong to none of the three — is that correct?

### Question 11 — Which project types are a "purely administrative change"?

Your competitor-review trigger is mandatory for a new product, claim extension, repositioning, or a customer/distributor-led request — but *"not mandatory for a purely administrative change."*

The project record will classify each project as one of: new development · reformulation · claim change · packaging change · market extension · lifecycle improvement. Your answer does not say which of these are administrative. We have provisionally treated packaging change and lifecycle improvement as exempt, and are unsure about reformulation.

**Question:** which of those six count as a purely administrative change?

### Question 12 — What counts as a "major reformulation" at Gate 9, and which changes count as process changes?

Your scale-up trigger covers *"new formulas, major reformulations, new manufacturing processes, manufacturing-site transfers, meaningful equipment/process changes, or products with identified scale-up risk."*

Three points:

- We already have a Major/Minor classification of formula changes, from the criteria you confirmed earlier. We plan to treat a **Major** change as a "major reformulation" here. These were defined in two different rounds for two different purposes, so we want to confirm they mean the same thing.
- For site transfers and equipment changes, we plan to read the **affected area** recorded on the change control record. Which values should count?
- *"Identified scale-up risk"* has nowhere to be recorded. Should it have its own field, or is it covered by the items above?

### Question 13 — When is the scheduled post-launch review due?

Your trigger says market feedback becomes mandatory *"when the scheduled post-launch review milestone is reached."* We have no schedule anywhere in the system. The simplest approach is to count a fixed period from the launch approval date — but you have not given that period, and we do not want to invent one.

**Question:** how long after launch approval is the first post-market review due, and does that differ by product category or market?

### Question 14 — For a multi-market project, when has it "launched"?

Related to the above: your trigger refers to *"the project has launched"*. With several markets, does that mean the first market receives launch approval, or all active markets? Your Round 3 answer that one approved market must not make all markets look ready suggests the stricter reading, but the two rules serve different purposes and we would rather ask.

### Question 15 — Is "Product-performance feedback" Supporting or Conditional?

Your Round 3 answer moved *Change-control links* from Supporting to Conditional, and said *Market feedback* becomes Conditional once the project has launched. But you also gave a trigger for *Product-performance feedback*, which is still classified Supporting.

A Supporting item never blocks a gate, whichever way its trigger goes — so a trigger on a Supporting item has no effect. Either the classification should change, or the trigger is guidance only.

**Question:** should Product-performance feedback be Conditional? And for Market feedback — is it genuinely one item whose classification changes with the project's stage, or would you rather have two separate items?

### Question 16 — Does "N/A with rationale" still apply when an item is not triggered?

Three of your answers ask for N/A to be recorded **with a rationale**: the preservative strategy for anhydrous products, market-specific pack requirements where none apply, and the Gate 7 assessment for general products.

This sits awkwardly with how conditional items now behave. When a condition does not apply, the system marks the item satisfied automatically and states the reason — for example *"not applicable: no pregnancy, breastfeeding or postpartum user selected."* Nobody has to do anything.

If you want a rationale written by a person, then "not triggered" no longer means "nothing to do" — there is still a step, and we need to build a place for it.

**Question:** when a condition genuinely does not apply, is the system's own recorded explanation sufficient? Or does a named person still need to record N/A with their own rationale?

### Question 17 — Where should the ingredient composition-risk flag live?

Your allergen and impurity trigger applies where a raw material contains fragrance, essential oils, botanical extracts, proteins, known allergens, residual solvents, heavy-metal risk, microbiological risk, restricted impurities, processing residues, or variable natural-source composition.

To act on that, someone has to classify each raw material against those eleven categories. The question is where that classification belongs:

- **On the raw material itself**, recorded once and reused by every project — which is the logically correct home, since whether a material contains essential oils does not change from project to project. But raw material master data lives in Cosmetri, and you confirmed MBc360 reads from it without writing back.
- **On the project's own supplier and raw-material evidence record**, which we can store immediately — but it must then be re-entered for every material on every project. This is the most repetitive data-entry burden in anything discussed so far.

**Question:** should this classification be captured in Cosmetri, or accepted as per-project entry in MBc360? A third option is for MBc360 to keep its own raw-material reference table, but that creates a second master list, which the read-only decision was designed to avoid.

### Question 18 — At Gates 10 and 11, is the sign-off per market or per gate?

You told us in Round 3 that each gate needs Prepared, Reviewed and Approved sign-offs, and separately that Gates 10 and 11 operate per market, each with its own regulatory and launch approval.

Put together, that implies Gates 10 and 11 need **three signatures for every market** — a project selling into four markets would carry twenty-four signatures across those two gates alone. That may well be right, since each market is an independent regulatory decision. But neither answer says so directly, and it is not the kind of thing to assume.

There is a second consequence nobody has raised yet. Gates 10 and 11 sit inside **Phase 4**, and the phase closure sign-off has no market dimension at all.

**Question:** (a) at Gates 10 and 11, is the Prepared/Reviewed/Approved set recorded once per market, or once for the gate as a whole? (b) Does Phase 4 close when **all** markets are complete, or does it close separately for each market?

### Question 19 — What does the existing "Claim category" column record?

The SKU Claims / PIF register already has a column called **Claim category**, in use before this round. Your Round 3 answer (B7) asks us to add a per-claim classification dropdown, also called Claim category, with ten specific values.

If these are the same thing, adding a second column would create two places recording one fact — which will eventually disagree. If they are different concepts, one of them should be renamed so users are not misled.

**Question:** what does the existing Claim category column record, and is it the same as the Claim category in your B7 answer (Cosmetic · Product performance · Sensory · Ingredient-level · Safety/tolerance · Environmental or sustainability · Professional or technical information · Borderline / therapeutic-adjacent · Therapeutic — not permitted · Other)?

---

## Question 20 — Are the Gate 1 fields required to open a project, or required to pass Gate 1?

We have built the fields you asked for in B1, B2 and B3 — request origin, requester, project nature, initial scope, and the preliminary target user and markets.

We made them **optional when a project is first created**, and mandatory only for Gate 1 to pass. Two reasons: your appendix lists them as Gate 1 requirements rather than creation requirements, and at the opportunity stage some genuinely are not known yet.

There is also a mechanical reason worth stating, because it has bitten us before. If a field is mandatory on the creation form, then a Gate 1 check that reads it is always satisfied — it can never block anything, and becomes decoration. We made exactly that mistake earlier with the project owner field and had to undo it.

The trade-off is that a newly created project shows three outstanding items at Gate 1 until someone fills them in. We think that is correct: Gate 1 is work to be done, not a step that completes itself.

**Question:** is that right — these belong to Gate 1 rather than to opening a project? If you would rather they were mandatory at creation, we will move them; but the three Gate 1 items reading them would then always pass, and we would recommend removing them from the readiness list rather than keeping a check that can never block.

### Question 21 — The Phase 1 requirements table: priority values, and how many rows must be complete

We have built the Phase 1 requirements table from your B6 list, with all sixteen rows. Two things your answer did not specify, so we chose:

**Priority values.** You asked for a priority column but did not name the values. We reused the ones you already confirmed for Next Actions: **Low, Medium, High, Critical**. Reusing a list you have already approved seemed safer than inventing a new one.

**How many rows must be complete for Gate 2 to pass.** You gave the sixteen rows but not how many are required. Requiring all sixteen would be inventing a rule — some genuinely will not apply to a given project, such as "Benchmark or reference product" where there is no benchmark. So we check only two, the two your own heading names: **Must-have product requirements** and **Explicit exclusions**. The other fourteen still appear and can still be closed, but they do not block the gate.

**Question:** (a) are Low / Medium / High / Critical the right priority values, or would you prefer a different scale such as Must / Should / Could? (b) Are there rows beyond those two that must be complete before Gate 2 can pass?

### Question 22 — How the two Gate 1 option lists are presented, and whether a project can have more than one nature

In B1 you gave us sixteen options for Request Origin / Source, and in B2 six options for whether the project is new development, reformulation, claim change, packaging change, market extension or lifecycle improvement. Both times you gave the list, which is what we needed — but not how it should appear on screen, so we chose, and then changed our choice.

**What we built first, and why we changed it.** Our first version made each list a single-answer picker sitting in the project identification block at the top of the Phase 1 sheet. We then went back to your workbook and compared. Every place your Phase 1 sheet asks someone to choose from a list — Target Area of Body, Product Type, Target Users / Life Stage, Target Countries / Markets, Claim / Benefit Areas, Initial Evidence / Proof Route — uses the same table: **one row per option**, with columns for Select, Owner / function, Status Y-N-NA, Evidence / internal link, and Free-type notes / rationale. There is no single-answer picker anywhere in the sheet.

So we rebuilt both lists as tables in that same shape. The practical difference is not cosmetic: a single-answer picker had nowhere to record **who confirmed that origin** or **what evidence supports it** — for example the ticket number behind a Sales request, or the complaint reference behind a post-market signal. Your own four columns exist precisely to hold that, and we were discarding them.

One thing worth stating plainly: Gate 1 has no data-entry table in your workbook at all — only the three Key Gate Checks. Every checklist on the Phase 1 sheet belongs to Gate 2 or Gate 3. So these are the first two tables at Gate 1. They copy no existing tab; they follow the shape of the six that surround them.

**Three choices we made that your answers did not cover:**

1. **The table layout described above**, rather than a single-answer picker.
2. **A project may now record more than one nature.** This follows from the table shape — rows are ticked, and nothing stops two being ticked. So a project can be both a reformulation and a market extension. Our first version silently forced exactly one, which was also an assumption, just an unstated one. We think several is closer to reality, but you are the ones who know.
3. **The "Owner / function" value**, which your six tables all carry and therefore cannot be left empty. Since Gate 1 has no such table in your workbook, there was no cell for us to copy, so we chose — and we would like the real values from you.

   What we noticed while choosing: that column holds **two** functions in all six of your tables (Marketing / Project owner · Marketing / NPD · Marketing / Regulatory · Regulatory / Scientific Review), whereas the Stage Map's "Primary owner" column — which names who owns the whole gate — holds **three** for every gate, Gate 1's being *Project owner / Sales / NPD*. They are different columns, so we have used two names, both taken from the three you already give Gate 1, choosing whichever two suit the table: **Project owner / Sales** for request origin, since most of your sixteen options arrive through Sales, and **Project owner / NPD** for project nature, since new development versus reformulation versus claim change is a development judgement rather than a commercial one.

There is one consequence for a rule you gave us in A3. The competitor/benchmark review at Gate 3 is mandatory for "a new product, claim extension, repositioning project" and not for "a purely administrative change". Because a project can now carry several natures, a project marked as both a packaging change and a market extension **will** require the competitor review, on the strength of the market extension alone.

4. **The name of the second table.** B1 gave us its field name outright — "Request Origin / Source" — so that table carries your words. B2 gave a description rather than a name, so we had to invent one. We have called it **Development / Change Type**, taking every word from your own sentence ("new *development* … packaging *change*, claim *change*") and matching the way your other titles read. It is still our wording, so please rename it if you have a term you use.

**Question:** (a) should these two lists be tables in the same shape as your six existing ones, or did you intend a quick single-answer field? (b) May a project be more than one of those six types at the same time, or must exactly one be chosen? (c) Are those two "Owner / function" values the right people to hold these at Gate 1? (d) What should the second table be called?

### Question 23 — Two requirements we added ourselves that currently block a gate

We keep a note against every readiness item saying where it came from — your F1 list, an earlier answer of yours, the newer expert-authored workbook, or an internal decision of ours. Reviewing those notes, we found four items marked as internal decisions. Two turned out to be mislabelled and are corrected: one reads a Key Gate Check row straight from your workbook, and one is your own F14 rule about reconciling a hand-entered formula to the controlled Cosmetri formula before Gate 7 — that one was being displayed as "not confirmed" when in fact you confirmed it on 21 July, which we have fixed.

The other two are genuinely ours, and both currently hard-block a gate. We would rather ask than leave them running unasked:

**(a) Gate 2 — "Product type: at least one selected".** Today Gate 2 cannot be passed until at least one product type has been ticked. It seemed self-evident to us that a brief naming no product type is incomplete — but on checking your Gate 2 list against the workbook, we are no longer sure, and the reason is worth showing you.

The Phase 1 sheet has four option tables that belong to Gate 2. Your Gate 2 list names three of them and not the fourth:

| Phase 1 table | Named in your Gate 2 list |
|---|---|
| Target Users / Life Stage | "Target user and life stage" |
| Target Area of Body | "Intended use and body area" |
| Target Countries / Markets | "Selected markets" |
| **Product Type** | **not named** |

Leaving one out of a set of four you otherwise named individually looks deliberate rather than accidental — and in Question 12 of our last round we put all four to you by name, as a possible definition of the brief; you answered that the brief is its own controlled record and that these tables contribute to it without substituting for it.

To be straightforward about where we stand: we think the requirement is probably right, because a brief that does not say whether the product is a cream or a serum is hard to call complete. What we cannot explain is the gap in your list, and that is what we are asking about — not whether the rule sounds sensible, since you would reasonably say yes to that.

If the omission was deliberate, there is presumably a reason we do not know: perhaps the form is settled later, at concept or formulation, and recorded elsewhere; or perhaps the Product Type table serves a different purpose for you. The one case we can construct ourselves is a project that legitimately reaches Gate 2 with the form still open — "an infant barrier product, cream or balm to be decided at formulation" — which today cannot pass Gate 2 at all, however complete its brief is.

**(b) Gate 7 — "Formulation safety matrix: every formula ingredient assessed".** Today Gate 7 requires the safety matrix to contain rows. Part of that is a technical safeguard we are confident about — a check that reads "every row is assessed" would otherwise pass on an empty table, which is worse than failing. What we are not confident about is the coverage the item claims: that the matrix must carry a row for **every** ingredient in the formula. Nobody has told us that.

**Question:** (a) can Gate 2 be passed with no product type recorded, or is that requirement right? (b) At Gate 7, must the safety matrix cover **every** ingredient in the formula, or only those that warrant an assessment (actives, preservatives, fragrance, and so on)? If only some, what marks an ingredient as needing one?

We have also added an automatic check on our side so that this cannot recur: any requirement that exists only on our own reading, and that blocks a gate, must now be linked to a question on this list, or our build fails.

---

## Summary

| # | Topic | Why it matters |
|---|---|---|
| 1 | Infant & Baby Safety content | **A safety gap is open now** |
| 2–4 | Superseding a formula version · defining "critical" gaps · PV/PMS scope | Open since 21 July; 2 and 4 block work we are ready to start |
| 5–7 | Gate 7 scope · Gate 4 threshold · unclassified claims | Already built on our reading — rework if wrong |
| 8–19 | Which record represents each of your trigger conditions, and two data-model points | Redesign if wrong, no rework |
| 20–23 | Whether the new Gate 1 fields are required at creation; priority values and required rows on the Phase 1 requirements table; how the two Gate 1 option lists are presented and whether several project natures may apply; two requirements we added ourselves that block Gate 2 and Gate 7 | Already built — rework if wrong |

Questions 5 to 23 are all cases where we made a judgement rather than leave something unrecorded. We would rather have each confirmed or corrected than have them settle silently into the system.
