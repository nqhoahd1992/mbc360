import type { RegisterRow } from '../types';

export type ColumnType = 'text' | 'textarea' | 'select' | 'date' | 'checkbox' | 'number';

export interface RegisterColumn {
  key: string;
  label: string;
  type: ColumnType;
  width?: number;
  options?: readonly string[];
  editable?: boolean; // default true; false = static reference text from the source sheet
}

export interface RegisterConfig {
  key: string;
  title: string;
  sheetName: string;
  description?: string;
  mode: 'register' | 'fixed'; // register = user adds/removes rows; fixed = predefined rows
  gate?: string;
  columns: RegisterColumn[];
  fixedRows?: RegisterRow[];
  reviewOwner?: string; // "REVIEW OWNER" header transcribed from the source workbook
}

const WORK_STATUS_OPTIONS = ['Not Started', 'In Progress', 'Completed', 'On Hold', 'Backtracked'] as const;
const YNNA = ['Y', 'N', 'N/A'] as const;

// ---------------------------------------------------------------------------
// Category 1: Ingredient & Supplier Safety (Gate 04/07)
// ---------------------------------------------------------------------------

const supplierRmEvidence: RegisterConfig = {
  key: 'supplierRmEvidence',
  title: 'Supplier & Raw Material Evidence',
  sheetName: 'Supplier_RM_Evidence',
  description: 'Capture supplier documents once per material and link them into Formulation_Safety and PIF.',
  mode: 'register',
  gate: '04',
  columns: [
    { key: 'rmCode', label: 'RM code', type: 'text', width: 90 },
    { key: 'inciName', label: 'Ingredient / INCI', type: 'text', width: 180 },
    { key: 'approvedForUse', label: 'Approved for use?', type: 'checkbox', width: 90 },
    { key: 'supplier', label: 'Supplier', type: 'text', width: 140 },
    { key: 'grade', label: 'Grade / trade name', type: 'text', width: 140 },
    { key: 'sdsLink', label: 'SDS link', type: 'text', width: 120 },
    { key: 'coaLink', label: 'CoA link', type: 'text', width: 120 },
    { key: 'tdsLink', label: 'TDS / spec link', type: 'text', width: 120 },
    { key: 'allergenStatement', label: 'Allergen statement', type: 'text', width: 150 },
    { key: 'impurities', label: 'Impurities / heavy metals', type: 'text', width: 150 },
    { key: 'microInfo', label: 'Micro / preservative info', type: 'text', width: 150 },
    { key: 'originProof', label: 'Origin / vegan / natural proof', type: 'text', width: 160 },
    { key: 'regulatoryStatus', label: 'Regulatory status', type: 'text', width: 150 },
    { key: 'owner', label: 'Owner', type: 'text', width: 130 },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 200 },
  ],
};

const prohibitedIngredients: RegisterConfig = {
  key: 'prohibitedIngredients',
  title: 'Prohibited Ingredient Watch-list',
  sheetName: 'Prohibited_Ingredients',
  description: 'Product-specific absence proof. Regulatory must confirm current market status before release.',
  mode: 'fixed',
  gate: '07',
  columns: [
    { key: 'ingredientGroup', label: 'Ingredient / group', type: 'text', width: 170, editable: false },
    { key: 'functionRole', label: 'Function', type: 'text', width: 150, editable: false },
    { key: 'statusLevel', label: 'Status / level', type: 'text', width: 200, editable: false },
    { key: 'whyItMatters', label: 'Why it matters', type: 'text', width: 220, editable: false },
    { key: 'applicableProducts', label: 'Applicable products', type: 'text', width: 160, editable: false },
    {
      key: 'productStatus',
      label: 'Product status',
      type: 'select',
      width: 200,
      options: [
        'No formula match recorded',
        'Not present - evidence linked',
        'Present within restriction',
        'REVIEW - possible formula match',
        'Prohibited - remove',
        'Needs Regulatory Review',
      ],
    },
    { key: 'formulaMatchCount', label: 'Formula match count', type: 'number', width: 90 },
    { key: 'evidenceLink', label: 'Evidence link', type: 'text', width: 140 },
    { key: 'owner', label: 'Owner', type: 'text', width: 110 },
    { key: 'linkedGate', label: 'Linked gate', type: 'text', width: 130, editable: false },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 200 },
  ],
  fixedRows: [
    { ingredientGroup: 'Parabens', functionRole: 'Preservatives', statusLevel: 'Restricted; example levels include 0.4% individually / 0.14% combined', whyItMatters: 'Endocrine and reproductive-health concerns for longer-chain parabens', applicableProducts: 'All cosmetics', productStatus: 'No formula match recorded', formulaMatchCount: 0, owner: 'Regulatory', linkedGate: '04_Ingredient_Screening', notes: 'Confirm current market limits before release.' },
    { ingredientGroup: 'Phthalates', functionRole: 'Plasticizers / solvents / fragrance stabilizers', statusLevel: 'Restricted/prohibited for DEHP, DBP, DIBP, BBP under REACH classification', whyItMatters: 'Endocrine disruption and reproductive toxicity concerns', applicableProducts: 'Fragrances, nail polish, sprays, washes, lotions', productStatus: 'No formula match recorded', formulaMatchCount: 0, owner: 'Regulatory', linkedGate: '04_Ingredient_Screening', notes: 'Check fragrance and packaging-contact documents.' },
    { ingredientGroup: 'Cyclomethicone D4/D5/D6', functionRole: 'Emollients / solvents', statusLevel: 'D4 banned; D5/D6 restricted in some contexts', whyItMatters: 'Bioaccumulation, reproductive and PBT/vPvB concerns', applicableProducts: 'Wash-off and leave-on cosmetics', productStatus: 'No formula match recorded', formulaMatchCount: 0, owner: 'Regulatory', linkedGate: '04_Ingredient_Screening', notes: 'Check exact substance and product type.' },
    { ingredientGroup: 'Triclosan', functionRole: 'Preservative / antimicrobial', statusLevel: 'Restricted in specific product types', whyItMatters: 'Endocrine/thyroid and fetal neurodevelopment concerns', applicableProducts: 'Toothpaste, soaps, deodorants, nail products', productStatus: 'No formula match recorded', formulaMatchCount: 0, owner: 'Regulatory', linkedGate: '04_Ingredient_Screening', notes: 'Confirm product-specific permissibility.' },
    { ingredientGroup: 'Benzophenone', functionRole: 'UV filter / light stabilizer / fragrance ingredient', statusLevel: 'Prohibited/restricted in some markets', whyItMatters: 'Carcinogenicity, endocrine activity and transfer concerns', applicableProducts: 'Sunscreens, anti-ageing creams, fragrances', productStatus: 'No formula match recorded', formulaMatchCount: 0, owner: 'Regulatory', linkedGate: '04_Ingredient_Screening', notes: 'Also review oxybenzone/BP-3 caution rows.' },
    { ingredientGroup: 'Methanol', functionRole: 'Denaturant', statusLevel: 'Restricted level in denatured alcohol systems', whyItMatters: 'Neurotoxicity and placental-transfer concern', applicableProducts: 'Products containing denatured alcohol', productStatus: 'No formula match recorded', formulaMatchCount: 0, owner: 'Regulatory', linkedGate: '04_Ingredient_Screening', notes: 'Check CoA/specification.' },
    { ingredientGroup: 'Heavy metals Pb Hg Cd As', functionRole: 'Contaminants / impurities', statusLevel: 'Prohibited; trace limits vary by market', whyItMatters: 'Neurotoxicity, nephrotoxicity, carcinogenicity', applicableProducts: 'All cosmetics', productStatus: 'No formula match recorded', formulaMatchCount: 0, owner: 'Quality', linkedGate: '04_Ingredient_Screening', notes: 'Attach CoA or finished-product heavy metal report.' },
    { ingredientGroup: 'Lilial BMHCA', functionRole: 'Fragrance ingredient', statusLevel: 'Prohibited in EU and high concern for maternal use', whyItMatters: 'Reproductive toxicity classification and breast milk concern', applicableProducts: 'Fragranced cosmetics', productStatus: 'No formula match recorded', formulaMatchCount: 0, owner: 'Regulatory', linkedGate: '04_Ingredient_Screening', notes: 'Attach fragrance declaration.' },
    { ingredientGroup: 'Retinol Retinyl Palmitate Tretinoin', functionRole: 'Anti-ageing active', statusLevel: 'Restricted; pregnancy caution / contraindicated in some markets', whyItMatters: 'Teratogenicity and cumulative exposure concerns', applicableProducts: 'Body lotions, face creams, serums', productStatus: 'No formula match recorded', formulaMatchCount: 0, owner: 'Regulatory / Safety', linkedGate: '07_Maternal_Baby_Safety', notes: 'Assess with PB_Caution_Limits and label warnings.' },
    { ingredientGroup: '4-Methylbenzylidene Camphor 4-MBC', functionRole: 'UV filter', statusLevel: 'Prohibited/restricted in some markets', whyItMatters: 'Endocrine disruption and breast milk detection', applicableProducts: 'Sunscreens, SPF day creams', productStatus: 'No formula match recorded', formulaMatchCount: 0, owner: 'Regulatory', linkedGate: '04_Ingredient_Screening', notes: 'Confirm exact market status.' },
    { ingredientGroup: 'Formaldehyde releasers', functionRole: 'Preservative / hardening agent', statusLevel: 'Prohibited/restricted as preservative depending on market', whyItMatters: 'Carcinogenicity, sensitisation and reproductive concerns', applicableProducts: 'Hair straightening, eyelash glues, preserved products', productStatus: 'No formula match recorded', formulaMatchCount: 0, owner: 'Regulatory / Safety', linkedGate: '04_Ingredient_Screening', notes: 'Check preservative system and supplier declaration.' },
    { ingredientGroup: 'Bisphenol S', functionRole: 'Plasticizer / stabilizer', statusLevel: 'Prohibited/restricted in some contexts', whyItMatters: 'Endocrine/reproductive toxicity concern', applicableProducts: 'Packaging-contact risk, nail products, coatings', productStatus: 'No formula match recorded', formulaMatchCount: 0, owner: 'Regulatory', linkedGate: '06_Packaging_Artwork', notes: 'Review packaging-contact evidence.' },
  ],
};

const pbCautionLimits: RegisterConfig = {
  key: 'pbCautionLimits',
  title: 'Pregnancy / Breastfeeding Caution Limits',
  sheetName: 'PB_Caution_Limits',
  description: 'Product-specific concentration and exposure check for maternal products.',
  mode: 'fixed',
  gate: '07',
  columns: [
    { key: 'ingredientGroup', label: 'Ingredient / group', type: 'text', width: 190, editable: false },
    { key: 'functionRole', label: 'Function', type: 'text', width: 160, editable: false },
    { key: 'statusLimitGuidance', label: 'Status / default limit guidance', type: 'text', width: 220, editable: false },
    { key: 'whyCautionRequired', label: 'Why caution is required', type: 'text', width: 220, editable: false },
    { key: 'applicableProducts', label: 'Applicable products', type: 'text', width: 160, editable: false },
    {
      key: 'productStatus',
      label: 'Product status',
      type: 'select',
      width: 200,
      options: [
        'Not assessed',
        'Not present',
        'Within limit - evidence linked',
        'Exceeds limit - reformulate',
        'Needs Safety Review',
        'Needs Regulatory Review',
      ],
    },
    { key: 'formulaExposure', label: 'Formula % / exposure', type: 'text', width: 130 },
    { key: 'evidenceLink', label: 'Evidence link', type: 'text', width: 140 },
    { key: 'owner', label: 'Owner', type: 'text', width: 130 },
    { key: 'linkedGate', label: 'Linked gate', type: 'text', width: 150, editable: false },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 200 },
  ],
  fixedRows: [
    { ingredientGroup: 'Oxybenzone (Benzophenone-3)', functionRole: 'Chemical UV filter', statusLimitGuidance: 'Caution; mineral alternatives often preferred for pregnancy positioning', whyCautionRequired: 'Systemic absorption, breast milk detection and endocrine activity concern', applicableProducts: 'Sunscreens, SPF moisturizers', productStatus: 'Not assessed', owner: 'Regulatory / Safety', linkedGate: '07_Maternal_Baby_Safety', notes: 'Record exact % and market limits.' },
    { ingredientGroup: 'Homosalate', functionRole: 'Chemical UV filter', statusLimitGuidance: 'Restricted/caution in some markets', whyCautionRequired: 'Endocrine and systemic absorption concerns', applicableProducts: 'SPF face products', productStatus: 'Not assessed', owner: 'Regulatory / Safety', linkedGate: '07_Maternal_Baby_Safety', notes: 'Check current SCCS/market status.' },
    { ingredientGroup: 'Hydroquinone', functionRole: 'Skin-lightening active', statusLimitGuidance: 'Caution/avoid pregnancy; high absorption concern', whyCautionRequired: 'High dermal absorption and insufficient pregnancy data', applicableProducts: 'Melasma/brightening products', productStatus: 'Not assessed', owner: 'Regulatory / Safety', linkedGate: '07_Maternal_Baby_Safety', notes: 'Use substitution sheet if excluded.' },
    { ingredientGroup: 'Essential oils', functionRole: 'Fragrance / therapeutic / antimicrobial', statusLimitGuidance: 'Caution; specify exact oil and level', whyCautionRequired: 'Placental transfer potential and specific oil concerns', applicableProducts: 'Fragranced skincare, body oils', productStatus: 'Not assessed', owner: 'Safety / R&I', linkedGate: '07_Maternal_Baby_Safety', notes: 'Attach IFRA/allergen details.' },
    { ingredientGroup: 'Caffeine topical', functionRole: 'Antioxidant / vasoconstrictor', statusLimitGuidance: 'Caution; consider total caffeine exposure', whyCautionRequired: 'Cumulative exposure with dietary caffeine', applicableProducts: 'Eye/body/scalp products', productStatus: 'Not assessed', owner: 'Safety', linkedGate: '07_Maternal_Baby_Safety', notes: 'Record MoS/exposure rationale.' },
    { ingredientGroup: 'Arnica montana', functionRole: 'Anti-inflammatory / anti-bruising botanical', statusLimitGuidance: 'Caution; topical only; avoid near nipples', whyCautionRequired: 'Neonatal/breastfeeding transfer and sensitisation concern', applicableProducts: 'Anti-bruising creams, massage balms', productStatus: 'Not assessed', owner: 'Safety', linkedGate: '07_Maternal_Baby_Safety', notes: 'Define use-area restrictions.' },
    { ingredientGroup: 'BHT', functionRole: 'Antioxidant / stabiliser', statusLimitGuidance: 'Caution; check current max and endocrine review', whyCautionRequired: 'Systemic organ effects at high doses and weak endocrine signal', applicableProducts: 'Moisturisers, SPF, lip products', productStatus: 'Not assessed', owner: 'Safety / Regulatory', linkedGate: '07_Maternal_Baby_Safety', notes: 'Attach concentration justification.' },
    { ingredientGroup: 'BHA', functionRole: 'Antioxidant / preservative', statusLimitGuidance: 'Caution; low permitted level contexts', whyCautionRequired: 'Carcinogenicity/endocrine/reproductive concerns', applicableProducts: 'Leave-on skincare, lip balms', productStatus: 'Not assessed', owner: 'Safety / Regulatory', linkedGate: '07_Maternal_Baby_Safety', notes: 'Attach concentration justification.' },
    { ingredientGroup: 'Kojic acid', functionRole: 'Brightening active', statusLimitGuidance: 'Caution; check current limit', whyCautionRequired: 'Limited pregnancy data and endocrine thyroid concern', applicableProducts: 'Brightening/melasma products', productStatus: 'Not assessed', owner: 'Safety / Regulatory', linkedGate: '07_Maternal_Baby_Safety', notes: 'Assess if safer substitute exists.' },
    { ingredientGroup: 'Licorice root extract', functionRole: 'Brightening / soothing botanical', statusLimitGuidance: 'Caution; check glycyrrhizin content', whyCautionRequired: 'Placental cortisol-barrier mechanism and oral-exposure literature', applicableProducts: 'Brightening/soothing products', productStatus: 'Not assessed', owner: 'Safety / R&I', linkedGate: '07_Maternal_Baby_Safety', notes: 'Attach botanical spec and active content.' },
    { ingredientGroup: 'Salicylic acid / salicylates', functionRole: 'BHA exfoliant / anti-acne', statusLimitGuidance: 'Caution; topical limits and product type matter', whyCautionRequired: 'Dermal absorption, breast milk transfer and high-dose literature', applicableProducts: 'Acne, toners, cleansers', productStatus: 'Not assessed', owner: 'Safety / Regulatory', linkedGate: '07_Maternal_Baby_Safety', notes: 'Assess total salicylate exposure.' },
    { ingredientGroup: 'Glycerin for vulvovaginal use', functionRole: 'Humectant / solvent', statusLimitGuidance: 'Caution for intimate products', whyCautionRequired: 'Vaginal epithelial permeability/osmotic concern', applicableProducts: 'Feminine washes/intimate products', productStatus: 'Not assessed', owner: 'Safety / R&I', linkedGate: '07_Maternal_Baby_Safety', notes: 'Only relevant to intimate-use products.' },
  ],
};

const ingredientSubstitution: RegisterConfig = {
  key: 'ingredientSubstitution',
  title: 'Ingredient Substitution Evidence',
  sheetName: 'Ingredient_Substitution',
  description: 'Use only when an ingredient is excluded, replaced or materially changed.',
  mode: 'register',
  gate: '04/07',
  columns: [
    { key: 'triggerIngredient', label: 'Trigger ingredient', type: 'text', width: 160 },
    { key: 'reason', label: 'Reason for substitution', type: 'text', width: 180 },
    { key: 'proposedSubstitute', label: 'Proposed substitute', type: 'text', width: 160 },
    { key: 'functionReplaced', label: 'Function replaced', type: 'text', width: 140 },
    { key: 'requiredProof', label: 'Required proof', type: 'text', width: 160 },
    { key: 'formulaImpact', label: 'Formula impact', type: 'text', width: 150 },
    { key: 'safetyImpact', label: 'Safety impact', type: 'text', width: 150 },
    { key: 'efficacyImpact', label: 'Efficacy / claim impact', type: 'text', width: 160 },
    { key: 'costImpact', label: 'Cost impact', type: 'text', width: 120 },
    { key: 'evidenceLinks', label: 'Evidence links', type: 'text', width: 140 },
    { key: 'decision', label: 'Decision', type: 'text', width: 130 },
    { key: 'owner', label: 'Owner', type: 'text', width: 120 },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 180 },
  ],
};

// ---------------------------------------------------------------------------
// Category 2: Formulation Quality & Stability (Gate 07/08/09)
// ---------------------------------------------------------------------------

const eyeSafetyEvidence: RegisterConfig = {
  key: 'eyeSafetyEvidence',
  title: 'Eye Safety Evidence',
  sheetName: 'Eye_Safety_Evidence',
  description: 'Use where eye-area use, baby-contact use, low-irritation or eye-safe language is claimed.',
  mode: 'register',
  gate: '07/08',
  columns: [
    { key: 'productSku', label: 'Product/SKU', type: 'text', width: 150 },
    { key: 'formulaVersion', label: 'Formula version', type: 'text', width: 110 },
    { key: 'useScenario', label: 'Use scenario', type: 'text', width: 160 },
    { key: 'method', label: 'Method / model', type: 'text', width: 140 },
    { key: 'endpointScore', label: 'Endpoint / score', type: 'text', width: 130 },
    { key: 'safeZoneLimit', label: 'Safe-zone limit', type: 'text', width: 130 },
    { key: 'result', label: 'Result', type: 'text', width: 130 },
    { key: 'conclusion', label: 'Conclusion', type: 'text', width: 150 },
    { key: 'reportLink', label: 'Report link', type: 'text', width: 130 },
    { key: 'rawDataLink', label: 'Raw data link', type: 'text', width: 130 },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'owner', label: 'Owner', type: 'text', width: 120 },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 180 },
  ],
};

const fragranceSafety: RegisterConfig = {
  key: 'fragranceSafety',
  title: 'Fragrance Safety & Allergen Evidence',
  sheetName: 'Fragrance_Safety',
  description: 'Six-step fragrance workflow from supplier selection through post-market surveillance.',
  mode: 'fixed',
  gate: '07',
  columns: [
    { key: 'step', label: 'Step', type: 'text', width: 50, editable: false },
    { key: 'controlPoint', label: 'Control point', type: 'text', width: 180, editable: false },
    { key: 'minimumRequirement', label: 'Minimum requirement', type: 'text', width: 260, editable: false },
    { key: 'evidenceLink', label: 'Evidence link', type: 'text', width: 150 },
    { key: 'owner', label: 'Owner', type: 'text', width: 140, editable: false },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 180 },
  ],
  fixedRows: [
    { step: '1', controlPoint: 'Supplier qualification', minimumRequirement: 'Supplier approved; IFRA/allergen/quality docs available', owner: 'R&I / Procurement' },
    { step: '2', controlPoint: 'Fragrance composition screen', minimumRequirement: 'Prohibited and PB caution ingredients checked', owner: 'Regulatory / Safety' },
    { step: '3', controlPoint: 'IFRA category review', minimumRequirement: 'Applicable category and max use level documented', owner: 'Regulatory' },
    { step: '4', controlPoint: 'Allergen label review', minimumRequirement: 'Allergens and thresholds reviewed for each market', owner: 'Regulatory / Artwork' },
    { step: '5', controlPoint: 'Formula and sensory impact', minimumRequirement: 'Use level, odour profile, stability and compliance checked', owner: 'R&I / Quality' },
    { step: '6', controlPoint: 'Post-market surveillance', minimumRequirement: 'Fragrance complaint/AE trends monitored', owner: 'Quality / PV-PMS' },
  ],
};

const fragranceAllergenLog: RegisterConfig = {
  key: 'fragranceAllergenLog',
  title: 'Fragrance / Allergen Log',
  sheetName: 'Fragrance_Safety',
  description: 'One row per fragrance used — IFRA category, allergen statement and PB caution review.',
  mode: 'register',
  gate: '07',
  columns: [
    { key: 'fragranceCode', label: 'Fragrance code', type: 'text', width: 130 },
    { key: 'supplier', label: 'Supplier', type: 'text', width: 140 },
    { key: 'useLevelPercent', label: 'Use level %', type: 'number', width: 100 },
    { key: 'ifraCategory', label: 'IFRA category', type: 'text', width: 130 },
    { key: 'ifraLink', label: 'IFRA link', type: 'text', width: 120 },
    { key: 'allergenStatementLink', label: 'Allergen statement link', type: 'text', width: 160 },
    { key: 'pbCautionReview', label: 'PB caution review', type: 'text', width: 150 },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 170 },
  ],
};

const microPetEvidence: RegisterConfig = {
  key: 'microPetEvidence',
  title: 'Microbiology & PET Evidence',
  sheetName: 'Micro_PET_Evidence',
  description: 'Capture micro limits, PET/challenge testing and preservation rationale.',
  mode: 'register',
  gate: '08',
  columns: [
    { key: 'productSku', label: 'Product/SKU', type: 'text', width: 150 },
    { key: 'formulaVersion', label: 'Formula version', type: 'text', width: 110 },
    { key: 'batchSample', label: 'Batch / sample', type: 'text', width: 120 },
    { key: 'testType', label: 'Test type', type: 'text', width: 130 },
    { key: 'methodLab', label: 'Method / lab', type: 'text', width: 130 },
    { key: 'acceptanceCriteria', label: 'Acceptance criteria', type: 'text', width: 160 },
    { key: 'resultScore', label: 'Result / score', type: 'text', width: 120 },
    { key: 'conclusion', label: 'Conclusion', type: 'text', width: 150 },
    { key: 'reportLink', label: 'Report link', type: 'text', width: 130 },
    { key: 'rawDataLink', label: 'Raw data link', type: 'text', width: 130 },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'owner', label: 'Owner', type: 'text', width: 120 },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 180 },
  ],
};

const stabilityRelease: RegisterConfig = {
  key: 'stabilityRelease',
  title: 'Stability, Compatibility & Release Evidence',
  sheetName: 'Stability_Release',
  description: 'Use for accelerated/real-time stability, package compatibility and final release decisions.',
  mode: 'register',
  gate: '09',
  columns: [
    { key: 'productSku', label: 'Product/SKU', type: 'text', width: 150 },
    { key: 'formulaVersion', label: 'Formula version', type: 'text', width: 110 },
    { key: 'packComponent', label: 'Pack / component', type: 'text', width: 130 },
    { key: 'batch', label: 'Batch', type: 'text', width: 100 },
    { key: 'condition', label: 'Condition', type: 'text', width: 120 },
    { key: 'timepoint', label: 'Timepoint', type: 'text', width: 100 },
    { key: 'parameter', label: 'Parameter', type: 'text', width: 120 },
    { key: 'acceptanceCriteria', label: 'Acceptance criteria', type: 'text', width: 150 },
    { key: 'result', label: 'Result', type: 'text', width: 120 },
    { key: 'reportLink', label: 'Report link', type: 'text', width: 130 },
    { key: 'releaseDecision', label: 'Release decision', type: 'text', width: 140 },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'owner', label: 'Owner', type: 'text', width: 120 },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 180 },
  ],
};

const potencyProcessControl: RegisterConfig = {
  key: 'potencyProcessControl',
  title: 'Potency & Process Control Evidence',
  sheetName: 'Potency_Process_Control',
  description: 'Control supply quality, active markers, heat/light/oxygen/pH/process risks and GMP evidence.',
  mode: 'register',
  gate: '05/08',
  columns: [
    { key: 'ingredientActive', label: 'Ingredient / active', type: 'text', width: 150 },
    { key: 'marker', label: 'Marker or critical attribute', type: 'text', width: 170 },
    { key: 'riskFactor', label: 'Risk factor', type: 'text', width: 150 },
    { key: 'targetSpec', label: 'Target / spec', type: 'text', width: 130 },
    { key: 'processControl', label: 'Process control', type: 'text', width: 150 },
    { key: 'testMethod', label: 'Test / method', type: 'text', width: 130 },
    { key: 'supplierGmpEvidence', label: 'Supplier/GMP evidence', type: 'text', width: 160 },
    { key: 'batchEvidenceLink', label: 'Batch evidence link', type: 'text', width: 140 },
    { key: 'impactOnClaim', label: 'Impact on claim', type: 'text', width: 140 },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 180 },
  ],
};

// ---------------------------------------------------------------------------
// Category 3: Efficacy & Claims Evidence (Gate 03/08/10)
// ---------------------------------------------------------------------------

const mechanismClaimsMap: RegisterConfig = {
  key: 'mechanismClaimsMap',
  title: 'Mechanism & Claims Evidence Map',
  sheetName: 'Mechanism_Claims_Map',
  description: 'Map each claim to the underlying problem, mechanism, ingredients, evidence level and approved wording.',
  mode: 'register',
  gate: '03/10',
  columns: [
    { key: 'claim', label: 'Claim / benefit', type: 'text', width: 160 },
    { key: 'userProblem', label: 'User problem', type: 'text', width: 160 },
    { key: 'mechanism', label: 'Mechanism of action', type: 'text', width: 180 },
    { key: 'keyIngredient', label: 'Key ingredient / technology', type: 'text', width: 170 },
    { key: 'formulaProcessControl', label: 'Formula/process control', type: 'text', width: 170 },
    { key: 'evidenceLevel', label: 'Evidence level', type: 'text', width: 140 },
    { key: 'evidenceLink', label: 'Evidence link', type: 'text', width: 130 },
    { key: 'approvedWording', label: 'Approved wording / limitation', type: 'textarea', width: 200 },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 180 },
  ],
};

const twinkle5ClaimsMap: RegisterConfig = {
  key: 'twinkle5ClaimsMap',
  title: 'Twinkle 5 Claims Map',
  sheetName: 'Twinkle5_Claims_Map',
  description: 'Connect skin-quality principles to evidence and claim controls.',
  mode: 'fixed',
  gate: '03/10',
  columns: [
    { key: 'principle', label: 'Principle', type: 'text', width: 130, editable: false },
    { key: 'plainBenefit', label: 'Plain-English benefit', type: 'text', width: 200, editable: false },
    { key: 'allowedWording', label: 'Allowed wording', type: 'textarea', width: 200 },
    { key: 'evidenceType', label: 'Evidence type', type: 'text', width: 140 },
    { key: 'evidenceLink', label: 'Evidence link', type: 'text', width: 140 },
    { key: 'limitations', label: 'Limitations / do-not-say', type: 'textarea', width: 200 },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 160 },
  ],
  fixedRows: [
    { principle: 'Barrier', plainBenefit: 'Skin barrier support / comfort' },
    { principle: 'Hydration', plainBenefit: 'Water retention / moisturisation' },
    { principle: 'Texture', plainBenefit: 'Smoothness / softness / sensory' },
    { principle: 'Tone / appearance', plainBenefit: 'Even-looking skin / glow' },
    { principle: 'Protection', plainBenefit: 'Support against environmental stressors' },
  ],
};

const efficacyAssurance: RegisterConfig = {
  key: 'efficacyAssurance',
  title: 'Efficacy Assurance Control',
  sheetName: 'Efficacy_Assurance',
  description: 'Checks whether efficacy is controlled as clearly as safety, before claim approval.',
  mode: 'fixed',
  gate: '05/08',
  columns: [
    { key: 'controlRoute', label: 'Control route', type: 'text', width: 180, editable: false },
    { key: 'minimumRequirement', label: 'Minimum requirement', type: 'text', width: 260, editable: false },
    { key: 'primaryEvidenceSource', label: 'Primary evidence source', type: 'text', width: 200, editable: false },
    { key: 'evidenceLink', label: 'Evidence link', type: 'text', width: 140 },
    { key: 'owner', label: 'Owner', type: 'text', width: 140, editable: false },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 180 },
  ],
  fixedRows: [
    { controlRoute: 'Formula efficacy route', minimumRequirement: 'Formula contains mechanism-relevant ingredients at justified levels', primaryEvidenceSource: 'Formula_BOM; Mechanism_Claims_Map', owner: 'R&I' },
    { controlRoute: 'Ingredient evidence route', minimumRequirement: 'Ingredient evidence is relevant to dose, format and use area', primaryEvidenceSource: 'Supplier_RM_Evidence; literature/evidence link', owner: 'R&I / Claims' },
    { controlRoute: 'Process/potency route', minimumRequirement: 'Active markers and process conditions protect efficacy', primaryEvidenceSource: 'Potency_Process_Control', owner: 'R&I / Manufacturing' },
    { controlRoute: 'Functional testing route', minimumRequirement: 'In-vitro/in-use assay proves the functional outcome', primaryEvidenceSource: 'Functional_Efficacy; Test_Report_Index', owner: 'Quality / R&I' },
    { controlRoute: 'Human evidence route', minimumRequirement: 'Human or consumer evidence supports user-facing claims', primaryEvidenceSource: 'Clinical_Human_Evidence; Study_Protocol', owner: 'Clinical / R&I' },
    { controlRoute: 'Approved wording route', minimumRequirement: 'Claim wording matches evidence strength and limitations', primaryEvidenceSource: 'Published_Info_Approval; SKU_Claims_PIF_Register', owner: 'Regulatory / Claims' },
  ],
};

const functionalEfficacy: RegisterConfig = {
  key: 'functionalEfficacy',
  title: 'Functional Efficacy Evidence',
  sheetName: 'Functional_Efficacy',
  description: 'Record controlled functional assay evidence (e.g. chlorine reduction, moisture retention).',
  mode: 'register',
  gate: '08/10',
  columns: [
    { key: 'productSku', label: 'Product/SKU', type: 'text', width: 150 },
    { key: 'claimEndpoint', label: 'Claim / endpoint', type: 'text', width: 160 },
    { key: 'method', label: 'Method', type: 'text', width: 130 },
    { key: 'comparator', label: 'Comparator / control', type: 'text', width: 140 },
    { key: 'acceptanceCriteria', label: 'Acceptance criteria', type: 'text', width: 150 },
    { key: 'result', label: 'Result', type: 'text', width: 120 },
    { key: 'conclusion', label: 'Conclusion', type: 'text', width: 140 },
    { key: 'reportLink', label: 'Report link', type: 'text', width: 130 },
    { key: 'rawDataLink', label: 'Raw data link', type: 'text', width: 130 },
    { key: 'approvedWording', label: 'Approved wording', type: 'textarea', width: 180 },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'owner', label: 'Owner', type: 'text', width: 120 },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 160 },
  ],
};

const clinicalHumanEvidence: RegisterConfig = {
  key: 'clinicalHumanEvidence',
  title: 'Clinical / Human Evidence',
  sheetName: 'Clinical_Human_Evidence',
  description: 'Use for human, consumer, HCP or in-use evidence. Participant details live in Study_Protocol.',
  mode: 'register',
  gate: '08/10',
  columns: [
    { key: 'evidenceId', label: 'Evidence ID', type: 'text', width: 100 },
    { key: 'productSku', label: 'Product/SKU', type: 'text', width: 140 },
    { key: 'studyProtocol', label: 'Study / protocol', type: 'text', width: 140 },
    { key: 'claimSupported', label: 'Claim supported', type: 'text', width: 150 },
    { key: 'design', label: 'Design', type: 'text', width: 130 },
    { key: 'population', label: 'Population', type: 'text', width: 130 },
    { key: 'endpoint', label: 'Endpoint', type: 'text', width: 130 },
    { key: 'result', label: 'Result', type: 'text', width: 130 },
    { key: 'acceptanceBenchmark', label: 'Acceptance / benchmark', type: 'text', width: 160 },
    { key: 'safetyFindings', label: 'Safety findings', type: 'text', width: 150 },
    { key: 'reportLink', label: 'Report link', type: 'text', width: 130 },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'owner', label: 'Owner', type: 'text', width: 120 },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 160 },
  ],
};

const studyProtocolSetup: RegisterConfig = {
  key: 'studyProtocolSetup',
  title: 'Study Protocol Setup',
  sheetName: 'Study_Protocol',
  description: 'Approval route: Prepare study proposal, Head/HOD sign-off, then independent reviewer sign-off outside the department.',
  mode: 'fixed',
  gate: '08',
  columns: [
    { key: 'protocolItem', label: 'Protocol item', type: 'text', width: 170, editable: false },
    { key: 'plannedValue', label: 'Planned value / requirement', type: 'textarea', width: 240 },
    { key: 'evidenceLink', label: 'Evidence link', type: 'text', width: 140 },
    { key: 'owner', label: 'Owner', type: 'text', width: 140, editable: false },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 180 },
  ],
  fixedRows: [
    { protocolItem: 'Study objective', owner: 'R&I / Clinical' },
    { protocolItem: 'Claim / question', evidenceLink: 'Mechanism_Claims_Map', owner: 'Claims owner' },
    { protocolItem: 'Study design', owner: 'Clinical / R&I' },
    { protocolItem: 'Sample size rationale', owner: 'Clinical' },
    { protocolItem: 'Inclusion / exclusion', owner: 'Clinical' },
    { protocolItem: 'Endpoint / measurement', owner: 'R&I / Quality' },
    { protocolItem: 'Safety / AE monitoring', owner: 'Clinical / Quality' },
    { protocolItem: 'Data handling / report', owner: 'Clinical' },
  ],
};

const studyParticipantLog: RegisterConfig = {
  key: 'studyParticipantLog',
  title: 'Participant / Sample Log',
  sheetName: 'Study_Protocol',
  description: 'One row per participant/sample. Consent, coded registry and AE tracking.',
  mode: 'register',
  gate: '08',
  columns: [
    { key: 'participantId', label: 'Participant / sample ID', type: 'text', width: 130 },
    { key: 'demographicGroup', label: 'Demographic group', type: 'text', width: 140 },
    { key: 'consentLink', label: 'Consent / ethics link', type: 'text', width: 150 },
    { key: 'inclusionStatus', label: 'Inclusion status', type: 'text', width: 130 },
    { key: 'baselineDetails', label: 'Baseline details', type: 'text', width: 150 },
    { key: 'visitTimepoint', label: 'Visit / timepoint', type: 'text', width: 130 },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'aeIssue', label: 'AE / issue', type: 'text', width: 140 },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 160 },
  ],
};

const efficacyStudyPlan: RegisterConfig = {
  key: 'efficacyStudyPlan',
  title: 'Efficacy Study Plan',
  sheetName: 'Efficacy_Study_Plan',
  description: 'Use when claims need proof beyond ingredient rationale. Link the final protocol/report.',
  mode: 'register',
  gate: '08',
  columns: [
    { key: 'claimEndpoint', label: 'Claim / endpoint', type: 'text', width: 150 },
    { key: 'studyType', label: 'Study type', type: 'text', width: 130 },
    { key: 'methodInstrument', label: 'Method / instrument', type: 'text', width: 150 },
    { key: 'comparator', label: 'Comparator / control', type: 'text', width: 140 },
    { key: 'samplePlan', label: 'Sample / participant plan', type: 'text', width: 160 },
    { key: 'acceptanceCriteria', label: 'Acceptance criteria', type: 'text', width: 150 },
    { key: 'timeline', label: 'Timeline', type: 'text', width: 120 },
    { key: 'protocolLink', label: 'Protocol link', type: 'text', width: 130 },
    { key: 'reportLink', label: 'Report link', type: 'text', width: 130 },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 160 },
  ],
};

const testReportIndex: RegisterConfig = {
  key: 'testReportIndex',
  title: 'Test Report Index',
  sheetName: 'Test_Report_Index',
  description: 'Record method, score, acceptance limit, conclusion and final report link for every controlled report.',
  mode: 'register',
  gate: 'ALL',
  columns: [
    { key: 'reportId', label: 'Report ID', type: 'text', width: 100 },
    { key: 'productSku', label: 'Product/SKU', type: 'text', width: 140 },
    { key: 'evidenceType', label: 'Evidence type', type: 'text', width: 130 },
    { key: 'testStudyName', label: 'Test / study name', type: 'text', width: 150 },
    { key: 'methodProtocol', label: 'Method / protocol', type: 'text', width: 140 },
    { key: 'endpoint', label: 'Endpoint', type: 'text', width: 120 },
    { key: 'acceptanceCriteria', label: 'Acceptance criteria', type: 'text', width: 150 },
    { key: 'resultScore', label: 'Result / score', type: 'text', width: 120 },
    { key: 'conclusion', label: 'Conclusion', type: 'text', width: 140 },
    { key: 'reportLink', label: 'Report link', type: 'text', width: 130 },
    { key: 'rawDataLink', label: 'Raw data link', type: 'text', width: 130 },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'owner', label: 'Owner', type: 'text', width: 120 },
    { key: 'linkedGate', label: 'Linked gate', type: 'text', width: 100 },
    { key: 'pifAttached', label: 'PIF attached?', type: 'select', width: 90, options: YNNA },
  ],
};

// ---------------------------------------------------------------------------
// Category 4: Packaging, Artwork & Change Triggers (Gate 06/09/11)
// ---------------------------------------------------------------------------

const packagingSpecsArtwork: RegisterConfig = {
  key: 'packagingSpecsArtwork',
  title: 'Packaging Specs & Artwork Evidence',
  sheetName: 'Packaging_Specs_Artwork',
  description: 'Development evidence for planned package/artwork (not the change log).',
  mode: 'register',
  gate: '06/10/11',
  columns: [
    { key: 'component', label: 'Component', type: 'text', width: 140 },
    { key: 'materialConstruction', label: 'Material / construction', type: 'text', width: 150 },
    { key: 'supplier', label: 'Supplier', type: 'text', width: 130 },
    { key: 'specLink', label: 'Spec link', type: 'text', width: 120 },
    { key: 'compatibilityEvidence', label: 'Compatibility evidence', type: 'text', width: 160 },
    { key: 'migrationRisk', label: 'Migration/contact risk', type: 'text', width: 160 },
    { key: 'artworkVersion', label: 'Artwork / label version', type: 'text', width: 150 },
    { key: 'packCodeBarcode', label: 'Pack code / barcode', type: 'text', width: 140 },
    { key: 'market', label: 'Market', type: 'text', width: 110 },
    { key: 'evidenceLink', label: 'Evidence link', type: 'text', width: 130 },
    { key: 'approval', label: 'Approval', type: 'text', width: 120 },
    { key: 'owner', label: 'Owner', type: 'text', width: 120 },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 160 },
  ],
};

const artworkChangeControl: RegisterConfig = {
  key: 'artworkChangeControl',
  title: 'Artwork Change Control',
  sheetName: 'Artwork_Change_Control',
  description: 'Use only when artwork, label, carton, pack copy, proof or printer file changes.',
  mode: 'fixed',
  gate: '06/10/11',
  columns: [
    { key: 'trigger', label: 'Trigger / event', type: 'text', width: 170, editable: false },
    { key: 'examples', label: 'Examples', type: 'text', width: 220, editable: false },
    { key: 'immediateAction', label: 'Immediate action', type: 'text', width: 220, editable: false },
    { key: 'personInCharge', label: 'Person in charge', type: 'text', width: 140, editable: false },
    { key: 'requiredSignOffs', label: 'Required sign-offs', type: 'text', width: 180, editable: false },
    { key: 'gateSheetLink', label: 'Gate / sheet link', type: 'text', width: 110, editable: false },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 180 },
  ],
  fixedRows: [
    { trigger: 'Artwork error discovered', examples: 'Wrong wording, typo, ingredient list, warning, barcode or country text', immediateAction: 'Raise Change_Control_Comm; freeze current file; create redline', personInCharge: 'Artwork / Packaging owner', requiredSignOffs: 'Regulatory + Quality + Marketing/Sales where label-facing', gateSheetLink: '06/10/11' },
    { trigger: 'Formula change affects label', examples: 'INCI order, ingredient addition/removal, active level, allergen/fragrance', immediateAction: 'Link Formula_Change_Control and hold label release until formula locked', personInCharge: 'R&I + Artwork owner', requiredSignOffs: 'R&I + Regulatory + QA', gateSheetLink: '05/06/10' },
    { trigger: 'Regulatory or market update', examples: 'New country label requirement, warning, language or symbol', immediateAction: 'Identify affected SKUs/materials and route to review', personInCharge: 'Regulatory owner', requiredSignOffs: 'Regulatory + QA + market owner', gateSheetLink: '10/11' },
    { trigger: 'Marketing/claim copy change', examples: 'New or revised claim/HCP/website/leaflet wording', immediateAction: 'Map claim to evidence; no live use until approved', personInCharge: 'Marketing/Claims owner', requiredSignOffs: 'Regulatory + Scientific Review', gateSheetLink: '03/10' },
  ],
};

const formulaChangeControl: RegisterConfig = {
  key: 'formulaChangeControl',
  title: 'Formula Change Control',
  sheetName: 'Formula_Change_Control',
  description: 'Use for any formula, ingredient, supplier, pH, process, potency or preservation change.',
  mode: 'fixed',
  gate: '05',
  columns: [
    { key: 'trigger', label: 'Formula change trigger', type: 'text', width: 190, editable: false },
    { key: 'examples', label: 'Examples', type: 'text', width: 220, editable: false },
    { key: 'impactAreas', label: 'Potential impact areas', type: 'text', width: 200, editable: false },
    { key: 'mandatoryActions', label: 'Mandatory actions', type: 'text', width: 220, editable: false },
    { key: 'personInCharge', label: 'Person in charge', type: 'text', width: 140, editable: false },
    { key: 'technicalSignOff', label: 'Technical sign-off', type: 'text', width: 150, editable: false },
    { key: 'regQaSignOff', label: 'Reg/QA sign-off', type: 'text', width: 160, editable: false },
    { key: 'salesMarketingRequired', label: 'Sales/Marketing output required', type: 'text', width: 170, editable: false },
    { key: 'oldVersion', label: 'Old version', type: 'text', width: 100 },
    { key: 'newVersion', label: 'New version', type: 'text', width: 100 },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
  ],
  fixedRows: [
    { trigger: 'Ingredient added or removed', examples: 'New active, preservative, fragrance or problematic ingredient removed', impactAreas: 'Safety, efficacy, claims, label INCI, PIF, stability, cost', mandatoryActions: 'Update Formula_BOM; screen safety lists; assess claim and label impact', personInCharge: 'R&I / Formulation', technicalSignOff: 'R&I', regQaSignOff: 'Regulatory + Quality', salesMarketingRequired: 'Yes' },
    { trigger: 'Ingredient percentage or active level changed', examples: 'Active increase/decrease, preservative or humectant balance', impactAreas: 'Efficacy, irritation, preservation, stability, cost', mandatoryActions: 'Re-check claim map, potency controls and evidence need', personInCharge: 'R&I', technicalSignOff: 'R&I / Scientific Review', regQaSignOff: 'Quality + Regulatory where impacted', salesMarketingRequired: 'Yes if claim/label/customer-facing' },
    { trigger: 'pH range or process changed', examples: 'Heat/cool order, addition temperature, homogenisation, hold time', impactAreas: 'Potency, microbiology, stability, repeatability', mandatoryActions: 'Update process instructions and critical control points', personInCharge: 'R&I + Manufacturing', technicalSignOff: 'R&I + Manufacturing', regQaSignOff: 'Quality', salesMarketingRequired: 'If customer-facing' },
    { trigger: 'Supplier/raw material/manufacturer change', examples: 'New supplier, grade, site or manufacturer', impactAreas: 'Contaminants, allergens, potency, claims, cost, supply', mandatoryActions: 'Re-qualify material and compare specs', personInCharge: 'Procurement + R&I', technicalSignOff: 'R&I', regQaSignOff: 'Quality + Regulatory', salesMarketingRequired: 'If story/claim/cost/supply impacted' },
    { trigger: 'Fragrance/allergen/sensory change', examples: 'Perfume changed/removed, essential oil level', impactAreas: 'Allergen declaration, PBW caution, consumer perception', mandatoryActions: 'Update allergen and caution checks; update artwork', personInCharge: 'R&I + Regulatory', technicalSignOff: 'R&I', regQaSignOff: 'Regulatory + Quality', salesMarketingRequired: 'Yes' },
  ],
};

// ---------------------------------------------------------------------------
// Category 5: Regulatory / PIF (Gate 10)
// ---------------------------------------------------------------------------

const aseanPifMap: RegisterConfig = {
  key: 'aseanPifMap',
  title: 'ASEAN PIF / Dossier Map',
  sheetName: 'ASEAN_PIF_Map',
  description: 'High-level dossier overview. PIF_Checklist_ASEAN holds the detailed closure checklist.',
  mode: 'fixed',
  gate: '10',
  columns: [
    { key: 'requirement', label: 'PIF / dossier requirement', type: 'text', width: 200, editable: false },
    { key: 'requiredDocument', label: 'Required document / record', type: 'text', width: 240, editable: false },
    { key: 'owner', label: 'Owner', type: 'text', width: 140, editable: false },
    { key: 'locationLink', label: 'Location / link', type: 'text', width: 140 },
    { key: 'linkedGate', label: 'Linked gate', type: 'text', width: 150, editable: false },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 180 },
  ],
  fixedRows: [
    { requirement: 'Part I - Product Summary', requiredDocument: 'Product name, product type, intended use, presentation, responsible person', owner: 'Regulatory', linkedGate: '10_Dossier_Claims', notes: 'Use market-specific template where applicable' },
    { requirement: 'Product notification / acknowledgement', requiredDocument: 'Notification receipt or acknowledgement', owner: 'Regulatory', linkedGate: '10_Dossier_Claims', notes: 'Country-specific' },
    { requirement: 'NIB / company registration', requiredDocument: 'NIB, company registration or equivalent', owner: 'Regulatory', linkedGate: '10_Dossier_Claims', notes: 'Indonesia/market-specific where needed' },
    { requirement: 'Letter of Appointment / authorisation', requiredDocument: 'LoA, importer/distributor authorisation', owner: 'Regulatory / Commercial', linkedGate: '10_Dossier_Claims', notes: 'Required where distributor/agent acts for company' },
    { requirement: 'Ownership confirmation', requiredDocument: 'Brand/product ownership confirmation', owner: 'Regulatory / Legal', linkedGate: '10_Dossier_Claims', notes: 'Attach signed ownership/authority file' },
    { requirement: 'Formula / composition', requiredDocument: 'Full formula, INCI, % range, function and supplier', owner: 'R&I', linkedGate: '05_Formula_BOM_Costing', notes: 'Formula_BOM must be current' },
    { requirement: 'Manufacturing method', requiredDocument: 'Process flow, manufacturing instruction, batch record link', owner: 'Manufacturing / Quality', linkedGate: '11_Launch_SignOff', notes: 'Controlled manufacturing version' },
    { requirement: 'GMP evidence', requiredDocument: 'GMP certificate, site evidence, manufacturer qualification', owner: 'Quality', linkedGate: '11_Launch_SignOff', notes: 'Link site qualification' },
    { requirement: 'Safety assessment / CPSR', requiredDocument: 'Safety assessment and toxicological review', owner: 'Safety / Regulatory', linkedGate: '07_Maternal_Baby_Safety', notes: 'Use Formulation_Safety' },
    { requirement: 'Raw material documentation', requiredDocument: 'SDS, CoA, TDS/spec, allergens, impurities, heavy metals', owner: 'R&I / Procurement', linkedGate: '04_Ingredient_Screening', notes: 'Use Supplier_RM_Evidence' },
    { requirement: 'Stability and compatibility', requiredDocument: 'Accelerated/real-time stability, pack compatibility', owner: 'Quality / R&I', linkedGate: '09_Stability_Release', notes: 'Attach protocol and report' },
    { requirement: 'Micro / PET / preservative efficacy', requiredDocument: 'Micro specs, PET/challenge, preservation rationale', owner: 'Quality', linkedGate: '08_Testing_Validation', notes: 'Required for aqueous/preserved products' },
    { requirement: 'Packaging and artwork', requiredDocument: 'Label, carton, component specs and artwork approval', owner: 'Packaging / Regulatory', linkedGate: '06_Packaging_Artwork', notes: 'Country-specific label checks' },
    { requirement: 'Claim substantiation', requiredDocument: 'Claim matrix, clinical/literature/internal evidence', owner: 'Marketing / Regulatory / R&I', linkedGate: '03_Concept_Claims', notes: 'Do not approve unsupported claims' },
    { requirement: 'Adverse event / post-market system', requiredDocument: 'Complaint, AE, PV/PMS and CAPA pathway', owner: 'Quality / PV-PMS', linkedGate: '12_PostMarket_Improve', notes: 'Must be live after launch' },
  ],
};

const pifChecklistAsean: RegisterConfig = {
  key: 'pifChecklistAsean',
  title: 'ASEAN PIF Checklist (Closure)',
  sheetName: 'PIF_Checklist_ASEAN',
  description: 'Detailed checklist for PIF closure. Points to the source evidence sheet for each section.',
  mode: 'fixed',
  gate: '10',
  columns: [
    { key: 'pifId', label: 'PIF ID', type: 'text', width: 80, editable: false },
    { key: 'pifSection', label: 'PIF section', type: 'text', width: 160, editable: false },
    { key: 'requirement', label: 'Requirement', type: 'text', width: 240, editable: false },
    { key: 'owner', label: 'Owner', type: 'text', width: 150, editable: false },
    { key: 'evidenceLink', label: 'Evidence link', type: 'text', width: 140 },
    { key: 'gate', label: 'Gate', type: 'text', width: 80, editable: false },
    { key: 'reviewer', label: 'Reviewer', type: 'text', width: 130 },
    { key: 'closureDate', label: 'Closure date', type: 'date', width: 130 },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 160 },
  ],
  fixedRows: [
    { pifId: 'PIF-01', pifSection: 'Product summary', requirement: 'Product name, type, presentation, intended use, markets', owner: 'Regulatory', gate: '10' },
    { pifId: 'PIF-02', pifSection: 'Formula', requirement: 'Full composition, INCI, function, concentration/range', owner: 'R&I / Regulatory', gate: '05/10' },
    { pifId: 'PIF-03', pifSection: 'Safety assessment', requirement: 'Formulation safety assessment and final sign-off', owner: 'Safety / Regulatory', gate: '07/10' },
    { pifId: 'PIF-04', pifSection: 'Raw materials', requirement: 'SDS, CoA, TDS/spec, allergen, impurity evidence', owner: 'R&I / Procurement', gate: '04/10' },
    { pifId: 'PIF-05', pifSection: 'Manufacturing', requirement: 'GMP evidence, manufacturing method, batch record link', owner: 'Quality / Manufacturing', gate: '11' },
    { pifId: 'PIF-06', pifSection: 'Stability', requirement: 'Stability/compatibility reports and release conclusion', owner: 'Quality', gate: '09/10' },
    { pifId: 'PIF-07', pifSection: 'Micro/PET', requirement: 'Micro limits, challenge/PET, preservation rationale', owner: 'Quality', gate: '08/10' },
    { pifId: 'PIF-08', pifSection: 'Packaging/artwork', requirement: 'Label/artwork, component specs, warnings and directions', owner: 'Packaging / Regulatory', gate: '06/10' },
    { pifId: 'PIF-09', pifSection: 'Claims', requirement: 'Claim wording, evidence and limitations', owner: 'Claims / Regulatory', gate: '03/10' },
    { pifId: 'PIF-10', pifSection: 'Post-market', requirement: 'Complaint/AE/CAPA process and live owner', owner: 'Quality / PV-PMS', gate: '12' },
  ],
};

const pifEvidenceExport: RegisterConfig = {
  key: 'pifEvidenceExport',
  title: 'PIF Evidence Export',
  sheetName: 'PIF_Evidence_Export',
  description: 'Export pack used when reports, claims or safety/performance evidence are moved into the product PIF / Product Master File.',
  mode: 'register',
  gate: '10/11',
  columns: [
    { key: 'productSku', label: 'Product/SKU', type: 'text', width: 150 },
    { key: 'market', label: 'Market', type: 'text', width: 110 },
    { key: 'pifSection', label: 'PIF section', type: 'text', width: 140 },
    { key: 'evidenceItem', label: 'Evidence item', type: 'text', width: 160 },
    { key: 'sourceTemplate', label: 'Source template', type: 'text', width: 140 },
    { key: 'sourceEvidenceLink', label: 'Source evidence link', type: 'text', width: 150 },
    { key: 'pifFolderLink', label: 'PIF folder link', type: 'text', width: 140 },
    { key: 'versionDate', label: 'Version / date', type: 'text', width: 110 },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'owner', label: 'Owner', type: 'text', width: 120 },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 160 },
  ],
};

const skuClaimsPifRegister: RegisterConfig = {
  key: 'skuClaimsPifRegister',
  title: 'SKU Claims / PIF Register',
  sheetName: 'SKU_Claims_PIF_Register',
  description: 'Register each SKU-level claim and the PIF evidence that supports it. Blocks external use until closed (see PIF_Evidence_Closure).',
  mode: 'register',
  gate: '03/10',
  columns: [
    { key: 'productSku', label: 'Product/SKU', type: 'text', width: 140 },
    { key: 'market', label: 'Market', type: 'text', width: 110 },
    { key: 'claimWording', label: 'Claim / wording', type: 'textarea', width: 180 },
    { key: 'claimCategory', label: 'Claim category', type: 'text', width: 130 },
    { key: 'evidenceType', label: 'Evidence type', type: 'text', width: 130 },
    { key: 'evidenceSource', label: 'Evidence source', type: 'text', width: 140 },
    { key: 'evidenceLink', label: 'Evidence link', type: 'text', width: 130 },
    { key: 'approvedLimitation', label: 'Approved limitation', type: 'text', width: 160 },
    { key: 'pifLink', label: 'PIF link', type: 'text', width: 120 },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'owner', label: 'Owner', type: 'text', width: 120 },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 160 },
  ],
};

const pifEvidenceClosure: RegisterConfig = {
  key: 'pifEvidenceClosure',
  title: 'PIF Evidence Closure (Workflow)',
  sheetName: 'PIF_Evidence_Closure',
  description: 'Workflow control for moving MBc360 evidence into the PIF / Product Master File. Every trigger here blocks external use until closed.',
  mode: 'fixed',
  gate: '10/11',
  columns: [
    { key: 'trigger', label: 'Trigger', type: 'text', width: 190, editable: false },
    { key: 'requiredAction', label: 'Required action', type: 'text', width: 240, editable: false },
    { key: 'personInCharge', label: 'Person in charge', type: 'text', width: 160, editable: false },
    { key: 'supportingTemplate', label: 'Supporting template / sheet', type: 'text', width: 180, editable: false },
    { key: 'linkedGate', label: 'Linked gate', type: 'text', width: 90, editable: false },
    { key: 'blocksExternalUse', label: 'Blocks external use until closed?', type: 'select', width: 90, options: YNNA, editable: false },
    { key: 'closureEvidence', label: 'Closure evidence', type: 'text', width: 150 },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 160 },
  ],
  fixedRows: [
    { trigger: 'New product launch or new market', requiredAction: 'Open PIF_Evidence_Export; confirm mandatory sections and attachments', personInCharge: 'Regulatory / PIF owner', supportingTemplate: 'PIF_Checklist_ASEAN; PIF_Evidence_Export', linkedGate: '10/11', blocksExternalUse: 'Y' },
    { trigger: 'In-market catch-up review', requiredAction: 'Attach current claims, safety and performance reports to each SKU PIF', personInCharge: 'Regulatory / Project owner', supportingTemplate: 'PIF_Evidence_Export', linkedGate: '10/12', blocksExternalUse: 'Y' },
    { trigger: 'New or changed claim', requiredAction: 'Add claim to SKU_Claims_PIF_Register and attach support', personInCharge: 'Regulatory / Claims owner', supportingTemplate: 'SKU_Claims_PIF_Register', linkedGate: '03/10', blocksExternalUse: 'Y' },
    { trigger: 'New test report', requiredAction: 'Index report and attach to PIF if required', personInCharge: 'R&I / Quality', supportingTemplate: 'Test_Report_Index', linkedGate: '08/10', blocksExternalUse: 'Y' },
    { trigger: 'Formula/supplier/fragrance/pH/process/artwork change', requiredAction: 'Assess evidence validity and update linked PIF records', personInCharge: 'R&I / Regulatory / QA', supportingTemplate: 'Change_Control_Comm', linkedGate: 'ALL', blocksExternalUse: 'Y' },
    { trigger: 'Distributor/pharmacy/HCP question', requiredAction: 'Answer only from approved PMF/PIF evidence and wording', personInCharge: 'Regulatory / Scientific Review', supportingTemplate: 'HCP_Test_Report_Pack', linkedGate: '10/11', blocksExternalUse: 'Y' },
    { trigger: 'Updated public information', requiredAction: 'Check publication approval and attach final record', personInCharge: 'Content owner / Regulatory', supportingTemplate: 'Published_Info_Approval', linkedGate: '10/11', blocksExternalUse: 'Y' },
  ],
};

const publicationRules: RegisterConfig = {
  key: 'publicationRules',
  title: 'Publication Rules',
  sheetName: 'Published_Info_Approval',
  description: 'Reference rules applied by the register below.',
  mode: 'fixed',
  gate: '10/11',
  columns: [
    { key: 'rule', label: 'Publication rule', type: 'text', width: 200, editable: false },
    { key: 'requirement', label: 'Requirement', type: 'text', width: 500, editable: false },
  ],
  fixedRows: [
    { rule: 'What may be published', requirement: 'Only approved wording, terminology, claim category, evidence level, limitation, applicable SKU/market/version and final public link.' },
    { rule: 'What must not be published', requirement: 'Draft data, unsupported superlatives, unreviewed translations, therapeutic implications, raw report excerpts without approved interpretation, confidential formula details or claims without PMF/PIF support.' },
    { rule: 'Minimum sign-off', requirement: 'Content owner, technical/safety reviewer where technical claims are made, regulatory/claims reviewer, quality where safety/release/PIF is affected, brand owner and final approver where required.' },
  ],
};

const publishedInfoApproval: RegisterConfig = {
  key: 'publishedInfoApproval',
  title: 'Published Information Approval',
  sheetName: 'Published_Info_Approval',
  description:
    'Mandatory approval workflow (confirmed rule C6) for ANY information intended for public release — websites, brochures, technical documents, distributor materials, presentations, HCP materials, AI-generated content, social media and product claims. No public information may be released until every workflow step below is completed.',
  mode: 'register',
  gate: '10/11',
  columns: [
    { key: 'recordId', label: 'Record ID', type: 'text', width: 90 },
    { key: 'productSku', label: 'Product/SKU', type: 'text', width: 140 },
    { key: 'materialType', label: 'Material type', type: 'text', width: 130 },
    { key: 'channel', label: 'Channel', type: 'text', width: 130 },
    { key: 'market', label: 'Market', type: 'text', width: 100 },
    { key: 'publishedItem', label: 'Published information item', type: 'text', width: 180 },
    { key: 'audience', label: 'Audience', type: 'text', width: 120 },
    { key: 'claimCategory', label: 'Claim / terminology category', type: 'text', width: 160 },
    { key: 'exactWording', label: 'Exact wording / technical statement', type: 'textarea', width: 220 },
    { key: 'evidenceTypeRequired', label: 'Evidence type required', type: 'text', width: 150 },
    { key: 'evidenceLink', label: 'Evidence / PMF / PIF link', type: 'text', width: 150 },
    // C6 workflow steps — all must be Y before final approval / release.
    { key: 'terminologyChecked', label: '1. Terminology / claims guidance checked', type: 'select', width: 130, options: YNNA },
    { key: 'evidenceVerified', label: '2. Evidence linked & verified', type: 'select', width: 120, options: YNNA },
    { key: 'technicalReview', label: '3. Technical review', type: 'select', width: 110, options: YNNA },
    { key: 'regulatoryReview', label: '4. Regulatory review (where applicable)', type: 'select', width: 130, options: YNNA },
    { key: 'finalApproval', label: '5. Final approval before publication', type: 'select', width: 120, options: YNNA },
    { key: 'allowed', label: 'Allowed?', type: 'select', width: 90, options: YNNA },
    { key: 'requiredReviewers', label: 'Required reviewers / functions', type: 'text', width: 160 },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'dateApproved', label: 'Date approved', type: 'date', width: 120 },
    { key: 'expiryReviewDate', label: 'Expiry / review date', type: 'date', width: 120 },
    { key: 'finalPublishedLink', label: 'Final published link', type: 'text', width: 150 },
    { key: 'notes', label: 'Closure / notes', type: 'textarea', width: 170 },
  ],
};

const medicalSummary: RegisterConfig = {
  key: 'medicalSummary',
  title: 'Medical / Safety Summary',
  sheetName: 'Medical_Summary',
  description: 'Ready-to-answer HCP/distributor evidence pack. Use approved wording and evidence only.',
  mode: 'fixed',
  gate: '10',
  columns: [
    { key: 'summaryItem', label: 'Summary item', type: 'text', width: 190, editable: false },
    { key: 'approvedSummary', label: 'Approved summary', type: 'textarea', width: 240 },
    { key: 'evidenceSource', label: 'Evidence source', type: 'text', width: 190, editable: false },
    { key: 'evidenceLink', label: 'Evidence link', type: 'text', width: 140 },
    { key: 'owner', label: 'Owner', type: 'text', width: 140, editable: false },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 160 },
  ],
  fixedRows: [
    { summaryItem: 'Product identity and use', evidenceSource: 'Stage_Map / Formula_BOM', owner: 'Project owner' },
    { summaryItem: 'Formulation safety conclusion', evidenceSource: 'Formulation_Safety', owner: 'Safety' },
    { summaryItem: 'Pregnancy / breastfeeding position', evidenceSource: 'PB_Caution_Limits', owner: 'Safety / Regulatory' },
    { summaryItem: 'Fragrance/allergen position', evidenceSource: 'Fragrance_Safety', owner: 'Regulatory' },
    { summaryItem: 'Micro/stability/release position', evidenceSource: 'Micro_PET_Evidence; Stability_Release', owner: 'Quality' },
    { summaryItem: 'Adverse event / post-market pathway', evidenceSource: 'PostMarket_CAPA', owner: 'Quality / PV-PMS' },
  ],
};

const hcpEfficacyAnswer: RegisterConfig = {
  key: 'hcpEfficacyAnswer',
  title: 'HCP / Distributor Efficacy Answer',
  sheetName: 'HCP_Efficacy_Answer',
  description: 'Generate answers only from approved evidence and approved wording.',
  mode: 'register',
  gate: '10/11',
  columns: [
    { key: 'question', label: 'Question / objection', type: 'text', width: 180 },
    { key: 'approvedAnswer', label: 'Approved answer', type: 'textarea', width: 220 },
    { key: 'evidenceSource', label: 'Evidence source', type: 'text', width: 150 },
    { key: 'evidenceLink', label: 'Evidence link', type: 'text', width: 130 },
    { key: 'approvedWordingLink', label: 'Approved wording link', type: 'text', width: 150 },
    { key: 'doNotSay', label: 'Do-not-say / limitation', type: 'textarea', width: 180 },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'owner', label: 'Owner', type: 'text', width: 120 },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 150 },
  ],
};

const hcpTestReportPack: RegisterConfig = {
  key: 'hcpTestReportPack',
  title: 'HCP Test Report Pack',
  sheetName: 'HCP_Test_Report_Pack',
  description: 'Compile approved test-report links and plain-English interpretations for distributor/HCP use.',
  mode: 'register',
  gate: '10/11',
  columns: [
    { key: 'packItem', label: 'Pack item', type: 'text', width: 150 },
    { key: 'claimSupported', label: 'Claim / question supported', type: 'text', width: 180 },
    { key: 'reportSource', label: 'Report / evidence source', type: 'text', width: 160 },
    { key: 'interpretation', label: 'Plain-English interpretation', type: 'textarea', width: 220 },
    { key: 'approvedLimitation', label: 'Approved limitation', type: 'text', width: 160 },
    { key: 'pifLink', label: 'PIF / PMF link', type: 'text', width: 130 },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'owner', label: 'Owner', type: 'text', width: 120 },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 150 },
  ],
};

// ---------------------------------------------------------------------------
// Category 6: Change Control Extras & Production Records
// ---------------------------------------------------------------------------

const batchFormulaTrace: RegisterConfig = {
  key: 'batchFormulaTrace',
  title: 'Batch Formula Trace',
  sheetName: 'Batch_Formula_Trace',
  description: 'Link production batch records, formula version and release evidence.',
  mode: 'register',
  gate: '11',
  columns: [
    { key: 'productSku', label: 'Product/SKU', type: 'text', width: 140 },
    { key: 'formulaVersion', label: 'Formula version', type: 'text', width: 110 },
    { key: 'batchLot', label: 'Batch / lot', type: 'text', width: 110 },
    { key: 'manufacturingDate', label: 'Manufacturing date', type: 'date', width: 130 },
    { key: 'masterBomVersion', label: 'Master Formula_BOM version', type: 'text', width: 160 },
    { key: 'actualBatchRecordLink', label: 'Actual batch record link', type: 'text', width: 160 },
    { key: 'deviationCapaLink', label: 'Deviation / CAPA link', type: 'text', width: 150 },
    { key: 'coaReleaseLink', label: 'CoA / release link', type: 'text', width: 140 },
    { key: 'stabilitySampleLink', label: 'Stability sample link', type: 'text', width: 150 },
    { key: 'pifLink', label: 'PIF / PMF link', type: 'text', width: 120 },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'owner', label: 'Owner', type: 'text', width: 120 },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 160 },
  ],
};

const productFamilyRegister: RegisterConfig = {
  key: 'productFamilyRegister',
  title: 'Product Family & Version Register',
  sheetName: 'Product_Family_Register',
  description: 'One family = one consumer-facing product. Every formula change that matters gets a version row.',
  mode: 'register',
  gate: '05/06',
  columns: [
    { key: 'familyName', label: 'Product Family Name', type: 'text', width: 160 },
    { key: 'familyCode', label: 'Family Code', type: 'text', width: 110 },
    { key: 'versionFormulaNo', label: 'Version / Formula No.', type: 'text', width: 140 },
    { key: 'manufacturingProductCode', label: 'Manufacturing Product Code', type: 'text', width: 160 },
    { key: 'formulaVersion', label: 'Formula version (Formula_BOM)', type: 'text', width: 170 },
    { key: 'effectiveDate', label: 'Effective date', type: 'date', width: 120 },
    { key: 'supersededDate', label: 'Superseded date', type: 'date', width: 120 },
    { key: 'currentMarketVersion', label: 'Current market version?', type: 'checkbox', width: 100 },
    { key: 'changeRegisterId', label: 'Change register ID', type: 'text', width: 130 },
    { key: 'marketCommNeeded', label: 'Market communication needed?', type: 'checkbox', width: 100 },
    { key: 'communicatedToMarket', label: 'Communicated to market?', type: 'checkbox', width: 100 },
    { key: 'owner', label: 'Owner', type: 'text', width: 120 },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 170 },
  ],
};

const formulationChangeRegister: RegisterConfig = {
  key: 'formulationChangeRegister',
  title: 'Formulation Change Register (NP Controlled)',
  sheetName: 'Formulation_Change_Register',
  description: 'Every formulation change (preservative system, active up/down, any ingredient) — CEO-mandated. Vietnam needs ~6 months to re-register formula changes.',
  mode: 'register',
  gate: '05/07/10',
  columns: [
    { key: 'changeId', label: 'Change ID', type: 'text', width: 100 },
    { key: 'productFamilySku', label: 'Product Family / SKU', type: 'text', width: 150 },
    { key: 'requestedByNpd', label: 'Change requested by NPD team', type: 'text', width: 160 },
    { key: 'dateRequested', label: 'Date change requested', type: 'date', width: 120 },
    { key: 'approvedByNp', label: 'Approved by NP? (commercial)', type: 'checkbox', width: 100 },
    { key: 'changeTitle', label: 'Change title', type: 'text', width: 160 },
    { key: 'explanation', label: 'Explanation - what changed', type: 'textarea', width: 220 },
    { key: 'reasons', label: 'Reasons', type: 'textarea', width: 180 },
    { key: 'actionNpd', label: 'Action: NPD', type: 'text', width: 140 },
    { key: 'actionReg', label: 'Action: Reg - new registration/label?', type: 'text', width: 170 },
    { key: 'vnRegistrationRequired', label: 'New VN registration required? (~6mo)', type: 'checkbox', width: 110 },
    { key: 'marketCommRequired', label: 'Market communication required?', type: 'checkbox', width: 100 },
    { key: 'communicatedToMarket', label: 'Communicated to market?', type: 'checkbox', width: 100 },
    { key: 'closed', label: 'Closed?', type: 'checkbox', width: 80 },
    { key: 'overallStatus', label: 'Overall status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'npSignOff', label: 'NP sign-off (name)', type: 'text', width: 130 },
  ],
};

const changeTemplates: RegisterConfig = {
  key: 'changeTemplates',
  title: 'Change Templates / Forms',
  sheetName: 'Change_Templates',
  description: 'Copy the relevant section into a controlled form, email or approval workflow when a change is triggered.',
  mode: 'fixed',
  gate: 'ALL',
  columns: [
    { key: 'templateForm', label: 'Template / form', type: 'text', width: 180, editable: false },
    { key: 'useWhen', label: 'Use when', type: 'text', width: 220, editable: false },
    { key: 'approvalRecipients', label: 'Approval / recipients', type: 'text', width: 200, editable: false },
    { key: 'linkedSheets', label: 'Linked sheets', type: 'text', width: 160, editable: false },
    { key: 'status', label: 'Status (adopted?)', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
  ],
  fixedRows: [
    { templateForm: 'Change Request Form', useWhen: 'Any artwork, formula, label, claim, supplier, process or market change', approvalRecipients: 'Project owner plus required technical/QA/regulatory approvers', linkedSheets: 'Change_Control_Comm' },
    { templateForm: 'Artwork Change Sign-off Form', useWhen: 'Artwork/label/carton/proof/pack copy change', approvalRecipients: 'Artwork owner; Regulatory; QA; Marketing/Sales where customer-facing', linkedSheets: 'Artwork_Change_Control' },
    { templateForm: 'Formula Change Comparison Summary', useWhen: 'Formula, ingredient, supplier, pH, process, active or preservative change', approvalRecipients: 'R&I, Quality, Regulatory, Scientific Review, Manufacturing, Sales/Marketing', linkedSheets: 'Formula_Change_Control' },
    { templateForm: 'Sales & Marketing Change Notification', useWhen: 'Formula, label, artwork, claims, sensory or benefit change', approvalRecipients: 'Project owner sends; Sales/Marketing acknowledges', linkedSheets: 'Change_Control_Comm; Medical_Summary' },
    { templateForm: 'Closure Checklist', useWhen: 'Before a change is marked closed', approvalRecipients: 'Change owner; QA/Document Control; Project owner', linkedSheets: 'Change_Control_Comm' },
  ],
};

const gmpLinks: RegisterConfig = {
  key: 'gmpLinks',
  title: 'GMP Manufacturing Links',
  sheetName: 'GMP_Links',
  description: 'Controlled GMP records remain in the GMP manufacturing system — link only, do not recreate them here.',
  mode: 'register',
  gate: '11',
  columns: [
    { key: 'productSku', label: 'Product/SKU', type: 'text', width: 130 },
    { key: 'market', label: 'Market', type: 'text', width: 100 },
    { key: 'manufacturingSite', label: 'Manufacturing site', type: 'text', width: 130 },
    { key: 'gmpSystemRef', label: 'GMP system reference', type: 'text', width: 150 },
    { key: 'gmpFileType', label: 'GMP file type', type: 'text', width: 150 },
    { key: 'gmpFileName', label: 'GMP file / document name', type: 'text', width: 160 },
    { key: 'gmpOwnerSystem', label: 'GMP owner / system', type: 'text', width: 150 },
    { key: 'link', label: 'Link / location', type: 'text', width: 140 },
    { key: 'versionDate', label: 'Version / batch / date', type: 'text', width: 140 },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'linkedGateSheet', label: 'Linked MBc360 gate / sheet', type: 'text', width: 150 },
    { key: 'notes', label: 'Notes / action', type: 'textarea', width: 170 },
  ],
};

// ---------------------------------------------------------------------------
// Category 7: Marketing & Development Records
// ---------------------------------------------------------------------------

const campaignsSocialMedia: RegisterConfig = {
  key: 'campaignsSocialMedia',
  title: 'Social Media & Marketing Campaign Register',
  sheetName: 'Campaigns_Social_Media',
  description: 'Declare every social media post and marketing campaign here (links are the source of truth).',
  mode: 'register',
  gate: '03/11',
  columns: [
    { key: 'campaignPostId', label: 'Campaign / Post ID', type: 'text', width: 120 },
    { key: 'productFamilySku', label: 'Product Family / SKU', type: 'text', width: 150 },
    { key: 'channel', label: 'Channel / platform', type: 'text', width: 130 },
    { key: 'title', label: 'Campaign / post title', type: 'text', width: 160 },
    { key: 'objective', label: 'Objective / message', type: 'text', width: 170 },
    { key: 'link', label: 'Link (URL / asset)', type: 'text', width: 150 },
    { key: 'startDate', label: 'Start date', type: 'date', width: 110 },
    { key: 'endDate', label: 'End date', type: 'date', width: 110 },
    { key: 'owner', label: 'Owner', type: 'text', width: 120 },
    { key: 'linkedChangeId', label: 'Linked Change ID', type: 'text', width: 130 },
    { key: 'claimsApproved', label: 'Claims approved? (Reg)', type: 'checkbox', width: 100 },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 160 },
  ],
};

const productDevelopmentProfile: RegisterConfig = {
  key: 'productDevelopmentProfile',
  title: 'Product / Project Identification',
  sheetName: 'Product_Development_Report',
  description: 'NPD-specific identification fields (most other identity fields already live on Project Identification).',
  mode: 'fixed',
  gate: '04/05/08',
  columns: [
    { key: 'field', label: 'Field', type: 'text', width: 200, editable: false },
    { key: 'value', label: 'Value', type: 'text', width: 260 },
  ],
  fixedRows: [
    { field: 'NPD lead (formulator)' },
    { field: 'Competitor benchmarks', value: 'e.g. Massata, Kangaroo Mommy' },
    { field: 'Overall status' },
  ],
};

const productDevelopmentIterations: RegisterConfig = {
  key: 'productDevelopmentIterations',
  title: 'Development Iteration Log',
  sheetName: 'Product_Development_Report',
  description: 'Each improved formula version and the driving feedback, benchmark or decision behind it.',
  mode: 'register',
  gate: '04/05/08',
  columns: [
    { key: 'iterationNo', label: 'Iteration #', type: 'text', width: 90 },
    { key: 'date', label: 'Date', type: 'date', width: 110 },
    { key: 'formulaVersion', label: 'Formula version', type: 'text', width: 110 },
    { key: 'whatChanged', label: 'What changed (formula / process)', type: 'textarea', width: 200 },
    { key: 'reasonTrigger', label: 'Reason / trigger (feedback source)', type: 'text', width: 180 },
    { key: 'feedbackRef', label: 'Feedback ref', type: 'text', width: 140 },
    { key: 'resultObservation', label: 'Result / observation', type: 'textarea', width: 180 },
    { key: 'decision', label: 'Decision', type: 'text', width: 130 },
    { key: 'nextAction', label: 'Next action', type: 'text', width: 150 },
    { key: 'owner', label: 'Owner', type: 'text', width: 120 },
    { key: 'linkedChangeId', label: 'Linked Change ID', type: 'text', width: 130 },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
  ],
};

const productDevelopmentFeedback: RegisterConfig = {
  key: 'productDevelopmentFeedback',
  title: 'Team Feedback & Competitor Benchmark Notes',
  sheetName: 'Product_Development_Report',
  description: 'Feedback and competitor benchmarking notes that feed the development iteration log.',
  mode: 'register',
  gate: '04/05/08',
  columns: [
    { key: 'date', label: 'Date', type: 'date', width: 110 },
    { key: 'source', label: 'Source (name / dept / market)', type: 'text', width: 170 },
    { key: 'feedbackNote', label: 'Feedback / benchmark note', type: 'textarea', width: 220 },
    { key: 'competitor', label: 'Competitor (if any)', type: 'text', width: 140 },
    { key: 'ourPosition', label: 'Our position vs competitor', type: 'text', width: 170 },
    { key: 'actionTaken', label: 'Action taken / planned', type: 'text', width: 170 },
    { key: 'owner', label: 'Owner', type: 'text', width: 120 },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
  ],
};

// ---------------------------------------------------------------------------
// Formulation_Safety (special composite page — profile + ingredient matrix + sign-off)
// ---------------------------------------------------------------------------

export const formulationSafetyProfile: RegisterConfig = {
  key: 'formulationSafetyProfile',
  title: 'Product Safety Profile',
  sheetName: 'Formulation_Safety',
  description: 'Pulls ingredient, exposure and use-context basics that drive the safety matrix below.',
  mode: 'fixed',
  gate: '07/10',
  columns: [
    { key: 'field', label: 'Field', type: 'text', width: 200, editable: false },
    { key: 'value', label: 'Value', type: 'text', width: 220 },
    { key: 'evidenceLink', label: 'Evidence link', type: 'text', width: 160 },
    { key: 'owner', label: 'Owner', type: 'text', width: 150, editable: false },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 200 },
  ],
  fixedRows: [
    { field: 'Product/SKU', owner: 'Project owner' },
    { field: 'Formula version', owner: 'R&I', notes: 'Must match Formula_BOM.' },
    { field: 'Target user / restriction', value: 'Pregnancy / breastfeeding / baby-contact as applicable', owner: 'Marketing + Safety' },
    { field: 'Use area and leave-on/rinse-off', owner: 'R&I / Regulatory' },
  ],
};

export const formulationSafetyMatrix: RegisterConfig = {
  key: 'formulationSafetyMatrix',
  title: 'Ingredient-Level Safety Matrix',
  sheetName: 'Formulation_Safety',
  description: 'One row per ingredient — mirrors Formula_BOM with prohibited/caution match, irritation and allergen evidence.',
  mode: 'register',
  gate: '07/10',
  columns: [
    { key: 'inciName', label: 'Ingredient / INCI', type: 'text', width: 160 },
    { key: 'percentWw', label: '% w/w', type: 'number', width: 80 },
    { key: 'functionRole', label: 'Function', type: 'text', width: 130 },
    { key: 'supplier', label: 'Supplier', type: 'text', width: 130 },
    { key: 'prohibitedMatch', label: 'Prohibited match', type: 'select', width: 130, options: ['No', 'Borderline', 'Yes'] },
    { key: 'pbCautionMatch', label: 'PB caution match', type: 'select', width: 130, options: ['No', 'Borderline', 'Yes'] },
    { key: 'exposureRationale', label: 'Exposure / MoS rationale', type: 'textarea', width: 180 },
    { key: 'irritationSensitisation', label: 'Irritation / sensitisation', type: 'text', width: 150 },
    { key: 'allergenIfra', label: 'Allergen / IFRA', type: 'text', width: 130 },
    { key: 'impurityProof', label: 'Impurity / heavy metal proof', type: 'text', width: 170 },
    { key: 'evidenceLink', label: 'Evidence link', type: 'text', width: 130 },
    { key: 'safetyDecision', label: 'Safety decision', type: 'text', width: 140 },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 170 },
  ],
};

export const formulationSafetyFinalSignOff: RegisterConfig = {
  key: 'formulationSafetyFinalSignOff',
  title: 'Final Safety Sign-off',
  sheetName: 'Formulation_Safety',
  mode: 'fixed',
  gate: '07/10',
  columns: [
    { key: 'safetyQuestion', label: 'Safety question / gate', type: 'text', width: 200, editable: false },
    { key: 'acceptanceRequirement', label: 'Acceptance requirement', type: 'text', width: 260, editable: false },
    { key: 'requiredEvidence', label: 'Required evidence', type: 'text', width: 200, editable: false },
    { key: 'evidenceLink', label: 'Evidence link', type: 'text', width: 140 },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'owner', label: 'Owner', type: 'text', width: 150, editable: false },
    { key: 'decisionDate', label: 'Decision date', type: 'date', width: 130 },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 170 },
  ],
  fixedRows: [
    { safetyQuestion: 'Formula identity locked', acceptanceRequirement: 'Current formula version and Formula_BOM match', requiredEvidence: 'Formula_BOM / batch formula / version record', owner: 'R&I' },
    { safetyQuestion: 'Toxicology / safety assessment', acceptanceRequirement: 'Safety assessment or CPSR-style rationale covers all ingredients', requiredEvidence: 'Safety assessment link', owner: 'Safety / Regulatory' },
    { safetyQuestion: 'Pregnancy / breastfeeding assessment', acceptanceRequirement: 'PB caution table reviewed and risks addressed', requiredEvidence: 'PB_Caution_Limits + rationale link', owner: 'Safety' },
    { safetyQuestion: 'Baby-contact / nipple-use assessment', acceptanceRequirement: 'Use area, transfer risk and warnings assessed where applicable', requiredEvidence: 'Use scenario / safety rationale', owner: 'Safety / Regulatory' },
    { safetyQuestion: 'Preservation / microbiology', acceptanceRequirement: 'Micro/PET evidence supports formula and pack', requiredEvidence: 'Micro_PET_Evidence / report link', owner: 'Quality' },
    { safetyQuestion: 'Impurities / heavy metals', acceptanceRequirement: 'Supplier CoA or finished test confirms limits', requiredEvidence: 'Supplier_RM_Evidence / report link', owner: 'Quality' },
    { safetyQuestion: 'Fragrance / allergen', acceptanceRequirement: 'IFRA, allergen and PB caution review complete', requiredEvidence: 'Fragrance_Safety link', owner: 'Regulatory / R&I' },
    { safetyQuestion: 'Stability / compatibility', acceptanceRequirement: 'Formula remains safe and in specification across shelf life', requiredEvidence: 'Stability_Release link', owner: 'Quality' },
    { safetyQuestion: 'Label warnings / directions', acceptanceRequirement: 'Safety restrictions transferred to artwork/public wording', requiredEvidence: 'Packaging_Specs_Artwork / Published_Info_Approval', owner: 'Regulatory' },
    { safetyQuestion: 'Final safety release', acceptanceRequirement: 'All safety gaps closed or formally risk-accepted', requiredEvidence: 'Final sign-off link', owner: 'Accountable approver' },
  ],
};

// ---------------------------------------------------------------------------
// Released Label Control (new in V18) — sheet Lily-Released_Label_Ctrl.
// Three blocks share one sheet, mirroring the Formulation_Safety composite.
// ---------------------------------------------------------------------------

const RELEASED_LABEL_OWNER = 'Lily (Packaging) · Anki (Digital / Platforms) · Co-sign: Chris (Project Manager)';

const releasedLabelRegister: RegisterConfig = {
  key: 'releasedLabelRegister',
  title: 'Released Label vs Current Artwork',
  sheetName: 'Lily-Released_Label_Ctrl',
  description: 'What changed / will change, current vs new label, market-release status and 3D asset status. No silent label changes — use Artwork_Change_Control for the formal record.',
  mode: 'register',
  gate: '06/11',
  reviewOwner: RELEASED_LABEL_OWNER,
  columns: [
    { key: 'recordId', label: 'Record ID', type: 'text', width: 100 },
    { key: 'productSku', label: 'Product / SKU', type: 'text', width: 150 },
    { key: 'productCode', label: 'Product code', type: 'text', width: 110 },
    { key: 'changeType', label: 'Change type', type: 'text', width: 130 },
    { key: 'whatChanged', label: 'What has changed / will change', type: 'textarea', width: 220 },
    { key: 'currentLabelVersion', label: 'Current label version', type: 'text', width: 130 },
    { key: 'currentArtworkFile', label: 'Current artwork file', type: 'text', width: 150 },
    { key: 'newLabelVersion', label: 'New label version', type: 'text', width: 130 },
    { key: 'newArtworkFile', label: 'New artwork file', type: 'text', width: 150 },
    { key: 'newLabelReleased', label: 'New label released to market?', type: 'select', width: 120, options: YNNA },
    { key: 'marketReleaseDate', label: 'Market release date', type: 'date', width: 130 },
    { key: 'marketsAffected', label: 'Markets affected', type: 'text', width: 150 },
    { key: 'assetExists', label: '3D asset exists?', type: 'select', width: 110, options: YNNA },
    { key: 'assetLink', label: '3D asset link', type: 'text', width: 130 },
    { key: 'artworkChangeRef', label: 'Artwork_Change_Control ref', type: 'text', width: 160 },
    { key: 'owner', label: 'Owner', type: 'text', width: 120 },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'notes', label: 'Notes / action', type: 'textarea', width: 200 },
  ],
};

const labelPlatformRollout: RegisterConfig = {
  key: 'labelPlatformRollout',
  title: 'Platform Rollout & Stock Confirmation',
  sheetName: 'Lily-Released_Label_Ctrl',
  description: 'Update every platform only when correct new-label stock is available (Anki).',
  mode: 'register',
  gate: '06/11',
  reviewOwner: RELEASED_LABEL_OWNER,
  columns: [
    { key: 'rolloutId', label: 'Rollout ID', type: 'text', width: 100 },
    { key: 'linkedRecordId', label: 'Linked Record ID (Block A)', type: 'text', width: 150 },
    { key: 'productSku', label: 'Product / SKU', type: 'text', width: 150 },
    { key: 'platform', label: 'Platform / channel', type: 'text', width: 140 },
    { key: 'platformUrl', label: 'Platform URL / location', type: 'text', width: 160 },
    { key: 'currentImage', label: 'Current image on platform', type: 'text', width: 160 },
    { key: 'correctArtwork', label: 'Correct new artwork file', type: 'text', width: 160 },
    { key: 'stockAvailable', label: 'New-label stock available?', type: 'select', width: 120, options: YNNA },
    { key: 'stockConfirmedBy', label: 'Stock confirmed by', type: 'text', width: 140 },
    { key: 'oldImageRemoved', label: 'Old image removed?', type: 'select', width: 110, options: YNNA },
    { key: 'imageUpdated', label: 'Image updated on platform?', type: 'select', width: 120, options: YNNA },
    { key: 'dateUpdated', label: 'Date updated', type: 'date', width: 120 },
    { key: 'verifiedBy', label: 'Verified by', type: 'text', width: 130 },
    { key: 'screenshotLink', label: 'Screenshot / evidence link', type: 'text', width: 160 },
    { key: 'owner', label: 'Owner', type: 'text', width: 120 },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 180 },
    { key: 'followUpDate', label: 'Follow-up date', type: 'date', width: 120 },
  ],
};

const labelShipmentVerification: RegisterConfig = {
  key: 'labelShipmentVerification',
  title: 'Shipment Label & Batch Verification',
  sheetName: 'Lily-Released_Label_Ctrl',
  description: 'Every shipment out must record exact batch details and the exact label artwork version.',
  mode: 'register',
  gate: '06/11',
  reviewOwner: RELEASED_LABEL_OWNER,
  columns: [
    { key: 'shipmentId', label: 'Shipment ID', type: 'text', width: 100 },
    { key: 'linkedRecordId', label: 'Linked Record ID (Block A)', type: 'text', width: 150 },
    { key: 'productSku', label: 'Product / SKU', type: 'text', width: 150 },
    { key: 'destination', label: 'Destination / customer / market', type: 'text', width: 180 },
    { key: 'shipDate', label: 'Ship date', type: 'date', width: 120 },
    { key: 'batchNo', label: 'Batch / lot no.', type: 'text', width: 120 },
    { key: 'batchRecordLink', label: 'Batch record link', type: 'text', width: 140 },
    { key: 'labelVersionShipped', label: 'Label artwork version shipped', type: 'text', width: 160 },
    { key: 'labelFileLink', label: 'Label artwork file / proof link', type: 'text', width: 170 },
    { key: 'artworkMatches', label: 'Artwork matches current released label?', type: 'select', width: 130, options: YNNA },
    { key: 'batchMatches', label: 'Batch details match physical stock?', type: 'select', width: 130, options: YNNA },
    { key: 'verifiedBy', label: 'Verified by', type: 'text', width: 130 },
    { key: 'batchTraceRef', label: 'Batch_Formula_Trace ref', type: 'text', width: 160 },
    { key: 'photoLink', label: 'Photo / evidence link', type: 'text', width: 150 },
    { key: 'owner', label: 'Owner', type: 'text', width: 120 },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'holdRelease', label: 'Hold / release', type: 'text', width: 120 },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 180 },
  ],
};

// ---------------------------------------------------------------------------
// System reference sheets (front-matter + feedback) — new in V18.
// ---------------------------------------------------------------------------

const templateIndex: RegisterConfig = {
  key: 'templateIndex',
  title: 'Evidence Template Index',
  sheetName: 'Template_Index',
  description: 'Map of every evidence template: concept, tab, what it captures, when, gate and owner.',
  mode: 'fixed',
  reviewOwner: 'MBc360 Development & Quality System',
  columns: [
    { key: 'concept', label: 'Evidence concept', type: 'text', width: 160, editable: false },
    { key: 'templateTab', label: 'Template tab', type: 'text', width: 180, editable: false },
    { key: 'captured', label: 'Evidence captured', type: 'text', width: 240, editable: false },
    { key: 'whenToComplete', label: 'When to complete', type: 'text', width: 180, editable: false },
    { key: 'gate', label: 'Gate', type: 'text', width: 90, editable: false },
    { key: 'owner', label: 'Owner', type: 'text', width: 160, editable: false },
    { key: 'status', label: 'Status', type: 'select', width: 130, options: WORK_STATUS_OPTIONS },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 220, editable: false },
  ],
  fixedRows: [
    { concept: '1. Commercial costing', templateTab: 'Formula_BOM', captured: 'Formula composition, ingredient cost, evidence links', whenToComplete: 'Complete once per formula version', gate: '05', owner: 'R&I / Finance', notes: 'Feeds Costing_Calc and Formulation_Safety' },
    { concept: '1. Commercial costing', templateTab: 'Packaging_BOM', captured: 'Packaging components, pack cost, spec/artwork links', whenToComplete: 'Complete once per SKU/pack', gate: '06', owner: 'Packaging / Finance', notes: 'Feeds Costing_Calc' },
    { concept: '1. Commercial costing', templateTab: 'Costing_Calc', captured: 'COGS, margin and forecast assumptions', whenToComplete: 'Complete once per SKU scenario', gate: '05', owner: 'Finance / Project owner', notes: 'Inputs only; formulas calculate outputs' },
    { concept: '2. Ingredient evidence', templateTab: 'Supplier_RM_Evidence', captured: 'SDS, CoA, TDS, allergens, origin, impurities', whenToComplete: 'Complete per raw material', gate: '04', owner: 'Procurement / R&I / Quality', notes: 'Links into safety and PIF' },
    { concept: '2. Ingredient evidence', templateTab: 'Prohibited_Ingredients', captured: 'Absence/review evidence for prohibited watch-list', whenToComplete: 'Complete per formula', gate: '07', owner: 'Regulatory', notes: 'Formula match formulas flag possible matches' },
    { concept: '2. Ingredient evidence', templateTab: 'PB_Caution_Limits', captured: 'Pregnancy/breastfeeding caution-limit logic', whenToComplete: 'Complete per formula', gate: '07', owner: 'Safety / Regulatory', notes: 'Use for maternal positioning' },
    { concept: '2. Ingredient evidence', templateTab: 'Ingredient_Substitution', captured: 'Substitution decision and evidence when a material is changed', whenToComplete: 'Use when triggered', gate: '04/07', owner: 'R&I', notes: 'Avoids repeating change-control details' },
    { concept: '3. Product safety', templateTab: 'Formulation_Safety', captured: 'Full formula-level safety matrix and final sign-off', whenToComplete: 'Complete per formula version', gate: '07/10', owner: 'Safety / Regulatory', notes: 'Primary safety evidence tab' },
    { concept: '3. Product safety', templateTab: 'Fragrance_Safety', captured: 'IFRA, allergen, PBW caution and fragrance evidence', whenToComplete: 'Complete where fragranced', gate: '07', owner: 'R&I / Regulatory', notes: 'Feeds artwork and PIF' },
    { concept: '4. Packaging / artwork', templateTab: 'Packaging_Specs_Artwork', captured: 'Component specs, label checks and artwork approval evidence', whenToComplete: 'Complete per SKU/market', gate: '06/10/11', owner: 'Packaging / Regulatory', notes: 'Development evidence, not change log' },
    { concept: '5. Quality testing', templateTab: 'Micro_PET_Evidence', captured: 'Micro, PET/challenge and preservative rationale', whenToComplete: 'Complete where relevant', gate: '08', owner: 'Quality', notes: 'Feeds PIF and release' },
    { concept: '5. Quality testing', templateTab: 'Stability_Release', captured: 'Stability, compatibility and release decision evidence', whenToComplete: 'Complete per formula/pack', gate: '09/11', owner: 'Quality', notes: 'Report links only' },
    { concept: '5. Quality testing', templateTab: 'Eye_Safety_Evidence', captured: 'Eye irritation/safe-zone evidence', whenToComplete: 'Complete where eye-contact risk or claim', gate: '07/08', owner: 'Safety / Quality', notes: 'Separate from broader formulation safety' },
    { concept: '6. Efficacy / claims', templateTab: 'Mechanism_Claims_Map', captured: 'Claim, mechanism, ingredient and evidence mapping', whenToComplete: 'Complete before claim approval', gate: '03/10', owner: 'R&I / Claims', notes: 'Source of approved claim logic' },
    { concept: '6. Efficacy / claims', templateTab: 'Efficacy_Assurance', captured: 'Checks whether efficacy is controlled by formula/process/testing', whenToComplete: 'Complete where efficacy claim', gate: '05/08', owner: 'R&I / Quality', notes: 'Prevents unsupported claim drift' },
    { concept: '6. Efficacy / claims', templateTab: 'Functional_Efficacy', captured: 'Functional assay evidence and claim result', whenToComplete: 'Complete where assay-based claim', gate: '08/10', owner: 'R&I / Quality', notes: 'Links reports in Test_Report_Index' },
    { concept: '6. Efficacy / claims', templateTab: 'Clinical_Human_Evidence', captured: 'Human/consumer/clinical proof', whenToComplete: 'Complete where human support is needed', gate: '08/10', owner: 'Clinical / R&I', notes: 'Study_Protocol holds participant details' },
    { concept: '7. Regulatory / PIF', templateTab: 'ASEAN_PIF_Map', captured: 'High-level dossier map', whenToComplete: 'Complete per market', gate: '10', owner: 'Regulatory', notes: 'Overview only' },
    { concept: '7. Regulatory / PIF', templateTab: 'PIF_Checklist_ASEAN', captured: 'Detailed PIF checklist', whenToComplete: 'Complete per SKU/market', gate: '10', owner: 'Regulatory', notes: 'Full closure checklist' },
    { concept: '7. Regulatory / PIF', templateTab: 'PIF_Evidence_Export', captured: 'Evidence pack for PIF/Product Master File', whenToComplete: 'Use at PIF export', gate: '10/11', owner: 'Regulatory', notes: 'No duplicate reports; link source files' },
    { concept: '8. Change / launch', templateTab: 'Change_Control_Comm', captured: 'Master change log, communication and closure', whenToComplete: 'Use when anything changes', gate: 'ALL', owner: 'Project owner / QA', notes: 'RACI/closure folded in here' },
    { concept: '8. Change / launch', templateTab: 'GMP_Links', captured: 'Controlled GMP file links', whenToComplete: 'Complete at launch/release', gate: '11', owner: 'Quality / Manufacturing', notes: 'Links only, does not replace GMP system' },
    { concept: '9. Post-market', templateTab: 'PostMarket_CAPA', captured: 'Complaints, adverse events, CAPA and trend evidence', whenToComplete: 'Use after launch', gate: '12', owner: 'Quality / PV-PMS', notes: 'Feeds improvement cycle' },
    { concept: '7. Change control', templateTab: 'Product_Family_Register', captured: 'Family name/code linking all versions of one consumer product', whenToComplete: 'Complete per product family', gate: '05/06', owner: 'R&I / NP / Marketing', notes: 'Anki/NP request - see all formula versions of a product together' },
    { concept: '7. Change control', templateTab: 'Formulation_Change_Register', captured: 'NP-controlled log of every formulation change, reasons, actions and closure', whenToComplete: 'Per formulation change', gate: '05/07/10', owner: 'NPD / NP / Reg', notes: 'CEO-mandated. VN needs ~6 months re-registration for formula changes' },
    { concept: '8. Marketing outputs', templateTab: 'Campaigns_Social_Media', captured: 'Social media & marketing campaign declaration with links', whenToComplete: 'Per campaign/post', gate: '03/11', owner: 'Marketing / Sales', notes: 'Links approved messaging to Change IDs' },
    { concept: '9. Development records', templateTab: 'Product_Feedback_Form', captured: 'Staff/panel feedback on development samples (texture, fragrance, oiliness/slipperiness safety)', whenToComplete: 'Per sample evaluation round', gate: '07/08', owner: 'R&I / NPD / Panel', notes: 'Feeds Product_Development_Report; slip-risk safety flag for marketing' },
    { concept: '9. Development records', templateTab: 'Product_Development_Report', captured: 'Iterative formula development record: each improved version, driving feedback and competitor benchmarking', whenToComplete: 'Per SKU under development', gate: '04/05/08', owner: 'NPD (Tuan) / Project owner', notes: 'Answers "is development being recorded?"; links Change Register + Feedback Form' },
  ],
};

const systemRequirements: RegisterConfig = {
  key: 'systemRequirements',
  title: 'System Requirements',
  sheetName: 'Requirements',
  description: 'Controlled system requirements for the MBc360 workbook.',
  mode: 'fixed',
  reviewOwner: 'MBc360 Development & Quality System',
  columns: [
    { key: 'metric', label: 'Metric', type: 'text', width: 220, editable: false },
    { key: 'value', label: 'Value', type: 'text', width: 200, editable: false },
    { key: 'notes', label: 'Notes', type: 'textarea', width: 360, editable: false },
  ],
  fixedRows: [
    { metric: 'Controlled gates', value: '12', notes: 'Renamed for non-technical navigation; Gate IDs retained in Stage_Map' },
    { metric: 'Skincare for Two checks', value: 'Mandatory', notes: 'Maternal products must include baby-contact/infant exposure assessment' },
    { metric: 'Study approval trail', value: 'Required', notes: 'Proposal + Head sign-off + independent reviewer + saved records' },
    { metric: 'Participant evidence', value: 'Required when claims need human support', notes: 'Sample size target, consent, recruitment log and final report' },
    { metric: 'PIF / dossier mapping', value: 'Required', notes: 'ASEAN_PIF_Map before dossier export' },
    { metric: 'Prohibited ingredient proof', value: 'Required', notes: 'Prohibited_Ingredients formula check and evidence link' },
    { metric: 'Pregnancy/BF caution limits', value: 'Required', notes: 'PB_Caution_Limits concentration/status check' },
    { metric: 'HCP/distributor pack', value: 'Required for partner questions', notes: 'Medical_Summary output' },
    { metric: 'Twinkle 5 claim mapping', value: 'Required where used', notes: 'Twinkle5_Claims_Map and evidence links' },
    { metric: 'Post-market learning', value: 'Required', notes: 'Gate 12/PostMarket feedback and CAPA' },
    { metric: 'Topical efficacy assurance', value: 'Required', notes: 'Problem -> mechanism -> potency/source -> formula/process -> evidence -> claim wording' },
    { metric: 'Mechanism of action map', value: 'Required for benefit claims', notes: 'Use Mechanism_Claims_Map before HCP/distributor use' },
    { metric: 'Potency/process controls', value: 'Required', notes: 'Use Potency_Process_Control for heat-sensitive ingredients, active markers, pH, processing and GMP controls' },
    { metric: 'Efficacy study plan', value: 'Required when claims need proof', notes: 'Use Efficacy_Study_Plan and Study_Protocol with participant number rationale' },
    { metric: 'HCP efficacy answer', value: 'Required for pharmacy/distributor questions', notes: 'Use HCP_Efficacy_Answer and Medical_Summary' },
    { metric: 'Post-market efficacy feedback', value: 'Required', notes: 'Capture real-world benefit feedback, complaints, CAPA and improvements' },
    { metric: 'No silent artwork/formula corrections', value: 'Mandatory', notes: 'Use Change_Control_Comm for any artwork, label, formula, claim, supplier, process, packaging or market change' },
    { metric: 'Artwork change sign-off', value: 'Mandatory', notes: 'Redline, proof approval, regulatory/QA sign-off, final approved PDF and obsolete version control' },
    { metric: 'Formula change comparison', value: 'Mandatory', notes: 'Old vs new formula, impact assessment and Sales/Marketing-ready summary' },
    { metric: 'Sales/Marketing notification', value: 'Required when customer-facing', notes: 'Notify and record acknowledgement where label/formula/claims/story/sensory/customer answers change' },
    { metric: 'Closure evidence', value: 'Required', notes: 'Approvals, evidence links, communications, implementation status and closure notes saved' },
    { metric: 'Product evidence summary', value: 'Required', notes: 'Product_Evidence_Summary shows safety, efficacy, PIF and HCP evidence output status.' },
    { metric: 'Test report index', value: 'Required', notes: 'Test_Report_Index records method, score, acceptance limit, conclusion and final report link.' },
    { metric: 'PIF checklist', value: 'Required', notes: 'PIF_Checklist_ASEAN imports the PIF List into the project file.' },
  ],
};

const systemFeedback: RegisterConfig = {
  key: 'systemFeedback',
  title: 'MBc360 Feedback',
  sheetName: 'MBC360 FEEDBACK',
  description: 'Feedback from users on the MBc360 system itself.',
  mode: 'register',
  columns: [
    { key: 'user', label: 'User', type: 'text', width: 160 },
    { key: 'date', label: 'Date', type: 'date', width: 120 },
    { key: 'department', label: 'Department', type: 'text', width: 160 },
    { key: 'comments', label: 'Comments', type: 'textarea', width: 360 },
  ],
};

// ---------------------------------------------------------------------------
// Registry + categories
// ---------------------------------------------------------------------------

export const REGISTER_CONFIGS: RegisterConfig[] = [
  formulationSafetyProfile,
  formulationSafetyMatrix,
  formulationSafetyFinalSignOff,
  supplierRmEvidence,
  prohibitedIngredients,
  pbCautionLimits,
  ingredientSubstitution,
  eyeSafetyEvidence,
  fragranceSafety,
  fragranceAllergenLog,
  microPetEvidence,
  stabilityRelease,
  potencyProcessControl,
  mechanismClaimsMap,
  twinkle5ClaimsMap,
  efficacyAssurance,
  functionalEfficacy,
  clinicalHumanEvidence,
  studyProtocolSetup,
  studyParticipantLog,
  efficacyStudyPlan,
  testReportIndex,
  packagingSpecsArtwork,
  artworkChangeControl,
  formulaChangeControl,
  aseanPifMap,
  pifChecklistAsean,
  pifEvidenceExport,
  skuClaimsPifRegister,
  pifEvidenceClosure,
  publicationRules,
  publishedInfoApproval,
  medicalSummary,
  hcpEfficacyAnswer,
  hcpTestReportPack,
  batchFormulaTrace,
  productFamilyRegister,
  formulationChangeRegister,
  changeTemplates,
  gmpLinks,
  campaignsSocialMedia,
  productDevelopmentProfile,
  productDevelopmentIterations,
  productDevelopmentFeedback,
  releasedLabelRegister,
  labelPlatformRollout,
  labelShipmentVerification,
  templateIndex,
  systemRequirements,
  systemFeedback,
];

// Owner-prefixed tab names + "REVIEW OWNER" strings transcribed from the V18
// workbook, keyed by the historical (unprefixed) sheetName. The app does not
// read the workbook at runtime, so sheetName is only a display/reference label.
// `key` is unchanged to keep persisted localStorage data valid.
const SHEET_METADATA: Record<string, { sheetName: string; reviewOwner: string }> = {
  Supplier_RM_Evidence: { sheetName: 'Chidkamon-Supplier_RM', reviewOwner: 'Chidkamon (Raw Material Operations) · Co-sign: Chris (Project Manager)' },
  Ingredient_Substitution: { sheetName: 'Chidkamon-Ingred_Substit', reviewOwner: 'Chidkamon (Raw Material Operations) · Co-sign: Chris (Project Manager)' },
  Product_Family_Register: { sheetName: 'Chidkamon-Prod_Family_Reg', reviewOwner: 'Chidkamon (Raw Material Operations) · Co-sign: Chris (Project Manager)' },
  Prohibited_Ingredients: { sheetName: 'ChiChu-Prohibited_Ingred', reviewOwner: 'Chi Chu (Regulatory) · Co-sign: George (R&I), Chris (Project Manager)' },
  PB_Caution_Limits: { sheetName: 'ChiChu-PB_Caution_Limits', reviewOwner: 'Chi Chu (Regulatory) · Co-sign: Chris (Project Manager)' },
  Fragrance_Safety: { sheetName: 'ChiChu-Fragrance_Safety', reviewOwner: 'Chi Chu (Regulatory) · Co-sign: Chris (Project Manager)' },
  ASEAN_PIF_Map: { sheetName: 'ChiChu-ASEAN_PIF_Map', reviewOwner: 'Chi Chu (Regulatory) · Co-sign: Chris (Project Manager)' },
  PIF_Checklist_ASEAN: { sheetName: 'ChiChu-PIF_Checklist', reviewOwner: 'Chi Chu (Regulatory) · Co-sign: Chris (Project Manager)' },
  PIF_Evidence_Export: { sheetName: 'ChiChu-PIF_Evid_Export', reviewOwner: 'Chi Chu (Regulatory) · Co-sign: Chris (Project Manager)' },
  SKU_Claims_PIF_Register: { sheetName: 'ChiChu-SKU_Claims_PIF', reviewOwner: 'Chi Chu (Regulatory) · Co-sign: Chris (Project Manager)' },
  PIF_Evidence_Closure: { sheetName: 'ChiChu-PIF_Evid_Closure', reviewOwner: 'Chi Chu (Regulatory) · Co-sign: Chris (Project Manager)' },
  Published_Info_Approval: { sheetName: 'ChiChu-Published_Info_Ap', reviewOwner: 'Chi Chu (Regulatory) · Co-sign: Chris (Project Manager)' },
  Formulation_Safety: { sheetName: 'Tuan-Formulation_Safety', reviewOwner: 'Tuan (Formulation) · Co-sign: Chris (Project Manager)' },
  Formula_Change_Control: { sheetName: 'Tuan-Formula_Chg_Control', reviewOwner: 'Tuan (Formulation) · Co-sign: Chris (Project Manager)' },
  Formulation_Change_Register: { sheetName: 'Tuan-Formulation_Chg_Reg', reviewOwner: 'Tuan (Formulation) · Co-sign: Chris (Project Manager)' },
  Batch_Formula_Trace: { sheetName: 'Tuan-Batch_Formula_Trace', reviewOwner: 'Tuan (Formulation) · Co-sign: Chris (Project Manager)' },
  Product_Development_Report: { sheetName: 'Tuan-Product_Dev_Report', reviewOwner: 'Tuan (Formulation – Product Development Reporting) · Co-sign: Chris (Project Manager)' },
  Test_Report_Index: { sheetName: 'Sankar-Test_Report_Index', reviewOwner: 'Sankar (Quality) · Co-sign: Lani (HR/Quality), Chris (Project Manager)' },
  Eye_Safety_Evidence: { sheetName: 'Sankar-Eye_Safety_Evid', reviewOwner: 'Sankar (Quality) · Co-sign: Lani (HR/Quality), Chris (Project Manager)' },
  Micro_PET_Evidence: { sheetName: 'Sekar-Micro_PET_Evidence', reviewOwner: 'Sekar (Quality & GMP) · Co-sign: Tuan (Formulation – PET), Chris (Project Manager)' },
  Stability_Release: { sheetName: 'Sekar-Stability_Release', reviewOwner: 'Sekar (Quality & GMP) · Co-sign: Tuan (Formulation – Stability), Chris (Project Manager)' },
  GMP_Links: { sheetName: 'Sekar-GMP_Links', reviewOwner: 'Sekar (Quality & GMP) · Co-sign: Chris (Project Manager)' },
  Mechanism_Claims_Map: { sheetName: 'George-Mechanism_Claims', reviewOwner: 'George (R&I) · Co-sign: Chris (Project Manager)' },
  Twinkle5_Claims_Map: { sheetName: 'George-Twinkle5_Claims', reviewOwner: 'George (R&I) · Co-sign: Chris (Project Manager)' },
  Efficacy_Assurance: { sheetName: 'George-Efficacy_Assur', reviewOwner: 'George (R&I) · Co-sign: Chris (Project Manager)' },
  Functional_Efficacy: { sheetName: 'George-Functional_Effic', reviewOwner: 'George (R&I) · Co-sign: Chris (Project Manager)' },
  Clinical_Human_Evidence: { sheetName: 'George-Clinical_Human_Ev', reviewOwner: 'George (R&I) · Co-sign: Chris (Project Manager)' },
  Study_Protocol: { sheetName: 'George-Study_Protocol', reviewOwner: 'George (R&I) · Co-sign: Chris (Project Manager)' },
  Efficacy_Study_Plan: { sheetName: 'George-Efficacy_Std_Plan', reviewOwner: 'George (R&I) · Co-sign: Chris (Project Manager)' },
  Potency_Process_Control: { sheetName: 'George-Potency_Proc_Ctrl', reviewOwner: 'George (R&I) · Co-sign: Chris (Project Manager)' },
  Medical_Summary: { sheetName: 'George-Medical_Summary', reviewOwner: 'George (R&I) · Co-sign: Chris (Project Manager)' },
  Packaging_Specs_Artwork: { sheetName: 'Lily-Packaging_Specs_Art', reviewOwner: 'Lily (Packaging) · Co-sign: Chris (Project Manager)' },
  Artwork_Change_Control: { sheetName: 'Lily-Artwork_Chg_Control', reviewOwner: 'Lily (Packaging) · Co-sign: Chris (Project Manager)' },
  HCP_Efficacy_Answer: { sheetName: 'Nguyen-HCP_Efficacy_Ans', reviewOwner: 'Nguyen (Sales & Marketing) · Co-sign: Chris (Project Manager)' },
  HCP_Test_Report_Pack: { sheetName: 'Nguyen-HCP_Test_Rpt_Pack', reviewOwner: 'Nguyen (Sales & Marketing) · Co-sign: Chris (Project Manager)' },
  Change_Templates: { sheetName: 'Nguyen-Change_Templates', reviewOwner: 'Nguyen (Sales & Marketing) · Co-sign: Chris (Project Manager)' },
  Campaigns_Social_Media: { sheetName: 'Nguyen-Campaigns_Social', reviewOwner: 'Nguyen (Sales & Marketing) · Co-sign: Chris (Project Manager)' },
};

for (const config of REGISTER_CONFIGS) {
  const meta = SHEET_METADATA[config.sheetName];
  if (meta) {
    config.sheetName = meta.sheetName;
    config.reviewOwner = meta.reviewOwner;
  }
}

export function getRegisterConfig(key: string): RegisterConfig | undefined {
  return REGISTER_CONFIGS.find((r) => r.key === key);
}

// ---------------------------------------------------------------------------
// Navigation groupings
// ---------------------------------------------------------------------------
// The Evidence-register section of the sidebar groups by RESPONSIBILITY
// (department/role) — owner-neutral (no person names, so staff turnover /
// handover doesn't change the navigation) and covers EVERY workbook sheet of
// that department, including ones the app hosts on a dedicated page (BOM &
// Costing, Formulation Safety, Evidence Summary, Panel Feedback, Change
// Control, Post-Market) rather than as an evidence register.
// (A "by type/topic" alternative grouping existed earlier but was removed —
// department is the one authoritative axis.)

// A single navigable workbook sheet inside a group.
//  - registerKey set  -> opens the register hub (`registers/reg/:registerKey`)
//  - page set         -> opens a project-scoped page (`/projects/:id/:page`)
//  - href set         -> opens an absolute route (e.g. the global Change Control)
export interface NavItem {
  title: string;
  sheetName?: string;
  registerKey?: string;
  page?: string;
  href?: string;
  gate?: string; // '04', '04/07', or 'ALL'
}

// Short gate label for a sheet: 'All' when it spans every gate, 'G04/07' for
// one or more specific gates, null when it isn't tied to a gate.
export function formatGate(gate?: string): string | null {
  if (!gate) return null;
  if (gate.toUpperCase() === 'ALL') return 'All';
  return `G${gate}`;
}

export interface NavGroup {
  key: string;
  title: string;
  description?: string;
  reviewOwner?: string; // department head + co-sign
  items: NavItem[];
}

// Resolve a NavItem to a concrete route for the given project.
export function navItemHref(item: NavItem, projectId: string): string {
  if (item.registerKey) return `/projects/${projectId}/registers/reg/${item.registerKey}`;
  if (item.href) return item.href;
  if (item.page) return `/projects/${projectId}/${item.page}`;
  return `/projects/${projectId}`;
}

function registerNavItem(registerKey: string): NavItem | null {
  const config = getRegisterConfig(registerKey);
  if (!config) return null;
  return { title: config.title, sheetName: config.sheetName, registerKey, gate: config.gate };
}

// A department item is either a register (its key) or a dedicated page.
type RawDeptItem =
  | string
  | { title: string; sheetName: string; page?: string; href?: string; gate?: string };

interface RawDept {
  key: string;
  title: string;
  description?: string;
  reviewOwner?: string;
  items: RawDeptItem[];
}

// Full workbook, grouped by responsible department (see the source workbook's
// owner-prefixed tabs). Dedicated-page sheets link to the page that hosts them.
const DEPARTMENTS: RawDept[] = [
  {
    key: 'dept-formulation',
    title: 'Formulation',
    description: 'Formula BOM, change control/registers, batch traceability and the product development report.',
    reviewOwner: 'Tuan (Formulation) · Co-sign: Chris (Project Manager)',
    items: [
      { title: 'Formula BOM', sheetName: 'Formula_BOM', page: 'bom/formula', gate: '05' },
      'batchFormulaTrace',
      'formulationChangeRegister',
      'formulaChangeControl',
      'productDevelopmentProfile',
      'productDevelopmentIterations',
      'productDevelopmentFeedback',
    ],
  },
  {
    key: 'dept-quality',
    title: 'Quality',
    description: 'Test-report index, eye safety, evidence summary, formulation safety and R&I efficacy/claims evidence.',
    reviewOwner: 'Sankar (Quality) · Co-sign: Lani (HR/Quality), Chris (Project Manager)',
    items: [
      'testReportIndex',
      'eyeSafetyEvidence',
      { title: 'Product Evidence Summary', sheetName: 'Product_Evid_Summ', page: 'evidence', gate: 'ALL' },
      { title: 'Formulation Safety', sheetName: 'Formulation_Safety', page: 'formulation-safety', gate: '07/10' },
      'mechanismClaimsMap',
      'twinkle5ClaimsMap',
      'efficacyAssurance',
      'functionalEfficacy',
      'clinicalHumanEvidence',
      'studyProtocolSetup',
      'studyParticipantLog',
      'efficacyStudyPlan',
      'potencyProcessControl',
      'medicalSummary',
    ],
  },
  {
    key: 'dept-quality-gmp',
    title: 'Quality & GMP',
    description: 'GMP manufacturing links, microbiology/PET and stability & release evidence.',
    reviewOwner: 'Sekar (Quality & GMP) · Co-sign: Tuan (Formulation – PET), Chris (Project Manager)',
    items: ['gmpLinks', 'microPetEvidence', 'stabilityRelease'],
  },
  {
    key: 'dept-regulatory',
    title: 'Regulatory',
    description: 'Prohibited/caution watch-lists, fragrance, ASEAN PIF closure, claims and publication approval.',
    reviewOwner: 'Chi Chu (Regulatory) · Co-sign: George (R&I), Chris (Project Manager)',
    items: [
      'prohibitedIngredients',
      'pbCautionLimits',
      'fragranceSafety',
      'fragranceAllergenLog',
      'aseanPifMap',
      'pifChecklistAsean',
      'pifEvidenceExport',
      'skuClaimsPifRegister',
      'pifEvidenceClosure',
      'publicationRules',
      'publishedInfoApproval',
    ],
  },
  {
    key: 'dept-packaging',
    title: 'Packaging',
    description: 'Released-label control, packaging BOM, packaging specs/artwork evidence and artwork change control.',
    reviewOwner: 'Lily (Packaging) · Co-sign: Chris (Project Manager)',
    items: [
      'releasedLabelRegister',
      'labelPlatformRollout',
      'labelShipmentVerification',
      { title: 'Packaging BOM', sheetName: 'Packaging_BOM', page: 'bom/packaging', gate: '06' },
      'packagingSpecsArtwork',
      'artworkChangeControl',
    ],
  },
  {
    key: 'dept-raw-material',
    title: 'Raw Material Operations',
    description: 'Supplier/raw-material documents, substitutions and product-family versioning.',
    reviewOwner: 'Chidkamon (Raw Material Operations) · Co-sign: Chris (Project Manager)',
    items: ['supplierRmEvidence', 'ingredientSubstitution', 'productFamilyRegister'],
  },
  {
    key: 'dept-sales-marketing',
    title: 'Sales & Marketing',
    description: 'Campaign declarations, HCP/distributor answer packs, panel feedback, change control and templates.',
    reviewOwner: 'Nguyen (Sales & Marketing) · Co-sign: Chris (Project Manager)',
    items: [
      'campaignsSocialMedia',
      'hcpEfficacyAnswer',
      'hcpTestReportPack',
      { title: 'Product / Sample Feedback', sheetName: 'Product_Feedback', page: 'feedback', gate: '07/08' },
      { title: 'Change Control & Communication', sheetName: 'Change_Ctrl_Comm', href: '/change-control', gate: 'ALL' },
      'changeTemplates',
    ],
  },
  {
    key: 'dept-supply-chain',
    title: 'Supply Chain',
    description: 'Costing calculator and post-market / complaint / CAPA evidence.',
    reviewOwner: 'Hannah (Supply Chain) · Co-sign: Chris (Project Manager)',
    items: [
      { title: 'Costing Calculator', sheetName: 'Costing_Calc', page: 'bom/costing', gate: '05' },
      { title: 'Post-Market / CAPA', sheetName: 'PostMarket_CAPA', page: 'post-market', gate: '12' },
    ],
  },
  {
    key: 'dept-system',
    title: 'System Guide & Reference',
    description: 'How to use MBc360, the evidence template index, controlled system requirements and feedback on the system itself.',
    items: ['systemRequirements', 'templateIndex', 'systemFeedback'],
  },
];

export function getNavGroups(): NavGroup[] {
  return DEPARTMENTS.map((dept) => ({
    key: dept.key,
    title: dept.title,
    description: dept.description,
    reviewOwner: dept.reviewOwner,
    items: dept.items
      .map((it): NavItem | null =>
        typeof it === 'string'
          ? registerNavItem(it)
          : { title: it.title, sheetName: it.sheetName, page: it.page, href: it.href, gate: it.gate },
      )
      .filter((i): i is NavItem => i !== null),
  }));
}

export function getNavGroup(key: string | undefined): NavGroup | undefined {
  if (!key) return undefined;
  return getNavGroups().find((g) => g.key === key);
}

// Which group holds a register — used by the sidebar to resolve the parent
// submenu to open/highlight from a register deep-link (register deep-links
// are category-agnostic: `registers/reg/:key`).
export function findNavGroupForRegister(registerKey: string | undefined): NavGroup | undefined {
  if (!registerKey) return undefined;
  return getNavGroups().find((g) => g.items.some((i) => i.registerKey === registerKey));
}
