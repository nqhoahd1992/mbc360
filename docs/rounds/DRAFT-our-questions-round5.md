# MBc360 — Follow-up questions, Round 5

> ## ⚠️ DRAFT — NOT SENT
>
> **This file is still being written and will keep growing.** It is the sendable version of the internal list in `../rules/F1_Per_Gate_Open_Questions.md` → Round 5.
>
> **Project owner's decision, 2026-08-24:** send this only after all 36 Round-4 answers have been worked through, because until then the list is still moving. Round 4 proved the point — it was drafted on 9 August and sent on the 12th, and in those three days the act of building the answers produced nine more questions. Six of the sixteen below appeared the same way — while writing the code, running a test, or using a page an hour after building it.
>
> **Rename this file to `YYYY-MM-DD-our-questions-round5.md` on the day it is sent**, and do not edit it afterwards — that is what makes this folder evidence rather than documentation.

**For:** the subject-matter team (NPD / Quality / Regulatory / Safety)

Thank you for the Round 4 answers. They were complete enough to start building immediately, and ten of the thirty-six are already finished. This list is what that building surfaced, plus four items left over from the phase sign-off work in August.

Every question here follows the same pattern as last time: we have made a choice so that work could continue, the choice is running in the software now, and we would rather you corrected it than have it settle in silently. Where a question is still unbuilt we say so.

You can reply by number, for example "3 — option (b)".

## What we need most, in order

1. **Questions 1–3** — three decisions your Round-4 answers depend on that the answers themselves did not cover. They are holding back the largest remaining piece of work.
2. **Questions 4–6** — already built on our own reading. If we read you wrongly these need rework, so we would rather know early.
3. **Questions 7–9** — designed but not yet built. A wrong answer costs a redesign, not rework.
4. **Questions 10–12** — the phase sign-off work from August, still open.
5. **Questions 13–16** — smaller, but two of them name something your own answers assume exists and the software does not have.

---

## Question 1 — When nobody has recorded the information a condition depends on, where does that get said?

In Round 4 you answered that a missing assessment must never be read as meaning the condition does not apply, and that "not yet assessed" must block. That is now built and it closed a real hole: a formula nobody had classified used to pass both the preservative-strategy and preservative-efficacy requirements automatically, which is the case you named yourself.

**What we could not finish.** Of the ten conditions the system evaluates, only three can currently say "not yet assessed":

- the formula's microbiological classification, because it starts empty and only a person fills it in — this is the shape that works;
- two new fields your Round-4 answers created, for change control and for human studies.

The other seven are worked out from a table — the target users, the markets, the declared claims, the development type, the post-market sources. For those, **an empty table and a considered "no" look identical.** A project that has recorded no target users and a project whose team has confirmed there is no pregnancy or infant use produce exactly the same answer today.

**What we would do without an answer.** Treat "the table is completely empty" as not-yet-assessed, and "the table has entries but none match" as assessed-and-does-not-apply. That needs no new fields. But it would mean a newly created project is blocked at several gates until someone opens each table, which is a real change to how a project starts, and it is a rule of ours rather than yours.

**Question:** for a condition worked out from a table, should an empty table count as **not yet assessed** — blocking until someone confirms? Or does each one need its own explicit place for a person to record "checked, does not apply"? If the second, would that sit better as a Key Gate Check row per condition, or as a field on the table itself?

## Question 2 — Who is the "responsible reviewer" of a single readiness item?

You answered that where the system can work out from controlled data that a condition does not apply, it may generate the N/A reason itself — and that users should not retype a reason the system already produced. That half is built and working.

The other half we cannot build yet. For safety-, regulatory-, claims- or release-critical items you said the generated rationale "must still be acknowledged by the responsible reviewer before gate closure". Nothing in the system says who the responsible reviewer of an individual item is. Your sign-off answer defines the roles very precisely for a **gate** — prepared, reviewed, approved, with the independent function named for critical gates — but a single gate carries ten to twenty items.

Three readings, with quite different amounts of work:

1. **The gate's reviewer** acknowledges all of that gate's auto-generated N/As at once. Cheapest, and it fits the fact that your four words "safety-, regulatory-, claims- or release-critical" are the same four you used about gates.
2. **The owner of the review area** the item's evidence belongs to — the system already records those thirteen people per project. Closer to the plain meaning of "responsible", but an item that reads several registers has several owners.
3. **A person nominated per item.** Most precise, most work, and nowhere to record it today.

**Question:** which of the three? And is "a critical item" the same thing as "any item on a critical gate", or a property of the individual item?

## Question 3 — How much does a gate's signed evidence snapshot cover?

Your sign-off answer settled the shape completely, and we are grateful — it is the largest single piece of work left. One thing is still ours to decide, and it decides how the whole mechanism behaves.

You said the signed record is a gate-specific evidence snapshot, and listed eight things in it. Three of those eight are open-ended: "applicable checklist results", "mandatory and triggered evidence-register states", and "evidence links and document revisions". At Gate 10 that could mean around fifteen registers of several dozen rows each.

This matters because of the rule you attached to it: if evidence inside the snapshot changes after a signature, the signature goes stale and the system must say **what** changed. The wider the snapshot, the more often a signature goes stale — and a signature that goes stale every time anyone edits anything nearby is one people learn to ignore.

**What we would do.** Snapshot exactly what the gate's own readiness checks read — every condition the gate is judged on, and the value each one read. The boundary is then defined by the gate's own rules, so it cannot drift from "what actually blocks this gate", and "what changed" becomes a simple comparison. The cost: a register column that no readiness check reads could change without any signature noticing.

**Question:** is that boundary enough, or must the snapshot cover the full contents of every register the gate touches, including columns no rule reads?

## Question 4 — Is "is a change control needed?" answered once for the project, or once per finding?

You asked for an explicit step — Change Control required? Yes / No / Pending assessment — with the reviewer, date, rationale, the linked record where Yes, and an evidence link. Built, and Pending now blocks, as you specified.

**Where we had to choose.** Your wording is "must block closure of the post-market finding", in the singular, which suggests one answer per finding. But the system has no record that represents a post-market finding:

- the Post-Market / PV-PMS Feedback Sources table records **which sources** apply, not individual findings;
- CAPA records are the resulting **actions** — and your own answer to a different question said CAPA is a resulting action, not a source;
- the panel feedback register is internal product testing, not post-market.

**What we built.** One answer per project, blocking the Gate 12 review closure — which is the nearest thing the system has to "closure of the post-market finding", since Gate 12 *is* the post-market review closure.

**What that costs.** If a project has five findings and only one needs a change control, a single Yes/No cannot express that. The alternative is inventing a "post-market finding" record, which nobody asked for, in the same area where your Round-4 answer says the sixteen-option source list should be split into three — so it would very likely be built twice.

**Question:** should this answer be recorded **once for the project**, as it is now, or **once per post-market finding**? If per finding, what constitutes a finding — is it the record that would come into being when the sixteen-option list is split?

## Question 5 — Does a superseded safety finding need the same closing evidence as a closed one?

You gave the safety-finding status list six values, adding **Superseded** to the five-step lifecycle. Separately you specified what closing a High or Critical finding requires: the safety reviewer's conclusion, an evidence link, the linked action completed, verification, the verifier and a closure date.

Superseded is not the same as closed. A finding is superseded when a later assessment of the same hazard replaces it — so its evidence arguably lives in the replacement, not in itself.

**What we built** — the cautious reading: a superseded finding needs the same conclusion and evidence link as a closed one. A High or Critical finding should not become passable just by being marked superseded, and if it genuinely was replaced, saying so is one sentence.

**What that costs.** A superseded row left blank blocks Gate 7 indefinitely until someone fills it in, and asking for an "evidence link" on a finding that was replaced reads oddly.

**Question:** does a superseded safety finding need the same closing record as a closed one? If not, should it instead point at the finding that replaced it?

## Question 6 — Do the six Gate 4 dispositions replace the current status list or extend it?

Two of your Round-4 answers land on the same column, and they do not quite line up.

You said every row at Gate 4 must be classified as one of six: *No issue identified · Needs Safety Review · Needs Regulatory Review · Prohibited — remove · Considered — not selected · Further information required.*

You also said "flagged" covers three statuses: *REVIEW — possible formula match · Needs Safety Review · Needs Regulatory Review.*

**"REVIEW — possible formula match" is in the flagged list but not in the six.** And three of the six — No issue identified, Considered — not selected, Further information required — are not in the flagged list. Today one column holds both ideas.

Two ways to read it:

- **(a)** The six replace the current list, and "possible formula match" becomes the automatic *result of the screening check* rather than something a person chooses — so two columns: what the system found, and what the reviewer decided.
- **(b)** The six are the full new list, "possible formula match" joins them as a seventh, and "flagged" is simply a subset.

(a) is cleaner — the machine finds, the person decides, and those are two different facts — but it means moving existing data. (b) is cheaper and leaves one column doing two jobs.

**Question:** do the six values **replace** the current status list or **extend** it? And is "possible formula match" a system-generated result or a person's choice?

## Question 7 — Who signs the decision to supersede a formula version?

You specified that an old formula version becomes Superseded only after an authorised person confirms ten things for the relevant market, and that this "must be recorded by a person — never inferred automatically by the system". We have not built it yet.

Those ten facts sit with different functions: the regulatory notification with Regulatory, the last release date with Quality, the stock disposition with Supply Chain, the Sales and Marketing communication with Sales, the artwork transition with Packaging.

**Question:** is the supersession decision **one signature** — and if so, whose — or a multi-role block like the Prepared / Reviewed / Approved sets? And does it need the second authentication step that phase sign-off now uses?

## Question 8 — Who decides that a change to a Claims Library entry is "critical"?

You specified what happens when a library entry is changed or withdrawn: identify every linked claim, SKU, market and published material, assess the impact, raise change control where needed, flag material for re-review, and record the effective date and transition plan. Then: *"Changing or withdrawing must not automatically remove a product from the market unless the change is critical or required by Regulatory."*

That sentence can pull a product that is on sale, so we do not want to interpret it.

**Question:** is "critical" here the top level of the Low / Medium / High / Critical scale your other three answers agreed on? And who records it — Regulatory alone, or Technical and Regulatory together, the way you specified for approving a library entry in the first place?

## Question 9 — Which affected areas should the Gate 9 scale-up trigger read?

You listed eighteen areas that trigger a scale-up or pilot review — manufacturing site, equipment type or scale, batch size, order of addition, mixing speed, homogenisation, heating profile, hold time, filling method, water source and the rest.

We have built the other two limbs of that answer: a Major formula change triggers it, and so does the reviewer's own Yes / Pending answer. The eighteen areas are not read yet, because they belong on the change control record — and your Round-4 answers are also restructuring that same record (a fourth severity level, an eight-part final disposition). Adding another list to it now would mean doing it twice.

**Question:** are those eighteen areas a list someone ticks on the change record, or are they guidance for the person answering "was a scale-up risk identified?" If they are a list, should it sit beside the impact classification you specified for Gate 11, or replace the free-text "affected area" field the record has now?

## Question 10 — Who nominates the people who sign a phase, and who may withdraw a signature?

*(Outstanding from 20 August.)* The phase sign-off block now works like this: the project's Lead nominates one person per row; only that person may sign it, as themselves; and the Approved-by row additionally requires the permission to approve that phase.

Three points are ours, never put to you:

**(a)** The Lead is matched **by name**, because that is what the project record stores. Two people with the same name would both be able to nominate.

**(b)** **Only the signer may withdraw their own signature** (or an administrator), with a mandatory reason. We deliberately did not let the Lead withdraw one: a Lead who can remove a reviewer's signature can overturn a conclusion they disagree with. An administrator can, to handle someone who has left.

**(c)** A row that has been signed cannot be reassigned — the signature must be withdrawn first, otherwise the table would show one person's signature beside another's name.

**Question:** (a) should the person who nominates signers be the **project Lead** or the **Project Manager**? Those are two different things in the system. (b) Who may withdraw a signature — only the signer, or the Lead or Project Manager too? (c) If someone is nominated to sign the Approved-by row but their role does not carry approval permission, should that be **blocked** (as it is now) or should being nominated be enough?

## Question 11 — Does the per-gate sign-off specification also apply to the phase sign-off block?

*(Outstanding from 20 August.)* Your sign-off answer is written about gates, and it says the phase-level approval "remains as an additional phase-closure approval and is not replaced". We have applied its six fields — authenticated user, role at the time, timestamp, decision, record version, comment — to the **phase** block as well, on the reasoning that a signature is a signature.

**Question:** was that right, or does the phase block have a lighter requirement than a gate? In particular, does the independence rule apply at phase level, where no phase is defined as critical?

## Question 12 — Is a hand-drawn signature wanted at all, and must it be mandatory?

*(Outstanding from 20 August.)* Signing a phase now requires two things beyond the six fields you listed: a signature the person has drawn once and saved, and a fresh code from an authenticator app.

**Neither is in your specification.** The drawn image is our addition, on the reasoning that a printed or exported record reads as a real signature and that it replaces none of your six fields. The authenticator step protects it — anyone with access to a mailbox could produce an emailed code, which is the wrong shape for a signing act.

Both are currently **mandatory**: a nominated signer who has not saved a signature or enrolled an authenticator cannot sign at all, and the phase cannot close until they set both up.

**Question:** (a) is a hand-drawn signature wanted in the record, or are your six fields sufficient? If it is not wanted, the second factor should be reconsidered with it, since the two are currently tied together. (b) Should the second factor apply to all three rows — Prepared, Reviewed and Approved — or only to Approved? It applies to all three today.

---
---

## Question 13 — Two of your rules name a "Reject / Stop" decision the gate dropdown does not have

Your answer on critical gaps says a Critical gap **"must result in Hold, Backtrack or Reject/Stop"**, and your sign-off answer lists **Reject / Stop** among the decisions that require a mandatory comment. So it appears twice, in two separate answers.

The workbook's own Gate decision dropdown has five values: Proceed · Proceed with Conditions · Hold · Backtrack · N/A. There is no Reject or Stop.

We have not invented a sixth value — the workbook is the authority on that list, and adding one silently would change a control that appears on every one of the twelve gates. Today a Critical gap is refused with the message *"record Hold or Backtrack instead"*, which covers two of the three outcomes you named.

**Question:** should Reject / Stop become a sixth gate decision? If yes, what does it mean operationally that Hold does not already mean — does the project close, or does it return to an earlier phase? And is it available at every gate, or only where a Critical finding forces it?

---

## Question 14 — "Safety or Regulatory authority": is one of the two enough?

Your Gate 4 answer says a flagged watch-list row may be carried under Proceed with Conditions where, among other conditions, *"the gate approver holds Safety or Regulatory authority"*.

We read "or" literally: either one is sufficient. So the software now grants that permission to whoever holds **either** capability, and it is a real permission in the role grid rather than a name typed in a box.

The reason we are asking rather than assuming: at Gate 4 the two functions judge different things. Safety judges whether a material is harmful; Regulatory judges whether it is permitted in the market. A material can be safe and not permitted, or permitted and not appropriate for this product. If both judgements are needed, "or" is too weak.

**Question:** for a flagged ingredient at Gate 4, is one of the two functions sufficient, or must both accept it? If one is enough, does that hold for every one of the eleven risk classifications, or are some of them specifically Safety's call?

---

## Question 15 — Who should be able to open the company reference-data pages?

Three of your answers created company-level lists rather than per-project ones: the market profile Regulatory maintains, the raw-material risk overlay, and the Claims Library. Two of the three are now built and each has its own page.

Each answer says clearly **who may edit** — Regulatory for market profiles, Technical / Safety / Regulatory for the risk overlay, Technical **and** Regulatory jointly for the Claims Library — and the software enforces exactly that on saving.

What no answer covers is who may **see** the page. The software today shows the link only to a System Administrator, which produces an odd result: the administrator sees the link but is not the person who maintains the data, while Regulatory maintains it but has to be sent a direct link to reach it.

**Question:** should these pages appear in the menu for anyone who is allowed to edit that list, or stay restricted to administrators with the maintainers reaching them another way? And should the three lists sit together under one heading, or separately beside the area each belongs to?

---

## Question 16 — For a High gap, what makes an action "controlled", and where does its due date go?

Your critical-gap answer lets a High gap be carried conditionally where, among other conditions, *"a controlled action and due date are recorded"*. Two things in that sentence are not settled by the eight fields you listed for a gap.

**First, "controlled".** In the same round, on critical safety findings, you wrote that *"a controlled Next Action is required… Free text may describe the action but must not replace the controlled action record"* — so there, "controlled" means a tracked action record, not a typed sentence. But the gap field list gives **Required action** and **Action owner** as ordinary fields, which reads like the self-contained version. Both readings are defensible and they need different software: either the gap points at a tracked action, or it keeps its own two fields.

**Second, the due date.** The eight fields you listed do not include a date for the action, so that half of the condition is currently **not enforced** — we have not guessed a ninth field, and the screen says so, asking the user to put the date in the action text meanwhile.

**Question:** for a High gap, is the required action a tracked Next Action of the kind you specified for safety findings, or two plain fields on the gap itself? And where should the action's due date be recorded?


## Summary

| # | Topic | Why it matters |
|---|---|---|
| 1 | Where "not yet assessed" gets recorded, for seven conditions | Blocks finishing the change you asked for; affects how every project starts |
| 2 | Who the responsible reviewer of an item is | Blocks the acknowledgement half of the auto-generated N/A |
| 3 | How much a gate's signed snapshot covers | Decides how often a signature goes stale — the largest remaining build |
| 4–6 | Change-control granularity · superseded findings · Gate 4 dispositions | Already built on our reading — rework if wrong |
| 7–9 | Supersession signature · Claims Library criticality · scale-up areas | Designed, not built — redesign if wrong |
| 10–12 | Phase sign-off: who nominates, whether the gate rules apply, drawn signature | Built in August, never put to you |
| 13–14 | A "Reject / Stop" decision that does not exist · whether Safety **or** Regulatory is enough | Two of your own answers name them; we did not invent either |
| 15–16 | Who may open the reference-data pages · what makes a gap's action "controlled" | Both surfaced by using what we had just built |

Questions 4 to 6, 10 to 12, 14 and 16 are all cases where we made a judgement rather than leave something unrecorded. We would rather have each confirmed or corrected than have them settle silently into the system.
