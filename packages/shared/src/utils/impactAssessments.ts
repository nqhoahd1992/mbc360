import type { ImpactAssessmentRecord, ProjectData } from '../types';
import { IMPACT_AFFECTS, IMPACT_AFFECTS_NONE, IMPACT_CONCLUSIONS } from '../types';

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
  // Claims wording: Regulatory records the market/legal impact, Technical the evidence impact, and Quality coordinates the action and
  // decides with them whether a Change Control is required (Round 5 question 6(b) and (c)).
  'claims-library': ['technical-claims-reviewer', 'regulatory', 'quality'],
};

// Round 5 question 6(b): "Safety contributes where a safety issue is involved", and an urgent safety issue or mandatory restriction
// escalates at once — to Safety, Regulatory and Quality, who are the ones who can act on it. The functions an assessment is opened with.
export function impactFunctionsFor(dataset: ImpactDataset, opts: { safetyIssue?: boolean; urgent?: boolean }): string[] {
  const keys = [...IMPACT_FUNCTIONS[dataset]];
  if (opts.safetyIssue || opts.urgent) keys.push('safety-scientific');
  if (opts.urgent) keys.push('regulatory', 'quality');
  return [...new Set(keys)];
}

export const IMPACT_DATASET_LABELS: Record<ImpactDataset, string> = {
  'rm-risk': 'Raw Material Risk Overlay',
  'market-profile': 'Market profile',
  'claims-library': 'Claims Library',
};

// Does this assessment hold release? A Critical change, not yet concluded by every function, that is urgent (an urgent safety issue or
// mandatory restriction — "an immediate hold and escalation") or that a qualified function has confirmed is critical ("criticality is
// confirmed by the relevant qualified function(s)"). A Critical change proposed but not yet confirmed waits for that confirmation and
// holds nothing yet [ASSUMPTION: R6-Q12].
export function impactIsHolding(a: ImpactAssessmentRecord): boolean {
  return a.critical && !a.concludedAt && (!!a.urgent || !!a.criticalConfirmed);
}
// A proposed Critical change nobody has confirmed yet.
export function impactAwaitsConfirmation(a: ImpactAssessmentRecord): boolean {
  return a.critical && !a.concludedAt && !a.urgent && !a.criticalConfirmed;
}

// The assessments that hold release.
export function impactHolds(project: ProjectData): ImpactAssessmentRecord[] {
  return (project.impactAssessments ?? []).filter(impactIsHolding);
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
  input: { conclusion: string; rationale: string; linkedChangeId?: string; affects?: string[] },
  changeIds: readonly string[],
  dataset?: ImpactDataset,
): string | null {
  if (!(IMPACT_CONCLUSIONS as readonly string[]).includes(input.conclusion)) {
    return `The conclusion must be one of: ${IMPACT_CONCLUSIONS.join(' / ')}`;
  }
  if (input.rationale.trim() === '') return 'A conclusion needs its rationale';
  // Round 5 question 6(c), for the Claims Library: say what the change affects. A Change Control is REQUIRED when it affects approved or
  // released wording, artwork, the PIF or authorised market use; an unused entry or an editorial correction closes with a reason and no
  // Change Control. [ASSUMPTION: R6-Q12]
  if (dataset === 'claims-library') {
    const affects = input.affects ?? [];
    const known: readonly string[] = [...IMPACT_AFFECTS, IMPACT_AFFECTS_NONE];
    if (affects.length === 0) return 'Say what the change affects on this project (or that it affects nothing)';
    if (affects.some((a) => !known.includes(a))) return 'Unknown "affects" value';
    const none = affects.includes(IMPACT_AFFECTS_NONE);
    if (none && affects.length > 1) return `"${IMPACT_AFFECTS_NONE}" cannot be combined with anything it affects`;
    if (none && input.conclusion !== 'No impact') return 'A change that affects nothing here concludes as "No impact"';
    if (!none && input.conclusion !== 'Impact on this project') {
      return `A change that affects ${affects.join(', ').toLowerCase()} needs a Change Control: conclude "Impact on this project" and link it`;
    }
  }
  if (input.conclusion === 'Impact on this project') {
    const linked = (input.linkedChangeId ?? '').trim();
    if (linked === '') return 'An impact must name the Change Control record that deals with it — open one first';
    if (!changeIds.includes(linked)) return `"${linked}" is not a Change Control record on this project`;
  }
  return null;
}
