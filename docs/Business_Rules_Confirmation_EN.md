# MBc360 — Business Rules Confirmation Checklist (Pre-Implementation)

**Purpose:** Before building the production backend/database for the MBc360 system, the subject-matter team (Product Development / NPD / Quality / Regulatory) needs to confirm the business rules below. The current ReactJS demo already applies a set of working assumptions to demonstrate the workflow — these assumptions **must be confirmed or corrected** before the real system is built.

**How to use this document:** For each item, please confirm **Correct / Incorrect / Needs adjustment** and record the answer under "Subject-matter team decision".

---

## Group A — Data Architecture (confirm these first)

> These questions directly affect the database design. Getting the initial direction wrong here is expensive to fix later.

### A1. Is gate/phase progress tracked per Project or per Market?

**Context:** A project can target multiple markets at once (e.g., Vietnam, Australia, Malaysia). In practice, Gate 10 (Regulatory Dossier) and PIF status can differ per country (approved in Vietnam while still pending in Australia).

**Current demo assumption:** One project = one single 12-gate flow, shared across all selected markets.

**Needs clarification:**
- Should Gate 10–12 (or the whole Regulatory track) be tracked separately per market, or is a single shared gate flow sufficient, with per-market detail living only inside PIF_Checklist_ASEAN?

**Subject-matter team decision:** ______________________________________________

---

### A2. Does a new formula version re-run Gates 4–9?

**Context:** `Product_Family_Register` and `Formulation_Change_Register` show that one product can have multiple formula versions over time (note: Vietnam requires roughly 6 months to re-register after a formula change).

**Needs clarification:** When a new formula version is created for the same product, should the system:
- (a) Create a new project/gate-flow, inheriting the old Phase 1 data; or
- (b) Reopen (backtrack) Gates 4–9 on the existing project; or
- (c) Handle it entirely through Change_Control_Comm without touching the original Gate Flow?

**Subject-matter team decision:** ______________________________________________

---

### A3. Ingredient/supplier data: shared master data or re-entered per project?

**Context:** `Supplier_RM_Evidence`, `Prohibited_Ingredients`, and `PB_Caution_Limits` behave like a "registry" — e.g., one ingredient's SDS/CoA can apply to many different formulas.

**Current demo assumption:** Each project enters its own data independently; nothing is shared.

**Needs clarification:**
- Should ingredients/suppliers be shared master data (entered once, referenced by every project) or kept independent per project?
- If shared, who is authorized to create/edit this master data?

**Subject-matter team decision:** Raw Materials master data already exists in the **Cosmetri** software and will be sourced via its **API** — no re-entry/duplication inside MBc360.

**Still needs confirmation (not yet answered):**
- Does **Supplier** master data also live in Cosmetri, or is it tracked in a separate system?
- Do the evidence documents referenced by `Supplier_RM_Evidence` (SDS/CoA/TDS/allergen statements, etc.) also live in Cosmetri, or does MBc360 still need to store/link them separately?
- Who is authorized to create/edit data in Cosmetri — is MBc360 read-only via the API, or does it also write back?

---

### A4. Role-based access control (RBAC)

**Context:** Each gate has a "Primary owner" department (e.g., Gate 07 = Safety/Scientific Review, Gate 10 = Regulatory).

**Current demo assumption:** No permission enforcement — anyone can edit any field.

**Needs clarification:**
- Should the real system enforce role-based restrictions — e.g., only Regulatory can change Gate 10's decision, only the correct person can sign "Approved by"?

**Subject-matter team decision:** ______________________________________________

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

**Subject-matter team decision:** ______________________________________________

---

### B2. Next action / Next due date / Next owner

**Main question:** Are these three fields purely informational records, or do they drive any logic (blocking a gate/phase)?

**Current demo assumption:** Purely informational, blocks nothing; a single record per phase (not a repeating list).

**Needs clarification:**
1. Can one phase have multiple Next actions (a list), or is a single row (as in the current demo) sufficient?
2. If a Next action is still open (unresolved), can the phase still be considered "complete"? Or does an open Next action necessarily imply the decision must be "Proceed with Conditions" (related to B1)?
3. Does Next action need its own status (Open / In Progress / Done) to track, or is it just free text with no tracking?
4. Who is responsible for closing a Next action — the person at the current phase (who recorded it), or the recipient at the next phase (the named owner)?

**Subject-matter team decision:** ______________________________________________

---

### B3. What determines a Phase is complete?

**Main question:** When is a phase considered COMPLETE? Please confirm whether each condition below is mandatory:

| # | Condition | Mandatory? |
|---|---|---|
| a | All 3 gates in the phase have Passed (per B1) | |
| b | All Key Gate Checks for the phase = Done/Y (or N/A) | |
| c | All 8 Angles Coverage = Covered (or N/A where not applicable) | |
| d | Sign-off from all 3 roles (Prepared / Reviewed / Approved), or is Approved by alone sufficient? | |
| e | All Next actions are closed | |

**Current demo assumption:** Only (a) plus the "Approved by" part of (d) are enforced — (b), (c), and (e) are not currently checked.

**Needs clarification:**
1. If an item in Key Gate Checks / 8 Angles is marked N/A — does that count as "satisfied"?
2. Is there a required order — must Key Gate Checks + 8 Angles be fully completed before Sign-off is allowed, or can the two proceed independently in parallel?

**Subject-matter team decision:** ______________________________________________

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

**Subject-matter team decision:** ______________________________________________

---

## Group C — Specific Business Rules

### C1. Does "Skincare for Two" actually block the gate?

**Context:** The Introduction sheet states: *"Maternal products must include maternal use plus baby-contact/infant exposure consideration; this is mandatory, not optional."*

**Needs clarification:**
1. How is this "mandatory" condition triggered automatically — by the user selecting "Pregnancy/Breastfeeding/Postpartum/Infant 0+" at Gate 02 (Phase 1)?
2. Once triggered, is Gate 07 hard-blocked from a "Proceed" decision if the maternal & baby-contact safety items are not yet complete — or is it only a reminder, as it currently is?

**Subject-matter team decision:** ______________________________________________

---

### C2. Is the Study/Human Trial approval chain a fixed set of roles?

**Context:** The Introduction states specifically: *"Chris prepares study proposal, George/Head of Department signs off, Sekar or nominated independent reviewer signs off outside the department."*

**Needs clarification:**
1. Is this a dedicated approval workflow for the Study Protocol (3 roles distinct from the generic Prepared/Reviewed/Approved block), or does it reuse the existing Gate 08 Sign-off block?
2. Should the system enforce that the "independent reviewer" cannot be from the same department as the preparer (to avoid conflicts of interest)?
3. Are the named individuals (Chris/George/Sekar) illustrative examples, or fixed roles that need to be hard-coded?

**Subject-matter team decision:** ______________________________________________

---

### C3. Prohibited Ingredients / Caution Limits: automatic cross-check or manual entry?

**Context:** The Template_Index states: *"Formula match formulas flag possible matches"* — which sounds like an automated cross-reference.

**Needs clarification:** When an ingredient name is entered into the Formula BOM, should the system automatically scan the Prohibited/Caution lists to flag it immediately (e.g., "REVIEW - possible formula match"), or is this entirely a manual check with the user entering the conclusion by hand?

**Subject-matter team decision:** ______________________________________________

---

### C4. Does an open Change Control record block the Gate Flow?

**Main question:** If a Change Control record related to a project is open (not yet closed), does that have any effect on the project's Gate Flow?

**Current demo assumption:** The two tracks are entirely independent, with no linkage.

**Needs clarification:** Should a Change record be required to link to the specific Gate/Phase it affects, with that gate "soft-locked" or flagged until the Change is closed?

**Subject-matter team decision:** ______________________________________________

---

### C5. Is PIF export/launch hard-blocked by PIF status?

**Context:** *"No external HCP/distributor/pharmacy claim use until PIF attachment status and approval are closed."*

**Needs clarification:** Is Gate 11 (Production/Launch sign-off) hard-blocked if PIF_Checklist_ASEAN is not fully closed (per the relevant market — see A1), or is this only a warning/recommendation?

**Subject-matter team decision:** ______________________________________________

---

### C6. Does `PIF_Evidence_Closure` actually hard-block external use of claims/information?

**Context:** The `PIF_Evidence_Closure` sheet lists triggers (new claim, new public information, formula change, distributor/HCP question, etc.) with a **"Blocks external use until closed?"** column — every row is marked **Y**. For example: a new claim must be added to `SKU_Claims_PIF_Register` with evidence attached before use; new public information must go through `Published_Info_Approval` before publication.

**Current demo assumption:** Not implemented — these two sheets (`SKU_Claims_PIF_Register`, `Published_Info_Approval`) have no screens yet, and the app has no mechanism that blocks "external use".

**Needs clarification:**
1. What does "blocks external use" concretely block within the system — does it prevent Gate 10/11 from turning Complete, or is it purely a procedural rule (enforced by people, since "external use" — sending an email, posting on social media — happens outside the system and can't literally be blocked by software)?
2. If a claim/public information item is not yet closed (no PIF link attached) but Gate 10 is already Complete — is that considered a violation/conflict worth flagging, or are the two entirely independent?
3. Is an attestation/confirmation step needed before content is published externally, so the system at least records that the user checked the PIF closure condition before publishing?

**Subject-matter team decision:** ______________________________________________

---

## Notes

- Group A (data architecture) should be confirmed **first**, since it directly affects database design — getting the initial direction wrong is costly to fix later.
- Groups B and C are business rules that can be refined progressively during development without necessarily breaking the architecture, but early confirmation is still recommended to avoid reworking UI/logic already built.
- Reference materials: `MBc360 Master Product Development System File.xlsx` (54 sheets) and the current ReactJS demo (`mbc360-app/`).
