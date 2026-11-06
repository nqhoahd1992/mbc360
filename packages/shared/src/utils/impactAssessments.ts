import type { ImpactAssessmentRecord, ProjectData } from '../types';
import { IMPACT_CONCLUSIONS } from '../types';

// Round 5 question 1(d): "A relevant list change creates a tracked impact assessment, with an owner and due date. A credible
// Critical safety issue, prohibition or mandatory market restriction puts affected current use/release on hold pending qualified
// review. Other changes trigger notice and assessment; Safety/Regulatory and Quality decide scope, urgency and any reopening."
// What follows is how the application reads that, and each choice is ours: [ASSUMPTION: R6-Q6].
//   - the person who changed the list raises it and may mark it Critical;
//   - the owner is the person holding the function that judges that kind of list on the project;
//   - "use/release" is the release gates (10 to 12) and the launch of the markets affected, not the whole project;
//   - an assessment concludes when each of its functions has recorded a conclusion.

export type ImpactDataset = ImpactAssessmentRecord['dataset'];

export const IMPACT_FUNCTIONS: Record<ImpactDataset, readonly string[]> = {
  // A risk classification of a material: Safety. (Review-area keys of config/reviewers.ts.)
  'rm-risk': ['safety-scientific'],
  // A market's requirements: Regulatory.
  'market-profile': ['regulatory'],
  // Claims wording: Regulatory records the market/legal impact, Technical the evidence impact (Round 5 question 6(b)).
  'claims-library': ['technical-claims-reviewer', 'regulatory'],
};

export const IMPACT_DATASET_LABELS: Record<ImpactDataset, string> = {
  'rm-risk': 'Raw Material Risk Overlay',
  'market-profile': 'Market profile',
  'claims-library': 'Claims Library',
};

// The assessments that hold release: Critical and not yet concluded by every function.
export function impactHolds(project: ProjectData): ImpactAssessmentRecord[] {
  return (project.impactAssessments ?? []).filter((a) => a.critical && !a.concludedAt);
}

// The markets whose release is on hold. A market-profile change holds that market; a material or claim change holds every market
// the project is sold in.
export function heldMarkets(project: ProjectData): string[] {
  return [...new Set(impactHolds(project).flatMap((a) => a.markets))];
}

export function isImpactOverdue(a: ImpactAssessmentRecord, today: string): boolean {
  return !a.concludedAt && a.dueDate < today;
}

// What is wrong with a conclusion about to be recorded, or null. One function for the screen and the API.
export function impactConclusionProblem(
  input: { conclusion: string; rationale: string; linkedChangeId?: string },
  changeIds: readonly string[],
): string | null {
  if (!(IMPACT_CONCLUSIONS as readonly string[]).includes(input.conclusion)) {
    return `The conclusion must be one of: ${IMPACT_CONCLUSIONS.join(' / ')}`;
  }
  if (input.rationale.trim() === '') return 'A conclusion needs its rationale';
  if (input.conclusion === 'Impact on this project') {
    const linked = (input.linkedChangeId ?? '').trim();
    if (linked === '') return 'An impact must name the Change Control record that deals with it — open one first';
    if (!changeIds.includes(linked)) return `"${linked}" is not a Change Control record on this project`;
  }
  return null;
}
