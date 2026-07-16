export interface ChecklistSectionConfig {
  key: string;
  title: string;
  gate: string;
  ownerFunction: string;
  options: string[];
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
}

export interface KeyGateCheckConfig {
  gate: string;
  check: string;
}

export interface PhaseConfig {
  phase: number;
  gateIds: string[];
  checklistSections: ChecklistSectionConfig[];
  requirementSections: RequirementSectionConfig[];
  keyGateChecks: KeyGateCheckConfig[];
  reviewOwner?: string;
}

// Review owner transcribed from the source workbook's "REVIEW OWNER" header row.
// All four phase sheets share the same owner.
const PHASE_REVIEW_OWNER = 'Kaukab (Facility / PM Operations) · Co-sign: Chris (Project Manager)';

export const PHASE_1: PhaseConfig = {
  phase: 1,
  reviewOwner: PHASE_REVIEW_OWNER,
  gateIds: ['SG01', 'SG02', 'SG03'],
  checklistSections: [
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
      options: [
        'Cream', 'Lotion', 'Balm', 'Serum', 'Oil', 'Body oil', 'Hair oil', 'Wash',
        'Body wash', 'Shower gel', 'Shampoo', '2-in-1 wash', 'Spray', 'Mist',
        'Feminine wash', 'Perineal product', 'Nipple product', 'Toothpaste', 'Gel',
        'Ointment', 'Cleanser', 'Moisturiser', 'Barrier product',
        'Scar / blemish product', 'Insect bite / itch product',
        'Raw material / extract', 'Other - specify',
      ],
    },
    {
      key: 'targetUsers',
      title: 'Target Users / Life Stage',
      gate: '02',
      ownerFunction: 'Marketing / Regulatory',
      options: [
        'General adult', 'Pregnancy', 'Breastfeeding', 'Postpartum', 'Infant 0+',
        'Child 2+', 'Child 3+', 'Sensitive skin', 'Dry / eczema-prone skin',
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
  requirementSections: [],
  keyGateChecks: [
    { gate: '01', check: 'Product request, opportunity and requester captured' },
    { gate: '01', check: 'Initial project record opened and owner assigned' },
    { gate: '01', check: 'Initial constraints, known deadlines and risk flags recorded' },
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
