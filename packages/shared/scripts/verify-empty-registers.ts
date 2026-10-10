// Verifies the registers that are LEGITIMATELY empty on some projects, and the joins that read them.
// A product with nothing restricted has an empty general-caution register; a product that proposes
// no claims has an empty claims register. Neither must be forced to invent a row to pass a gate —
// and neither may let "nobody has looked" read as a pass. Pure functions over a hand-built project
// on the real rule engine; no database, no API. Run: npm run verify:empty-registers
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { gateReadinessChecklist, uncoveredFormulaLines } from '../src/utils/gateProgress';
import type { ProjectData } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) bad++;
};
const fresh = (): ProjectData =>
  createEmptyProject({ id: 'T-1', productCode: 'T', projectLead: 'x', markets: ['Vietnam'], reviewers: {} } as never);
const satisfied = (p: ProjectData, gate: string, id: string): boolean | undefined =>
  gateReadinessChecklist(p, gate).find((i) => i.id === id)?.satisfied;

const CLAIMS_CHECK = 'Claim/benefit areas selected and evidence route identified';
const setCheck = (p: ProjectData, gate: string, check: string, patch: Record<string, unknown>) => {
  const row = p.gateChecks.find((c) => c.gate === gate && c.check === check);
  if (!row) throw new Error(`gate check not found: ${gate} / ${check}`);
  Object.assign(row, patch);
};

// --- Gate 10: a product that explicitly proposes no claims ---------------------------------------
{
  const p = fresh();
  t('no-claims: the items exist', satisfied(p, 'SG10', 'sg10-claims-register') !== undefined && satisfied(p, 'SG10', 'sg10-claim-evidence') !== undefined);
  t('no-claims: nothing recorded -> both items BLOCK (an empty ledger alone is not a declaration)',
    satisfied(p, 'SG10', 'sg10-claims-register') === false && satisfied(p, 'SG10', 'sg10-claim-evidence') === false);
  setCheck(p, '03', CLAIMS_CHECK, { ynna: 'NA', done: false, notes: 'Administrative change, no claims proposed' });
  t('no-claims: declared (N/A with a reason, empty ledger) -> both items pass',
    satisfied(p, 'SG10', 'sg10-claims-register') === true && satisfied(p, 'SG10', 'sg10-claim-evidence') === true);
  setCheck(p, '03', CLAIMS_CHECK, { notes: '' });
  t('no-claims: N/A with NO reason is not a declaration -> blocks again',
    satisfied(p, 'SG10', 'sg10-claims-register') === false);
  setCheck(p, '03', CLAIMS_CHECK, { notes: 'Administrative change, no claims proposed' });
  p.registers['claimEvidenceTraceability'] = [{ claimId: 'C-1', approvedWording: 'Hydrates' }];
  t('no-claims: a claim in the ledger contradicts the declaration -> blocks (no escape with claims present)',
    satisfied(p, 'SG10', 'sg10-claims-register') === false && satisfied(p, 'SG10', 'sg10-claim-evidence') === false);
  p.registers['skuClaimsPifRegister'] = [{ evidenceLink: 'https://x', pifLink: 'https://y' }];
  t('claims present and the SKU register complete -> the ordinary path still passes',
    satisfied(p, 'SG10', 'sg10-claims-register') === true && satisfied(p, 'SG10', 'sg10-claim-evidence') === true);
  p.registers['skuClaimsPifRegister'] = [{ evidenceLink: 'https://x', pifLink: '' }];
  t('claims present, a row missing its PIF link -> the evidence item blocks', satisfied(p, 'SG10', 'sg10-claim-evidence') === false);
}

// --- Gate 7: the general restricted-and-caution register ---------------------------------------
{
  const GC_CHECK = 'General restricted and caution ingredient assessment completed';
  const p = fresh();
  t('general caution: the item exists', satisfied(p, 'SG07', 'sg07-general-caution') !== undefined);
  t('general caution: empty register, nobody has looked (check not done) -> BLOCKS', satisfied(p, 'SG07', 'sg07-general-caution') === false);
  setCheck(p, '07', GC_CHECK, { ynna: 'Y', done: true });
  t('general caution: empty register, assessment recorded as done -> passes (nothing restricted is a real answer)',
    satisfied(p, 'SG07', 'sg07-general-caution') === true);
  p.registers['generalRestrictedCaution'] = [{ ingredient: 'X', assessmentOutcome: '' }];
  t('general caution: a row left with a BLANK outcome -> blocks', satisfied(p, 'SG07', 'sg07-general-caution') === false);
  p.registers['generalRestrictedCaution'] = [{ ingredient: 'X', assessmentOutcome: 'Needs Safety Review' }];
  t('general caution: an unresolved outcome -> blocks', satisfied(p, 'SG07', 'sg07-general-caution') === false);
  p.registers['generalRestrictedCaution'] = [{ ingredient: 'X', assessmentOutcome: 'No issue identified' }];
  t('general caution: a closed outcome -> passes', satisfied(p, 'SG07', 'sg07-general-caution') === true);
  setCheck(p, '07', GC_CHECK, { ynna: 'NA', done: false, notes: '' });
  t('general caution: N/A with no reason does not stand in for the assessment', satisfied(p, 'SG07', 'sg07-general-caution') === false);
}

// --- the panel says so when a part is green only because the register is empty ---------------------
{
  const GC_CHECK = 'General restricted and caution ingredient assessment completed';
  const partsOf = (p: ProjectData, gate: string, id: string) => gateReadinessChecklist(p, gate).find((i) => i.id === id)?.parts;
  const p = fresh();
  const empty = partsOf(p, 'SG07', 'sg07-general-caution');
  t('empty note: the item breaks into parts', !!empty && empty.length === 3);
  t('empty note: with the register empty, the two "every row" parts are green AND carry a note',
    !!empty && empty.filter((x) => x.satisfied && x.emptyNote).length === 2);
  t('empty note: the Key Gate Check part is open and carries no note', !!empty && empty.filter((x) => !x.satisfied && !x.emptyNote).length === 1);
  t('empty note: the note points at the Key Gate Check', !!empty && empty.every((x) => !x.emptyNote || x.emptyNote.includes('Key Gate Check')));
  p.registers['generalRestrictedCaution'] = [{ ingredient: 'X', assessmentOutcome: 'No issue identified' }];
  const filled = partsOf(p, 'SG07', 'sg07-general-caution');
  t('empty note: once the register has a row, no part claims to be empty', !!filled && filled.every((x) => !x.emptyNote));
  const q = fresh();
  const pack = partsOf(q, 'SG06', 'sg06-pack-spec');
  t('empty note: a register that MUST have rows never gets the note (its empty state is the open part)',
    !!pack && pack.every((x) => !x.emptyNote) && pack.some((x) => !x.satisfied));
}

// --- the join between a formula line and a safety-matrix row ---------------------------------------
{
  const row = (o: Record<string, string>) => ({ coverageRoute: 'Individual assessment', coverageReference: 'x', ...o });
  const run = (bom: Record<string, string>[], matrix: Record<string, string>[]) => {
    const p = fresh();
    p.bom = bom as never;
    p.registers['formulationSafetyMatrix'] = matrix;
    return uncoveredFormulaLines(p);
  };
  t('join: same INCI but a DIFFERENT code is not the same material -> no matrix row',
    run([{ rmCode: 'X', inciName: 'Glycerin' }], [row({ rmCode: 'Y', inciName: 'Glycerin' })])[0]?.reason === 'no safety-matrix row');
  t('join: same code -> found', run([{ rmCode: 'X', inciName: 'Glycerin' }], [row({ rmCode: 'X', inciName: 'other' })])[0]?.reason !== 'no safety-matrix row');
  t('join: a legacy row with no code of its own still matches by INCI (case-insensitive)',
    run([{ rmCode: 'X', inciName: 'Glycerin' }], [row({ rmCode: '', inciName: 'glycerin' })])[0]?.reason !== 'no safety-matrix row');
  t('join: a formula line with no code falls back to INCI', run([{ rmCode: '', inciName: 'Glycerin' }], [row({ rmCode: 'Y', inciName: 'Glycerin' })])[0]?.reason !== 'no safety-matrix row');
  t('join: an empty formula covers nothing, and the matrix does not invent a line', run([], [row({ rmCode: 'X', inciName: 'Glycerin' })]).length === 0);
}

console.log(bad === 0 ? '\nAll cases passed.' : `\n${bad} case(s) FAILED.`);
process.exit(bad === 0 ? 0 : 1);
