// Round 5 question 32: which statuses of a formulation change permit what. Kept apart from changeOrder.ts so formulaBaseline.ts (which changeOrder.ts imports)
// can read them without a cycle.
//
// A NEW VERSION is created while the change is approved to implement and the work is starting or under way — not before approval, and not once it has been
// implemented (a further version needs its own change). Editing the controlled formula is allowed through verification too, since a correction found there
// is still part of the same approved change.
export const VERSION_READY_STATUSES: readonly string[] = ['Approved - Implementation Pending', 'In Implementation'];
export const VERSION_READY_STATUSES_FOR_BOM: readonly string[] = [...VERSION_READY_STATUSES, 'Verification Pending'];
