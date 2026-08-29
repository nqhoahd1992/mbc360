# MBc360 — Business Rules Confirmation Checklist (Pre-Implementation)

**Purpose:** Before building the production backend/database for the MBc360 system, the subject-matter team (Product Development / NPD / Quality / Regulatory) needs to confirm the business rules below. The current ReactJS demo already applies a set of working assumptions to demonstrate the workflow — these assumptions **must be confirmed or corrected** before the real system is built.

**How to use this document:** For each item, please confirm **Correct / Incorrect / Needs adjustment** and record the answer under "Subject-matter team decision".

> **Status (2026-07-16):** Subject-matter team decisions have been received and recorded below for **all items except C7** (still open). Two new requirements were added by the team (GMP Documentation, Published Information Approval workflow). Remaining open points are consolidated in **"Outstanding follow-up questions"** at the end of this document.
>
> **Status (2026-07-21):** The subject-matter team has now answered **all 14 follow-up questions (F1–F14)**, plus the three previously-unanswered items **A5, B5 and C7** (source: `docs/rounds/2026-07-21-sme-reply-F1-F14.txt`). Their answers are recorded inline at each item below and summarised in the outstanding-questions table. **Only one point remains genuinely open: F12** (Cosmetri's compliance coverage of ASEAN/Vietnam — must be confirmed by Cosmetri, not by our team). Everything else is now a matter of **supplying data/content** (see the "Remaining implementation inputs" note at the end), not of deciding a rule.
>
> **Status (2026-08-07) — Round 3 answered.** While wiring the F1 gate-readiness panel we accumulated 19 open questions (tier assignment, items with nowhere to be recorded, mappings we had assumed, decisions we had made on our own reading, and the market-specific items) and sent them as Parts A–E. **The team has answered every one** (source: `docs/rounds/2026-08-07-sme-reply-round3.txt`). They are recorded in full in **"Appendix 2 (2026-08-07)"** near the end of this document, and every question in `docs/rules/F1_Per_Gate_Open_Questions.md` is now closed. This round is **not** cosmetic: it **overturns four things already built** (the per-gate sign-off, two of the four Published-Information claim rules, the unconditional pregnancy screen at Gate 7, and the project-level treatment of Gates 10–11), and it adds a substantial amount of new capture — a Gate 1 request-origin field, a Gate 1 initial scope/market/user capture, a controlled Development Brief record, an explicit vulnerable-user flag, a Phase 1 requirements table, per-claim classification, a watch-list reviewer assessment, and a critical-safety-finding control.

---

## Group A — Data Architecture (confirm these first)

> These questions directly affect the database design. Getting the initial direction wrong here is expensive to fix later.

### A1. Is gate/phase progress tracked per Project or per Market?

**Context:** A project can target multiple markets at once (e.g., Vietnam, Australia, Malaysia). In practice, Gate 10 (Regulatory Dossier) and PIF status can differ per country (approved in Vietnam while still pending in Australia).

**Current demo assumption:** One project = one single 12-gate flow, shared across all selected markets.

**Needs clarification:**
- Should Gate 10–12 (or the whole Regulatory track) be tracked separately per market, or is a single shared gate flow sufficient, with per-market detail living only inside PIF_Checklist_ASEAN?

**Subject-matter team decision:** ✅ **Confirmed — hybrid model.**
- One master project with a **single development workflow for Gates 1–9**.
- **Market-specific tracking for Gates 10–12** (Regulatory, Launch and Post-launch).
- The formulation is developed once, but regulatory approval, PIF status, claims approval and launch readiness can differ by country.
- Each market therefore carries its own: **PIF status, Regulatory status, Claims approval, Launch approval, Regulatory notes, Approval dates**.
- This avoids duplicating development work while allowing country-specific regulatory management.

*Open follow-up: → F4 (interaction with formula changes on launched products; adding/removing a market mid-project; overall project completion when markets diverge).*

> ✅ **Resolved (2026-07-21, F4):** launched per-market Gate 10–12 tracks are **preserved** for the old formula version; a major change creates a **new** per-market Gate 10–12 track for the new version — **concurrent versions are supported** (old version stays on market until formally superseded/withdrawn/depleted). Adding a market creates a new track (and may re-trigger earlier gates if that market differs); removing a market marks it **Withdrawn/Cancelled/Not Proceeding with a reason** (never deleted). Overall project status is an enum: Development complete / Approved in some markets / Approved in all active markets / Market transition underway / Fully closed.

---

### A2. Does a new formula version re-run Gates 4–9?

**Context:** `Product_Family_Register` and `Formulation_Change_Register` show that one product can have multiple formula versions over time (note: Vietnam requires roughly 6 months to re-register after a formula change).

**Needs clarification:** When a new formula version is created for the same product, should the system:
- (a) Create a new project/gate-flow, inheriting the old Phase 1 data; or
- (b) Reopen (backtrack) Gates 4–9 on the existing project; or
- (c) Handle it entirely through Change_Control_Comm without touching the original Gate Flow?

**Subject-matter team decision:** ✅ **Confirmed — Option (b).**
- A new formulation version **re-opens (backtracks) Gates 4–9** on the existing project; it does **not** create a new project.
- The original project remains the master history.
- Phase 1 information (consumer need, product concept, markets etc.) remains.
- Formula redesign, testing, safety and validation are repeated.
- **Major formulation changes automatically create a new formula version** while preserving previous versions for audit history.

*Open follow-ups: → F4 (what happens to closed per-market Gate 10–12 tracks; two versions live in parallel), → F5 (definition of "major" vs "minor" formulation change).*

> ✅ **Resolved (2026-07-21):** **F4** — closed tracks stay with the old version; the new version gets its own per-market track; two versions run concurrently. **F5** — "major" follows the Formula Change Control trigger catalogue (any change that may affect safety/exposure, efficacy/claim support, preservative system, ingredient identity, active concentration, regulatory status, allergen profile, pH outside range, product form, process affecting potency/performance, stability, packaging compatibility, label declaration, or market registration). The initiator may propose the classification, but an **authorised technical or quality reviewer must confirm it** — not user choice alone.

---

### A3. Ingredient/supplier data: shared master data or re-entered per project?

**Context:** `Supplier_RM_Evidence`, `Prohibited_Ingredients`, and `PB_Caution_Limits` behave like a "registry" — e.g., one ingredient's SDS/CoA can apply to many different formulas.

**Current demo assumption:** Each project enters its own data independently; nothing is shared.

**Needs clarification:**
- Should ingredients/suppliers be shared master data (entered once, referenced by every project) or kept independent per project?
- If shared, who is authorized to create/edit this master data?

**Subject-matter team decision:** ✅ **Confirmed — Cosmetri is the master-data source.**
- Raw Material master data already exists in **Cosmetri** and will be sourced via its **API** — no re-entry/duplication inside MBc360.
- **Supplier** master data should also come from Cosmetri where possible.
- Evidence documents (SDS, CoA, TDS, allergen statements etc.) **remain stored in Cosmetri**; MBc360 references/links to them rather than duplicating documents.
- MBc360 is **read-only** for Cosmetri data. All master-data editing remains inside Cosmetri.
- MBc360 only stores **project-specific evidence and links**.

*Open follow-up: → F12 (Cosmetri API technical details; handling of raw materials not yet present in Cosmetri).*

**Update (2026-07-16) — Cosmetri API documentation received (`docs/reference/swagger-init.json`, OpenAPI 3.0, base `https://app1-env.cosmetri.com/api/v1`):**
- **Auth:** OAuth2 password grant via `/oauth/token` → JWT bearer + refresh token (with expiry timestamps). Rate limiting documented (429) on every endpoint; list endpoints support `page`/`limit` and **`since_updated_at`** for incremental sync (no webhooks — polling model).
- **Raw materials** (`/raw-material/{id}`, `/list`, `/details` batch ≤100): trade name, category, **supplier ID + supplier name** (`inf_sup_id`, `supplier_name`), quality status ("Approved"/quarantine), batch no. (`inf_code` — per the official field mapping this is the **Batch No.**, not a CAS number), MOQ, lead time, stock, location, cost.
- **Formulas** (`/formula/*`): formula **version** ("2.1.0"), reference, status, production mode, and full `formula_composition` (RM id/trade name/code + `%`), directly usable to populate MBc360's Formula BOM.
- **Compliance** (`/compliance/{formulaId}`): product type & exposure (leave-on/rinse-off), compliance zones, and `chemical_composition` with **`inci_name`, `cas_no`, `ec_no`, `% w/w`** per ingredient — the ideal input for the automatic prohibited/caution cross-check (C3).
- **Products** and **manufacturing orders**: id/title/reference lookups.
- ⚠️ One **write** endpoint exists (`PUT /raw-material/update` — cost/MOQ/stock). Per the confirmed read-only decision, MBc360 must simply not use it.
- ⚠️ The RM response includes the **supplier name**, but there is **no standalone supplier endpoint** (address/contacts/qualification details are not exposed) and **no document endpoints** (SDS/CoA/TDS files or links are not exposed) — see the narrowed F12.

**Decisions (2026-07-16, following the API review):**
- **Data the API does not provide is entered manually in MBc360** — supplier details beyond the name, and SDS/CoA/TDS document links, stay as manual fields in `Supplier_RM_Evidence`.
- **New raw material process:** a research team member raises a **"Create new raw material" change request in Power Apps** → the request goes through its approval workflow → on approval the material is entered into Cosmetri → it then becomes available to MBc360 via the API. When an ingredient is not yet available for selection, the MBc360 ingredient picker should **link out to the Power Apps request app** so the user can raise the request in place.
- The ASEAN/Vietnam compliance-zone coverage question stays open → F12.

> ⏳ **Still open (2026-07-21, F12) — the one genuinely unresolved point.** The team cannot confirm from the API documentation that Cosmetri's compliance output covers ASEAN/Vietnam, so this **remains open until Cosmetri confirms its current ASEAN/VN coverage**. In the meantime MBc360 must: use Cosmetri compliance data only where the relevant market zone is available; display the source market zone + last-update date; **never assume EU/UK/US compliance equals ASEAN or Vietnam**; run its own MBc360 market-specific regulatory screen in addition to the Cosmetri result; and let Regulatory attach a separate ASEAN/VN conclusion and evidence.

---

### A4. Role-based access control (RBAC)

**Context:** Each gate has a "Primary owner" department (e.g., Gate 07 = Safety/Scientific Review, Gate 10 = Regulatory).

**Current demo assumption:** No permission enforcement — anyone can edit any field.

**Needs clarification:**
- Should the real system enforce role-based restrictions — e.g., only Regulatory can change Gate 10's decision, only the correct person can sign "Approved by"?

**Subject-matter team decision:** ✅ **Confirmed — RBAC must be enforced.**
- Only Regulatory can approve regulatory decisions.
- Only Quality can approve Quality sections.
- Only Safety reviewers can approve safety sections.
- Only authorised approvers can sign Approvals.
- Users may contribute evidence without having approval rights (contribute ≠ approve).
- **Electronic approval history must be retained.**

*Open follow-up: → F6 (concrete role/permission matrix; source of user/department data; delegation; e-signature standard).*

> ✅ **Resolved (2026-07-21, F6):** user identity + department come from the company **SSO/Active Directory**. At least **17 roles** are defined (Project Owner; Formulation Contributor; Safety / Quality / Regulatory Reviewers; Packaging/Artwork; Marketing/Sales; Supply Chain; Manufacturing Link; Study Author / Department Study Reviewer / Independent Study Reviewer; Published-Info Technical Reviewer / Regulatory Reviewer; Final Approver; System Administrator; Read-only Viewer). Contributors **cannot approve their own approval-critical work** unless a documented exception exists. **Delegation** is time-limited, manager/admin-approved, records delegator/delegate/dates/scope, and stays in the audit history. **Electronic approval** records authenticated identity, date/time, role, decision, optional/mandatory comment, the version approved, and an invalidation/supersession trail. A **full 21 CFR Part 11 implementation is not required yet** (sound audit-trail + e-approval principles from the start).

---

### A5. Must the Formula BOM always come from importing an existing Cosmetri formula, or can it also be created manually in MBc360?

**Main question:** Since A3 confirmed Cosmetri as the read-only master-data source for raw materials and formulas, should a project's Formula BOM in MBc360 be populated **only** by importing an already-existing formula record from Cosmetri — or is entering BOM lines manually inside MBc360 (with no Cosmetri record behind them) also an accepted workflow, e.g. while a formula is still in early development and not yet finalized in Cosmetri?

**Current demo assumption:** Both paths are available. "Import from Cosmetri" pulls composition, INCI/CAS identity and supplier name for an existing formula and locks those fields as read-only on the imported lines. A separate "Add line" action lets a user type in a BOM line from scratch with no Cosmetri record at all — those lines stay fully editable, and nothing requires that a project's formula ever exist in Cosmetri.

**Needs clarification:**
1. Should Formula BOM entry require importing from an existing Cosmetri formula (Cosmetri as the mandatory system of record even during early development), with manual entry disallowed?
2. Or is manual entry an accepted step for formulas not yet registered in Cosmetri, to be later replaced/reconciled by a Cosmetri import once the formula is finalized there?
3. If manual entry stays allowed, does it need to be flagged/reconciled against Cosmetri before a specific gate (e.g. 07/10), or is that out of scope?

**Subject-matter team decision (2026-07-21):** ✅ **Confirmed — both paths, with mandatory reconciliation before final safety approval.**
- Manual Formula BOM entry is accepted **for early bench development only** (before the formula is formally entered into Cosmetri).
- Cosmetri becomes the **mandatory controlled system of record** before **Gate 7 final safety approval** and regulatory dossier completion.
- Manual formulas must be clearly marked **"Draft – Not Reconciled with Cosmetri"**; each line should carry a Cosmetri raw-material reference where the material already exists; a material not yet in Cosmetri triggers the Power Apps raw-material request process.
- **Gates 10 and 11 must use the controlled Cosmetri formula and version.** Once reconciled, imported identity/INCI/CAS/composition fields are locked against uncontrolled editing, and any MBc360-vs-Cosmetri difference is resolved through the formula-comparison and change-control process.
- *This is the F14/A5 answer — see F14 below.*

---

## Group B — Gate / Phase Lifecycle Rules

### B1. What determines a Gate has passed?

**Main question:** When is a gate considered PASSED (eligible to unlock the next gate)?

**Current demo assumption:** Stage status = **Complete** AND Gate decision = **Proceed** or **Proceed with Conditions**.

**Needs clarification:**
1. If Stage status = Complete but no Gate decision has been recorded yet — is the gate considered "still pending" (not passed), or is Complete alone sufficient?
2. Does "Proceed with Conditions" count the same as "Proceed" for unlocking the next gate, or does it only allow a "conditional opening" while the attached conditions are tracked separately until phase closure?
3. If Stage status = "Gap" (a deficiency was found) — is the gate hard-blocked from a "Proceed" decision, or can "Proceed with Conditions" still be recorded alongside a Gap?
4. "Hold" appears in both columns (Stage status and Gate decision) — how do these two meanings differ?

**Subject-matter team decision:** ✅ **Confirmed, with two additional conditions.** A gate only passes when **all four** hold:
1. Stage status = **Complete**;
2. Gate decision = **Proceed** or **Proceed with Conditions**;
3. **Required sign-offs completed**;
4. **Mandatory evidence attached**.

Detailed rulings:
- Stage status Complete **without** a Gate decision → the gate remains **Pending** (not passed).
- **Proceed with Conditions unlocks the next gate** while the outstanding actions are tracked (see B2).
- A **Gap prevents a normal Proceed** decision.
- **Hold as a Status** = work has stopped; **Hold as a Gate decision** = progression is blocked.

*Open follow-ups: → F1 (conditions 3 and 4 are new and undefined — the per-gate list of required sign-offs and mandatory evidence is exactly the unanswered question C7), → F7 (does a Gap also block "Proceed with Conditions", or only plain "Proceed"?).*

> ✅ **Resolved (2026-07-21):** **F1** — conditions 3 & 4 now have a concrete per-gate list (Gates 1–12) under a 3-tier Mandatory/Conditional/Supporting model, surfaced through a Gate Readiness panel — see the full F1 answer below and the C7 decision above. **F7** — a **Gap blocks plain Proceed**; **Proceed with Conditions stays available only** when the gap is not safety/regulatory/release-critical, an authorised reviewer accepts the temporary risk, and a controlled Next Action (owner, due date, escalation) is created; **critical gaps must go to Hold, Backtrack or Reject/Stop.**

---

### B2. Next action / Next due date / Next owner

**Main question:** Are these three fields purely informational records, or do they drive any logic (blocking a gate/phase)?

**Current demo assumption:** Purely informational, blocks nothing; a single record per phase (not a repeating list).

**Needs clarification:**
1. Can one phase have multiple Next actions (a list), or is a single row (as in the current demo) sufficient?
2. If a Next action is still open (unresolved), can the phase still be considered "complete"? Or does an open Next action necessarily imply the decision must be "Proceed with Conditions" (related to B1)?
3. Does Next action need its own status (Open / In Progress / Done) to track, or is it just free text with no tracking?
4. Who is responsible for closing a Next action — the person at the current phase (who recorded it), or the recipient at the next phase (the named owner)?

**Subject-matter team decision:** ✅ **Confirmed — Next Actions become their own controlled records.**
- Each **gate** may have **multiple** actions (a list, not a single row).
- Each action carries: **Description, Owner, Due date, Status, Priority, Date completed**.
- Open actions may exist **only** if the gate decision is **Proceed with Conditions**.
- Otherwise all actions should normally be completed before gate closure.

*Open follow-up: → F8 (original question 4 not answered: who is authorized to close an action; also the Priority value list).*

> ✅ **Resolved (2026-07-21, F8):** the action **Owner** is responsible for completing it, but the **raiser, the relevant gate owner, or an authorised reviewer verifies and closes** it — the owner **cannot unilaterally verify closure** where independent confirmation is required. Status workflow: **Open → In Progress → Awaiting Information → Ready for Verification → Closed → Cancelled**. Priorities: **Low / Medium / High / Critical** — **Critical actions block normal gate closure.**

---

### B3. What determines a Phase is complete?

**Main question:** When is a phase considered COMPLETE? Please confirm whether each condition below is mandatory:

| # | Condition | Mandatory? |
|---|---|---|
| a | All 3 gates in the phase have Passed (per B1) | ✅ Yes |
| b | All Key Gate Checks for the phase = Done/Y (or N/A) | ✅ Yes |
| c | All 8 Angles Coverage = Covered (or justified N/A) | ✅ Yes |
| d | Sign-off from all 3 roles (Prepared / Reviewed / Approved) | ✅ Yes — all three roles required |
| e | All Next actions are closed | ✅ Yes — unless the decision is Proceed with Conditions |

**Current demo assumption:** Only (a) plus the "Approved by" part of (d) are enforced — (b), (c), and (e) are not currently checked.

**Needs clarification:**
1. If an item in Key Gate Checks / 8 Angles is marked N/A — does that count as "satisfied"?
2. Is there a required order — must Key Gate Checks + 8 Angles be fully completed before Sign-off is allowed, or can the two proceed independently in parallel?

**Subject-matter team decision:** ✅ **Confirmed — all conditions (a)–(e) are mandatory** (with the Proceed-with-Conditions exception on (e)).
- **N/A counts as complete only when justified** (a justification must be recorded).
- **Sign-off should only become available after the required sections have been completed** (enforced order, not parallel).

---

### B4. Backtrack cascade and handling of prior data/sign-offs

**Concrete example:** Backtracking from Gate 5 (Phase 2) to Gate 2 (Phase 1).

**Main question:** Do Gate 3 (Phase 1) and Gate 4 (Phase 2) — sitting between the target gate and the originating gate — automatically revert their Stage status to "Not Started"?

**Current demo assumption:** Yes — every gate from the target through the gate just before the originating one automatically reverts to "Not Started", and the "Approved by" sign-off of any phase whose closing gate got reopened (Phase 1) is cleared, forcing re-approval. Other data (Owner, Due date, Evidence link, Notes) is not wiped — only a note describing the backtrack event is appended to the Notes field. No separate snapshot/revision is kept.

**Needs clarification:**
1. On reset, which fields should be wiped clean vs. kept for reference? (previous Gate decision, Owner, Due date, Evidence link, Notes)
2. The previously Approved sign-off on Phase 1: should it be automatically invalidated and require re-signing (as the demo currently does), or should the old signature be preserved as history, with only a note added ("backtracked — needs re-review"), without forcing a re-sign?
3. Is it mandatory to keep a revision/audit trail of the data before it gets reset? For example: a snapshot of Gates 2/3/4 plus the Phase 1 sign-off at the moment before the backtrack, attached to a "Backtrack Event Log" (who, when, from which gate to which gate, reason, what the prior data was)?
   - *Related note*: the source file's Introduction sheet explicitly describes this as a "controlled project evidence record" and states a "no silent corrections" principle — if that principle applies here, this may be a mandatory requirement rather than optional.
4. Is there a scope limit on backtrack — is it allowed to backtrack across multiple phases (e.g., from Phase 3/Gate 8 all the way back to Phase 1/Gate 1), or is it restricted to a nearby range only?

**Subject-matter team decision:** ✅ **Confirmed — backtracking must preserve complete audit history.**

When a gate is reopened:
- Stage status **resets**;
- Previous approvals become **invalid**;
- **Re-approval is required**.

However, **nothing is ever deleted**. Instead:
- Previous approvals **remain in history**;
- Previous evidence **remains linked**;
- A **Backtrack Event Log** records: who initiated it, date, reason, gates affected, previous approvals, previous decisions.

**Backtracking is allowed across any phase** if justified. This aligns with MBc360's principle of **no silent corrections**.

> **Implementation note:** this overturns the current demo behaviour (which clears the decision and sign-off fields in place). The production design needs an event-log/snapshot model: invalidation is a *new recorded event*, never an overwrite.

---

### B5. Should a locked (not-yet-reached) phase block all form input, or only gate decisions/sign-off?

**Main question:** When a phase is "locked" because its preceding gates/phases have not fully passed, should every data-entry control on that phase's page be disabled, or only the controls that drive formal progression?

**Current demo assumption:** Only the Gate Flow decision controls and the phase Sign-Off block are disabled while a phase is locked. Every other form on the page (checklist selections, requirement rows, key gate checks, next actions, 8-angles coverage) stays fully editable, so a team can start entering evidence ahead of time. The page shows a banner explaining this: *"You can still review the forms below, but the gate flow stays read-only."*

**Needs clarification:**
1. Is early/pre-work data entry on a not-yet-reached phase actually desired, or should the whole page stay read-only until the phase is reached in order?
2. If pre-work is allowed, does data entered "early" need any visual/procedural distinction from data entered during the phase's normal window (e.g. a flag noting it was entered before the phase formally opened)?

**Subject-matter team decision (2026-07-21):** ✅ **Confirmed — the current demo approach is broadly correct; early/pre-work entry is allowed.**
- While a phase is locked: gate decisions, sign-off and formal stage closure stay disabled; users may still add draft evidence, requirements, notes, risks and proposed actions.
- Early entries must be visibly marked **"Pre-work / Entered Before Gate Opened"** and retain the entry date and user.
- Once the phase opens, the responsible owner must review and formally accept or update the pre-work before it can contribute to completion. This supports parallel working without allowing uncontrolled progression.
- *This is the F13/B5 answer — see F13 below.*

---

## Group C — Specific Business Rules

### C1. Does "Skincare for Two" actually block the gate?

**Context:** The Introduction sheet states: *"Maternal products must include maternal use plus baby-contact/infant exposure consideration; this is mandatory, not optional."*

**Needs clarification:**
1. How is this "mandatory" condition triggered automatically — by the user selecting "Pregnancy/Breastfeeding/Postpartum/Infant 0+" at Gate 02 (Phase 1)?
2. Once triggered, is Gate 07 hard-blocked from a "Proceed" decision if the maternal & baby-contact safety items are not yet complete — or is it only a reminder, as it currently is?

**Subject-matter team decision:** ✅ **Confirmed — mandatory, hard requirement (not a reminder).**
- Automatically activates whenever the intended user includes: **Pregnancy, Breastfeeding, Postpartum**.
- Once activated: **maternal safety AND infant-contact assessment both become mandatory**.
- **Gate 7 cannot pass** until both have been completed.

*Open follow-up: → F2 (the reply omits "Infant 0+" from the trigger list — does a baby-only product, with no maternal selection, also activate Skincare for Two?).*

> ✅ **Resolved (2026-07-21, F2):** **"Infant 0+" alone does NOT activate Skincare for Two.** Skincare for Two is triggered only by **Pregnancy / Breastfeeding / Postpartum** (maternal use + baby-contact assessment). "Infant 0+" instead activates a **dedicated Infant & Baby Safety workflow** (infant skin characteristics, exposure, accidental oral contact where relevant, eye-area use, body area, frequency, age suitability). A product intended for **both** maternal and infant use activates **both** workflows.

---

### C2. Is the Study/Human Trial approval chain a fixed set of roles?

**Context:** The Introduction states specifically: *"Chris prepares study proposal, George/Head of Department signs off, Sekar or nominated independent reviewer signs off outside the department."*

**Needs clarification:**
1. Is this a dedicated approval workflow for the Study Protocol (3 roles distinct from the generic Prepared/Reviewed/Approved block), or does it reuse the existing Gate 08 Sign-off block?
2. Should the system enforce that the "independent reviewer" cannot be from the same department as the preparer (to avoid conflicts of interest)?
3. Are the named individuals (Chris/George/Sekar) illustrative examples, or fixed roles that need to be hard-coded?

**Subject-matter team decision:** ✅ **Confirmed — a dedicated approval workflow, separate from normal gate approvals.**
- Roles: **Study Author, Department Reviewer, Independent Reviewer**.
- These are **roles, not named individuals** (no hard-coding of names).
- The system **must prevent** the Independent Reviewer from belonging to the same department as the Study Author.

*Depends on → F6 (user/department data is required to enforce the cross-department rule).*

> ✅ **Resolved (2026-07-21):** F6 is answered — user + department come from **SSO/AD**, which supplies the data needed to enforce **Independent Study Reviewer ≠ Study Author department**. Dedicated **Study Author / Department Study Reviewer / Independent Study Reviewer** roles exist in the F6 role list.

---

### C3. Prohibited Ingredients / Caution Limits: automatic cross-check or manual entry?

**Context:** The Template_Index states: *"Formula match formulas flag possible matches"* — which sounds like an automated cross-reference.

**Needs clarification:** When an ingredient name is entered into the Formula BOM, should the system automatically scan the Prohibited/Caution lists to flag it immediately (e.g., "REVIEW - possible formula match"), or is this entirely a manual check with the user entering the conclusion by hand?

**Subject-matter team decision:** ✅ **Confirmed — automatic.**
Whenever a Formula BOM is entered, MBc360 automatically compares ingredients against:
- Prohibited Ingredients;
- Pregnancy/Breastfeeding Caution Ingredients;
- Regulatory restriction lists;
- Internal prohibited lists.

The system immediately flags potential issues for review.

*Open follow-up: → F3 (matching mechanics: the watch-lists contain group names ("Parabens", "Formaldehyde releasers") while the BOM holds INCI names — a group→INCI/CAS mapping source is needed, plus the source and update cadence of per-market regulatory restriction lists).*

> ✅ **Resolved (2026-07-21, F3):** matching priority = **exact Cosmetri RM identifier → exact INCI → CAS → synonym/group mapping → manual scientific review** when automatic matching is uncertain. The prohibited/restricted/caution lists are **controlled reference datasets maintained by Regulatory & Safety**; each entry carries ingredient/group name, INCI names, CAS numbers, synonyms, relevant markets, restriction/caution, max concentration/condition of use, source, effective date, last-review date, owner and version. Regulatory reviews market restriction lists **at least annually** (and on any relevant regulatory change); pregnancy/breastfeeding limits are reviewed on new evidence. **Automatic matches are screening flags — they do not replace qualified review.**

---

### C4. Does an open Change Control record block the Gate Flow?

**Main question:** If a Change Control record related to a project is open (not yet closed), does that have any effect on the project's Gate Flow?

**Current demo assumption:** The two tracks are entirely independent, with no linkage.

**Needs clarification:** Should a Change record be required to link to the specific Gate/Phase it affects, with that gate "soft-locked" or flagged until the Change is closed?

**Subject-matter team decision:** ✅ **Confirmed — Change Control is linked directly to gates.**
- An open Change Control record creates a **soft lock or warning** on the affected gate until the change has been assessed and closed.
- This maintains traceability.

*Open follow-up: → F9 (which Change statuses count as "open"; what the soft lock concretely does — banner only, or required acknowledgement before the gate decision).*

> ✅ **Resolved (2026-07-21, F9):** **open** statuses = Draft, Submitted, Under Review, Approved–Implementation Pending, In Implementation, Verification Pending, On Hold (Completed / Rejected / Cancelled / Superseded = closed, once the final disposition is recorded). The soft lock shows a **prominent warning** on the affected project/formula version/market/gate, identifies the open change and its owner, **requires the user to acknowledge the open change before recording a gate decision**, and **blocks plain Proceed** where the change may affect the gate conclusion (Proceed with Conditions only if an authorised approver accepts it). Changes involving safety, formula identity, regulatory approval, artwork, claims or launch release **may become a hard block** depending on assessed impact.

---

### C5. Is PIF export/launch hard-blocked by PIF status?

**Context:** *"No external HCP/distributor/pharmacy claim use until PIF attachment status and approval are closed."*

**Needs clarification:** Is Gate 11 (Production/Launch sign-off) hard-blocked if PIF_Checklist_ASEAN is not fully closed (per the relevant market — see A1), or is this only a warning/recommendation?

**Subject-matter team decision:** ✅ **Confirmed — hard block, managed per market.**
PIF completion hard-blocks:
- Launch approval;
- External claims;
- Distributor information;
- Healthcare Professional information.

A product may launch in one country while remaining blocked in another (consistent with A1's per-market Gate 10–12 tracking).

*Open follow-up: → F10 (non-ASEAN markets — EU CPSR, Australia, US — which checklist plays the role of PIF_Checklist_ASEAN per market?).*

> ✅ **Resolved (2026-07-21, F10):** use a **configurable per-market "Market Dossier Profile"** rather than assuming the ASEAN PIF checklist everywhere — e.g. ASEAN/VN (ASEAN PIF + local notification), EU/EEA (PIF/CPSR/CPNP/Responsible Person), UK (UK PIF/CPSR/SCPN/RP), Australia (product+ingredient compliance, AICIS where applicable, labelling/claim review + company Product Master File), US (MoCRA + applicable FDA records, safety substantiation, claim/labelling), other markets configurable. **Regulatory maintains each market's checklist profile without a software rebuild.**

---

### C6. Does `PIF_Evidence_Closure` actually hard-block external use of claims/information?

**Context:** The `PIF_Evidence_Closure` sheet lists triggers (new claim, new public information, formula change, distributor/HCP question, etc.) with a **"Blocks external use until closed?"** column — every row is marked **Y**. For example: a new claim must be added to `SKU_Claims_PIF_Register` with evidence attached before use; new public information must go through `Published_Info_Approval` before publication.

**Current demo assumption:** These two sheets (`SKU_Claims_PIF_Register`, `Published_Info_Approval`) now have data-entry screens (register-style), but they only **record** information — the app has no mechanism that actually blocks "external use".

**Needs clarification:**
1. What does "blocks external use" concretely block within the system — does it prevent Gate 10/11 from turning Complete, or is it purely a procedural rule (enforced by people, since "external use" — sending an email, posting on social media — happens outside the system and can't literally be blocked by software)?
2. If a claim/public information item is not yet closed (no PIF link attached) but Gate 10 is already Complete — is that considered a violation/conflict worth flagging, or are the two entirely independent?
3. Is an attestation/confirmation step needed before content is published externally, so the system at least records that the user checked the PIF closure condition before publishing?

**Subject-matter team decision:** ✅ **Confirmed — elevated to a mandatory "Published Information Approval" workflow** (new requirement, to be incorporated into the application).

Any information intended for public release — including websites, brochures, technical documents, distributor materials, presentations, HCP materials, **AI-generated content**, social media, and product claims — must pass the workflow before release. The workflow includes:
1. Guidance on acceptable terminology and claims;
2. Required evidence types for each claim;
3. Verification that evidence has been linked;
4. Technical review;
5. Regulatory review where applicable;
6. Final approval before publication.

**No public information may be released until this workflow has been completed.**

*Open follow-up: → F11 (workflow states/roles per content type; source and maintenance of the terminology/claims guidance).*

> ✅ **Resolved (2026-07-21, F11):** workflow **states** = Draft, Evidence Gathering, Technical Review, Regulatory Review Required, Regulatory Review Complete, Revision Required, Final Approval Pending, Approved for Release, Released, Expired, Withdrawn, Superseded. **Roles** = Content Owner/Author, Technical Reviewer, Regulatory Reviewer (whenever content includes claims/safety/compliance/directions/warnings/market-specific/HCP content), Final Authorised Approver (marketing-only aesthetic content may skip Regulatory, but any product statement must use approved wording). Terminology/claim guidance comes from a **controlled Published Product Information Guideline / Claims Library** maintained jointly by **Technical + Regulatory**; the system confirms correct SKU/formula version, linked evidence, PIF/Product-Master-File status, current market approval and that released content matches the approved version. **Releasing without approval generates a deviation/violation record.** Scope covers websites, social media, brochures, catalogues, presentations, distributor/pharmacy & HCP docs, training, ads, **AI-generated content**, label/artwork text and external technical summaries.

---

### C7. Should safety/PIF evidence registers be a mandatory condition to pass a gate?

**Context:** The app now has ~37 evidence registers (Formulation_Safety, Prohibited_Ingredients, PB_Caution_Limits, PIF_Checklist_ASEAN, ...), each tagged with a "Gate 0X" label for reference. That tag is **purely cosmetic** — the gate-pass mechanism (see B1) only reads Stage status + Gate decision from the Phase Gate Flow table, and never reads data inside these evidence registers.

**Current demo assumption:** It's possible for Gate 07 to already be Complete + Proceed while `Prohibited_Ingredients` still has a row marked "REVIEW - possible formula match" unresolved, or while `Formulation_Safety`'s "Final safety release" is still "Not Started" — the system does not warn or block in that case.

**Needs clarification:**
1. Are there specific evidence registers (e.g. Formulation_Safety's Final Safety Sign-off, or Prohibited_Ingredients having no remaining "REVIEW"/"Prohibited - remove" rows) that should become a **mandatory condition** for Gate 07/10 to be allowed to reach Complete?
2. If so, should it hard-block (disallow selecting a Proceed decision) or only soft-warn (allow Proceed but show a banner flagging unresolved evidence)?
3. Should this apply to all 37 registers, or only a subset of "safety-critical" ones?

**Subject-matter team decision (2026-07-21):** ✅ **Confirmed — a risk-based subset, using a 3-tier classification (not all 37 registers hard-block).**

Each register is classified as:
- **Mandatory** — hard-blocks gate passage.
- **Conditional** — becomes mandatory (and hard-blocks) only when triggered by product type, user, market, claim or change.
- **Supporting** — may be incomplete without blocking the gate, provided the resulting risk is documented (generates warnings/actions, not an automatic block).

Safety-critical and regulatory-critical registers **must hard-block** the relevant gate. The system provides a **Gate Readiness panel** per gate showing: mandatory items complete, conditional items triggered, blocking gaps, warnings, missing evidence links, required sign-offs, open Next Actions, open Change Controls, and a current readiness result of **Not Ready / Ready with Conditions / Ready for Decision / Passed**.

The concrete per-gate list of required evidence and sign-offs (Gates 1–12) is given in the **F1** answer below — this is the same 3-tier model applied gate by gate.

> **Implementation note:** F1/C7 unblocks `gateBlockers()` — the per-gate Mandatory/Conditional items become hard blocks, Supporting items become warnings, and the Gate Readiness panel is a new UI surface. The remaining work is mapping each listed item to a concrete register/field in the app and to a trigger condition.

---

## Project lifecycle authority (2026-07-26, decided by the project owner)

These were **decided by us, not asked of the subject-matter team** — recorded here so the decisions are visible to everyone reading this document, and so they can be challenged if they conflict with how the business actually works. They are implemented and enforced by the server, not just hidden in the interface.

### D1. Who may delete a project — and what a deletion destroys

✅ **Only a System Administrator may delete a project, and the deletion removes the project's entire audit trail with it.**

Deleting a project removes its data across ~18 related tables (gate records, checklists, registers, BOM, market tracks, sign-offs, …). Previously the audit events survived the deletion but lost their link to the project — you could still read *"someone changed Gate 01's owner"* without being able to tell **which project** it belonged to. That is worse than either keeping or removing them, so the audit trail is now deleted together with the project.

**One record deliberately survives:** a tombstone entry stating who deleted what, when, whether the project had been archived first, and how much was destroyed (e.g. 12 gate records, 255 register rows, 2 audit events). A project must never be able to vanish leaving no trace of who removed it — that is rule B4 ("no silent corrections") applied to deletion itself.

Deletion authority is **not** a permission that can be granted on the Roles screen. It is tied structurally to the System Administrator role, precisely so it cannot be handed to another role by mistake.

### D2. Who may archive a project

✅ **Only the Project Owner may archive (and restore) a project. No other role may archive or delete.**

Archiving is the route every non-administrator role has for retiring a project: it is **reversible**, nothing is deleted, and the project simply drops out of the default project list (a "Show archived" toggle brings it back into view). Unlike deletion, this *is* a permission on the Roles screen, so the authority can be adjusted later without a software change.

A System Administrator may also archive — it can already perform the strictly more destructive deletion, so refusing it the lesser action would be incoherent.

### D3. An archived project is read-only

✅ **While a project is archived, none of its data may be changed — by anyone, including a System Administrator. Restore it first.**

Read-only is a property of the **project's state**, not of the user's permissions: if an administrator could edit through it, "archived" would mean nothing. Two things stay available: restoring it (that is the way out), and — for a System Administrator — deleting it, which is the natural archive-then-delete sequence.

### D4. Who may create a project

✅ **Any signed-in user may create a project.** Restricting this would block ordinary business use (a Project Owner opening a new project), and creating a project destroys nothing — a mistake can be archived or deleted.

### D5. Gate 1's "Project owner" — an explicit tick, not an automatic pass

✅ **Gate 1's "Project owner" item is satisfied by ticking the Key Gate Check "Initial project record opened and owner assigned"**, exactly like its two sibling rows at that gate.

> **Corrected 2026-08-07.** This section previously recorded the opposite decision — that the item was *satisfied automatically*, on the reasoning that Project Lead is a required field on the Create New Project form, so a project cannot exist without one and re-confirming it is redundant. **That reasoning was withdrawn in the code on 2026-07-26 but never written back into this document**, so the paragraph here has been stating a rule the system does not follow. The withdrawal reason: it conflated *"the underlying fact is guaranteed"* with *"the confirmation step is redundant."* Every other Key Gate Check row requires an explicit tick however obvious the fact behind it is — "Product request, opportunity and requester captured" is equally guaranteed by the creation form — so singling this one row out to auto-pass was inconsistent, and it removed the only place a reviewer records that they actually looked.

**This particular item was never put to the subject-matter team** — it was our own call in both directions, so it is recorded here rather than in the confirmed-rules sections above. The team's Round 3 reply does not mention it. It does, however, twice reject the same *shape* of reasoning, which is why the correction is being left as it stands rather than reopened: **B4** — the four Phase 1 checklist sections "should contribute to the brief but should not substitute for formal brief approval"; and **B5** — a general-adult project "should still record *No vulnerable-user group identified* rather than satisfying the requirement by default." **D1** points the same way, requiring three explicitly recorded sign-offs per gate rather than anything inferred. If the team later says an auto-satisfied item is acceptable where the underlying field is mandatory, this is the row to revisit first.

---

## Additional requirement — GMP Documentation (added by the team)

Manufacturing already operates its own controlled GMP documentation system.

**MBc360 must NOT generate or maintain GMP documents**, such as:
- Manufacturing BOMs;
- Production schedules;
- Batch Manufacturing Records;
- GMP work instructions.

Instead, MBc360 contains a **"GMP Links"** section which stores references/hyperlinks to those controlled GMP documents within the Manufacturing system. This avoids duplication while maintaining full traceability.

> *This matches the existing `GMP_Links` register in the demo (links only) — no change of direction needed.*

## Overall system intent (stated by the team)

> MBc360 becomes the company's **single evidence and governance platform**, while **integrating with specialist systems** (such as Cosmetri and GMP Manufacturing) **rather than replacing them**.

---

## Outstanding follow-up questions

> **Update (2026-07-21): all 14 follow-ups have been answered** (source: `docs/rounds/2026-07-21-sme-reply-F1-F14.txt`). The table below now records the confirmed answer for each. **Only F12 remains genuinely open** — it depends on Cosmetri confirming its ASEAN/Vietnam compliance coverage, which is outside our team's control. The full per-gate mandatory-evidence list for F1 is in the appendix section that follows this table.
>
> Legend: ✅ = answered/closed · ⏳ = still open.

| # | Relates to | Status | Confirmed answer (2026-07-21) |
|---|---|---|---|
| **F1** | C7, B1 | ✅ | 3-tier classification — **Mandatory** (hard-block), **Conditional** (hard-block when triggered), **Supporting** (warning only) — with an explicit per-gate required list for **Gates 1–12** and a **Gate Readiness panel** (Not Ready / Ready with Conditions / Ready for Decision / Passed). Full per-gate list in the appendix below. |
| **F2** | C1 | ✅ | **"Infant 0+" alone does NOT trigger Skincare for Two.** It activates a separate **Infant & Baby Safety workflow**. Skincare for Two = Pregnancy/Breastfeeding/Postpartum only; a maternal+infant product activates both. |
| **F3** | C3 | ✅ | Match priority: Cosmetri RM identifier → INCI → CAS → synonym/group mapping → manual review. Watch-lists are **controlled datasets maintained by Regulatory & Safety** (INCI/CAS/synonyms/markets/limits/source/dates/owner/version), reviewed ≥ annually. Auto-matches are screening flags only. |
| **F4** | A1 × A2 | ✅ | **Multiple concurrent versions supported.** Old version keeps its closed per-market Gate 10–12 tracks; a major change creates a **new** per-market track for the new version. Adding a market = new track (may re-trigger earlier gates); removing = mark Withdrawn/Cancelled (never delete). Project status enum: Development complete / Approved in some / Approved in all active / Market transition underway / Fully closed. |
| **F5** | A2 | ✅ | Formula Change Control trigger catalogue is the classification framework; **major** = any change possibly affecting safety, efficacy/claims, preservative, ingredient identity, active %, regulatory status, allergen, pH out of range, form, process, stability, packaging, label declaration or registration. Initiator proposes; **an authorised technical/quality reviewer must confirm** — not user choice alone. |
| **F6** | A4, C2 | ✅ | Identity/department from **SSO/AD**. **≥17 roles** defined (see A4 above). Contributors cannot approve their own approval-critical work. Delegation time-limited, manager-approved, audited. E-approval records identity/time/role/decision/version + invalidation trail; **full 21 CFR Part 11 not required yet** (sound principles from the start). |
| **F7** | B1 | ✅ | **Gap blocks plain Proceed.** Proceed with Conditions only if the gap is non-critical, an authorised reviewer accepts the risk, and a controlled Next Action exists. **Critical gaps → Hold / Backtrack / Reject.** |
| **F8** | B2 | ✅ | Owner **completes**; raiser / gate owner / authorised reviewer **verifies & closes** (owner cannot unilaterally close where independent confirmation is required). Statuses: Open / In Progress / Awaiting Information / Ready for Verification / Closed / Cancelled. Priorities: Low / Medium / High / **Critical** (Critical blocks gate closure). |
| **F9** | C4 | ✅ | Open = Draft / Submitted / Under Review / Approved–Impl Pending / In Implementation / Verification Pending / On Hold. Soft lock = prominent warning + **required acknowledgement** before a decision + **blocks plain Proceed** where impactful; may **hard-block** for safety/formula-identity/regulatory/artwork/claims/launch changes. |
| **F10** | C5 | ✅ | **Configurable per-market Market Dossier Profile** (ASEAN PIF, EU PIF/CPSR/CPNP, UK PIF/CPSR/SCPN, AU AICIS + Product Master File, US MoCRA/FDA, others configurable). **Regulatory maintains profiles without a rebuild.** |
| **F11** | C6 | ✅ | 12 workflow states (Draft → … → Approved for Release → Released → Expired/Withdrawn/Superseded); roles = Content Owner, Technical Reviewer, Regulatory Reviewer (where applicable), Final Approver; guidance from a controlled **Claims Library** maintained by Technical + Regulatory; release-without-approval = deviation record. |
| **F12** | A3 | ⏳ **OPEN** | **The one item still open.** Cannot confirm Cosmetri compliance covers ASEAN/Vietnam — **remains open until Cosmetri confirms**. Meanwhile MBc360 runs its own market-specific regulatory screen in addition to Cosmetri, shows source zone + last-update, never assumes EU/UK/US = ASEAN/VN, and lets Regulatory attach a separate ASEAN/VN conclusion. |
| **F13** | B5 | ✅ | Early/pre-work entry **allowed**; only gate decisions/sign-off/formal closure disabled while locked. Early entries marked **"Pre-work / Entered Before Gate Opened"** with date+user; owner must review/accept them once the phase opens. |
| **F14** | A5 | ✅ | Both paths during development; manual marked **"Draft – Not Reconciled with Cosmetri"**; **must reconcile to a Cosmetri formula before Gate 7 final safety approval**; **Gates 10 & 11 must use the controlled Cosmetri formula/version**; imported identity/INCI/CAS/composition locked once reconciled. |

---

## Appendix (2026-07-21) — F1: Per-gate mandatory evidence & sign-offs

Applying the 3-tier model (**Mandatory** hard-blocks · **Conditional** hard-blocks when triggered · **Supporting** warns only). Every gate additionally requires **Prepared / Reviewed / Approved sign-off**. Hard blocks apply to mandatory safety, regulatory, PIF, claim and release evidence; supporting information warns rather than blocks.

- **Gate 1 — Opportunity & Request:** product request record, project owner, request source, initial product scope, initial target market & user.
- **Gate 2 — Target User & Brief:** approved development brief, target user & life stage, intended use & body area, selected markets, vulnerable-user flags, project requirements & exclusions.
- **Gate 3 — Product Concept & Claims:** product concept, proposed claims list, preliminary claim classification, evidence requirements per claim, competitor/benchmark review where applicable, regulatory review of high-risk/borderline claims. *(A claim may stay under development, but unsupported wording must not be marked approved.)*
- **Gate 4 — Ingredient & RM Screening:** ingredient set, ingredient identity + Cosmetri reference where available, supplier/RM evidence status, prohibited & restricted screen, pregnancy/breastfeeding caution screen when triggered, allergen/impurity/contaminant review where relevant, **no unresolved "Prohibited – remove"**. *(An unresolved possible match allows Proceed with Conditions only where a qualified reviewer assessed it non-critical with a controlled action.)*
- **Gate 5 — Formula Design & Development:** current formula version, composition or controlled Cosmetri reference, target pH + acceptable range, process requirements affecting function, preservative strategy where applicable, compatibility assessment, initial efficacy rationale/MoA mapping, costing/commercial feasibility status.
- **Gate 6 — Packaging & Components:** proposed pack spec, packaging compatibility requirements, label & artwork requirements, component supplier status, market-specific pack requirements, link to controlled packaging evidence.
- **Gate 7 — Safety Review (SAFETY-CRITICAL HARD BLOCK):** final formulation safety review completed, prohibited screen closed, restricted/caution assessment closed, exposure/intended-use assessment, allergen & impurity review, maternal + infant-contact assessment when Skincare for Two triggered, safety conclusion + limitations, required safety-reviewer approval, no unresolved critical safety finding. **Gate 7 must not pass while:** final safety release incomplete · a prohibited ingredient remains · a critical caution-limit issue is unresolved · a mandatory maternal/infant-contact assessment is incomplete.
- **Gate 8 — Testing & Validation:** testing plan, methods/method references, acceptance criteria, required safety/efficacy/preservative/QC/performance tests identified, **human-study approval completed before recruitment** where applicable, reports or controlled actions for in-progress tests. *(Release-essential testing must complete before the relevant later release gate even if Gate 8 proceeds conditionally.)*
- **Gate 9 — Stability & Release Readiness:** stability status, packaging-compatibility status, preservative-efficacy status where applicable, physical/chemical/micro acceptance criteria, scale-up/pilot status where applicable, deviations & open risks reviewed, release-readiness conclusion. *(Critical release tests must close; longer-term stability may stay ongoing with an approved launch protocol + sufficient supporting data.)*
- **Gate 10 — Regulatory, Claims & PIF (MARKET-SPECIFIC HARD BLOCK, per market):** applicable regulatory checklist, PIF/CPSR/Product Master File or equivalent dossier status, SKU-level claims register, **evidence attached/linked for every approved claim**, ingredient & product safety evidence, product-performance evidence where relevant, label & artwork review, published-information status, regulatory approval. *(No approved public claim may remain without evidence + a PIF/Product Master File link.)*
- **Gate 11 — Production & Launch (MARKET-SPECIFIC HARD BLOCK):** Gate 10 complete for the market, GMP document links, approved current formula version, approved artwork version, production readiness, quality release pathway, change controls closed or formally accepted, published product information approved, launch approval.
- **Gate 12 — Post-Market & Improvement:** market feedback, complaint & adverse-event status, PV/PMS review where applicable, product-performance feedback, CAPA/improvement actions, change-control links, review-closure sign-off.

---

## Appendix 2 (2026-08-07) — Round 3: gate-readiness answers

**Source:** `docs/rounds/2026-08-07-sme-reply-round3.txt`. **What was asked:** the 19 questions consolidated in `docs/rules/F1_Per_Gate_Open_Questions.md`, sent as five parts — A (how the three tiers are assigned), B (items with no place to record them), C (mappings we had assumed), D (decisions we had already made on our own reading), E (market-specific items). **All are answered; that file is now closed.** Items marked ⚠️ **overturn behaviour already built** and require rework, not just new work.

### Part A — Tier assignment

**A1 — the tiering rule is confirmed, with two changes.** Our rule (qualifier wording such as "where applicable"/"where relevant"/"high-risk or borderline" → **Conditional**; soft business/lifecycle context → **Supporting**; everything else → **Mandatory**) is "broadly correct" and the tier table is accepted, with the definitions restated as:

- **Mandatory** — always hard-blocks the gate.
- **Conditional** — hard-blocks **only when its defined trigger applies**.
- **Supporting** — does not automatically block, but unresolved risk or missing context may require a warning, an action, or a Proceed-with-Conditions decision.

Two reassignments:

| Gate | Item | Was | Now |
|---|---|---|---|
| 12 | Change-control links | Supporting | **Conditional** — mandatory where a complaint, post-market finding, CAPA, formula change, artwork change, safety signal or improvement action has generated a Change Control record. |
| 12 | Market feedback | Supporting | **Supporting for routine lifecycle review, Conditional once the project has launched and a scheduled post-market review is due.** |

**A2 — Gate 6 "Market-specific pack requirements" = Conditional.** It becomes mandatory where the selected market imposes a specific requirement affecting: language · mandatory warnings · ingredient declaration · responsible-party details · notification or registration numbers · pack size · tamper evidence · barcode or traceability · recycling or environmental markings · primary or secondary packaging information. **Where no market-specific requirement applies, the user must record N/A with a rationale** — leaving it blank is not the same as "not applicable".

**A3 — every Conditional item now has a defined trigger.** This was the most important question in the round: previously only 2 of 11 Conditional items had a working trigger, so 9 of them could never hard-block whatever the project actually was. The team supplied all of them:

| Gate | Conditional item | Trigger that makes it mandatory |
|---|---|---|
| 3 | Competitor or benchmark review | New product, claim extension, repositioning project, customer/distributor-led request, or where a benchmark/reference product is named. **Not** mandatory for a purely administrative change. |
| 3 | Regulatory review of high-risk or borderline claims | Any proposed claim classified as Borderline, Therapeutic-adjacent, High Risk, market-restricted, pregnancy/breastfeeding-related, infant-related, disease-related, medical-professional-facing, or otherwise outside the approved claims library. |
| 4 | Pregnancy/breastfeeding caution screen | Pregnancy, Breastfeeding or Postpartum selected *(already implemented — rule C1)*. |
| 4 | Allergen, impurity and contaminant review | The ingredient or raw material contains fragrance, essential oils, botanical extracts, proteins, known allergens, residual solvents, heavy-metal risk, microbiological risk, restricted impurities, processing residues, or variable natural-source composition. |
| 5 | Preservative strategy | Water-containing, water-available, multi-use or otherwise microbiologically susceptible products. N/A permitted for genuinely anhydrous, self-preserving, sterile or single-use products **with a documented rationale**. |
| 7 | Maternal and infant-contact assessment | Pregnancy, Breastfeeding or Postpartum selected *(already implemented — rule C1)*. |
| 8 | Human-study approval workflow | Before **any** internal or external study involving human participants, volunteers, consumer testing, patch testing, in-use trials, image collection, questionnaires, or other identifiable participant data. |
| 9 | Preservative efficacy status | Microbiologically susceptible products requiring a preservation system. |
| 9 | Scale-up or pilot status | New formulas, major reformulations, new manufacturing processes, manufacturing-site transfers, meaningful equipment/process changes, or products with identified scale-up risk. |
| 10 | Product-performance evidence | Any external claim that depends on product-level efficacy, performance, sensory, clinical, instrumental, in vitro, in vivo, consumer-use or comparative evidence. |
| 12 | PV/PMS review | Required by product category, market, company policy, safety signal, vulnerable-user population, complaint trend, or scheduled surveillance plan. |
| 12 | Change-control links | A Change Control record has been opened, **or should be opened** because of the post-market finding. |
| 12 | Market feedback | The scheduled post-launch review milestone is reached, or a complaint, customer issue, distributor request, claim challenge or recurring performance concern is recorded. |
| 12 | Product-performance feedback | Product efficacy, consumer experience, product failure or claim performance is part of the post-market review scope. |

**Costing / commercial feasibility (Gate 5) stays Supporting** — but the accountable project owner may still place the project on **Hold** where commercial feasibility is essential to continuation.

> **Implementation note:** several of these triggers need data the app does not capture yet, so the trigger itself is a build item, not just a config flag — a project-type/change-type classification (Gates 3, 9), a raw-material composition-risk flag (Gate 4), a "microbiologically susceptible / contains water" formula property (Gates 5, 9), a claim-classification field (Gate 3 — supplied by B7 below), and a per-claim evidence-dependency flag (Gate 10).

### Part B — Items with no place to record them (all seven confirmed: add the field)

| # | Item | Answer |
|---|---|---|
| **B1** | Gate 1 — Request source | **Distinct from the requester.** Add a field **"Request Origin / Source"** with these options: Internal product-development proposal · Management request · Sales request · Marketing request · Customer request · Distributor request · Healthcare-professional request · Consumer feedback · Complaint or post-market signal · Market research or identified opportunity · Competitor or benchmark response · Regulatory change · Supplier or ingredient opportunity · Manufacturing or quality improvement · Reformulation or lifecycle improvement · Other — specify. **The requester's name and department remain separate fields.** |
| **B2** | Gate 1 — Initial product scope | **Add a new Key Gate Check: "Initial product scope defined".** Its supporting field briefly captures: proposed product type · intended purpose · whether it is new development, reformulation, claim change, packaging change, market extension or lifecycle improvement · known boundaries of the request. |
| **B3** | Gate 1 — Initial target market and user | **Option (a).** Add a lightweight Gate 1 capture — **"Initial target user / life-stage"** and **"Initial target market(s)"**. These are preliminary and **do not replace** the full Gate 2 assessment; Gate 2 confirms, refines and formally approves them. |
| **B4** | Gate 2 — Approved development brief | **Option (a).** The brief is a **discrete controlled record or linked document**, not an inference from completed checklists. Add: **Development Brief status · Development Brief link · Brief version · Brief owner · Approval date.** The four Phase 1 checklist sections *contribute to* the brief but do **not** substitute for formal brief approval. |
| **B5** | Gate 2 — Vulnerable-user flags | **Option (b).** The system must distinguish "a target user was selected" from "a vulnerable-use context was explicitly recognised". Where any vulnerable group is selected, require: **explicit vulnerable-user flag · applicable safety pathway · responsible reviewer · notes on additional assessments required.** Vulnerable triggers: Pregnancy · Breastfeeding · Postpartum · Infant 0+ · Young child · Sensitive or compromised skin · Oncology or medically vulnerable support context · Renal or other health-related support context · any population identified by Safety or Regulatory as requiring enhanced review. **A general-adult project must still record "No vulnerable-user group identified"** rather than satisfying the requirement by default. |
| **B6** | Gate 2 — Project requirements and exclusions | **Add a Phase 1 requirements section**, as a structured table (category · requirement · priority · owner · notes), containing: Must-have product requirements · Must-not-have ingredients or features · Intended claims · Claims not to pursue · Target pH or physical requirements where known · Sensory requirements · Packaging requirements · Target cost or commercial boundary · Target timeline · Target markets · Regulatory constraints · User/life-stage constraints · Benchmark or reference product · Known technical risks · Explicit exclusions · Other project assumptions. |
| **B7** | Gate 3 — Preliminary claim classification | **Option (a) — classification per selected claim**, because different claims within one project can carry different risk (a single project-level judgement would be too broad). Two controlled dropdowns per claim: **Claim category** = Cosmetic · Product performance · Sensory · Ingredient-level · Safety/tolerance · Environmental or sustainability · Professional or technical information · Borderline / therapeutic-adjacent · Therapeutic — not permitted within the cosmetic claim pathway · Other — Regulatory review required. **Claim risk** = Low · Medium · High · Prohibited / not acceptable · Pending classification. Also capture: exact proposed wording · applicable SKU · applicable market · intended channel · evidence required · evidence status · Regulatory review required Y/N · approved wording · limitations or mandatory qualifiers. |

### Part C — Mappings we had assumed

**C1 — Regulatory review of high-risk or borderline claims: confirmed**, and it keys off the per-claim classification from B7. The review is mandatory where: category = Borderline / therapeutic-adjacent · category = Therapeutic — not permitted · risk = High · the wording is not in the approved Claims Library · the claim varies from previously approved wording · the market imposes a specific restriction · the claim relates to pregnancy, breastfeeding, infant use, disease, treatment, prevention, healing or medical endorsement.

**C2 — our mapping was too broad.** The existing Key Gate Check *"Restrictions, exclusions and supplier risks screened"* **stays** as the broader Gate 4 check, but a **separate, narrow Mandatory item must be added: "Prohibited, restricted and caution ingredient screen completed"**, drawing directly from the automated watch-list results and the associated qualified review.

### Part D — Decisions we had made, now reviewed

**D1 ⚠️ — our per-gate sign-off implementation is rejected.** "Owner + Evidence link on the gate row" is **not** equivalent to Prepared / Reviewed / Approved. Each gate must have **three distinct recorded sign-offs** — Prepared by, Reviewed by, Approved by — and each one must capture: **authenticated user · role · date/time · decision · record version · comment where required.** This **hard-blocks the gate decision.** The phase-level sign-off block **remains as an additional phase-closure approval and is not replaced.** Where risk is low the same person may prepare multiple gate records, but **the reviewer or approver must be independent for safety-, regulatory-, claims- or release-critical decisions.**

**D2 ⚠️ — two of our four Published-Information claim rules are changed.**

1. **Claim ID linkage becomes required**, not optional: every external product-benefit, safety, efficacy, performance or suitability statement must link to a Claim ID. It stays optional **only** for genuinely non-product corporate information containing no product claim or technical statement.
2. **The picker must offer Developing/Pending claims too** — the purpose is to document the intended claim early. What Pending claims must *not* allow is: Approved for Release · Released · final artwork approval · external publication.
3. **No absolute character-for-character lock.** The system must hold **master approved wording** and **proposed channel wording** side by side, plus a comparison/review status and reviewer approval. Minor adaptation is allowed where meaning, scope, qualifiers and evidence burden are unchanged; any material change must create a new or revised claim record. Automated similarity checking may be used **as a warning**, but final equivalence is confirmed by an authorised reviewer.
4. **The release block is confirmed, and widened:** a linked claim must be Supported **and approved for the relevant SKU, formula version, market and channel** before content can reach Approved for Release or Released.

**D3 — Gate 4 "unresolved possible match": confirmed, and now specified.** Each flagged watch-list result gains: **Reviewer assessment** (Critical · Non-critical · Not a true match · Further information required) · Reviewer · Review date · Rationale · Evidence link · **Linked Next Action ID** · Resolution status. **A genuine controlled Next Action is required — a note alone is not sufficient.** Enforcement:

| Assessment | Effect on Gate 4 |
|---|---|
| Critical | Hard-blocks **both** Proceed and Proceed with Conditions. |
| Further information required | Blocks Proceed; Proceed with Conditions only with authorised acceptance **and** a linked controlled action. |
| Non-critical | Blocks plain Proceed until the assessment, rationale and action are recorded; may then permit Proceed with Conditions. |
| Not a true match | May be closed once reviewer rationale and evidence are recorded. |

**D4 — the Cosmetri import stub is accepted and preferred.** A formula import must not fail merely because the MBc360 evidence record has not been populated yet. Conditions: the stub must be clearly labelled **"Incomplete — evidence review required"** · it must **not** default to Approved for Use · missing evidence must appear in Gate Readiness · **Gate 4 must not pass until all applicable raw materials are adequately reviewed or formally accepted through a controlled conditional decision** · Gate 7 final safety approval must use the completed evidence status · **Gates 10 and 11 must not rely on unresolved identity-only stubs.**

### Part E — Market-specific and safety items

**E1 ⚠️ — Gate 7, on both counts.**
- A **distinct safety-finding control** is required rather than relying solely on the Final Safety Sign-off: **Critical safety finding identified (Yes/No) · Finding description · Affected ingredient/formula/use context · Severity · Required action · Owner · Status · Safety reviewer conclusion · Evidence link.** **Gate 7 cannot pass while any critical safety finding is open.**
- **Our reading was wrong:** the Gate 7 pregnancy/breastfeeding assessment is **not** unconditional. It is mandatory **when Pregnancy, Breastfeeding or Postpartum is selected**; **infant-only products trigger the Infant/Baby Safety pathway instead** (consistent with F2); general products **record N/A with a rationale** where neither pathway applies.

**E2 — Gate 10 regulatory checklist: option (b), plus a temporary record.** Enforce the ASEAN checklist **only where an ASEAN market is selected**. For non-ASEAN markets, require a temporary **Regulatory Checklist Status** capturing: applicable market · required dossier type · owner · checklist or evidence link · status · Regulatory approval. **The absence of a built-in country template must not mean the item is unenforced** — Regulatory may use an approved linked external checklist until the app profile is configured.

**E3(a) ⚠️ — Gates 10 and 11 become per-market**, as previously confirmed under A1/F4. Each active market carries its own: Gate 10 readiness · dossier/PIF status · claims approval · Regulatory approval · Gate 11 readiness · launch approval · approval dates · **applicable formula version** · **applicable artwork version**. The overall project status shows one of: *No market approved · Some markets approved · All active markets approved · Market transition in progress*. **One approved market must not cause all markets to appear ready.**

**E3(b) — Gate 11 needs more than the existing soft lock.** The current C4/F9 mechanism is suitable for low- or medium-risk open changes, but Gate 11 must evaluate each open Change Control's **impact classification and closure status**:

| Open change | Effect at Gate 11 |
|---|---|
| Critical or launch-impacting | **Hard-blocks launch.** |
| Formula, artwork, claims, safety, regulatory, packaging or release-impacting | **Hard-blocks unless implementation and verification are complete.** |
| Low-risk administrative | May permit Proceed with Conditions following authorised acknowledgement. |
| Completed, rejected, cancelled or superseded | Does not block, provided the final disposition is recorded. |

### What this round changes in the application

**Rework of behaviour already shipped (4)** — status as of 2026-08-07:
1. ❌ **Per-gate sign-off** — replace "Owner + Evidence link" with a real 3-role, 6-field electronic sign-off per gate (D1). This touches all 12 gates and is the largest single item.
2. 🟡 **Published Information / claims** — the picker now accepts Pending claims (**done**; the release-state block was already a separate mechanism, so nothing was weakened). Still to do: Claim ID becoming required for product statements, fill-and-lock becoming master-wording vs channel-wording with reviewer-confirmed equivalence, and the release block widening to SKU + formula version + market + channel (D2).
3. 🟡 **Gate 7 pregnancy screen** — **done:** no longer unconditional, now conditional on Pregnancy/Breastfeeding/Postpartum. It had been blocking *every* project, including general-adult ones, on the 12-row maternal caution register. Still to do: the infant-only pathway (waiting on Round-2 **A2**) and a dedicated N/A-with-rationale route (E1).
4. ❌ **Gates 10–11** — move from project-level to per-market readiness (E3a). This is the F4 work, now unblocked.

> **Two questions arose while making changes 2 and 3** and are recorded in `F1_Per_Gate_Open_Questions.md` → "Round 4": whether the Gate 7 line *"restricted/caution assessment closed"* means the pregnancy/breastfeeding assessment specifically (as we read it) or a broader assessment that should still apply to every project; and whether an infant-only product should keep blocking Gate 7 on something in the interim, since the maternal trigger no longer fires for it and the Infant pathway does not exist yet.

**New capture required (11):** Request Origin/Source (B1) · "Initial product scope defined" Key Gate Check (B2) · initial target user + market at Gate 1 (B3) · controlled Development Brief record (B4) · explicit vulnerable-user flag block (B5) · Phase 1 requirements table (B6) · per-claim classification, category + risk + 9 attributes (B7) · a dedicated prohibited/restricted/caution ingredient-screen item (C2) · watch-list reviewer assessment with a linked Next Action (D3) · critical-safety-finding control (E1) · temporary Regulatory Checklist Status for non-ASEAN markets (E2).

**Trigger wiring (A3):** 12 Conditional triggers are now specified; each becomes a real hard block once the data it reads exists. Several depend on the new capture above (notably B7 → Gate 3, and the microbiological-susceptibility property → Gates 5 and 9).

**Confirmed as already correct, no change:** the tiering rule itself (A1), the Cosmetri import stub (D4, with its five conditions to verify), and the Gate 4 possible-match enforcement pattern (D3 follows the F9 soft-lock shape we already use).

---

## Appendix 3 (2026-08-24) — Round 4: 36 answers

**Source:** `docs/rounds/2026-08-24-sme-reply-round4.md`. **What was asked:** the 36 questions in `docs/rounds/2026-08-12-our-questions-round4.md`, which consolidated the 33 internal questions `R4-Q1…R4-Q33` from `docs/rules/F1_Per_Gate_Open_Questions.md` plus three items still outstanding from 21 July (the definition of "critical", the Infant & Baby Safety pathway content, and what formally ends an older formula version). **All 36 are answered; the Round-4 list is now closed.**

Items marked ⚠️ **overturn behaviour already built** and need rework, not just new work. Items marked ✅ confirm what is already running — for those the only task is retiring the `[ASSUMPTION: R4-Qn]` tags.

### Index — all 36, with verdict

| # | Internal | Topic | Verdict |
|---|---|---|---|
| 1 | `R4-Q2` + 21/07 A2 | Infant & Baby Safety pathway | ⚠️ Compartment 3 is correct but is only the **final** component of a pathway spanning 6 gates |
| 2 | 21/07 A3 | What ends an older formula version | 🆕 Six version states + a per-market supersession decision recorded by a person |
| 3 | 21/07 A1 | Definition of a critical gap | 🆕 A gap carries its own criticality assessment (8 new fields) |
| 4 | `R4-Q11` | PV/PMS scope | 🆕 Baseline for every marketed product + 14 enhanced triggers + configurable market profile |
| 5 | `R4-Q1` | Gate 7 restricted/caution scope | ⚠️ **Option (b)** — general screen for every product, maternal is an additional layer |
| 6 | `R4-Q3` | Gate 4 vs Gate 7 caution threshold | ⚠️ Gate 4 must **disposition every row**, not just react to escalations |
| 7 | `R4-Q9` | Trigger data not yet recorded | ⚠️ **Option (b)** — "not yet assessed" must block. Cross-cutting |
| 8 | `R4-Q4` | Change Control "should be opened" | 🆕 Explicit Yes / No / Pending assessment step |
| 9 | `R4-Q5` | What marks a study as planned | 🆕 Explicit Yes / No / Undecided project field |
| 10 | `R4-Q6` | Feedback-source mapping | ⚠️ The 16-option list mixes three concepts and should be split |
| 11 | `R4-Q7` | Purely administrative changes | ⚠️ **None** of the six project types is automatically administrative |
| 12 | `R4-Q8` | Major reformulation, scale-up risk | ✅ Major = major reformulation · 🆕 18 affected areas + a scale-up risk field |
| 13 | `R4-Q10` | Scheduled post-launch review | 🆕 1 / 3 / 12 months then annually, from the **actual commercial launch date** |
| 14 | `R4-Q10` | Launch in a multi-market project | 🆕 Per market, with a 5-value project-level roll-up |
| 15 | `R4-Q12` | Product-performance / market-feedback tiers | ⚠️ Product-performance → Conditional; market feedback becomes **two** items |
| 16 | `R4-Q13` | N/A rationale | 🆕 System may auto-generate it; critical items still need reviewer acknowledgement |
| 17 | `R4-Q14` | Raw-material composition risk | 🆕 A shared **Raw Material Risk Overlay**, not per-project re-entry |
| 18 | `R4-Q15` | Gates 10/11 sign-off | 🆕 **Per market.** Phase 4 has a per-market status |
| 19 | `R4-Q16` | Claim architecture | ✅ (a)(c)(e)(f) as built · ⚠️ (g) **seven** registers reference Claim ID · (h) mechanism starts at Gate 3 |
| 20 | `R4-Q17` | Gate 1 fields | ✅ Confirmed exactly as built — no code change |
| 21 | `R4-Q18` | Phase 1 requirements table | ⚠️ Priority = **Must / Should / Could** · 🆕 N/A-with-rationale disposition |
| 22 | `R4-Q19` | Gate 1 option lists | ✅ (a)(d)(e) · ⚠️ (b) needs a **Primary** type · (c) both owner values change |
| 23 | `R4-Q20` | Product type, safety matrix | ✅ Both requirements are right · 🆕 one new option · 4 permitted coverage routes |
| 24 | `R4-Q21` | Duplicate initial market field | ⚠️ Remove it; Countries / Markets is the single source, non-mandatory at creation |
| 25 | `R4-Q22` | Vulnerable-user mapping | ✅ 5 pairs and the two-way strengths · ⚠️ split Dry / eczema-prone |
| 26 | `R4-Q23` | Claim traceability freeze | ✅ Stays open through 10/11 · 🆕 approved revisions become read-only |
| 27 | `R4-Q24` | Regulatory review evidence | ✅ Five fields and four outcomes · 🆕 11 structured claim-subject flags |
| 28 | `R4-Q25` | Claims Library | 🆕 Company-level, Technical **and** Regulatory approve, projects read only |
| 29 | `R4-Q26` | Per-gate sign-off | 🆕 All five open points answered |
| 30 | `R4-Q27` | Claim linkage, wording adaptation | ✅ All four choices · 🆕 artwork linkage, publication record, exemption approval |
| 31 | `R4-Q28` | Raw-material import stubs | ✅ Five of six · ⚠️ (f) at Gates 7/10/11 only **materials in the formula** hard-block |
| 32 | `R4-Q29` | Watch-list reviewer trail | ⚠️ (a) add Needs Safety Review · (b) five statuses · (e) maternal list too |
| 33 | `R4-Q30` | Critical Safety Findings | ⚠️ 4 severities · 6 statuses · controlled action required · graded blocking |
| 34 | `R4-Q31` | Gate 11 Change Control | ⚠️ Critical is its own level · final disposition = 8 fields |
| 35 | `R4-Q32` | Per-market regulatory checklist | ⚠️ Two separate value lists, not the reused ones |
| 36 | `R4-Q33` | Cosmetic claims, costing status | ⚠️ (a) Cosmetic **does** trigger product-level evidence · 🆕 (b) costing status field |

---

### Part 1 — The cross-cutting answer (question 7)

**⚠️ Option (b): a missing assessment must never be treated as meaning the condition does not apply.** Three states must be distinguished:

- **Assessed and applies**
- **Assessed and does not apply**
- **Not yet assessed**

For a **Mandatory** or **Conditional** readiness item, **"not yet assessed" must block readiness.** A condition may be treated as not applicable only *after* the relevant trigger information has been completed and found not to apply. For a **Supporting** item, missing information may generate a warning rather than a hard block.

Two consequences named explicitly:

- A **Pending** claim classification must trigger Regulatory review until classified. *(This confirms the reading already shipped in `CLAIM_RISKS_NEEDING_REVIEW`.)*
- A formula with **no microbiological-susceptibility assessment must not automatically bypass** preservative-strategy or preservative-efficacy requirements. *(This does not describe current behaviour: `isReadinessTriggerActive` returns false when the property is unset, so Gate 5 and Gate 9 both auto-pass on any project nobody has classified.)*

> **Why this is first in the appendix:** trigger evaluation is a single boolean function that every Conditional item at every gate reads. Until it distinguishes three states, any Conditional item built on top of it carries the wrong semantics.

### Part 2 — Severity and lifecycle vocabularies (questions 3, 32b, 33, 34)

Four separately-asked questions return **the same two vocabularies**.

**The severity scale is four levels: Low · Medium · High · Critical.** Critical is a distinct level *above* High — stated in question 34(a) and question 33(a), and used by question 3.

**(Question 3) A gap carries its own formal criticality assessment**, not a judgement made in the moment by whoever records the gate decision. New fields: **Criticality** (Low / Medium / High / Critical) · **Impact category** (Safety · Regulatory · Claims · Quality · Efficacy · Release · Commercial · Other) · Assessor · Assessment date · Rationale · Evidence link · Required action · Action owner. Criticality is assessed by a suitably qualified reviewer.

| Gap criticality | Effect |
|---|---|
| **Critical** | Cannot be carried under Proceed with Conditions. Must result in **Hold, Backtrack or Reject/Stop**. |
| **High** | May be carried conditionally only where no mandatory safety, regulatory or release rule is breached, **and** the relevant authorised function accepts the risk, **and** a controlled action and due date are recorded. |

**(Question 33) Critical Safety Findings.** Severity = Low · Medium · High · Critical. Status = **Open · Under Review · Action Pending · Verification Pending · Closed · Superseded**. A **controlled Next Action is required** for Critical findings, High findings, and Medium findings requiring corrective activity — free text may describe the action but must not replace the controlled record. An unjudged finding blocks Gate 7. Closing a High or Critical finding requires: Safety reviewer conclusion · Evidence link · Linked action completed · Verification · Verifier · Closure date.

| Finding | Effect on Gate 7 |
|---|---|
| Open **Critical** or **High** | Hard-blocks. |
| **Medium** | May permit Proceed with Conditions where formally accepted and controlled. |
| **Low** | May generate a warning or an action per the reviewer's conclusion. |

> A finding assessed as non-critical must still be appropriately dispositioned — it should not disappear merely because it is not Critical.

**(Question 32b) Watch-list resolution status** = Open · Under Review · Action Pending · Verification Pending · Closed. A **separate** assessment field records whether the result is Critical, Non-critical, Not a true match or Further information required.

**(Question 34) Gate 11 Change Control.** The risk scale gains Critical. An **unclassified** open Change Control blocks Gate 11. "Final disposition recorded" means eight things, not a closing date or a short note: Final status · Outcome · What was implemented or why no implementation was required · Verification evidence · Impacted formula/artwork/claim/market versions · Responsible verifier · Closure date · Remaining action or transition requirement, if any. The existing acknowledgement may be reused **if role-restricted** and recording Authenticated user · Role · Date/time · Rationale · Change Control reference · Conditions accepted — and **only a person authorised to approve the relevant Gate 11 impact may acknowledge it**.

### Part 3 — Per-gate sign-off (questions 18 and 29)

These two answers together unblock D1, held since 2026-08-12 pending exactly this.

**(Question 18) Prepared, Reviewed and Approved must be recorded per market for Gates 10 and 11**, because each market may differ in dossier status · regulatory decision · claims · artwork · formula version · launch date. **Gate 12 post-market reviews also operate per market, and Phase 4 has a per-market status.** The overall project may show: No market complete · Some markets complete · All active markets complete · Ongoing post-market stewardship · Market withdrawal or transition. A single project-level Phase 4 summary may remain, **but only as a roll-up — it must not replace the per-market approvals.**

**(Question 29) The five open points:**

1. **Record version = a gate-specific evidence snapshot/revision.** The signed record includes: gate status and proposed decision · gate checks · applicable checklist results · mandatory and triggered evidence-register states · evidence links and document revisions · open actions and conditions · formula version where relevant · market and artwork version where relevant. If evidence inside the signed snapshot changes afterwards, **the signature becomes stale/invalidated, the system identifies what changed, and re-signing is required.** *"A project-wide save counter is not sufficient"* — which rules out `projects.version`.
2. **A comment is mandatory for:** Proceed with Conditions · Hold · Backtrack · Reject/Stop · Approved with Conditions · Not Approved · Further Information Required · N/A where a human rationale is required · Delegated approval · Override or exception. A clean Proceed or Approved may have an optional comment.
3. **Critical gates = 3, 4, 7, 8, 9, 10, 11** — claims · ingredient and regulatory screening · safety · testing, human studies and evidence · stability and release readiness · regulatory, claims and dossier · production and launch release.
4. **Independent means:** at **all** gates, the reviewer must be a different authenticated person from the preparer. At the seven critical gates, at least one reviewer or approver must **also represent the relevant independent function** — safety decisions reviewed/approved by Safety/Scientific Review · regulatory by Regulatory · quality/release by Quality · claims by Technical and/or Regulatory. The dedicated human-study workflow keeps its stricter outside-department rule.
5. **Sequence and decision:** Preparer confirms the record is complete and recommends a decision → Reviewer confirms the evidence and records a recommendation → **Approver records the final gate decision.** The approver's decision **is** the gate decision; there is no separate duplicate decision afterwards. All three sign-offs reference the same current snapshot, and the gate passes only when the approver records Proceed or Proceed with Conditions.

### Part 4 — Three company-level reference datasets (questions 4, 17, 28)

**(Question 17) Raw Material Risk Overlay.** Do not re-enter composition risk per project. The preferred long-term home is **Cosmetri**; until its API can supply these fields, MBc360 maintains a shared overlay **keyed to the Cosmetri raw-material ID**. It is *not* a second raw-material master — it stores only the MBc360-specific risk classifications the API does not expose: Fragrance · Essential oil · Botanical extract · Protein · Known allergen · Residual-solvent risk · Heavy-metal risk · Microbiological risk · Restricted impurity · Processing residue · Variable natural-source composition. It must be reusable across projects · controlled by authorised Technical, Safety and Regulatory users · retain revision history · record evidence links and review dates · and be migrated to Cosmetri if that capability arrives.

**(Question 28) Claims Library — company-level.** Entries carry applicability tags for Brand · Product family · SKU · Market · Language · Channel · Consumer or professional use. **Projects read from the library but do not directly edit it.** A project claim links to a library entry where it reuses approved wording; a genuinely new claim may be proposed without a link but **must be identified as "New claim — not yet in Claims Library"**, which triggers Regulatory and Technical review. **Technical and Regulatory must both approve** an entry before it becomes Approved Library Wording; Marketing/Brand may propose wording but not give final technical or regulatory approval. Every entry retains Revision · Approval history · Evidence requirement · Market/channel applicability · Effective date · Review date · Withdrawal status. **Project approval must not auto-promote wording** — a separate controlled action, **"Propose for Claims Library"**, is required, after which Technical and Regulatory review it for broader reuse. When an entry changes or is withdrawn the system should identify all linked claims, SKUs, markets and published materials · trigger an impact assessment · create Change Control where required · flag affected material for re-review · record the effective date and transition plan. *Changing or withdrawing must not automatically remove a product from the market unless the change is critical or required by Regulatory.*

**(Question 4) Regulatory market profiles.** MBc360 requires a **baseline** post-market surveillance review for **every marketed product**. An **enhanced** review is mandatory where any of these applies: infant or young-child product · pregnancy, breastfeeding or postpartum product · intimate-use product · eye-area product or foreseeable eye exposure · sensitive, eczema-prone or compromised skin · medically vulnerable population · high-risk or therapeutic-adjacent claim · new or unusual active ingredient · safety signal · adverse event · significant complaint trend · recurring quality or performance issue · market-specific vigilance requirement · requirement in an approved surveillance plan.

> **Do not use a permanently hard-coded country list.** Regulatory maintains a **configurable market profile** indicating whether each market requires particular adverse-event reporting, PMS records or review intervals.

The same market profile supplies the per-market claim restriction in question 27 and the required dossier type in question 35.

**Required review cadence:** initial post-launch review · twelve-month review · annual review thereafter while the product remains marketed · immediate review when a significant safety or complaint signal occurs.

### Part 5 — Claim architecture (questions 19, 26, 27, 30, 36a)

**(Question 19) Confirmed as built:** the existing **Claim category** column *is* the B7 classification — do not create a duplicate (a); **Claim → Evidence Traceability is the source of truth** and the SKU Claims / PIF register references a Claim ID and inherits Claim category, Claim risk, Master wording, Current revision and Evidence status read-only (c); the Claim ID is **created at Gate 3** when first proposed and must not wait until evidence exists (e); the picker offers **all** declared claims including Pending and developing ones, with release controls determining external usability (f).

**Changed or extended:**

- **(b)** *Intended channel* and *Regulatory review required* belong on the **SKU / market / channel claim-use record** — they describe how and where the claim is used. The master claim may require Regulatory review always; a market or channel may impose an additional review requirement.
- **(d)** Before Gate 3 passes, every claim in scope must have: Claim ID · Proposed master wording · Claim category · Claim risk · Preliminary evidence requirement · Regulatory review status where triggered. There is no arbitrary number of claims — **if no claims are proposed, this must be explicitly recorded.**
- **(g) ⚠️ Seven registers** reference Claim ID rather than retyping wording — we asked about four: mechanism map · prospective evidence plan · efficacy study plan · clinical evidence register · **Published Information Approval** · **artwork/label claim list** · **PIF claims register**.
- **(h) Gate ownership of claim information.** *Gate 3* — Claim ID · proposed master wording · category · risk · **preliminary mechanism or benefit rationale** · preliminary evidence requirement. *Gate 5* — confirmed formula-specific mechanism · ingredient and formula contribution · mechanism-to-claim linkage. *Gate 8* — evidence plan · study method · evidence grade · supporting report or test status. *Gate 10* — Supported status · final approved wording · market approval · PIF / Product Master File attachment · claim-release approval. **The mechanism begins as a preliminary hypothesis at Gate 3 and is technically confirmed at Gate 5** — our split placed it only at Gate 5.

**(Question 26) The ledger does not freeze at Gate 8** — it stays available through Gates 10 and 11, as built. What is added is **revision control**: draft claims remain editable; **once a claim revision receives Regulatory or Gate 10 approval, that revision becomes read-only**; a new wording or evidence position creates a new revision or a new Claim ID per question 30(b). Adding a genuinely new claim after Gate 3 requires controlled change assessment and appropriate backtracking; adding a market-specific *use* of an existing approved claim does not necessarily reopen Gate 3 but does require Gate 10 market review.

**(Question 27) The five Regulatory review fields are accepted** — Regulatory review outcome · reviewer · review date · review rationale · review evidence link — and all five must be completed for a triggered claim. **The four outcome values are accepted:** Approved · Approved with Conditions · Not Approved · Further Information Required. **A later change to the reviewed wording must invalidate the previous review and trigger reassessment** — confirming the snapshot mechanism already built.

🆕 **Add structured claim-subject flags** rather than inferring from free text: Pregnancy · Breastfeeding · Postpartum · Infant or child · Disease or condition · Treatment or prevention · Healing or repair · Medical or HCP endorsement · Safety or tolerance · Comparative or superiority · Other sensitive topic. *(This makes evaluable the C1 condition previously recorded as "reading that from the wording is a judgement, not a lookup".)* Per-market restrictions come from the configurable Regulatory market profiles.

**(Question 30) All four of our choices are accepted**, with the requirements applying **at release, not first entry**. The three comparison values are accepted: Identical to master wording · Minor adaptation — meaning, scope, qualifiers and evidence burden unchanged · Material change — new or revised claim required. Whitespace-only changes may be ignored; other changes are reviewed by a person, not auto-judged equivalent.

- **(b) Revision vs new Claim ID.** A **new revision of the same Claim ID** where the underlying claim proposition remains the same, scope and intended benefit are unchanged, evidence burden is unchanged, and the wording is being refined or updated. A **new Claim ID** where meaning changes · benefit or outcome changes · scope expands · target population changes · evidence burden changes materially · the claim moves into a different risk or regulatory category. **The Technical/Regulatory reviewer decides which route applies.**
- **(c) 🆕 Final artwork approval** is represented in the **Packaging / Artwork Approval record**, which **must link every Claim ID on the artwork** and **hard-block** where any linked claim is Pending · Unsupported · Not approved for the market · Superseded · Not approved for the intended wording or channel.
- **(d) 🆕 External publication is a separate event** from Approval for Release. "Approved for Release" means authorised for use; a **Publication / Deployment record** then captures, where applicable, actual publication or release date · channel · market · URL, file or artwork reference · published version · person responsible · withdrawal or supersession date. For printed packaging the equivalent event may be **Release to Print**.
- **(e)** The content owner may propose "No product claim or technical statement", but **the exemption must be confirmed by a Technical or Regulatory reviewer before release.**

**(Question 36a) ⚠️ Cosmetic claims do trigger product-level evidence** where the claim asserts an outcome or performance of the finished product — examples given: Moisturises · Hydrates · Softens · Improves appearance · Supports barrier function · Helps detangle · Reduces residue · Improves skin feel. A purely ingredient-level statement may rely on ingredient evidence only where it is clearly presented as an ingredient statement and does not imply the finished product delivers the same measured result. 🆕 Add an **Evidence basis required** field: Finished-product evidence · Ingredient-level evidence · Formula/mechanism rationale · Consumer-perception evidence · Regulatory or compositional evidence · No performance claim · Combination of evidence types.

### Part 6 — Ingredient and safety screening (questions 5, 6, 23b, 31, 32)

**(Question 5) ⚠️ Option (b).** Gate 7 requires a **general restricted-and-caution ingredient assessment for every product**. The Pregnancy/Breastfeeding Caution assessment is an *additional conditional layer*. Screen applicability:

| Screen | Applies to |
|---|---|
| General prohibited / restricted / caution | **All products** |
| Maternal caution | Maternal products |
| Infant / Baby Safety | Infant 0+ products |

Where both intended-use contexts are selected, both the maternal and infant pathways apply.

**(Question 6) ⚠️ Gate 4 screens *and dispositions* every relevant candidate**, but does not require the full final safety close-out reserved for Gate 7. Every row is classified as one of: No issue identified · Needs Safety Review · Needs Regulatory Review · Prohibited — remove · Considered — not selected · Further information required. **Gate 4 must not pass with unassessed rows.** Gate 4 may Proceed with Conditions where the issue is assessed as non-critical **and** a qualified reviewer has documented the preliminary conclusion **and** a controlled action is linked **and** no prohibited ingredient or mandatory restriction is breached. **Gate 7** must then formally close every restricted or caution issue relevant to the final formula.

**(Question 23b) Our requirement is right, with permitted coverage routes.** At Gate 7 every ingredient in the final formula must have a safety disposition, but low-risk excipients do not each need a lengthy monograph. Permitted: individual assessment · reference to an existing approved ingredient assessment · group or class assessment where scientifically justified · reference to an accepted regulatory/safety conclusion. **Every formula line must show it has been covered and linked to the relevant assessment**, and relevant mixture components, impurities and residuals must also be assessed where required.

**(Question 31) Five of six confirmed as built** — every row in the candidate raw-material register must be dispositioned before Gate 4 passes (a) · "Considered — not used in this formula" is retained and the record is not deleted (b) · the conditional route is Proceed with Conditions plus a linked controlled action, with no separate duplicate approval field, provided the row contains the qualified reviewer's conclusion, the gate approver is authorised, and the condition and action are explicitly referenced in the gate decision (c) · a conditionally accepted material *included in the final formula* must be fully closed before Gate 7 final safety approval, while a material *not used* may be closed as "Considered — not used" (d) · **Gate 4 must not Proceed where every candidate has been rejected** — at least one suitable or conditionally suitable route must remain, otherwise the project should Hold or Backtrack to ingredient sourcing (e).

**⚠️ (f) changes our reading:** at Gates 7, 10 and 11 the hard block applies to materials **actually present in the current formula**. Materials formally dispositioned as not used should not block those gates; an incomplete non-formula candidate may produce a **warning** but should not block release where the product does not rely on it.

**(Question 32) The watch-list reviewer trail.**

- **(a) ⚠️ "Flagged" includes three statuses**, not the two we implemented: *REVIEW — possible formula match* · *Needs Safety Review* · *Needs Regulatory Review*. **Prohibited — remove** remains a separate direct hard block.
- **(b) ⚠️ Resolution status** = Open · Under Review · Action Pending · Verification Pending · Closed, with a separate assessment field recording whether the result is Critical, Non-critical, Not a true match or Further information required.
- **(c)** Recording Proceed with Conditions **may serve as authorised acceptance** where the qualified reviewer assessment is complete, the rationale and evidence are present, a valid controlled action is linked, and **the gate approver has the required Safety or Regulatory authority**. A separate duplicate acknowledgement is not required.
- **(d)** An unassessed flagged row **must block both Proceed and Proceed with Conditions** — as built.
- **(e) 🆕** The Pregnancy/Breastfeeding Caution list uses **the same reviewer-trail fields** for flagged findings.
- **(f)** The linked action may belong to Gate 4 **or a later gate** where operationally appropriate. It must link back to the originating finding · have an owner and due date · **remain visible at the originating gate** · and be due before the gate at which final closure is required. **A critical finding cannot be deferred to a later gate.**

### Part 7 — Infant & Baby Safety pathway (questions 1 and 25c)

**Compartment 3 is retained as the core Gate 7 Infant & Baby Safety assessment, but it is the *final component* of a broader pathway spanning multiple gates — not the entire pathway by itself.** Existing controls INF-01 to INF-08 remain appropriate.

| Gate | Required |
|---|---|
| **2** — intended infant-use context | Intended minimum age in months · direct infant use, incidental contact or both · leave-on or rinse-off use · body area · frequency and amount of use · nappy-area, face, eye-area or scalp use · foreseeable hand-to-mouth exposure · foreseeable accidental ingestion · whether the product may be used on damaged or compromised skin · caregiver use vs direct application to the infant |
| **4** — ingredient and raw-material suitability | Infant suitability assessment for each proposed ingredient · restricted and prohibited ingredient review · fragrance, essential-oil and allergen review · impurity, contaminant and residual-solvent review · heavy-metal and microbiological risk review where relevant · oral-safety consideration where hand-to-mouth exposure is foreseeable · eye-exposure assessment where eye contact is reasonably foreseeable · supplier evidence links |
| **5** — formula-level assessment | Final ingredient concentrations · formula pH and compatibility with infant skin · preservative strategy and microbiological protection · exposure assessment and infant-adjusted margin-of-safety rationale · potential degradation products or ingredient interactions · process controls needed to preserve ingredient quality and safety · intended dose or amount per use |
| **6** — packaging and instructions | Appropriate dose delivery · control of excessive dispensing where relevant · accidental access or ingestion risk · suitable closure and packaging · age and use instructions · required warnings · directions for safe caregiver use |
| **7** — final assessment | Complete INF-01 to INF-08, which should include or link to: infant-contact use context · infant-adjusted exposure and margin of safety · hand-to-mouth or incidental oral exposure · infant sensitiser and allergen screening · skin-barrier and pH compatibility · eye-safety assessment where applicable · final intended-use and age-suitability conclusion · approved claim, label and PIF wording · confirmation that microbiological and preservative risks have been addressed · confirmation that no critical infant-safety issue remains open |
| **8–9** — testing and validation | Triggered by use context and risk: skin tolerance · eye safety · preservative efficacy · microbiological quality · stability · packaging compatibility · in-use or consumer testing where appropriate |
| **10** — PIF and claims | Infant-use safety conclusion · relevant ingredient and formula assessments · applicable test reports · approved age and use statements · evidence supporting infant-related claims · label warnings and directions |

> **Hard block:** Gate 7 must hard-block if the Infant 0+ pathway is triggered and this assessment is incomplete.

**(Question 25c)** Family use does not automatically mean a vulnerable population, **but must prompt confirmation of the actual age groups included; if infants or young children are included, the relevant pathway activates.** Intimate-area use triggers a specialised use-site and safety assessment but does not automatically mean the user is vulnerable. Swimmers do not automatically constitute a vulnerable population.

### Part 8 — Per-market lifecycle and post-market (questions 2, 10, 13, 14, 15, 35)

**(Question 2) An older formula version does not automatically close when the replacement receives launch approval.** States: Active · Transition Approved · Transition in Progress · Superseded · Withdrawn · Cancelled. Approval of the new version places the old version into **Transition in Progress**, not Superseded. It becomes Superseded only after an authorised person confirms, **for the relevant market**: replacement formula version · effective transition date · last manufacturing or release date for the old version · stock disposition or sell-through arrangement · regulatory notification or registration status · applicable artwork and ingredient-list transition · PIF / Product Master File update · Sales and Marketing communication · any required distributor or customer communication · confirmation that no further batches will be released under the old version unless specifically authorised.

> **The supersession decision must be recorded by a person — never inferred automatically by the system.**

**(Question 14) Launch status is assessed per market.** A product has launched in a market when **the actual commercial launch date for that market is recorded.** Project-level statuses: Not launched · Partially launched · Launched in all active markets · Market transition in progress · Withdrawn. Post-market review dates run separately from each market's actual launch date, and **the launch of the first market must not cause all other markets to be treated as launched.**

**(Question 13) The scheduled post-launch review uses the actual commercial launch date** for the relevant market. Recommended company schedule: **one month** — early review for infant, maternal, intimate-use, eye-area or otherwise enhanced-surveillance products · **three months** — first standard post-launch review for all products · **twelve months** — full post-market review · **annually thereafter** while the product remains marketed. A review must occur earlier if a significant adverse event, complaint trend, regulatory request or quality signal arises, and the schedule is configurable where a particular product or market requires a different interval.

**(Question 10) ⚠️ The current sixteen-option list mixes source, issue type and action — these should ideally be separated:**

- **Feedback source:** Consumer · HCP · Distributor · Retailer · Sales · Social media · Customer service · Regulator · Internal Quality or Manufacturing.
- **Issue type:** Safety or adverse event · Product performance · Claim or communication question · Packaging issue · Formula issue · Quality issue · FAQ or education requirement · Product optimisation opportunity.
- **Resulting action:** PMS review · CAPA · Change Control · FAQ update · Product optimisation · No further action.

HCP, retailer, sales and social-media feedback **all count as market feedback**. Minimum mappings using the current list — *market feedback:* consumer / HCP / distributor / retailer / sales / social-media feedback, complaint, claim question, FAQ update where generated by external feedback; *product-performance feedback:* consumer / HCP / distributor / retailer feedback relating to performance, complaint relating to performance, packaging issue, formula issue, quality issue, claim question concerning actual performance, product optimisation; *PV/PMS review:* adverse event or PV signal, PMS trend, complaint with a safety component, consumer / HCP / social-media feedback tagged as a potential safety issue.

> **CAPA is a resulting action, not a feedback source.** Packaging issues contribute to product-performance and market-feedback review where applicable.

**(Question 15) ⚠️ Product-performance feedback should be Conditional, not Supporting.** It becomes mandatory where performance is part of the scheduled review · a performance-related complaint or question is received · a formula, packaging or quality issue affects performance · an efficacy or claim-performance concern is raised · product optimisation is proposed. For market feedback, use **two distinct concepts** rather than changing one record's tier over time: **Continuous Market Feedback Capture — Supporting** (available throughout the lifecycle) and **Scheduled Market Feedback Review — Conditional** (mandatory once the applicable post-launch review milestone is reached or a relevant signal occurs).

**(Question 35) ⚠️ Use separate value lists**, not the ones we reused:

- *Checklist work status:* Not Started · In Progress · Awaiting Information · Complete · On Hold · Blocked · N/A — rationale required.
- *Regulatory approval:* Pending · Approved · Approved with Conditions · Not Approved · Withdrawn · N/A — rationale required.

A market entered as **"Other — specify" must also record the actual country or jurisdiction**; until the market is named and the dossier type is identified the record is incomplete and **must block Gate 10**. All six fields must be present (applicable market · required dossier type · owner · checklist or evidence link · status · Regulatory approval), and where N/A is used the rationale **and an authorised reviewer** must also be recorded.

### Part 9 — Gate 1 and Gate 2 capture (questions 20, 21, 22, 23a, 24, 25)

**(Question 20) ✅ Confirmed exactly as built — no change.** Fields are optional when the project shell is first created and mandatory before Gate 1 passes. A project can be opened with a temporary project name or identifier · creator · date · initial owner; Gate 1 then requires the substantive opportunity and request information.

**(Question 21) ⚠️ For project requirements, use Must / Should / Could.** Criticality remains a *risk* concept, not a requirements-priority value. 🆕 **Add "N/A with rationale" as a valid disposition.** Before Gate 2 passes: every row must be reviewed · every applicable row completed or formally deferred · every non-applicable row marked N/A with rationale · **every Must requirement complete** · a Should or Could requirement may be deferred only through Proceed with Conditions, with an owner and due date. The *Must-have product requirements* row is always mandatory; other rows become mandatory according to project scope. **The system must not require users to mark an empty requirement as Completed.**

**(Question 22)** (a) ✅ the table layout is accepted — it provides owner, status, evidence and rationale fields. (b) ⚠️ a project **may** have more than one development/change type, but **one must be identified as the Primary project type**, with others recorded as secondary. (c) ⚠️ owner/function values: *Request Origin / Source* → **Requesting Function / Project Owner** (preferable to always naming Sales — a request may originate from Regulatory, Quality, Manufacturing, Management or another function); *Development / Change Type* → **NPD / Project Owner**. (d) ✅ the name "Development / Change Type" is accepted. (e) ✅ the five free-text fields stay in their separate *Opportunity & Request — Gate 1* block and are **not** added to the Project Identification table.

**(Question 23a) 🆕** Gate 2 requires at least one product type or form status, but the exact final form may legitimately remain open. **Add the option "Product form under evaluation — to be confirmed by Gate 5"**, so an early brief such as "infant barrier product — cream or balm to be determined" can pass Gate 2 with a controlled action.

**(Question 24) ⚠️ Use the existing Countries / Markets parameter as the single source of truth and remove the separate free-text *Initial target market* field.** The Countries / Markets parameter is **not mandatory to create the initial project shell** but becomes mandatory before Gate 1 passes. The *Initial target user / life-stage* field remains, as it does not duplicate another field.

**(Question 25)** (a) ✅ all five renamed pairs are correct. (b) ⚠️ **Dry skin alone should not automatically be a vulnerable-user group; eczema-prone or compromised skin should.** Where possible split the combined option into *Dry skin* and *Eczema-prone or compromised skin*; if it cannot be split, treat the combined option as triggering the sensitive/compromised-skin review. (c) see Part 7. (d) ✅ our two-way strengths are confirmed: exact contradictions are refused, while for renamed or broader groups a **warning plus rationale is preferable to outright refusal**, since the Safety/Regulatory reviewer may identify the context independently.

### Part 10 — The explicit assessment fields (questions 8, 9, 11, 12, 16)

Each of these adds a field whose "not yet assessed" value blocks — the mechanism defined in Part 1.

**(Question 8) 🆕 Change Control required? → Yes / No / Pending assessment**, plus reviewer · review date · rationale · linked Change Control ID (where Yes) · evidence or supporting link. If **Yes**, a valid Change Control record must be linked; if **No**, the rationale and reviewer must be recorded; **Pending assessment must block closure of the post-market finding.** *"This is preferable to relying only on a reminder."*

**(Question 9) 🆕 Human-participant study planned? → Yes / No / Undecided.** Reviewed at Gate 8, and may also be raised earlier via the claim/evidence plan. **Creating a Study Protocol automatically sets the answer to Yes.** Where Yes: the dedicated study approval workflow becomes mandatory · recruitment must not begin before approval · testing or data collection must not begin before approval · participant information, consent, privacy and data-management requirements must be complete. **Undecided must prevent Gate 8 from closing.**

**(Question 11) ⚠️ None of the six project types is automatically administrative.** A packaging change, lifecycle improvement or reformulation can be technically and commercially significant. 🆕 **Add the classification "Administrative-only change: Yes / No"**, confirmed by an authorised reviewer. Administrative-only examples: internal reference-code correction · file-link update · spelling correction that does not alter meaning · formatting correction · contact-detail update · document metadata update · supplier-document replacement where the material itself has not changed. **A project is exempt from competitor/benchmark review only when it is confirmed as administrative-only *and* no claim, formula, market positioning, product performance, packaging function or customer-facing meaning changes.**

**(Question 12) ✅ A formula change classified Major also counts as a major reformulation for the Gate 9 scale-up trigger.** Affected areas that trigger scale-up or pilot review: formula composition · active or preservative concentration · manufacturing site · equipment type or equipment scale · batch size · order of addition · mixing speed or time · homogenisation · heating or cooling profile · maximum temperature · hold time · pre-processing or ingredient hydration · transfer method · filling method · water quality or process-water source · process aid · packaging/filling interface · **any change identified by Manufacturing, Quality or R&I as potentially affecting product performance.** 🆕 **Add "Scale-up risk identified? → Yes / No / Pending assessment"** plus risk description · assessor · assessment date · rationale · required pilot or scale-up activity · evidence link. **Pending assessment should block Gate 9 readiness.**

**(Question 16) 🆕 Where the system can determine from controlled data that a condition does not apply, it may auto-generate the N/A reason** — examples given: no maternal user selected · formula confirmed anhydrous · no special market pack requirement identified. **For safety-, regulatory-, claims- or release-critical items the system-generated rationale must still be acknowledged by the responsible reviewer before gate closure**; for Supporting items the system-generated explanation alone is sufficient. *"Users should not be required to retype a reason already deterministically generated by the system."*

### What this round changes in the application

**Rework of behaviour already shipped (around 20 sites).** The largest are: the trigger engine becoming tri-state (7) · the Gate 7 restricted/caution screen splitting into three layers (5) · Gate 4 requiring every row dispositioned (6) · three severity/status vocabularies converging on one four-level scale and one lifecycle (3, 32b, 33, 34) · the raw-material hard block narrowing to formula materials at Gates 7/10/11 (31f) · Cosmetic claims triggering product-level evidence (36a) · the Phase 1 priority column becoming Must/Should/Could (21) · removing the duplicated initial-market field (24) · splitting the Dry / eczema-prone target-user option (25b) · both Gate 1 owner/function values (22c) · the feedback-source list splitting into three (10) · the Gate 12 feedback tiers (15) · the two per-market regulatory checklist value lists (35).

**New build, largest first:** the per-gate three-role sign-off with a gate-scoped evidence snapshot, keyed per market at Gates 10–11 (18, 29) · the Infant & Baby Safety pathway across Gates 2, 4, 5, 6, 7, 8–9 and 10 (1) · three company-level controlled reference datasets — Claims Library, Raw Material Risk Overlay, Regulatory market profiles (28, 17, 4) · the claim revision model with artwork linkage and a publication record (26, 30) · per-market launch dates, supersession decisions and review schedules (2, 13, 14) · the five explicit assessment fields (8, 9, 11, 12, 16).

**Confirmed as already correct, no change beyond retiring the assumption tag:** the Gate 1 field timing (20) · the claim declaration model and Claim ID timing (19a/c/e/f) · the traceability ledger staying open through Gates 10–11 (26) · the five Regulatory review fields and four outcomes (27a/b) · the four claim-linkage choices (30a) · five of the six import-stub readings (31a–e) · the unassessed-row and closure-evidence rules on safety findings (33d/e) · the two-way vulnerable-user check (25a/d) · the Gate 2 product-type and Gate 7 safety-matrix requirements we had added ourselves (23) · Major = major reformulation (12).

**The build order this implies** is set out in `docs/plans/Round4_Implementation_Roadmap.md`: the tri-state trigger engine and the shared vocabularies first, because every later group sits on them. That roadmap's tracking table is the single record of which of the 36 is finished — this document records the answers, not the build. As of 2026-08-30, thirty-three are done — everything except the Claims Library (28), 12's eighteen affected areas and 16's reviewer acknowledgement.

---
## Remaining implementation inputs (2026-07-21)

The **rule questions are closed** (only F12 awaits Cosmetri). What is left is **supplying data/content** the answers now call for — these are inputs to gather, not decisions to make:

- **F1/C7** — map each per-gate item above to a concrete register/field in the app and to its trigger condition (which registers are Mandatory vs Conditional vs Supporting for each gate).
- **F3** — the actual controlled watch-list datasets (real CAS numbers per ingredient group) built/maintained by Regulatory & Safety.
- **F6** — the fine-grained role × gate/section/register permission grid, plus the real SSO/AD attribute mapping (which AD group → which MBc360 role/department).
- **F10** — the concrete per-market checklist content for each Market Dossier Profile (EU CPSR items, AU, US, …), supplied by Regulatory.
- **F11** — the Published Product Information Guideline / Claims Library content (approved terms, required evidence per claim).
- **F12** — Cosmetri's confirmation of ASEAN/Vietnam compliance coverage (external dependency).

**Update (2026-08-07):** the F1/C7 line above is now largely discharged — Appendix 2 supplies the per-item trigger conditions and the missing fields, so the mapping work is no longer waiting on the team. What Round 3 **adds** to this list, still as content rather than decisions:

- **B7 / C1 / F11** — the approved **Claims Library** content becomes a harder dependency than before: the Gate 3 regulatory-review trigger fires partly on "wording not in the approved Claims Library", which cannot be evaluated until that library exists.
- **A3** — the trigger conditions reference product/formula properties the app does not record (project/change type, microbiological susceptibility, raw-material composition risk). Whether these are captured as new fields or derived from existing data is ours to design; the *rule* is settled.
- **E2** — unchanged in substance from F10, but now with an interim requirement: a temporary Regulatory Checklist Status record for non-ASEAN markets, so the item is never simply unenforced.


**Update (2026-08-24):** Round 4 discharges three more of these, and turns the fourth into a build item rather than a content request:

- **F2** — the Infant & Baby Safety workflow **content is now supplied** (Appendix 3, Part 7). It is not a separate workflow bolted onto Gate 7 but a pathway spanning Gates 2, 4, 5, 6, 7, 8–9 and 10, with Compartment 3 as its final component.
- **F11 / B7 / C1** — the **Claims Library is now specified** (Appendix 3, Part 4): company-level, Technical **and** Regulatory both approving each entry, projects reading but never editing, with a controlled "Propose for Claims Library" promotion action. Its *content* is still to be populated, but its shape is no longer an open question, and a project claim with no library entry is now explicitly permitted as "New claim — not yet in Claims Library".
- **F10 / E2** — the per-market checklist content is **partly** discharged. Question 35 fixes the two value lists and the "Other — specify" handling; the configurable **Regulatory market profile** of question 4 is where the required dossier type per market now lives. The concrete per-market checklist items (EU CPSR, AU, US) are still content Regulatory must supply.
- **F3** — unchanged as a dataset request, but question 17 adds a neighbouring one: a shared **Raw Material Risk Overlay** keyed to the Cosmetri raw-material ID, carrying the eleven composition-risk classifications the Cosmetri API does not expose. Like the watch-lists it is controlled data maintained by Technical, Safety and Regulatory — not something a project enters.
## NPD Front-End Roadmap (v2 workbook, 2026-07-24)

**Status:** ✅ Confirmed. `MBc360 Master Product Development System File v2.xlsx` was authored directly by the expert/SME team and is treated as an already-confirmed source, the same authority as the original workbook — no additional confirmation round was needed for the rules below.

**What it adds:** a mandatory 4-step scientific front-end that every new product must complete, in order, before the formula is locked at Gate 5:

1. **Needs & Scientific Basis** — physical, emotional, caregiver and design-implication needs, with research questions and literature-search method recorded. Sign-off gate: **Gate 02**.
2. **Competitor Landscape** — purchased-and-tested competitor products, comparative testing and current-solution/standard-of-care analysis. Sign-off gate: **Gate 03**.
3. **Target Product Profile & Backbone Technology** — one agreed definition of product success, plus the proposed technology platform and why it is superior to the market. Must be **complete before the formula is locked (Gate 05)**.
4. **Evidence Plan & Claim Support** — the proof plan (endpoint, comparator, pass/fail) must be agreed **before** the formula is locked (Gate 05); the detailed test protocol is completed once a prototype exists (Gate 08).

**Enforcement:** Formula BOM (Gate 05) is now hard-blocked — the same way a missing safety sign-off already blocks a gate — until Steps 1–3 are complete and signed off, and the Step 4 evidence plan is recorded. Gates 02, 03 and 08 each also gained their own earlier checkpoint for the matching step, so problems surface as soon as possible rather than only at the very end.

**Update (2026-07-27) — now hard-blocked, but this is a project-owner/dev decision, not yet put to the SME team — see the open question in `F1_Per_Gate_Open_Questions.md` (Gate 3 section) for the exact design being confirmed:** the source sheet also states that no claim may appear on packaging, HCP material or sales material unless it has an approved "Claim ID" on file — the same idea as Gate 3's own rule, *"a claim may remain under development, but unsupported wording must not be marked as approved."* Previously this was tracked on a register but not enforced, since doing so meant touching the existing Published Information approval workflow (F11). That has now been done: Published Information Approval rows can optionally link to a specific Claim ID (Claim → Evidence Traceability); a row cannot be saved in a released workflow state ("Approved for Release" / "Released") unless that claim's own status is "Supported". A row with no linked claim (e.g. plain company information) is unaffected. Enforced both in the app and on the server, so it cannot be bypassed by a direct API call either.

> **Answered (2026-08-07) — see Appendix 2, D2.** The team confirmed the release block but changed three of the four design choices: linking a Claim ID becomes **required** for any product statement (optional only for genuinely non-product corporate information), a still-developing **Pending claim must be selectable** (so the intended claim is documented early — the block belongs at release, not at linking), and the fill-and-lock is replaced by **master approved wording held alongside proposed channel wording**, with reviewer-confirmed equivalence instead of a byte-for-byte lock. The release block itself is also widened: the claim must be Supported **and** approved for the relevant SKU, formula version, market and channel.

## Notes

- Group A (data architecture) should be confirmed **first**, since it directly affects database design — getting the initial direction wrong is costly to fix later. *(All Group A follow-ups answered as of 2026-07-21 — F4, F5, F6, F14 confirmed; F12 remains an external dependency.)*
- Groups B and C are business rules that can be refined progressively during development without necessarily breaking the architecture, but early confirmation is still recommended to avoid reworking UI/logic already built.
- The 2026-07-16 answers **overturn three core demo assumptions**: (1) gate passing must also read sign-offs, Next Actions and evidence registers — not just Stage status + Gate decision; (2) backtrack must never delete — event-log/snapshot model required; (3) Gates 10–12 become per-market instead of a single shared flow.
- The 2026-07-21 answers add three further **demo-changing** points: (4) **concurrent formula versions** — a major change keeps the old version's closed market tracks and opens a new per-market track (F4), overturning the demo's "market tracks fixed at creation"; (5) **"Infant 0+" gets its own Infant & Baby Safety workflow**, separate from Skincare for Two (F2); (6) manual Formula BOM lines must be **reconciled to Cosmetri before Gate 7**, and Gates 10/11 must use the controlled Cosmetri formula (F14).
- The 2026-08-07 answers (Appendix 2) add four further **demo-changing** points: (7) **the per-gate sign-off is a real 3-role electronic sign-off**, not the Owner + Evidence link we implemented (D1); (8) **Published Information claim linking is required, Pending claims are linkable, and wording is compared rather than locked** (D2); (9) **the Gate 7 pregnancy/breastfeeding assessment is conditional, not unconditional**, with a separate infant pathway (E1); (10) **Gates 10 and 11 become per-market**, so a single approved market no longer makes the gate look ready (E3a).
- Reference materials: `MBc360 Master Product Development System File.xlsx` (55 sheets), the current ReactJS demo (`mbc360-app/`), the subject-matter team's full 2026-07-21 reply (`docs/rounds/2026-07-21-sme-reply-F1-F14.txt`), and their 2026-08-07 Round 3 reply (`docs/rounds/2026-08-07-sme-reply-round3.txt`).
