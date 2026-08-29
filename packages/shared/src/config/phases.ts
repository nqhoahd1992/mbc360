import { PROJECT_NATURE_OPTIONS, REQUEST_ORIGIN_OPTIONS } from './opportunity';
import { REVIEW_SPECS, type ReviewOwnerSpec } from './reviewers';

export interface ChecklistSectionConfig {
  key: string;
  title: string;
  gate: string;
  ownerFunction: string;
  options: string[];
  // Round 4 question 22(b), 2026-08-29: where several options may apply, one
  // must be identified as the PRIMARY one and the rest recorded as secondary.
  // Only `projectNature` declares it today; see the comment there for why this
  // is opt-in rather than a property every checklist section has.
  requiresPrimary?: boolean;
}

export interface RequirementRowConfig {
  gate: string;
  requirement: string;
  minimum: string;
  rationale: string;
  owner: string;
}

export interface RequirementSectionConfig {
  key: string;
  title: string;
  rows: RequirementRowConfig[];
  // Round 4 question 21 (2026-08-29): 'N/A' becomes a selectable status, and a
  // row set to it must carry a rationale. Opt-in per section — see the comment
  // on `projectRequirements` for why this is not switched on everywhere.
  allowNotApplicable?: boolean;
  // Which columns this section shows. Omitted = the Phases 2-4 default. Added
  // 2026-08-09 so Phase 1's B6 table can drop the three columns that have no
  // meaning at the opportunity stage and add `priority`, without forking
  // RequirementTable (see docs/plans/Post_Round3_Design_Decisions.md #4).
  columns?: RequirementColumnKey[];
}

export type RequirementColumnKey =
  | 'gate'
  // 'requirement' renders the row's own fixed label. Phase 1 shows it as
  // 'category' instead — same data, different heading — because B6's 16 rows
  // are categories, and 'detail' is where the project's actual requirement goes.
  | 'category'
  | 'detail'
  | 'requirement'
  | 'minimum'
  | 'rationale'
  | 'priority'
  | 'owner'
  | 'status'
  // Shown only where `allowNotApplicable` is set; holds the reason a row was
  // dispositioned N/A (Round 4 question 21).
  | 'naRationale'
  | 'evidenceLink'
  | 'notes';

export interface KeyGateCheckConfig {
  gate: string;
  check: string;
}

// The four shortcuts every phase sheet carries in its banner, cells E3/G3/I3/K3
// with "(provide link here)" underneath in E4/G4/I4/K4 (added 2026-08-11,
// user-requested). In the workbook they are where the phase's real work lives —
// some inside the company drive, some in another tab.
//
// `href` is this app's equivalent, using the same convention as
// resolveCheckLink(): relative to `/projects/:id` unless `absolute`. Only
// unambiguous targets carry one. Four of the sixteen have no in-app equivalent
// (Success Criteria Package · Marketing Campaign Brief · Project Evidence Folder
// · Ingredient Registry) and one is a judgement we would rather not make blind
// (Evidence Register — the app has an Evidence Summary board and a Product
// Evidence Summary register, and "Evidence Register" is neither name); those
// render as external documents rather than pointing somewhere plausible but
// wrong; the link to each of those is recorded per project (PhaseClosure.keyLinks),
// which is what the workbook's "(provide link here)" asks for. No default URL
// ships here — see the note on Phase 2's Ingredient Registry below.
export interface PhaseKeyLinkConfig {
  label: string;
  href?: string;
  absolute?: boolean;
}

export interface PhaseConfig {
  phase: number;
  gateIds: string[];
  keyLinks: PhaseKeyLinkConfig[];
  checklistSections: ChecklistSectionConfig[];
  requirementSections: RequirementSectionConfig[];
  keyGateChecks: KeyGateCheckConfig[];
  reviewOwner?: ReviewOwnerSpec;
}

// Review owner of the source workbook's "REVIEW OWNER" header row — all four
// phase sheets share Facility / PM Operations (+ Project Manager co-sign). The
// actual people are per-project (identity.reviewers), composed at display time.
const PHASE_REVIEW_OWNER: ReviewOwnerSpec = REVIEW_SPECS.facilityPm;

export const PHASE_1: PhaseConfig = {
  phase: 1,
  reviewOwner: PHASE_REVIEW_OWNER,
  gateIds: ['SG01', 'SG02', 'SG03'],
  // Banner shortcuts, cells E3/G3/I3/K3 (2026-08-11). Three of Phase 1's four
  // are documents that live outside this app.
  keyLinks: [
    { label: 'Success Criteria Package' },
    // The v2 workbook's "2. Competitor Landscape" sheet is this app's home for
    // competitor work; the V18 banner calls it "Competitor Analysis". Our
    // mapping, not the SME's wording.
    { label: 'Competitor Analysis', href: '/competitor-landscape' },
    { label: 'Marketing Campaign Brief' },
    { label: 'Project Evidence Folder' },
  ],
  checklistSections: [
    // The two gate-01 sections below are the ONLY checklist sections in this
    // config that do not exist as a table in the source workbook — Gate 01 has
    // no data-entry surface there at all, just three Key Gate Check rows. They
    // hold the option lists SME Round 3 B1/B2 asked for.
    //
    // They are modelled as checklist sections rather than the dropdowns first
    // built on 2026-08-09, because a checklist table is the shape the workbook
    // itself uses for every "pick from a list" question (verified against
    // `PHASE1 G1-3 MKTG` cells A20/A35/A65/A85/A109/A144: all six share
    // `Gate │ option │ Select │ Owner/function │ Status Y-N-NA │ Evidence │
    // Free-type notes`). A dropdown had no home for the per-option owner,
    // status, evidence link and rationale those four columns carry, and it
    // silently forced a single answer where the workbook's shape allows several
    // (a project can be a reformulation AND a market extension).
    //
    // The layout, the multi-select consequence and the two ownerFunction values
    // were all our reading — B1/B2 gave the option lists and nothing else.
    // Round 4 question 22 (2026-08-24) CONFIRMS the table layout, (a), on exactly
    // the grounds argued above — "provides owner, status, evidence and rationale
    // fields" — and confirms the invented table name, (d).
    // `ownerFunction` on both: Gate 01 has no table in the workbook, so there is
    // no owner cell to copy. The rule followed instead (revised 2026-08-11, user
    // decision) is to name TWO functions, both taken from the three the workbook
    // does give Gate 01 — `Stage_Map!F8`, "Primary owner" = "Project owner /
    // Sales / NPD" — picking whichever two suit that table's content.
    //
    // Two names, not three, because `Owner / function` is a different column from
    // Stage_Map's `Primary owner`: it records who ticks and evidences a row, and
    // all six of the workbook's own option tables put exactly two functions there
    // (`Marketing / Project owner`, `Marketing / NPD`, `Marketing / Regulatory`,
    // `Regulatory / Scientific Review`), as do all 14 pre-existing sections here.
    // The first version of these two sections copied Stage_Map's three-name gate
    // owner into that column, which made `requestOrigin` the only section of 16
    // reading differently from every sibling.
    //
    // Which two per table was our choice, not the SME's — no new function name
    // was invented, but the split was a judgement.
    //
    // Round 4 question 22(c) (2026-08-24) supplied the real values, and BOTH
    // differed from the two we had picked. Set below as answered (2026-08-29):
    //   Request Origin / Source  → "Requesting Function / Project Owner"
    //     — explicitly preferable to naming Sales, because "a request may
    //       originate from Regulatory, Quality, Manufacturing, Management or
    //       another function", which is the reasoning our Sales choice inverted.
    //   Development / Change Type → "NPD / Project Owner"
    //     — same two functions we picked, written in the opposite order.
    {
      key: 'requestOrigin',
      title: 'Request Origin / Source',
      gate: '01',
      ownerFunction: 'Requesting Function / Project Owner',
      options: [...REQUEST_ORIGIN_OPTIONS],
    },
    {
      // `key` stays `projectNature` while the title does not say "nature": the key
      // is the DB `sectionKey` plus the name used across gateReadiness.ts,
      // gateProgress.ts and the docs, so renaming it would need a data migration
      // for no user-visible gain. The TITLE was renamed 2026-08-11 (user-raised):
      // "Project Nature" was a phrase of ours — the word "nature" appears in no
      // SME reply and nowhere in the workbook except "denatured alcohol". B1 gave
      // us its field name verbatim ("Request Origin / Source"); B2 gave only a
      // clause, so something had to be invented, and inventing it silently was
      // the mistake. Every word of the replacement comes from B2's own clause
      // ("new DEVELOPMENT … packaging CHANGE, claim CHANGE") plus "Type", which
      // mirrors the sibling PRODUCT TYPE. CONFIRMED by Round 4 question 22(d),
      // 2026-08-24: "'Development / Change Type' accepted."
      key: 'projectNature',
      title: 'Development / Change Type',
      gate: '01',
      ownerFunction: 'NPD / Project Owner',
      options: [...PROJECT_NATURE_OPTIONS],
      // Question 22(b): "A project may have more than one development/change
      // type. Require one to be identified as the Primary project type, with
      // others recorded as secondary." The multi-select this table already
      // allows IS the answer's premise; what it could not express is which of
      // several ticks leads. `requiresPrimary` turns on the Primary column and
      // the `checklistPrimarySelected` readiness check — it is deliberately a
      // per-section flag rather than a property of every checklist, because no
      // other option list in the workbook asks for one (Target Users, Target
      // Markets and Claim Areas are all genuinely unranked).
      requiresPrimary: true,
    },
    {
      key: 'targetArea',
      title: 'Target Area of Body',
      gate: '02',
      ownerFunction: 'Marketing / Project owner',
      options: [
        'Face', 'Hair', 'Hands', 'Muscle', 'Skin (Whole Body)', 'Feet', 'Nails',
        'Internal', 'Eyes', 'Lips', 'Intimate Zone', 'Other - specify',
      ],
    },
    {
      key: 'productType',
      title: 'Product Type',
      gate: '02',
      ownerFunction: 'Marketing / NPD',
      // The last option before 'Other - specify' is NOT a workbook value:
      // Round 4 question 23(a) (2026-08-24) adds it, because "Gate 2 requires at
      // least one product type or form status" while "the exact final form may
      // legitimately remain open". Without it the one failing case we could
      // construct ourselves — an early brief reading "infant barrier product —
      // cream or balm to be determined" — could not pass Gate 2 at all, since
      // `sg02-product-type` is Mandatory. Added 2026-08-29; every other option
      // here is transcribed from the workbook.
      options: [
        'Cream', 'Lotion', 'Balm', 'Serum', 'Oil', 'Body oil', 'Hair oil', 'Wash',
        'Body wash', 'Shower gel', 'Shampoo', '2-in-1 wash', 'Spray', 'Mist',
        'Feminine wash', 'Perineal product', 'Nipple product', 'Toothpaste', 'Gel',
        'Ointment', 'Cleanser', 'Moisturiser', 'Barrier product',
        'Scar / blemish product', 'Insect bite / itch product',
        'Raw material / extract',
        'Product form under evaluation — to be confirmed by Gate 5',
        'Other - specify',
      ],
    },
    {
      key: 'targetUsers',
      title: 'Target Users / Life Stage',
      gate: '02',
      ownerFunction: 'Marketing / Regulatory',
      options: [
        'General adult', 'Pregnancy', 'Breastfeeding', 'Postpartum', 'Infant 0+',
        'Child 2+', 'Child 3+', 'Sensitive skin',
        // Round 4 question 25(b), built 2026-08-29: the workbook's single
        // 'Dry / eczema-prone skin' option is SPLIT here, because the two halves
        // get opposite answers — "dry skin alone should not automatically be a
        // vulnerable-user group. Eczema-prone or compromised skin should." This
        // is the one place a workbook option list is deliberately not verbatim.
        'Dry skin', 'Eczema-prone or compromised skin',
        'Oily skin', 'Intimate area', 'Swimmers', 'Cancer patient support',
        'Kidney disease support', 'Family use',
        'Professional / HCP recommendation', 'Other - specify',
      ],
    },
    {
      key: 'targetMarkets',
      title: 'Target Countries / Markets',
      gate: '02',
      ownerFunction: 'Marketing / Regulatory',
      options: [
        'Australia', 'Malaysia', 'Vietnam', 'Singapore', 'Thailand', 'Indonesia',
        'Philippines', 'China', 'Hong Kong', 'Taiwan', 'Japan', 'Korea', 'EU', 'UK',
        'USA', 'Canada', 'Middle East', 'UAE', 'Saudi Arabia', 'New Zealand',
        'Other - specify',
      ],
    },
    {
      key: 'claimAreas',
      title: 'Claim / Benefit Areas',
      gate: '03',
      ownerFunction: 'Marketing / Regulatory',
      options: [
        'Moisturising', 'Hydrating', 'Nourishing', 'Clarifying', 'Brightening',
        'Radiance', 'Soothing', 'Calming', 'Barrier support', 'Protection',
        'Anti-redness appearance', 'Comfort', 'Itch relief support',
        'Stretch mark appearance', 'Scar appearance', 'Blemish appearance',
        'Nipple comfort', 'Perineal comfort', 'Swim protection',
        'Hair conditioning', 'Detangling', 'Antibacterial hygiene',
        'Antifungal hygiene', 'Freshness', 'Gentle / mild', 'Tear-free',
        'Fragrance-free', 'pH balanced', 'Sensitive skin suitable',
        'Pregnancy suitable', 'Breastfeeding suitable', 'Other (Please Describe)',
      ],
    },
    {
      key: 'evidenceRoute',
      title: 'Initial Evidence / Proof Route',
      gate: '03',
      ownerFunction: 'Regulatory / Scientific Review',
      options: [
        'Clinical / human study', 'Authority monograph', 'TGA accepted reference',
        'FDA / EU / authority guidance', 'Peer-reviewed article',
        'Supplier evidence', 'In-vitro / ex-vivo test', 'Internal test report',
        'Consumer / sensory trial', 'Traditional / marketing rationale',
        'Competitor benchmark', 'No evidence yet - action required',
      ],
    },
  ],
  requirementSections: [
    {
      // Added 2026-08-09, SME Round 3 B6 — the 16 rows are transcribed verbatim
      // from their reply. Phase 1 had NO requirement section at all, which is
      // why sg02-requirements could never be checked against anything.
      //
      // Each row is a category the team must respond to; the actual requirement
      // text goes in Notes, the same way Phases 2-4 use their fixed rows. The
      // three columns dropped below have no meaning at the opportunity stage:
      // "minimum requirement" and "rationale / control reason" are downstream
      // engineering concepts, and evidence links belong to later gates.
      key: 'projectRequirements',
      title: 'Project Requirements & Exclusions',
      // B6: "a structured table with category, requirement, priority, owner and
      // notes". `status` is ours — it is how a row is closed and what the Gate
      // 02 check reads.
      //
      // Round 4 question 21 (2026-08-24) changed what goes IN two of these
      // columns; built 2026-08-29:
      //   priority → **Must / Should / Could** (REQUIREMENT_PRIORITIES), not the
      //     NextAction Low/Medium/High/Critical scale this reused. "Criticality
      //     remains a risk concept, not a requirements-priority value." Every
      //     Must must be complete before Gate 2; a Should or Could may be
      //     deferred only through Proceed with Conditions.
      //   status   → gains **N/A with rationale** as a valid disposition, which is
      //     the gap we reported ourselves: "The system must not require users to
      //     mark an empty requirement as Completed." That is `allowNotApplicable`
      //     below, plus the `naRationale` column beside it.
      columns: ['category', 'detail', 'priority', 'owner', 'notes', 'status', 'naRationale'],
      // Scoped to this section on purpose. Question 21 is about the Phase 1
      // requirements table; the Phases 2-4 sections are fixed engineering rows
      // whose `requirementDone` / `requirementSectionComplete` checks all read
      // status === 'Completed', so quietly admitting a fourth disposition there
      // would change rules nobody asked about. Whether Phases 2-4 want the same
      // escape is a question we have not put to them [ASSUMPTION: R5-Q22].
      allowNotApplicable: true,
      rows: [
      { gate: '02', requirement: 'Must-have product requirements', minimum: '', rationale: '', owner: '' },
      { gate: '02', requirement: 'Must-not-have ingredients or features', minimum: '', rationale: '', owner: '' },
      { gate: '02', requirement: 'Intended claims', minimum: '', rationale: '', owner: '' },
      { gate: '02', requirement: 'Claims not to pursue', minimum: '', rationale: '', owner: '' },
      { gate: '02', requirement: 'Target pH or physical requirements, where known', minimum: '', rationale: '', owner: '' },
      { gate: '02', requirement: 'Sensory requirements', minimum: '', rationale: '', owner: '' },
      { gate: '02', requirement: 'Packaging requirements', minimum: '', rationale: '', owner: '' },
      { gate: '02', requirement: 'Target cost or commercial boundary', minimum: '', rationale: '', owner: '' },
      { gate: '02', requirement: 'Target timeline', minimum: '', rationale: '', owner: '' },
      { gate: '02', requirement: 'Target markets', minimum: '', rationale: '', owner: '' },
      { gate: '02', requirement: 'Regulatory constraints', minimum: '', rationale: '', owner: '' },
      { gate: '02', requirement: 'User/life-stage constraints', minimum: '', rationale: '', owner: '' },
      { gate: '02', requirement: 'Benchmark or reference product', minimum: '', rationale: '', owner: '' },
      { gate: '02', requirement: 'Known technical risks', minimum: '', rationale: '', owner: '' },
      { gate: '02', requirement: 'Explicit exclusions', minimum: '', rationale: '', owner: '' },
      { gate: '02', requirement: 'Other project assumptions', minimum: '', rationale: '', owner: '' },
      ],
    },
  ],
  keyGateChecks: [
    { gate: '01', check: 'Product request, opportunity and requester captured' },
    { gate: '01', check: 'Initial project record opened and owner assigned' },
    { gate: '01', check: 'Initial constraints, known deadlines and risk flags recorded' },
    // Added 2026-08-09, SME Round 3 B2 — the only Key Gate Check row in this
    // config that does NOT come from the source workbook. The team confirmed
    // our proposed wording verbatim ("Yes. Please add a new Key Gate Check:
    // Initial product scope defined"). It exists because the three rows above
    // could all be ticked without anyone having recorded what the product
    // actually IS — "constraints, deadlines and risks" is not scope.
    { gate: '01', check: 'Initial product scope defined' },
    { gate: '02', check: 'Target user / life stage / use context selected' },
    { gate: '02', check: 'Target markets and success criteria linked' },
    { gate: '02', check: 'Commercial planning inputs entered or marked N/A' },
    { gate: '03', check: 'Concept direction and benchmark/competitor review recorded' },
    { gate: '03', check: 'Claim/benefit areas selected and evidence route identified' },
    { gate: '03', check: 'Gate 1-3 decision and open actions recorded' },
  ],
};

export const PHASE_2: PhaseConfig = {
  phase: 2,
  reviewOwner: PHASE_REVIEW_OWNER,
  gateIds: ['SG04', 'SG05', 'SG06'],
  keyLinks: [
    // PHASE2!E4 is the one banner cell in the whole workbook carrying a real
    // hyperlink — a company SharePoint file, its cell text reading "Clink for
    // link" (the workbook's own typo). It was shipped here as a default URL on
    // 2026-08-11 and removed the same day: one project's document does not
    // belong hardcoded in config, it made this the only one of the sixteen rows
    // behaving differently, and a link that rots is worse than an empty field
    // someone fills in. Each project records its own, like the other four.
    { label: 'Ingredient Registry' },
    { label: 'Formula BOM', href: '/bom/formula' },
    { label: 'Packaging BOM', href: '/bom/packaging' },
    { label: 'Costing Calculator', href: '/bom/costing' },
  ],
  checklistSections: [
    {
      key: 'rmDocPack',
      title: 'Raw Material Document Pack',
      gate: '04',
      ownerFunction: 'R&I / Procurement',
      options: [
        'Specification', 'CoA', 'SDS', 'TDS', 'Composition statement',
        'Allergen statement', 'Impurity statement', 'Heavy metal statement',
        'Residual solvent statement', 'Micro statement', 'Origin statement',
        'GMO statement', 'Vegan statement', 'Halal / Kosher',
        'Natural / organic certificate', 'Supplier questionnaire',
        'Manufacturing process summary', 'Stability / shelf-life data',
        'Regulatory status statement', 'Other (Please Describe)',
      ],
    },
    {
      key: 'sensoryChoices',
      title: 'Sensory / Appearance Choices',
      gate: '05',
      ownerFunction: 'R&I / Marketing',
      options: [
        'Lightweight', 'Rich', 'Non-greasy', 'Fast absorbing', 'Silky', 'Creamy',
        'Foaming', 'Low foam', 'Clear', 'Pearlescent', 'White', 'Tinted',
        'Fragranced', 'Fragrance-free', 'Natural scent', 'Cooling', 'Warming',
        'Sprayable', 'Pumpable', 'Tube-friendly', 'Jar-friendly',
        'Pipette-friendly',
      ],
    },
    {
      key: 'packagingOptions',
      title: 'Packaging Options',
      gate: '06',
      ownerFunction: 'Packaging / NPD',
      options: [
        'Tube', 'Bottle', 'Pump bottle', 'Airless pump', 'Jar', 'Sachet',
        'Spray bottle', 'Mist pump', 'Dropper / pipette', 'Roll-on', 'Foamer',
        'Cap / flip top', 'Carton', 'Label only', 'Shrink wrap', 'Tamper seal',
        'Travel size', 'Sample size', 'Bulk / salon pack',
        'Other (Please Describe)',
      ],
    },
    {
      key: 'artworkTriggers',
      title: 'Artwork / Regulatory Readiness Triggers',
      gate: '06',
      ownerFunction: 'Packaging / Regulatory',
      options: [
        'Artwork/label route required', 'Product classification checked',
        'Claims wording review required', 'Disease / therapeutic risk screen',
        'Label compliance check', 'Ingredient restrictions reviewed',
        'Allergen declaration needed', 'PIF / evidence file link needed',
        'Authority submission needed', 'Registration needed',
        'Distributor evidence pack', 'Sales FAQ / approved wording',
        'Disclosure / limitation wording', 'Other (Please Describe)',
      ],
    },
  ],
  requirementSections: [
    {
      key: 'formulationDesign',
      title: 'Formulation Design Requirements',
      rows: [
        { gate: '05', requirement: 'Target pH / pH range', minimum: 'Target and accepted range entered', rationale: 'Controls skin compatibility, stability and preservative performance', owner: 'R&I / Quality' },
        { gate: '05', requirement: 'Appearance / colour / odour', minimum: 'Target sensory appearance defined', rationale: 'Gives manufacturing and QC a visible acceptance point', owner: 'R&I / Marketing' },
        { gate: '05', requirement: 'Texture / viscosity / sensory requirement', minimum: 'Target texture and viscosity defined', rationale: 'Aligns consumer promise with formula and pack feasibility', owner: 'R&I / Marketing' },
        { gate: '05', requirement: 'Fragrance requirement', minimum: 'Fragrance-free/fragranced/natural scent requirement recorded', rationale: 'Controls allergen, claim and sensory implications', owner: 'R&I / Regulatory' },
        { gate: '05', requirement: 'Key actives and target levels', minimum: 'Active levels, grade/marker and purpose recorded', rationale: 'Prevents ingredient-presence-only efficacy claims', owner: 'R&I / Scientific Review' },
        { gate: '05', requirement: 'Compatibility / use-with constraints', minimum: 'Use-with, pack and ingredient interactions recorded', rationale: 'Controls formula compatibility and real-world use risks', owner: 'R&I / Quality' },
        { gate: '05', requirement: 'Formula constraints / exclusions', minimum: 'Restricted, prohibited or customer-excluded ingredients recorded', rationale: 'Prevents rework and regulatory gaps', owner: 'R&I / Regulatory' },
        { gate: '05', requirement: 'Scale-up or manufacturing notes', minimum: 'Critical process parameters and scale-up notes recorded', rationale: 'Maintains formula performance during manufacturing', owner: 'Manufacturing / Quality' },
      ],
    },
    {
      key: 'efficacyProcess',
      title: 'Efficacy and Process Protection Checks',
      rows: [
        { gate: '05', requirement: 'Mechanism-to-formula route', minimum: 'Claim mechanism linked to formula ingredients and levels', rationale: 'Prevents unsupported efficacy claims', owner: 'R&I' },
        { gate: '05', requirement: 'Heat/light/pH sensitivity', minimum: 'Max temperature, hold time, pH range and handling defined for sensitive actives', rationale: 'Protects efficacy during manufacturing', owner: 'R&I / Manufacturing' },
        { gate: '05', requirement: 'Pre-processing method', minimum: 'Dispersion, hydration or activation method documented where relevant', rationale: 'Ensures consistent performance', owner: 'R&I / Manufacturing' },
        { gate: '05', requirement: 'Scale-up equivalence', minimum: 'Critical process parameters and in-process QC defined for pilot/production', rationale: 'Ensures the product delivers intended benefit', owner: 'Manufacturing / Quality' },
        { gate: '05', requirement: 'Finished product efficacy markers', minimum: 'pH/viscosity/appearance/active marker checked as needed', rationale: 'Supports release and stability conclusion', owner: 'Quality' },
      ],
    },
  ],
  keyGateChecks: [
    { gate: '04', check: 'Ingredient functions identified and RM document pack requested' },
    // Added 2026-08-09, SME Round 3 C2 — verbatim from their reply. The row
    // below ("Restrictions, exclusions and supplier risks screened") stays as
    // the broader Gate 4 check; this one is the narrow, dedicated confirmation
    // of the ingredient-level watch-list screen they asked for.
    { gate: '04', check: 'Prohibited, restricted and caution ingredient screen completed' },
    { gate: '04', check: 'Restrictions, exclusions and supplier risks screened' },
    { gate: '04', check: 'Ingredient evidence / registry links added or gap actions opened' },
    { gate: '05', check: 'Formula route, BOM and costing started' },
    { gate: '05', check: 'Sensory target, pH/process limits and compatibility risks logged' },
    { gate: '05', check: 'Development decision recorded with evidence or conditions' },
    { gate: '06', check: 'Packaging format and component requirements selected' },
    { gate: '06', check: 'Artwork/label needs and pack compatibility triggers identified' },
    { gate: '06', check: 'Packaging cost, lead time and supplier approval requirements entered' },
  ],
};

export const PHASE_3: PhaseConfig = {
  phase: 3,
  reviewOwner: PHASE_REVIEW_OWNER,
  gateIds: ['SG07', 'SG08', 'SG09'],
  keyLinks: [
    { label: 'Study Protocol', href: '/registers/reg/studyProtocolSetup' },
    // Deliberately unmapped: neither the Evidence Summary board nor the Product
    // Evidence Summary register is called "Evidence Register", and pointing at
    // the wrong one is worse than pointing nowhere.
    { label: 'Evidence Register' },
    { label: 'Test Report Index', href: '/registers/reg/testReportIndex' },
    { label: 'GMP Links', href: '/registers/reg/gmpLinks' },
  ],
  checklistSections: [
    {
      key: 'testingFamilies',
      title: 'Testing Families / Release Test Routes',
      gate: '08-09',
      ownerFunction: 'Quality / R&I',
      options: [
        'Stability - accelerated', 'Stability - real time', 'Microbiological quality',
        'PET / preservative efficacy', 'Pack compatibility',
        'pH / viscosity / appearance', 'Heavy metals', 'Residual solvents',
        '1,4-dioxane', 'Nitrosamines / NDELA', 'PAH', 'Pesticides / herbicides',
        'Safety / irritation / tolerance', 'Maternal / vulnerable-user review',
        'Efficacy / potency retention', 'Sensory / user trial',
        'Transport / leakage', 'Pilot batch / scale-up',
        'Validated internal method required', 'Other (Please Describe)',
      ],
    },
  ],
  requirementSections: [
    {
      key: 'skincareForTwo',
      title: 'Skincare for Two - Mandatory Safety Checks',
      rows: [
        { gate: '07', requirement: 'Pregnancy & breastfeeding review', minimum: 'Mandatory for maternal products', rationale: 'Maternal use is a defined vulnerable-use context', owner: 'Safety' },
        { gate: '07', requirement: 'Infant/baby contact exposure', minimum: 'Assess skin-to-skin, residue transfer, nipple/breast contact and indirect exposure', rationale: 'Baby contact is considered from the start', owner: 'Safety' },
        { gate: '07', requirement: 'Dermal exposure / MOS logic', minimum: 'Route, concentration, frequency, body area and limit/MOS conclusion recorded', rationale: 'Needed for HCP/distributor confidence', owner: 'Safety' },
        { gate: '07', requirement: 'Prohibited ingredient check', minimum: 'Complete Prohibited_Ingredients and attach evidence', rationale: 'Proves absence of banned/high-risk substances', owner: 'Regulatory' },
        { gate: '07', requirement: 'Caution-limit check', minimum: 'Complete PB_Caution_Limits and document formula status', rationale: 'Concentration-based validation', owner: 'Safety' },
        { gate: '07', requirement: 'Medical summary input', minimum: 'Complete summary fields required for HCP/distributor pack', rationale: 'Creates ready-to-answer output', owner: 'Project owner' },
      ],
    },
    {
      key: 'humanStudy',
      title: 'Human / Consumer Study and Method Validation Checks',
      rows: [
        { gate: '08', requirement: 'Study protocol required?', minimum: 'Required if human, clinical, consumer, tolerance or efficacy evidence is claimed', rationale: 'Prevents unsupported or informal claims', owner: 'Study owner' },
        { gate: '08', requirement: 'Participant number justified', minimum: 'Target participant number and sample-size rationale recorded', rationale: 'Supports stronger product claims', owner: 'Study owner' },
        { gate: '08', requirement: 'Approval trail', minimum: 'Proposal, Head/HOD sign-off and independent reviewer sign-off saved', rationale: 'Independent paper trail', owner: 'Project owner' },
        { gate: '08', requirement: 'Consent and recruitment log', minimum: 'Participant information, consent and coded registry saved', rationale: 'Paper trail and participant protection', owner: 'Study owner' },
        { gate: '08', requirement: 'AE / stop rules', minimum: 'Adverse event pathway, stop rules and escalation contact defined', rationale: 'Safety control', owner: 'Quality / Safety' },
        { gate: '08', requirement: 'Final report', minimum: 'Participant count, deviations, data location and claim conclusion recorded', rationale: 'Evidence usable by HCP/distributor', owner: 'Study owner' },
      ],
    },
    {
      key: 'stabilityRelease',
      title: 'Stability / Compatibility / Release Readiness Checks',
      rows: [
        { gate: '09', requirement: 'Stability program selected', minimum: 'Accelerated and/or real-time plan selected with acceptance criteria', rationale: 'Supports shelf-life and PIF readiness', owner: 'Quality' },
        { gate: '09', requirement: 'Preservation / microbiology checks selected', minimum: 'Micro/PET pathway selected or justified as N/A', rationale: 'Controls microbiological risk', owner: 'Quality' },
        { gate: '09', requirement: 'Pack compatibility assessed', minimum: 'Pack compatibility, leakage, transport or interaction testing selected', rationale: 'Confirms package protects product', owner: 'Packaging / Quality' },
        { gate: '09', requirement: 'Release readiness risks closed', minimum: 'Open stability, micro, pack and pilot-batch blockers closed or conditionally accepted', rationale: 'Prevents uncontrolled launch', owner: 'Quality / Manufacturing' },
        { gate: '09', requirement: 'Retest or CAPA pathway defined', minimum: 'Retest, deviation or CAPA actions assigned where required', rationale: 'Makes failures visible and traceable', owner: 'Quality' },
      ],
    },
    {
      key: 'pregnancySafety',
      title: 'Compartment 1 - Pregnancy Safety & Characteristics',
      rows: [
        { gate: '07', requirement: 'PRG-01 Pregnancy suitability decision', minimum: 'State whether product is suitable / cautioned / not recommended during pregnancy', rationale: 'Defined vulnerable-use context; must not be assumed safe', owner: 'Safety' },
        { gate: '07', requirement: 'PRG-02 Ingredient caution-limit check (pregnancy)', minimum: 'Each active/retinoid/salicylate/essential-oil checked vs pregnancy caution limits', rationale: 'Concentration-based validation for maternal use', owner: 'Safety / Regulatory' },
        { gate: '07', requirement: 'PRG-03 Prohibited / restricted actives', minimum: 'Confirm absence of pregnancy-contraindicated actives (e.g. retinoids, high-dose salicylic)', rationale: 'Proves absence of high-risk substances', owner: 'Regulatory' },
        { gate: '07', requirement: 'PRG-04 Dermal exposure / MOS (pregnancy)', minimum: 'Route, body area, frequency, concentration and MOS conclusion recorded', rationale: 'HCP/distributor confidence for maternal claim', owner: 'Safety' },
        { gate: '07', requirement: 'PRG-05 Fragrance / allergen review', minimum: 'IFRA + allergen review appropriate for pregnancy sensitivity', rationale: 'Heightened sensory sensitivity in pregnancy', owner: 'R&I / Regulatory' },
        { gate: '07', requirement: 'PRG-06 Claim wording control (pregnancy)', minimum: 'Approved maternal wording; no implied medical/therapeutic claim', rationale: 'Prevents unsupported maternal claims', owner: 'Claims / Regulatory' },
        { gate: '07', requirement: 'PRG-07 Label / PIF statement', minimum: 'Pregnancy usage statement matches released label and PIF', rationale: 'Consistency between label, PIF and evidence', owner: 'Regulatory' },
        { gate: '07', requirement: 'PRG-08 Sign-off (pregnancy compartment)', minimum: 'Prepared / reviewed / independent sign-off recorded', rationale: 'Controlled approval trail', owner: 'Safety / HOD' },
      ],
    },
    {
      key: 'breastfeedingSafety',
      title: 'Compartment 2 - Breastfeeding Safety & Characteristics',
      rows: [
        { gate: '07', requirement: 'BF-01 Breastfeeding suitability decision', minimum: 'State suitable / cautioned / not recommended while breastfeeding', rationale: 'Maternal use with infant proximity', owner: 'Safety' },
        { gate: '07', requirement: 'BF-02 Nipple / breast-contact exposure', minimum: 'Assess residue transfer and indirect infant ingestion risk if applied near breast', rationale: 'Infant indirect exposure control', owner: 'Safety' },
        { gate: '07', requirement: 'BF-03 Ingredient caution-limit check (lactation)', minimum: 'Actives checked vs breastfeeding caution limits', rationale: 'Concentration-based validation', owner: 'Safety / Regulatory' },
        { gate: '07', requirement: 'BF-04 Skin-to-skin / residue transfer', minimum: 'Residue transfer to infant skin during feeding/holding assessed', rationale: 'Baby contact considered from the start', owner: 'Safety' },
        { gate: '07', requirement: 'BF-05 Fragrance / essential-oil review', minimum: 'Confirm no essential oils/fragrance contraindicated near infant', rationale: 'Infant respiratory/skin sensitivity', owner: 'R&I / Regulatory' },
        { gate: '07', requirement: 'BF-06 Claim wording control (breastfeeding)', minimum: 'Approved wording; no medical lactation claim', rationale: 'Prevents unsupported claims', owner: 'Claims / Regulatory' },
        { gate: '07', requirement: 'BF-07 Label / PIF statement (breastfeeding)', minimum: 'Breastfeeding usage statement matches label and PIF', rationale: 'Consistency control', owner: 'Regulatory' },
      ],
    },
    {
      key: 'infantSafety',
      title: 'Compartment 3 - Infant / Baby-Contact Safety & Characteristics',
      rows: [
        { gate: '07', requirement: 'INF-01 Infant-contact use context', minimum: 'State whether infant skin contact is intended, incidental or to be avoided', rationale: 'Skincare-for-Two mandatory baby-contact consideration', owner: 'Safety' },
        { gate: '07', requirement: 'INF-02 Infant dermal exposure / MOS', minimum: 'Body area, frequency, occlusion and infant-adjusted MOS recorded', rationale: 'Infant skin more permeable; needs own margin', owner: 'Safety' },
        { gate: '07', requirement: 'INF-03 Ingestion / hand-to-mouth risk', minimum: 'Assess incidental ingestion if product on hands/skin infant may mouth', rationale: 'Realistic infant behaviour control', owner: 'Safety' },
        { gate: '07', requirement: 'INF-04 Sensitiser / allergen screen (infant)', minimum: 'Confirm actives/fragrance appropriate for infant-adjacent contact', rationale: 'Infant sensitisation prevention', owner: 'Safety / R&I' },
        { gate: '07', requirement: 'INF-05 pH / barrier compatibility', minimum: 'Product pH and barrier impact suitable for infant skin contact', rationale: 'Infant barrier protection', owner: 'Quality / R&I' },
        { gate: '07', requirement: 'INF-06 Eye / mucous-membrane safety (infant)', minimum: 'Eye-safe zone confirmed for infant-contact scenario', rationale: 'Infant eye protection', owner: 'Safety / Quality' },
        { gate: '07', requirement: 'INF-07 Claim wording control (infant)', minimum: 'Approved wording; no infant medical claim', rationale: 'Prevents unsupported infant claims', owner: 'Claims / Regulatory' },
        { gate: '07', requirement: 'INF-08 Label / PIF statement (infant)', minimum: 'Infant-contact statement matches label and PIF', rationale: 'Consistency control', owner: 'Regulatory' },
      ],
    },
    {
      key: 'swimmerSafety',
      title: 'Compartment 4 - Swimmer Safety & Characteristics',
      rows: [
        { gate: '07', requirement: 'SWM-01 Water resistance', minimum: 'Water-resistance duration tested and stated (e.g. 40/80 min per method)', rationale: 'Substantiates water-resistant performance claim', owner: 'Quality / R&I' },
        { gate: '07', requirement: 'SWM-02 Sweat resistance', minimum: 'Sweat/perspiration resistance assessed under exertion conditions', rationale: 'Real swimmer/athlete use context', owner: 'Quality / R&I' },
        { gate: '07', requirement: 'SWM-03 Chlorine (pool) exposure', minimum: 'Formula stability and skin safety after chlorinated-water exposure', rationale: 'Pool-water interaction control', owner: 'Quality / Safety' },
        { gate: '07', requirement: 'SWM-04 Salt-water (ocean) exposure', minimum: 'Formula stability and skin safety after salt-water exposure', rationale: 'Ocean use context control', owner: 'Quality / Safety' },
        { gate: '07', requirement: 'SWM-05 UV / SPF interaction', minimum: 'SPF value, broad-spectrum and photostability tested per method', rationale: 'Sun-exposure performance and safety', owner: 'Quality / Regulatory' },
        { gate: '07', requirement: 'SWM-06 Photostability', minimum: 'Actives remain stable and safe under UV after water exposure', rationale: 'Prevents degradation to unsafe/inactive state', owner: 'Quality / R&I' },
        { gate: '07', requirement: 'SWM-07 Eye-sting / eye-safe zone (swimmer)', minimum: 'Confirm no eye-sting and eye-safe zone under wet/run-off conditions', rationale: 'Swimmer eye exposure from run-off', owner: 'Safety / Quality' },
        { gate: '07', requirement: 'SWM-08 Wash-off / re-apply guidance', minimum: 'Re-application interval after towelling/water defined on label', rationale: 'Correct swimmer usage control', owner: 'Regulatory / Claims' },
        { gate: '07', requirement: 'SWM-09 Reef-safe / environmental claim', minimum: 'Substantiate any reef-safe / oxybenzone-free / environmental claim', rationale: 'No greenwashing; substantiated eco claim', owner: 'Regulatory / Claims' },
        { gate: '07', requirement: 'SWM-10 Marine / aquatic tolerance', minimum: 'Skin tolerance confirmed after combined water+UV+abrasion exposure', rationale: 'Combined real-world swimmer stress', owner: 'Safety' },
        { gate: '07', requirement: 'SWM-11 Pack / dispenser water ingress', minimum: 'Pack integrity and dispensing after wet/sandy handling', rationale: 'Swimmer pack performance', owner: 'Packaging / Quality' },
        { gate: '07', requirement: 'SWM-12 Claim wording control (swimmer)', minimum: 'All swimmer performance claims mapped to evidence and approved wording', rationale: 'Prevents unsupported performance claims', owner: 'Claims / Regulatory' },
        { gate: '07', requirement: 'SWM-13 Label / PIF statement (swimmer)', minimum: 'Swimmer usage + water-resistance statement matches label and PIF', rationale: 'Consistency control', owner: 'Regulatory' },
        { gate: '07', requirement: 'SWM-14 Sign-off (swimmer compartment)', minimum: 'Prepared / reviewed / independent sign-off recorded', rationale: 'Controlled approval trail', owner: 'Safety / HOD' },
      ],
    },
  ],
  keyGateChecks: [
    { gate: '07', check: 'Safety/tolerance questions defined and vulnerable-user risks reviewed' },
    // Round 4 question 5 (2026-08-24), option (b), added 2026-08-29 — the only
    // Key Gate Check row in this config that does not come from the workbook.
    // Gate 7 needs a GENERAL restricted-and-caution assessment for every product,
    // and the maternal row below is explicitly "an additional conditional layer"
    // on top of it. This row is the record that somebody looked; the findings go
    // in the General Restricted & Caution Assessment register. Without it, a
    // product with no restricted ingredient would be indistinguishable from one
    // nobody screened — an empty register cannot tell those apart, which is the
    // same reason `criticalSafetyFindings` leans on the Final Safety Sign-off.
    { gate: '07', check: 'General restricted and caution ingredient assessment completed' },
    { gate: '07', check: 'Pregnancy/breastfeeding and baby-contact screen completed where triggered' },
    { gate: '07', check: 'Restrictions, conditions and safety evidence linked' },
    { gate: '08', check: 'Testing families selected and methods/protocols referenced' },
    { gate: '08', check: 'Validation report linked or placeholder/action used' },
    { gate: '08', check: 'Acceptance criteria, results and CAPA pathway defined' },
    { gate: '09', check: 'Stability, preservation/micro and pack compatibility program selected' },
    { gate: '09', check: 'Pilot/scale-up and release criteria assessed' },
    { gate: '09', check: 'Release readiness risks closed or conditionally accepted' },
  ],
};

export const PHASE_4: PhaseConfig = {
  phase: 4,
  reviewOwner: PHASE_REVIEW_OWNER,
  gateIds: ['SG10', 'SG11', 'SG12'],
  keyLinks: [
    { label: 'PIF Checklist', href: '/registers/reg/pifChecklistAsean' },
    { label: 'Published Info Approval', href: '/registers/reg/publishedInfoApproval' },
    // Change Control is a cross-project page, so it is not under /projects/:id.
    { label: 'Change Control', href: '/change-control', absolute: true },
    { label: 'Post-Market Log', href: '/post-market' },
  ],
  checklistSections: [
    {
      key: 'regulatoryClosure',
      title: 'Regulatory / Claims Closure Checks',
      gate: '10',
      ownerFunction: 'Regulatory / Claims',
      options: [
        'Artwork/label route required', 'Product classification checked',
        'Claims wording review required', 'Disease / therapeutic risk screen',
        'Label compliance check', 'Ingredient restrictions reviewed',
        'Allergen declaration needed', 'PIF / evidence file link needed',
        'Authority submission needed', 'Registration needed',
        'Distributor evidence pack', 'Sales FAQ / approved wording',
        'Disclosure / limitation wording', 'Other (Please Describe)',
      ],
    },
    {
      key: 'productionRecords',
      title: 'Production / Launch Records',
      gate: '11',
      ownerFunction: 'Manufacturing / Quality',
      options: [
        'Product record', 'Formula version', 'Raw material records',
        'Packaging item records', 'Packaging set', 'LOI / INCI export',
        'GMP batch record + in-process QC', 'PIF / dossier export',
        'Formula version + process controls', 'MRP / shortages', 'QA test group',
        'Batch ticket', 'Pack-out / release', 'GMP deviation / CAPA trigger',
      ],
    },
    {
      key: 'postMarketSources',
      title: 'Post-Market / PV-PMS Feedback Sources',
      gate: '12',
      ownerFunction: 'Quality / PV-PMS',
      options: [
        'Consumer feedback', 'HCP feedback', 'Distributor feedback',
        'Retailer feedback', 'Sales feedback', 'Social media feedback',
        'Complaint', 'Adverse event / PV signal', 'PMS trend', 'Claim question',
        'Packaging issue', 'Formula issue', 'Quality issue', 'FAQ update',
        'CAPA', 'Product optimisation',
      ],
    },
  ],
  requirementSections: [
    {
      key: 'dossierEvidence',
      title: 'Dossier / HCP Evidence Checks',
      rows: [
        { gate: '10', requirement: 'ASEAN PIF mapped', minimum: 'Complete ASEAN_PIF_Map and PIF_Checklist_ASEAN', rationale: 'Regulatory dossier completeness', owner: 'Regulatory' },
        { gate: '10', requirement: 'Product Safety Summary', minimum: 'Complete Medical_Summary safety sections', rationale: 'Ready-to-answer output', owner: 'Safety' },
        { gate: '10', requirement: 'Ingredient Risk Table', minimum: 'Prohibited + caution ingredient conclusions complete', rationale: 'Answers distributor/HCP risk questions', owner: 'Safety / Regulatory' },
        { gate: '10', requirement: 'Substitution Table', minimum: 'Ingredient_Substitution complete where relevant', rationale: 'Answers ingredient substitution questions', owner: 'R&I / Safety' },
        { gate: '10', requirement: 'Efficacy evidence summary', minimum: 'Human, in-vitro/ex-vivo, clinical/literature and internal evidence summarised', rationale: 'Answers efficacy proof questions', owner: 'R&I / Study owner' },
        { gate: '10', requirement: 'Approved HCP wording', minimum: 'Explain evidence without unsupported pregnancy-safe or therapeutic labels', rationale: 'Controls external wording', owner: 'Regulatory / Marketing' },
        { gate: '10', requirement: 'PIF/CPSR export-ready', minimum: 'Dossier package reviewed and approved', rationale: 'Market/distributor readiness', owner: 'Regulatory' },
        { gate: '10', requirement: 'Country-specific restrictions', minimum: 'Vietnam/ASEAN/EU/Australia/US wording checked as applicable', rationale: 'Claim and advertising control', owner: 'Regulatory' },
      ],
    },
    {
      key: 'changeControlClosure',
      title: 'Change Control / Communication Closure Checks',
      rows: [
        { gate: 'ALL', requirement: 'Change trigger opened', minimum: 'Change control record opened for artwork, formula, label, claim, supplier or process change', rationale: 'Prevents silent corrections', owner: 'Project owner / QA' },
        { gate: 'ALL', requirement: 'Old-vs-new impact assessed', minimum: 'Affected SKU, market, claim, PIF, safety, efficacy, cost, stock and launch impact assessed', rationale: 'Makes impact visible', owner: 'Relevant function owner' },
        { gate: 'ALL', requirement: 'Approval and communication completed', minimum: 'Required functions approved and Sales/Marketing notified where customer-facing', rationale: 'Controls external messages', owner: 'Project owner' },
        { gate: 'ALL', requirement: 'Obsolete versions controlled', minimum: 'Old artwork/formula/claim/deck versions withdrawn or superseded', rationale: 'Prevents wrong-file use', owner: 'QA / Document owner' },
        { gate: 'ALL', requirement: 'Published information approved', minimum: 'Public, pharmacy, HCP or distributor wording approved before use', rationale: 'Avoids unsupported claims', owner: 'Regulatory / Marketing' },
        { gate: 'ALL', requirement: 'Closure evidence saved', minimum: 'Final file links, approvals, communication evidence and closure notes saved', rationale: 'Completes audit trail', owner: 'Project owner' },
      ],
    },
  ],
  keyGateChecks: [
    { gate: '10', check: 'Evidence hierarchy applied and claims wording checked' },
    { gate: '10', check: 'Countries/regulatory pathway matched and PIF/evidence file mapped' },
    { gate: '10', check: 'Approved wording / limitations recorded' },
    { gate: '11', check: 'Final formula/version, packaging and artwork approved' },
    { gate: '11', check: 'Production records ready and GMP links added' },
    { gate: '11', check: 'Launch sign-off completed and blockers recorded' },
    { gate: '12', check: 'Feedback sources monitored and PV/PMS signals classified' },
    { gate: '12', check: 'Complaints/issues triaged and CAPA/improvement actions assigned' },
    { gate: '12', check: 'Loopback to NPD or change control recorded where needed' },
  ],
};

export const PHASE_CONFIGS: Record<number, PhaseConfig> = {
  1: PHASE_1,
  2: PHASE_2,
  3: PHASE_3,
  4: PHASE_4,
};
