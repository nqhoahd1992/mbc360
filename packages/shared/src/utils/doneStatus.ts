// "Done" has two spellings in the workbook itself: most sheets and every phase table offer "Complete", a few lists
// (Campaigns, the generic work status, the change lifecycle) say "Completed". Rules and screens ask this one function
// instead of comparing a word, so moving a list to the workbook's own wording cannot silently stop a gate from passing.
export const DONE_STATUS_WORDS: readonly string[] = ['Complete', 'Completed'];

export function isDoneStatus(value: unknown): boolean {
  return typeof value === 'string' && DONE_STATUS_WORDS.includes(value.trim());
}
