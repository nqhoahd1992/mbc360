# MBc360 — Business Rules Confirmation Checklist (Pre-Implementation)

**Purpose:** Before building the production backend/database for the MBc360 system, the subject-matter team (Product Development / NPD / Quality / Regulatory) needs to confirm the business rules below. The current ReactJS demo already applies a set of working assumptions to demonstrate the workflow — these assumptions **must be confirmed or corrected** before the real system is built.

**How to use this document:** For each item, please confirm **Correct / Incorrect / Needs adjustment** and record the answer under "Subject-matter team decision".

> **Status (2026-07-16):** Subject-matter team decisions have been received and recorded below for **all items except C7** (still open). Two new requirements were added by the team (GMP Documentation, Published Information Approval workflow). Remaining open points are consolidated in **"Outstanding follow-up questions"** at the end of this document.

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

---

### C4. Does an open Change Control record block the Gate Flow?

**Main question:** If a Change Control record related to a project is open (not yet closed), does that have any effect on the project's Gate Flow?

**Current demo assumption:** The two tracks are entirely independent, with no linkage.

**Needs clarification:** Should a Change record be required to link to the specific Gate/Phase it affects, with that gate "soft-locked" or flagged until the Change is closed?

**Subject-matter team decision:** ✅ **Confirmed — Change Control is linked directly to gates.**
- An open Change Control record creates a **soft lock or warning** on the affected gate until the change has been assessed and closed.
- This maintains traceability.

*Open follow-up: → F9 (which Change statuses count as "open"; what the soft lock concretely does — banner only, or required acknowledgement before the gate decision).*

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

---

### C7. Should safety/PIF evidence registers be a mandatory condition to pass a gate?

**Context:** The app now has ~37 evidence registers (Formulation_Safety, Prohibited_Ingredients, PB_Caution_Limits, PIF_Checklist_ASEAN, ...), each tagged with a "Gate 0X" label for reference. That tag is **purely cosmetic** — the gate-pass mechanism (see B1) only reads Stage status + Gate decision from the Phase Gate Flow table, and never reads data inside these evidence registers.

**Current demo assumption:** It's possible for Gate 07 to already be Complete + Proceed while `Prohibited_Ingredients` still has a row marked "REVIEW - possible formula match" unresolved, or while `Formulation_Safety`'s "Final safety release" is still "Not Started" — the system does not warn or block in that case.

**Needs clarification:**
1. Are there specific evidence registers (e.g. Formulation_Safety's Final Safety Sign-off, or Prohibited_Ingredients having no remaining "REVIEW"/"Prohibited - remove" rows) that should become a **mandatory condition** for Gate 07/10 to be allowed to reach Complete?
2. If so, should it hard-block (disallow selecting a Proceed decision) or only soft-warn (allow Proceed but show a banner flagging unresolved evidence)?
3. Should this apply to all 37 registers, or only a subset of "safety-critical" ones?

**Subject-matter team decision:** ❌ **NOT YET ANSWERED.**

> B1's new condition "mandatory evidence attached" implies the direction is *yes*, but the specific per-gate list of required registers/evidence and the hard-block vs soft-warn behaviour remain undefined. **This is the largest remaining gap — see F1.** B1 cannot be implemented without this answer.

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

> Consolidated list of everything still open after the 2026-07-16 answers. **F1 blocks B1/C7 implementation and should be answered first.**
>
> Where the demo had to assume an answer to keep working, the row carries a *"Demo working assumption"* — please **confirm or correct** it rather than answering from scratch.

| # | Relates to | Question |
|---|---|---|
| **F1** | C7, B1 | Per-gate definition of "required sign-offs" and "mandatory evidence": for each gate (esp. 07 and 10), exactly which sign-offs and which evidence registers/states are required to pass (e.g. Gate 07 ⇐ Formulation_Safety "Final safety release" Completed AND Prohibited_Ingredients with no "REVIEW"/"Prohibited - remove" rows)? Hard-block or soft-warn per item? All 37 registers or a safety-critical subset? *The demo's `gateBlockers()` framework is ready to enforce the confirmed list as hard blocks.* |
| **F2** | C1 | Does selecting **"Infant 0+"** (baby-only product, no maternal selection) also activate Skincare for Two? The reply lists only Pregnancy/Breastfeeding/Postpartum. *Demo working assumption: only those three selections trigger the hard block (a one-line change once confirmed).* |
| **F3** | C3 | Ingredient-matching mechanics — *partially resolved by the Cosmetri API doc*: `/compliance/{formulaId}` returns **`inci_name` + `cas_no` + `ec_no` + % w/w** per ingredient, so matching can key on CAS numbers (exact) instead of name heuristics. Still open: the watch-lists (Prohibited / PB caution) must themselves carry CAS lists per group — who builds and maintains that mapping? And the source/update cadence for per-market regulatory restriction lists. |
| **F4** | A1 × A2 | A launched product (per-market Gates 10–12 closed) gets a major formula change → Gates 4–9 backtrack. Do the closed market tracks automatically reopen per market (e.g. Vietnam ~6-month re-registration)? Must the system support **two concurrent versions** of one product (old version still on market while the new one is in development)? What happens when a market is added/removed mid-project? *Demo working assumption: a Major formula version reopens Gates 4–9 but leaves the per-market Gate 10–12 tracks untouched, and market tracks are fixed at project creation.* |
| **F5** | A2 | Criteria for **"major" vs "minor"** formulation change (major = auto new version + backtrack; minor = Change Control only). Can the existing `Formula_Change_Control` trigger catalogue serve as the classification basis? *Demo working assumption: the user classifies each change manually as Major or Minor when creating the version.* |
| **F6** | A4, C2 | The concrete **role/permission matrix** (role × gate/section/register × contribute/approve/sign). Where does user + department data come from (SSO/AD)? Delegation during absence? Required e-signature standard for "electronic approval history" (audit-trail depth, 21 CFR Part 11-style or lighter)? *Demo working assumption: a "View as role" selector derives authorization from each gate's Primary owner / phase department keywords — gate decisions, phase "Approved by" and market approvals are restricted; evidence fields stay open.* |
| **F7** | B1 | Does a **Gap** status block only plain "Proceed", or also "Proceed with Conditions"? *Demo working assumption: Gap blocks only plain Proceed; Proceed with Conditions stays available.* |
| **F8** | B2 | Who is authorized to **close** a Next Action (the recorder, the owner, or either)? What is the Priority value list? *Demo working assumption: any user can close an action; priority values are Low / Medium / High.* |
| **F9** | C4 | Which Change statuses count as "open" for the soft lock? What does the soft lock concretely do — warning banner only, or required acknowledgement before a gate decision can be recorded? *Demo working assumption: any change record not "Completed" counts as open; the soft lock is a warning icon on the gate with no acknowledgement step.* |
| **F10** | C5 | For non-ASEAN markets (EU, Australia, US, ...): which checklist replaces `PIF_Checklist_ASEAN` as the per-market "PIF complete" definition (e.g. EU CPSR)? |
| **F11** | C6 | Published Information Approval workflow details: states, required reviewer roles per content type, and the source/maintenance of the acceptable-terminology and required-evidence-per-claim guidance. *Demo working assumption: five Y/N/N.A. workflow steps on the register (terminology check → evidence verified → technical review → regulatory review → final approval) plus a released-without-approval violation flag.* |
| **F12** | A3 | Cosmetri API — *mostly resolved*. Known from the API doc: OAuth2 + JWT, rate limits, `since_updated_at` incremental sync, RM/product/formula/compliance/manufacturing-order endpoints; RM response includes **`supplier_name`**; `inf_code` = **Batch No.**, so the ingredient matching key is `cas_no` from `/compliance`. Decided (2026-07-16): data the API does not provide (supplier details beyond the name, SDS/CoA/TDS links) is **entered manually**; new raw materials follow the **Power Apps change request → approval → Cosmetri entry → API** flow, with MBc360 linking to the Power Apps app when an ingredient is not yet selectable. **Only remaining question: do Cosmetri compliance zones cover ASEAN/Vietnam (example shows EU/UK/US only)?** |

---

## Notes

- Group A (data architecture) should be confirmed **first**, since it directly affects database design — getting the initial direction wrong is costly to fix later. *(Now answered — remaining Group A follow-ups: F4, F5, F6, F12.)*
- Groups B and C are business rules that can be refined progressively during development without necessarily breaking the architecture, but early confirmation is still recommended to avoid reworking UI/logic already built.
- The 2026-07-16 answers **overturn three core demo assumptions**: (1) gate passing must also read sign-offs, Next Actions and evidence registers — not just Stage status + Gate decision; (2) backtrack must never delete — event-log/snapshot model required; (3) Gates 10–12 become per-market instead of a single shared flow.
- Reference materials: `MBc360 Master Product Development System File.xlsx` (55 sheets) and the current ReactJS demo (`mbc360-app/`).
