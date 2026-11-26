// Round 5 question 27: pre-work is marked entry by entry and decided by the accountable owner; leadership alone cannot decide a Safety or Regulatory area.
// Pure functions on the real rule code. Run: npm run verify:pre-work
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { PHASE_CONFIGS } from '../src/config/phases';
import { phaseCompletionChecklist } from '../src/utils/gateProgress';
import { pendingPreWork, phaseOfChecklistSection, phaseOfRequirementSection, phasesOfGateRef, preWorkDecisionProblem, preWorkOwnerRole } from '../src/utils/preWork';
import type { PreWorkEntry, ProjectData } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

const entry = (over: Partial<PreWorkEntry> = {}): PreWorkEntry => ({ id: 'E1', phase: 3, kind: 'register', key: 'eyeSafetyEvidence', label: 'Eye safety', enteredBy: 'E', enteredAt: '2026-11-01', status: 'Pre-work', ...over });
const project = (entries: PreWorkEntry[] = []): ProjectData => {
  const reviewers: Record<string, string> = { ri: 'Rita', regulatory: 'Rex', 'quality-gmp': 'Quin', quality: 'Quentin', formulation: 'Fay' };
  for (const c of [PHASE_CONFIGS[2], PHASE_CONFIGS[3]]) if (c.reviewOwner) reviewers[c.reviewOwner.owner.role] = reviewers[c.reviewOwner.owner.role] ?? 'Pat';
  const p = createEmptyProject({ id: 'T', productCode: 'T', productSku: 'T', ownerDepartment: 'x', productGroup: 'x', brandCustomer: 'x', projectLead: 'Lena', dateOpened: '2026-01-01', targetLaunchDate: '2026-12-01', markets: ['Vietnam'], reviewers } as never);
  p.preWorkEntries = entries;
  return p;
};
const actor = (displayName: string, isAdmin = false) => ({ displayName, isAdmin });

t('a gate reference names its phases', phasesOfGateRef('07')[0] === 3 && phasesOfGateRef('04/07').join() === '2,3' && phasesOfGateRef('ALL').length === 0 && phasesOfGateRef(undefined).length === 0);
t('a section belongs to the phase that lists it', phaseOfChecklistSection('targetUsers') === 1 && (phaseOfRequirementSection('formulationDesign') ?? 0) > 1);

t('an entry waiting, or rejected and not redone, is pending; accepted and updated are not', pendingPreWork(project([entry(), entry({ id: 'E2', status: 'Rejected' }), entry({ id: 'E3', status: 'Accepted' }), entry({ id: 'E4', status: 'Updated' })]), 3).map((e) => e.id).join() === 'E1,E2');
t('pending entries of another phase do not count', pendingPreWork(project([entry({ phase: 2 })]), 3).length === 0);
t('a phase with a waiting entry cannot close; with none it can (phase 1 never has pre-work)', phaseCompletionChecklist(project([entry()]), 3).preWorkAccepted === false && phaseCompletionChecklist(project(), 3).preWorkAccepted === true && phaseCompletionChecklist(project([entry({ phase: 1 })]), 1).preWorkAccepted === true);

// who decides
const eye = entry();
const micro = entry({ id: 'E5', key: 'microPetEvidence', label: 'Micro and PET evidence' });
const regulatory = entry({ id: 'E6', key: 'fragranceAllergenLog', label: 'Fragrance allergen log' });
t('the accountable owner of an area is read from the register', preWorkOwnerRole(eye) === 'ri' && preWorkOwnerRole(micro) === 'quality-gmp' && preWorkOwnerRole(regulatory) === 'regulatory');
t('its accountable owner may decide it', preWorkDecisionProblem(project(), eye, actor('Rita')) === undefined && preWorkDecisionProblem(project(), regulatory, actor('Rex')) === undefined);
t('the Lead and an administrator may decide an area that is not Safety or Regulatory', preWorkDecisionProblem(project(), eye, actor('Lena')) === undefined && preWorkDecisionProblem(project(), eye, actor('Ada', true)) === undefined);
t('...but not a Regulatory or a Safety area, which only its accountable owner decides', !!preWorkDecisionProblem(project(), regulatory, actor('Lena')) && !!preWorkDecisionProblem(project(), micro, actor('Lena')) && !!preWorkDecisionProblem(project(), regulatory, actor('Ada', true)));
t('a stranger may decide nothing', !!preWorkDecisionProblem(project(), eye, actor('Zed')) && !!preWorkDecisionProblem(project(), regulatory, actor('Zed')));
t('an area nobody is assigned to cannot be decided by leadership if it is Safety or Regulatory', (() => {
  const p = project();
  p.identity.reviewers = { ...p.identity.reviewers, regulatory: '' };
  return !!preWorkDecisionProblem(p, regulatory, actor('Lena'));
})());

console.log(bad === 0 ? '\nall passed' : `\n${bad} FAILED`);
process.exit(bad === 0 ? 0 : 1);
