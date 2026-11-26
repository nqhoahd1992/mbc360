// Round 5 question 23: when one person may hold two roles on one record — the gate signatures, closing an action, the formula version, the phase
// approval. Pure functions on the real rule code. Run: npm run verify:two-roles
import { CRITICAL_GATES } from '../src/config/gateSignOff';
import {
  actionCancellationGaps,
  actionClosureRefusal,
  actionIsLowRiskAdministrative,
  actionNeedsIndependentVerification,
  actionVerifierProblem,
} from '../src/utils/actionVerification';
import { mayEditNextActionRecord, nextActionFreezeViolation } from '../src/utils/nextActionAccess';
import { blockedPeopleFor, gateSignerConflicts, phaseSignerConflicts } from '../src/utils/signerIndependence';
import type { NextAction } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

// --- (a) the three gate signatures -----------------------------------------------------------------------------------------------------------------
t('the critical gates are the answer\'s seven: 3, 4, 7, 8, 9, 10, 11', CRITICAL_GATES.join(',') === 'SG03,SG04,SG07,SG08,SG09,SG10,SG11');
{
  const p = 'P', r = 'R', a = 'A';
  t('three different people are fine at every gate', gateSignerConflicts('SG07', { 'Prepared by': p, 'Reviewed by': r, 'Approved by': a }).length === 0 && gateSignerConflicts('SG06', { 'Prepared by': p, 'Reviewed by': r, 'Approved by': a }).length === 0);
  t('a critical gate: reviewer = approver is refused', gateSignerConflicts('SG07', { 'Prepared by': p, 'Reviewed by': r, 'Approved by': r }).length === 1);
  t('a gate that is not critical: reviewer = approver is allowed', gateSignerConflicts('SG06', { 'Prepared by': p, 'Reviewed by': r, 'Approved by': r }).length === 0);
  t('at any gate the preparer cannot also approve', ['SG06', 'SG07'].every((g) => gateSignerConflicts(g, { 'Prepared by': p, 'Reviewed by': r, 'Approved by': p }).length === 1));
  t('...nor review', ['SG06', 'SG07'].every((g) => gateSignerConflicts(g, { 'Prepared by': p, 'Reviewed by': p, 'Approved by': a }).length === 1));
  t('a slot nobody holds is not a conflict', gateSignerConflicts('SG07', { 'Prepared by': p, 'Reviewed by': null, 'Approved by': null }).length === 0);
  t('the picker blocks the preparer from the other two slots, and the reviewer from the approver slot only at a critical gate', blockedPeopleFor('Approved by', { 'Prepared by': p, 'Reviewed by': r }, false).has(p) && !blockedPeopleFor('Approved by', { 'Prepared by': p, 'Reviewed by': r }, false).has(r) && blockedPeopleFor('Approved by', { 'Prepared by': p, 'Reviewed by': r }, true).has(r));
  t('one person preparing several different gates is not a conflict (each record is judged alone)', gateSignerConflicts('SG06', { 'Prepared by': p, 'Reviewed by': r, 'Approved by': a }).length === 0 && gateSignerConflicts('SG05', { 'Prepared by': p, 'Reviewed by': r, 'Approved by': a }).length === 0);
}

// --- (d) the phase approval ------------------------------------------------------------------------------------------------------------------------
t('a phase: the preparer cannot also review or approve; the reviewer may approve', phaseSignerConflicts({ 'Prepared by': 'P', 'Reviewed by': 'P' }).length === 1 && phaseSignerConflicts({ 'Prepared by': 'P', 'Approved by': 'P' }).length === 1 && phaseSignerConflicts({ 'Prepared by': 'P', 'Reviewed by': 'R', 'Approved by': 'R' }).length === 0);

// --- (b) closing and cancelling an action ----------------------------------------------------------------------------------------------------------------
const action = (over: Partial<NextAction> = {}): NextAction => ({ id: 'A', gateId: 'SG02', description: 'd', owner: 'Owen', status: 'Ready for Verification', priority: 'Medium', ...over });
const ctx = (over: Record<string, unknown> = {}) => ({ me: 'Rae', raisedBy: 'Rae', authorised: false, to: 'Closed' as const, ...over });
{
  t('Critical and High actions, and any that close a named risk, need independent verification', ['Critical', 'High'].every((priority) => actionNeedsIndependentVerification(action({ priority: priority as never }))) && ['Safety', 'Regulatory', 'Claims', 'Release', 'Material quality'].every((actionType) => actionNeedsIndependentVerification(action({ priority: 'Low', actionType }))));
  t('a Low or Medium administrative or other action does not', !actionNeedsIndependentVerification(action({ priority: 'Low', actionType: 'Administrative' })) && !actionNeedsIndependentVerification(action({ actionType: 'Other' })) && !actionNeedsIndependentVerification(action()));
  t('only a Low or Medium Administrative action is low-risk administrative', actionIsLowRiskAdministrative(action({ actionType: 'Administrative', priority: 'Low' })) && !actionIsLowRiskAdministrative(action({ actionType: 'Administrative', priority: 'High' })) && !actionIsLowRiskAdministrative(action()));

  // closing
  t('its owner may close a low-risk administrative action with evidence', actionClosureRefusal(action({ actionType: 'Administrative', priority: 'Low', evidenceLink: 'x' }), ctx({ me: 'Owen' })) === undefined);
  t('...but not without the evidence', !!actionClosureRefusal(action({ actionType: 'Administrative', priority: 'Low' }), ctx({ me: 'Owen' })));
  t('the owner cannot close any other action', !!actionClosureRefusal(action({ actionType: 'Other' }), ctx({ me: 'Owen' })) && !!actionClosureRefusal(action({ priority: 'High', verifier: 'Owen' }), ctx({ me: 'Owen' })));
  t('a High action needs a nominated verifier before anyone closes it', /nominate a qualified verifier/.test(actionClosureRefusal(action({ priority: 'High' }), ctx()) ?? ''));
  t('...and only that person closes it — not the raiser, not an authorised reviewer', !!actionClosureRefusal(action({ priority: 'High', verifier: 'Vera' }), ctx()) && !!actionClosureRefusal(action({ priority: 'High', verifier: 'Vera' }), ctx({ authorised: true })) && actionClosureRefusal(action({ priority: 'High', verifier: 'Vera' }), ctx({ me: 'Vera' })) === undefined);
  t('a raiser or gate owner may be the nominated verifier when they are not the owner', actionClosureRefusal(action({ priority: 'High', verifier: 'Rae' }), ctx()) === undefined);
  t('a lower-risk action keeps the usual rule: the raiser, the gate owner or an authorised reviewer', actionClosureRefusal(action(), ctx()) === undefined && actionClosureRefusal(action(), ctx({ me: 'Gus', raisedBy: 'Rae', gateOwner: 'Gus' })) === undefined && actionClosureRefusal(action(), ctx({ me: 'Zed', authorised: true })) === undefined && !!actionClosureRefusal(action(), ctx({ me: 'Zed' })));

  // cancelling
  t('a substantive action is cancelled only by an authorised person who is not its owner', !!actionClosureRefusal(action({ priority: 'High' }), ctx({ to: 'Cancelled' })) && !!actionClosureRefusal(action({ priority: 'High' }), ctx({ to: 'Cancelled', me: 'Owen', authorised: true })) && actionClosureRefusal(action({ priority: 'High' }), ctx({ to: 'Cancelled', authorised: true })) === undefined);
  t('...with a justification and an impact review', actionCancellationGaps(action({ priority: 'High', status: 'Cancelled' })).length === 2 && actionCancellationGaps(action({ priority: 'High', status: 'Cancelled', cancellationReason: 'r' })).length === 1 && actionCancellationGaps(action({ priority: 'High', status: 'Cancelled', cancellationReason: 'r', cancellationImpact: 'i' })).length === 0);
  t('a low-risk administrative action needs neither', actionCancellationGaps(action({ actionType: 'Administrative', priority: 'Low', status: 'Cancelled' })).length === 0 && actionClosureRefusal(action({ actionType: 'Administrative', priority: 'Low' }), ctx({ to: 'Cancelled', me: 'Owen' })) === undefined);
  t('an action with no type is treated as substantive', actionCancellationGaps(action({ status: 'Cancelled' })).length === 2);
  t('a verifier cannot be the owner', !!actionVerifierProblem({ owner: 'Owen', verifier: 'Owen' }) && !actionVerifierProblem({ owner: 'Owen', verifier: 'Vera' }) && !actionVerifierProblem({ owner: 'Owen' }));

  // who may change what decides who may close
  const creator = { displayName: 'Rae', isProjectLead: false, isAdmin: false };
  t('the type and the verifier are part of the record: only the creator, the Lead or an administrator changes them', mayEditNextActionRecord({ raisedBy: 'Rae' }, creator) && !mayEditNextActionRecord({ raisedBy: 'Rae' }, { displayName: 'Owen', isProjectLead: false, isAdmin: false }));
  t('after the gate passes the type is frozen on an open action, and the cancellation record on a closed one', !!nextActionFreezeViolation(action({ status: 'Open' }), action({ status: 'Open', actionType: 'Administrative' })) && !!nextActionFreezeViolation(action({ status: 'Closed' }), action({ status: 'Closed', cancellationReason: 'x' })) && nextActionFreezeViolation(action({ status: 'Open' }), action({ status: 'Open', verifier: 'Vera' })) === undefined);
}

console.log(bad === 0 ? '\nall passed' : `\n${bad} FAILED`);
process.exit(bad === 0 ? 0 : 1);
