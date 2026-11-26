// Round 5 question 31: register-by-register applicability. Entries, or a reviewed decision (reuse of an approved record / not applicable), satisfy a register's
// requirement where the SME's table allows it. Pure functions on the real rule code. Run: npm run verify:register-applicability
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { GATE_READINESS } from '../src/config/gateReadiness';
import { REGISTER_APPLICABILITY, applicabilityItemRegisters, registersWithDecisions } from '../src/config/registerApplicability';
import { REGISTER_CONFIGS } from '../src/config/registers';
import { gateBlockers, noClaimsDeclared } from '../src/utils/gateProgress';
import {
  applicabilityRegisterProblems,
  applicabilityState,
  decisionGaps,
  decisionRowOf,
  noClaimsVerified,
  stampApplicabilityDecisions,
} from '../src/utils/registerApplicability';
import type { ProjectData, RegisterRow } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

const title = (key: string) => REGISTER_CONFIGS.find((c) => c.key === key)!.title;
const dec = (key: string, over: RegisterRow = {}): RegisterRow => ({ register: title(key), decision: 'Reuse approved record', rationale: 'Approved baseline v3, scope unchanged', evidenceLink: 'https://example.test/approved', decidedBy: 'A', ...over });
const project = (decisions: RegisterRow[] = [], more: Record<string, RegisterRow[]> = {}, adminOnly = false): ProjectData => {
  const p = createEmptyProject({ id: 'T', productCode: 'T', productSku: 'T', ownerDepartment: 'x', productGroup: 'x', brandCustomer: 'x', projectLead: 'x', dateOpened: '2026-01-01', targetLaunchDate: '2026-12-01', markets: ['Vietnam'], reviewers: {} } as never);
  p.registers = { ...p.registers, registerApplicability: decisions, ...more };
  if (adminOnly) p.assessments = { ...p.assessments, administrativeOnly: 'Yes', administrativeOnlyRationale: 'label wording only', administrativeOnlyConfirmedBy: 'A' } as never;
  return p;
};
const blocked = (p: ProjectData, gate: string, id: string) => gateBlockers(p, gate, 'Proceed with Conditions').some((b) => b.id === id);

// the table
{
  const all = Object.keys(REGISTER_APPLICABILITY);
  const configs = REGISTER_CONFIGS.map((c) => c.key);
  t('every register has a rule in the table', configs.every((k) => all.includes(k)), configs.filter((k) => !all.includes(k)).join(','));
  t('the table names no register that does not exist', all.every((k) => configs.includes(k)), all.filter((k) => !configs.includes(k)).join(','));
  t('register titles are unique (a decision names its register by title)', new Set(REGISTER_CONFIGS.map((c) => c.title)).size === REGISTER_CONFIGS.length);
  const optionTitles = REGISTER_CONFIGS.find((c) => c.key === 'registerApplicability')!.columns.find((c) => c.key === 'register')!.options ?? [];
  t('the decisions register offers exactly the registers that can take a decision', registersWithDecisions().every((k) => optionTitles.includes(title(k))) && optionTitles.length === registersWithDecisions().length);
  t('every register with a generated item has an item at its gate', applicabilityItemRegisters().every(({ register, gate }) => (GATE_READINESS[gate] ?? []).some((r) => r.id === `${gate.toLowerCase()}-applic-${register}`)));
  t('no Conditional item with a trigger was added (the acknowledgement table lists exactly 31)', (GATE_READINESS['SG02'] ?? []).filter((r) => r.id.includes('-applic-')).every((r) => r.tier === 'Mandatory' && !r.trigger));
}

// a generated item: entries, or a valid decision
{
  const key = 'needsAnatomyExposureNotes'; // Conditional, SG02, reuse + na
  const id = 'sg02-applic-needsAnatomyExposureNotes';
  t('nothing entered and no decision: the gate holds', blocked(project(), 'SG02', id));
  t('a reviewed "not applicable" clears it', !blocked(project([dec(key, { decision: 'Not applicable', evidenceLink: '' })]), 'SG02', id));
  t('reuse of an approved record clears it', !blocked(project([dec(key)]), 'SG02', id));
  t('reuse without the link does not', blocked(project([dec(key, { evidenceLink: '' })]), 'SG02', id));
  t('a decision without a rationale does not', blocked(project([dec(key, { rationale: '' })]), 'SG02', id));
  t('a decision nobody recorded does not', blocked(project([dec(key, { decidedBy: '' })]), 'SG02', id));
  t('entries typed into the register clear it', !blocked(project([], { [key]: [{ topic: 'Relevant anatomy / physiology', notes: 'typed by a person' }] }), 'SG02', id) && applicabilityState(project([], { [key]: [{ topic: 'Relevant anatomy / physiology' }] }), key) === 'open');
}

// what the table allows
{
  t('a Required register that allows only reuse refuses "not applicable"', decisionGaps(project(), 'packagingSpecsArtwork', dec('packagingSpecsArtwork', { decision: 'Not applicable' })).length > 0);
  t('a register the SME gave no stand-in for refuses any decision', decisionGaps(project(), 'formulationSafetyMatrix', dec('formulationSafetyMatrix')).length > 0);
  t('an administrative-only waiver is refused on a blank change type, and accepted once the project is confirmed administrative-only',
    decisionGaps(project(), 'competitorLandscape', dec('competitorLandscape', { decision: 'Not applicable', evidenceLink: '' })).length > 0 &&
      decisionGaps(project([], {}, true), 'competitorLandscape', dec('competitorLandscape', { decision: 'Not applicable', evidenceLink: '' })).length === 0);
  t('Reference registers take no decision and no item', REGISTER_APPLICABILITY.evidenceHierarchyGrades.decisions.length === 0 && !REGISTER_APPLICABILITY.evidenceHierarchyGrades.gate);
  t('Event-record and Optional registers add no gate item', ['campaignsSocialMedia', 'productDevelopmentIterations', 'pifEvidenceExport', 'systemFeedback', 'needsExecutiveBrief'].every((k) => !REGISTER_APPLICABILITY[k].gate));
}

// reuse stands in for an existing item's entries (the central rule)
{
  const p0 = project();
  const p1 = project([dec('evidencePlanProspective')]);
  t('the Gate 5 evidence-plan item is held with no rows and no decision', blocked(p0, 'SG05', 'sg05-npd-evidence-plan'));
  t('...and is met by a reviewed reuse of the approved plan', !blocked(p1, 'SG05', 'sg05-npd-evidence-plan'));
  t('"Not applicable" cannot replace the evidence plan (a claim-free product still needs one)', blocked(project([dec('evidencePlanProspective', { decision: 'Not applicable', evidenceLink: '' })]), 'SG05', 'sg05-npd-evidence-plan'));
  t('the Gate 3 competitor item accepts the administrative-only waiver', blocked(project(), 'SG03', 'sg03-npd-competitor-content') && !blocked(project([dec('competitorLandscape', { decision: 'Not applicable', evidenceLink: '' })], {}, true), 'SG03', 'sg03-npd-competitor-content'));
}

// "no claims" needs the checks
{
  const claims = (over: RegisterRow = {}) => dec('claimEvidenceTraceability', { decision: 'Not applicable', evidenceLink: '', checkedLabel: true, checkedWebsite: true, checkedOtherMaterial: true, ...over });
  t('"no claims" is not verified without the decision', !noClaimsVerified(project()));
  t('...nor when one of the three checks is missing', !noClaimsVerified(project([claims({ checkedWebsite: false })])) && decisionGaps(project(), 'claimEvidenceTraceability', claims({ checkedWebsite: false })).some((g) => /website/.test(g)));
  t('...and is verified with the label, website and other material checked', noClaimsVerified(project([claims()])));
  const gate = (decisions: RegisterRow[]) => {
    const p = project(decisions);
    p.gateChecks = p.gateChecks.map((c) => (c.gate === '03' && c.check === 'Claim/benefit areas selected and evidence route identified' ? { ...c, ynna: 'NA', notes: 'no claims proposed' } : c));
    return p;
  };
  t('the declaration of no claims needs the verification as well as the Key Gate Check', !noClaimsDeclared(gate([])) && noClaimsDeclared(gate([claims()])));
  t('a "no claims" decision does not stand in for the claims register generally (it is read only by the no-claims record)', applicabilityState(project([claims()]), 'claimEvidenceTraceability') === 'open');
}

// the register as saved
{
  t('a decision naming a register that takes none is refused', applicabilityRegisterProblems([dec('formulationSafetyMatrix')]).length === 1);
  t('...and so is a register with two decisions', applicabilityRegisterProblems([dec('needsAnatomyExposureNotes'), dec('needsAnatomyExposureNotes')]).length === 1);
  t('a clean decision is accepted', applicabilityRegisterProblems([dec('needsAnatomyExposureNotes')]).length === 0);
  const first = stampApplicabilityDecisions([], [dec('needsAnatomyExposureNotes', { decidedOn: 'forged' })], '2026-11-26');
  t('the date is the server\'s, not the request\'s', first[0].decidedOn === '2026-11-26');
  t('an unrelated edit keeps the date; a changed decision renews it', stampApplicabilityDecisions(first, [{ ...first[0], decidedBy: 'A' }], '2026-12-01')[0].decidedOn === '2026-11-26' && stampApplicabilityDecisions(first, [{ ...first[0], rationale: 'new reason' }], '2026-12-01')[0].decidedOn === '2026-12-01');
  t('the row can be read back by the register it names', !!decisionRowOf(project([dec('needsAnatomyExposureNotes')]), 'needsAnatomyExposureNotes'));
}

if (bad > 0) {
  console.log(`\n${bad} case(s) failed`);
  process.exit(1);
}
console.log('\nAll register applicability cases passed');
