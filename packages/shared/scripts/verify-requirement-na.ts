// Round 5 question 14: N/A on a Phase 2-4 requirement row — a specific rationale, the relevant reviewer's acknowledgement on a critical item,
// and the universally required assessments that are never waived. Pure functions over a hand-built project on the real rule engine.
// Run: npm run verify:requirement-na
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { GATE_READINESS, type ReadinessRequirement } from '../src/config/gateReadiness';
import { gateCheckNeverNotApplicable, gateReadinessChecklist, phaseCompletionChecklist, requirementNeverNotApplicable, requirementRowSettled } from '../src/utils/gateProgress';
import { requirementNaAckGroups, requirementNaAckSlots } from '../src/utils/requirementNaAck';
import type { NaAcknowledgement, ProjectData, RequirementItem } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

const base = (): ProjectData => createEmptyProject({ id: 'T-1', productCode: 'T', projectLead: 'x', markets: ['Vietnam'], reviewers: {} } as never);
const row = (p: ProjectData, section: string, requirement: string): RequirementItem => {
  const r = (p.requirements[section] ?? []).find((x) => x.requirement === requirement);
  if (!r) throw new Error(`no row ${section} / ${requirement}`);
  return r;
};
const ack = (functionKey: string, rationale: string): NaAcknowledgement => ({ functionKey, rationale, byName: 'Reviewer', as: functionKey, at: '2026-11-13T00:00:00Z' });
const setNa = (p: ProjectData, section: string, requirement: string, rationale: string, acks: NaAcknowledgement[] = []) => {
  const r = row(p, section, requirement);
  r.status = 'N/A' as never;
  r.naRationale = rationale;
  r.naAcknowledgements = acks;
};
const itemOf = (gateId: string, pick: (r: ReadinessRequirement) => boolean) => (GATE_READINESS[gateId] ?? []).find(pick)!;
const satisfied = (p: ProjectData, gateId: string, id: string) => gateReadinessChecklist(p, gateId).find((i) => i.id === id)?.satisfied === true;

// --- which rows never accept N/A -------------------------------------------------------------------------------------------------------
for (const [s, r] of [
  ['stabilityRelease', 'Stability program selected'],
  ['stabilityRelease', 'Preservation / microbiology checks selected'],
  ['stabilityRelease', 'Release readiness risks closed'],
  ['dossierEvidence', 'PIF/CPSR export-ready'],
  ['dossierEvidence', 'Product Safety Summary'],
  ['infantPif', 'Infant-use safety conclusion'],
] as const) t(`${r} never accepts N/A`, requirementNeverNotApplicable(s, r));
for (const [s, r] of [
  ['stabilityRelease', 'Pack compatibility assessed'],
  ['dossierEvidence', 'Efficacy evidence summary'],
  ['formulationDesign', 'Compatibility / use-with constraints'],
] as const) t(`${r} may be N/A (an individual test or condition within the assessment)`, !requirementNeverNotApplicable(s, r));

// --- the acknowledgement of a critical item -----------------------------------------------------------------------------------------------
t('Gate 10 dossier rows are critical and need Regulatory', JSON.stringify(requirementNaAckGroups('dossierEvidence', '10')) === JSON.stringify([['regulatory']]));
t('Gate 9 stability rows need Quality', JSON.stringify(requirementNaAckGroups('stabilityRelease', '09')) === JSON.stringify([['quality']]));
t('Gate 5 formulation rows are not critical, so need nothing', requirementNaAckGroups('formulationDesign', '05') === undefined);
t('the infant packaging rows follow the team table: Safety and Quality, both', (requirementNaAckGroups('infantPackaging', '06') ?? []).length === 2);
t('a section the rule does not cover needs nothing', requirementNaAckGroups('projectRequirements', '02') === undefined);

{
  const p = base();
  setNa(p, 'dossierEvidence', 'Efficacy evidence summary', 'No efficacy claim is made for this product');
  const r = row(p, 'dossierEvidence', 'Efficacy evidence summary');
  t('N/A with a rationale on a critical row waits for acknowledgement', requirementNaAckSlots('dossierEvidence', r)?.[0].state === 'missing');
  t('...and does not settle the check yet', !requirementRowSettled('dossierEvidence', r, false));
  r.naAcknowledgements = [ack('regulatory', 'No efficacy claim is made for this product')];
  t('acknowledged by the relevant function, it settles', requirementRowSettled('dossierEvidence', r, false));
  r.naAcknowledgements = [ack('quality', 'No efficacy claim is made for this product')];
  t('an acknowledgement by another function does not', !requirementRowSettled('dossierEvidence', r, false));
  r.naAcknowledgements = [ack('regulatory', 'An earlier reason')];
  t('the rationale changed after it was acknowledged: it no longer counts (stale)', requirementNaAckSlots('dossierEvidence', r)?.[0].state === 'stale' && !requirementRowSettled('dossierEvidence', r, false));
  r.naRationale = '   ';
  r.naAcknowledgements = [ack('regulatory', '')];
  t('no rationale never settles, acknowledged or not', !requirementRowSettled('dossierEvidence', r, false));
}
{
  const p = base();
  setNa(p, 'formulationDesign', 'Compatibility / use-with constraints', 'Nothing to be used alongside');
  t('a row that is not a critical item needs no acknowledgement', requirementRowSettled('formulationDesign', row(p, 'formulationDesign', 'Compatibility / use-with constraints'), false));
}

// --- the readiness items read the same rule --------------------------------------------------------------------------------------------
{
  const summary = itemOf('SG10', (r) => r.check.kind === 'requirementDone' && r.check.requirement === 'Product Safety Summary');
  const p = base();
  setNa(p, 'dossierEvidence', 'Product Safety Summary', 'Not needed', [ack('regulatory', 'Not needed')]);
  t('a universally required assessment is not settled by an acknowledged N/A either', !satisfied(p, 'SG10', summary.id));
  row(p, 'dossierEvidence', 'Product Safety Summary').status = 'Complete' as never;
  t('...only by being completed', satisfied(p, 'SG10', summary.id));

  const stab = itemOf('SG09', (r) => r.check.kind === 'requirementDone' && r.check.requirement === 'Preservation / microbiology checks selected');
  const q = base();
  setNa(q, 'stabilityRelease', 'Preservation / microbiology checks selected', 'Anhydrous product', [ack('quality', 'Anhydrous product')]);
  t('the stability and microbiology assessment is never waived', !satisfied(q, 'SG09', stab.id));

  const pack = itemOf('SG09', (r) => r.check.kind === 'requirementDone' && r.check.requirement === 'Pack compatibility assessed');
  const w = base();
  setNa(w, 'stabilityRelease', 'Pack compatibility assessed', 'Same pack as an approved product');
  t('an individual test inside it can be N/A, but a critical one waits for Quality', !satisfied(w, 'SG09', pack.id));
  row(w, 'stabilityRelease', 'Pack compatibility assessed').naAcknowledgements = [ack('quality', 'Same pack as an approved product')];
  t('...and counts once Quality has acknowledged it', satisfied(w, 'SG09', pack.id));
}
{
  // the general restricted and caution screening is a Key Gate Check that never accepts N/A
  const general = itemOf('SG07', (r) => r.id === 'sg07-general-caution');
  const p = base();
  const gc = p.gateChecks.find((c) => c.gate === '07' && c.check === 'General restricted and caution ingredient assessment completed')!;
  gc.ynna = 'NA' as never;
  gc.notes = 'Nothing restricted in this formula';
  t('the general restricted and caution screening does not accept N/A with a justification', !satisfied(p, 'SG07', general.id));
  const NAME = 'General restricted and caution ingredient assessment completed';
  t('...and the Y/N/NA list is told so (gateCheckNeverNotApplicable)', gateCheckNeverNotApplicable('07', NAME));
  t('...while another Key Gate Check of the gate may be N/A', !gateCheckNeverNotApplicable('07', 'Safety/tolerance questions defined and vulnerable-user risks reviewed'));
  // the phase does not count it either
  const q = base();
  for (const c of q.gateChecks.filter((x) => ['05', '06', '07', '08', '09'].includes(x.gate))) {
    c.done = true;
    c.ynna = 'Y' as never;
  }
  t('with every Key Gate Check of Phase 3 done the phase counts them', phaseCompletionChecklist(q, 3).keyChecksDone);
  const gc2 = q.gateChecks.find((c) => c.gate === '07' && c.check === NAME)!;
  gc2.done = false;
  gc2.ynna = 'NA' as never;
  gc2.notes = 'Nothing restricted in this formula';
  t('...but not with the general screening set to N/A with a justification', !phaseCompletionChecklist(q, 3).keyChecksDone);
}
{
  // the core infant safety conclusion, once infant use is in scope
  const p = base();
  for (const item of p.checklists['targetUsers'] ?? []) if (item.label === 'Infant 0+') item.selected = true;
  const infantPif = itemOf('SG10', (r) => r.id === 'sg10-infant-pif');
  for (const r of p.requirements['infantPif'] ?? []) {
    r.status = 'Complete' as never;
  }
  t('every infant PIF row Completed settles the item', satisfied(p, 'SG10', infantPif.id));
  setNa(p, 'infantPif', 'Infant-use safety conclusion', 'Not for infants', [ack('safety-scientific', 'Not for infants'), ack('regulatory', 'Not for infants')]);
  t('the core infant safety conclusion cannot be waived once infant use is in scope', !satisfied(p, 'SG10', infantPif.id));
  row(p, 'infantPif', 'Infant-use safety conclusion').status = 'Complete' as never;
  row(p, 'infantPif', 'Applicable test reports').status = 'N/A' as never;
  row(p, 'infantPif', 'Applicable test reports').naRationale = 'Justified test waiver';
  t('...while another infant row N/A without the reviewers acknowledging it still blocks', !satisfied(p, 'SG10', infantPif.id));
  row(p, 'infantPif', 'Applicable test reports').naAcknowledgements = [ack('safety-scientific', 'Justified test waiver'), ack('regulatory', 'Justified test waiver')];
  t('...and counts once both have', satisfied(p, 'SG10', infantPif.id));
}

console.log(bad === 0 ? '\nall passed' : `\n${bad} FAILED`);
process.exit(bad === 0 ? 0 : 1);
