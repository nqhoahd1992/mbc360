import type { ProjectData } from '../types';
import type { ReadinessTrigger } from './gateReadiness';

// Where each explicit assessment lives (2026-10-03, project owner's request).
//
// Round 4 questions 8, 9, 11, 12 and 25(c) asked for five judgements to be
// recorded rather than inferred. They were first built as one "Assessments" card
// on the Project Overview, on the reasoning that they feed different gates. The
// project owner judged that wrong: the overview summarises, and each judgement
// is made at the gate that reads it. So each is now a block on its gate's tab of
// the phase page, and the overview only summarises their state.
//
// One list, read by the phase page (where to render), the readiness panel (where
// a "not yet assessed" blocker links) and the overview summary — so the three can
// never disagree about where an assessment is answered.

export type AssessmentKey =
  | 'foreseeableContact'
  | 'familyUse'
  | 'administrativeOnly'
  | 'humanStudy'
  | 'scaleUp'
  | 'pmsUnstructured'
  | 'changeControl';

export interface AssessmentHome {
  key: AssessmentKey;
  title: string;
  /** The gate whose tab carries the block. */
  gateId: string;
  /** The readiness trigger this answer decides. */
  trigger: ReadinessTrigger;
  /** Further triggers the same block also decides, for the link a "not yet assessed" blocker follows. */
  alsoDecides?: ReadinessTrigger[];
}

// In gate order, which is also the order the overview lists them.
export const ASSESSMENT_HOMES: AssessmentHome[] = [
  // Round 5 question 1(d), 2026-11-06: whether contact with a pregnant, breastfeeding or postpartum user, or with an infant, is
  // reasonably foreseeable — a judgement, not something the ticks settle. Answered at Gate 02 INSIDE the Target Users card (shown
  // there only while no maternal or infant user is ticked), so it has no card of its own on the phase page.
  {
    key: 'foreseeableContact',
    title: 'Foreseeable maternal and infant contact',
    gateId: 'SG02',
    trigger: 'skincareForTwo',
    alsoDecides: ['infantContact'],
  },
  {
    key: 'familyUse',
    title: 'Family use — which age groups does this product include?',
    gateId: 'SG02',
    trigger: 'infantContact',
  },
  { key: 'administrativeOnly', title: 'Administrative-only change?', gateId: 'SG03', trigger: 'newOrRepositionedProject' },
  { key: 'humanStudy', title: 'Human-participant study planned?', gateId: 'SG08', trigger: 'humanStudyPlanned' },
  { key: 'scaleUp', title: 'Scale-up risk identified?', gateId: 'SG09', trigger: 'scaleUpRiskIdentified' },
  {
    key: 'pmsUnstructured',
    title: 'Enhanced-surveillance conditions the application cannot read',
    gateId: 'SG12',
    trigger: 'pvPmsRequired',
  },
  {
    key: 'changeControl',
    title: 'Change Control required for the post-market finding?',
    gateId: 'SG12',
    trigger: 'openChangeControl',
  },
];

// Round 4 question 12: the areas whose change prompts a scale-up or pilot review, transcribed verbatim and in the answer's order.
// Round 5 question 7(a) made them DATA: the controlled list an assessment entry picks its area from ("use the existing controlled
// list of eighteen areas ... retaining their existing identities"). Picking one triggers an assessment; it does not predetermine a Yes.
export const SCALE_UP_REVIEW_AREAS: readonly string[] = [
  'Formula composition',
  'Active or preservative concentration',
  'Manufacturing site',
  'Equipment type or equipment scale',
  'Batch size',
  'Order of addition',
  'Mixing speed or time',
  'Homogenisation',
  'Heating or cooling profile',
  'Maximum temperature',
  'Hold time',
  'Pre-processing or ingredient hydration',
  'Transfer method',
  'Filling method',
  'Water quality or process-water source',
  'Process aid',
  'Packaging/filling interface',
  'Any change identified by Manufacturing, Quality or R&I as potentially affecting product performance',
];

// The open-ended area. Picking it requires a description of the change (question 7(a): "the open-ended area requires a description").
export const SCALE_UP_OPEN_AREA = SCALE_UP_REVIEW_AREAS[SCALE_UP_REVIEW_AREAS.length - 1];
// "Record a reviewed 'no affected area / no scale-up activity required' assessment where appropriate; an empty list is incomplete."
export const SCALE_UP_AREA_NONE = 'No affected area / no scale-up activity required';

// "Group the areas for display as process/site/scale, formula/materials and other performance risks, while retaining their existing
// identities." Which group each of the eighteen sits in is our reading [ASSUMPTION: R6-Q13].
export const SCALE_UP_AREA_GROUPS: { label: string; areas: readonly string[] }[] = [
  {
    label: 'Process, site and scale',
    areas: [
      'Manufacturing site',
      'Equipment type or equipment scale',
      'Batch size',
      'Order of addition',
      'Mixing speed or time',
      'Homogenisation',
      'Heating or cooling profile',
      'Maximum temperature',
      'Hold time',
      'Pre-processing or ingredient hydration',
      'Transfer method',
      'Filling method',
      'Packaging/filling interface',
    ],
  },
  {
    label: 'Formula and materials',
    areas: ['Formula composition', 'Active or preservative concentration', 'Water quality or process-water source', 'Process aid'],
  },
  { label: 'Other performance risks', areas: [SCALE_UP_OPEN_AREA] },
];

export const assessmentAnchor = (key: AssessmentKey): string => `sec-assessment-${key}`;

export const assessmentForTrigger = (trigger: ReadinessTrigger): AssessmentHome | undefined =>
  ASSESSMENT_HOMES.find((a) => a.trigger === trigger || a.alsoDecides?.includes(trigger));

// The fields each assessment owns. Read by its block (which drafts and saves only
// these) and by the API, which locks them once the assessment's gate has passed
// (SME rule audit C9, 2026-10-04) — changing the family-use age groups after
// Gate 2 used to switch the whole infant pathway off with no Backtrack.
export const ASSESSMENT_FIELDS: Record<AssessmentKey, readonly (keyof ProjectData['assessments'])[]> = {
  foreseeableContact: ['foreseeableContactRationale', 'foreseeableContactConfirmedBy'],
  pmsUnstructured: [
    'pmsNewActive',
    'pmsNewActiveRationale',
    'pmsNewActiveConfirmedBy',
    'pmsComplaintTrend',
    'pmsComplaintTrendRationale',
    'pmsComplaintTrendConfirmedBy',
    'pmsRecurringIssue',
    'pmsRecurringIssueRationale',
    'pmsRecurringIssueConfirmedBy',
    'pmsSurveillancePlan',
    'pmsSurveillancePlanRationale',
    'pmsSurveillancePlanConfirmedBy',
  ],
  familyUse: ['familyUseAgeGroups', 'familyUseConfirmedBy', 'familyUseConfirmedDate'],
  administrativeOnly: ['administrativeOnly', 'administrativeOnlyRationale', 'administrativeOnlyConfirmedBy'],
  humanStudy: ['humanStudyPlanned'],
  // Two lists of entries, each with its own endpoint and lock (ProjectData.scaleUpAssessments and ProjectData.changeControlAssessments),
  // so neither owns a column of `ProjectData.assessments`.
  scaleUp: [],
  changeControl: [],
};
