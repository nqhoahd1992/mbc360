# MBc360 — Business Rules Confirmation Checklist (Pre-Implementation)

**Purpose:** Before building the production backend/database for the MBc360 system, the subject-matter team (Product Development / NPD / Quality / Regulatory) needs to confirm the business rules below. The current ReactJS demo already applies a set of working assumptions to demonstrate the workflow — these assumptions **must be confirmed or corrected** before the real system is built.

**How to use this document:** For each item, please confirm **Correct / Incorrect / Needs adjustment** and record the answer under "Subject-matter team decision".

> **Status (2026-07-16):** Subject-matter team decisions have been received and recorded below for **all items except C7** (still open). Two new requirements were added by the team (GMP Documentation, Published Information Approval workflow). Remaining open points are consolidated in **"Outstanding follow-up questions"** at the end of this document.
>
> **Status (2026-07-21):** The subject-matter team has now answered **all 14 follow-up questions (F1–F14)**, plus the three previously-unanswered items **A5, B5 and C7** (source: `docs/Response.txt`). Their answers are recorded inline at each item below and summarised in the outstanding-questions table. **Only one point remains genuinely open: F12** (Cosmetri's compliance coverage of ASEAN/Vietnam — must be confirmed by Cosmetri, not by our team). Everything else is now a matter of **supplying data/content** (see the "Remaining implementation inputs" note at the end), not of deciding a rule.

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

**Update (2026-07-16) — Cosmetri API documentation received (`docs/swagger-init.json`, OpenAPI 3.0, base `https://app1-env.cosmetri.com/api/v1`):**
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

### D5. "Project owner" is no longer a gate condition at Gate 1

✅ **Gate 1's "Project owner" requirement is now satisfied automatically.** The Project Lead is a **required field on the Create New Project form**, so a project cannot exist without one. Previously this item was tied to a Key Gate Check, which made the team re-confirm something the creation form already guarantees.

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

> **Update (2026-07-21): all 14 follow-ups have been answered** (source: `docs/Response.txt`). The table below now records the confirmed answer for each. **Only F12 remains genuinely open** — it depends on Cosmetri confirming its ASEAN/Vietnam compliance coverage, which is outside our team's control. The full per-gate mandatory-evidence list for F1 is in the appendix section that follows this table.
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

## Remaining implementation inputs (2026-07-21)

The **rule questions are closed** (only F12 awaits Cosmetri). What is left is **supplying data/content** the answers now call for — these are inputs to gather, not decisions to make:

- **F1/C7** — map each per-gate item above to a concrete register/field in the app and to its trigger condition (which registers are Mandatory vs Conditional vs Supporting for each gate).
- **F3** — the actual controlled watch-list datasets (real CAS numbers per ingredient group) built/maintained by Regulatory & Safety.
- **F6** — the fine-grained role × gate/section/register permission grid, plus the real SSO/AD attribute mapping (which AD group → which MBc360 role/department).
- **F10** — the concrete per-market checklist content for each Market Dossier Profile (EU CPSR items, AU, US, …), supplied by Regulatory.
- **F11** — the Published Product Information Guideline / Claims Library content (approved terms, required evidence per claim).
- **F12** — Cosmetri's confirmation of ASEAN/Vietnam compliance coverage (external dependency).

## NPD Front-End Roadmap (v2 workbook, 2026-07-24)

**Status:** ✅ Confirmed. `MBc360 Master Product Development System File v2.xlsx` was authored directly by the expert/SME team and is treated as an already-confirmed source, the same authority as the original workbook — no additional confirmation round was needed for the rules below.

**What it adds:** a mandatory 4-step scientific front-end that every new product must complete, in order, before the formula is locked at Gate 5:

1. **Needs & Scientific Basis** — physical, emotional, caregiver and design-implication needs, with research questions and literature-search method recorded. Sign-off gate: **Gate 02**.
2. **Competitor Landscape** — purchased-and-tested competitor products, comparative testing and current-solution/standard-of-care analysis. Sign-off gate: **Gate 03**.
3. **Target Product Profile & Backbone Technology** — one agreed definition of product success, plus the proposed technology platform and why it is superior to the market. Must be **complete before the formula is locked (Gate 05)**.
4. **Evidence Plan & Claim Support** — the proof plan (endpoint, comparator, pass/fail) must be agreed **before** the formula is locked (Gate 05); the detailed test protocol is completed once a prototype exists (Gate 08).

**Enforcement:** Formula BOM (Gate 05) is now hard-blocked — the same way a missing safety sign-off already blocks a gate — until Steps 1–3 are complete and signed off, and the Step 4 evidence plan is recorded. Gates 02, 03 and 08 each also gained their own earlier checkpoint for the matching step, so problems surface as soon as possible rather than only at the very end.

**Update (2026-07-27) — now hard-blocked, but this is a project-owner/dev decision, not yet put to the SME team — see the open question in `F1_Per_Gate_Open_Questions.md` (Gate 3 section) for the exact design being confirmed:** the source sheet also states that no claim may appear on packaging, HCP material or sales material unless it has an approved "Claim ID" on file — the same idea as Gate 3's own rule, *"a claim may remain under development, but unsupported wording must not be marked as approved."* Previously this was tracked on a register but not enforced, since doing so meant touching the existing Published Information approval workflow (F11). That has now been done: Published Information Approval rows can optionally link to a specific Claim ID (Claim → Evidence Traceability); a row cannot be saved in a released workflow state ("Approved for Release" / "Released") unless that claim's own status is "Supported". A row with no linked claim (e.g. plain company information) is unaffected. Enforced both in the app and on the server, so it cannot be bypassed by a direct API call either.

## Notes

- Group A (data architecture) should be confirmed **first**, since it directly affects database design — getting the initial direction wrong is costly to fix later. *(All Group A follow-ups answered as of 2026-07-21 — F4, F5, F6, F14 confirmed; F12 remains an external dependency.)*
- Groups B and C are business rules that can be refined progressively during development without necessarily breaking the architecture, but early confirmation is still recommended to avoid reworking UI/logic already built.
- The 2026-07-16 answers **overturn three core demo assumptions**: (1) gate passing must also read sign-offs, Next Actions and evidence registers — not just Stage status + Gate decision; (2) backtrack must never delete — event-log/snapshot model required; (3) Gates 10–12 become per-market instead of a single shared flow.
- The 2026-07-21 answers add three further **demo-changing** points: (4) **concurrent formula versions** — a major change keeps the old version's closed market tracks and opens a new per-market track (F4), overturning the demo's "market tracks fixed at creation"; (5) **"Infant 0+" gets its own Infant & Baby Safety workflow**, separate from Skincare for Two (F2); (6) manual Formula BOM lines must be **reconciled to Cosmetri before Gate 7**, and Gates 10/11 must use the controlled Cosmetri formula (F14).
- Reference materials: `MBc360 Master Product Development System File.xlsx` (55 sheets), the current ReactJS demo (`mbc360-app/`), and the subject-matter team's full 2026-07-21 reply (`docs/Response.txt`).
