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

export type AssessmentKey = 'familyUse' | 'administrativeOnly' | 'humanStudy' | 'scaleUp' | 'changeControl';

export interface AssessmentHome {
  key: AssessmentKey;
  title: string;
  /** The gate whose tab carries the block. */
  gateId: string;
  /** The readiness trigger this answer decides. */
  trigger: ReadinessTrigger;
}

// In gate order, which is also the order the overview lists them.
export const ASSESSMENT_HOMES: AssessmentHome[] = [
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
    key: 'changeControl',
    title: 'Change Control required for the post-market finding?',
    gateId: 'SG12',
    trigger: 'openChangeControl',
  },
];

export const assessmentAnchor = (key: AssessmentKey): string => `sec-assessment-${key}`;

export const assessmentForTrigger = (trigger: ReadinessTrigger): AssessmentHome | undefined =>
  ASSESSMENT_HOMES.find((a) => a.trigger === trigger);

// The fields each assessment owns. Read by its block (which drafts and saves only
// these) and by the API, which locks them once the assessment's gate has passed
// (SME rule audit C9, 2026-10-04) — changing the family-use age groups after
// Gate 2 used to switch the whole infant pathway off with no Backtrack.
export const ASSESSMENT_FIELDS: Record<AssessmentKey, readonly (keyof ProjectData['assessments'])[]> = {
  familyUse: ['familyUseAgeGroups', 'familyUseConfirmedBy', 'familyUseConfirmedDate'],
  administrativeOnly: ['administrativeOnly', 'administrativeOnlyConfirmedBy'],
  humanStudy: ['humanStudyPlanned'],
  scaleUp: [
    'scaleUpRiskIdentified',
    'scaleUpRiskAssessor',
    'scaleUpRiskAssessmentDate',
    'scaleUpRiskDescription',
    'scaleUpRiskRationale',
    'scaleUpRiskActivity',
    'scaleUpRiskEvidenceLink',
  ],
  changeControl: [
    'changeControlRequired',
    'changeControlReviewer',
    'changeControlReviewDate',
    'changeControlRationale',
    'changeControlRecordId',
    'changeControlEvidenceLink',
  ],
};
