// Verifies Round 5 question 9: a gap that is carried (High, Medium or Low) needs a tracked Next Action on its own gate that is
// complete and not cancelled, plus the assessor; Critical is never carried; plain Proceed is never allowed on a gap.
// Run: npm run verify:gap-controls
import type { GateRecord, NextAction } from '../src/types';
import { gapBlocksDecision, gapResolveMissing, isGapResolved } from '../src/utils/gapCriticality';
import { controlledActionGaps, isLiveControlledAction } from '../src/utils/controlledActions';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

const action = (over: Partial<NextAction> = {}): NextAction => ({
  id: 'NA-1',
  gateId: 'SG04',
  description: 'Run 3-month stability',
  owner: 'R&I',
  dueDate: '2026-11-30',
  status: 'Open',
  priority: 'High',
  completionCriteria: 'Report signed off',
  escalationTrigger: 'Overdue by a week',
  ...over,
});
const gate = (over: Partial<GateRecord> = {}): GateRecord => ({
  gateId: 'SG04',
  status: 'Gap',
  gapCriticality: 'High',
  gapAssessor: 'Sam',
  gapLinkedNextActionId: 'NA-1',
  ...over,
});
const verdict = (g: GateRecord, actions: NextAction[], d: 'Proceed' | 'Proceed with Conditions' = 'Proceed with Conditions') =>
  gapBlocksDecision(g, d, actions);

t('a complete linked action lets a High gap proceed with conditions', verdict(gate(), [action()]) === null);
t('...and Medium', verdict(gate({ gapCriticality: 'Medium' }), [action()]) === null);
t('...and Low', verdict(gate({ gapCriticality: 'Low' }), [action()]) === null);
t('no link at all is missing the tracked action', verdict(gate({ gapLinkedNextActionId: undefined }), [action()])?.missing?.some((m) => m.includes('tracked Next Action')) === true);
t('a link that resolves to nothing is missing too', verdict(gate({ gapLinkedNextActionId: 'NA-9' }), [action()])?.missing?.some((m) => m.includes('tracked Next Action')) === true);
t('the old plain-text action and owner no longer count', verdict(gate({ gapLinkedNextActionId: undefined, gapRequiredAction: 'Do it', gapActionOwner: 'Sam' }), [])?.missing?.length === 1 + 0 || (verdict(gate({ gapLinkedNextActionId: undefined, gapRequiredAction: 'Do it', gapActionOwner: 'Sam' }), [])?.missing ?? []).length > 0);
t('an action with no due date is not controlled', verdict(gate(), [action({ dueDate: undefined })])?.missing?.some((m) => m.includes('due date')) === true);
t('an action with no escalation trigger is not controlled', verdict(gate(), [action({ escalationTrigger: '' })])?.missing?.some((m) => m.includes('escalation trigger')) === true);
t('an action with no completion criteria is not controlled', verdict(gate(), [action({ completionCriteria: undefined })])?.missing?.some((m) => m.includes('completion criteria')) === true);
t('an action with no owner is not controlled', verdict(gate(), [action({ owner: '' })])?.missing?.some((m) => m.includes('owner')) === true);
t('a cancelled action does not carry a gap', verdict(gate(), [action({ status: 'Cancelled' })])?.missing?.some((m) => m.includes('not cancelled')) === true);
t('an action raised on another gate does not carry this gap', verdict(gate(), [action({ gateId: 'SG05' })])?.missing?.some((m) => m.includes('SG04')) === true);
t('a Closed action still counts (the gap was dealt with)', verdict(gate(), [action({ status: 'Closed' })]) === null);
t('no assessor still blocks, whatever the action', verdict(gate({ gapAssessor: '' }), [action()])?.missing?.some((m) => m.includes('assessor')) === true);
t('plain Proceed is never allowed on a gap', verdict(gate(), [action()], 'Proceed') !== null);
t('Critical cannot be carried by any action', verdict(gate({ gapCriticality: 'Critical' }), [action()]) !== null);
t('a High grade that outlived the status still needs the action', verdict(gate({ status: 'Complete', gapLinkedNextActionId: undefined }), [action()])?.missing?.length === 1);
t('...and passes once linked', verdict(gate({ status: 'Complete' }), [action()]) === null);
t('an ungraded gap still blocks both decisions', verdict(gate({ gapCriticality: undefined }), [action()]) !== null);

t('controlledActionGaps names every missing field', controlledActionGaps(action({ owner: '', dueDate: '', escalationTrigger: '', completionCriteria: '' })).length === 4);
t('isLiveControlledAction is false for a cancelled complete action', !isLiveControlledAction(action({ status: 'Cancelled' })));
t('...and true for a complete open one', isLiveControlledAction(action()));

// Round 5 question 9: a Low or Medium gap resolved before signing records its resolution and evidence; one not resolved is carried by a tracked action.
const done = (over: Partial<GateRecord> = {}) => gate({ status: 'Complete', gapCriticality: 'Medium', gapLinkedNextActionId: undefined, ...over });
t('a Medium gap resolved before signing passes with its resolution and evidence, even a plain Proceed', verdict(done({ gapResolution: 'Re-tested, within limits', gapEvidenceLink: 'https://example.com/r' }), [], 'Proceed') === null);
t('...and a Low one likewise', verdict(done({ gapCriticality: 'Low', gapResolution: 'Fixed', gapEvidenceLink: 'x' }), [], 'Proceed with Conditions') === null);
t('a resolution with no evidence is not enough', verdict(done({ gapResolution: 'Re-tested' }), [])?.missing?.some((m) => m.includes('resolution')) === true);
t('evidence with no resolution is not enough either', verdict(done({ gapEvidenceLink: 'x' }), [])?.missing?.some((m) => m.includes('resolution')) === true);
t('a Medium gap that is neither resolved nor carried blocks both positive decisions', verdict(done(), [], 'Proceed') !== null && verdict(done(), [], 'Proceed with Conditions') !== null);
t('...and says what would make it valid', (verdict(done(), [], 'Proceed')?.missing ?? []).length === 1);
t('an unresolved one carried by a tracked action needs no resolution (Proceed with Conditions)', verdict(done({ gapLinkedNextActionId: 'NA-1' }), [action()]) === null);
t('...but a plain Proceed is still refused while it is carried rather than resolved', verdict(done({ gapLinkedNextActionId: 'NA-1' }), [action()], 'Proceed') !== null);
t('a gate that never had a gap grade is untouched', verdict(gate({ status: 'Complete', gapCriticality: undefined }), [], 'Proceed') === null);
t('a High gap still needs its tracked action whatever is written as a resolution', verdict(done({ gapCriticality: 'High', gapResolution: 'x', gapEvidenceLink: 'y' }), [])?.missing?.some((m) => m.includes('tracked Next Action')) === true);

// ---- SW-39: Resolve keeps the assessment; a resolved gap stops blocking
const ready = (over: Partial<GateRecord> = {}): GateRecord => ({ gateId: 'SG04', status: 'Complete', gapCriticality: 'Critical', gapAssessor: 'Sam', gapResolution: 'Re-tested', gapEvidenceLink: 'http://x', ...over });
t('Resolve is unavailable on a gate with no assessment', gapResolveMissing({ gateId: 'SG04', status: 'Complete' }).includes('a criticality assessment'));
t('...and names each missing piece (assessor, how, evidence)', gapResolveMissing(ready({ gapAssessor: '', gapResolution: '', gapEvidenceLink: '' })).length === 3);
t('...while the status is still Gap', gapResolveMissing(ready({ status: 'Gap' })).includes('a Stage status other than Gap'));
t('...but available once everything is recorded and the status has left Gap', gapResolveMissing(ready()).length === 0);
t('...and not twice', gapResolveMissing(ready({ gapResolvedAt: '2026-11-12T00:00:00Z' })).includes('(already resolved)'));
t('a Critical assessment still blocks every Proceed until it is resolved', verdict(ready(), [], 'Proceed') !== null && verdict(ready(), [], 'Proceed with Conditions') !== null);
t('...and a resolved Critical no longer blocks, the assessment staying on the record', verdict(ready({ gapResolvedAt: '2026-11-12T00:00:00Z', gapResolvedBy: 'Sam' }), [], 'Proceed') === null && ready({ gapResolvedAt: 'x' }).gapCriticality === 'Critical');
t('...and a resolved High needs no tracked action', verdict(ready({ gapCriticality: 'High', gapResolvedAt: '2026-11-12T00:00:00Z' }), [], 'Proceed') === null);
t('a resolution does not count while the gate is back at status Gap', !isGapResolved(ready({ status: 'Gap', gapResolvedAt: '2026-11-12T00:00:00Z' })) && verdict(ready({ status: 'Gap', gapResolvedAt: '2026-11-12T00:00:00Z' }), [], 'Proceed with Conditions') !== null);

if (bad) {
  console.error(`\n${bad} FAILED`);
  process.exit(1);
}
console.log('\nall passed');
