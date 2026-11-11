// Verifies Round 5 question 9: a gap that is carried (High, Medium or Low) needs a tracked Next Action on its own gate that is
// complete and not cancelled, plus the assessor; Critical is never carried; plain Proceed is never allowed on a gap.
// Run: npm run verify:gap-controls
import type { GateRecord, NextAction } from '../src/types';
import { gapBlocksDecision } from '../src/utils/gapCriticality';
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

if (bad) {
  console.error(`\n${bad} FAILED`);
  process.exit(1);
}
console.log('\nall passed');
