// The "effect on projects" part of a company-list save, as the three list screens send it (Round 5 questions 1(d) and 6).
// The person changing the list PROPOSES a criticality (Low / Medium / High / Critical); a qualified function on each affected project
// confirms a Critical one, except an urgent safety issue or mandatory restriction, which holds release at once. A safety issue also
// brings Safety into the assessment.
export interface ChangeSignalBody {
  criticality?: string;
  urgent?: boolean;
  safetyIssue?: boolean;
  // The old checkbox, kept so an older client still works: true reads as Critical.
  critical?: boolean;
  reason?: string;
  dueDate?: string;
}

export const CRITICALITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'] as const;
export type Criticality = (typeof CRITICALITY_LEVELS)[number];

export function readSignal(signal: ChangeSignalBody | undefined): {
  criticality: Criticality;
  urgent: boolean;
  safetyIssue: boolean;
  reason?: string;
  dueDate?: string;
} {
  const asked = signal?.criticality ?? (signal?.critical === true ? 'Critical' : 'Medium');
  const criticality: Criticality = (CRITICALITY_LEVELS as readonly string[]).includes(asked) ? (asked as Criticality) : 'Medium';
  return {
    criticality,
    // "Urgent" only means something for a Critical change: it is what makes the hold immediate.
    urgent: criticality === 'Critical' && signal?.urgent === true,
    safetyIssue: signal?.safetyIssue === true,
    reason: signal?.reason,
    dueDate: signal?.dueDate,
  };
}
