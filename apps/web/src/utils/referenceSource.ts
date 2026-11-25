import { REGISTER_CONFIGS } from '@mbc360/shared/config/registers';
import type { RegisterColumn } from '@mbc360/shared/config/registers';

// One line saying where a reference field takes its values from, shown under the field (project owner, 2026-11-25: every
// reference field says where its data comes from, so the link between registers is visible). The shared pickers render the
// line themselves (components/ReferenceSource.tsx); a register column that points at another register's row (`rowRef`) has no
// shared picker, so the register table asks `referenceSourceOf`. One place, so wording cannot drift between screens.
export const REFERENCE_SOURCE_TEXT = {
  user: 'Taken from the active users of MBc360',
  market: "Taken from this project's Countries / Markets",
  claim: "Taken from this project's Claim -> Evidence Traceability register",
  claimsLibrary: 'Taken from Company Reference Data → Claims Library',
  restrictedCaution: 'Taken from Company Reference Data → Restricted & caution list',
  change: "Taken from this project's Change Control records",
  nextAction: "Taken from this project's Next Actions",
} as const;

export type ReferenceSourceKind = keyof typeof REFERENCE_SOURCE_TEXT;

// A register column that points into another register of the same project.
export function referenceSourceOf(col: RegisterColumn): string | undefined {
  if (col.type !== 'rowRef') return undefined;
  const title = REGISTER_CONFIGS.find((r) => r.key === col.refRegister)?.title;
  return title ? `Taken from this project's ${title}` : undefined;
}
