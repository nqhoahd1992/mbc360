# MBc360 — Business Rules Follow-up (Round 2)

**Date:** 2026-07-21
**For:** the subject-matter team (NPD / Quality / Regulatory / Safety)

Thank you — your previous answers closed all 14 follow-ups (F1–F14) and the three remaining items A5/B5/C7. They are now recorded in `Business_Rules_Confirmation_EN.md` / `Business_Rules_Confirmation_VN.md`.

Before we implement, two things remain:

- **Section A — 3 clarifications** that your own answers raised. These need a decision from you.
- **Section B — reference data/content** we will need from you as we build. Not blocking today; please start preparing. Where useful, we note which app screen each input lands in.

**Status as of 2026-07-21: everything not waiting on this document is already implemented and merged** — the 3-tier gate-readiness engine (F1/C7), Next Action workflow (F8), Change-Control soft-lock (F9), Major/Minor classification (F5), pre-work on locked phases (F13), the Published Information 12-state workflow (F11), and the BOM-reconciliation gate before Gate 7 (F14) are all live. What's below is genuinely the remaining work, and the order we plan to act on it once answered:

1. **A1 (critical criteria)** — highest priority. Three shipped features already have a placeholder for this and are only half-closed without it: F7's "critical gap → Hold/Backtrack" branch, F9's "may become a hard block depending on impact" for change controls, and F1's safety-finding severity. Answering this lets us finish work already in the codebase rather than leaving it partially done.
2. **B — per-gate evidence mapping (F1/C7)** — the `gateReadiness.ts` engine and Gate Readiness panel design are ready; every item is currently `manual` (never blocks) purely because we don't have this mapping yet. This is the single highest-leverage item in Section B — it turns the already-built engine into real enforcement across all 12 gates.
3. **A3 (concurrent versions, same market)** — needed before we start F4's data model (the heaviest remaining item, M3/Prisma work). Better to get this now than redesign `marketTracks` twice.
4. **A2 (Infant & Baby Safety content)** — unlocks F2. Self-contained (a new workflow, doesn't touch existing code), so it's lower risk but still blocks starting that work at all.
5. **B — CAS watch-lists (F3), Market Dossier checklists (F10), Claims Library (F11 content)** — each is self-contained content for an existing screen; can land in any order as it's ready.
6. **B — Role×gate grid + AD mapping (F6)** — real urgency is later: only the e-signature part is needed before M6, and the role list itself (17 roles) is already coded. Least time-pressured item on this list.

---

## A. Clarifications needed

### A1. Definition of "critical" (drives many hard-blocks)

Several rules now branch on whether a gap / change / finding is *safety-critical, regulatory-critical or release-critical* — F7 (gaps), F9 (change controls), F1 (safety findings). **Who decides that a given item is "critical", and on what criteria?** Is it the gate/section reviewer's judgement, or do you want a predefined list per category? This directly controls hard-block vs soft-warn behaviour across the whole system.

### A2. Infant & Baby Safety workflow (new, from F2)

You confirmed "Infant 0+" activates a dedicated Infant & Baby Safety workflow separate from Skincare for Two, and listed the topics (infant skin characteristics, exposure, accidental oral contact, eye-area/body-area use, frequency, age suitability). **Is that topic list the full checklist, or should we model it 1:1 on the Skincare-for-Two structure** (items + required evidence + a hard block on a gate)? **At which gate should it hard-block** (Gate 7, as Skincare for Two does)?

### A3. Concurrent versions in the same market (from F4)

When an old formula version and its replacement are both active **in the same market** during a transition, how should the system present/track that market — one market row showing "v1 marketed / v2 in registration", or two separate market-track rows? And **what formally ends the old version** — a manual "superseded" action, or the new version's launch approval?

---

## B. Reference data/content we will need

Most of these live under a single app menu, **"Regulatory"** (except the role mapping).

- **Per-gate evidence classification (F1/C7):** we will map your per-gate lists to the specific registers in the app and tag each as **Mandatory / Conditional / Supporting** — we will send that mapping back to you to confirm.
- **Prohibited & caution watch-lists with real CAS numbers (F3):** the actual controlled datasets for the two registers **"Prohibited Ingredient Watch-list"** and **"Pregnancy / Breastfeeding Caution Limits"** (Regulatory menu). Each ingredient group needs its INCI names, **CAS numbers** and synonyms, so the automatic screen can match by exact CAS. Owned by Regulatory & Safety, reviewed at least annually.
- **Market Dossier Profiles (F10):** the concrete checklist content per market. Today only **"PIF_Checklist_ASEAN"** exists (Regulatory menu); we will add new checklists for **EU (CPSR), Australia, US** in the same menu — please supply the item list for each.
- **Claims Library / Published Product Information Guideline (F11):** approved terminology + required evidence per claim, maintained by Technical + Regulatory.
- **Role → AD mapping (F6):** which company Active Directory group maps to which of the 17 MBc360 roles (for IT / Regulatory jointly).

---

## Where each input lands in the app

| Input | App menu ("By responsibility" sidebar) | Register / screen |
|---|---|---|
| F3 — prohibited CAS list | **Regulatory** | Prohibited Ingredient Watch-list (`Prohibited_Ingredients`) |
| F3 — pregnancy/BF caution CAS list | **Regulatory** | Pregnancy / Breastfeeding Caution Limits (`PB_Caution_Limits`) |
| F3 — where the CAS flag shows up | **BOM & Costing** + Gate 04 | Formula BOM auto-screen |
| F10 — ASEAN checklist (exists) | **Regulatory** | PIF_Checklist_ASEAN |
| F10 — EU/AU/US checklists (new) | **Regulatory** | new checklists, same menu |
| F11 — Claims Library | **Regulatory** | SKU_Claims_PIF_Register / Published_Info_Approval |
| F1/C7 — per-gate evidence | all gate pages | Gate Readiness panel reads the tagged registers |
