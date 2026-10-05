# MBc360 — Consolidated Business Rules

**What this is.** Every business rule the subject-matter team has confirmed, from all four question rounds, reorganised **by subject** instead of by round. Where several questions across different rounds govern the same subject, they are merged into one rule here, and **each statement carries the round and question number it came from**, so any sentence can be traced back to the exact answer that produced it.

**What this is not.** This document does not decide anything. It is a reorganisation of an existing record. The chronological record — each round's question, the answer verbatim, and the discussion around it — stays in `Business_Rules_Confirmation_EN.md` and the round files in `docs/rounds/`. **If this document and that record ever disagree, the record wins** and this file is the one to correct.

---

## 0. How to read the tags

Every rule is followed by one or more tags in square brackets naming its source.

| Tag | Round | Date answered | Numbering used |
|---|---|---|---|
| `R1-xx` | Round 1 — the original confirmation checklist | 2026-07-16 | Groups A1–A5, B1–B5, C1–C7 |
| `R2-xx` | Round 2 — the F-series follow-ups | 2026-07-21 | F1–F14, plus A5, B5 and C7 answered in this round |
| `R3-xx` | Round 3 — gate-readiness questions | 2026-08-07 | Parts A1–A3, B1–B7, C1–C2, D1–D4, E1–E3 |
| `R4-Cnn` | Round 4 — the 36 questions | 2026-08-24 | **C = the question number as sent to the team** (1–36) |
| `V2` | The v2 workbook, authored by the expert team | 2026-07-24 | Treated as already confirmed, no separate round |
| `PO` | Decided by the project owner, **not** asked of the subject-matter team | various | Section 20 only |

**Two cautions on numbering.**

1. Round 1 and Round 3 both use the letters A, B, C. `R1-A1` (project versus market architecture) and `R3-A1` (the tiering rule) are different questions. The round prefix is always required.
2. `R4-Cnn` is the question number **as sent**. The repository also carries an internal numbering (`R4-Q1`…`R4-Q33`) that does **not** line up — sent question 29, for example, is internal question 26. The mapping table is in `Business_Rules_Confirmation_EN.md`, Appendix 3, "Index — all 36". Always quote the sent number in business conversation.

**Marks used below:** ⚠️ the answer overturned something already built · 🆕 the answer created a requirement that did not exist before · ⏳ still open.

---

## 1. System intent and scope boundaries

**MBc360 is the company's single evidence and governance platform, and it integrates with specialist systems rather than replacing them.** `[R1 — overall system intent]`

**MBc360 must not generate or maintain GMP documents** — manufacturing BOMs, production schedules, batch manufacturing records, GMP work instructions. Manufacturing already runs its own controlled GMP system. MBc360 holds **links** to those controlled documents instead, which avoids duplication while keeping traceability. `[R1 — GMP Documentation, added by the team]`

---

## 2. Project and market architecture

**One project, one development flow, per-market regulatory flow.** A single master project runs **one shared workflow for Gates 1–9**, and **Gates 10–12 are tracked separately per market**. The formulation is developed once; regulatory approval, PIF status, claims approval and launch readiness may differ by country. Each market carries its own PIF status, regulatory status, claims approval, launch approval, regulatory notes and approval dates. `[R1-A1]`

**Per-market applies to sign-off too, not only to status.** Prepared, Reviewed and Approved must be recorded **per market at Gates 10 and 11**, because each market may differ in dossier status, regulatory decision, claims, artwork, formula version and launch date. Gate 12 post-market reviews also operate per market, and Phase 4 carries a per-market status. A single project-level Phase 4 summary may remain, **but only as a roll-up — it must not replace the per-market approvals.** `[R4-C18]` `[R3-E3a ⚠️]`

**One approved market must never make the whole project look ready.** Each active market carries its own Gate 10 readiness, dossier/PIF status, claims approval, regulatory approval, Gate 11 readiness, launch approval, approval dates, **applicable formula version** and **applicable artwork version**. `[R3-E3a ⚠️]`

**Adding and removing a market.** Adding a market creates a new per-market track and may re-trigger earlier gates where that market differs. Removing a market marks it **Withdrawn / Cancelled / Not proceeding, with a reason — it is never deleted.** `[R2-F4]`

**The market list is a single source of truth.** The Countries / Markets parameter is the only place markets are recorded; a separate free-text "initial target market" field must not exist alongside it. The parameter is **not mandatory to open the project shell** but **becomes mandatory before Gate 1 passes**. `[R4-C24 ⚠️]`

**Project-level status is a roll-up of the markets, with five values:** Not launched · Partially launched · Launched in all active markets · Market transition in progress · Withdrawn. `[R4-C14]` An equivalent five-value roll-up was given for completion: Development complete · Approved in some markets · Approved in all active markets · Market transition underway · Fully closed. `[R2-F4]`

---

## 3. Formula versions and formula change

**A new formula version reopens Gates 4–9 on the existing project** — it does not create a new project. The original project stays the master history; Phase 1 information (consumer need, concept, markets) remains; formula redesign, testing, safety and validation are repeated. **A major formulation change automatically creates a new formula version**, with previous versions preserved for audit history. `[R1-A2]`

**Major versus minor is decided against the Formula Change Control trigger catalogue, and must be confirmed by a reviewer.** Major = any change that may affect safety or exposure, efficacy or claim support, the preservative system, ingredient identity, active concentration, regulatory status, allergen profile, pH outside range, product form, a process affecting potency or performance, stability, packaging compatibility, label declaration, or market registration. **The initiator may propose the classification, but an authorised technical or quality reviewer must confirm it — it is not the user's choice alone.** `[R2-F5]`

**A change classified Major also counts as a major reformulation for the Gate 9 scale-up trigger.** `[R4-C12]`

**Two formula versions may be live at once.** The old version keeps its closed per-market Gate 10–12 tracks; the major change opens a **new** per-market track for the new version. The old version stays on market until it is formally superseded, withdrawn or depleted. `[R2-F4]`

**An older version does not close automatically when its replacement is approved.** 🆕 Version states: Active · Transition Approved · Transition in Progress · Superseded · Withdrawn · Cancelled. Approval of the new version moves the old one to **Transition in Progress**, not Superseded. `[R4-C2]`

**It becomes Superseded only after a person confirms ten facts, for the relevant market:** replacement formula version · effective transition date · last manufacturing or release date for the old version · stock disposition or sell-through arrangement · regulatory notification or registration status · applicable artwork and ingredient-list transition · PIF / Product Master File update · Sales and Marketing communication · any required distributor or customer communication · confirmation that no further batches will be released under the old version unless specifically authorised. **The supersession decision must be recorded by a person — never inferred automatically by the system.** `[R4-C2]`

---

## 4. Raw-material and supplier master data

**Cosmetri is the master-data source and MBc360 is read-only against it.** Raw-material master data already exists in Cosmetri and is consumed through its API — no re-entry or duplication inside MBc360. Supplier master data should come from Cosmetri where possible. Evidence documents (SDS, CoA, TDS, allergen statements) **remain stored in Cosmetri**; MBc360 references and links to them. All master-data editing stays inside Cosmetri. MBc360 stores only project-specific evidence and links. `[R1-A3]`

**Data the API does not expose is entered manually in MBc360** — supplier details beyond the name, and document links. A raw material not yet in Cosmetri is raised through the "Create new raw material" request process; once approved and entered into Cosmetri it becomes available to MBc360. `[R1-A3, follow-up decision 2026-07-16]`

**Both BOM entry paths are allowed, with mandatory reconciliation.** Manual Formula BOM entry is accepted **for early bench development only**, before the formula is formally entered into Cosmetri. Manual formulas must be clearly marked **"Draft — not reconciled with Cosmetri"**. Cosmetri becomes the **mandatory controlled system of record before Gate 7 final safety approval** and before regulatory dossier completion. **Gates 10 and 11 must use the controlled Cosmetri formula and version.** Once reconciled, imported identity / INCI / CAS / composition fields are locked against uncontrolled editing, and any difference between MBc360 and Cosmetri is resolved through formula comparison and change control. `[R2-A5]` `[R2-F14]`

**An import must not fail merely because the evidence record is empty.** Creating an identity-only evidence stub on import is accepted and preferred, under five conditions: the stub is clearly labelled **"Incomplete — evidence review required"** · it must **not** default to Approved for Use · missing evidence must appear in Gate Readiness · **Gate 4 must not pass until all applicable raw materials are adequately reviewed or formally accepted through a controlled conditional decision** · Gate 7 final safety approval must use the completed evidence status, and **Gates 10 and 11 must not rely on unresolved identity-only stubs.** `[R3-D4]` Five of the six readings of this rule were confirmed as built. `[R4-C31(a)–(e)]`

**⚠️ At Gates 7, 10 and 11 the hard block applies only to materials actually present in the current formula.** A material formally dispositioned as not used must not block those gates; an incomplete non-formula candidate may produce a **warning** but must not block release where the product does not rely on it. Gate 4 keeps the wider scope. `[R4-C31(f)]`

**🆕 Composition risk is shared company data, not re-entered per project.** A **Raw Material Risk Overlay**, keyed to the Cosmetri raw-material ID, holds the eleven classifications the Cosmetri API does not expose: Fragrance · Essential oil · Botanical extract · Protein · Known allergen · Residual-solvent risk · Heavy-metal risk · Microbiological risk · Restricted impurity · Processing residue · Variable natural-source composition. It is not a second raw-material master. It must be reusable across projects, controlled by authorised Technical, Safety and Regulatory users, retain revision history, record evidence links and review dates, and be migrated into Cosmetri if that system gains the capability. `[R4-C17]`

**⏳ Still open — Cosmetri's ASEAN / Vietnam compliance coverage.** The team cannot confirm from the API documentation that Cosmetri's compliance output covers ASEAN or Vietnam; this stays open until Cosmetri confirms. Meanwhile MBc360 must use Cosmetri compliance data only where the relevant market zone is available, display the source market zone and last-update date, **never assume EU/UK/US compliance equals ASEAN or Vietnam**, run its own market-specific regulatory screen in addition, and let Regulatory attach a separate ASEAN/VN conclusion and evidence. `[R2-F12 ⏳]`

---

## 5. Access control, roles and electronic signature

**Role-based access control is enforced, and contributing is not approving.** Only Regulatory approves regulatory decisions; only Quality approves Quality sections; only Safety reviewers approve safety sections; only authorised approvers sign approvals. **Users may contribute evidence without having approval rights.** Electronic approval history must be retained. `[R1-A4]`

**Identity and department come from the company SSO / Active Directory.** At least **17 roles** exist: Project Owner · Formulation Contributor · Safety Reviewer · Quality Reviewer · Regulatory Reviewer · Packaging/Artwork Contributor · Marketing/Sales Contributor · Supply Chain Contributor · Manufacturing Link Contributor · Study Author · Department Study Reviewer · Independent Study Reviewer · Published-Information Technical Reviewer · Published-Information Regulatory Reviewer · Final Approver · System Administrator · Read-only Viewer. **Contributors cannot approve their own approval-critical work** unless a documented exception exists. **Delegation** is time-limited, manager or administrator approved, records delegator / delegate / dates / scope, and stays in the audit history. **A full 21 CFR Part 11 implementation is not required yet**, but sound audit-trail and e-approval principles apply from the start. `[R2-F6]`

**An electronic approval records:** authenticated identity · date and time · role · decision · optional or mandatory comment · the version approved · an invalidation / supersession trail. `[R2-F6]`

**⚠️ Each gate needs three distinct recorded sign-offs** — Prepared by, Reviewed by, Approved by. An owner name plus an evidence link on the gate row is **not** equivalent. Each sign-off captures **authenticated user · role · date and time · decision · record version · comment where required**, and the set **hard-blocks the gate decision**. The phase-level sign-off block **remains as an additional phase-closure approval and is not replaced.** Where risk is low the same person may prepare several gate records, but **the reviewer or approver must be independent for safety-, regulatory-, claims- or release-critical decisions.** `[R3-D1 ⚠️]`

**The five remaining sign-off questions, answered** `[R4-C29]`:

1. **Record version means a gate-specific evidence snapshot**, not a project-wide save counter — *"a project-wide save counter is not sufficient"*. The signed record covers gate status and proposed decision · gate checks · applicable checklist results · mandatory and triggered evidence-register states · evidence links and document revisions · open actions and conditions · formula version where relevant · market and artwork version where relevant. **If evidence inside the signed snapshot changes afterwards, the signature becomes stale, the system identifies what changed, and re-signing is required.**
2. **A comment is mandatory for** Proceed with Conditions · Hold · Backtrack · Reject/Stop · Approved with Conditions · Not Approved · Further Information Required · N/A where a human rationale is required · Delegated approval · Override or exception. A clean Proceed or Approved may have an optional comment.
3. **Critical gates are 3, 4, 7, 8, 9, 10 and 11** — claims · ingredient and regulatory screening · safety · testing and human studies · stability and release readiness · regulatory, claims and dossier · production and launch release.
4. **Independence** — at **all** gates the reviewer must be a different authenticated person from the preparer. At the seven critical gates, **at least one reviewer or approver** must also represent the relevant independent function: safety decisions reviewed or approved by Safety / Scientific Review · regulatory by Regulatory · quality and release by Quality · claims by Technical and/or Regulatory. The human-study workflow keeps its stricter outside-department rule.
5. **Sequence** — the preparer confirms the record is complete and recommends a decision; the reviewer confirms the evidence and records a recommendation; **the approver records the final gate decision. The approver's decision IS the gate decision** — there is no separate duplicate decision afterwards. All three sign-offs reference the same current snapshot, and the gate passes only when the approver records Proceed or Proceed with Conditions.

**The study approval chain is a dedicated workflow, separate from normal gate approval.** Roles: **Study Author, Department Reviewer, Independent Reviewer** — roles, not named individuals. **The system must prevent the Independent Reviewer from belonging to the same department as the Study Author.** `[R1-C2]` `[R2-F6]`

---

## 6. Gate passage

**A gate passes only when all four conditions hold** `[R1-B1]`:

1. Stage status = **Complete**;
2. Gate decision = **Proceed** or **Proceed with Conditions**;
3. **Required sign-offs completed**;
4. **Mandatory evidence attached**.

Detailed rulings: Complete without a gate decision leaves the gate **Pending**, not passed · **Proceed with Conditions unlocks the next gate** while outstanding actions are tracked · **a Gap prevents a normal Proceed** · **Hold as a status** means work has stopped, **Hold as a decision** means progression is blocked. `[R1-B1]`

**A Gap blocks plain Proceed.** Proceed with Conditions stays available **only** where the gap is not safety-, regulatory- or release-critical, an authorised reviewer accepts the temporary risk, and a controlled Next Action with owner, due date and escalation is created. **Critical gaps must go to Hold, Backtrack or Reject/Stop.** `[R2-F7]`

**🆕 A gap carries its own formal criticality assessment** — not a judgement made in the moment by whoever records the gate decision. New fields: **Criticality** (Low / Medium / High / Critical) · **Impact category** (Safety · Regulatory · Claims · Quality · Efficacy · Release · Commercial · Other) · Assessor · Assessment date · Rationale · Evidence link · Required action · Action owner. Criticality is assessed by a suitably qualified reviewer. `[R4-C3]`

| Gap criticality | Effect |
|---|---|
| **Critical** | Cannot be carried under Proceed with Conditions — must result in Hold, Backtrack or Reject/Stop. `[R4-C3]` |
| **High** | May be carried conditionally only where no mandatory safety, regulatory or release rule is breached, **and** the relevant authorised function accepts the risk, **and** a controlled action with a due date is recorded. `[R4-C3]` |

### 6.1 The three-tier evidence model

**Not all evidence registers hard-block.** Each is classified `[R2-C7]` `[R2-F1]`:

- **Mandatory** — always hard-blocks the gate.
- **Conditional** — hard-blocks **only when its defined trigger applies**.
- **Supporting** — does not automatically block, but unresolved risk or missing context may require a warning, an action, or a Proceed-with-Conditions decision.

Safety-critical and regulatory-critical registers **must** hard-block. The system provides a **Gate Readiness panel** per gate showing mandatory items complete, conditional items triggered, blocking gaps, warnings, missing evidence links, required sign-offs, open Next Actions, open Change Controls, and a readiness result of **Not Ready / Ready with Conditions / Ready for Decision / Passed**. `[R2-C7]`

**How a tier is assigned.** Qualifier wording such as "where applicable", "where relevant", "high-risk or borderline" → **Conditional**; soft business or lifecycle context → **Supporting**; everything else → **Mandatory**. The rule and the tier table were accepted, with two reassignments `[R3-A1]`:

| Gate | Item | Was | Now |
|---|---|---|---|
| 12 | Change-control links | Supporting | **Conditional** — mandatory where a complaint, post-market finding, CAPA, formula change, artwork change, safety signal or improvement action has generated a Change Control record. |
| 12 | Market feedback | Supporting | **Supporting for routine lifecycle review, Conditional once the project has launched and a scheduled post-market review is due.** |

**Gate 6 "market-specific pack requirements" is Conditional**, mandatory where the selected market imposes a requirement affecting language · mandatory warnings · ingredient declaration · responsible-party details · notification or registration numbers · pack size · tamper evidence · barcode or traceability · recycling or environmental markings · primary or secondary packaging information. **Where no requirement applies, N/A with a rationale must be recorded — blank is not the same as not applicable.** `[R3-A2]`

### 6.2 The per-gate evidence list

Applying the three tiers gate by gate; every gate additionally requires Prepared / Reviewed / Approved sign-off. `[R2-F1]`

- **Gate 1 — Opportunity & Request:** product request record · project owner · request source · initial product scope · initial target market and user.
- **Gate 2 — Target User & Brief:** approved development brief · target user and life stage · intended use and body area · selected markets · vulnerable-user flags · project requirements and exclusions.
- **Gate 3 — Product Concept & Claims:** product concept · proposed claims list · preliminary claim classification · evidence requirements per claim · competitor or benchmark review where applicable · regulatory review of high-risk or borderline claims. *A claim may stay under development, but unsupported wording must not be marked approved.*
- **Gate 4 — Ingredient & RM Screening:** ingredient set · ingredient identity with Cosmetri reference where available · supplier and RM evidence status · prohibited and restricted screen · pregnancy/breastfeeding caution screen when triggered · allergen, impurity and contaminant review where relevant · **no unresolved "Prohibited — remove"**. *An unresolved possible match allows Proceed with Conditions only where a qualified reviewer assessed it non-critical with a controlled action.*
- **Gate 5 — Formula Design:** current formula version · composition or controlled Cosmetri reference · target pH and acceptable range · process requirements affecting function · preservative strategy where applicable · compatibility assessment · initial efficacy rationale and mechanism mapping · costing or commercial feasibility status.
- **Gate 6 — Packaging & Components:** proposed pack specification · packaging compatibility requirements · label and artwork requirements · component supplier status · market-specific pack requirements · link to controlled packaging evidence.
- **Gate 7 — Safety Review (safety-critical hard block):** final formulation safety review completed · prohibited screen closed · restricted and caution assessment closed · exposure and intended-use assessment · allergen and impurity review · maternal and infant-contact assessment when triggered · safety conclusion and limitations · required safety-reviewer approval · no unresolved critical safety finding. **Gate 7 must not pass while** the final safety release is incomplete, a prohibited ingredient remains, a critical caution-limit issue is unresolved, or a mandatory maternal/infant-contact assessment is incomplete.
- **Gate 8 — Testing & Validation:** testing plan · methods and method references · acceptance criteria · required safety / efficacy / preservative / QC / performance tests identified · **human-study approval completed before recruitment** where applicable · reports or controlled actions for tests in progress. *Release-essential testing must complete before the relevant later release gate even if Gate 8 proceeds conditionally.*
- **Gate 9 — Stability & Release Readiness:** stability status · packaging-compatibility status · preservative-efficacy status where applicable · physical, chemical and microbiological acceptance criteria · scale-up or pilot status where applicable · deviations and open risks reviewed · release-readiness conclusion. *Critical release tests must close; longer-term stability may stay ongoing with an approved launch protocol and sufficient supporting data.*
- **Gate 10 — Regulatory, Claims & PIF (per market, hard block):** applicable regulatory checklist · PIF / CPSR / Product Master File or equivalent dossier status · SKU-level claims register · **evidence attached for every approved claim** · ingredient and product safety evidence · product-performance evidence where relevant · label and artwork review · published-information status · regulatory approval. *No approved public claim may remain without evidence and a PIF / Product Master File link.*
- **Gate 11 — Production & Launch (per market, hard block):** Gate 10 complete for the market · GMP document links · approved current formula version · approved artwork version · production readiness · quality release pathway · change controls closed or formally accepted · published product information approved · launch approval.
- **Gate 12 — Post-Market & Improvement:** market feedback · complaint and adverse-event status · PV/PMS review where applicable · product-performance feedback · CAPA and improvement actions · change-control links · review-closure sign-off.

### 6.3 Conditional triggers

**Every Conditional item has a defined trigger.** `[R3-A3]`

| Gate | Conditional item | Trigger that makes it mandatory |
|---|---|---|
| 3 | Competitor or benchmark review | New product · claim extension · repositioning · customer or distributor-led request · a named benchmark or reference product. **Not** mandatory for a purely administrative change. |
| 3 | Regulatory review of high-risk or borderline claims | Any claim classified Borderline, Therapeutic-adjacent, High risk, market-restricted, pregnancy/breastfeeding-related, infant-related, disease-related, medical-professional-facing, or outside the approved claims library. |
| 4 | Pregnancy/breastfeeding caution screen | Pregnancy, Breastfeeding or Postpartum selected. |
| 4 | Allergen, impurity and contaminant review | The material contains fragrance, essential oils, botanical extracts, proteins, known allergens, residual solvents, heavy-metal risk, microbiological risk, restricted impurities, processing residues, or variable natural-source composition. |
| 5 | Preservative strategy | Water-containing, water-available, multi-use or otherwise microbiologically susceptible products. N/A permitted for genuinely anhydrous, self-preserving, sterile or single-use products **with a documented rationale**. |
| 7 | Maternal and infant-contact assessment | Pregnancy, Breastfeeding or Postpartum selected. |
| 8 | Human-study approval workflow | Before **any** internal or external study involving human participants, volunteers, consumer testing, patch testing, in-use trials, image collection, questionnaires, or other identifiable participant data. |
| 9 | Preservative efficacy status | Microbiologically susceptible products requiring a preservation system. |
| 9 | Scale-up or pilot status | New formulas · major reformulations · new manufacturing processes · site transfers · meaningful equipment or process changes · products with identified scale-up risk. |
| 10 | Product-performance evidence | Any external claim depending on product-level efficacy, performance, sensory, clinical, instrumental, in vitro, in vivo, consumer-use or comparative evidence. |
| 12 | PV/PMS review | Required by product category, market, company policy, safety signal, vulnerable-user population, complaint trend or scheduled surveillance plan. |
| 12 | Change-control links | A Change Control record has been opened, **or should be opened** because of the post-market finding. |
| 12 | Market feedback | The scheduled post-launch review milestone is reached, or a complaint, customer issue, distributor request, claim challenge or recurring performance concern is recorded. |
| 12 | Product-performance feedback | Product efficacy, consumer experience, product failure or claim performance is part of the post-market review scope. |

**Costing and commercial feasibility at Gate 5 stays Supporting** — but the accountable project owner may still place the project on **Hold** where commercial feasibility is essential to continuation. `[R3-A3]` This is extended by the commercial-dependency rule in section 16. `[R4-C36(b)]`

### 6.4 "Not yet assessed" — the cross-cutting rule

**⚠️ A missing assessment must never be treated as meaning the condition does not apply.** Three states must be distinguished: **assessed and applies · assessed and does not apply · not yet assessed**. `[R4-C7]`

- For a **Mandatory** or **Conditional** item, **"not yet assessed" must block readiness.** A condition may be treated as not applicable only *after* the trigger information has been completed and found not to apply.
- For a **Supporting** item, missing information may generate a warning rather than a hard block.

Two consequences stated explicitly: a **Pending** claim classification must trigger Regulatory review until classified; and a formula with **no microbiological-susceptibility assessment must not automatically bypass** preservative-strategy or preservative-efficacy requirements. `[R4-C7]`

### 6.5 N/A and its rationale

**N/A counts as complete only when justified** — a justification must be recorded. `[R1-B3]`

**🆕 Where the system can determine from controlled data that a condition does not apply, it may auto-generate the N/A reason** — examples given: no maternal user selected · formula confirmed anhydrous · no special market pack requirement identified. **For safety-, regulatory-, claims- or release-critical items the system-generated rationale must still be acknowledged by the responsible reviewer before gate closure**; for Supporting items the generated explanation alone is sufficient. *"Users should not be required to retype a reason already deterministically generated by the system."* `[R4-C16]`

---

## 7. Phase completion and pre-work

**A phase is complete only when all five conditions hold** `[R1-B3]`:

| Condition | Mandatory |
|---|---|
| All 3 gates in the phase have passed | ✅ |
| All Key Gate Checks = Done/Y, or N/A | ✅ |
| All 8 Angles = Covered, or justified N/A | ✅ |
| Sign-off from all three roles (Prepared / Reviewed / Approved) | ✅ |
| All Next Actions closed | ✅ unless the decision is Proceed with Conditions |

**Sign-off becomes available only after the required sections are complete** — an enforced order, not parallel work. `[R1-B3]`

**Pre-work on a locked phase is allowed.** While a phase is locked, gate decisions, sign-off and formal stage closure stay disabled; users may still add draft evidence, requirements, notes, risks and proposed actions. Early entries must be visibly marked **"Pre-work / entered before gate opened"** and retain the entry date and user. **Once the phase opens, the responsible owner must review and formally accept or update the pre-work before it can contribute to completion.** `[R2-B5]` `[R2-F13]`

---

## 8. Next Actions

**Next Actions are controlled records, not free text.** Each gate may carry **multiple** actions; each carries Description · Owner · Due date · Status · Priority · Date completed. **Open actions may exist only when the gate decision is Proceed with Conditions**; otherwise all actions should be completed before gate closure. `[R1-B2]`

**Who closes an action.** The **Owner** is responsible for completing it, but the **raiser, the relevant gate owner, or an authorised reviewer verifies and closes** it — **the owner cannot unilaterally verify closure** where independent confirmation is required. `[R2-F8]`

**Status workflow:** Open → In Progress → Awaiting Information → Ready for Verification → Closed → Cancelled. **Priority:** Low / Medium / High / **Critical — a Critical action blocks normal gate closure.** `[R2-F8]`

---

## 9. Backtrack and the audit trail

**Backtracking must preserve complete audit history, and nothing is ever deleted.** When a gate is reopened, the stage status resets, previous approvals become invalid and re-approval is required — but previous approvals **remain in history**, previous evidence **remains linked**, and a **Backtrack Event Log** records who initiated it, the date, the reason, the gates affected, the previous approvals and the previous decisions. `[R1-B4]`

**Backtracking is allowed across any phase if justified.** This follows MBc360's principle of **no silent corrections**. `[R1-B4]`

---

## 10. Change Control

**An open Change Control record soft-locks the affected gate** until the change has been assessed and closed, which maintains traceability. `[R1-C4]`

**Which statuses count as open:** Draft · Submitted · Under Review · Approved–Implementation Pending · In Implementation · Verification Pending · On Hold. Closed = Completed · Rejected · Cancelled · Superseded, **once the final disposition is recorded**. `[R2-F9]`

**What the soft lock does:** a prominent warning on the affected project, formula version, market and gate, identifying the open change and its owner · **the user must acknowledge the open change before recording a gate decision** · **plain Proceed is blocked** where the change may affect the gate conclusion, with Proceed with Conditions only if an authorised approver accepts it. Changes involving safety, formula identity, regulatory approval, artwork, claims or launch release **may become a hard block** depending on assessed impact. `[R2-F9]`

**Gate 11 needs more than the soft lock** — it must evaluate each open change's impact classification and closure status `[R3-E3b]`:

| Open change | Effect at Gate 11 |
|---|---|
| Critical or launch-impacting | **Hard-blocks launch.** |
| Formula, artwork, claims, safety, regulatory, packaging or release-impacting | **Hard-blocks unless implementation and verification are complete.** |
| Low-risk administrative | May permit Proceed with Conditions after authorised acknowledgement. |
| Completed, rejected, cancelled or superseded | Does not block, provided the final disposition is recorded. |

**⚠️ An unclassified open Change Control blocks Gate 11**, and the risk scale gains **Critical** as a level above High. **"Final disposition recorded" means eight things**, not a closing date or a short note: Final status · Outcome · What was implemented, or why no implementation was required · Verification evidence · Impacted formula / artwork / claim / market versions · Responsible verifier · Closure date · Remaining action or transition requirement, if any. The acknowledgement may be reused **only if role-restricted** and recording authenticated user · role · date and time · rationale · Change Control reference · conditions accepted — and **only a person authorised to approve the relevant Gate 11 impact may acknowledge it.** `[R4-C34]`

**🆕 "Change Control required?" becomes an explicit Yes / No / Pending assessment**, with reviewer · review date · rationale · linked Change Control ID where Yes · evidence link. If **Yes**, a valid Change Control record must be linked; if **No**, the rationale and reviewer must be recorded; **Pending assessment blocks closure of the post-market finding.** *"This is preferable to relying only on a reminder."* `[R4-C8]`

**⚠️ None of the six project types is automatically administrative.** A packaging change, lifecycle improvement or reformulation can be technically and commercially significant. 🆕 Add the classification **"Administrative-only change: Yes / No"**, confirmed by an authorised reviewer. Administrative-only examples: internal reference-code correction · file-link update · spelling correction that does not alter meaning · formatting correction · contact-detail update · document metadata update · supplier-document replacement where the material itself has not changed. **A project is exempt from competitor/benchmark review only when it is confirmed administrative-only *and* no claim, formula, market positioning, product performance, packaging function or customer-facing meaning changes.** `[R4-C11]`

---

## 11. Ingredient screening and safety

**Screening is automatic.** Whenever a Formula BOM is entered, MBc360 automatically compares ingredients against Prohibited Ingredients · Pregnancy/Breastfeeding Caution ingredients · regulatory restriction lists · internal prohibited lists, and immediately flags potential issues for review. `[R1-C3]`

**Matching priority:** exact Cosmetri raw-material identifier → exact INCI → CAS → synonym or group mapping → manual scientific review where automatic matching is uncertain. **Automatic matches are screening flags — they do not replace qualified review.** `[R2-F3]`

**The watch-lists are controlled reference datasets maintained by Regulatory and Safety.** Each entry carries ingredient or group name · INCI names · CAS numbers · synonyms · relevant markets · restriction or caution · maximum concentration or condition of use · source · effective date · last-review date · owner · version. Regulatory reviews market restriction lists **at least annually** and on any relevant regulatory change; pregnancy and breastfeeding limits are reviewed on new evidence. `[R2-F3]`

**A separate narrow Mandatory item is required at Gate 4** — *"Prohibited, restricted and caution ingredient screen completed"* — drawing directly from the automated watch-list results and the associated qualified review. The existing broader check *"Restrictions, exclusions and supplier risks screened"* **stays** alongside it. `[R3-C2]`

### 11.1 Gate 4 — screen and disposition

**⚠️ Gate 4 screens *and dispositions* every relevant candidate**, but does not require the full final close-out reserved for Gate 7. Every row is classified as one of: **No issue identified · Needs Safety Review · Needs Regulatory Review · Prohibited — remove · Considered — not selected · Further information required**. **Gate 4 must not pass with unassessed rows.** Gate 4 may Proceed with Conditions where the issue is assessed non-critical **and** a qualified reviewer has documented the preliminary conclusion **and** a controlled action is linked **and** no prohibited ingredient or mandatory restriction is breached. `[R4-C6 ⚠️]`

**Every candidate row must be dispositioned before Gate 4 passes**, "Considered — not used in this formula" is retained and the record is **not deleted**, and the conditional route is Proceed with Conditions plus a linked controlled action — with no separate duplicate approval field, provided the row carries the qualified reviewer's conclusion, the gate approver is authorised, and the condition and action are referenced in the gate decision. A conditionally accepted material **included in the final formula** must be fully closed before Gate 7; a material **not used** may be closed as "Considered — not used". **Gate 4 must not Proceed where every candidate has been rejected** — at least one suitable or conditionally suitable route must remain, otherwise the project should Hold or Backtrack to ingredient sourcing. `[R4-C31(a)–(e)]`

### 11.2 The watch-list reviewer trail

**Each flagged result gains:** Reviewer assessment · Reviewer · Review date · Rationale · Evidence link · **Linked Next Action ID** · Resolution status. **A genuine controlled Next Action is required — a note alone is not sufficient.** `[R3-D3]`

| Assessment | Effect on Gate 4 |
|---|---|
| **Critical** | Hard-blocks **both** Proceed and Proceed with Conditions. `[R3-D3]` |
| **Further information required** | Blocks Proceed; Proceed with Conditions only with authorised acceptance **and** a linked controlled action. `[R3-D3]` |
| **Non-critical** | Blocks plain Proceed until assessment, rationale and action are recorded; may then permit Proceed with Conditions. `[R3-D3]` |
| **Not a true match** | May be closed once reviewer rationale and evidence are recorded. `[R3-D3]` |

**⚠️ "Flagged" covers three statuses**, not two: *REVIEW — possible formula match* · *Needs Safety Review* · *Needs Regulatory Review*. **Prohibited — remove** remains a separate direct hard block. **⚠️ Resolution status** = Open · Under Review · Action Pending · Verification Pending · Closed, with a **separate** assessment field recording Critical / Non-critical / Not a true match / Further information required. Recording Proceed with Conditions **may serve as authorised acceptance** where the reviewer assessment is complete, rationale and evidence are present, a valid controlled action is linked, and **the gate approver holds the required Safety or Regulatory authority** — no separate duplicate acknowledgement is needed. An **unassessed** flagged row **blocks both Proceed and Proceed with Conditions**. 🆕 The Pregnancy/Breastfeeding Caution list uses **the same reviewer-trail fields**. The linked action may belong to Gate 4 **or a later gate** where operationally appropriate — it must link back to the originating finding, have an owner and due date, **remain visible at the originating gate**, and be due before the gate at which final closure is required. **A critical finding cannot be deferred to a later gate.** `[R4-C32]`

### 11.3 Gate 7 — three screening layers

**⚠️ Gate 7 requires a general restricted-and-caution ingredient assessment for every product.** The pregnancy and breastfeeding caution assessment is an *additional conditional layer*, not the whole assessment. `[R4-C5 ⚠️]`

| Screen | Applies to |
|---|---|
| General prohibited / restricted / caution | **All products** |
| Maternal caution | Maternal products |
| Infant / Baby Safety | Infant 0+ products |

Where both intended-use contexts are selected, both pathways apply. **Gate 7 must formally close every restricted or caution issue relevant to the final formula.** `[R4-C5]` `[R4-C6]`

**Every ingredient in the final formula must have a safety disposition**, but low-risk excipients do not each need a lengthy monograph. Permitted coverage routes: **individual assessment · reference to an existing approved ingredient assessment · group or class assessment where scientifically justified · reference to an accepted regulatory or safety conclusion.** **Every formula line must show it has been covered and linked to the relevant assessment**, and relevant mixture components, impurities and residuals must also be assessed where required. `[R4-C23(b)]`

### 11.4 Critical safety findings

**⚠️ A distinct safety-finding control is required**, rather than relying on the Final Safety Sign-off alone: **Critical safety finding identified (Yes/No) · Finding description · Affected ingredient, formula or use context · Severity · Required action · Owner · Status · Safety reviewer conclusion · Evidence link.** **Gate 7 cannot pass while any critical safety finding is open.** `[R3-E1 ⚠️]`

**Severity = Low · Medium · High · Critical.** **Status = Open · Under Review · Action Pending · Verification Pending · Closed · Superseded.** A **controlled Next Action is required** for Critical findings, High findings, and Medium findings requiring corrective activity — free text may describe the action but must not replace the controlled record. **An unjudged finding blocks Gate 7.** Closing a High or Critical finding requires safety reviewer conclusion · evidence link · linked action completed · verification · verifier · closure date. `[R4-C33]`

| Finding | Effect on Gate 7 |
|---|---|
| Open **Critical** or **High** | Hard-blocks. |
| **Medium** | May permit Proceed with Conditions where formally accepted and controlled. |
| **Low** | May generate a warning or an action per the reviewer's conclusion. |

*A finding assessed as non-critical must still be appropriately dispositioned — it must not disappear merely because it is not Critical.* `[R4-C33]`

### 11.5 The shared severity scale

**The severity scale is four levels — Low · Medium · High · Critical — and Critical is a distinct level *above* High.** This one scale serves the gap criticality assessment, the critical safety findings and the Gate 11 change-control risk level. `[R4-C3]` `[R4-C33(a)]` `[R4-C34(a)]`

**The lifecycle vocabulary is likewise shared:** Open · Under Review · Action Pending · Verification Pending · Closed, plus Superseded for safety findings. `[R4-C32(b)]` `[R4-C33]`

---

## 12. Vulnerable users — maternal and infant pathways

**Skincare for Two is mandatory and hard, not a reminder.** It activates automatically whenever the intended user includes **Pregnancy, Breastfeeding or Postpartum**. Once activated, **maternal safety and infant-contact assessment both become mandatory, and Gate 7 cannot pass until both are complete.** `[R1-C1]`

**"Infant 0+" alone does NOT activate Skincare for Two.** It activates a **dedicated Infant & Baby Safety pathway**. A product intended for **both** maternal and infant use activates **both**. `[R2-F2]`

**⚠️ The Gate 7 pregnancy/breastfeeding assessment is conditional, not unconditional.** It is mandatory when Pregnancy, Breastfeeding or Postpartum is selected; infant-only products trigger the infant pathway instead; general products **record N/A with a rationale** where neither pathway applies. `[R3-E1 ⚠️]`

**An explicit vulnerable-user flag is required**, distinct from "a target user was selected". Where any vulnerable group is selected, record: **explicit vulnerable-user flag · applicable safety pathway · responsible reviewer · notes on additional assessments required.** Vulnerable triggers: Pregnancy · Breastfeeding · Postpartum · Infant 0+ · Young child · Sensitive or compromised skin · Oncology or medically vulnerable support context · Renal or other health-related support context · any population Safety or Regulatory identifies as requiring enhanced review. **A general-adult project must still record "No vulnerable-user group identified"** rather than satisfying the requirement by default. `[R3-B5]`

**⚠️ Dry skin alone is not automatically a vulnerable-user group; eczema-prone or compromised skin is.** Where possible the combined option is split into *Dry skin* and *Eczema-prone or compromised skin*; if it cannot be split, the combined option is treated as triggering the sensitive/compromised-skin review. `[R4-C25(b) ⚠️]`

**Family use, intimate use and swimmers.** Family use does not automatically mean a vulnerable population, **but must prompt confirmation of the actual age groups included; if infants or young children are included, the relevant pathway activates.** Intimate-area use triggers a specialised use-site and safety assessment but does not automatically mean the user is vulnerable. Swimmers do not automatically constitute a vulnerable population. `[R4-C25(c)]`

**Checking the vulnerable-user mapping works both ways:** exact contradictions are refused, while for renamed or broader groups a **warning plus rationale is preferable to outright refusal**, since the Safety or Regulatory reviewer may identify the context independently. `[R4-C25(d)]`

### 12.1 The Infant & Baby Safety pathway

**⚠️ The Gate 7 infant compartment is correct, but it is the *final component* of a pathway spanning multiple gates — not the whole pathway.** Existing controls INF-01 to INF-08 remain appropriate. `[R4-C1 ⚠️]`

| Gate | Required |
|---|---|
| **2** — intended infant-use context | Intended minimum age in months · direct infant use, incidental contact or both · leave-on or rinse-off · body area · frequency and amount of use · nappy-area, face, eye-area or scalp use · foreseeable hand-to-mouth exposure · foreseeable accidental ingestion · whether the product may be used on damaged or compromised skin · caregiver use versus direct application to the infant |
| **4** — ingredient and raw-material suitability | Infant suitability assessment per proposed ingredient · restricted and prohibited review · fragrance, essential-oil and allergen review · impurity, contaminant and residual-solvent review · heavy-metal and microbiological risk review where relevant · oral-safety consideration where hand-to-mouth exposure is foreseeable · eye-exposure assessment where eye contact is reasonably foreseeable · supplier evidence links |
| **5** — formula-level assessment | Final ingredient concentrations · formula pH and compatibility with infant skin · preservative strategy and microbiological protection · exposure assessment and infant-adjusted margin-of-safety rationale · potential degradation products or ingredient interactions · process controls needed to preserve ingredient quality and safety · intended dose or amount per use |
| **6** — packaging and instructions | Appropriate dose delivery · control of excessive dispensing where relevant · accidental access or ingestion risk · suitable closure and packaging · age and use instructions · required warnings · directions for safe caregiver use |
| **7** — final assessment | INF-01 to INF-08 complete, including or linking to infant-contact use context · infant-adjusted exposure and margin of safety · hand-to-mouth or incidental oral exposure · infant sensitiser and allergen screening · skin-barrier and pH compatibility · eye-safety assessment where applicable · final intended-use and age-suitability conclusion · approved claim, label and PIF wording · confirmation that microbiological and preservative risks are addressed · confirmation that no critical infant-safety issue remains open |
| **8–9** — testing and validation | **Triggered by use context and risk**: skin tolerance · eye safety · preservative efficacy · microbiological quality · stability · packaging compatibility · in-use or consumer testing where appropriate |
| **10** — PIF and claims | Infant-use safety conclusion · relevant ingredient and formula assessments · applicable test reports · approved age and use statements · evidence supporting infant-related claims · label warnings and directions |

**Hard block: Gate 7 must hard-block if the Infant 0+ pathway is triggered and this assessment is incomplete.** `[R4-C1]`

---

## 13. Claims and published information

### 13.1 The claim as a declared object

**Claim classification is per claim, not per project**, because different claims in one project can carry different risk. Two controlled dropdowns per claim `[R3-B7]`:

- **Claim category** = Cosmetic · Product performance · Sensory · Ingredient-level · Safety/tolerance · Environmental or sustainability · Professional or technical information · Borderline / therapeutic-adjacent · Therapeutic — not permitted within the cosmetic claim pathway · Other — Regulatory review required.
- **Claim risk** = Low · Medium · High · Prohibited / not acceptable · Pending classification.

Also captured per claim: exact proposed wording · applicable SKU · applicable market · intended channel · evidence required · evidence status · Regulatory review required Y/N · approved wording · limitations or mandatory qualifiers. `[R3-B7]`

**The existing Claim category column IS that classification — do not create a duplicate.** The **Claim → Evidence Traceability record is the source of truth**; the SKU Claims / PIF register references a Claim ID and inherits Claim category, Claim risk, Master wording, Current revision and Evidence status **read-only**. The **Claim ID is created at Gate 3** when the claim is first proposed and must not wait until evidence exists. The picker offers **all** declared claims including Pending and developing ones, with release controls determining external usability. `[R4-C19(a)(c)(e)(f)]`

**⚠️ Seven registers reference a Claim ID rather than retyping wording:** mechanism map · prospective evidence plan · efficacy study plan · clinical evidence register · **Published Information Approval** · **artwork/label claim list** · **PIF claims register**. `[R4-C19(g) ⚠️]`

**Intended channel and "Regulatory review required" belong on the SKU / market / channel claim-use record**, not on the master claim — they describe how and where the claim is used. The master claim may require Regulatory review always; a market or channel may impose an additional requirement. `[R4-C19(b)]`

**Before Gate 3 passes, every claim in scope must have** Claim ID · proposed master wording · claim category · claim risk · preliminary evidence requirement · regulatory review status where triggered. There is no required number of claims — **if no claims are proposed, that must be explicitly recorded.** `[R4-C19(d)]`

**Claim information is owned gate by gate** `[R4-C19(h)]`: *Gate 3* — Claim ID, proposed master wording, category, risk, **preliminary mechanism or benefit rationale**, preliminary evidence requirement. *Gate 5* — confirmed formula-specific mechanism, ingredient and formula contribution, mechanism-to-claim linkage. *Gate 8* — evidence plan, study method, evidence grade, supporting report or test status. *Gate 10* — Supported status, final approved wording, market approval, PIF / Product Master File attachment, claim-release approval. **The mechanism begins as a preliminary hypothesis at Gate 3 and is technically confirmed at Gate 5.**

### 13.2 Revision control

**The traceability ledger does not freeze at Gate 8** — it stays available through Gates 10 and 11. What is added is **revision control**: draft claims remain editable; **once a claim revision receives Regulatory or Gate 10 approval, that revision becomes read-only**; a new wording or evidence position creates a new revision or a new Claim ID. Adding a genuinely new claim after Gate 3 requires controlled change assessment and appropriate backtracking; adding a market-specific *use* of an existing approved claim does not necessarily reopen Gate 3 but does require Gate 10 market review. `[R4-C26]`

**New revision versus new Claim ID.** A **new revision of the same Claim ID** where the underlying proposition is the same, scope and intended benefit are unchanged, evidence burden is unchanged, and the wording is being refined. A **new Claim ID** where meaning changes · benefit or outcome changes · scope expands · target population changes · evidence burden changes materially · the claim moves into a different risk or regulatory category. **The Technical or Regulatory reviewer decides which route applies.** `[R4-C30(b)]`

### 13.3 Regulatory review of claims

**Regulatory review is mandatory where** category = Borderline / therapeutic-adjacent · category = Therapeutic — not permitted · risk = High · the wording is not in the approved Claims Library · the claim varies from previously approved wording · the market imposes a specific restriction · the claim relates to pregnancy, breastfeeding, infant use, disease, treatment, prevention, healing or medical endorsement. `[R3-C1]`

**The five review fields are required for a triggered claim:** Regulatory review outcome · reviewer · review date · review rationale · review evidence link. **The four outcomes are** Approved · Approved with Conditions · Not Approved · Further Information Required. **A later change to the reviewed wording must invalidate the previous review and trigger reassessment.** `[R4-C27]`

**🆕 Add structured claim-subject flags** rather than inferring from free text: Pregnancy · Breastfeeding · Postpartum · Infant or child · Disease or condition · Treatment or prevention · Healing or repair · Medical or HCP endorsement · Safety or tolerance · Comparative or superiority · Other sensitive topic. Per-market restrictions come from the configurable Regulatory market profiles. `[R4-C27]`

### 13.4 Evidence basis

**⚠️ Cosmetic claims do trigger product-level evidence** where the claim asserts an outcome or performance of the finished product — examples given: Moisturises · Hydrates · Softens · Improves appearance · Supports barrier function · Helps detangle · Reduces residue · Improves skin feel. A purely ingredient-level statement may rely on ingredient evidence **only where it is clearly presented as an ingredient statement and does not imply the finished product delivers the same measured result.** 🆕 Add an **Evidence basis required** field: Finished-product evidence · Ingredient-level evidence · Formula/mechanism rationale · Consumer-perception evidence · Regulatory or compositional evidence · No performance claim · Combination of evidence types. `[R4-C36(a) ⚠️]`

### 13.5 The Claims Library

**🆕 A company-level Claims Library.** Entries carry applicability tags for Brand · Product family · SKU · Market · Language · Channel · Consumer or professional use. **Projects read from the library but do not directly edit it.** A project claim links to a library entry where it reuses approved wording; a genuinely new claim may be proposed without a link but **must be identified as "New claim — not yet in Claims Library"**, which triggers Regulatory and Technical review. `[R4-C28]`

**Technical and Regulatory must both approve** an entry before it becomes Approved Library Wording; **Marketing/Brand may propose wording but not give final technical or regulatory approval.** Every entry retains Revision · Approval history · Evidence requirement · Market and channel applicability · Effective date · Review date · Withdrawal status. **Project approval must not auto-promote wording** — a separate controlled action, **"Propose for Claims Library"**, is required, after which Technical and Regulatory review it for broader reuse. `[R4-C28]`

**When an entry changes or is withdrawn** the system should identify all linked claims, SKUs, markets and published materials · trigger an impact assessment · create Change Control where required · flag affected material for re-review · record the effective date and transition plan. **Changing or withdrawing must not automatically remove a product from the market unless the change is critical or required by Regulatory.** `[R4-C28]`

### 13.6 Published information

**Any information intended for public release must pass a mandatory Published Information Approval workflow before release** — websites, brochures, technical documents, distributor materials, presentations, HCP materials, **AI-generated content**, social media, label and artwork text, external technical summaries, and product claims. The workflow covers guidance on acceptable terminology and claims · required evidence types per claim · verification that evidence has been linked · technical review · regulatory review where applicable · final approval before publication. **No public information may be released until this workflow is complete.** `[R1-C6]`

**Twelve workflow states:** Draft · Evidence Gathering · Technical Review · Regulatory Review Required · Regulatory Review Complete · Revision Required · Final Approval Pending · Approved for Release · Released · Expired · Withdrawn · Superseded. **Roles:** Content Owner / Author · Technical Reviewer · Regulatory Reviewer (whenever content includes claims, safety, compliance, directions, warnings, market-specific or HCP content) · Final Authorised Approver. Marketing-only aesthetic content may skip Regulatory, **but any product statement must use approved wording**. **Releasing without approval generates a deviation or violation record.** `[R2-F11]`

**Four rules on linking a claim to published content** `[R3-D2 ⚠️]`:

1. **⚠️ Claim ID linkage is required**, not optional — every external product-benefit, safety, efficacy, performance or suitability statement must link to a Claim ID. It stays optional **only** for genuinely non-product corporate information containing no product claim or technical statement.
2. **⚠️ The picker must offer Developing and Pending claims too**, so the intended claim is documented early. What a Pending claim must **not** allow is Approved for Release · Released · final artwork approval · external publication.
3. **⚠️ No absolute character-for-character lock.** The system holds **master approved wording** and **proposed channel wording** side by side, plus a comparison / review status and reviewer approval. Minor adaptation is allowed where meaning, scope, qualifiers and evidence burden are unchanged; any material change creates a new or revised claim record. Automated similarity checking may be used **as a warning**, but final equivalence is confirmed by an authorised reviewer.
4. **The release block is confirmed and widened:** a linked claim must be Supported **and approved for the relevant SKU, formula version, market and channel** before content can reach Approved for Release or Released.

**The three comparison values** are Identical to master wording · Minor adaptation (meaning, scope, qualifiers and evidence burden unchanged) · Material change (new or revised claim required). Whitespace-only changes may be ignored; other changes are **reviewed by a person, not auto-judged equivalent**. These requirements apply **at release, not at first entry.** `[R4-C30(a)]`

**🆕 Final artwork approval** is represented in the **Packaging / Artwork Approval record**, which **must link every Claim ID on the artwork** and **hard-block** where any linked claim is Pending · Unsupported · Not approved for the market · Superseded · Not approved for the intended wording or channel. `[R4-C30(c)]`

**🆕 External publication is a separate event from Approval for Release.** "Approved for Release" means authorised for use; a **Publication / Deployment record** then captures actual publication or release date · channel · market · URL, file or artwork reference · published version · person responsible · withdrawal or supersession date. For printed packaging the equivalent event may be **Release to Print**. `[R4-C30(d)]`

**🆕 The "no product claim" exemption needs two people.** The content owner may propose "No product claim or technical statement", but **the exemption must be confirmed by a Technical or Regulatory reviewer before release.** `[R4-C30(e)]`

---

## 14. Regulatory dossier, PIF and launch

**PIF completion is a hard block, managed per market.** It hard-blocks launch approval · external claims · distributor information · healthcare-professional information. A product may launch in one country while remaining blocked in another. `[R1-C5]`

**Each market uses a configurable Market Dossier Profile**, rather than assuming the ASEAN PIF checklist everywhere — ASEAN/VN (ASEAN PIF + local notification) · EU/EEA (PIF / CPSR / CPNP / Responsible Person) · UK (UK PIF / CPSR / SCPN / RP) · Australia (product and ingredient compliance, AICIS where applicable, labelling and claim review, company Product Master File) · US (MoCRA and applicable FDA records, safety substantiation, claim and labelling) · other markets configurable. **Regulatory maintains each market's profile without a software rebuild.** `[R2-F10]`

**Enforce the ASEAN checklist only where an ASEAN market is selected.** For non-ASEAN markets, require a **Regulatory Checklist Status** record capturing applicable market · required dossier type · owner · checklist or evidence link · status · Regulatory approval. **The absence of a built-in country template must not mean the item is unenforced** — Regulatory may use an approved linked external checklist until the profile is configured. `[R3-E2]`

**⚠️ Two separate value lists are required**, not reused ones `[R4-C35 ⚠️]`:

- **Checklist work status:** Not Started · In Progress · Awaiting Information · Complete · On Hold · Blocked · N/A — rationale required.
- **Regulatory approval:** Pending · Approved · Approved with Conditions · Not Approved · Withdrawn · N/A — rationale required.

A market entered as **"Other — specify" must also record the actual country or jurisdiction**; until the market is named and the dossier type identified, the record is incomplete and **must block Gate 10**. All six fields must be present, and where N/A is used the rationale **and an authorised reviewer** must also be recorded. `[R4-C35]`

**🆕 Regulatory maintains a configurable market profile** indicating whether each market requires particular adverse-event reporting, PMS records or review intervals. **Do not use a permanently hard-coded country list.** The same profile supplies the per-market claim restriction and the required dossier type. `[R4-C4]`

---

## 15. Post-market surveillance

**🆕 A baseline post-market surveillance review is required for every marketed product.** An **enhanced** review is mandatory where any of these applies: infant or young-child product · pregnancy, breastfeeding or postpartum product · intimate-use product · eye-area product or foreseeable eye exposure · sensitive, eczema-prone or compromised skin · medically vulnerable population · high-risk or therapeutic-adjacent claim · new or unusual active ingredient · safety signal · adverse event · significant complaint trend · recurring quality or performance issue · market-specific vigilance requirement · requirement in an approved surveillance plan. `[R4-C4]`

**🆕 The review schedule runs from the actual commercial launch date** for the relevant market: **one month** — early review for infant, maternal, intimate-use, eye-area or otherwise enhanced-surveillance products · **three months** — first standard post-launch review for all products · **twelve months** — full post-market review · **annually thereafter** while the product remains marketed. A review must occur earlier if a significant adverse event, complaint trend, regulatory request or quality signal arises. **The schedule is configurable where a particular product or market requires a different interval.** `[R4-C13]` `[R4-C4]`

**A product has launched in a market when the actual commercial launch date for that market is recorded** — which is a different fact from launch approval. **The launch of the first market must not cause all other markets to be treated as launched.** `[R4-C14]`

**⚠️ The sixteen-option feedback list mixes three concepts and must be split** `[R4-C10 ⚠️]`:

- **Feedback source:** Consumer · HCP · Distributor · Retailer · Sales · Social media · Customer service · Regulator · Internal Quality or Manufacturing.
- **Issue type:** Safety or adverse event · Product performance · Claim or communication question · Packaging issue · Formula issue · Quality issue · FAQ or education requirement · Product optimisation opportunity.
- **Resulting action:** PMS review · CAPA · Change Control · FAQ update · Product optimisation · No further action.

**CAPA is a resulting action, not a feedback source.** HCP, retailer, sales and social-media feedback **all count as market feedback**. Packaging issues contribute to product-performance and market-feedback review where applicable. `[R4-C10]`

**⚠️ Product-performance feedback is Conditional, not Supporting.** It becomes mandatory where performance is part of the scheduled review · a performance-related complaint or question is received · a formula, packaging or quality issue affects performance · an efficacy or claim-performance concern is raised · product optimisation is proposed. For market feedback, use **two distinct concepts** rather than changing one record's tier over time: **Continuous Market Feedback Capture — Supporting** (available throughout the lifecycle) and **Scheduled Market Feedback Review — Conditional** (mandatory once the applicable post-launch review milestone is reached or a relevant signal occurs). `[R4-C15 ⚠️]`

---

## 16. Gate 1 and Gate 2 capture

**Gate 1 fields are optional at project creation and mandatory before Gate 1 passes.** A project can be opened with a temporary project name or identifier, creator, date and initial owner; Gate 1 then requires the substantive opportunity and request information. `[R4-C20]`

**Request Origin / Source is distinct from the requester.** Options: Internal product-development proposal · Management request · Sales request · Marketing request · Customer request · Distributor request · Healthcare-professional request · Consumer feedback · Complaint or post-market signal · Market research or identified opportunity · Competitor or benchmark response · Regulatory change · Supplier or ingredient opportunity · Manufacturing or quality improvement · Reformulation or lifecycle improvement · Other — specify. **The requester's name and department remain separate fields.** `[R3-B1]`

**A Key Gate Check "Initial product scope defined"** captures proposed product type · intended purpose · whether it is new development, reformulation, claim change, packaging change, market extension or lifecycle improvement · known boundaries of the request. `[R3-B2]`

**A lightweight Gate 1 capture of initial target user / life-stage and initial target market(s).** These are preliminary and **do not replace** the full Gate 2 assessment, which confirms, refines and formally approves them. `[R3-B3]` The initial-market half of this is superseded by `[R4-C24]` — see section 2.

**The development brief is a discrete controlled record or linked document**, not an inference from completed checklists. Capture Development Brief status · link · version · owner · approval date. The Phase 1 checklist sections *contribute to* the brief but do **not** substitute for formal brief approval. `[R3-B4]`

**A Phase 1 requirements table**, structured as category · requirement · priority · owner · notes, containing: Must-have product requirements · Must-not-have ingredients or features · Intended claims · Claims not to pursue · Target pH or physical requirements where known · Sensory requirements · Packaging requirements · Target cost or commercial boundary · Target timeline · Target markets · Regulatory constraints · User / life-stage constraints · Benchmark or reference product · Known technical risks · Explicit exclusions · Other project assumptions. `[R3-B6]`

**⚠️ Requirement priority is Must / Should / Could** — criticality remains a *risk* concept, not a requirements-priority value. 🆕 **"N/A with rationale" is a valid disposition.** Before Gate 2 passes: every row must be reviewed · every applicable row completed or formally deferred · every non-applicable row marked N/A with rationale · **every Must requirement complete** · a Should or Could requirement may be deferred only through Proceed with Conditions, with an owner and due date. The *Must-have product requirements* row is always mandatory; other rows become mandatory according to project scope. **The system must not require users to mark an empty requirement as Completed.** `[R4-C21 ⚠️]`

**The option-table layout for Gate 1's lists is accepted** — it provides owner, status, evidence and rationale fields. **⚠️ A project may have more than one development or change type, but one must be identified as the Primary project type**, with others recorded as secondary. **⚠️ Owner/function values:** *Request Origin / Source* → **Requesting Function / Project Owner** (preferable to always naming Sales, since a request may originate from Regulatory, Quality, Manufacturing, Management or another function); *Development / Change Type* → **NPD / Project Owner**. The name "Development / Change Type" is accepted, and the five free-text Gate 1 fields stay in their own *Opportunity & Request — Gate 1* block rather than moving into the Project Identification table. `[R4-C22]`

**🆕 Gate 2 requires at least one product type or form status, but the final form may legitimately remain open.** Add the option **"Product form under evaluation — to be confirmed by Gate 5"**, so an early brief such as "infant barrier product — cream or balm to be determined" can pass Gate 2 with a controlled action. `[R4-C23(a)]`

**🆕 The Gate 5 costing item stays Supporting unless the project is specifically designated as commercially dependent**, where that commercial requirement becomes a **Must** — handled through Hold or Proceed with Conditions rather than being ignored. `[R4-C36(b)]`

---

## 17. Testing and human studies

**Human-study approval must be completed before recruitment**, where applicable, and the approval workflow is triggered before **any** internal or external study involving human participants, volunteers, consumer testing, patch testing, in-use trials, image collection, questionnaires, or other identifiable participant data. `[R2-F1 Gate 8]` `[R3-A3]`

**🆕 "Human-participant study planned?" is an explicit Yes / No / Undecided field.** It is reviewed at Gate 8 and may also be raised earlier through the claim or evidence plan. **Creating a Study Protocol automatically sets the answer to Yes.** Where Yes: the dedicated study approval workflow becomes mandatory · recruitment must not begin before approval · testing or data collection must not begin before approval · participant information, consent, privacy and data-management requirements must be complete. **Undecided must prevent Gate 8 from closing.** `[R4-C9]`

**🆕 "Scale-up risk identified? — Yes / No / Pending assessment"**, plus risk description · assessor · assessment date · rationale · required pilot or scale-up activity · evidence link. **Pending assessment blocks Gate 9 readiness.** The affected areas that trigger scale-up or pilot review: formula composition · active or preservative concentration · manufacturing site · equipment type or scale · batch size · order of addition · mixing speed or time · homogenisation · heating or cooling profile · maximum temperature · hold time · pre-processing or ingredient hydration · transfer method · filling method · water quality or process-water source · process aid · packaging/filling interface · **any change identified by Manufacturing, Quality or R&I as potentially affecting product performance.** `[R4-C12]`

---

## 18. The explicit assessment fields

Five questions each added a field whose "not yet assessed" value blocks, applying the cross-cutting rule in section 6.4. They are listed together because they share one mechanism.

| Field | Values | What blocks | Source |
|---|---|---|---|
| Change Control required? | Yes / No / Pending assessment | Pending blocks closure of the post-market finding | `[R4-C8]` |
| Human-participant study planned? | Yes / No / Undecided | Undecided prevents Gate 8 closing | `[R4-C9]` |
| Administrative-only change? | Yes / No | Determines exemption from competitor/benchmark review | `[R4-C11]` |
| Scale-up risk identified? | Yes / No / Pending assessment | Pending blocks Gate 9 readiness | `[R4-C12]` |
| N/A rationale | System-generated or entered | Critical items still need reviewer acknowledgement | `[R4-C16]` |

---

## 19. NPD Front-End Roadmap

**Source and status.** The v2 workbook was authored directly by the expert team and carries **the same authority as the original workbook** — no separate confirmation round was needed. `[V2]`

**A mandatory four-step scientific front-end that every new product must complete, in order, before the formula is locked at Gate 5** `[V2]`:

1. **Needs & Scientific Basis** — physical, emotional, caregiver and design-implication needs, with research questions and the literature-search method recorded. Sign-off gate: **Gate 2**.
2. **Competitor Landscape** — purchased-and-tested competitor products, comparative testing, and current-solution / standard-of-care analysis. Sign-off gate: **Gate 3**.
3. **Target Product Profile & Backbone Technology** — one agreed definition of product success, plus the proposed technology platform and why it is superior to the market. **Complete before the formula is locked at Gate 5.**
4. **Evidence Plan & Claim Support** — the proof plan (endpoint, comparator, pass/fail) agreed **before** the formula is locked at Gate 5; the detailed test protocol completed once a prototype exists, at **Gate 8**.

**Enforcement:** the Formula BOM at Gate 5 is hard-blocked until Steps 1–3 are complete and signed off and the Step 4 evidence plan is recorded. Gates 2, 3 and 8 each carry their own earlier checkpoint for the matching step, so problems surface early rather than only at the end. `[V2]`

**No claim may appear on packaging, HCP material or sales material without an approved Claim ID on file** — the same rule as Gate 3's *"a claim may remain under development, but unsupported wording must not be marked as approved."* `[V2]` The design that enforces this was reviewed in Round 3 and three of its four choices were changed — see section 13.6. `[R3-D2]`

---

## 20. Decisions made by the project owner, not the subject-matter team

These were **decided internally, not asked of the subject-matter team.** They are recorded here so they are visible and can be challenged if they conflict with how the business actually works. `[PO, 2026-07-26]`

- **Only a System Administrator may delete a project**, and the deletion removes the project's entire audit trail with it. One record deliberately survives: a tombstone stating who deleted what, when, whether the project had been archived first, and how much was destroyed. **A project must never vanish leaving no trace of who removed it** — rule `[R1-B4]` applied to deletion itself. Deletion authority is tied structurally to the administrator role and is **not** a permission that can be granted to another role.
- **Only the Project Owner may archive and restore a project.** Archiving is reversible and nothing is deleted; it is the route every non-administrator role has for retiring a project. A System Administrator may also archive, since it can already perform the strictly more destructive deletion.
- **An archived project is read-only for everyone, including an administrator.** Restore it first. Two things stay available: restoring it, and — for an administrator — deleting it.
- **Any signed-in user may create a project.** Restricting this would block ordinary business use, and creating a project destroys nothing.
- **Gate 1's "project owner" is an explicit tick, not an automatic pass.**
- **Signing in with Microsoft 365 only proves the person belongs to the company. A user with no role cannot enter the app.** `[PO, 2026-10-02]`
- **"View as" is a read-only preview for administrators**, not a way to act as another role. `[PO, 2026-10-03]`

---

## 21. What is still open

| Item | Why it is open | Source |
|---|---|---|
| **Cosmetri's ASEAN / Vietnam compliance coverage** | External dependency — only Cosmetri can confirm it. Interim handling is in section 4. | `[R2-F12 ⏳]` |
| **Round 5 questions** | Drafted while building Round 4 and not yet sent. Until they are answered, the affected design choices remain our reading, not confirmed rules. | `docs/rounds/DRAFT-our-questions-round5.md` |

**Content still to be supplied — these are inputs to gather, not decisions to make:**

- The real controlled watch-list datasets, with CAS numbers per ingredient group, maintained by Regulatory and Safety. `[R2-F3]`
- The fine-grained role × gate / section / register permission grid, plus the real SSO/AD attribute mapping. `[R2-F6]`
- The concrete per-market checklist content for each Market Dossier Profile — EU CPSR items, Australia, US. `[R2-F10]` `[R3-E2]` — partly discharged by `[R4-C35]` and `[R4-C4]`.
- The Claims Library content: approved terms and the evidence required per claim. Its **shape** is settled by `[R4-C28]`; its **content** is not yet populated. `[R2-F11]`
- The Raw Material Risk Overlay content — the eleven composition-risk classifications per material. `[R4-C17]`
