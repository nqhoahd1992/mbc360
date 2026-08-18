# MBc360 — Follow-up questions, Round 4

**Date:** 2026-08-12
**For:** the subject-matter team (NPD / Quality / Regulatory / Safety)

Thank you for the Round 3 answers. They were detailed enough to act on immediately, and most of the work is now mechanical. Two of the corrections you gave us are already built and live; the rest are in progress.

This round has thirty-six questions in total. **Three are outstanding from 21 July and have now become urgent** — one of them concerns infant safety, where we have closed most of a gap ourselves and need you to confirm we closed it with the right content.

You can reply by number, for example "1 — option (b)". Anything you leave unanswered stays in its current state and we will re-raise it.

## What we need most, in order

1. **Question 1** — an infant-safety gap, now largely closed using content already in the workbook. We need you to confirm that content is the right content.
2. **Questions 2–4** — the three items from 21 July that are still open, two of which now block work we are ready to start.
3. **Questions 5–7** — decisions we have already built on our own reading of your Round 3 answer. If we read you wrongly, these need rework, so we would rather know early.
4. **Questions 8–19** — designed but not yet built. A wrong answer here costs a redesign, not rework.
5. **Questions 20–36** — choices we made while building the Gate 1 and Gate 2 fields you asked for, two requirements we added ourselves, one premise of ours that was wrong, and a mapping between two of your own lists.

---

## Question 1 — Infant-only products: we found your own content and wired it, but the pathway is still yours to define

**This is the one item in this list we would ask you to answer even if you answer nothing else.**

In Round 3 (E1) you corrected our reading of Gate 7: the pregnancy/breastfeeding assessment is **not** unconditional, it applies when Pregnancy, Breastfeeding or Postpartum is selected — and *"infant-only products should trigger the Infant/Baby Safety pathway instead."*

We have made the first half of that change, and it was necessary: before it, **every** project — including a plain adult face serum — was blocked at Gate 7 until someone worked through all twelve rows of the maternal caution list, including rows that could not possibly apply.

The second half we could not make at the time, because the Infant & Baby Safety pathway you describe has never reached us. Its content is question **A2 from our 21 July list**, still unanswered: you confirmed that "Infant 0+" activates a dedicated infant safety workflow separate from Skincare for Two, and listed the topics it should cover, but we never received the workflow itself.

**That left a gap we reported to you plainly: an infant-only product, with no maternal user selected, passed Gate 7 without either assessment.** It has now largely been closed, and how is worth explaining, because it was not by us writing safety content.

Going back through the workbook we found that the content already exists in it: Phase 3 carries **"Compartment 3 — Infant / Baby-Contact Safety & Characteristics"**, eight rows INF-01 to INF-08, every one tagged Gate 7 — infant-contact use context, infant-adjusted margin of safety, hand-to-mouth ingestion risk, infant sensitiser screen, pH and barrier compatibility, eye safety, claim wording, label and PIF statement. It was only ever *required* for maternal projects, because the system reached it through the Skincare-for-Two logic. An infant-only product was asked to complete none of it.

Selecting **Infant 0+** now requires that compartment to be complete before Gate 7 passes. And the Gate 7 record "Pregnancy/breastfeeding and baby-contact screen completed where triggered" can no longer be closed as *not applicable* on an infant product — its own wording covers baby contact, which is precisely what such a product is.

**What we are still not doing, and why this question stays open:** we are enforcing the **workbook's** infant assessment, not yours. You told us Infant 0+ activates a dedicated pathway and listed the topics it should cover; those eight rows may be narrower than what you have in mind, may sit at a different gate, or may need evidence the rows do not ask for. We would rather you told us than have us treat the workbook as your answer.

**Question:** is Compartment 3 the infant assessment you meant, or does the Infant & Baby Safety pathway cover more? If more, please give the items, the evidence required for each, and the gate at which it must be complete — we will replace what is wired now rather than add to it.

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

We have gone ahead on the reading that they ARE the same thing, so that B7 is usable rather than waiting, and we would like that confirmed. What is now built:

- the existing **Claim category** column is that dropdown, with your ten values as written — not a second column beside it;
- **Claim risk** alongside it, with your five values (Low · Medium · High · Prohibited / not acceptable · Pending classification);
- both of those on the **Claim → Evidence Traceability** register as well, because a claim that is borderline is borderline wherever it is used;
- **Intended channel** and **Regulatory review required** on the SKU register — the two of your nine attributes that had nowhere to be recorded.

Three judgements inside that we would rather you correct now than later:

**The classification sits on both registers, and they can disagree.** The SKU register has no Claim ID column, so nothing ties its classification back to the claim's own. We have accepted that knowingly rather than by accident. The clean fix is for the SKU register to reference a Claim ID and inherit the classification — the way the Published Information register already inherits approved wording — but that changes the data model rather than adding a column, so we have not done it unasked.

**Intended channel and Regulatory review required are on the SKU register** because both describe the USE of a claim rather than the claim: the same wording is held to a different standard on-pack than in a social caption, and review may be required in one market or channel and not another.

**Gate 3 does not yet enforce classification.** There is now somewhere to record it, but we do not know how much Gate 3 requires: that register spans Gates 3 and 10, and most of its PIF content belongs to Gate 10. Inventing a number ("every row must be classified") is the mistake we describe in Question 21.

**Question:** (a) is the existing Claim category column the same thing as your B7 classification, as we have assumed? (b) Where should Intended channel and Regulatory review required live? (c) When the classification on the two registers disagrees, which is authoritative — or would you rather the SKU register referenced a Claim ID so it cannot? (d) At Gate 3, how many claims must be classified before the gate can pass?

**Since writing the above we have gone further, and this is the part we most want checked.** Looking for the right home for the classification, we found that MBc360 has no single place where a claim is declared at all. The same claim is typed out again in six registers — the SKU register at Gate 3, the mechanism map, the evidence plan at Gate 5, the study plan at Gate 8, the efficacy and clinical evidence registers — and the only thing carrying a **Claim ID** is the traceability ledger, which until today did not open until Gate 10. So an identifier existed, but only after most of the typing had already happened.

Nor is the SKU register a declaration: one claim used on three SKUs in two markets is six rows there, so classifying each row separately would drift within a single table, never mind between two.

**What we have changed:**

- **Claim → Evidence Traceability is now the one place a claim is declared**, and it opens at **Gate 3** instead of Gate 10 — a Claim ID is issued when the claim is first proposed, which is also when your B7 classification is meant to happen.
- The **SKU Claims / PIF register now has a Claim ID column** and points at that claim rather than restating it.
- **Claim category and Claim risk on the SKU register are now inherited**, shown read-only from the linked claim. With no claim linked they are locked, with the note "Link a Claim ID first" — because a row classifying itself is exactly how two copies of one fact come to disagree.

The effect is that a claim is classified once, where it is declared, and every later use reads it.

**Three judgements in that we would like confirmed or corrected:**

**(e)** Should a Claim ID exist from **Gate 3**, when the claim is proposed, or only once evidence supports it? If IDs are only meant to appear later, tell us what Gate 3 classifies instead.

**(f)** The Claim ID picker offers **every** declared claim, not only Supported ones — following your D2 correction that a developing claim must still be selectable, with release blocked separately. Same intent here?

**(h)** A claim row is now filled in across three gates, so we have said which column is due when: **Gate 3** — Claim ID, approved wording, category and risk, i.e. declaring the claim; **Gate 5** — mechanism; **Gate 8** — evidence grade and supporting report, which cannot exist before testing; **Gate 10** — Supported status and the approval. Gate 3 therefore checks only those first four, rather than blocking on evidence nobody could have yet. Is that split right, and does mechanism belong at Gate 5 or already at Gate 3?

**(g)** Four registers still ask people to type the claim wording by hand — the mechanism map, prospective evidence plan, efficacy study plan and clinical evidence. Should they all reference a Claim ID too? We have not touched them yet, because that is a larger change and we would rather do it once, with your answer, than twice.


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

**How many rows must be complete for Gate 2 to pass.** You gave the sixteen rows but not how many are required. Requiring all sixteen would be inventing a rule — some genuinely will not apply to a given project, such as "Benchmark or reference product" where there is no benchmark. So we check **one**: *Must-have product requirements*, which every project has by definition. The other fifteen still appear and can still be closed, but they do not block the gate.

We had briefly required *Explicit exclusions* as well, on the reading that your own heading says "requirements **and** exclusions". We have taken it back out, because not every project has something to exclude, and this table has no way to say so: a requirement row can be Not Started, In Progress, Completed, On Hold or Backtracked — there is no "not applicable, and here is why", the way your Key Gate Checks have Y/N/N/A with a justification. A project with nothing to exclude was left choosing between marking work Completed that does not exist, or being blocked at Gate 2 indefinitely.

So if you do want exclusions — or any other row that will not apply to every project — to be required, the missing piece is a way to close a row as not applicable with a reason. We would rather build that than have people tick Completed on an empty row, which teaches everyone that the tick means nothing.

**Question:** (a) are Low / Medium / High / Critical the right priority values, or would you prefer a different scale such as Must / Should / Could? (b) Beyond *Must-have product requirements*, which rows must be complete before Gate 2 can pass — and for a row that does not apply to a given project, how would you like it closed?

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

5. **Where the five free-text fields sit.** Requester name, requester department, initial product scope, and the initial target user and markets are in a small block we added directly beneath Project Identification, titled "Opportunity & Request (Gate 01)". Your Project Identification table has ten parameters, all in use, so there was no free row to put them in — the block is our layout, not yours.

**Question:** (a) should these two lists be tables in the same shape as your six existing ones, or did you intend a quick single-answer field? (b) May a project be more than one of those six types at the same time, or must exactly one be chosen? (c) Are those two "Owner / function" values the right people to hold these at Gate 1? (d) What should the second table be called? (e) Should the five free-text fields stay in their own block, or become additional parameters of the Project Identification table itself?

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

### Question 24 — We gave you an inaccurate premise in B3, and "initial target markets" may be a duplicate

When we asked B3 last round, we told you that *"the only target-market and target-user information in the system is the Gate 2 selection"*. That was not accurate, and we would rather correct it than leave your answer resting on it.

The Project Identification table has a **Countries / Markets** parameter — your own, from the workbook — and it is **required** when a project is first opened, chosen from a controlled list. So markets are already recorded before Gate 1 starts. Your B3 answer then added an "Initial target market(s)" field, which now sits two rows below the markets the same person already selected, asking them to type it again as free text. That reads as duplication, and it is our reporting that led you there.

For the target **user** our statement was correct — there is no such field anywhere else, so "Initial target user / life-stage" has no equivalent overlap. This is specifically about markets.

We are not proposing a fix without your view, because the obvious one has a flaw worth stating. If we simply delete the new field and let the Gate 1 check read the markets captured at project creation, that check can never fail — the creation form guarantees the value — so it would become decoration rather than control, which is the mistake we describe in Question 20.

**Question:** where should the initial market be recorded — in the Countries / Markets parameter that already exists when a project is opened, or in a separate "initial" field as it is now? And if the existing parameter is enough, should selecting markets stop being required at project creation, so that recording them becomes part of the Gate 1 work rather than a precondition for it?

### Question 25 — Which target users imply a vulnerable-use group?

Your B5 answer deliberately keeps two records apart: the target user selected at Gate 2, and the explicit recognition of a vulnerable-use context. We had not checked that the two **agree**, and they could contradict each other: a project could select Pregnancy as a target user and record "No vulnerable-user group identified" in the assessment, and Gate 2 would pass. We have now made a selected target user require an assessment row naming the matching group.

Doing that meant deciding which of the seventeen target-user options implies which of your vulnerable groups, and our confidence is not the same across the list:

| | Target user | Vulnerable group | Basis |
|---|---|---|---|
| Same words | Pregnancy · Breastfeeding · Postpartum · Infant 0+ | identical | nothing to decide |
| Same population, your words | Child 2+ · Child 3+ | Young child | your list's own term |
| | Cancer patient support | Oncology or medically vulnerable support context | " |
| | Kidney disease support | Renal or other health-related support context | " |
| | Sensitive skin | Sensitive or compromised skin | " |
| Not mapped | Dry / eczema-prone skin · Intimate area · Swimmers · Family use · Oily skin · General adult · Professional or HCP recommendation · Other | — | would be our reading, not a rename |

The consequence of that last row: a project aimed only at, say, dry or eczema-prone skin can still record "no vulnerable group" and pass Gate 2. We would rather ask than quietly decide it either way.

The check now runs both ways, and we have deliberately made the two directions different strengths. Recording **Breastfeeding** in the assessment while Breastfeeding is not a target user is refused outright — it is the same word in both places, so it is a plain contradiction. Recording **Young child** or **Sensitive or compromised skin** with no matching target user only raises a warning, because those can legitimately come from somewhere we did not map (a family product reaching children, eczema-prone skin) or from a Safety or Regulatory judgement, which your own "Other population identified by Safety or Regulatory" option exists for. Refusing those would turn our mapping into a rule nobody can work around, and we have made that mistake once already with the pregnancy caution screen.

Two smaller rules came with it: one row per group, since two Pregnancy rows are one assessment entered twice; and a target user cannot be un-ticked while an assessment row depends on it — the row must be removed first.

**Question:** (a) are the five "same population" pairs right? (b) Does dry or eczema-prone skin count as *sensitive or compromised skin*? (c) Do family use, intimate area or swimmers imply a vulnerable group — a family product reaching children, for instance? (d) Should recording one of those four renamed groups without its matching target user be refused outright rather than warned about?

### Question 26 — When should the claim traceability register freeze?

Your NPD Front-End Roadmap gives step 4, "Evidence Plan & Claim Support", the sign-off gate **SG05 / SG08**. That sheet becomes three tables in MBc360, and two of them follow it exactly: the prospective evidence plan closes at Gate 5, the detailed test protocol at Gate 8, matching each section's own heading.

The third — Section 3, the permanent Claim IDs — we have left open until Gates 10 and 11 instead, and we would like that checked. Section 3's heading names no gate, and unlike the other two it is not a step with a sign-off: it is a ledger that keeps being added to. Claims are still being created at Gate 10, while the PIF and Published Information work is done, and the Published Information register links to a Claim ID in it.

This matters because a record in MBc360 becomes read-only once its gate has passed, and correcting it afterwards requires a Backtrack. If the claim ledger closed at Gate 8, adding a claim during Gate 10 would mean reopening a gate that is already closed, just to write one line.

**Question:** should the Claim → Evidence Traceability ledger freeze after **SG08**, as the roadmap line for that sheet suggests, or stay open through **SG10/SG11** because claims are still being created during PIF and Published Information work? If SG08, we will make it so — but adding a claim later will then require a Backtrack, and we want that to be your decision rather than a surprise.

### Question 27 — What proves a claim has been through Regulatory review, and the four conditions we cannot check

C1 confirmed that a Regulatory review is mandatory for a claim that is borderline or therapeutic-adjacent, high risk, or caught by four further conditions. Until today that rule did nothing in MBc360: there was no per-claim classification to read it from, and nowhere to record that a review had happened. Both now exist, so the rule is live at Gate 3 — and two parts of it are ours rather than yours.

**What proves the review happened.** C1 does not say. We have borrowed the shape you specified for the same situation at Gate 4 in D3 — reviewer assessment, reviewer, date, rationale, evidence link — and put it on the claim itself: **Regulatory review outcome · Regulatory reviewer · Review date · Review rationale · Review evidence link**. Gate 3 is satisfied when every claim that triggers the rule carries the first three. The outcome values are ours too: **Approved · Approved with conditions · Not approved · Further information required**, since D3's four values are about whether a watch-list hit is real and do not transfer to a claim.

**One more condition became checkable while writing this.** You list "the claim varies from previously approved wording" separately from "not in the approved Claims Library", so the two cannot mean the same thing — and at the moment a claim is first declared there is nothing for it to vary from. Read as a change over time it becomes concrete: the wording was approved, and then someone edited it. We now snapshot the wording whenever a review is recorded, and a claim whose wording no longer matches its snapshot needs reviewing again. The case it catches is real — "helps soothe the appearance of dry skin" is approved, and three weeks later reads "soothes irritated skin", still carrying the old signature.

**Four of your seven conditions can now be checked automatically** — the three reading the classification, plus the wording change just described. The other three have no data behind them yet: wording not in the approved Claims Library (that library does not exist yet — see Question 28), a market imposing a specific restriction (per-market restriction lists do not exist yet), and the claim relating to pregnancy, breastfeeding, infant use or disease (reading that from the wording is a judgement, not a lookup).

We have not quietly dropped those three. The item on screen now carries the line "Partly checked: …" listing them, so nobody reads a green tick as "all seven conditions were met". Reporting a half-enforced rule as covered is a mistake we have made before and would rather not repeat.

**Question:** (a) are those five review fields the right record, or would you rather it looked different? (b) Are the four outcome values right? (c) If a claim's review outcome is **Not approved**, can Gate 3 still pass while that claim sits in the register, or must it be withdrawn first? (d) Is the review **per claim**, or **per market** — your own condition about a market imposing a restriction suggests it could be the latter. (e) Does "previously approved wording" mean this claim's own last approval, as we have read it, or wording approved on another project? (f) Does correcting a typo count as varying? We treat any difference as varying, which is stricter than the "minor adaptation" allowance you gave for published content in D2.

### Question 28 — Is the Claims Library a company-level list that projects point at, and who keeps it?

This is the one dependency still standing between C1 and being fully enforced, and before asking you for its content we would rather check that we have understood **what kind of thing it is**.

**What you have already told us.** Under F11 you specified what one entry holds: approved term or claim · prohibited or discouraged alternatives · required evidence type · applicable products · applicable markets · approved context or channel · limitations or mandatory qualifiers · owner. You also said it is maintained jointly by Technical and Regulatory. So the shape of an entry is settled — this question is only about where it lives.

**What we think it is.** We have read the Claims Library as a **company-level** list that sits above projects: one controlled vocabulary of wording the company may use, which every project consults and none of them owns. Two things point that way. Your own C1 condition is "wording is **not in** the approved Claims Library" — a test a project runs against something outside itself. And the master workbook, which we have checked in both versions, has no Claims Library tab: the four claim-related sheets in it (Mechanism & Claims, Twinkle 5 Claims, SKU Claims / PIF, and Claim → Evidence Traceability) all record what **this** product claims, not what the company is permitted to claim. A workbook is one project's file, so a shared library could not have lived in it even in principle.

**Why the answer changes what we build.** Everything in MBc360 today is copied into a project when that project is created. A company-level library cannot work that way — it has to be one list, maintained in one place, that every project reads and no project can edit while working. That is a different piece of software from the thirty-odd registers, closer to the user administration screens, so we would rather build it once in the right shape.

**Question:**

1. Is the Claims Library company-level as we have read it, or is it maintained per brand, per market, or per product family?
2. When a project proposes a claim, must its wording **point at a library entry** — so that "not in the library" is a fact the system knows rather than a judgement someone makes — or is the library guidance a reviewer consults, with the link left optional?
3. Who may add or change an entry, and does an entry go through an approval of its own before it becomes usable? You have said Technical and Regulatory maintain it jointly; we would like to know whether that means both must agree on each entry.
4. If a claim is approved on a project using wording that is not yet in the library, should that wording be **promoted into** the library so the next project can reuse it, or do the two stay separate?
5. When an entry is later changed or withdrawn — a market tightens its rules, say — what should happen to claims already approved from it on products that are on sale? We can flag them for re-review, but that is a decision with commercial consequences and we do not want to invent it.

This also settles a question left open in Question 27: if "previously approved wording" means wording approved anywhere in the company rather than on this claim, then it is the library that has to answer it, and the two questions are really one.

### Question 29 — Five things the sign-off answer does not yet say

Your D1 answer settles the shape: three recorded sign-offs per gate — prepared, reviewed, approved — each carrying the signed-in user, their role, the time, the decision, the record version and a comment where required; the phase-level approval stays as well; and the reviewer or approver must be independent for safety-, regulatory-, claims- or release-critical decisions. We are not questioning any of that.

But building it means answering five things the wording leaves open, and we would rather ask than choose for you. Question 18 asks about one of them; these are the rest.

**1. "Record version" — a version of what, and of how much?** The point of recording it is so a signature says "I approved *this*", which means it has to be something that changes when the thing approved changes. The candidates read very differently: an internal save counter (it moves every time anyone edits anything anywhere on the project, so a signature quoting it would tell a later reader nothing about whether the gate's own content changed), the formula version (meaningful at Gates 4 to 9, much less so at Gate 1), or a revision number for the gate record that we would create for this purpose.

Underneath that is a bigger question: **what is "the record"?** Just the gate's own line — status, decision, owner, evidence link, notes — or the evidence behind it, its gate checks, checklists and registers? The second is what actually justifies a decision: nobody approves a gate because of what its notes field says.

**A case that makes this concrete, and that we cannot currently detect.** Your answer says the sign-offs block the gate decision, so all three signatures happen *before* the gate passes. But a gate's evidence only becomes read-only once it has passed. So this sequence is possible today:

> the preparer signs → someone edits the evidence → the approver signs.

Those two signatures are about different content, and nothing on the record would show it. Whether that matters is your call — it may be perfectly normal for evidence to keep improving while a gate is being signed off — but if it does matter, the version has to be granular enough to expose it, which rules out a project-wide counter. We have solved the same shape of problem once already, for claim wording: the wording is snapshotted when a review is recorded, and a later edit shows up as a mismatch.

**Question:** which of the candidates did you mean, is "the record" the gate line or the evidence behind it, and should a signature still stand if the evidence changed after it was given?

**2. When is a comment required?** You wrote "comment where required". Our guess would be: whenever the decision is anything other than a clean approval — Proceed with Conditions, Hold, or a rejection. We would rather have your rule than our guess.

**3. Which gates are safety-, regulatory-, claims- or release-critical?** You named categories; the system needs gate numbers. Gate 7 (safety), Gate 10 (regulatory and claims) and Gate 11 (release) seem clear. Four others are arguable and we do not want to decide them silently: Gate 4 (prohibited and restricted ingredients — both a safety and a regulatory decision), Gate 3 (claim classification), Gate 8 (claim evidence), and Gate 9 (release criteria — the word "release" appears in its own name). Which of the twelve carry the independence requirement?

**4. What does "independent" mean?** Two readings, both reasonable. Either it means a different person from whoever prepared the record, or it means someone from a different function — which is the test you yourself set for study reviewers, where the independent reviewer must not share the study author's department. The second is stricter and would block more often. Which applies here?

**5. When exactly does it block?** You wrote that the sign-offs should hard-block the gate decision. Must all three signatures exist before a decision can be recorded at all, or before the gate can pass with that decision? This matters because of something the wording leaves circular: each sign-off records a decision, and the gate itself also has a decision. If the approver's decision *is* the gate's decision, then "sign first, decide second" cannot work — the third signature is the decision. If they are two different things, what is each signer deciding?

**Question:** please answer 1 to 5. Until they are settled we have not built the per-gate sign-off at all, and the twelve gates still show the old Owner + Evidence link check — now labelled on screen as not being the sign-off you asked for, so nobody mistakes it for one.

### Question 30 — The claim-linkage rules are now built; four choices inside them are ours

Your D2 answer has been implemented. Two things it rejected are gone, and we would like the four judgement calls we had to make checked.

**What changed.** The wording lock is removed. The claim's approved text now sits in its own read-only column, "Master approved wording"; the wording actually going out sits beside it in "Proposed wording as published" and can be edited freely. Where the two differ, the row cannot be released until someone records the comparison and their name against it. The system shows how far apart the two texts are as a percentage, and nothing in the software acts on that number — it is there to inform the reviewer, exactly as you specified.

The old behaviour was worse than a lock in practice: the only way to shorten a sentence for a social caption was to edit the claim itself, which meant one caption could rewrite the approved wording for the whole project.

Blank Claim ID no longer means "this record makes no claim". A record with no Claim ID cannot be released unless someone ticks **"No product claim or technical statement"**, and the system records who ticked it — that name is written from the signed-in account and cannot be typed or altered afterwards. Your exemption is narrow, so we made claiming it a deliberate act with an owner rather than an empty field.

**The four choices we made:**

1. **All of this bites at release, not at first entry.** A row at Draft or in review can have no claim and no wording comparison. We read your own picker rule that way — a developing claim must be selectable "to document the intended claim early", which only makes sense if early work is not blocked. But it does mean a record can sit half-finished for a long time with no claim attached.
2. **Three comparison values**, since you name the two outcomes but no vocabulary: *Identical to master wording · Minor adaptation — meaning, scope, qualifiers and evidence burden unchanged · Material change — a new or revised claim record is required*. The middle one is your own test, quoted.
3. **Differences in spacing only are not differences.** A double space or a trailing space does not ask anyone to classify anything. Everything else does, including a change of capitalisation or punctuation — we did not want the software deciding that "helps soothe" and "soothes" mean the same thing, since that judgement is the one you reserved for a reviewer.
4. **"Material change" blocks release rather than creating the new claim itself.** You wrote that a material change must create a new or revised claim record. Marking a row as a material change now stops it being released and says a new claim is needed, but the system does not create it — we do not know whether a revised claim should be a **new Claim ID**, or the **same ID at a higher revision** with the old wording kept. That choice decides whether history lives in one row or several, so we would rather you set it.

**And two parts of D2 we have NOT built, because there is nothing to attach them to yet.** You wrote that a Pending claim must not allow *final artwork approval* or *external publication*. Released and Approved for Release are both blocked. But artwork approval is recorded on the packaging and artwork register, which has no concept of a claim at all — connecting the two is a design decision, not plumbing, and we did not want to invent it. Likewise "external publication" as an act distinct from reaching a released state: if it is separate, which record shows it happened?

**Question:** (a) are the four choices right? (b) Should a revised claim be a new Claim ID or a new revision of the same one? (c) Which record represents final artwork approval, and should it require the linked claim to be Supported? (d) Is external publication a separate step from the released workflow state, and if so where is it recorded? (e) Who may tick the non-product exemption — the content owner, or must Regulatory confirm it? Right now anyone who can edit the register can, and their name is recorded.

### Question 31 — The import-stub rules are built; three choices inside them are ours

Your D4 answer is implemented. Before it, only the parts you said were *acceptable* were true — the stub gets created, the import does not fail, and it does not default to Approved for Use. The five conditions that followed your "However" were not.

**What was wrong, plainly.** A formula imported from Cosmetri could create twenty identity-only records that nobody had looked at, and Gate 4 still showed ready. Not merely unchecked — the identity check actively **passed** on them, because it asks for the INCI name and the import fills exactly that. And nothing anywhere read the "Approved for use" tick; it only controlled which materials a hand-typed formula line could point at.

**What changed.** Every raw-material record now carries an evidence review status, starting at **"Incomplete — evidence review required"** — your words — from the moment it exists, whether an import created it or a person did. A person adding a row and abandoning it half-filled is exactly as unreviewed as an import stub, and previously both read the same as a finished record awaiting its tick. Gate 4 cannot pass while any material is still at that status, Gate 7 requires the review to be finished, and Gates 10 and 11 will not pass on an unresolved stub.

**The three choices we made:**

1. **"All applicable raw materials" means every row in the register.** At Gate 4 there is no formula yet — that is Gate 5 — so the register itself *is* the candidate ingredient set being screened. We could not read "applicable" as "in the formula" without making the rule unevaluable at the gate it belongs to.
2. **We added a status you did not mention: "Considered — not used in this formula".** Choice 1 makes it necessary. Without it, a material that was screened and then dropped would block Gate 4 for ever, with no way out. We deliberately made it a status rather than deleting the row, because deleting it would destroy the evidence that the material was ever screened.
3. **"Formally accepted through a controlled conditional decision" is implemented as a Proceed with Conditions decision plus a controlled action**, not as a new approval field on the row. That phrase matches the mechanism you specified yourself twice — for an open Change Control under F9, and for an unresolved watch-list match at this same Gate 4 under D3. So a conditionally accepted material blocks a plain Proceed but allows Proceed with Conditions.

**One further reading, at Gate 7.** You wrote that Gate 7 must use the *completed* evidence status. A conditional acceptance has an open action by definition, so we have not treated it as completed: at Gates 7, 10 and 11 a conditional acceptance blocks, and unlike Gate 4 it cannot be cleared by Proceed with Conditions. If you intended a conditional acceptance to be carried through to launch, say so and we will loosen it.

4. **At least one material must be usable.** Both rules above are of the form "every material has been dealt with", and a register in which *every* material was screened and then rejected satisfies both — so the gate would pass having cleared nothing to formulate with. We now also require at least one material to be usable. Deliberately not "at least one approved for use", which would contradict your own conditional route: a project whose materials are all conditionally accepted has none approved and is exactly the case you described. This is a counting rule rather than a per-material one, which we normally avoid inventing — we mention it because the alternative was a gate that passes on an empty result.

**One consequence of choice 1 that we should put to you separately.** The argument that "the register is the candidate set" holds *at Gate 4*, because the formula does not exist there yet. By Gates 7, 10 and 11 it does — so at those three gates a narrower reading is available: count only the materials actually in the formula. We have applied the wider reading at all four, for consistency and because the "not used" status makes it satisfiable.

The practical difference is narrow but real: a record left at "Incomplete" for a material that is **not** in the formula blocks Gates 7, 10 and 11 under our reading, and would not under the narrower one. The case for ours is that an undispositioned record is unfinished screening work. The case against is your own wording — "must not **rely on** unresolved identity-only stubs" — and a gate arguably does not rely on a material the product does not contain.

**Question:** (a) is "every row in the register" the right reading of "applicable" at Gate 4? (b) Is a status the right way to record a material considered and not used, or would you rather that be recorded somewhere else? (c) Is the conditional route the Proceed with Conditions mechanism you already specified, or a separate per-material approval? (d) Must a conditional acceptance be closed before Gate 7, as we have assumed? (e) Is "at least one usable material" right, or can Gate 4 legitimately pass with every candidate rejected? (f) At Gates 7, 10 and 11, where the formula does exist, does "applicable" mean every record in the register or only the materials in the formula?

### Question 32 — The watch-list reviewer trail is built; four choices inside it are ours

Your D3 answer is implemented, and it closes the gap we reported to you ourselves — that a possible formula match blocked nothing at Gate 4.

**What it was doing.** A row reading "REVIEW – possible formula match" passed Gate 4 on a plain Proceed with nobody having looked at it. The same value did block at Gate 7 — but by then the formula has been locked at Gate 5, so the system was ignoring a possible prohibited-ingredient match at precisely the gate that exists to catch it.

**What is built.** Every flagged row now carries the seven fields you listed, with your four assessment values exactly as you wrote them, and each of your four rules is enforced: Critical stops the gate outright; Non-critical and Further information required stop a plain Proceed and allow Proceed with Conditions once the assessment, rationale and a linked action are on record; Not a true match closes once the rationale and evidence are recorded. The linked action is a picker over the project's real Next Actions, and a reference that resolves to nothing is refused — an id typed into a box *is* the note your sentence rules out.

**The four choices we made:**

1. **Which rows count as "flagged".** Your heading says possible formula match, and that status is certainly one. We have also included **"Needs Regulatory Review"**, because it is the same situation — escalated to a qualified reviewer, not yet resolved — and leaving it out would mean that escalation blocks nothing at Gate 4 at all. "Prohibited – remove" is not included: it is not a *possible* match, and it is already blocked outright.
2. **Resolution status values: Open and Closed.** You name the field but not its values; these come from your own sentence about Not a true match being closed.
3. **A flagged row nobody has assessed yet blocks Proceed with Conditions too.** Your four rules say what each *verdict* does, not what an unassessed row does. We could not read it as clearable by Proceed with Conditions, because then the whole mechanism becomes optional — choose Proceed with Conditions and no assessment is ever needed.
4. **"Authorised acceptance" is not built as a separate step.** For Further information required you asked for authorised acceptance *and* a linked action before Proceed with Conditions. We enforce the assessment, rationale and linked action; recording Proceed with Conditions is itself an audited act by someone permitted to decide the gate, but it is not a distinct acceptance. The item says so on screen rather than implying we have covered it.

**One thing we corrected while checking this, and one we left open.** A linked action that had been **cancelled** originally satisfied the rule — the system only checked that the reference resolved — so a finding could rest on an action somebody had abandoned, which tracks nothing. Cancelled no longer counts; a *closed* action still does, since a completed and verified action means the finding was dealt with. Left open: the picker offers actions from any gate, not only Gate 4, because a legitimate controlled action might sit at a later gate — but we would rather you told us.

**Question:** (a) does "flagged" include Needs Regulatory Review, or only possible formula match? (b) What values should Resolution status have? (c) What is "authorised acceptance" — the acknowledgement step you specified for an open change control under F9, a permission check, or is recording Proceed with Conditions enough? (d) Should an unassessed flagged row be clearable by Proceed with Conditions, or blocked as we have it? (e) Does the pregnancy and breastfeeding caution list — the other watch-list — need the same seven fields? Your wording says "each flagged watch-list result", but the heading names only the formula match. (f) Must the linked action belong to the same gate as the finding, or may it sit at a later gate?

### Question 33 — The critical safety finding control is built; five choices inside it are ours

Your E1 answer had four parts. Only one of them was in place, and the first sentence of your answer rejected what we had.

**What we had.** The Gate 7 item "No unresolved critical safety finding" read the *Final Safety Sign-off* — the same evidence as the item next to it. So a green tick saying no critical finding was unresolved only ever meant the ten sign-off questions were marked Completed. There was no record of a finding anywhere in the system.

**What is built.** A Critical Safety Findings register with the nine fields you listed, on the Formulation Safety page, and Gate 7 cannot pass while a finding marked critical is open. The Final Safety Sign-off is unchanged and still required — we read your "not **solely**" as meaning both, each answering a different question: the sign-off says the review happened, the register says whether anything is still open. That also settles what an empty register means: a project with no findings is not blocked by this, because the confirmation that someone looked comes from the sign-off.

**The five choices we made:**

1. **Severity: Low / Medium / High.** You name the field without values.
2. **Status: Open / Closed.** Your rule turns on exactly one distinction, so two values carry it. We considered reusing the general work-status list used elsewhere and rejected it — one of its values is "Backtracked", which means nothing for a safety finding.
3. **"Required action" is free text**, not a link to a controlled Next Action. This is the one place we may have under-built deliberately: in D3, for the watch-list at Gate 4, you wrote that *"a genuine controlled Next Action must be used. A note alone is not sufficient."* Here you wrote "Required action" with no such sentence, so we did not raise the bar on your behalf. If a critical safety finding should also require a controlled action, say so and we will make it the same picker.
4. **A finding nobody has yet judged critical or not blocks the gate.** Your rule says what an open critical finding does; it does not say what an unjudged row does. If those passed, a finding could be parked indefinitely without a verdict and the gate close over it, which is the opposite of a control.
5. **Closing a critical finding requires the safety reviewer conclusion and an evidence link.** Ours by analogy: in D3 you specified exactly that for the equivalent verdict — "may be closed after reviewer rationale and evidence are recorded".

A finding marked **not** critical blocks nothing, whatever its status.

**Your fourth line is met, and we tightened its opposite.** "General products should record N/A with rationale where neither pathway applies" is the Gate 7 Key Gate Check row "Pregnancy/breastfeeding and baby-contact screen completed where triggered": it stays mandatory, and marking it N/A requires a written justification — so the N/A itself is the record you asked for. What was missing is that the system already knows whether the condition applies, and was accepting N/A regardless. On a project with Pregnancy selected, that row can no longer be dismissed as not applicable; only a completed screen satisfies it.

**Still not done, and it is the same gap as Question 1:** infant-only products have no pathway to be routed to.

**Question:** (a) what values should Severity have? (b) What values should Status have? (c) Should "Required action" be a controlled Next Action, as in D3, or is free text right? (d) Should an unjudged finding block Gate 7? (e) Should closing a critical finding require the reviewer conclusion and evidence link?

### Question 34 — Gate 11 now grades open changes; four choices inside it are ours

Your E3(b) answer settled a question we had left open with a comment saying a readiness check here "would either duplicate or contradict" the existing soft lock. You answered that it would do neither: *"Gate 11 requires more than a duplicate warning. It must evaluate the impact classification and closure status of each open Change Control."* The old soft lock treats every open change alike, whatever it touches — which is exactly the duplicate warning you were describing.

**What changed.** Every change control now carries an **impact classification** — your own list: formula, artwork, claims, safety, regulatory, packaging, release, plus launch-impacting and administrative-only. Neither field we had was that classification: risk level is Low/Medium/High, and "affected area" is free text. Gate 11 now reads it: a launch-impacting or high-risk open change stops the gate outright; one affecting any of your seven subjects stops it too; an administrative-only one stops a plain Proceed but can be carried under Proceed with Conditions.

**The four choices we made:**

1. **"Critical" is read as High risk.** Our risk scale is Low / Medium / High with no Critical on it. If Critical is meant to be a distinct level above High, tell us and we will add it rather than fold the two together.
2. **A change with no impact classification blocks Gate 11.** You ask the gate to *evaluate* the classification; there is nothing to evaluate on a change nobody has classified. Letting those through would make the rule optional. It does mean existing changes need classifying before Gate 11 will pass.
3. **"Final disposition is recorded" means a closure evidence note or a closing date.** Your fourth line lets a completed, rejected, cancelled or superseded change stop blocking *if the final disposition is recorded* — and the second half of that sentence was not being enforced: a change marked Completed with nothing recorded about how counted as closed. It no longer does.
4. **"Authorised acknowledgement" is the acknowledgement step that already exists** on the gate row for open changes, not a new approval with its own permission check. The item says so on screen rather than leaving you to assume we built one.

**Question:** (a) is Critical the same as High, or a level of its own? (b) Should an unclassified open change block Gate 11? (c) What counts as the final disposition being recorded? (d) Is "authorised acknowledgement" the existing acknowledgement, or an approval restricted to particular roles?

### Question 35 — The per-market regulatory checklist is built; three choices inside it are ours

Your E2 answer corrected a decision of ours that had the right reason and the wrong conclusion. We had left this item unenforced because requiring the ASEAN checklist of every project would wrongly block a product not sold in ASEAN. Your answer: *"The absence of a built-in country template should not mean the item is unenforced."* Enforce it **per market**.

**What is built.** A market inside ASEAN is checked against the built-in ASEAN PIF checklist, and only then — a project selling nowhere near ASEAN is not asked for it, and the panel says so rather than hiding the item. A market outside ASEAN needs a row in a new **Regulatory Checklist Status** register carrying the six things you listed: applicable market, required dossier type, owner, checklist or evidence link, status, and Regulatory approval. Gate 10 will not pass while a market has no row or an incomplete one, which is what lets Regulatory point at an approved external checklist in the meantime.

It is two items rather than one because the two halves differ: the ASEAN half applies only to projects with an ASEAN market, the per-market half only to markets without a built-in profile. A project selling into both gets both, independently.

**The three choices we made:**

1. **Status and Regulatory approval reuse values the system already has** — the general work status, and the same approval scale as market tracking (Not Started / In Progress / Approved / Blocked / N/A). You name both fields without saying what goes in them, and we would rather reuse than invent two more vocabularies.
2. **A market recorded as "Other — specify" is treated as outside ASEAN**, so it needs its own row. A market nobody has named cannot be assumed to be covered by the ASEAN template.
3. **A row counts only when all six fields are filled.** You listed six; a row with two of them is a placeholder rather than the record you asked for.

**Question:** (a) are those value lists right? (b) How should a market entered as "Other — specify" be handled? (c) Must all six fields be present, or is a checklist link plus Regulatory approval enough?

### Question 36 — Two small things nobody has been asked

Both surfaced while wiring the last of the conditional rules, and neither has ever been put to you.

**(a) Does a plain cosmetic claim depend on product-level evidence?** Your Gate 10 rule reads: *"mandatory where any external claim depends on **product-level** efficacy, performance, sensory, clinical, instrumental, in vitro, in vivo, consumer-use or comparative evidence."* Read against the claim categories you gave us under B7, two match your words exactly — **Product performance** and **Sensory** — and those now trigger the rule. **Ingredient-level** does not, because you wrote *product*-level.

The boundary is **Cosmetic**. A claim like "moisturising" is categorised cosmetic but arguably rests on performance evidence all the same. We have left it out, because taking your words at face value is the narrower reading and widening a rule on our own is how a gate starts demanding evidence nobody asked for. The item says on screen that cosmetic claims do not trigger it.

**(b) Where does "costing or commercial feasibility status" come from?** This Gate 5 item of yours is the last one in the system with no data behind it at all. The costing screen holds numbers — batch size, unit costs, target price — but nothing that says whether the costing is *finished*, and the numbers are present from the moment a project is created, so their existence proves nothing. To enforce this we would have to invent a status field and its values, which we would rather not do silently.

**Question:** (a) should a claim categorised Cosmetic trigger the product-performance evidence requirement, or only Product performance and Sensory? (b) What should "costing or commercial feasibility status" read from — a new status on the costing screen (and if so, which values, and who sets it), or something that already exists that we have missed?

---

## Summary

| # | Topic | Why it matters |
|---|---|---|
| 1 | Infant & Baby Safety content | Gap largely closed with the workbook's own Compartment 3 — confirm it is the right content |
| 2–4 | Superseding a formula version · defining "critical" gaps · PV/PMS scope | Open since 21 July; 2 and 4 block work we are ready to start |
| 5–7 | Gate 7 scope · Gate 4 threshold · unclassified claims | Already built on our reading — rework if wrong |
| 8–19 | Which record represents each of your trigger conditions, and two data-model points | Redesign if wrong, no rework |
| 20–27 | Whether the new Gate 1 fields are required at creation; priority values and required rows on the Phase 1 requirements table; how the two Gate 1 option lists are presented and whether several types may apply; two requirements we added ourselves that block Gate 2 and Gate 7;  a duplicate market field arising from an inaccurate premise we gave in B3; which target users imply a vulnerable group | Already built — rework if wrong |
| 28 | What kind of thing the Claims Library is, before we build it | Not built — the last dependency holding C1 back |
| 29 | Five points the per-gate sign-off answer leaves open | Not built — needed together with 18 before we can start |
| 30 | The claim-linkage and wording-adaptation rules, now built | Already built — rework if wrong; 2 parts deliberately left out |
| 31 | The import-stub and raw-material review rules, now built | Already built — rework if wrong |
| 32 | The watch-list reviewer trail at Gate 4, now built | Already built — closes a gap we reported ourselves |
| 33 | The critical safety finding control at Gate 7, now built | Already built — replaces an item that read the wrong evidence |
| 34 | Gate 11 grading open changes by impact, now built | Already built — replaces the duplicate warning you rejected |
| 35 | The per-market regulatory checklist at Gate 10, now built | Already built — replaces an item we had left unenforced |
| 36 | Cosmetic claims and evidence; where costing status lives | Two small gaps never put to you |

Questions 5 to 27 are all cases where we made a judgement rather than leave something unrecorded. We would rather have each confirmed or corrected than have them settle silently into the system.
