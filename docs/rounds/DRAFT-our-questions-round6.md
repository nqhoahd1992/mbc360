# MBc360 — Follow-up questions, Round 6

**For:** the subject-matter team (NPD / Quality / Regulatory / Safety)

This round has eleven questions. They follow from your answers to questions 1, 2, 3 and 37 of Round 5. Question 1 asks how we should read the way the reviewer names are written; question 2 asks you to check a page that lists every role and what it is authorised to do; question 3 asks who may be named to hold a function on a project; question 4 asks what counts as a material change that voids an acknowledgement; question 5 asks how six answers you required should be recorded; question 6 asks how a change to a company list should reach the projects that already rely on it; question 7 asks how the fields of a post-market finding should be filled; question 8 asks which readiness items belong to one market; question 9 asks how the confirmations on a superseded safety finding should be checked; question 10 asks what counts as a change of basis on the watch-lists and how a reassessment is cleared; question 11 asks how the details of a version's supersession market by market should be read.

Where we say "the software development team" we mean the team building this application — not the owner of any product development project.

You can reply by letter, for example "(a) — yes, (b) — row 3 should be …, (c) — option (ii)".

---

## Question 1 — How should we read the reviewer names in the "Acknowledgement function" column?

*Where in the application:* On the **New Project** form (**All Projects** page) the **Functions** section lists who holds each function on a project. On a gate's tab of a **Phase** page, a "not applicable" reason that the system wrote for a critical item is acknowledged by the person who holds the function you named for that item, and it shows "Unassigned" while nobody holds it.

In the table in your answer 1(a) you named who has to acknowledge each critical item. The names are written in several shapes:

- plain function names: *Safety*, *Regulatory*, *Quality*;
- a function with a word after a slash: *Quality / microbiology reviewer*, *Quality / post-market reviewer*, *Quality / change-control reviewer*, *Safety / study reviewer*;
- two functions joined with "with", "and" or ";": *Safety with Regulatory*, *Quality with Manufacturing / R&I*;
- two or three names that stand alone: *Authorised human-study reviewer*, *Technical claims reviewer*, *R&I / Marketing*.

You did not say how these relate to each other, so the software development team has to choose. We noticed one pattern in how you wrote them and we have built on it. **We want to check that we read it correctly, because it decides who is allowed to acknowledge an item.**

**Our reading.** A word that starts with a **capital letter** names a **function that stands on its own**. A word in **lower case after a slash** names a **specialist who sits inside** the function written before the slash. So *Quality / microbiology reviewer* is a Quality person who covers microbiology, and *Safety / study reviewer* is a Safety person who covers studies. A name with no function in front of it (*Authorised human-study reviewer*, *Technical claims reviewer*) we have **kept as its own function with exactly your wording**, because you did not say which function it belongs to.

| Name in your table | How we read it | Right? Or what should it be? |
|---|---|---|
| Safety | A function on its own | |
| Regulatory | A function on its own | |
| Quality | A function on its own | |
| Quality / microbiology reviewer | A specialist inside **Quality** (for *Preservative strategy*, *Preservative efficacy status*) | |
| Quality / post-market reviewer | A specialist inside **Quality** (for *Scheduled market feedback review*, *Baseline post-market surveillance*) | |
| Quality / change-control reviewer | A specialist inside **Quality** (for *Change-control links*) | |
| Safety / study reviewer | A specialist inside **Safety** (for *Infant testing triggered by use and risk*) | |
| Authorised human-study reviewer | Its own function, no function named in front of it (for *Human-study approval before recruitment*) | |
| Technical claims reviewer | Its own function, no function named in front of it (for *Product-performance evidence*) | |
| Manufacturing / R&I | Two separate functions, either of which may acknowledge (for *Scale-up / pilot status*, alongside Quality) | |

**(a)** Is this the right way to read the capital letters and the lower-case words? If not, how should they be read?

**(b)** Please correct any row of the table above that we have read wrongly.

**(c)** Where a specialist is named — for example *Quality / microbiology reviewer* — who may acknowledge that item?

- (i) Only the person who holds that specialism. A person who holds *Quality* but not the specialism may not acknowledge it. *This is what we have built.*
- (ii) Either the person who holds the specialism or the person who holds the function it sits in (here, *Quality*).
- (iii) The person who holds the function it sits in, and the specialist only where one has been named for the project.
- (iv) Something else (please describe).

**(d)** For the two names with no function in front of them, does either belong inside one of the functions you listed in answer 37(b)?

- *Authorised human-study reviewer* — does it sit inside **Clinical / Study Coordinator**?
- *Technical claims reviewer* — does it sit inside **Technical Claims**?

**What we have built, so you can see the effect.** The four specialists and the two stand-alone names are each a separate field on the New Project form, and none of those six is required: a project may leave one empty and it then shows as **Unassigned**, and the item waits until somebody is named, as you asked in answer 37(b). We have **not** treated a Quality person as able to stand in for *Quality / microbiology reviewer*, and we have **not** treated *Authorised human-study reviewer* or *Technical claims reviewer* as the same as the functions you listed in 37(b). If you answer differently, we change who may acknowledge each item.

---

## Question 2 — Please check the page that lists every role and what it is authorised to do

*Where in the application:* On a project, **System Guide & Reference** in the sidebar, then **Role & Authority Matrix**. It is read-only and is generated from the same settings the application uses, so it cannot show something the application does not do. We can also send you a copy of the page.

In answer 37(b) you asked us to record the authorised role matrix and the named assignments. The page does this. For every role a project can name, it shows:

- whether the role is named when the project is created or left optional;
- who holds it on this project (or Unassigned);
- how many sheets it owns, co-reviews and co-signs;
- which "not applicable" reasons it acknowledges (from your answer 1(a)), and which other role must acknowledge the same reason with it;
- any other authority it has.

Below that the page lists the authority that does not belong to a role but to the project's assignments, and the independent function required at each critical gate.

**(a)** Please read the page. Is each role's authority correct? Please tell us what is wrong or missing.

**(b)** The page lists seven kinds of authority that follow the project's assignments rather than a role. Please confirm or correct each:

| Action | Who may do it today | Right? Or what should it be? |
|---|---|---|
| Record a gate's decision, or backtrack from it | The person nominated as "Approved by" for that gate, the project Lead, or an administrator | |
| Approve a phase | The person the project Lead nominated for that row | |
| Change a market's PIF, regulatory, claims and launch approvals | The project's Regulatory and Project Manager people, the project Lead, or an administrator | |
| Confirm that an old formula version is superseded in a market | The project Lead, or an administrator | |
| Nominate who signs a phase or a gate | The project Lead, or an administrator | |
| Assign or change who holds a function on the project | The project Lead, or an administrator | |
| Acknowledge a "not applicable" reason the system wrote | The person holding the function named for that item | |

---

## Question 3 — Who may be named to hold a function on a project?

*Where in the application:* On the **New Project** form (**All Projects** page), the **Functions** section; and the **Project team** card on a project's overview, where the project Lead can name or change who holds a function.

In answer 37(b) you said to "allow the project Lead to nominate authorised people **from the company role matrix**". We are not sure what the company role matrix is, so we have not built the limit it may imply.

Our reading is that it is the company-wide list of roles you gave us in answer F6 (21 July): Project Owner, R&I/Formulation Contributor, Safety Reviewer, Quality Reviewer, Regulatory Reviewer, Packaging/Artwork Contributor, Marketing/Sales Contributor, Supply Chain Contributor, Manufacturing Link Contributor, Study Author, Department Study Reviewer, Independent Study Reviewer, Published Information Technical Reviewer, Published Information Regulatory Reviewer, Final Approver, System Administrator and Read-only Viewer. Each person in the application is given one of these roles by an administrator. On that reading, when the Lead names the person who holds a function, the choice would be limited to people who hold a matching company role — for example only a Safety Reviewer for *Safety / Scientific Review*.

**What we have built.** When the Lead names the person who holds a function, the list offers **every active user**, whatever company role that person has. We did this because the functions in your answers do not line up one-to-one with the 17 roles, and a strict limit would have left some functions with nobody to choose. The consequence is that, for example, a person whose company role is *Read-only Viewer* can currently be named as *Safety / Scientific Review*.

**(a)** Is "company role matrix" the list of 17 roles from answer F6? If not, what is it?

**(b)** When the Lead names who holds a function, should the choice be:

- (i) limited to people who hold a matching company role;
- (ii) open to anyone, but with a visible warning when the person does not hold a matching company role;
- (iii) open to anyone, as it is now;
- (iv) something else (please describe).

**(c)** If the choice is limited (or warned), which company role or roles may hold each function? Please fill in the right-hand column. Four of the functions have no obvious match in the list of 17: *Clinical / Study Coordinator*, *Finance*, *Legal / IP* and *Commercial approver*.

| Function | Company role(s) that may hold it |
|---|---|
| Safety / Scientific Review | |
| Clinical / Study Coordinator | |
| Technical Claims | |
| Regulatory Claims | |
| Manufacturing | |
| Finance | |
| Legal / IP | |
| Commercial approver | |
| Authorised human-study reviewer | |
| Technical claims reviewer | |
| Quality / microbiology reviewer | |
| Quality / post-market reviewer | |
| Quality / change-control reviewer | |
| Safety / study reviewer | |

**(d)** For a function with no matching role in the list of 17, should a new company role be added, or may the Lead name anyone?

---

## Question 4 — What counts as a "material change" that voids an acknowledgement?

*Where in the application:* The block that asks a named person to acknowledge a "not applicable" reason the system wrote, on the page that holds the data behind it (for example the Pregnancy / Breastfeeding Caution Limits register). Once acknowledged, the block shows who acknowledged it and when.

In answer 1(c) you said that "a material change to target users, formula, markets, evidence or the rationale invalidates the affected acknowledgement", that the item is then reassessed against the new facts, and that "pure spelling or formatting corrections may retain the acknowledgement with a recorded editorial change". You did not say what counts as material, so we have read it as follows.

**What we have built.** An acknowledgement is recorded against four facts of the project, and it stops counting, with the item waiting again, as soon as any of them changes:

- the **target users** ticked at Gate 02, and the age groups confirmed for a family-use product;
- the project's **markets**;
- the **major** formula version.

The item is then waiting for an acknowledgement again and the person is told the facts changed. Once the item's gate has passed its evidence is locked, so a change made afterwards (a market added after launch, for example) does not void it; changing those facts for a gate that has passed is a Backtrack, which reopens the gate. A change to the **wording** of the reason alone leaves the acknowledgement standing and the block says the wording was corrected.

**What we have not built.** *Evidence* is not one of the four facts, because we could not tell which evidence you mean. A **minor** formula version does not void an acknowledgement: it does not reopen any gate, and voiding the acknowledgement of a gate that has already passed would reopen it without anyone deciding to.

**(a)** Is the list of four facts right? Please add or remove any.

**(b)** Which evidence should void an acknowledgement, if any? For example a new or changed safety, stability or claim-evidence record, or a change to the ingredient list's risk classification.

**(c)** Should a **minor** formula version void it, or only a major one? If a minor one should, what should happen to a gate that has already passed?

**(d)** Who decides that a correction is purely editorial: the person who holds the function, or the system?

---

## Question 5 — How should "reasonably foreseeable contact" and the unstructured surveillance conditions be recorded?

*Where in the application:* **Phase 1, Gate 02 tab**, inside the Target Users card, a box "Foreseeable maternal and infant contact" that appears only while no pregnant, breastfeeding, postpartum or infant user is ticked; and **Phase 4, Gate 12 tab**, a new block "Enhanced-surveillance conditions the application cannot read".

In the closing paragraph of answer 1 you said that a maternal or infant exclusion "must consider intended and reasonably foreseeable contact, not only marketing ticks", and that an enhanced-surveillance "not applicable" "must assess all applicable triggers, including those not yet structured in the app". You did not say where those judgements are recorded or what the answer looks like, so we have built the following. The four surveillance questions are answered **Yes** or **No**; a **No** must carry its reason and the person who confirmed it ("Record as me"), and editing either withdraws the confirmation; a Yes needs neither. The foreseeable-contact box has no Yes or No, only the reason.

- **Foreseeable contact (one written reason, as you wrote one sentence):** "Why is contact with a pregnant, breastfeeding or postpartum user, or with an infant, not reasonably foreseeable?" It appears only while none of those users is ticked, and Save stays disabled until a reason is written **and a person has recorded themselves as confirming it** ("Record as me", the same way a change is confirmed as administrative-only). A reason nobody has confirmed does not switch anything off. Editing the reason withdraws the confirmation, so the person confirms the new wording. There is no Yes: if such contact is foreseeable, the user is ticked, and that switches the pathway on. A written reason switches both the maternal and the infant pathway off (one reason cannot say which, so we read it as both). Ticking one of those users hides the box and keeps the text, and the ticks then decide on their own: a pregnant, breastfeeding or postpartum user ticked alone means the infant pathway is not assessed from this box, and an infant ticked alone means the same for the maternal pathway.
- **Surveillance, one question per condition** (these are the four of your fourteen conditions for enhanced surveillance that the application has no data to read):
  - "Is there a new or unusual active ingredient?"
  - "Is there a significant complaint trend?"
  - "Is there a recurring quality or performance issue?"
  - "Does an approved surveillance plan require enhanced surveillance?"

A project with no maternal or infant user ticked and no written reason is treated as **not yet assessed**, not as "does not apply": the items that depend on it wait. Ticking the user makes the pathway apply; for surveillance a single Yes on any of the four puts the product under enhanced surveillance, and "does not apply" needs all four answered No with a reason. Every existing project starts with all five unanswered, except where its earlier maternal and infant answers were both No with a reason: that reason carries over.

**(a)** Are these the right questions? Please correct the wording.

**(b)** Who answers each one, and at which gate? We placed the first two at Gate 02 and the four surveillance questions at Gate 12.

**(c)** We now record the person who confirms the foreseeable-contact reason, as for "Administrative-only change" (answer 11), where you asked for confirmation by an authorised reviewer. Should the other answers (the four surveillance questions) also carry a confirming person and a date, as for the family-use ages? And who counts as an authorised person for each of them? Today any signed-in person can record themselves, and the application cannot tell whether they are authorised.

**(d)** Is the complaint trend one of the conditions the application cannot read? We read "a safety or adverse-event issue recorded on the post-market feedback list" as covering safety signals and adverse events only, so a trend of complaints with no safety component is not seen by the application. Please confirm.

**(e)** Are there other conditions the application cannot read that should be asked?

**(f)** On Gate 03 one Key Gate Check row reads "Concept direction and benchmark/competitor review recorded". When a change is confirmed as administrative-only (answer 11) the competitor/benchmark review is not required, so we made the whole row not required and read-only for that project. Is the concept-direction half also exempt for an administrative-only change, or should it stay required and be recorded on its own?

---

## Question 6 — How should a change to a company list reach the projects that already rely on it?

*Where in the application:* the three company lists (Raw Material Risk Overlay, Regulatory market profiles, Claims Library) and, on each project, the **Project Overview**, in a block "Impact of changes to the company lists".

In answer 1(d) you said that a passed gate keeps the list version it used; that a relevant list change "creates a tracked impact assessment, with an owner and due date"; that "a credible Critical safety issue, prohibition or mandatory market restriction puts affected current use/release on hold pending qualified review"; and that Safety/Regulatory and Quality decide scope, urgency and any reopening. You did not say who raises it, who owns the assessment, or what "use/release" means in the application. We have built the following.

- **A passed gate keeps the lists it passed on.** A later edit changes nothing it decided; the project shows a notice of what changed.
- **The person who changes a list raises the signal.** When saving they say whether the change is Critical (a safety issue, a prohibition or a mandatory market restriction), with the reason, and give the date by which the affected projects must review it.
- **Every live project that relies on the entry and has passed at least one gate gets an impact assessment**, owned by the function that judges that kind of list: Safety for a material's risk classification; Regulatory for a market's requirements; Technical claims reviewer and Regulatory for claims wording.
- **A Critical change puts release on hold, and only release.** Gates 10 to 12 cannot pass, and the markets the change covers cannot have launch approved or an actual launch date recorded, until every function on the assessment has concluded. Everything else in the project stays open so the work can be corrected. A market's requirements hold only that market; a material or a claim holds every market of the project.
- **Each function records one conclusion**: "No impact", or "Impact on this project" naming the Change Control record that deals with it, with a rationale either way. The person who raised the change cannot conclude it, and an administrator account does not stand in for the function.
- **A change that is not marked Critical** only opens the assessment; nothing is held.

**(a)** Is the person who changes the list the right person to say it is Critical, or should Safety / Regulatory confirm it before release is held?

**(b)** Is "use/release" the right reading? We hold the release gates (10 to 12) and the launch of the markets affected. Should the hold also stop anything else, or should it reach products already on sale (for example by requiring a decision on their current use)?

**(c)** Are the owners right: Safety for a material's classification, Regulatory for a market's requirements, Technical claims reviewer and Regulatory for claims?

**(d)** Should a project that has not yet passed any gate also receive an assessment? We left it out because its checks already read the current list.

**(e)** An impact that needs rework is concluded by naming a Change Control record. Should concluding also reopen the affected gates, or is that for the people with authority to decide, as now?

## Question 7 — How should the fields of a post-market finding be filled and which are mandatory?

*Where in the application:* **Phase 4**, **Gate 12** tab, block "Change Control required for the post-market finding?".

In answer 2 you listed what each finding carries: a generated Finding ID, source/category, source record link, date identified, affected SKU/formula/batch and market(s), review-cycle ID, severity/priority and disposition, and you said Yes, No and Pending each carry a reviewer, a date and a rationale. All of it is built. You did not say which fields are mandatory or what values some of them take, so we read it as follows:

- **Source / category:** the six kinds in your answer 2(b); mandatory, since that is what makes an issue a finding.
- **Affected market(s):** several may be chosen; mandatory.
- **Review cycle:** chosen from the project's post-launch review schedule (for example "Vietnam, three months") and the reviews already recorded; mandatory once the project has any review cycle. Until a market has launched there is none, and none is asked for.
- **Severity / priority:** the same Low, Medium, High, Critical scale used elsewhere; optional.
- **Disposition:** free text, optional, because you did not give the values.
- **Affected SKU / formula / batch:** one text box.
- **Source record link** and **date identified:** optional.
- **Pending** also needs a reviewer, a date and a rationale (what is awaited), as you wrote; an entry with no answer yet asks for nothing.

*Unrelated markets continue:* a Pending finding in one market no longer holds the other markets (see question 8). A review that a Pending finding belongs to cannot be closed.

**(a)** Does disposition have a list of values? If so, which?

**(b)** Should a finding in a market that has not launched yet be tied to a review cycle, and if so to which?

**(c)** Is the split between mandatory and optional fields above right?

**(d)** Is the shared Low / Medium / High / Critical scale right for severity / priority?

**(e)** Should the affected SKU, formula and batch be three separate boxes?

## Question 8 — Which readiness items are a market's own requirements?

*Where in the application:* **Phase 4**, the **Gate 10, 11 and 12** tabs, which now start with a market switch.

You said that unrelated markets may continue where their own requirements are met. Gates 10 to 12 were already signed one market at a time, but every readiness item looked at the whole project, so an open finding or an unfinished label row in Vietnam also held Singapore. We now judge each market's lane on its own data. You did not list which items belong to a market, so we read it off which data carries a market:

- **Judged per market:** the regulatory checklist and the ASEAN checklist, claim evidence in the SKU claims register, artwork approval and artwork claims, published-information approval, GMP links, released labels, regulatory approval, launch approval, the Gate 10 sign-off of each market, changes that name a market, and the post-launch review, baseline surveillance and Change-control items.
- **Judged for the whole project, so they hold every market:** the formula and the raw-material evidence, safety evidence, the dossier and infant PIF content, claim evidence wording and exemptions, production and release pathway, complaints and CAPA, and the four surveillance conditions the application cannot read.
- A record that names no market is treated as concerning every market, so it can hold a market but never release one.

Two things are stricter than before: a market with no finding recorded for it is held at the Change-control item (a review that found nothing records a No for that market), and a project is ready exactly when all its markets are.

**(a)** Is the list of items judged per market right?

**(b)** May a market that has not launched yet pass Gates 10 and 11 independently of one that has?

**(c)** Is it right that each market's review records its own "no findings requiring Change Control"?

We went further than the readiness items, so that a market is not held by another's:

- **Requirement rows that belong to a market.** In the table "Dossier / HCP Evidence Checks" the row **ASEAN PIF mapped** is now one row for each ASEAN market (none for a market outside ASEAN), and **Country-specific restrictions** is one row for each market. We only split the two rows whose own wording names a market or a country; every other row is still one row for the product.
- **The country/pathway Key Gate Check, two Infant & Baby Safety rows, and the post-market feedback lists.** The Gate 10 check "Countries/regulatory pathway matched and PIF/evidence file mapped" is now one check for each market. In the Infant & Baby Safety table for Gate 10, **Approved age and use statements** and **Label warnings and directions** are one row for each market. The three Gate 12 lists (feedback source, issue type, resulting action) are listed separately for each market.
- **Next actions belong to one market or to all.** On Gates 10 to 12 an action can name a market; one that names none holds every market.
- The Gates 10 to 12 tabs show the rows and actions of the market chosen at the top, and a market's signature covers only that market's rows and actions.

**(d)** Besides the rows, checks and lists named above, which others on Gates 10 to 12 are a market's own (for example the rows "Approved HCP wording" and "PIF/CPSR export-ready", or the other Key Gate Checks)?

**(e)** Is it right that an action on Gates 10 to 12 that names no market holds every market?

**(f)** Should each market move through Gates 10, 11 and 12 on its own? For example, Singapore opens Gate 11 once its own Gate 10 has passed, while Vietnam is still on Gate 10. And may Phase 4 be closed while one market has launched and another has not passed Gate 10?

**(g)** When a market's gate is sent back (Backtrack), should that affect only that market, or the other markets too?

**(h)** When a market is added or withdrawn part-way through, which gate does its own track start at, and what happens to the gates it had already passed?

## Question 9 — A superseded High or Critical safety finding: how should each confirmation be checked?

*Where in the application:* **Formulation Safety** page, table **Critical Safety Findings**, when a finding's Status is "Superseded".

You told us what a superseded High or Critical finding needs: a valid replacement Finding ID, the safety reviewer's reason, the date of supersession, a link to the replacement assessment or evidence, confirmation that each outstanding action is transferred, retained or validly cancelled, and who authorised and who verified it. We have built that. A superseded finding is no longer asked for the closing package, only for this record, and neither it nor its replacement can be removed. Your answer leaves a few details open, so we read them as follows:

- **The reason** goes in the same "Safety reviewer conclusion" box a closed finding uses.
- **The action confirmation is one choice for the finding**: *Transferred to the replacement*, *Retained on this finding*, *Validly cancelled* (your words), and a fourth of ours, *No outstanding action*, so that a finding with no action to account for can still be confirmed. We check it against the actions: *Transferred* needs the replacement to carry an action of its own; *Retained* needs this finding's action to be still open; *Validly cancelled* needs this finding's action to have the status Cancelled; *No outstanding action* is refused while this finding's action is still open.
- **Authorised by** and **verified by** are each recorded as the signed-in person. They may be the same person.
- The record is asked of **High and Critical** findings only; a Medium or Low superseded finding needs only its replacement.

**(a)** Is one choice for the whole finding enough, or must each action be confirmed separately when there are several?

**(b)** Is an action with the status Cancelled enough for "validly cancelled", or must the cancellation also carry a reason or an approver?

**(c)** Must the person who authorises the supersession and the person who verifies it be two different people?

**(d)** Is the fourth choice, "No outstanding action", right?

## Question 10 — Watch-lists: what counts as a change of "basis", and how is a reassessment cleared?

*Where in the application:* Registers **Prohibited Ingredient Watch-list** and **Pregnancy / Breastfeeding Caution Limits**, the match shown on each row, and the Gate 4 and Gate 7 readiness lists.

You told us both lists must flag a formula match by themselves, keep the matching result apart from the reviewer's classification with the formula and list version and the match basis, and mark an earlier conclusion for reassessment where the basis changes. We have built that. A matching ingredient now sets the row to "REVIEW - possible formula match" on both lists; each row shows what matched, against which formula version and which list; and a conclusion reached on a different match is marked "Reassessment needed" without changing what the reviewer chose. Your answer leaves a few things open, so we read them as follows:

- **The basis is the set of matching ingredients**, each by the CAS number or name it matched on. Percentages and the order of the lines are not part of it, so a trial batch that only changes a percentage reopens nothing. Adding a new matching ingredient, or removing one, changes the basis.
- **The list version** is a label we keep for the built-in lists and change whenever a group, keyword or CAS number changes. The controlled lists you described have not been supplied yet.
- **A reassessment is cleared when the reviewer records the review date again** (or changes the classification). It is never cleared by itself.
- **A row marked for reassessment holds Gate 4 and Gate 7.** Because Gate 4 is only passed while nothing blocks it, a Gate 4 that had passed opens again when a new matching material appears. We read "must reopen its affected review" this way, rather than as an automatic Backtrack.

**(a)** Is the basis, as the set of matching ingredients without percentages or order, right?

**(b)** What should the "list version" be once the controlled lists exist?

**(c)** Is recording the review date again enough to clear a reassessment, or must the reviewer record something more?

**(d)** Should a new matching material reopen only that row, and so hold the gate until it is reassessed, or should it send the whole project back to Gate 4 explicitly?

## Question 11 — A version's supersession market by market: how should we read the details your answer leaves open?

*Where in the application:* **Formula BOM** page, card **Formula supersession (per market)**, the **New formula version** form, and **Phase 4**, post-launch reviews.

You told us how an older formula version is superseded: each of the ten facts is confirmed by the function accountable for it, Quality coordinates the market, the authorised final approver confirms the completed transition; the state is kept per market (Active, Transition, Superseded) and the version's state follows from those; a Minor change starts nothing by itself; a documentation-only correction needs no stock transition; a version never released can be superseded once there is confirmation that it was not released; the market's review schedule continues and a materially changed formula has its own early reviews. We have built all of that. Where your answer leaves a detail open we read it as follows:

- **Who confirms which fact.** Replacement version: R&I. Effective transition date: Quality. Last release date and "no further batches": Quality or Manufacturing (whoever holds either on the project). Regulatory notification, artwork and ingredient-list transition, PIF update: Regulatory. Stock disposition: Supply Chain. The Sales & Marketing and the distributor communications: Sales & Marketing.
- **The authorised final approver** is the person holding the Final Approver authority, the one who already gives the commercial approval of a formulation change. An administrator keeps full rights.
- **A different implementation date in the transition plan** is the "effective transition date" a person records. Recording it starts that market's transition at once; we do not wait for the date to arrive.
- **The version's own state:** Superseded when every market is; Active while any market is still Active; otherwise in Transition.
- **A documentation-only correction** is ticked by the person creating the version (Minor only, with its reason); the version it revises is then superseded at once.
- **A materially changed formula's early reviews:** only a **Major** version launched in a market after the first launch there, with the three-month review (and the one-month review where enhanced surveillance applies), counted from that version's own launch. The market's schedule keeps running from the first launch beside them.

**(a)** Is this assignment of the facts to functions right — in particular, whose is the effective transition date?

**(b)** Who, in the company, is the "authorised final approver"?

**(c)** Is a recorded effective date enough to start the transition, or must the date have arrived?

**(d)** Which are the early review milestones of a materially changed formula?

**(e)** May one review cover both versions in a market, and how should it be recorded?
