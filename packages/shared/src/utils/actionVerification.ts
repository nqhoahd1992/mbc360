// Round 5 question 23(b): who may close or cancel a Next Action. One reading for the screen and the server.
//
// The SME's answer: owners may complete actions and submit evidence. Independent verification is required for Critical and High actions and for
// actions closing a safety, regulatory, claims, release or material quality risk — a qualified verifier is nominated, and a raiser or gate owner may
// verify only when competent and independent of the work. A low-risk administrative action may be closed by its owner with evidence and an audit
// trail where its action type permits. Cancelling a substantive action needs an authorised justification and an impact review, not owner access alone.
//
// Our readings (`[ASSUMPTION: R6-Q31]`): "action type" is the new Type of action list; "qualified" is the person the action's raiser or the Lead
// nominates as verifier, never the owner; "authorised" is someone who may decide the gate (the gate's Approved-by signer, the project Lead or an
// administrator); an action with no type recorded is treated as substantive.
import type { NextAction } from '../types';

export const NEXT_ACTION_TYPES = ['Administrative', 'Safety', 'Regulatory', 'Claims', 'Release', 'Material quality', 'Other'] as const;
export type NextActionType = (typeof NEXT_ACTION_TYPES)[number];

// The kinds of action that close a risk the SME names.
export const RISK_ACTION_TYPES: readonly string[] = ['Safety', 'Regulatory', 'Claims', 'Release', 'Material quality'];

type Classified = Pick<NextAction, 'priority' | 'actionType'>;

// Critical and High actions, and any action closing one of the named risks, need someone other than the owner to verify closure.
export function actionNeedsIndependentVerification(a: Classified): boolean {
  return a.priority === 'Critical' || a.priority === 'High' || RISK_ACTION_TYPES.includes(a.actionType ?? '');
}

// A low-risk administrative action: its owner may close it with evidence. Anything else is substantive.
export function actionIsLowRiskAdministrative(a: Classified): boolean {
  return a.actionType === 'Administrative' && !actionNeedsIndependentVerification(a);
}

export interface ActionClosureContext {
  // The signed-in person.
  me: string;
  // Who raised it and who owns the gate; a row not yet saved is raised by the person saving it.
  raisedBy?: string;
  gateOwner?: string;
  // Someone who may decide this action's gate (the gate's Approved-by signer, the project Lead or an administrator).
  authorised: boolean;
  to: 'Closed' | 'Cancelled';
}

const same = (a: string | undefined, b: string | undefined) => (a ?? '').trim() !== '' && (a ?? '').trim() === (b ?? '').trim();

// Why this person may not move the action to Closed or Cancelled, or undefined when they may.
export function actionClosureRefusal(a: NextAction, ctx: ActionClosureContext): string | undefined {
  const isOwner = same(a.owner, ctx.me);
  if (actionIsLowRiskAdministrative(a) && isOwner) {
    return ctx.to === 'Closed' && !(a.evidenceLink ?? '').trim()
      ? 'You own this low-risk administrative action and may close it yourself, but the evidence link must be filled in first.'
      : undefined;
  }
  if (ctx.to === 'Cancelled' && !actionIsLowRiskAdministrative(a)) {
    if (isOwner) {
      return 'You own this action, so you cannot cancel it. Cancelling a substantive action needs someone who may decide its gate, with a written justification and an impact review.';
    }
    if (!ctx.authorised) {
      return `Only someone who may decide ${a.gateId} (its approver, the project Lead or an administrator) can cancel a substantive action, with a written justification and an impact review.`;
    }
    return undefined;
  }
  if (isOwner) {
    return actionNeedsIndependentVerification(a)
      ? 'You own this action, so you cannot verify its closure. Set it to "Ready for Verification" and let its nominated verifier close it.'
      : 'You own this action, so you cannot verify its own closure. Set it to "Ready for Verification" and let its raiser, the gate owner or an authorised reviewer close it.';
  }
  if (actionNeedsIndependentVerification(a)) {
    if (!(a.verifier ?? '').trim()) {
      return 'This action needs independent verification: nominate a qualified verifier (not its owner) before it can be closed.';
    }
    return same(a.verifier, ctx.me) ? undefined : `Only the nominated verifier (${a.verifier}) can close this action.`;
  }
  const allowed = same(ctx.raisedBy, ctx.me) || same(ctx.gateOwner, ctx.me) || ctx.authorised;
  return allowed
    ? undefined
    : `Only the action's raiser, the ${a.gateId} gate owner or an authorised reviewer (the ${a.gateId} approver, the project Lead or an administrator) can close or cancel it.`;
}

// What cancelling a substantive action must carry besides who cancels it.
export function actionCancellationGaps(a: NextAction): string[] {
  if (a.status !== 'Cancelled' || actionIsLowRiskAdministrative(a)) return [];
  const gaps: string[] = [];
  if (!(a.cancellationReason ?? '').trim()) gaps.push('the justification for cancelling it');
  if (!(a.cancellationImpact ?? '').trim()) gaps.push('the impact review: what the cancellation leaves unaddressed');
  return gaps;
}

// The nominated verifier cannot be the owner of the work.
export function actionVerifierProblem(a: Pick<NextAction, 'owner' | 'verifier'>): string | undefined {
  return same(a.owner, a.verifier) ? 'The verifier cannot be the owner of the action — verification has to be independent of the work.' : undefined;
}
