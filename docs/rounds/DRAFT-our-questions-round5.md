# MBc360 — Follow-up questions, Round 5

> ## ⚠️ DRAFT — NOT SENT
>
> **This file is still being written and will keep growing.** It is the sendable version of the internal list in `../rules/F1_Per_Gate_Open_Questions.md` → Round 5.
>
> **Project owner's decision, 2026-08-24:** send this only after all 36 Round-4 answers have been worked through, because until then the list is still moving. Round 4 proved the point — it was drafted on 9 August and sent on the 12th, and in those three days the act of building the answers produced nine more questions.
>
> **Consolidated 2026-10-10, then audited the same day against the code and against every SME answer so far.** Sixty-four questions became thirty-nine, and the audit then cut it to thirty-two, and a later review of registers that may legitimately be empty added one (thirty-three), and a review of how Change Control relates to a change added another (thirty-four): seven questions were removed because they asked the subject-matter team about how the software protects or records data — that is the project owner's decision (`../rules/Software_Rules.md`), not theirs — or because they asked again what an earlier answer already settled. Several other questions were rewritten because they misquoted an answer, or described code that has since changed. The internal `R5-Qn` identifiers in the code and in `F1_Per_Gate_Open_Questions.md` are unchanged; only this sendable list was renumbered.
>
> **Rename this file to `YYYY-MM-DD-our-questions-round5.md` on the day it is sent**, and do not edit it afterwards — that is what makes this folder evidence rather than documentation.

**For:** the subject-matter team (NPD / Quality / Regulatory / Safety)

Thank you for the Round 4 answers. They were complete enough to start building immediately, and **thirty-four of the thirty-six are finished**. The two that are not are waiting on answers below rather than on work: the scale-up affected-area list (question 7 here) and the reviewer acknowledgement in your question 16 (question 1 here). This list is what that building surfaced.

Every question here asks about the cosmetic product, its evidence, its claims or its approvals — nothing about how the software stores or locks data. For each one we have made a choice so that work could continue, the choice is running now, and we would rather you corrected it than have it settle in silently. Where a question is still unbuilt we say so.

Several questions have lettered parts. You can reply by number and letter, for example "3(a) — yes, 3(b) — option (ii)".

## What we need most, in order

1. **Questions 1–2** — two decisions your Round-4 answers depend on that the answers themselves did not cover.
2. **Questions 3–7** — already built on our own reading, or designed but not built. If we read you wrongly these need rework, so we would rather know early.
3. **Questions 8–11** — smaller, but several name something your own answers assume exists and the software does not have.
4. **Question 12** — the largest structural question in this list, and the one we have deliberately stopped work on until you answer it.
5. **Questions 13–16** — change scope, register approval and "not applicable"; rules we are already running on our own reading.
6. **Questions 17–34** — further readings of ours, each small; most are one-line confirmations.

---

## Question 1 — Who is the "responsible reviewer" of a single readiness item?

You answered that where the system can work out from controlled data that a condition does not apply, it may generate the N/A reason itself — and that users should not retype a reason the system already produced. That half is built and working.

The other half we cannot build yet. For safety-, regulatory-, claims- or release-critical items you said the generated rationale "must still be acknowledged by the responsible reviewer before gate closure". Nothing in the system says who the responsible reviewer of an individual item is. Your sign-off answer defines the roles very precisely for a **gate** — prepared, reviewed, approved, with the independent function named for critical gates — but a single gate carries between seven and more than twenty items.

Three readings, with quite different amounts of work:

1. **The gate's reviewer** acknowledges all of that gate's auto-generated N/As at once. Cheapest, and it fits the fact that your four words "safety-, regulatory-, claims- or release-critical" are the same four you used about gates.
2. **The owner of the review area** the item's evidence belongs to — the system already records those thirteen people per project. Closer to the plain meaning of "responsible", but an item that reads several registers has several owners.
3. **A person nominated per item.** Most precise, most work, and nowhere to record it today.

**Question:** which of the three? And is "a critical item" the same thing as "any item on a critical gate", or a property of the individual item?

## Question 2 — Is "is a change control needed?" answered once for the project, or once per finding?

You asked for an explicit step — Change Control required? Yes / No / Pending assessment — with the reviewer, date, rationale, the linked record where Yes, and an evidence link. Built, and Pending now blocks, as you specified.

**Where we had to choose.** Your wording is "must block closure of the post-market finding", in the singular, which suggests one answer per finding. But the system has no record that represents a single post-market finding. Following your Round-4 answer, the old sixteen-option list is now three separate lists — Source, Issue type and Resulting action — but each is a set of boxes ticked once for the whole project, not a record per finding. CAPA records are the resulting **actions**, and the panel feedback register is internal product testing, not post-market.

**What we built.** One answer per project, blocking the Gate 12 review closure — which is the nearest thing the system has to "closure of the post-market finding", since Gate 12 *is* the post-market review closure.

**What that costs.** If a project has five findings and only one needs a change control, a single Yes/No cannot express that. The alternative is a new "post-market finding" record, which nobody asked for and which would sit in the middle of the area your Round-4 answer just restructured.

**Question:** should this answer be recorded **once for the project**, as it is now, or **once per post-market finding**? If per finding, what is a finding, and where in your process does one come into being?

## Question 3 — Does a superseded safety finding need the same closing evidence as a closed one?

You gave the safety-finding status list six values, adding **Superseded** to the five-step lifecycle. Separately you specified what closing a High or Critical finding requires: the safety reviewer's conclusion, an evidence link, the linked action completed, verification, the verifier and a closure date.

Superseded is not the same as closed. A finding is superseded when a later assessment of the same hazard replaces it — so its evidence arguably lives in the replacement, not in itself.

**What we built** — the cautious reading, for High and Critical findings only: a superseded finding needs the same safety conclusion, evidence link and **completed linked action** as a closed one. A High or Critical finding should not become passable just by being marked superseded, and if it genuinely was replaced, saying so is one sentence.

**What that costs.** A superseded row left blank blocks Gate 7 indefinitely until someone fills it in, and asking for a completed action and an evidence link on a finding that was replaced reads oddly — the action is the least sensible of the three.

**Question:** does a superseded High or Critical finding need the same closing record as a closed one? If not, should it instead point at the finding that replaced it, and which of the three items (conclusion, evidence link, completed action) should still be required?

## Question 4 — The two Gate 4 watch-list columns: what does each hold, who fills it, and until which gate?

Three of our earlier questions turned out to be about the same two columns on the prohibited-ingredient and caution watch-lists: the **product status** and the **Gate 4 disposition**.

**What exists now.** You said every row at Gate 4 must be classified as one of six: *No issue identified · Needs Safety Review · Needs Regulatory Review · Prohibited — remove · Considered — not selected · Further information required.* You also said "flagged" covers three statuses: *REVIEW — possible formula match · Needs Safety Review · Needs Regulatory Review.* "REVIEW — possible formula match" is in the flagged list but not in the six, and three of the six are not in the flagged list. So we kept **two columns**: the product status (the older list, including "possible formula match") and the Gate 4 disposition (your six). **Both are filled in by a person.** The system compares the formula with the watch-list and, at Gate 7, refuses to pass while a matching row still sits at the status it started with ("No formula match recorded" / "Not assessed"), but it never writes a verdict itself.

**(a)** Is two columns the right reading — what the screening found, and what the reviewer decided? Or should the six values replace the old status list altogether?

**(b)** Should the **system** set "REVIEW — possible formula match" by itself when the formula matches a watch-list row — rule C3 says it flags matches — or is it right that a person updates the row before Gate 7?

**(c)** Until which gate is the product status updated? Your answer says Gate 4 screens and gives a conclusion for every row, and Gate 7 must formally close every restricted or caution issue that applies to the final formula. It does not say where the product status is settled. We read it as **Gate 7**: the reviewer columns (assessment, reviewer, date, rationale, linked action, evidence, Gate 4 disposition) are Gate 4's, while product status keeps following the formula until Gate 7. If it were settled at Gate 4, any normal formula change afterwards would force the project back to Gate 4. Is Gate 7 right?

## Question 5 — Formula version supersession: who confirms the ten facts, and when does an old version change state?

**Built.** An old formula version reaches *Superseded* only once a person has confirmed all ten facts you listed, for **each market where that version is sold**; nothing derives it.

**(a) Who confirms?** Your answer lists ten things — the regulatory notification, the last release date, the stock disposition, the artwork transition, the Sales and Marketing communication and the rest — but does not say whose they are. Today one authorised person (anyone allowed to approve a market's launch) records all ten for a market, typing their own name. We *assume* the ten belong to different functions (Regulatory, Quality, Supply Chain, Sales, Packaging). Is that right — and should each fact be confirmed by its own function, or is one accountable person enough?

**(b) When does the old version change state?** Your question 2 says "approval of the new version places the old version into Transition in Progress". We read approval as the new version's **launch approval in a market where the old version is sold**. So after a Major change the old version stays *Active* until then; after a Minor change, which reopens no gates, it starts transitioning at once; and a version that was never launched anywhere becomes *Superseded* immediately, since nothing needs transitioning. Post-launch reviews stay per market, dated from the earliest launch still on sale there. Is launch approval the right moment, or Gate 10/11 approval? May a never-launched version be treated as Superseded straight away? Do post-launch reviews need to be kept per version?

## Question 6 — Who decides that a change to a Claims Library entry is "critical"?

**The library is built, which sharpens this question rather than answering it.** An entry needs both a Technical and a Regulatory approval before it counts as approved wording; withdrawing one lists every project claim, market and published record that depends on it, and flags them for re-review. What it does **not** do is remove anything from a market — because your answer says that should happen only where the change "is critical or required by Regulatory", and who makes that call is exactly what is asked below.

You specified what happens when a library entry is changed or withdrawn: identify every linked claim, SKU, market and published material, assess the impact, raise change control where needed, flag material for re-review, and record the effective date and transition plan. Then: *"Changing or withdrawing must not automatically remove a product from the market unless the change is critical or required by Regulatory."*

That sentence can pull a product that is on sale, so we do not want to interpret it.

**(a)** Is "critical" here the top level of the Low / Medium / High / Critical scale your other three answers agreed on?

**(b)** Who records it — Regulatory alone, or Technical and Regulatory together, the way you specified for approving a library entry in the first place?

## Question 7 — The Gate 9 scale-up trigger: which areas does it read, and what is a "new formula"?

Your Round 3 answer makes scale-up or pilot status mandatory for "new formulas, major reformulations …", and your Round 4 answer lists eighteen areas that trigger a scale-up or pilot review — manufacturing site, equipment type or scale, batch size, order of addition, mixing speed, homogenisation, heating profile, hold time, filling method, water source and the rest.

**(a) The eighteen areas.** We have built the other limbs of that answer: a Major formula change triggers it, and so does the reviewer's own Yes / Pending answer. The eighteen areas are not read yet. Are they a list someone ticks on the change record, or guidance for the person answering "was a scale-up risk identified?" If they are a list, should it sit beside the impact areas the change record already carries for Gate 11, or replace its free-text "affected area" field? (Question 12 decides how many change records there are, so the two are best answered together.)

**(b) "New formula".** We read a new formula as a project whose *Development / Change Type* at Gate 1 has **New development** ticked in any role, primary or secondary; a major reformulation is already caught by a Major formula version. Does that match what you mean by a new formula? Should a Reformulation that is not Major also count — and should a secondary tick count at all?

## Question 8 — Two of your rules name a "Reject / Stop" decision the gate dropdown does not have

Your answer on critical gaps says a Critical gap **"must result in Hold, Backtrack or Reject/Stop"**, and your sign-off answer lists **Reject / Stop** among the decisions that require a mandatory comment. So it appears twice, in two separate answers.

The workbook's own Gate decision dropdown has five values: Proceed · Proceed with Conditions · Hold · Backtrack · N/A. There is no Reject or Stop.

We have not invented a sixth value — the workbook is the authority on that list, and adding one silently would change a control that appears on every one of the twelve gates. Today a Critical gap is refused with the message *"record Hold or Backtrack instead"*, which covers two of the three outcomes you named.

**Question:** should Reject / Stop become a sixth gate decision? If yes, what does it mean operationally that Hold does not already mean — does the project close, or does it return to an earlier phase? And is it available at every gate, or only where a Critical finding forces it?

## Question 9 — "Safety or Regulatory authority": is one of the two enough?

Your Gate 4 answer says a flagged watch-list row may be carried under Proceed with Conditions where, among other conditions, *"the gate approver has the required Safety or Regulatory authority"*.

We read it as: holding **either** authority is enough, so the software grants that permission to whoever holds either capability, as a real permission in the role grid rather than a name typed in a box. The word we could not resolve is "required".

The reason we are asking rather than assuming: at Gate 4 the two functions judge different things. Safety judges whether a material is harmful; Regulatory judges whether it is permitted in the market. A material can be safe and not permitted, or permitted and not appropriate for this product. Your "flagged" list has three statuses, and they differ in whether one function is already named:

- **Needs Safety Review** and **Needs Regulatory Review** name a function.
- **REVIEW — possible formula match** is raised by the comparison with the watch-list and names none.

**Question:** (a) for a row flagged *Needs Safety Review*, must the approver hold Safety authority — and likewise Regulatory for *Needs Regulatory Review* — or does either function suffice? (b) For a *possible formula match*, which function, or either?

## Question 10 — What makes an action "controlled", and where do its owner and due date live?

Your answers use the idea of a controlled action in three places, each leaving something open. One answer on the first settles the others.

**(a) For a High gap.** Your critical-gap answer lets a High gap be carried conditionally where, among other conditions, *"a controlled action and due date are recorded"*. Your F7 answer already says what a controlled action is: *"A controlled Next Action is created. The action has an owner, due date and escalation condition."* But the eight fields you listed for a gap give **Required action** and **Action owner** as ordinary fields and no date, which reads like the self-contained version. So today the date half of the condition is **not enforced** — we have not guessed a ninth field, and the screen asks the user to put the date in the action text meanwhile. Should a High gap point at a tracked Next Action, as F7 describes? And does the same requirement apply to Medium and Low gaps?

**(b) The product form left open at Gate 2.** Your question 23(a) lets an early brief pass Gate 2 with the product form still open, "with a controlled action". We require an open Next Action at Gate 5, where the form is to be confirmed, and a new "Confirmed product form" field there. Must that action sit at Gate 5 and be about confirming the form, or is any controlled action enough?

**(c) A deferred requirement.** See question 16 — it is the same choice for a Should or Could requirement row.

## Question 11 — If a Change Control affects a gate that already passed, should that gate reopen automatically?

Right now, for Gates 1 to 10, opening a Change Control against a gate that has already passed does nothing to that gate. If Gate 5 was decided "Proceed" and the project has since moved on to Gate 10, opening a change that names Gate 5 leaves the "Proceed" exactly as it was — the only trace is a small warning tag on the Gate Flow screen. Closing the change is equally disconnected.

**Gate 11 behaves differently, and we only noticed this while checking.** Gate 11 weighs the open change records directly. If a change that is Critical or High risk, launch-impacting, unclassified, or touching formula, artwork, claims, safety, regulatory, packaging or release is opened **after** Gate 11 was signed, Gate 11's "no blocking change" item fails again, and because a gate counts as passed only while none of its items fails, Gate 11 can stop being passed **on its own** — with no one reopening it and no record of why. We confirmed the item fails by test; we have not yet watched a fully signed Gate 11 fall in the application. Gate 12 may behave the same way through its post-market review item, which we have not checked.

**What we would do without an answer.** Opening a Change Control against a passed gate would reopen exactly that gate — and only that gate — and the only decision allowed on it afterward would be "Proceed with Conditions".

**Where this meets your F9 answer.** F9 says *"Completed, Rejected, Cancelled and Superseded are treated as closed, provided the final disposition is recorded."* A change that reopened a gate raises a new point F9 did not have to consider: if the change is then **Rejected or Cancelled**, was the gate ever really affected? We have not decided; the two readings are that the gate must still be explicitly re-confirmed (never an automatic restore to what it said before), or that a rejected change releases it.

**What we have not settled.** (i) Whether "reopen automatically" is the right shape at all, or whether correcting an already-passed gate should always stay a deliberate action a person takes, with Change Control limited to warning. Every existing case of a gate reopening is either a person choosing to, or a fixed block that a Major formula change reopens together; this would be the first time gates are picked one at a time. (ii) Whether restricting the next decision to "Proceed with Conditions" is enough, or re-deciding should also require a written explanation or a named person. (iii) What happens when two open changes name the same gate.

**Question:** should opening a Change Control against an already-passed gate reopen it automatically? If yes, for every kind of change or only some, and what should happen if the change is rejected or cancelled? If no, what should happen instead of today's silent no-op? And for Gates 11 and 12 specifically: is it right that an open change can make a signed gate stop being passed by itself, or should correcting a signed gate always be a deliberate step a person takes?

## Question 12 — There are nine places a change gets written down. How many should there be?

This is the question we would most like answered, and the one we have stopped work on until you do.

Counting through the workbook rather than going on impression, there are **nine** surfaces that deal with change, and they are not all the same kind of thing:

| | What it is |
|---|---|
| Change Control & Communication Log | records a change that happened |
| Formulation Change Register (NP Controlled) | records a change that happened |
| Released Label vs Current Artwork | records a change that happened |
| Development Iteration Log | records a change that happened |
| Ingredient Substitution Evidence | records a change that happened |
| Product Family & Version Register | records a change that happened |
| Formula version history | records a change that happened |
| Formula Change Control | lists the five **types** of formula change and who signs each |
| Artwork Change Control | lists the four **types** of artwork change and who signs each |

(A tenth, Change Templates / Forms, is a list of which form to use — clearly different again.)

**Three things we can measure, rather than feel:**

**1. Two of these run in parallel with two different numbering schemes.** The Change Control log numbers its records CHG-001, CHG-002. The Formulation Change Register numbers its own FC-001, FC-002, and the system writes one automatically whenever a formula version is raised. Nothing links the two.

Raising a **major** formula change is far from ignored — it supersedes the previous version, reopens Gates 4 to 9 and cancels the phase approvals covering them. What it does **not** do is create a change control record, so the change-control side of the system never sees it, and four things that apply to every other change do not apply to this one:

- it does not hold **Gates 10 or 11** open (those are outside the range that gets reopened);
- **Gate 11 does not weigh its impact**, although your own answer requires Gate 11 to evaluate the impact classification of each open change — and a major formula change is the clearest case of one;
- closing it is a single "Closed?" tick rather than the eight-part final disposition you specified in Round 4;
- it carries no impact classification at all, so nothing can mark it launch-impacting.

So the heaviest change the system knows about is the one travelling the route the change machinery cannot see.

**2. Two sheets are doing two jobs at once.** Formula Change Control lists five *types* of change — one row for "ingredient added or removed", one for "pH or process changed", and so on — with who must sign each. But the same five rows also carry Old version, New version and Status, which belong to a *particular* change. So every ingredient change this product will ever have shares one Old version box. The second one overwrites the first.

**3. The sheets refer to each other by typed text.** At least four columns point from one change record at another — "Change register ID", "Linked Change ID" (on two sheets) and "Artwork_Change_Control ref" — and every one is free text. Nothing checks that what is typed exists.

**Our reading, which we would rather you corrected than accepted.** We think the workbook has several separate sheets because a spreadsheet has no other way to say "only NP approves this" or "show me only the artwork ones" — a separate sheet **is** the permission, and it **is** the filter. The software has permissions and filtered views already, so one record shown several ways might say exactly the same thing with none of the duplication. But that is us guessing at why the workbook was built as it was, and if the sheets are separate because the *business* treats them as genuinely different records, then merging them would be a serious mistake — one much harder to undo once real data is in the merged book than the duplication is to live with now.

**A second reading, which points the other way, and which we think may well be the right one.** Looking again at the three formula-related books rather than at the count, they may be describing three genuinely different stages rather than the same thing three times:

| Book | What it covers | State of the formula |
|---|---|---|
| Development Iteration Log | trial and improvement | not yet locked |
| Formulation Change Register | a change to a **controlled** formula | locked, and often already registered |
| Change Control & Communication Log | any change of any kind — artwork, claims, markets | any |

The middle one reads that way from its own contents: it warns that Vietnam needs about six months to re-register a formula change, and it asks whether a new registration or label is required and whether the market has been told. None of those questions mean anything about a formula still being trialled. If that is how your team sees it, these are **not** duplicates, merging them would be a serious mistake, and the real question is not whether to merge but **where the boundary between them sits**.

**Questions:**

**(a)** In how your team actually works, is there **one** kind of change record, or **several genuinely different** kinds? If several, which are different, and what makes them different?

**(b)** Of the nine above, which are meant to list the *types* of change, and which are meant to log the changes that actually happen?

**(c)** Should raising a Major formula version always create a change control record?

**(d)** When one change affects the formula, the artwork and a claim all at once, is that **one** record, or several linked records — one per area?

**(e)** Is the dividing line between the Development Iteration Log and the Formulation Change Register the moment the formula is **locked at Gate 5** — trials on one side, controlled changes on the other? If it is something else, what? (Today nothing enforces any line: the software will write a Formulation Change Register entry for a formula that has never been locked, which puts a development trial into the book meant for controlled changes.)

**(f) Is "NP Controlled" a separate book, or an approval only NP may give?** The Formulation Change Register has sixteen columns. Two are NP's: the commercial approval and the NP sign-off. The other fourteen — change ID, product, who requested it, the date, the title, the explanation, the reasons, the NPD and Regulatory actions, whether the market needs telling, whether it has been told, whether it is closed, and the overall status — are the same fourteen the Change Control log already keeps. Is the register a book in its own right, or a view of the Change Control log filtered to formulation changes, with NP's approval as an authority exercised on the shared record? And which role is "NP"? We have provisionally given the approval to the Final Approver role, purely from the words "commercial authority", and it is one click to move.

**(g) Which records count as "a valid Change Control record"?** Your question 8 says *"If Yes, a valid Change Control record must be linked."* That used to be free text, so a typo or another project's record number satisfied it. It is now a choice from **this project's own Change Control records** (the CHG- numbers). Does a row of the Formulation Change Register (the FC- numbers) count as one? And does "valid" require anything beyond existing — that the record is still open, or covers the right kind of change?

**What we are doing meanwhile:** nothing. We could make one of these the master book tomorrow and show the others as filtered views of it, and it would look tidier immediately. We are not doing that, because if two of these records really are different things, we would then have to pull them apart again after they had been merged and filled with real data. Nothing is blocked by waiting; the duplication is visible rather than dangerous, with the single exception in point 1 above, which we will fix as soon as (c) is answered.

## Question 13 — Does adding a market, or a Major formula version, reopen earlier gates?

Two cases of the same question — when a change in scope reopens what was already decided. (Question 11 asks the same about Change Control.)

**(a) Adding a market after Gate 1.** Your F4 answer says a new market *"may also trigger review of earlier gates where the new market has different ingredient, claim, packaging or safety requirements."* A market can now be added after Gate 1 without a backtrack, and nothing is reopened. Removing a market that has any history is refused; it is marked Withdrawn instead. Who decides that the new market "has different requirements" — for example Regulatory, when the market is added — and which gates does each kind of difference reopen?

**(b) A Major formula version.** Your A2 answer reopens Gates 4–9 on a Major change; your F4 answer gives the new version its own Gate 10–12 track in each market. We reopen Gates 4–12 for the new version, and keep the old version's Gate 10–12 tracks and signatures as they were. Should the project's Gate 10–12 records reopen for the new version, or only the per-market tracks start again?

## Question 14 — Is the "closing" approval on every evidence register the right shape?

Every register shows a "Review owner · Co-sign" caption, but it used to be only text — anyone could add, edit or delete a row regardless of whose name was shown. The project owner asked for a deliberate **closing** approval: the Review owner and the Co-sign each sign, after which the register becomes read-only, and a gate cannot pass until every register tied to it has been closed. **It is built, on the project owner's instruction, before asking you** — this is a new rule, not something transcribed from the workbook, and we would rather you corrected it now than have it settle in as though it were confirmed because it works.

**(a)** Should this apply to **every** register tied to a gate — today that is 70 of the 82 registers — or only to a smaller set that is genuinely meant to be a controlled record — the way a couple of registers already had their own dedicated approval step before this?

**(b)** Is **two** approvals (Review owner and Co-sign) the right number and the right pair of roles, or should some registers need different or additional approval?

**(c)** For some registers the Review owner and the Co-sign resolve to the **same person**, because no distinct Co-sign was ever named for that area — so "two approvals" is one person approving twice. We show a warning rather than blocking it. Should such areas get a distinct Co-sign? (Question 24 asks the wider question of when one person may hold two roles.)

## Question 15 — Can a Phase 2, 3 or 4 requirement row be marked "not applicable"?

Your answer to Round-4 question 21 gave the Phase 1 requirements table a third way to close a row: **N/A with a rationale**, because "the system must not require users to mark an empty requirement as Completed". That is built.

The same situation exists on the Phase 2, 3 and 4 requirement tables. Those rows come from the workbook and are fixed, so a project can perfectly well have one that does not apply to it — the "compatibility / use-with constraints" row for a product with nothing to be used alongside, for example. Those tables still do **not** have the N/A option, because the gate rules that read them accept nothing but *Completed*; offering N/A there without changing those rules would let someone pick a status that can never satisfy the rule reading the row.

**Question:** when a Phase 2–4 requirement row does not apply to a project, should it be closed as **N/A with a rationale** the same way Phase 1 can, or marked Completed with an explanation in the notes?

**Separately, for the six Infant & Baby Safety sections** — several rows carry your own qualifiers ("where relevant", "where appropriate"), and the Gates 8–9 list is written as a menu ("trigger by use context and risk") rather than a set of obligations. We gave those sections the N/A option for that reason. Is that right for them?

## Question 16 — Deferring a Should or Could requirement: who owns it, when is it due, and does every row need a priority?

Your Round-4 answer to question 21 says a **Should** or **Could** requirement "may be deferred only through *Proceed with Conditions*, with an owner and due date". The first half is built: Gate 2 will not accept a plain *Proceed* while such a row is unfinished, and *Proceed with Conditions* clears it.

**(a)** The second half has nowhere to go. A requirement row has an **Owner** column but no due date, and the Next Actions — which carry an owner, a due date and an escalation condition, which is what F7 calls a controlled action — have no link to a requirement row. Should a deferred requirement simply gain a due-date field on its own row, or should deferring it **create a controlled Next Action** pointing back at that row? If the second, we would also block *Proceed with Conditions* at Gate 2 while a deferred row has no such action against it. (Question 10(a) is the same choice for a High gap; one answer should settle both.)

**(b)** **Must every applicable requirement row carry a Must / Should / Could priority?** We have built it that way — a row that is neither N/A nor prioritised counts as unfinished at Gate 2. Our reasoning: your answer says every applicable row must be completed or formally deferred, and only a Should or Could row can be deferred, so a row nobody has ranked can be neither. But your answer says which values the priority takes, not that every row must have one, so this is our reading rather than yours.

## Question 17 — The general restricted-and-caution screen: is this the right shape?

Your answer to Round-4 question 5 chose option (b): Gate 7 needs a **general** restricted-and-caution ingredient assessment for every product, with the maternal screen as an additional conditional layer and the infant screen as a third. All three layers now exist.

Building it showed that two of the three were already there — the prohibited/restricted screen has always applied to every product, and the infant compartment was already conditional on infant contact. What was genuinely missing was general **caution**: every caution row in the system belonged to the maternal list. So that layer is new, and four choices in it are ours rather than yours.

**(a) The new screen starts empty.** The two existing watch-lists ship twelve reference substances each because the workbook lists them. There is no equivalent list for general caution, and writing one ourselves would mean inventing regulatory reference data inside the system that exists to control it. Is that right, or does the company already have a general restricted/caution list that should be loaded in?

**(b) "We looked and found nothing" is recorded as a separate Key Gate Check row.** An empty screen cannot tell "this product contains nothing restricted" from "nobody has looked", so there is a new Gate 7 Key Gate Check row — *General restricted and caution ingredient assessment completed* — that has to be done, or marked N/A with a justification, before Gate 7 can pass. Is that the right way to record it?

**(c) It currently belongs to Gate 7 only.** Your answer 6 has Gate 4 screen every relevant candidate and Gate 7 formally close every restricted or caution issue. A restricted ingredient is usually found during ingredient screening at Gate 4, but a finding recorded on this screen does not appear at Gate 4 at all. **Should this screen's findings also be dispositioned at Gate 4**, the way the other two watch-lists are — every row dispositioned, a reviewer trail on anything flagged?

**(d) Its five outcome values** — No issue identified · Within limit, evidence linked · Restricted, reformulate · Needs Safety Review · Needs Regulatory Review — are assembled from the two existing screens, not supplied by you. The last three block Gate 7.

## Question 18 — For claims, what are the publication channels, and when is a claim approved for a market and channel?

**(a) The Publication / Deployment record.** Your answer to question 30(d) separated the two events cleanly — *"Approved for Release means AUTHORISED for use"*, and actual publication is its own record — and listed all seven things it must capture: the real publication date · **channel** · market · URL, file or artwork reference · published version · person responsible · withdrawal or supersession date. Six of the seven have an obvious form. **Channel does not have a list of values.** We have built one from the channels the Published Information register already distinguishes, plus the one your answer names outright (*"for printed packaging the equivalent event may be Release to Print"*): Release to Print (packaging/label) · Website · Social media · Sales or distributor material · HCP or professional material · Retailer listing · Advertising · Other. Does the company have a standard channel list? If so, what is on it — and is "Release to Print" one of the channels, or a different kind of event alongside them?

**(b) Approved for a market and channel.** Your answer 19(b) puts the intended channel and market on the SKU / market / channel claim-use record. Your question 30(c) blocks an artwork-linked claim that is not approved for the market or channel. We read a claim as approved when its row on that record has status **Completed** and its intended channel covers the channel used. Is Completed the right value, or is a different one needed?

## Question 19 — The claim review at Gate 3: "Not Approved", Technical review, and who approves a revision

**(a) A review outcome of "Not Approved".** Your question 27 accepts four outcomes but does not say which let a claim go forward. Only Approved and Approved with Conditions do now; Not Approved and Further Information Required block Gate 3 until the claim is reworded (which needs a new review) or removed. May a claim reviewed as "Not Approved" remain on the project's claim list when Gate 3 passes — for example as a claim still in development?

**(b) Technical review of a new claim.** Your question 28(2) says a new claim triggers Regulatory and Technical review. There was nowhere to record the Technical review, so we added the same five fields you accepted for the Regulatory review: outcome, reviewer, date, rationale and evidence link. (The Technical review is not required when the claim is linked to an Approved Claims Library entry.) Does it need the same five fields, or something different?

**(c) Who may record that a revision is approved?** Your question 26 freezes a claim revision once it receives "Regulatory or Gate 10 approval". The approval can now be recorded only by someone representing Regulatory or entitled to decide Gate 10, and only in their own name. Who is entitled to approve a claim revision?

## Question 20 — Gates 10–12 per market: withdrawn markets, and must every market be ready together?

**(a) After a market is withdrawn, is a Gate 12 sign-off still owed there?** Your answer to question 18 has the Prepared, Reviewed and Approved sign-offs recorded per market for Gates 10 and 11, and Gate 12 post-market reviews also running per market. We gave Gate 12 a per-market signing slot as well. Until now a withdrawn market kept its slot at every gate, so withdrawing from one country left Gates 10 to 12 blocked forever on a signature nobody would give. A withdrawn market now has **no** signing slot at Gates 10, 11 or 12. For Gates 10–11 and for supersession that seems certain — nothing more will be launched or transitioned there. For **Gate 12** it is our reading: product already sold in that country may still need post-market follow-up after withdrawal. After withdrawal from a market, is that market's Gate 12 sign-off (i) no longer required, (ii) still required for a set period, or (iii) still required like any market where the product is on sale?

**(b) Project-level pass.** Your E3(a) and question 18 have each market progress on its own, and the project can show "Some markets complete". The project still has **one** record for each of Gates 10 and 11, so it passes only when every active market has its regulatory approval, its Gate 10 sign-off and its launch approval — a ready market waits for the others. Is that roll-up enough, or do you want each market's gate decision recorded separately, so a ready market's gate is passed while another is still pending? (The second is a larger change.)

## Question 21 — Gate 10 — which checklist and approval values count as done for a market?

Your question 35(a) gives the two value lists but not which values pass. We accept a checklist status of Complete and a regulatory approval of Approved or Approved with Conditions (each, or N/A with rationale and reviewer). Every other value — Not Approved, Blocked, Pending and so on — blocks Gate 10.

One thing we found while checking: Gate 10 reads regulatory approval in two places, the market dossier register and the market's own status, and the market's own list has no "Approved with Conditions" value. We will bring the second into line with your answer once you have given it.

**Question:** is "Approved with Conditions" enough to pass Gate 10? Must the checklist be "Complete", or is another status acceptable?

## Question 22 — A commercially dependent project — which costing results allow a plain Proceed?

Your question 36(b) says that where the commercial requirement is a Must, failure leads to Hold or Proceed with Conditions. We allow a plain Proceed only on "Commercially Feasible" (or N/A with rationale). "Feasible with Conditions", "In Progress" and "Not Feasible" all require Hold or Proceed with Conditions.

**Question:** do "Feasible with Conditions" and "In Progress" count as failure in the sense of question 36(b)?

## Question 23 — Gate 12 — what shows product-performance feedback has been dealt with, and which signals bring a review forward?

**(a) What closes the item.** Your question 15 gives five triggers but does not say what evidence closes the item. It is now satisfied when the Gate 12 check "Complaints/issues triaged and CAPA/improvement actions assigned" is complete. When performance feedback has been received, is it enough that it was triaged and actions assigned, or is a separate performance review needed?

**(b) Which signals bring a post-launch review forward.** Your question 13 brings a review forward on "a significant adverse event, complaint trend, regulatory request or quality signal". We read these as: (i) a safety/adverse-event or quality issue recorded, or feedback whose source is a regulator. Nothing in the system records a complaint trend yet — (ii) where should a trend be recorded? Your question 10 counts only a claim question "concerning actual performance", but nothing records what a claim question is about, so every claim question counts — (iii) do you need claim questions about performance told apart from others?

## Question 24 — When may one person hold two roles on the same record?

Four of our choices are the same question in different places — whether the person who did one step may also do the next. Your answers name one pair explicitly.

**(a) The three gate signatures.** Your question 29(4) says that at every gate the reviewer must be a different authenticated person from the preparer, and that at the seven critical gates the reviewer or the approver must represent the independent function. It does not say whether the **approver may also be the preparer**. Your D1 answer says *"where risk is low, the same person may prepare multiple gate records, but the reviewer or approver should be independent for safety-, regulatory-, claims- or release-critical decisions."* We read "multiple gate records" as the same person preparing **different gates**, not holding two roles on one gate. Today the same person **may** prepare a gate and then approve it, with a different person reviewing in between — and since the approver's decision is the gate decision, that is a person approving work they prepared. (We had been refusing that and removed it, since neither answer asks for it, and a small team cannot always staff three people.) Should that stay allowed — everywhere, or only at gates that are not critical — or must the approver differ from the preparer?

**(b) Closing an action.** F8 says the owner cannot verify closure "where independent confirmation is required" but not when that is. We apply it to every action: closing or cancelling any action, whatever its priority, is limited to whoever raised it, the gate owner, or an authorised reviewer — which we have read as someone entitled to decide that gate. Are there actions an owner may close themselves? And who is the "authorised reviewer" of an action — a role, or someone named on each action?

**(c) Confirming a Major/Minor classification.** Your F5 answer says the initiator may propose the classification and an authorised technical or quality reviewer must confirm it. The system records the person creating the version as the confirmer, and only lets them confirm if they hold Technical or Quality authority. May one person — holding Technical or Quality authority — both propose and confirm, or must the confirmer be someone else?

**(d) The phase approval.** Your sign-off answer says the phase-level approval "remains as an additional phase-closure approval". No phase is defined as critical, so independence between the three phase signers is shown as a warning, not enforced. Should it be enforced for any phase?

## Question 25 — A Critical action and the gate decision: what does it block, and for how long?

**(a) Does an open Critical action block "Proceed with Conditions" as well, or only a plain Proceed?** Your F8 answer says "Critical actions must prevent normal gate closure." We have read "normal" as "any decision": while a Critical action is open, the gate cannot pass at all, even with Proceed with Conditions. The other reading — a Critical action blocks only a plain Proceed, and Proceed with Conditions is the way through — is also possible. May a gate pass with Proceed with Conditions while a Critical action is still open? If so, does that need anything extra (a named approver, a recorded reason)?

**(b) Once a Critical action has been closed or cancelled.** Your B2 answer says all actions should normally be completed before a gate closes, and your F8 answer says Critical actions prevent normal closure. Both speak about actions that are still **open**. Neither says that a gate which once had a Critical action must use Proceed with Conditions even after that action has been closed or cancelled. We have therefore not added that restriction: once a Critical action is Closed or Cancelled it blocks nothing, and a gate with no open actions passes on a plain Proceed. May the gate pass with a plain Proceed after that, or must it still use Proceed with Conditions because it once carried a Critical issue? Does a Critical action cancelled because it was raised by mistake count as having had a Critical issue?

## Question 26 — A market whose launch approval stands — may its PIF be reopened?

Rule C5 makes launch approval depend on an approved PIF. The system now refuses to move a PIF off Approved while that market's launch approval is still Approved; the launch approval must not stay Approved in the same save.

**Question:** when the PIF of a market already on sale must be updated (after a formula change, say), does its launch approval have to be withdrawn in the meantime?

## Question 27 — A deviation record when something is released without approval

Your F11 answer says that "releasing without approval generates a deviation/violation record". Inside the system, material cannot be **saved** as approved or released until every step is complete. Two cases remain that the system cannot prevent, because publishing itself happens outside it: material published without ever entering the workflow, and material released correctly that later stops being valid (its claim is revised, its Claims Library entry is withdrawn, or its review date passes). For now such incidents are logged as a CAPA.

**Questions:** (a) Does blocking release inside the system meet the requirement for what happens in it? (b) What should a deviation record contain? (c) Should an open deviation block Gate 11 or Gate 12? (d) Should the system warn when released material is no longer valid?

## Question 28 — Who accepts a phase's pre-work?

Your F13 answer says early entries *"should be visibly marked Pre-work / Entered Before Gate Opened and retain the entry date and user"*, and that once the phase opens *"the responsible owner must review and formally accept or update the pre-work"*. **We have built the acceptance but not the marking**: acceptance covers the phase as a whole, and individual entries are not marked yet. That is work we owe you, not a question; we mention it so you do not think it was overlooked.

What we need from you is the other half. We allow the phase's assigned review owner, or the project's Lead, to accept it, and only once the phase has opened.

**Question:** who should be able to accept a phase's pre-work?

## Question 29 — A vulnerable-user group the Gate 02 target users do not imply

Your question 25(d) answer accepts a two-way check with deliberately different strengths: an exact contradiction is refused outright, while a renamed or broader group recorded with no matching target user gets "a warning plus rationale ... since the Safety/Regulatory reviewer may identify that context independently". We built it that way, and the rule engine and the API still behave that way.

The Gate 02 screen has now been rebuilt, and on it the group picker offers **only** the groups the Gate 02 target users imply. A reviewer who wants to record, say, an oncology support context that no target user implies has to go back and change the Gate 02 target users first. Our reasoning: the two records exist to agree with each other, and a free choice on this screen is the thing that lets them drift apart. The cost is that the independent judgement your answer protects now has a longer route.

Rows already recorded this way are untouched: they still display, still warn, and can still be removed.

**Question:** should the screen hold to your 25(d) answer and let a reviewer name a group Gate 02 does not imply, with a warning and a rationale? Or is requiring the Gate 02 target users to be corrected first the behaviour you want?

## Question 30 — At which gate is each of these columns filled in?

Two columns where your answers say what is recorded but not at which gate. The answer decides when the column stops being editable. (The watch-list "product status" column is the same kind of question and is in question 4(c).)

**(a) A claim's "Evidence basis required".** Your question-36(a) answer adds this field to every claim but does not say when it must be filled in. We use it to exempt some Cosmetic claims (a claim declared as ingredient-level evidence, or as no performance claim, may rely on ingredient evidence), and we require it at Gate 3, beside the preliminary evidence requirement. Is Gate 3 right, or should it be later — Gate 8 or Gate 10?

**(b) "Release decision" on the Stability, Compatibility & Release Evidence sheet.** Your answer to Gate 9 lists a *release-readiness conclusion*, and your answer to Gate 11 lists a *quality release pathway*. The sheet has a "Release decision" column, and neither answer says at which gate it is filled in. We read it as **Gate 11**: Gate 9 concludes that the product is ready for release, and the decision to release is part of Production and Launch, which is also where release is blocked market by market. So the stability and compatibility results belong to Gate 9, and the release decision stays open until Gate 11. Is the release decision recorded at Gate 11, or at Gate 9 with Gate 11 only checking it again?

## Question 31 — What proves the approved artwork version at Gate 11?

Your question 30(c) says final artwork approval is *"represented in the Packaging/Artwork Approval record, which must link every Claim ID on the artwork"*. Gate 10 reads that record. At Gate 11, "Approved artwork version" is read from the **Released Label Control** register instead: each row must name the new label version and the new artwork file. That register also carries a "new label released" tick and a market release date, which we do not check.

**Question:** should Gate 11's "Approved artwork version" read the approval on the Packaging/Artwork Approval record, the Released Label Control register, or both — and is the Released Label Control register simply the market-release record, with the approval itself living only on the packaging record?

## Question 32 — Where are a market's pack requirements recorded, and what closes the item?

Your A2 answer makes market-specific pack requirements mandatory where the market has specific requirements (language, warnings, ingredient declaration and so on), and says that where none applies the user should record N/A with a rationale.

**(a) Where.** We added a "Pack requirements" field to Regulatory's market profile; if it is filled in for a market the project sells into, the item applies, and it is closed by the Gate 6 check "Artwork/label needs and pack compatibility triggers identified". Should Regulatory record these on the market profile like this? What should close the item?

**(b) An empty field.** Today a market profile with the field left blank reads as "no market-specific requirement", so the item passes by itself. Your A2 asks for an explicit N/A with a rationale, and your question 7 says a missing assessment must never read as "does not apply". Should a blank Pack requirements field on a market the project sells into **block** until Regulatory has recorded either the requirements or N/A with a rationale?

## Question 33 — Which registers may stay empty on a project, and which must always hold entries?

Your Round-4 answer 19(d) lets a product explicitly propose **no claims**, and Gate 3 accepts that. We then found that Gate 10 did not: it required the claims register to have entries, so a claim-free product passed Gate 3 and could never pass Gate 10. **We have extended your record to Gate 10** for those two registers. That made us check every register in the system, because requiring entries in a register that can legitimately be empty only makes someone invent one — and leaving it empty, with nothing to show anyone looked, makes "nobody checked" look like "nothing to find".

Below is every one of the 82 registers, sorted by what the system **assumes today**. Please mark any row that is wrong. Rows marked ★ are the ones we are least sure about.

### A. Must hold at least one entry by the gate shown (14 registers)

The gate cannot pass while the register is empty.

| Register | Needed at Gate | Note |
|---|---|---|
| Development Brief | 2 |  |
| Framed Scientific Research Questions | 2 |  |
| Vulnerable-User Assessment | 2 | an explicit "No vulnerable-user group identified" entry counts (your Round-3 B5) |
| Competitor Product Register — Identity, Claims & IP | 3, 5 | ★ no exception today for an administrative-only change |
| Supplier & Raw Material Evidence | 4 |  |
| Prospective Evidence Plan | 5 | ★ a product with no claims may not need an evidence plan |
| Packaging Specs & Artwork Evidence | 6, 10 |  |
| Ingredient-Level Safety Matrix | 7 |  |
| Detailed Test Protocol | 8 | ★ a product with no claims still needs safety and stability testing, but perhaps not a claims test protocol |
| Stability, Compatibility & Release Evidence | 9, 11 |  |
| Published Information Approval | 10, 11 |  |
| Regulatory Checklist Status (per market) | 10 | one entry for every market the project sells into |
| GMP Manufacturing Links | 11 |  |
| Released Label vs Current Artwork | 11 |  |

### B. May stay empty only if the project records "no claims" (2 registers)

| Register | Gate | What lets it stay empty |
|---|---|---|
| Claim -> Evidence Traceability | 3 | the project records that it proposes **no claims** (claims check marked not applicable, with a reason) |
| SKU Claims / PIF Register | 10 | the same "no claims" record |

### C. May stay empty, but someone must confirm they looked (2 registers)

An empty register is a real answer here — a product with nothing restricted has nothing to list.

| Register | Gate | What stands in for rows |
|---|---|---|
| General Restricted & Caution Assessment | 7 | a Key Gate Check, "General restricted and caution ingredient assessment completed", must be done (or N/A with a reason). Any row that is added must have an outcome. |
| Critical Safety Findings | 7 | no row means no finding. The ten Final Safety Sign-off questions are what record that safety was looked at |

### D. Reference sheets with rows already in place (34 sheets)

The rows exist from the start; the team fills in the answer columns. The last column says whether a gate reads those answers.

| Reference sheet | Gate | Do the gates read your answers? |
|---|---|---|
| ASEAN PIF Checklist (Closure) | 10 | Gate 10 (ASEAN markets) |
| Final Safety Sign-off | 7, 10 | Gate 7 |
| Needs & Scientific Basis — Gate Sign-Off | 2, 5 | Gates 2, 5 |
| Pregnancy / Breastfeeding Caution Limits | 4, 7 | Gates 4, 7 (pregnancy / breastfeeding products) |
| Prohibited Ingredient Watch-list | 4, 7 | Gates 4, 7 |
| Study Protocol Setup | 8 | Gate 8 (human studies) |
| Target Product & Tech — Sign-Off | 5 | Gate 5 |
| Target Product Profile (TPP) | 5 | Gates 3, 5 |
| ASEAN PIF / Dossier Map | 10 | no |
| Anatomy, Physiology, Exposure Science & Contradictory Evidence | 2 | no |
| Artwork Change Control | 6, 10, 11 | no |
| Backbone / Platform Technology | 5 | no |
| Carrier Review — Summary | 2 | no |
| Change Templates / Forms | any | no |
| Control & Sign-Off | — | no |
| Efficacy Assurance Control | 5, 8 | no |
| Evidence Hierarchy | — | no |
| Evidence Template Index | — | no |
| Formula Change Control | 5 | no |
| Fragrance Safety & Allergen Evidence | 7 | no |
| Landscape Decision Summary | 3 | no |
| Literature-Search & Referencing Standard | — | no |
| Literature-Search Method | 2 | no |
| Medical / Safety Summary | 10 | no |
| NPD Roadmap — Gap Register | — | no |
| NPD Roadmap — Mandatory 4-Part Structure | — | no |
| NPD Roadmap — Mandatory First Steps | — | no |
| PIF Evidence Closure (Workflow) | 10, 11 | no |
| Product / Project Identification | 4, 5, 8 | no |
| Product Safety Profile | 7, 10 | no |
| Publication Rules | 10, 11 | no |
| System Requirements | — | no |
| Transferability & Inference Rules | — | no |
| Twinkle 5 Claims Map | 3, 10 | no |

### E. No gate requires entries; may stay empty (30 registers)

| Register | Gate | Note |
|---|---|---|
| Carrier / Emollient System Review | 2 |  |
| Needs -> Technology Traceability Matrix | 2 |  |
| Needs — Executive Brief | 2 |  |
| Comparative Testing Protocol | 3 |  |
| Current Solutions & Standard of Care | 3 |  |
| Mechanism & Claims Evidence Map | 3, 10 |  |
| Social Media & Marketing Campaign Register | 3, 11 |  |
| Development Iteration Log | 4, 5, 8 |  |
| Ingredient / Active Evidence Monograph | 4, 5 |  |
| Ingredient Substitution Evidence | 4, 7 | ★ needed only if an ingredient was substituted |
| Team Feedback & Competitor Benchmark Notes | 4, 5, 8 |  |
| Formulation Change Register (NP Controlled) | 5, 7, 10 |  |
| Potency & Process Control Evidence | 5, 8 |  |
| Product Family & Version Register | 5, 6 |  |
| Platform Rollout & Stock Confirmation | 6, 11 |  |
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

**(a)** Is each register in group A really one that **no project** can legitimately leave empty? Which of them can, and what should stand in for entries (a confirming check, an explicit "none", or something else)?

**(b)** Is each register in group E really optional? Is there any that must hold entries at a particular gate — or whenever some other condition applies, for example an ingredient substitution record whenever an ingredient was substituted?

**(c)** For a product with **no claims**, and for an **administrative-only** change, which group-A registers still need entries? In particular the evidence plan (Gate 5), the detailed test protocol (Gate 8) and the competitor landscape (Gates 3 and 5), marked ★.

**(d)** Is it right that Gate 10's claims register is waived on the "no claims" record alone?

## Question 34 — Is a Change Control opened before a change is made, or can it record one afterwards?

Today the system puts no order on these two things. Opening a Change Control record does not create or lead to a new formula version, and creating a formula version does not need a Change Control record. (Question 12 asks whether they should be one book; this asks about the **order**.) The Change Control screen tells people to open a record *"before the change is made, not after"* — that wording is ours, not yours — and the status path (Draft → Submitted → Under Review → Approved, implementation pending → In Implementation → Completed) suggests approval comes before the work, but that is only our reading.

**What runs today.** A record can be opened before, after, or never. A new formula version can be created without any record. Separately, on the project owner's instruction, a new formula version can only be created while **Gate 05** is the gate open for work.

**(a)** Must a Change Control be opened **and approved before** the change is carried out, or may it be opened **afterwards** to record a change that already happened (for example a supplier substituting a raw material at short notice)?

**(b)** For a formula change, is an approved Change Control record a **precondition** for creating the new formula version, or is the version created first and the record written afterwards?

**(c)** If recording afterwards is allowed, should it behave differently — for example not hold the gates, because the change has already happened?

**(d)** A formula version can currently be created only while Gate 05 is open. Once Gate 05 has passed (Gate 06 onwards, including after launch), how should an approved formula change be made — by backtracking to Gate 05 and creating the version there, or by some other route?

---

## Summary

| # | Topic | Why it matters |
|---|---|---|
| 1 | Who the responsible reviewer of an item is | Blocks the acknowledgement half of the auto-generated N/A |
| 2 | Change-control answer once per project or per finding | Built on our reading — rework if wrong |
| 3 | Superseded safety findings | Built on our reading — rework if wrong |
| 4 | The two Gate 4 watch-list columns: what each holds, who fills it, until which gate | Built on our reading — rework if wrong |
| 5 | Formula version supersession: who confirms, and when the old version changes state | Built; confirmer and trigger moment are ours |
| 6 | Who decides a Claims Library change is "critical" | Designed, not built — it can pull a product from the market |
| 7 | Scale-up trigger: the eighteen areas, and what a "new formula" is | Waiting on the answer; depends on question 12 |
| 8 | A "Reject / Stop" decision that does not exist | Two of your own answers name it; we did not invent it |
| 9 | Whether Safety **or** Regulatory authority is enough | Built as "either" |
| 10 | What a "controlled action" is for a gap, and the product form at Gate 2 | Built partly; the date half of a High gap is not enforced |
| 11 | Should Change Control reopen a gate that already passed | Not built — and how it meets your F9 answer on rejected changes; a signed Gate 11 can already fall on its own |
| 12 | **Nine places a change is written down — how many should there be** (incl. "NP Controlled" and which records count as valid) | **Work stopped until answered.** A major formula change never reaches the change-control side, so Gate 11 never weighs it |
| 13 | Does adding a market or a Major version reopen earlier gates | Built as "Major reopens 4–12; adding a market reopens nothing" |
| 14 | The two-approval "closing" act on registers | **Already built, before asking you** |
| 15 | Can a Phase 2–4 requirement row be N/A | Your Round-4 answer gave Phase 1 that escape; the same case exists on the other three |
| 16 | Deferring a Should/Could requirement; whether every row needs a priority | 16(b) is running on our reading now |
| 17 | The general restricted-and-caution screen | Built; four choices ours, and (c) may be a real gap |
| 18 | Publication channels; when a claim is approved for a market and channel | Your answer lists the field but no values; ours is assembled |
| 19 | Claim review at Gate 3: "Not Approved", Technical review fields, who approves a revision | Built as above; ours |
| 20 | Gates 10–12 per market: withdrawn markets; whether every market must be ready together | Built as "no Gate 12 slot after withdrawal; every active market" |
| 21 | Gate 10: which checklist and approval values pass | Built as above; ours |
| 22 | Costing results that allow a plain Proceed | Placement of the two middle values is ours |
| 23 | Gate 12: what closes product-performance feedback; which signals bring a review forward | Built as above; ours |
| 24 | When one person may hold two roles on the same record | Removed two extra checks — a gate preparer may now approve it |
| 25 | A Critical action and the gate decision | Built as "open blocks every decision; closed blocks nothing" |
| 26 | A market whose launch approval stands — may its PIF be reopened | Built as "launch approval must not stay Approved" |
| 27 | A deviation record when something is released without approval | Not built — your (a)–(d) decide what to build |
| 28 | Who accepts a phase's pre-work | Built as "phase review owner or project Lead"; the per-entry marking you asked for is owed |
| 29 | A vulnerable-user group Gate 02 does not imply | Narrows your 25(d) answer — built on the project owner's instruction |
| 30 | At which gate the claim evidence basis and the release decision are filled in | Built at Gate 3 and Gate 11 |
| 31 | What proves the approved artwork version at Gate 11 | Gate 11 and your Q30(c) read different records |
| 32 | Where a market's pack requirements are recorded; whether blank means "none" | Built on the market profile; blank currently passes |
| 33 | Which registers may stay empty on a project and which must always hold entries (all 82 listed with today's assumption) | Gate 10 claims register fixed on our reading; the rest are our assumptions for you to mark |
| 34 | Is a Change Control opened before a change is made or can it record one afterwards; is it a precondition for a new formula version | Nothing enforces an order today; a new formula version can only be created while Gate 05 is the open gate |

Questions 2 to 5, 9, 12 and 13 are cases where we made a judgement rather than leave something unrecorded. We would rather have each confirmed or corrected than have them settle silently into the system.
