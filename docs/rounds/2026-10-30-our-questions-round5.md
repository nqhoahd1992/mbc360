# MBc360 — Follow-up questions, Round 5

**For:** the subject-matter team (NPD / Quality / Regulatory / Safety)

Every question here asks about the cosmetic product, its evidence, its claims or its approvals — nothing about how the software stores or locks data. For each one we have made a choice so that work could continue, the choice is running now, and we would rather you corrected it than have it settle in silently. Where a question is still unbuilt we say so.

Where we say "the software development team" we mean the team building this application — not the owner of any product development project.

Several questions have lettered parts. You can reply by number and letter, for example "3(a) — yes, 3(b) — option (ii)".

## What we need most, in order

1. **Questions 1–2** — two decisions that your answers on generated "not applicable" reasons and on the Change Control assessment lean on but did not cover.
2. **Questions 3–7** — already built on our own reading, or designed but not built. If we read you wrongly these need rework, so we would rather know early.
3. **Questions 8–10** — several turn on something you described — an approver with "the required Safety or Regulatory authority", a "controlled action" — that the software does not have; question 10 asks for a new design (whether a change reopens a gate that has passed).
4. **Question 11** — the largest structural question in this list, and the one we have deliberately stopped work on until you answer it.
5. **Questions 12–15** — change scope, register approval and "not applicable"; rules we are already running on our own reading.
6. **Questions 16–30** — further readings of ours, each small; most are one-line confirmations.
7. **Questions 31 and 34 — these take longer.** Question 31 asks you to mark a list of every register in the system; question 34 asks how the evidence standard should be enforced, and nothing is built for it yet. Questions 32 and 33 are short.
8. **Questions 35–42** — shorter points. Most are already built on our own reading: signing at Complete, Next Actions after a gate passes, and several places where we had to add something the Excel file does not have (a batch trace ID, an evidence-review column, several samples for the panel). Questions 38 and 40 propose a change we have not built: dropdowns for the change-reference boxes, and a company-wide list of proprietary-ingredient names.

---

## Question 1 — Which readiness items are "critical", and who is the "responsible reviewer" of them?

*Where in the application:* The **Gate N readiness** list (the "requirement(s) still blocking" panel) on each gate tab of a **Phase** page, where the auto-written "not applicable" reason and the Acknowledge button appear; the reviewer is the "Reviewed by" on that phase's **Sign-off** (close-out tab).

You wrote "Where the system can determine from controlled data that a condition does not apply, it may auto-generate the N/A reason" — and that users should not retype a reason the system already produced. That half is built and working.

The other half needed two things your answer did not name. For safety-, regulatory-, claims- or release-critical items you said the generated rationale "must still be acknowledged by the responsible reviewer before gate closure". So we need to know two things:

- **(i) which items count as critical**, and
- **(ii) who the responsible reviewer of an item is**.

You defined the roles precisely for a *gate* — prepared, reviewed, approved, with an independent function named for seven critical gates — but a single gate carries between seven and more than twenty items, and nothing ties one item to one person.

**One example, used throughout this question.** Gate 7 has the item *"Maternal (pregnancy / breastfeeding) caution assessment closed"*.

On a project whose target users are general adults only, nobody needs to do a maternal assessment, so the system writes the reason itself: *"not triggered for this project (no pregnancy, breastfeeding or postpartum target user), so this passes automatically."* Your answer means that for a safety item like this one, a reviewer must still read that sentence and acknowledge it before Gate 7 can close.

Everything below is about who that reviewer is, which items need it, and what happens afterwards.

**What is running now, on our own reading.** A generated N/A can only happen on the 31 items in the table below (they are the only ones that apply "only when" something is true; Mandatory items never get one, and Supporting items need no acknowledgement, because "the system-generated explanation alone is sufficient").

- **Which items are critical:** an item is critical when it sits on one of your seven critical gates (3, 4, 7, 8, 9, 10, 11). The seven gates are the ones you listed as critical gates when you described the three gate signatures, where they decide how independent the signers must be. Using the same list to decide which *items* are critical is our reading, not something you said, and it is a mechanical one — we did not judge item by item. It makes 18 of the 31 critical.
  *Example:* the Gate 7 maternal item above is critical, because Gate 7 is a critical gate. Gate 5's "Product form confirmed (left open at Gate 2)" is not (Gate 5 is not on your list), so when the form was confirmed at Gate 2 it simply passes by itself and nobody acknowledges anything.
- **Who acknowledges:** the person the project Lead nominated as **"Reviewed by"** on that item's *phase* sign-off.
  *Example:* Phase 3's sign-off lists the Quality reviewer as "Reviewed by". That person reads the Gate 7 maternal reason and either confirms it, or records that they do **not** acknowledge it (with a reason), which keeps Gate 7 on hold.
- **If the situation changes after an acknowledgement, the old acknowledgement stops counting.**
  *Example:* The reviewer acknowledged the reason above while Gate 7 was open. The project is then sent back to Gate 2 and Marketing ticks "Pregnancy" under the target users.

The reason the reviewer read is no longer true: the maternal assessment now genuinely applies, and that acknowledgement of "not triggered" cannot stand in for it — the item is then judged on the real evidence like any other.

A milder case: the system's wording of the reason changes while the item is still "not applicable"; the earlier acknowledgement covered the old words, so the reviewer has to confirm the new ones.

| # | Gate | Item | Is generated as "not applicable" when… | Critical? (our reading) | Second look? | Critical? (for you: Yes / No) |
|---|---|---|---|---|---|---|
| 1 | 2 | Product form left open — a controlled action tracks its confirmation at Gate 5 | the product form was confirmed at Gate 2 | No | |  |
| 2 | 2 | Infant & Baby Safety — intended infant-use context recorded | no infant use (Infant 0+ not a target user; family-use age groups exclude infants) | No | Reads as safety |  |
| 3 | 3 | Competitor or benchmark review where applicable | no development or change type is recorded, the request was not customer- or distributor-led and no benchmark product is named — or the change is confirmed administrative-only by a named reviewer | **Yes** | Reads as commercial, not critical |  |
| 4 | 3 | Regulatory review of high-risk or borderline claims | no claim meets any condition for Regulatory review | **Yes** | |  |
| 5 | 4 | Pregnancy/breastfeeding caution screen | no pregnancy, breastfeeding or postpartum target user | **Yes** | |  |
| 6 | 4 | Allergen, impurity and contaminant review where relevant | no raw material in the formula carries a risk flag | **Yes** | |  |
| 7 | 4 | Infant & Baby Safety — ingredient and raw-material suitability | no infant use | **Yes** | |  |
| 8 | 5 | Product form confirmed (left open at Gate 2) | the form was confirmed at Gate 2 | No | |  |
| 9 | 5 | Preservative strategy where applicable | the formula is not microbiologically susceptible (e.g. anhydrous) | No | Reads as safety |  |
| 10 | 5 | Infant & Baby Safety — formula-level assessment | no infant use | No | Reads as safety |  |
| 11 | 5 | Costing shows the project commercially feasible — this project is commercially dependent | target cost is not marked Must | No | |  |
| 12 | 6 | Infant & Baby Safety — packaging and instructions | no infant use | No | Reads as safety |  |
| 13 | 6 | Market-specific pack requirements | no selected market has special pack requirements | No | Reads as regulatory / release |  |
| 14 | 7 | Every automatic Formula BOM match is taken up on the Pregnancy/Breastfeeding Caution list | no pregnancy, breastfeeding or postpartum target user | **Yes** | |  |
| 15 | 7 | Maternal (pregnancy / breastfeeding) caution assessment closed | same | **Yes** | |  |
| 16 | 7 | Maternal and infant-contact assessment (when Skincare for Two is triggered) | same | **Yes** | |  |
| 17 | 7 | Infant / baby-contact safety compartment completed (INF-01 to INF-08) | no infant use | **Yes** | |  |
| 18 | 8 | Infant & Baby Safety — testing triggered by use context and risk | no infant use | **Yes** | |  |
| 19 | 8 | Human-study approval workflow completed before participant recruitment | no human study planned | **Yes** | |  |
| 20 | 9 | Preservative efficacy status where applicable | the formula is not microbiologically susceptible | **Yes** | |  |
| 21 | 9 | Scale-up or pilot status where applicable | no scale-up risk identified (and no Major formula change) | **Yes** | |  |
| 22 | 9 | Infant & Baby Safety — stability, microbiology and in-use testing | no infant use | **Yes** | |  |
| 23 | 10 | ASEAN PIF checklist complete | no ASEAN market selected | **Yes** | |  |
| 24 | 10 | ASEAN PIF mapped | no ASEAN market selected | **Yes** | |  |
| 25 | 10 | Infant & Baby Safety — PIF content and infant claim evidence | no infant use | **Yes** | |  |
| 26 | 10 | Product-performance evidence attached where relevant | no claim needs performance evidence | **Yes** | |  |
| 27 | 12 | Scheduled market feedback review | the product has launched in no market, or no post-launch review milestone has come due in a launched market and no safety or adverse-event issue has been recorded | No | |  |
| 28 | 12 | Baseline post-market surveillance review | the product has not launched in any market | No | Reads as regulatory |  |
| 29 | 12 | Enhanced PV/PMS review where applicable | none of the enhanced-surveillance conditions we can read applies — no safety signal, complaint or surveillance trend on Post-Market Sources and no vulnerable-user population assessed (we can read 10 of the 14 conditions you listed for enhanced surveillance) | No | Reads as safety / regulatory |  |
| 30 | 12 | Product-performance feedback | no performance, packaging, formula or quality issue is recorded, no product-optimisation proposal exists and no review is due | No | |  |
| 31 | 12 | Change-control links | no Change Control record is open | No | |  |

Gate 11 has no item of this kind.

**Questions:**

**(a) Which items are critical?** What the answer changes: for a **critical** item, on every project where its condition does not apply, the reviewer must acknowledge the generated reason, and the gate cannot close until they have. For a **non-critical** item nothing is asked of anyone — it passes by itself with the reason shown.

If the condition does apply, the item is judged on the real evidence either way. Please fill the blank column at the right of the table, **Critical?** (Yes / No), for each row. The column "Critical? (our reading)" is ours and is only there for comparison. Where our reading is right for every row, writing "agreed" is enough and the blank column can stay empty.

The "Second look" column shows where our gate-based rule and the wording of the item seem to disagree — those are the ones we are least sure of.
*For instance:* row 3, "Competitor or benchmark review" (not triggered because the project is neither new nor repositioned), sits on Gate 3, a critical gate, but is market research rather than claims. Should a reviewer really have to acknowledge it?

And row 29, "Enhanced PV/PMS review" (not triggered because no enhanced-surveillance condition applies), is on Gate 12, which is not on your list — yet it reads as safety / regulatory. Should it be critical?

**(b) Is the phase's "Reviewed by" the right person?** The alternatives are the reviewer of the individual *gate*, the owner of the review area the item's evidence belongs to, or a person named item by item.

If you want the acknowledgement to come from a specific independent function (for example Safety for a safety item), please say so, and we will then ask you which of your four areas (safety, regulatory, claims, release) each critical item belongs to — we do not need that classification otherwise.
*For instance:* on Phase 3 the "Reviewed by" is usually the Quality reviewer. The Gate 7 maternal item is a safety item, and you wrote "Safety decision reviewed/approved by Safety/Scientific Review" — we read this as the reviewer or the approver (one of the two) representing that function. Should the acknowledgement of that reason come from Safety instead of whoever reviews the phase?

**(c) Does an acknowledgement stop counting if the situation changes?**
*For instance:* the reviewer acknowledged "no pregnancy or breastfeeding user" while Gate 7 was open, then the project was sent back to Gate 2 and Marketing added a pregnancy user. Do you agree the earlier acknowledgement must stop counting — so the maternal assessment is then required for real — rather than remain as an approval of something that is no longer true?

**(d) When a company-wide list changes after a gate has passed, should that gate be judged on the list as it was, or on the list as it is now?** The Raw Material Risk Overlay, the market profiles (claim restrictions) and the Claims Library are company-wide lists that change over time.

What we propose: a gate that has passed stays judged on the list as it stood when the gate passed, so a later change to a list cannot silently alter a decision already made; a gate not yet passed is judged on the current list; and if the project is sent back, the list is taken again.

When a list changes in a way that touches a project's materials, markets or claims, the project shows a notice ("list changed since Gate N", with what differs), but nothing is blocked automatically.
*For instance:* at Gate 4 the reviewer acknowledged "no raw material in the formula carries a risk flag". Later Regulatory flags lavender oil as an allergen, and lavender oil is in the formula. Under our proposal Gate 4 stays as it was and the project shows a notice.

Do you agree — or must a new flag on a material in a product that has already passed Gate 4 send it back for review (and who decides that)? If you want a different rule for some lists, for example claim restrictions in a market, please say which.

## Question 2 — Change Control assessment of post-market findings: one entry per finding, and what counts as a "finding"?

*Where in the application:* **Phase 4** page, **Gate 12** tab, block "Change Control required for the post-market finding?" (list of entries); related page **Change Control & Communication**.

You asked for an explicit step — "Change Control required?", answered Yes / No / Pending assessment — with the reviewer, the date, the rationale, the linked Change Control record where the answer is Yes, and an evidence link, and you said "Pending assessment must block closure of the post-market finding". Built.

**Where we had to choose.** Your wording is in the singular ("the post-market finding") but does not say whether there is one assessment per project or one per finding. We first recorded **one answer for the whole project**. We have changed that to **one entry per finding**, because Gate 12 runs for years and per market, and a single answer cannot say which finding it was about.

*Example:* a product sold in Vietnam and Singapore. At the 3-month review, Vietnam shows a rising number of mild irritation complaints and Singapore shows one report of an allergic reaction. Now there are two entries. The irritation trend is answered **No** — reviewed by the Quality reviewer, reason "within the expected range".

The allergic reaction is answered **Yes**, and linked to the Change Control record opened for it. Before, a single answer for the project could not tell those two apart, and a "No" given at 3 months would still be sitting there at 12 months when something far more serious appeared.

**Why a Yes needs the link and a No needs a reason.** A Change Control that exists already shows who opened it. The assessment matters most when **nothing was opened**: it is the only record of whether somebody decided "no change control needed" or nobody looked. So the first field of each entry is the linked record, and a No carries its reviewer and reason.

**What we built.**
- Each entry has: the linked Change Control record, the answer, the reviewer, the review date, the rationale, the evidence link — and two fields **we added**: **Finding** (what the entry is about, required) and **Market** (optional).
- A Yes needs a valid linked record; a No needs the reviewer and the reason; a Pending (or unanswered) entry blocks Gate 12.
- **An empty list blocks, unless a Change Control record is already open on the project** (in that case the item applies and is judged on that record's own evidence). A review that found nothing needing a change control records one entry answered **No**, with the reason ("no finding this period needed a change control").

**Questions:**

**(a) One entry per finding — is that right?** Or should it be one per review (for example one at the 3-month review, one at 12 months), or one per market?

**(b) What is a "finding" in your process, and where does one come from?**
*For instance:* is a single complaint a finding, or only a complaint trend? Is a regulator's request one? An adverse-event report? A distributor's claim challenge? We only let the reviewer describe it in words; if you have a definition, we can offer a list instead.

*(A review that found nothing needing a change control is recorded as an entry answered **No** with its reason, never as an absence of entries — that is our own rule and needs no answer.)*

**(c) Are Finding and Market enough to tell the entries apart?** Or is there something else you would want on each (for example the source: complaint, safety signal, regulatory request)?

## Question 3 — Does a superseded safety finding need the same closing evidence as a closed one?

*Where in the application:* **Formulation Safety** page, table **Critical Safety Findings** (Status "Superseded", Finding ID / Superseded by columns).

You gave the safety-finding status list six values, adding **Superseded** to the five-step lifecycle. Separately you specified what closing a High or Critical finding requires: the safety reviewer's conclusion, an evidence link, the linked action completed, the verification, the verifier and a closure date. All six are now recorded and checked.

Superseded is not the same as closed. A finding is superseded when a later assessment of the same hazard replaces it — so its evidence arguably lives in the replacement, not in itself.

*Example:* in March a **High** finding is raised: "preservative level close to the limit in the trial batch". In May, a reassessment with new stability data produces a replacement finding: "within the limit". The March finding is marked **Superseded**. All the real evidence now sits with the May finding.

**What we built.** Two things, the first of which is our own addition (you did not ask for it):
- **A superseded finding must name the finding that replaced it.** "Superseded" can only be chosen once the register has another finding to point at, and the replacement is picked from the register's own Finding IDs, so it cannot point at itself or at nothing.
- **The cautious reading of your closure list** (High and Critical findings only): a superseded finding needs the same six things as a closed one, so that a High or Critical finding does not become passable just by being marked superseded.

**What that costs.** In the example, the March finding would still have to carry a safety conclusion, an evidence link, a completed linked action, a verification, a verifier and a closure date, even though the May finding already holds the evidence. A superseded row left incomplete blocks Gate 7. The completed action is the least sensible of the six for a replaced finding.

**Questions:**

**(a)** Does a superseded High or Critical finding need the same closing record as a closed one?

**(b)** If not, which of the six should still be required of it, now that it points at its replacement? *For instance:* only the safety reviewer's conclusion saying why it was replaced, plus the closure date — and nothing else.

## Question 4 — The two Gate 4 watch-list columns: what does each hold, who fills it, and until which gate?

*Where in the application:* Registers **Prohibited Ingredient Watch-list** and **Pregnancy / Breastfeeding Caution Limits** (columns Product status and the Gate 4 disposition / classification); also shown on the Gate 4 readiness list.

Three of our earlier questions turned out to be about the same two columns on the prohibited-ingredient and caution watch-lists: the **product status** and the **classification**.

**What exists now.** You said every row of the two watch-lists must be classified at Gate 4 (which rows Gate 4 covers is asked in question 33) as one of six: *No issue identified · Needs Safety Review · Needs Regulatory Review · Prohibited — remove · Considered — not selected · Further information required.* You also said "flagged" covers three statuses: *REVIEW — possible formula match · Needs Safety Review · Needs Regulatory Review.* "REVIEW — possible formula match" is in the flagged list but not in the six, and three of the six are not in the flagged list.

So we kept **two columns**: the product status (the older list, including "possible formula match") and the classification (your six).

**On the Prohibited Ingredients list the system now sets the product status itself:** when the formula matches a row it writes "REVIEW - possible formula match", and when the match goes away it puts the row back to "No formula match recorded"; any status a person has chosen is kept. On the Pregnancy / Breastfeeding Caution list the status is still entered by a person only.

**The classification is always entered by a person**; the system never writes a verdict. At Gate 7 a matching row that still sits at the status it started with ("No formula match recorded" / "Not assessed") blocks the gate. (The sheet's own work-status column, "Status", is a third column and is separate from both.)

*(Two separate columns — what the screening found, and what the reviewer decided — and the system flagging a formula match by itself on the Prohibited list are our own rules, so that nothing the screening found is overwritten or lost; they need no answer.)*

**(a)** Should the same automatic flag apply to the Pregnancy / Breastfeeding Caution list, where today a person updates the row?

**(b)** Until which gate is the product status updated? You wrote that Gate 4 screens and gives a conclusion for every row, and that "Gate 7 must then formally close every restricted or caution issue relevant to the final formula". It does not say where the product status is settled.

We read it as **Gate 7**: the reviewer columns (assessment, reviewer, date, rationale, linked action, evidence, classification) are Gate 4's, while product status keeps following the formula until Gate 7. If it were settled at Gate 4, any normal formula change afterwards would force the project back to Gate 4. Is Gate 7 right?

## Question 5 — Formula version supersession: who confirms the ten facts, and when does an old version change state?

*Where in the application:* **Formula BOM** page, card **Formula supersession (per market)**, and the **Formula version history** table (State column); a banner also shows on **Overview**.

**Built.** An old formula version reaches *Superseded* only once a person has confirmed all ten facts you listed, for **each market where that version is sold**; nothing derives it.

*Example:* the product is sold in Vietnam and Australia under formula **F1.0**. A Major change creates **F2.0**, and F1.0 stays *Active* (still on sale). In March F2.0 is approved for launch in Vietnam, so F1.0 moves to *Transition in Progress* (a state of the whole version, not of one market).

Now, for Vietnam, someone must record the last release date of F1.0, what happens to the remaining stock, which artwork and ingredient list change, whether the regulator was notified, the PIF update, the Sales and Marketing message, and so on. Only when all ten are confirmed does F1.0 become *Superseded* in Vietnam. Australia is decided separately.

**(a) Who confirms?** Your answer says "an authorised person" but not whose. We read it as **the project's Lead**: the Lead (or an administrator) confirms all ten for a market under their own name, while anyone with edit access may save a draft.

But the ten facts clearly belong to different functions — in the example, the stock belongs to Supply Chain and the regulator notification to Regulatory. Is one accountable person (the Lead) enough, or should each fact be confirmed by its own function?

**(b) When does the old version change state?** You wrote "Approval of the new version places the old version into Transition in Progress". We read "approval" as the new version's **launch approval in a market where the old version is sold**. So after a Major change the old version stays *Active* until then (as in the example). Is launch approval the right moment, or is it Gate 10 or Gate 11 approval?

**(c) A Minor change.** A Minor change reopens no gates, so we start the old version transitioning **at once** wherever it is sold, without waiting for a launch approval. Is that right?

**(d) A version that was never launched.** If the old version was never on sale anywhere, we mark it *Superseded* straight away, since there is nothing to transition. May it be treated that way?

**(e) Post-launch reviews.** While two versions are on sale in the same market, we keep the post-launch reviews **per market**, dated from the earliest launch still on sale there. Do the reviews need to be kept per version instead?

## Question 6 — Who decides that a change to a Claims Library entry is "critical"?

*Where in the application:* Company-level page **Claims Library** (menu "Company Reference Data"): Withdraw action and the **Affected claims** list.

**The library is built, which sharpens this question rather than answering it.** An entry needs both a Technical and a Regulatory approval before it counts as approved wording. Withdrawing an entry now requires a reason, an effective date and a transition plan, and lists every project claim, SKU, market and published record that depends on it, across all projects.

The affected claims then no longer count as covered by approved wording, so they go back to Regulatory review.

**What it does not do:** it does not take anything off a market, and it does not open a Change Control by itself. Your answer says a product must not be removed "unless the change is critical or required by Regulatory", and who makes that call is what is asked below.

You specified what happens when a library entry is changed or withdrawn: identify every linked claim, SKU, market and published material, assess the impact, raise change control where needed, flag material for re-review, and record the effective date and transition plan. Then: *"Changing/withdrawing must not automatically remove a product from the market unless the change is critical or required by Regulatory."*

That sentence can pull a product that is on sale, so we do not want to interpret it.

*Example:* the library entry "Hydrates for 24 hours" is used by 6 claims, on 3 SKUs, in Vietnam and Singapore, and appears on 2 published web pages. Regulatory finds the 24-hour test no longer supports the wording and withdraws the entry. We list all of those, and the 6 claims go back to Regulatory review. Nothing is taken off sale and no Change Control is opened.

Should the product be pulled in Vietnam because Regulatory says so? Who decides that this withdrawal is "critical"?

**(a)** Is "critical" here the top level of the Low / Medium / High / Critical scale you used for a gap's criticality, for safety findings and for Change Control?

**(b)** Who records it — Regulatory alone, or Technical and Regulatory together, the way you specified for approving a library entry in the first place?

**(c)** Your answer says to create a Change Control "where required". Should withdrawing or changing an entry open one automatically, or only when someone judges it necessary — and if so, who?

## Question 7 — The Gate 9 scale-up trigger: what are the eighteen areas for, and what is a "new formula"?

*Where in the application:* **Phase 3** page, **Gate 9** tab, block "Scale-up risk identified?" with the list of eighteen areas beneath it; the "new formula" test reads the **Phase 1** checklist **Development / Change Type** (Gate 1).

You made scale-up or pilot status mandatory for "new formulas, major reformulations …", and you listed eighteen areas that trigger a scale-up or pilot review — manufacturing site, equipment type or scale, batch size, order of addition, mixing speed, homogenisation, heating profile, hold time, filling method, water source and the rest.

It also adds a question, "Scale-up risk identified?", answered Yes / No / Pending assessment, where "Pending assessment should block Gate 9 readiness".

**What we built.** At Gate 9 the scale-up item applies when **any** of these holds: a Major formula change exists; the project's *Development / Change Type* at Gate 1 has **New development** ticked (primary or secondary); or the reviewer answered Yes. A blank or Pending answer blocks the gate. The eighteen areas are shown beside the reviewer's question as a reminder of what should prompt the review.

**(a) What are the eighteen areas for — a reminder, or data someone records?** They describe *changes*: a new factory, a batch going from 50 kg to 500 kg, a different mixing speed. Today they appear only as a list beside the reviewer's question, as a reminder. They are not an automatic trigger, for two reasons.

*Before Gate 9 passes.* The software has no field where such a change is recorded in a structured way (the only related thing is a free-text "Manufacturing site" column in one register).
*Example:* while Gate 6 is open, the production team moves the batch to another factory and raises the batch size from 50 kg to 500 kg. Nothing in the software says "factory changed". At Gate 9 the person answering "Scale-up risk identified?" reads the list beside the question, remembers or looks up what changed, and answers **Yes**.

They do not edit Gate 6 — that gate is closed by then — they answer Gate 9's own question.

*After Gate 9 has passed.* The gate is closed, so reading the list there would decide nothing. A change that arrives then is for Change Control: whether it reopens a gate that has passed is question 10.

Which do you want? **(i)** The list stays a reminder for whoever answers the question. **(ii)** It becomes something recorded when a change happens — for example areas ticked on a Change Control record — and Gate 9 switches the scale-up item on by itself when one is ticked.

**(iii)** The assessment itself becomes a list with **one entry per affected area**, instead of one Yes / No for the whole project. If (ii) or (iii), where should it be recorded?

*What (iii) would look like.* Each entry names the area (one of the eighteen), what changed (for example batch size 50 kg → 500 kg), the risk answer (Yes / No / Pending), the reason, the pilot or scale-up activity required, the evidence link, who assessed it and when.

"Scale-up risk identified?" for the project is then worked out from the entries: Yes when any entry is Yes, and Gate 9 stays blocked while any entry is Pending. An assessment that finds nothing is recorded as one entry answered No with the reason, not as an empty list.

We chose this shape for question 2 (one entry per post-market finding) because a single answer cannot say which change it was about; here the reason is the same, since a new factory and a different mixing speed carry different risks, different pilot work and different evidence. Your wording is a single question, so we have not built it — is one entry per area what you want?

If you choose (iii), two small points about the eighteen areas themselves.

First, they are not all of one kind: some are about the process and scale (site, equipment, batch size, mixing, heating, hold time), some are about the formula itself (formula composition, active or preservative concentration), and the last — "any change identified by Manufacturing, Quality or R&I as potentially affecting product performance" — is open-ended.

Should the entry's area be picked from one flat list, or from groups? Second, when someone picks that last open-ended area, should they describe the change in free text?

**(b) "New formula".** We read a new formula as a project whose *Development / Change Type* has **New development** ticked in any role; a major reformulation is already caught by a Major formula version. Does that match what you mean? Should a Reformulation that is not Major also count, and should a secondary tick count at all?

**(c) A "No" on a new development.** Because a new development always switches the item on, the reviewer's answer **No** is ignored for it: a new formula can never be declared free of scale-up risk. Is that what you intend?

## Question 8 — Where does the Safety or Regulatory authority to accept a watch-list finding sit: with the reviewer, or with the gate approver?

*Where in the application:* Registers **Prohibited Ingredient Watch-list** and **Pregnancy / Breastfeeding Caution Limits**: Reviewer assessment, Reviewer and Owner columns; plus the Gate sign-off for the Approver.

Your answer on the watch-list reviewer trail says a flagged watch-list finding may be carried under *Proceed with Conditions* where, among other conditions, *"The gate approver has the required Safety or Regulatory authority"*, and that *"A separate duplicate acknowledgement is not required"*.

Read literally, the person who signs the whole gate as Approver must hold Safety or Regulatory authority because of one ingredient. That makes a Safety or Regulatory specialist answerable for everything else the gate covers — formula, packaging, claims — and the project Lead who nominates the approver cannot know, when nominating, which findings will be open.

So we built it the other way, and we would like you to confirm it.

**The authority sits with the qualified reviewer who records the assessment.** Recording an assessment of *Non-critical* or *Further information required* (the two that let a finding be carried under Proceed with Conditions) is the acceptance, and it needs the authority the finding names: Safety for *Needs Safety Review*, Regulatory for *Needs Regulatory Review*, and for a finding raised after the formula screen (*possible formula match*) whichever function the row's Owner column names (either, if it names both or neither).

The Owner column is read as the Excel file intends it — the department responsible for the row, not a person — and the Reviewer is a person picked from the users who hold that authority, and only that Reviewer (or an administrator) records the two assessments. The gate is then signed as usual — the readiness list already checks every flagged finding.

**Example.** A formula contains an ingredient that the formula screen has flagged on the Prohibited Ingredients watch-list, with the status *Needs Safety Review*. On that row of the watch-list:

1. Someone picks the row's **Reviewer**. The list offers only people who hold Safety authority, because the status names Safety. A Regulatory specialist is not offered.
2. That Safety reviewer records the **Reviewer assessment** as *Non-critical*, writes the rationale and links a controlled action. This is what we mean by "accepting" the finding: it is a recorded conclusion on the row, attributed to that person, not a drawn signature and not an authenticator step.
3. At the gate, the readiness list checks every flagged finding. This one passes the check because it has a conclusion from a qualified reviewer, a rationale and a controlled action.
4. The gate's Approver is the project's overall approver and holds no Safety authority. The software lets that Approver sign *Proceed with Conditions*, because step 2 already happened on the row.

**What the software refuses.** Had a Regulatory specialist tried to record the assessment on that same row, it would have been refused, for two reasons: the row's status says the finding belongs to Safety, so a Regulatory specialist cannot be chosen as its Reviewer; and only the person chosen as Reviewer (or an administrator) can record the *Non-critical* or *Further information required* assessment.

If the row's Owner column named both functions, or neither, either a Safety or a Regulatory reviewer could have recorded it.

**What a "no" would mean.** If the authority must sit with the gate approver instead, every gate that carries a flagged finding would need an Approver holding Safety or Regulatory authority, and the Lead would have to know that when nominating — even for a finding raised later.

**Question (a):** is it right that this authority sits with the reviewer who records the assessment, rather than with the person approving the gate?

**Question (b):** should every kind of assessment on the gate need an authority of this kind, or only the two that let a finding be carried under Proceed with Conditions?

## Question 9 — What makes an action "controlled", and where do its owner and due date live?

*Where in the application:* **Gap assessment** block on a gate tab (when Stage status is Gap) and the **Next Actions** table on that tab.

You use the idea of a controlled action in several places — for gaps, for findings, for deferred requirements — each leaving something open. The same question for a Should or Could requirement that is deferred is in question 15; it only needs answering once.

**For a High gap.** First a distinction, because the phrase is used for two different records. A **finding** is a flagged row in a register (for example the watch-lists or the safety findings). A **gap** is the Gap assessment recorded on a gate when its status is Gap.

For findings, you are clear: *"A controlled Next Action is required for: Critical findings · High findings · Medium findings requiring corrective activity. Free text may describe the action but must not replace the controlled action record."* For gaps you have not said the same, so the rest of this paragraph is about gaps only, and we ask whether the finding rule should carry over.

You let a High gap be carried conditionally where, among other conditions, *"A controlled action and due date are recorded"*.

You have already said what a controlled action is: *"A controlled Next Action is created. The action has an owner, due date and escalation condition."* But the eight fields you listed for a gap give **Required action** and **Action owner** as ordinary fields and no date, which reads like the self-contained version.

So today the date half of the condition is **not enforced** — we have not guessed a ninth field, and the screen asks the user to put the date in the action text meanwhile. Should a High gap point at a tracked Next Action, as you describe it and as you already require for findings? And does the same requirement apply to Medium and Low gaps?

*Example:* a High gap says "stability data missing". With the Next Action reading, the gap links to a Next Action "Run 3-month stability, owner R&I, due 30 Nov, escalate if late"; the owner and date live there. With the self-contained reading, the gap's own *Required action* and *Action owner* fields hold it and there is no date anywhere.

*Quick choice:* **(1)** High gaps (and above) must link a tracked Next Action; Medium and Low stay free text · **(2)** every gap must link one · **(3)** the gap's own fields are enough, and a date is added to the gap · **(4)** other.

*(The product form left open at Gate 2 needs no controlled action: it is recorded in the *Confirmed product form* field, which is an explicit record that blocks Gate 5 until filled, so nothing is left to remember — our own decision, no answer needed.)*

## Question 10 — If a Change Control names a gate that has already passed, should that gate reopen?

*Where in the application:* **Change Control & Communication** page (Change Control Log, "Change trigger reference — affected gates & phases") versus the **Phase Gate Flow** table and gate warning markers on each phase page.

**A concrete case.** A cream project. Change Control **CHG-014**: trigger *Ingredient added or removed*, affected area *Formula / ingredient*, risk *High*, opened in August. A Change Control has no gate field typed by hand: the gates it affects come from its trigger, and for this trigger they are **Gate 05 and Gate 08**.

Gate 5 (formula lock) passed in March and Gate 8 (testing) in May; the project is now at Gate 10. A Change Control can only be opened after the earliest gate it names has passed (Gate 5 here), because its purpose is to correct something that was already locked there (the one exception is the "any change" trigger, which names every gate and can always be opened).

So this is the usual situation, not a rare one.

**What the screen shows today.** Gate 5 and Gate 8 both still say "Proceed", exactly as before, each with a small warning marker saying an open change affects it. Nothing else happens, and closing CHG-014 later does not touch either gate. Gate 5 says "formula locked and approved" while the formula is under review for change.

**Gates 11 and 12 behave differently, and we only noticed this while checking.** Gate 11 (release) has a check "no blocking change is open", and it reads the list of changes every time it is shown. So:
- Monday: Gate 11 is signed and passed.
- Wednesday: someone opens **CHG-021**, a High-risk change about the label, whose trigger names Gate 11.
- The check fails, and Gate 11 **stops counting as passed on its own** — nobody reopened it, and nothing records why.

Gate 12 does the same through its change-control check (we tested this on a project whose post-market review had been answered "No": the check passed, and failed as soon as a change was opened). Both were tested at the level of the check, not yet on a fully signed gate in the application.

| | Opening a Change Control against a passed gate |
|---|---|
| Gates 1 to 10 | the gate does not change; only a warning marker |
| Gates 11 and 12 | the gate stops counting as passed by itself, with no record of why |

This difference is an accident of how the checks were written, not a decision. Our own rule is that a gate that has passed must never stop counting as passed silently: whatever happens to Gates 11 and 12 will leave a recorded reason in the gate's history, so only Question A below needs your answer.

**Question — Gates 1 to 10.** When a Change Control names gates that have already passed (CHG-014 names Gates 05 and 08), what should happen to those gates?
- **(1) Only warn.** Reopening a passed gate stays a deliberate step a person takes (a Backtrack). Nothing happens behind anyone's back, but the change and the gate can disagree.
- **(2) Reopen the gates the change names.** Each such gate reflects reality, and the only decision allowed on it afterwards is "Proceed with Conditions". This would be the first time a single gate is reopened on its own; today a gate reopens only when a person chooses to, or when a Major formula change reopens a fixed block of gates together.
- **(3) Other.**

**If you chose (2), please also tell us:**
- *Which of the named gates?* CHG-014 names Gate 05 and Gate 08. Should both reopen, or only the earliest (Gate 05), with Gate 08 following once Gate 05 has been decided again?
- *Which changes?* Every change, or only some (for example only high-risk ones)?
- *If the change is then Rejected or Cancelled.* You wrote "Completed, Rejected, Cancelled and Superseded are treated as closed, provided the final disposition is recorded". Was the gate ever really affected? Either the gate must still be explicitly re-confirmed (never an automatic restore to what it said before), or a rejected change releases it.
- *Re-deciding.* Is "Proceed with Conditions" enough, or should it also need a written explanation or a named person?
- *Two changes on the same gate.* What happens when two open changes name the same gate?

**What is built today.** Nothing automatic happens to a passed gate in Gates 1 to 10. If you choose (2), we would reopen only the named gate and allow only "Proceed with Conditions" afterwards, unless you say otherwise.

## Question 11 — There are nine places a change gets written down. How many should there be?

*Where in the application:* **Change Control & Communication** page and the **Formulation Change Register (Final Approver Controlled)**, **Formula Change Control**, **Artwork Change Control**, **Released Label vs Current Artwork Register**, **Development Iteration Log**, **Ingredient Substitution Evidence**, **Product Family & Version Register** registers; **Formula BOM** version history.

This is the question we would most like answered, and the one we have stopped work on until you do.

**A situation.** The team raises a new **major** formula version. The software supersedes the previous version, reopens Gates 4 to 12 (the project-level Gate 10–12 records included) and cancels the phase approvals covering them, and it writes a line in the *Formulation Change Register* (numbered FC-001).

But it does **not** create a record in the *Change Control & Communication Log* (numbered CHG-001). So when Gate 11 asks "is any change open that affects release?", it looks only at the Change Control log, and it does not see the formula change at all.

**The nine places.** Counted through the Excel file rather than by impression, seven keep a record of a change that happened, and two list the *types* of change and who signs each:

| Records a change that happened | Lists the types of change |
|---|---|
| Change Control & Communication Log | Formula Change Control (five formula change types) |
| Formulation Change Register (Final Approver Controlled — the final approver is NP) | Artwork Change Control (five artwork change types) |
| Released Label vs Current Artwork Register | |
| Development Iteration Log | |
| Ingredient Substitution Evidence | |
| Product Family & Version Register | |
| Formula version history | |

(A tenth, Change Templates / Forms, is a list of which form to use — clearly different again.)

**What we can measure, rather than feel.**
1. **Two of these run in parallel and do not know about each other** (CHG- and FC- above). Because a major formula change takes the FC route only, four things that apply to every other change do not apply to it: the version cascade does reopen Gates 10 to 12, but with no Change Control record nothing **holds Gates 10 or 11** while the change is open; **Gate 11 does not weigh its impact**, although you wrote that Gate 11 "must evaluate the impact classification and closure status of each open Change Control"; it is closed by a single "Closed?" tick rather than the eight-part final disposition you specified; and it carries no impact classification, so nothing can mark it launch-impacting. The heaviest change the system knows about travels the route the change machinery cannot see.
2. **Two sheets do two jobs at once.** Formula Change Control lists five *types* of change, yet the same five rows also carry Old version, New version and Status, which belong to one particular change. Every ingredient change a product will ever have shares one Old version box, and the second overwrites the first.
3. **The sheets refer to each other by typed text.** At least five columns point from one change record at another (Change register ID, Change Control & Communication ID, Linked Change ID on two sheets, Artwork_Change_Control ref), and nothing checks that what is typed exists.

**Two readings of why there are so many sheets, and we would rather you corrected than accepted either.**
- **One record, shown several ways.** An Excel file has no other way to say "only NP approves this" or "show me only the artwork ones", so a separate sheet *is* the permission and the filter. The software has permissions and filtered views, so one record shown several ways might say the same thing without the duplication.
- **Several genuinely different records.** The three formula books may describe three stages: the *Development Iteration Log* (formula not yet locked), the *Formulation Change Register* (a change to a controlled formula, with its own questions about the six-month Vietnam re-registration and whether the market has been told, which mean nothing for a formula still being trialled), and the *Change Control & Communication Log* (any change of any kind). If that is how your team sees it, they are not duplicates, merging them would be a serious mistake, and the real question is where the boundary sits.

**A fact that bears on the second reading.** A new formula version can only be created while Gate 5 is the open gate, which is before the formula is locked. So every Formulation Change Register entry the software writes describes a change to a formula that is **not yet locked**.

A change after the lock cannot create a version or an FC entry; it needs a Backtrack to Gate 5 first. Today no rule keeps the Development Iteration Log and the Formulation Change Register apart, and in practice the controlled-change book receives only pre-lock entries.

**Questions**

**(1) One kind of change record, or several?** In how your team actually works, is there **one** kind of change record, or **several genuinely different** kinds? If several, which are different and what makes them different? Of the nine above, which are meant to list the *types* of change, and which to log the changes that actually happen?

And when one change affects the formula, the artwork and a claim at once, is that **one** record or several linked records, one per area?

**(2) Where is the boundary?** Is the dividing line between the Development Iteration Log and the Formulation Change Register the moment the formula is **locked at Gate 5** — trials before it, controlled changes after it? If it is something else, what?

**(3) The Final Approver's (NP's) approval.** The Formulation Change Register has twenty-one columns, as in the Excel file, and three are the Final Approver's: the commercial approval decision, its date and the sign-off.

The other eighteen (change ID, product, who requested it and when, the title, what changed and why, who changed it, the NPD, Regulatory, Manufacturing and Marketing & Sales actions, the Vietnam re-registration, whether the market needs telling and has been told, whether it is closed, the overall status, who acknowledged the communication) cover largely the same ground as what the Change Control log already keeps.

Is the register a book in its own right, or a view of the Change Control log filtered to formulation changes, with the Final Approver's approval as an authority exercised on the shared record?

**(4) What is a "valid Change Control record"?** You wrote *"If Yes, a valid Change Control record must be linked."* That used to be free text, so a typo or another project's record number satisfied it. It is now a choice from **this project's own Change Control records** (the CHG- numbers). Does a row of the Formulation Change Register (the FC- numbers) count as one?

And does "valid" require anything beyond existing, such as that the record is still open, or covers the right kind of change?

**What we are doing meanwhile:** nothing. We could make one of these the master book tomorrow and show the others as filtered views, and it would look tidier immediately. We are not doing that, because if two of these records really are different things, we would have to pull them apart again after they had been merged and filled with real data.

Nothing is blocked by waiting; the duplication is visible rather than dangerous, with the single exception in point 1, which we will fix without waiting: raising a Major formula version will always leave a Change Control record, so that the change-control side of the system sees it (our own rule, no answer needed).

## Question 12 — Does adding a market after Gate 1 reopen earlier gates?

*Where in the application:* The market list is entered on the **New Project** form (field "Countries / Markets", on the **All Projects** page) and in the **Phase 1** checklist **Target Countries / Markets**; each market then has its own track in **Market Regulatory & Launch Tracking (Gates 10-12)**.

When a change in scope reopens what was already decided. (Question 10 asks the same about Change Control.)

**Adding a market after Gate 1.** The markets are declared at Gate 1, and what a gate decided is normally read-only once it has passed — to change it, the project is sent back (a Backtrack).

You have treated a new market differently: *"may also trigger review of earlier gates where the new market has different ingredient, claim, packaging or safety requirements."* So today a market can be added after Gate 1 **without a Backtrack, and nothing is reopened**: the new market simply gets its own Gate 10–12 track.

Removing a market that has any history is refused; it is marked Withdrawn instead.

*Example:* a project is at Gate 9 with Vietnam and Singapore. Someone adds Australia. Today the project goes on exactly as before, and Australia starts at the market tracks. Nobody has looked at whether Australian rules on a preservative, a claim or the pack differ from the other two.

Which of these do you want? **(1) Keep it as it is** — add freely, nothing reopens. **(2) Adding a market means a Backtrack to Gate 1**, like any other change to what Gate 1 decided; every gate from Gate 1 onwards is then reopened for all markets, however similar the new one is.

**(3) Reopen only what differs:** the market is added without a Backtrack, but the gates where the new market has different requirements reopen. If (3): who decides that the new market "has different requirements" — for example Regulatory, when the market is added — and which gates does each kind of difference (ingredient, claim, packaging, safety) reopen?


## Question 13 — Is the "closing" approval on every evidence register the right shape?

*Where in the application:* The register-closing panel shown on every evidence register page ("closing for Gate N", Review owner and Co-sign signatures).

Every register shows a "Review owner · Co-sign" caption, but in the Excel file (and so in the first version of the application) it is only text — anyone could add, edit or delete a row regardless of whose name was shown.

The software development team (the owners of this application, not of any product development project) asked for a deliberate **closing** approval: the Review owner and the Co-sign each sign **for a gate**, after which the columns settled at that gate (and, on a free-form register, its rows) become read-only while columns a later gate still fills stay open, and a gate cannot pass until every register tied to it has been closed for it.

A few registers use the Excel file's own three-role sign-off block instead, with each role nominated by the project Lead. **It is built, on the software development team's instruction, before asking you** — this is a new rule, not something transcribed from the Excel file, and we would rather you corrected it now than have it settle in as though it were confirmed because it works.

**(a)** Should this apply to **every** register tied to a gate — today that is 70 of the 78 registers, ten of which are closed together with a related register's signature — or only to a smaller set that is genuinely meant to be a controlled record — the way a couple of registers already had their own dedicated approval step before this?

**(b)** Is **two** approvals (Review owner and Co-sign) the right number and the right pair of roles, or should some registers need different or additional approval?

**(c)** For some registers the Review owner and the Co-sign resolve to the **same person**, because no distinct Co-sign was ever named for that area — so "two approvals" is one person approving twice. We show a warning rather than blocking it. Should such areas get a distinct Co-sign? (Question 23 asks the wider question of when one person may hold two roles.)

## Question 14 — Can a Phase 2, 3 or 4 requirement row be marked "not applicable"?

*Where in the application:* **Phase 2, 3 and 4** pages: the requirement tables (Status column with "N/A — rationale required").

You gave the Phase 1 requirements table a third way to close a row: **N/A with a rationale**, because "The system must not require users to mark an empty requirement as Completed". That is built.

The same situation exists on the Phase 2, 3 and 4 requirement tables. Those rows come from the Excel file and are fixed, so a project can perfectly well have one that does not apply to it — the "compatibility / use-with constraints" row for a product with nothing to be used alongside, for example.

**What we built.** Seven of those tables (formulation design, efficacy and process, skincare for two, human study, stability and release, dossier evidence, change-control closure) offer the Excel file's own Status list, which includes **N/A**.

We gave them the same escape as Phase 1: choosing N/A asks for a written rationale, and a row marked N/A **with** a rationale counts as dealt with when a gate checks it. N/A without a rationale does not. The four Phase 3 compartment tables (pregnancy, breastfeeding, infant, swimmer) are not changed: their Excel file Status list has no N/A.

The one row that never accepts N/A is the Phase 1 "Must-have product requirements", which your answer calls always mandatory.

**Question:** is that right for Phase 2–4 — N/A with a rationale counts as dealt with — or should some of these rows be treated like "Must-have product requirements" and never accept N/A? If so, which ones?

**Separately, for the six Infant & Baby Safety sections** — several rows carry your own qualifiers ("where relevant", "where appropriate"), and the Gates 8–9 list is written as a menu ("Trigger by use context and risk") rather than a set of obligations. We gave those sections the N/A option for that reason. Is that right for them?

## Question 15 — Deferring a Should or Could requirement: who owns it, when is it due, and does every row need a priority?

*Where in the application:* **Phase 1** page, Gate 2 table **Project Requirements & Exclusions** (Priority, Owner, Status columns) and **Next Actions**.

You wrote that a **Should** or **Could** requirement "may be deferred only through *Proceed with Conditions*, with an owner and due date". The first half is built: Gate 2 will not accept a plain *Proceed* while such a row is unfinished, and *Proceed with Conditions* clears it.

**(a)** The second half has nowhere to go. A requirement row has an **Owner** column but no due date, and the Next Actions — which carry an owner, a due date and an escalation condition, which is what you describe as a controlled action — have no link to a requirement row.

Should a deferred requirement simply gain a due-date field on its own row, or should deferring it **create a controlled Next Action** pointing back at that row? If the second, we would also block *Proceed with Conditions* at Gate 2 while a deferred row has no such action against it. (Question 9(a) is the same choice for a High gap; one answer should settle both.)

**(b)** **Must every applicable requirement row carry a Must / Should / Could priority?** We have built it that way — a row that is neither N/A nor prioritised counts as unfinished at Gate 2. Our reasoning: your answer says every applicable row must be completed or formally deferred, and only a Should or Could row can be deferred, so a row nobody has ranked can be neither.

But your answer says which values the priority takes, not that every row must have one, so this is our reading rather than yours.

## Question 16 — The general restricted-and-caution screen: is this the right shape?

*Where in the application:* Register **General Restricted & Caution Assessment** (new), beside the two existing watch-lists **Prohibited Ingredient Watch-list** and **Pregnancy / Breastfeeding Caution Limits**, and the Gate 7 **Key Gate Check** "General restricted and caution ingredient assessment completed" on the **Phase 3** page.

You chose option (b) when we asked how Gate 7 should treat restricted-and-caution ingredients: Gate 7 needs a **general** restricted-and-caution ingredient assessment for every product, with the maternal screen as an additional conditional layer and the infant screen as a third. All three layers now exist.

Building it showed that two of the three were already there — the prohibited/restricted screen has always applied to every product, and the infant compartment was already conditional on infant contact. What was genuinely missing was general **caution**: every caution row in the system belonged to the maternal list. So that layer is new, and four choices in it are ours rather than yours.

**(a) The new screen starts empty.** The two existing watch-lists — the **Prohibited Ingredient Watch-list** (sheet `Prohibited_Ingredients` of the Excel file) and the **Pregnancy / Breastfeeding Caution Limits** (Excel file sheet `PB_Caution_Limits`) — ship twelve reference substances each because the Excel file lists them.

There is no equivalent list for general caution, and writing one ourselves would mean inventing regulatory reference data inside the system that exists to control it. Is that right, or does the company already have a general restricted/caution list that should be loaded in?

**(b) "We looked and found nothing" is recorded as a separate Key Gate Check row.** An empty screen cannot tell "this product contains nothing restricted" from "nobody has looked", so there is a new Gate 7 Key Gate Check row — *General restricted and caution ingredient assessment completed* — that has to be done, or marked N/A with a justification, before Gate 7 can pass. Is that the right way to record it?

**(c) It currently belongs to Gate 7 only.** You have Gate 4 screen every relevant candidate and Gate 7 formally close every restricted or caution issue. A restricted ingredient is usually found during ingredient screening at Gate 4, but a finding recorded on this screen does not appear at Gate 4 at all.

**Should this screen's findings also be dispositioned at Gate 4**, the way the other two watch-lists are — every row dispositioned, a reviewer trail on anything flagged?

**(d) Its five outcome values** — No issue identified · Within limit, evidence linked · Restricted, reformulate · Needs Safety Review · Needs Regulatory Review — are assembled from the two existing screens, not supplied by you. The last three block Gate 7.

## Question 17 — For claims, what are the publication channels, and when is a claim approved for a market and channel?

*Where in the application:* Registers **Publication / Deployment Record** (channel) and **SKU Claims / PIF Register** (intended channel and market). Both sit in the same menu group as the **Published Information Approval** page, but are separate pages from it.

**(a) The Publication / Deployment record.** You separated the two events cleanly — *"Approved for Release" means authorised for use*, and actual publication is its own record — and listed all seven things it must capture: the real publication date · **channel** · market · URL, file or artwork reference · published version · person responsible · withdrawal or supersession date.

Six of the seven have an obvious form.

**Channel does not have a list of values.** We have built one from the channels the Publication Approval Register already distinguishes (its own channel column is free text), plus the one your answer names outright (*"For printed packaging, the equivalent event may be Release to Print"*): Release to Print (packaging / label) · Website · Social media · Sales or distributor material · HCP or professional material · Retailer listing · Advertising · Other — specify in notes.

Does the company have a standard channel list? If so, what is on it — and is "Release to Print" one of the channels, or a different kind of event alongside them?

**(b) Approved for a market and channel.** You wrote that the intended channel and Regulatory review required "Belong on the SKU/market/channel claim-use record", and you hard-block artwork approval for a linked claim that is "Not approved for the market" or "Not approved for the intended wording or channel".

We read a claim as approved when its row on that record has status **Complete** (the sheet's own Status value) and its intended channel covers the channel used. Is Complete the right value, or is a different one needed?

## Question 18 — The claim review at Gate 3: "Not Approved", Technical review, and who approves a revision

*Where in the application:* **Evidence Plan & Claim Support** page, table **Claim -> Evidence Traceability** (columns such as "Technical review outcome", "Technical reviewer", "Technical review date"); Gate 3 readiness list.

**(a) A review outcome of "Not Approved".** You accepted four review outcomes but did not say which let a claim go forward. Only Approved and Approved with Conditions do now; Not Approved and Further Information Required block Gate 3 until the claim is reworded (which needs a new review) or removed.

May a claim reviewed as "Not Approved" remain on the project's claim list when Gate 3 passes — for example as a claim still in development?

**(b) Technical review of a new claim.** You said a new claim triggers Regulatory and Technical review. There was nowhere to record the Technical review, so we added the same five fields you accepted for the Regulatory review: outcome, reviewer, date, rationale and evidence link.

(The Technical review is not required when the claim is linked to an Approved Claims Library entry.) Does it need the same five fields, or something different?

**(c) Who may record that a revision is approved?** You freeze a claim revision once it receives "Regulatory or Gate 10 approval". The approval can now be recorded only by someone representing Regulatory or entitled to decide Gate 10, and only in their own name. Who is entitled to approve a claim revision?

## Question 19 — Gates 10–12 per market: withdrawn markets, and must every market be ready together?

*Where in the application:* **Phase 4** page, Gates 10-12 tabs: the per-market **Gate sign-off** panel and the **Market Regulatory & Launch Tracking** card; roll-up shown in **Overview** "Market readiness".

**(a) After a market is withdrawn, is a Gate 12 sign-off still owed there?** You have the Prepared, Reviewed and Approved sign-offs recorded per market for Gates 10 and 11, and Gate 12 post-market reviews also running per market. We gave Gate 12 a per-market signing slot as well.

Until now a withdrawn market kept its slot at every gate, so withdrawing from one country left Gates 10 to 12 blocked forever on a signature nobody would give. A withdrawn market now has **no** signing slot at Gates 10, 11 or 12. For Gates 10–11 and for supersession that seems certain — nothing more will be launched or transitioned there.

For **Gate 12** it is our reading: product already sold in that country may still need post-market follow-up after withdrawal. After withdrawal from a market, is that market's Gate 12 sign-off

- (i) no longer required,
- (ii) still required for a set period, or
- (iii) still required like any market where the product is on sale?

**(b) One gate for the project, or one gate per market?** Gates 1 to 9 run once for the whole project. From Gate 10 each market has its own track (regulatory, PIF, claims, launch) and its own Prepared, Reviewed and Approved signatures. But the project still has **one** row for each of Gates 10, 11 and 12, and three things work on the project as a whole:
- The row for Gate 10 or 11 passes only when **every** active market has its regulatory approval, its Gate 10 sign-off and its launch approval.
- The next gate opens only when the row before it has passed.
- The Gate 11 item reads "Gate 10 complete (signed off) for every active market".

*Example:* the product is ready in Vietnam — regulatory approval, PIF, Gate 10 signed, launch approved. Australia is still waiting for its regulator. Today Vietnam cannot sign Gate 11 until Australia has signed Gate 10, so a ready market waits for the slowest one. For Gate 11 you wrote "Gate 10 complete for the relevant market"; we read "relevant" as "every active", which is the narrower reading.

Which do you want? **(i)** As today: one gate per project, passed when all active markets are done. **(ii)** One gate per market: Vietnam goes through Gates 10, 11 and 12 on its own while Australia is still at Gate 10, and the project shows "some markets complete". The second is a larger change, because opening, locking and passing each gate would then work per market everywhere the application checks them.

## Question 20 — Gate 10 — which checklist and approval values count as done for a market?

*Where in the application:* **Phase 4** page, Gate 10: card **Market Regulatory & Launch Tracking** (Regulatory status) and register **Regulatory Checklist Status (per market)**.

**Which markets use which record.** A market in ASEAN (Brunei, Cambodia, Indonesia, Laos, Malaysia, Myanmar, Philippines, Singapore, Thailand, Vietnam) is covered by the **ASEAN PIF Checklist (Closure)** and the **ASEAN PIF / Dossier Map**.

A market outside ASEAN has no built-in checklist yet, so, as you wrote, it needs "a temporary Regulatory Checklist Status": one row per market in the **Regulatory Checklist Status (per market)** register. The values below are for those rows.

For the per-market regulatory checklist of Gate 10 you gave two separate value lists: the *checklist work status* — "Not Started · In Progress · Awaiting Information · Complete · On Hold · Blocked · N/A — rationale required" — and the *regulatory approval* by the authority — "Pending · Approved · Approved with Conditions · Not Approved · Withdrawn · N/A — rationale required".

You did not say which values let a market pass. We accept a checklist work status of **Complete** and a regulatory approval of **Approved** or **Approved with Conditions** (each, or N/A with rationale and reviewer). Every other value — Not Approved, Blocked, Pending and so on — blocks Gate 10.

One thing we found while checking: Gate 10 reads regulatory approval in two places. One is the **Regulatory Checklist Status (per market)** register (one row per non-ASEAN market, column *Regulatory approval*); the other is the **Regulatory status** column of the **Market Regulatory & Launch Tracking** card (one row per market).

The first accepts "Approved with Conditions"; the second has no such value, so a market approved with conditions cannot be recorded there and still pass "Regulatory approval in every active market". We will bring the second into line with your answer once you have given it.

**Question:** is "Approved with Conditions" enough to pass Gate 10? Must the checklist work status be "Complete", or is another status acceptable?

**Second question:** the **Regulatory Checklist Status (per market)** register holds **one row per market**, and the application now refuses a second row for the same market.

Can one market need **more than one** dossier row — for example one row per dossier type (you described Australia as product and ingredient compliance records, AICIS status, labelling and claim review, and a Product Master File)? If so, Gate 10 would require every row of that market to be done, not only the first.

## Question 21 — A commercially dependent project — which costing results allow a plain Proceed?

*Where in the application:* **Costing Calculator** page (menu item "Costing Calculator"), card **Commercial feasibility** (the costing status); the Gate 5 decision is on the **Phase 2** page.

You wrote "Where that commercial requirement is a Must, failure should result in Hold or Proceed with Conditions". We allow a plain Proceed only on "Commercially Feasible" (or N/A with rationale). "Feasible with Conditions", "In Progress" and "Not Feasible" all require Hold or Proceed with Conditions.

**Question:** do "Feasible with Conditions" and "In Progress" count as "failure" in the sense you meant there?

## Question 22 — Gate 12 — what shows product-performance feedback has been dealt with, and which signals bring a review forward?

*Where in the application:* **Phase 4** page, Gate 12 tab: **Post-launch review schedule** card and Key Gate Check "Complaints/issues triaged and CAPA/improvement actions assigned"; page **Post-Market / CAPA**.

**(a) What closes the item.** You gave five triggers but did not say what evidence closes the item. It is now satisfied when the Gate 12 check "Complaints/issues triaged and CAPA/improvement actions assigned" is complete. When performance feedback has been received, is it enough that it was triaged and actions assigned, or is a separate performance review needed?

**(b) Which signals bring a post-launch review forward.** You bring a review forward on "a significant adverse event, complaint trend, regulatory request or quality signal". We read these as:

- (i) a safety/adverse-event or quality issue recorded, or feedback whose source is a regulator. Nothing in the system records a complaint trend yet
- (ii) where should a trend be recorded? You count only a claim question "concerning actual performance", but nothing records what a claim question is about, so every claim question counts
- (iii) do you need claim questions about performance told apart from others?

## Question 23 — When may one person hold two roles on the same record?

*Where in the application:* (a) **Gate N sign-off** panel on a gate tab; (b) **Next Actions** table; (c) the new formula version dialog on **Formula BOM**; (d) phase **Sign-off** (close-out tab).

Four of our choices are the same question in different places — whether the person who did one step may also do the next. You name one pair explicitly.

**(a) The three gate signatures.** The three signatures on a gate are given in a fixed order — Prepared, then Reviewed, then Approved — so that no one approves work that nobody else has checked. The order alone does not stop one person taking the first and the last step; that depends on the different-person rules below.

You wrote that at every gate the reviewer must be a different authenticated person from the preparer, and that at the seven critical gates the reviewer or the approver must represent the independent function. It does not say whether the **approver may also be the preparer, or also the reviewer**.

You also wrote *"Where risk is low, the same person may prepare multiple gate records, but the reviewer or approver should be independent for safety-, regulatory-, claims- or release-critical decisions."* We read "multiple gate records" as the same person preparing **different gates**, not holding two roles on one gate.

Today the same person **may** prepare a gate and then approve it, with a different person reviewing in between — and since the approver's decision is the gate decision, that is a person approving work they prepared.

The same holds for the other pair: the same person may also review a gate and then approve it, so a gate can carry only two different people, or a reviewer's check and the final decision can come from one person.

(We had been refusing both and removed it, since neither answer asks for it, and a small team cannot always staff three people.) Should that stay allowed — everywhere, or only at gates that are not critical — or must the approver differ from the preparer, from the reviewer, or from both?

**(b) Closing an action.** You said the action owner should not be able to verify closure unilaterally "where independent confirmation is required" but not when that is.

We apply it to every action: closing or cancelling any action, whatever its priority, is limited to whoever raised it, the gate owner, or an authorised reviewer — which we have read as someone entitled to decide that gate. Are there actions an owner may close themselves? And who is the "authorised reviewer" of an action — a role, or someone named on each action?

**(c) Confirming a Major/Minor classification.** You wrote "The change initiator may propose the classification, but an authorised technical or quality reviewer must confirm it." The system records the person creating the version as the confirmer, and only lets them confirm if they hold Technical or Quality authority.

May one person — holding Technical or Quality authority — both propose and confirm, or must the confirmer be someone else?

**(d) The phase approval.** You wrote that the phase-level sign-off "should remain as an additional phase-closure approval". No phase is defined as critical, so independence between the three phase signers is shown as a warning, not enforced. Should it be enforced for any phase?

## Question 24 — A Critical action and the gate decision: what does it block, and for how long?

*Where in the application:* **Next Actions** table and **Phase Gate Flow** decision on each gate tab; "What's blocking Gate N" list.

**(a) Does an open Critical action block "Proceed with Conditions" as well, or only a plain Proceed?** You wrote "Critical actions must prevent normal gate closure." We have read "normal" as "any decision": while a Critical action is open, the gate cannot pass at all, even with Proceed with Conditions.

The other reading — a Critical action blocks only a plain Proceed, and Proceed with Conditions is the way through — is also possible. May a gate pass with Proceed with Conditions while a Critical action is still open? If so, does that need anything extra (a named approver, a recorded reason)?

**(b) Once a Critical action has been closed or cancelled.** You said that open actions may exist at a gate only under Proceed with Conditions and that otherwise all actions should normally be completed before the gate closes, and that Critical actions must prevent normal gate closure. Both speak about actions that are still **open**.

Neither says that a gate which once had a Critical action must use Proceed with Conditions even after that action has been closed or cancelled. We have therefore not added that restriction: once a Critical action is Closed or Cancelled it blocks nothing, and a gate with no open actions passes on a plain Proceed.

May the gate pass with a plain Proceed after that, or must it still use Proceed with Conditions because it once carried a Critical issue? Does a Critical action cancelled because it was raised by mistake count as having had a Critical issue?

## Question 25 — A market whose launch approval stands — may its PIF be reopened?

*Where in the application:* **Phase 4** page: card **Market Regulatory & Launch Tracking** (columns PIF status and Launch approval).

You confirmed that an incomplete PIF hard-blocks launch approval market by market, so launch approval depends on an approved PIF. The system now refuses to move a PIF off Approved while that market's launch approval is still Approved.

For example, Vietnam has PIF = Approved and launch approval = Approved, so the product is on sale there. After a formula change someone wants to set the PIF to "Under Review" to update it. Saving only that change is refused. It is accepted only if, **in the same Save**, the launch approval is also moved off Approved — that is, permission to sell is withdrawn for that market until the PIF is Approved again.

**Question:** when the PIF of a market already on sale must be updated (after a formula change, say), does its launch approval have to be withdrawn in the meantime?

## Question 26 — A deviation record when something is released without approval

*Where in the application:* There is no screen for a deviation yet. Today the nearest are **Published Information Approval** (release approvals) and **Post-Market / CAPA** (where incidents are logged).

You wrote "Releasing content without approval should generate a deviation or violation record." Inside the system, material cannot be **saved** as approved or released until every step is complete.

Two cases remain that the system cannot prevent, because publishing itself happens outside it: material published without ever entering the workflow, and material released correctly that later stops being valid (its claim is revised, its Claims Library entry is withdrawn, or its review date passes). For now such incidents are logged as a CAPA.

Our own rule is that each such incident gets a deviation record of its own, so that it is never lost inside a CAPA list; what is left for you is what that record should contain and do.

**Questions:** (a) Does blocking release inside the system meet the requirement for what happens in it? (b) What should the deviation record contain? (c) Should an open deviation block Gate 11 or Gate 12? (d) Should the system warn when released material is no longer valid?

## Question 27 — Who accepts a phase's pre-work?

*Where in the application:* Banner "Pre-work not reviewed" / "Accept pre-work" at the top of **Phase 2, 3 and 4** pages.

You wrote that early entries *"should be visibly marked Pre-work / Entered Before Gate Opened and retain the entry date and user"*, and that once the phase opens *"the responsible owner must review and formally accept or update the pre-work"*. **We have built the acceptance but not the marking**: acceptance covers the phase as a whole, and individual entries are not marked yet.

That is work we owe you, not a question; we mention it so you do not think it was overlooked.

What we need from you is the other half. We allow the phase's assigned review owner, or the project's Lead, to accept it, and only once the phase has opened.

**Question:** who should be able to accept a phase's pre-work?

## Question 28 — At which gate is each of these columns filled in?

*Where in the application:* (a) **Evidence Plan & Claim Support** page, **Claim -> Evidence Traceability** ("Evidence basis required"); (b) register **Stability, Compatibility & Release Evidence** ("Release decision").

Two columns where you said what is recorded but not at which gate.

**Why the gate matters: how the application locks data.** Every column of a register belongs to the gate at which it is filled in. When a gate is about to pass, the register is closed for that gate: the Review owner and the Co-sign sign it. That signature locks every column that belongs to that gate or an earlier one, and the columns that belong to a later gate stay open. A locked column can no longer be edited; correcting it means a **Backtrack** to that gate, which reopens it and every gate after it and cancels their sign-offs.

So the gate we attach a column to decides when it can no longer be changed. For example, a column attached to Gate 3 is locked when Gate 3 is closed. If at Gate 8 someone finds that its value was wrong, the project has to go back to Gate 3 and redo the sign-offs of Gates 3 to 8. A column attached to Gate 8 would simply still be editable at that point. Attached too early, a column is locked while people still need to change it; attached too late, it can still be changed after a gate has already relied on it.

(The watch-list "product status" column is the same kind of question and is in question 4(b).)

**(a) A claim's "Evidence basis required".** You added this field to every claim but does not say when it must be filled in. We use it to exempt some Cosmetic claims (a claim declared as ingredient-level evidence, or as no performance claim, may rely on ingredient evidence), and we require it at Gate 3, beside the preliminary evidence requirement. Is Gate 3 right, or should it be later — Gate 8 or Gate 10?

**(b) "Release decision" on the Stability, Compatibility & Release Evidence sheet.** You list a *"Release-readiness conclusion"* for Gate 9 and a *"Quality release pathway"* for Gate 11. The sheet has a "Release decision" column, and neither says at which gate it is filled in.

We read it as **Gate 11**: Gate 9 concludes that the product is ready for release, and the decision to release is part of Production and Launch, which is also where release is blocked market by market. So the stability and compatibility results belong to Gate 9, and the release decision stays open until Gate 11.

Is the release decision recorded at Gate 11, or at Gate 9 with Gate 11 only checking it again?

## Question 29 — What proves the approved artwork version at Gate 11?

*Where in the application:* Pages **Packaging Specs & Artwork Evidence** (Approval, Claim ID) and **Released Label Control**; Gate 11 Key Gate Check "Final formula/version, packaging and artwork approved".

You wrote that final artwork approval is *"Represented in the Packaging/Artwork Approval record, which must link every Claim ID on the artwork"*. In the software that record is the **Packaging Specs & Artwork Evidence** register (its Approval and Claim ID columns), and Gate 10 reads it.

At Gate 11, "Approved artwork version" is read from the **Released Label Control** register instead: each row must name the new label version and the new artwork file. That register also carries a "New label released to market?" answer (Yes / No / NA) and a market release date, which we do not check.

Gate 11 also has a Key Gate Check, "Final formula/version, packaging and artwork approved", that covers the artwork too.

**Question:** should Gate 11's "Approved artwork version" read the approval on the Packaging Specs & Artwork Evidence register, the Released Label Control register, or both — and is the Released Label Control register simply the market-release record, with the approval itself living only on the packaging record (the Key Gate Check then being the Gate 11 confirmation)?

## Question 30 — Where are a market's pack requirements recorded, and what closes the item?

*Where in the application:* Company page **Market profiles** (field "Pack requirements") and the Gate 6 Key Gate Check "Artwork/label needs and pack compatibility triggers identified" on the **Phase 2** page.

You made market-specific pack requirements mandatory where the market has specific requirements (language, warnings, ingredient declaration and so on), and wrote "Where no market-specific requirement applies, the user should record N/A with rationale."

**Where.** We added a "Pack requirements" field to Regulatory's market profile; if it is filled in for a market the project sells into, the item applies, and it is closed by the Gate 6 check "Artwork/label needs and pack compatibility triggers identified". Should Regulatory record these on the market profile like this? What should close the item?

*(A blank Pack requirements field on a market the project sells into will not be read as "no market-specific requirement": the item blocks until Regulatory has recorded either the requirements or N/A with a rationale — our own rule, consistent with your rule that "A missing assessment must never be treated as meaning the condition does not apply".)*

## Question 31 — Which registers may stay empty on a project, and which must always hold entries?

*Where in the application:* no single screen — applies across every evidence register (78); list them in **Gate Rules & Sheet Map**.

You wrote "If no claims are proposed, this must be explicitly recorded", which lets a product explicitly propose **no claims**, and Gate 3 accepts that. We then found that Gate 10 did not: it required the claims register to have entries, so a claim-free product passed Gate 3 and could never pass Gate 10. **We have extended your record to Gate 10** for those two registers.

That made us check every register in the system, because requiring entries in a register that can legitimately be empty only makes someone invent one — and leaving it empty, with nothing to show anyone looked, makes "nobody checked" look like "nothing to find".

Below is every one of the 78 registers, sorted by what the system **assumes today**. Please mark any row that is wrong. Rows marked ★ are the ones we are least sure about.

Two different things are called "gate" below, so each table labels its own. In groups A, A2, B and C the gate column is **the gate at which entries are needed**: the gate cannot pass before then. In groups D and E it is **the gate the sheet is tied to** — where the team works on it, which says nothing about whether any gate demands it.

Group D adds a column for which gates actually read the entries; group E has none, because no gate reads any of those sheets.

### A. Must hold at least one entry by the gate shown (13 registers)

The gate cannot pass while the register is empty.

| Register | Gate at which entries are needed | Note |
|---|---|---|
| Development Brief | 2 |  |
| Framed Scientific Research Questions | 2 |  |
| Vulnerable-User Assessment | 2 | an explicit "No vulnerable-user group identified" entry counts (as you asked for a general-adult project) |
| Competitor Product Register — Identity, Claims & IP | 3 | ★ no exception today for an administrative-only change |
| Supplier & Raw Material Evidence | 4 |  |
| Prospective Evidence Plan | 5 | ★ a product with no claims may not need an evidence plan |
| Packaging Specs & Artwork Evidence | 6, 10 |  |
| Ingredient-Level Safety Matrix | 7 |  |
| Detailed Test Protocol | 8 | ★ a product with no claims still needs safety and stability testing, but perhaps not a claims test protocol |
| Stability, Compatibility & Release Evidence | 9, 11 |  |
| Publication Approval Register (with Publication Rules, one page) | 10, 11 |  |
| GMP Links | 11 |  |
| Released Label vs Current Artwork Register | 11 |  |

### A2. Must hold one entry for each market that needs its own checklist (1 register)

| Register | Gate at which entries are needed | Note |
|---|---|---|
| Regulatory Checklist Status (per market) | 10 | one entry for every market **outside ASEAN** that the project sells into; markets covered by the ASEAN PIF checklist need no row, so a project selling only in ASEAN may leave it empty and still pass |

### B. May stay empty only if the project records "no claims" (2 registers)

| Register | Gate at which entries are needed | What lets it stay empty |
|---|---|---|
| Claim -> Evidence Traceability | 3 | the project records that it proposes **no claims** (claims check marked not applicable, with a reason) |
| SKU Claims / PIF Register | 10 | the same "no claims" record |

### C. May stay empty, but someone must confirm they looked (2 registers)

An empty register is a real answer here — a product with nothing restricted has nothing to list.

| Register | Gate at which the check is made | What stands in for rows |
|---|---|---|
| General Restricted & Caution Assessment | 7 | a Key Gate Check, "General restricted and caution ingredient assessment completed", must be done (or N/A with a reason). Any row that is added must have an outcome. |
| Critical Safety Findings | 7 | no row means no finding. The ten Final Safety Sign-off questions are what record that safety was looked at |

### D. Reference sheets with rows already in place (31 sheets)

The rows exist from the start; the team fills in the answer columns. The middle column says at which gate the sheet is worked on; the last column says which gate, if any, reads those entries.

| Reference sheet | Tied to gate (where it is worked) | Gate(s) that read the entries |
|---|---|---|
| ASEAN PIF Checklist (Closure) | 10 | Gate 10 (ASEAN markets) |
| Final Safety Sign-off | 7, 10 | Gate 7 |
| Pregnancy / Breastfeeding Caution Limits | 4, 7 | Gates 4, 7 (pregnancy / breastfeeding products) |
| Prohibited Ingredient Watch-list | 4, 7 | Gates 4, 7 |
| Protocol Setup | 8 | Gate 8 (human studies) |
| Target Product Profile (TPP) | 5 | Gates 3, 5 |
| ASEAN PIF / Dossier Map | 10 | none |
| Anatomy, Physiology, Exposure Science & Contradictory Evidence | 2 | none |
| Artwork Change Control | 6, 10, 11 | none |
| Backbone / Platform Technology | 5 | none |
| Carrier Review — Summary | 2 | none |
| Change Templates / Forms | any | none |
| Efficacy Assurance Control | 5, 8 | none |
| Evidence Hierarchy | — | none |
| Evidence Template Index | — | none |
| Formula Change Control | 5 | none |
| Fragrance Workflow | 7 | none |
| Landscape Decision Summary | 3 | none |
| Comparative Testing Protocol | 3 | none |
| Current Solutions & Standard of Care | 3 | none |
| Artwork / Label Review Checklist (on the Packaging Specs & Artwork Evidence page) | 6, 10, 11 | none |
| Literature-Search & Referencing Standard | — | none |
| Literature-Search Method | 2 | none |
| Safety / Medical Summary | 10 | none |
| PIF Evidence Closure (Workflow) | 10, 11 | none |
| Product / Project Identification | 4, 5, 8 | none |
| Product Safety Profile | 7, 10 | none |
| Publication Rules | 10, 11 | none |
| System Requirements | — | none |
| Transferability & Inference Rules | — | none |
| Twinkle 5 Claims Map | 3, 10 | none |

### E. No gate requires entries; may stay empty (29 registers)

| Register | Tied to gate (where it is worked) | Note |
|---|---|---|
| Carrier / Emollient System Review | 2 |  |
| Ready-to-Answer Pack | 10 |  |
| Needs -> Technology Traceability Matrix | 2 |  |
| Needs — Executive Brief | 2 |  |
| Mechanism & Claims Evidence Map | 3, 10 |  |
| Social Media & Marketing Campaign Register | 3, 11 |  |
| Development Iteration Log | 4, 5, 8 |  |
| Ingredient Monograph | 4, 5 |  |
| Ingredient Substitution Evidence | 4, 7 | ★ needed only if an ingredient was substituted |
| Team Feedback & Competitor Benchmark Notes | 4, 5, 8 |  |
| Formulation Change Register (Final Approver Controlled) | 5, 7, 10 |  |
| Potency & Process Control Evidence | 5, 8 |  |
| Product Family & Version Register | 5, 6 |  |
| Platform / Channel Rollout & Stock Confirmation | 6, 11 |  |
| Shipment Label & Batch Verification | 6, 11 |  |
| Eye Safety Evidence | 7, 8 |  |
| Fragrance / Allergen Log | 7 |  |
| Clinical / Human Evidence | 8, 10 |  |
| Efficacy Study Plan | 8 |  |
| Functional Efficacy Evidence | 8, 10 |  |
| Microbiology & PET Evidence | 8 |  |
| Participant / Sample Log | 8 |  |
| HCP / Distributor Efficacy Answer | 10, 11 |  |
| HCP Test Report Pack | 10, 11 |  |
| PIF Evidence Export | 10, 11 |  |
| Publication / Deployment Record | 10, 11 | ★ authorising material is not the same as publishing it; nothing requires this record to exist when material is published |
| Batch Formula Trace | 11 |  |
| MBc360 Feedback | — |  |
| Test Report Index | any | ★ reports may already be linked from other sheets |

**Questions:**

**(a)** Is each register in group A really one that **no project** can legitimately leave empty, and is the non-ASEAN-only rule in group A2 right (should a project selling only in ASEAN really need no market checklist row)? Which of them can, and what should stand in for entries (a confirming check, an explicit "none", or something else)?

**(b)** Is each register in group E really optional? Is there any that must hold entries at a particular gate — or whenever some other condition applies, for example an ingredient substitution record whenever an ingredient was substituted?

**(c)** For a product with **no claims**, and for an **administrative-only** change, which group-A registers still need entries? In particular the evidence plan (Gate 5), the detailed test protocol (Gate 8) and the competitor landscape (Gate 3), marked ★.

**(d)** Is it right that Gate 10's claims register is waived on the "no claims" record alone?

## Question 32 — Must a Change Control be declared before a new formula version is created?

*Where in the application:* **Change Control & Communication** page ("Open Change Request") and **Formula BOM** "New formula version" (only while Gate 05 is open).

When a formula changes, the application has two places to record it: a **Change Control record** and a **new formula version** on the Formula BOM.

**What your own list already says.** The Change Control page carries a list of triggers taken from your Excel file, and five of them are about the formula itself: *Ingredient added or removed*, *Ingredient percentage or active level changed*, *pH range or process changed*, *Supplier / raw material / manufacturer change* and *Fragrance / allergen / sensory change*. Each is tied to Gates 05 and 08. So a change to the formula is something Change Control is already meant to record.

**What runs today.** The two are independent. Creating a new formula version does **not** require a Change Control record, and opening a Change Control record does not create a version. So a formula can be changed in the application without anything having been declared in Change Control first.

**What we are asking.** Should the declaration come first — an approved Change Control record before the new formula version may be created? The Change Control screen tells people to open a record *"before the change is made, not after"*, and its status path (Draft → Submitted → Under Review → Approved, implementation pending → In Implementation → Verification Pending → Completed) suggests approval comes before the work. That wording and that reading are ours, not yours.

*(Question 11 asks whether Change Control and the formula books should be one book; this asks only about the **order**. A change that has already happened can still be recorded afterwards as a retrospective record, marked as such, which does not hold the gates — our own rule, because what happened must be recorded whenever it is discovered. No answer is needed on that.)*

**Question:** for a formula change, is an approved Change Control record a **precondition** for creating the new formula version, or is the version created first and the record written afterwards?

## Question 33 — Which gate checks which watch-list row: every row at Gate 4, or each row from the gate it is linked to?

*Where in the application:* Registers **Prohibited Ingredient Watch-list** and **Pregnancy / Breastfeeding Caution Limits**, column "Linked gate".

You wrote that Gate 4 classifies **every row** of the watch-list, and that the maternal list gets the same reviewer trail.

The Excel file, though, links each row of both lists to a gate in its own **Linked gate** column. On the prohibited list, ten rows are linked to Gate 4, Retinol to Gate 7 and Bisphenol S to Gate 6; all twelve 
rows of the pregnancy / breastfeeding list are linked to Gate 7.

We built it so that **a row is checked from the gate it is linked to onwards**: a row linked to Gate 4 is checked at Gate 4 and every later gate; a row linked to Gate 7 is first checked at Gate 7. We did not make it "only at its own gate", because then an issue left open at Gate 4 would no longer stop Gate 7.

The consequence is that at Gate 4 only ten rows of the prohibited list need a classification, and the pregnancy / breastfeeding list is not yet checked there; at Gate 7 all twenty-four rows are.

**Example.** A formula contains an essential oil, which is one row of the pregnancy / breastfeeding list. In the Excel file, that row's **Linked gate** column says **Gate 7**; it does not say Gate 4. So at Gate 4 nobody has to classify it, because Gate 4 does not check a row that is linked to a later gate. At Gate 7 the row must be assessed and closed, or Gate 7 does not pass.

**Question:** is it right that each row is checked only from the gate named in its Linked gate column, rather than every row at Gate 4?

---

## Question 34 — How is the Sheet 6 evidence standard enforced: which gate, which sheets, and what counts as done?

*Where in the application:* **Evidence Hierarchy & Search Rules** page (Sheet 6), plus **Needs & Scientific Basis**, **Competitor Landscape**, **Target Product & Tech Platform**, **Evidence Plan & Claim Support** and **Ingredient Monograph** pages.

The "Evidence & Search Rules" sheet says the standard is mandatory for Sheets 1–5 and every efficacy or claim sheet, and that **no need or claim may progress to formula or label without (a) an assigned evidence Grade, (b) a passed transferability check or an explicit inference flag, and (c) a complete, dated, linked search record.**

We have taken the rule as confirmed, but today **nothing in the software checks it**. The rulebook is a reference page that the five sheets link to, and each person applies it by hand.

Specifically: a claim can carry an evidence Grade (A–E, entered at Gate 8), but a claim with no Grade still passes every gate; there is no structured place to record the six transferability tests or an "inference" flag (Sheet 5, the Ingredient Monograph, has two free-text columns, "Does evidence transfer?" and "Inference vs proof", which no gate reads); and only Sheet 1 (Needs) has a literature-search table, which no gate reads.

We have deliberately not built anything until you say how it should work.

**(a)** Which gates are "progress to formula" and "progress to label"? Our reading would be Gate 5 (formula lock) and Gate 10 (release of published information).

**(b)** Which sheets does "every efficacy or claim sheet" include, beyond the five numbered ones (for example the mechanism-claims, functional-efficacy, clinical-evidence and SKU-claims sheets)? Does a **need** on Sheet 1 also need a Grade, or only claims?

**(c) Grade.** Should a claim be unable to pass the gate you name in (a) without a Grade? Should it be required earlier than Gate 8?

**(d) Transferability.** How should the result be recorded: six pass/fail answers (same active, dose, vehicle, exposure, endpoint, combination effect) or one "passes / inference only" flag? When any test fails, should the software refuse Grades A and B and require the "designed to" wording, as the rule says ("maximum Grade C")?

**(e) Search record.** A search record is the written trace of a literature search: where it was done, with what words, on what date, and what it found, so that someone else could repeat it. Your rule asks for a "complete, dated, linked search record" before a need or claim moves on.

Today only the **Needs & Scientific Basis** page has one: the table **Literature-Search Method**. It has five rows, one for each place searched: PubMed (scientific articles), Cochrane (systematic reviews), ClinicalTrials.gov (registered clinical trials), Espacenet / Google Patents (patents), and supplier or other non-journal material. Each row records the exact search words, the search date, what was included, what was excluded, and how many records were screened and kept. The other pages have no such table, and no gate reads this one.

**(e1) One record or several?** Is the single table on the Needs & Scientific Basis page enough for the whole project, or must each of the other pages (Competitor Landscape, Target Product & Tech Platform, Evidence Plan & Claim Support, Ingredient Monograph) keep its own record of what was searched for it?

**(e2) What makes a record "complete"?** Are the five items above enough (search words, date, what was included, what was excluded, number of records)? You wrote "linked": do you mean the record is linked to the need or claim it supports, or that it links to the articles found — each article's DOI or PMID (its identifying number) or its web address? There is no column for those today.

**(e3) Must all five places be searched?** Or is the record complete when it covers the places actually searched — for example, a product with nothing patented leaving the patent row empty?

---

## Question 35 — Must the gate's stage status be Complete before the sign-off can say Proceed?

*Where in the application:* **Gate N sign-off** panel on a gate tab (Proceed signature) and the "Stage status" column of **Phase Gate Flow**.

You listed *"Gate status and proposed decision"* among the things a signature attests to. So the stage status is part of what each of the three signers saw.

**The consequence.** If the three signatures are given while the stage status is still *In Progress*, and someone then changes it to *Complete*, the status the signers saw has changed, so **all three signatures go stale** and the three people must sign again.

**What we built.** On the sign-off screen, a signature that says **Proceed** or **Proceed with Conditions** cannot be given until the stage status is **Complete**. Hold or Backtrack can still be signed at any status, because they do not claim the work is done. This is a rule of the screen only; the underlying record does not refuse.

**Question:** is it right to require *Complete* before a Proceed signature? Or should signing be allowed at any status, accepting that a later change of status makes the signatures stale?

## Question 36 — Next Actions once a gate has passed: may carrying out an accepted condition leave the signatures valid?

*Where in the application:* **Next Actions** table on a gate tab, after the gate has passed, and the **Gate N sign-off** panel.

You said open actions may exist at a gate only when its decision is *Proceed with Conditions*; you also said Critical actions prevent normal closure, and who may close an action.

The list of open actions is part of what the three signers signed. If it changes in the wrong way, **all three signatures go stale**, and a gate that has already passed cannot be signed again. The only way out is a Backtrack.

Two related points are our own rules and need no answer. Both follow one principle: something important is only ever added to the record, never lost.

- **A problem found after a gate has passed is always recorded.** For example, Gate 5 has passed and two weeks later someone finds that a check belonging to Gate 5 was missed. It cannot be added as an action on Gate 5, because that would change the list the three signers signed. So it is recorded as an action on the next gate, Gate 6, and marked as found at Gate 5.
- **An action that is removed leaves a trace in the history.** The history keeps what the action said, who removed it and when, so an action cannot disappear without anyone knowing.

**Carrying out a condition.** You wrote that "the signature becomes stale/invalidated" if evidence within the signed snapshot changes, and that open actions may exist at a *Proceed with Conditions* gate (we read that as: tracked while they are worked off).

Read literally these two clash: closing a condition changes the open-action list and so would invalidate the signatures, and the gate could never clear its own conditions without a Backtrack. We read the open actions at signing as **the conditions that were accepted**.

So carrying them out — changing the status, closing, cancelling, changing the owner or the due date — does **not** make the signatures stale. Changing what a condition *says* does: its description, its gate, lowering its priority, removing it, or adding a new one.

After the gate has passed, a closed or cancelled action is frozen entirely, and an open one may only have its status, owner and due date changed.

**Question:** is it right that carrying out an accepted condition after signing does not require the three signers to sign again? If not, how should a *Proceed with Conditions* gate close its own conditions without a Backtrack?

## Question 37 — Which person on a project does each "Owner" function in the sheets stand for?

*Where in the application:* The "Owner" column of the fixed-row registers and phase tables; the people are chosen on the **New Project** form (**All Projects** page), one reviewer per review area.

The Excel file's fixed rows name a **function** in the Owner column ("Project owner", "R&I", "Regulatory", "Quality" …), never a person, because an Excel file has no project to take a name from. On a project, each function corresponds to one of the 13 review roles, and the person for that role is chosen when the project is created. The Excel file does not say which function is which role.

**What we built, for display only** (it changes no rule and no permission): the Owner cell shows the function and, beside it, the person assigned on that project: Project owner → Project Manager · R&I → R&I · Regulatory → Regulatory Affairs Manager · Quality → Production Support · Packaging → the packaging role (labelled "Sales Manager" on the New Project form) · Marketing, Sales → Project Lead (Sales & Marketing) · Procurement → Raw Material Coordinator · Formulation, NPD → Technical Services.

(These are the role labels as they appear on the New Project form.) A function with no match (Safety, Clinical, Claims, Finance, Legal, Manufacturing, Artwork …) is shown as written, with no person.

**(a)** Are those pairs right — in particular is the Project owner the Project Manager, is Quality the Production Support role, and is the packaging role really the one the form calls "Sales Manager"?

**(b)** Which review role do the unmatched functions (Safety, Clinical, Claims, Finance and so on) belong to, or do they have no fixed person?

## Question 38 — What does a "change reference" column point at?

*Where in the application:* **Released Label vs Current Artwork Register** ("Artwork Change Control ref") on **Released Label Control**; **Artwork Change Control** register; **Change Control & Communication** page.

This follows from question 11. In the Excel file several sheets have a column for the **reference** of a change — for example *Artwork Change Control ref* on the Released Label vs Current Artwork Register.

The *Artwork Change Control* sheet, however, is not a log of individual artwork changes: it is a fixed rulebook of five triggers, each a kind of event that calls for a label or artwork change. So there is no row for a reference to point at.

| Trigger | Examples in the Excel file |
|---|---|
| Artwork error discovered | Wrong wording, typo, ingredient list, warning, barcode or country text |
| Formula change affects label | INCI order, ingredient addition or removal, active level, allergen or fragrance |
| Regulatory or market update | A new country label requirement, warning, language or symbol |
| Marketing / claim copy change | New or revised claim, wording for healthcare professionals, website or leaflet |
| Released label / market image mismatch | The product image on sale, or the label shipped, does not match the current released label |

The real record of a change is the Change Control & Communication page (numbered CHG-001 and so on).

**What we built.** All of these reference columns are plain text you type. The only change was the label.

*Example:* a label is reprinted because a regulation changed. In the *Artwork Change Control ref* box someone types "CHG-014", or "regulatory update", or nothing at all, and nothing checks.

**What we would like instead.** We expect these reference boxes to be a **dropdown list** rather than free text, so that the data is exact: the person picks from a list and can only name something that exists, as the Batch Formula Trace reference already does (question 39). We have not built it because the list depends on your answer to (a): if the reference is the number of a Change Control record, the dropdown lists the project's Change Control records (CHG-001 and so on); if it only names one of the five triggers, the dropdown lists those five.

**(a)** Is "Artwork Change Control ref" the number of a Change Control record, or does it only say which of the five triggers this change belongs to?

**(b)** If it is a record number, do the other change-reference columns (the Change Control & Communication ID, the Change register ID and the two Linked Change ID columns) all point at that same record?

**(c)** Can one artwork change involve more than one change record?

## Question 39 — Batch Formula Trace: what identifies one row?

*Where in the application:* Register **Batch Formula Trace** and **Shipment Label & Batch Verification** (on **Released Label Control**).

In the Excel file, *Shipment Label & Batch Verification* has a "Batch Formula Trace ref" box you type into. As in question 38, we expect a reference box to be a **dropdown list** rather than free text, so that the data is exact and a reference can only name something that exists.

**Why we ask.** A dropdown needs something to pick by, and each pick must lead to exactly one row of Batch Formula Trace. The sheet has no column that does that on its own. It does have a **Batch / lot** column, typed by the person filling it in, next to the product / SKU, the formula version and the manufacturing date, and a batch / lot number is the code people already know from the pack. But a lot number can serve as the pick only if it appears on **one row only**. If one lot can appear on several rows, picking the lot does not say which row is meant.

**What we built.** Not knowing which is true, we added a **Trace ID** column (BT-001, BT-002 … generated by the software, one per row, never repeating, never typed), and the reference on the Shipment Label sheet is now a choice among those IDs. This column is our own addition and is not in the Excel file, and an old typed reference that matches no ID shows as empty until it is chosen again.

*Example (an illustration only):* a shipment of a cream is verified against the trace for batch 24B017. The verifier picks "BT-007" from the list instead of typing the batch number.

**What your answer decides.** If a lot appears on one row only, the Trace ID is redundant: we would remove it and make Batch / lot the value that cannot repeat and that the dropdown lists. If a lot can appear on several rows, we keep the Trace ID.

**Question:** in your production, can one batch / lot number appear on more than one row of Batch Formula Trace (for example one lot filled into several SKUs or pack sizes), or does each lot have exactly one row?

## Question 40 — The Artwork / Label Review Checklist: the five "Correct names for PI" rows, and at which gate it is required

*Where in the application:* **Packaging Specs & Artwork Evidence** page, table **Artwork / Label Review Checklist**.

The *Packaging Specs & Artwork Evidence* page now carries the sheet's **Artwork / Label Review Checklist**: the eight standard rows (seven review items and the one on tags for proprietary extracts on labels) in the sheet's own columns.

Beneath it the sheet has five "Correct names for PI" rows (PI = proprietary ingredient: an MBc ingredient sold under its own trade name, such as Salvotect™ or Stacregenix™) that sit under the same heading but use the columns differently: the Requirement cell holds an INCI name (for example *Salvia microphylla water extract*) and the Evidence link cell holds the trade name to print (for example *Salvotect™ (MBc Research Parks PI)*), with no Owner and no Status.

**What we built.** We joined the two cells into one requirement, "INCI name → name to print", and left the Evidence link empty so a person pastes a real link (a trade name in that cell would make the row look as if evidence existed). The table is a fixed list that locks at the same gates as the packaging component table (Gates 6, 10 and 11). No gate condition reads it yet.

**Why we doubt this fits.** The first seven rows are things to check, and each needs an Owner and a Status. The five name rows are a list to look up: which trade name to print for which INCI name. In the checklist they still carry a Status that means nothing, the label "Correct names for PI" is repeated five times, and the table counts thirteen items when the work to do is eight. The names also belong to the company, not to one project: the same Salvotect™ rule applies to every product, and a line like the one for Honey (*"changed from MBc Herbal Honey since 30 June 2026"*) shows that names change over time. Held inside each project, a change of name has to be made again in every project.

**What we would do if they are a reference list.** Keep the names in one company-wide list, maintained in one place with its history, like the other company reference lists (market profiles, the raw-material risk overlay, the Claims Library). The checklist would then keep one row, "Names of proprietary ingredients on the label match the company list", with an Owner and a Status like the others.

**(a)** Are the five name rows a **reference list** of names to print (as we think), or five items to be **reviewed** like the first seven, needing an Owner and a Status? If a reference list: who maintains it, and does a change of name (like the Honey one) apply to every product at once, or only to new ones?

**(b)** At which gate must this checklist be complete — in particular, is it required before "Final proof release"?

**(c)** Is the trade name written here the **standard** that claims and the label must match?

## Question 41 — "Incomplete — evidence review required": a visible hint, or a value a person can choose?

*Where in the application:* Register **Supplier & Raw Material Evidence**, column "Evidence review status".

You wrote that the record created automatically from Cosmetri "must be clearly labelled Incomplete — evidence review required", must not "default to Approved for Use", must appear in the readiness list, and must block Gate 4.

**What we built.** The *Evidence review status* column is **not in the Excel file**: that sheet has only an "Approved For Use?" box and a general "Status" column (Not Started, In Progress, Needs Review, Complete, Not Applicable, Blocked). We added the column ourselves to carry the states you described, because the general Status has no words for them. It starts **empty**, and an empty cell reads "Incomplete — evidence review required" as a grey hint.

Only two values can actually be chosen: *Conditionally accepted — controlled action open* and *Considered — not used in this formula* (the second is your wording; the first is the software development team's wording for your "Proceed with Conditions plus a linked controlled action").

Every other condition you set still holds: it is never Approved by default, it shows in the readiness list, and it blocks Gate 4. Earlier, "Incomplete — evidence review required" was a stored value that every new row received; it meant exactly the same as an empty cell plus the unticked *Approved for use* box, so we removed it.

**(a)** Does showing that text as the hint of an empty cell, rather than as a stored value in the list, satisfy what you meant by "clearly labelled"?

**(b)** Should this extra column exist at all, or are the sheet's own "Approved For Use?" box and "Status" column enough to show those states?

## Question 42 — Does a project test more than one sample with the internal panel?

*Where in the application:* **Product / Sample Feedback** page (sample under evaluation block and the feedback log).

The *Product / Sample Feedback* sheet draws **one** block for the sample under evaluation (product / SKU, product family, development stage, linked change ID, sample or batch code, formula version, date samples issued, panel coordinator) and one log of feedback — one row per tester per sample. Nothing in the log says which sample a row is about.

An Excel file shows data in a simple, flat form: one block and one log on a tab. It has no way to hold several samples inside one project, so the sheet cannot show a project that tests more than one. We therefore think the single block is a limit of Excel, not a sign that your team tests only one sample: the words "per sample" suggest that testing another sample means copying the tab, and the software has no equivalent of copying a tab.

**What we built.** A project can hold **several samples**. Each has the eight fields above (typed in), each tester's feedback belongs to one sample, and the totals and the list show the sample selected. A project with one sample behaves as before, and older feedback was gathered under one default sample named after the project's product.

*Example:* the formula is tested in two versions, F1.0 and F1.1, with a panel of 12. Two samples are created and each tester's answers are logged against the version they tried.

**(a)** Does a project test more than one sample with the internal panel? If so, are they usually successive formula versions, or several variants at the same time?

**(b)** Should each sample have its own log, or one shared log with a "sample" column?

**(c)** Should the sample's **Linked Change ID** point at a Change Control record (see question 38) or stay a code someone types?

---

## Summary

| # | Topic | Why it matters |
|---|---|---|
| 1 | Who the responsible reviewer of an item is | Blocks the acknowledgement half of the auto-generated N/A |
| 2 | Change-control answer once per project or per finding | Built on our reading — rework if wrong |
| 3 | Superseded safety findings | Built on our reading — rework if wrong |
| 4 | Gate 4 watch-lists: should the automatic flag also apply to the Caution list; until which gate is the product status updated | Built on our reading — rework if wrong |
| 5 | Formula version supersession: who confirms, and when the old version changes state | Built; confirmer and trigger moment are ours |
| 6 | Who decides a Claims Library change is "critical" | Designed, not built — it can pull a product from the market |
| 7 | Scale-up trigger: the eighteen areas, and what a "new formula" is | Waiting on the answer; depends on question 10 |
| 8 | Where the Safety/Regulatory authority to accept a watch-list finding sits: reviewer or gate approver | Built on the software development team's reading, differs from your wording |
| 9 | What a "controlled action" is for a gap; deferred requirements | Built partly; the date half of a High gap is not enforced |
| 10 | Should Change Control reopen a gate that already passed | Not built — and how it meets what you said about rejected changes (Gates 11 and 12 will leave a recorded reason, our own rule) |
| 11 | **Nine places a change is written down — how many should there be** (incl. the Final Approver's approval and which records count as valid) | **Work stopped until answered.** A major formula change never reaches the change-control side, so Gate 11 never weighs it |
| 12 | Does adding a market or a Major version reopen earlier gates | Built as "Major reopens 4–12; adding a market reopens nothing" |
| 13 | The two-approval "closing" act on registers | **Already built, before asking you** |
| 14 | Can a Phase 2–4 requirement row be N/A | Built: N/A with a rationale counts as dealt with, as in Phase 1 — which rows must never accept it? |
| 15 | Deferring a Should/Could requirement; whether every row needs a priority | 15(b) is running on our reading now |
| 16 | The general restricted-and-caution screen | Built; four choices ours, and (c) may be a real gap |
| 17 | Publication channels; when a claim is approved for a market and channel | Your answer lists the field but no values; ours is assembled |
| 18 | Claim review at Gate 3: "Not Approved", Technical review fields, who approves a revision | Built as above; ours |
| 19 | Gates 10–12 per market: withdrawn markets; whether every market must be ready together | Built as "no Gate 12 slot after withdrawal; every active market" |
| 20 | Gate 10: which checklist and approval values pass | Built as above; ours |
| 21 | Costing results that allow a plain Proceed | Placement of the two middle values is ours |
| 22 | Gate 12: what closes product-performance feedback; which signals bring a review forward | Built as above; ours |
| 23 | When one person may hold two roles on the same record | Removed two extra checks — a gate's preparer, or its reviewer, may now approve it |
| 24 | A Critical action and the gate decision | Built as "open blocks every decision; closed blocks nothing" |
| 25 | A market whose launch approval stands — may its PIF be reopened | Built as "launch approval must not stay Approved" |
| 26 | What a deviation record should contain when something is released without approval | Not built — the record itself is our decision; you said only that releasing content without approval "should generate a deviation or violation record" |
| 27 | Who accepts a phase's pre-work | Built as "phase review owner or project Lead"; the per-entry marking you asked for is owed |
| 28 | At which gate the claim evidence basis and the release decision are filled in | Built at Gate 3 and Gate 11 |
| 29 | What proves the approved artwork version at Gate 11 | Gate 11 reads a different record from the one you named for artwork approval |
| 30 | Where a market's pack requirements are recorded, and what closes the item | Built on the market profile |
| 31 | Which registers may stay empty on a project and which must always hold entries (all 78 listed with today's assumption) | Gate 10 claims register fixed on our reading; the rest are our assumptions for you to mark |
| 32 | Is an approved Change Control a precondition for a new formula version | Nothing enforces an order today |
| 33 | Which gate checks which watch-list row: every row at Gate 4, or each from its Linked gate | Built on the software development team's reading, narrows what you wrote about Gate 4 |
| 34 | How the Sheet 6 evidence standard (Grade, transferability, search record) is enforced: which gate, which sheets, what counts as complete | Not built — nothing checks it today; the rulebook is a reference page |
| 35 | Must the stage status be Complete before a Proceed signature | Built on the sign-off screen only; otherwise a later status change makes all three signatures stale |
| 36 | May carrying out an accepted condition after a gate has passed leave the signatures valid | Built as "conditions can be worked off without re-signing" |
| 37 | Which project person each "Owner" function stands for | Display only; eight pairs are ours |
| 38 | What a "change reference" column points at (Artwork Change Control ref and the others) | Plain text today; we expect a dropdown, and what it lists depends on your answer |
| 39 | What identifies a Batch Formula Trace row | We added a generated Trace ID that is not in the Excel file; whether it stays depends on whether one lot can appear on several rows |
| 40 | Whether the five "Correct names for PI" rows are a company-wide reference list, and the gate the Artwork / Label Review Checklist is required at | Built as a fixed list locked at Gates 6, 10, 11; no gate reads it yet; we propose a company-wide list |
| 41 | Is "Incomplete — evidence review required" enough as a hint on an empty cell | Built that way; replaces a stored value. The column itself is not in the Excel file |
| 42 | Does a project test more than one sample with the internal panel | Built as several samples per project |

Questions 2 to 5, 8, 11 and 12 are cases where we made a judgement rather than leave something unrecorded. We would rather have each confirmed or corrected than have them settle silently into the system.
