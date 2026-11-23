// SW-59 (project owner, 2026-11-23): a register that uses company reference data links to the record by a picked field, the cells that restate the
// record are filled from it and read-only. This covers the Claims Library link of the claim ledger and the market profile behind the Regulatory
// Checklist Status (the Restricted & caution list is covered by verify-general-caution). Pure functions on the real config.
// Run: npm run verify:reference-links
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { REGISTER_CONFIGS } from '../src/config/registers';
import { CLAIM_LIBRARY_LINK_OPTIONS } from '../src/config/referenceData';
import { deriveRegisterRows } from '../src/utils/registerDerived';
import {
  applyClaimsLibraryInheritance,
  applyMarketProfileInheritance,
  claimsLibraryInheritedCells,
  linkedClaimsLibraryEntry,
  marketProfileFor,
} from '../src/utils/referenceInheritance';
import type { ClaimLibraryEntry, MarketProfile, ProjectData, RegisterRow } from '../src/types';

let bad = 0;
const t = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !extra ? '' : `   ${extra}`}`);
  if (!ok) bad++;
};

const claimCfg = REGISTER_CONFIGS.find((c) => c.key === 'claimEvidenceTraceability')!;
const dossierCfg = REGISTER_CONFIGS.find((c) => c.key === 'regulatoryChecklistStatus')!;
const LINKED = CLAIM_LIBRARY_LINK_OPTIONS[0];
const entry = (over: Partial<ClaimLibraryEntry> = {}): ClaimLibraryEntry =>
  ({ id: 'L1', wording: 'Hydrates skin for 24 hours', claimCategory: 'Cosmetic', claimRisk: 'Low', status: 'Approved', revision: 1, ...over }) as ClaimLibraryEntry;
const claim = (over: RegisterRow = {}): RegisterRow => ({ claimId: 'CLM-001', ...over });

// --- the claim ledger and the Claims Library ----------------------------------------------------------------------------------------------------
{
  const col = (key: string) => claimCfg.columns.find((c) => c.key === key)!;
  t('wording, category, risk and the link declaration are marked as read from the library entry',
    col('approvedWording').inheritFromLibrary === 'wording' && col('claimCategory').inheritFromLibrary === 'claimCategory' && col('claimRisk').inheritFromLibrary === 'claimRisk' && col('libraryStatus').inheritFromLibrary === 'linkStatus');
  t('...and what a reviewer decides is not (review outcome, mechanism, evidence, status)',
    ['regulatoryReviewOutcome', 'mechanism', 'evidenceGrade', 'status', 'claimSubjects'].every((k) => !col(k).inheritFromLibrary));

  const lib = [entry(), entry({ id: 'L2', status: 'Withdrawn', wording: 'Old wording' }), entry({ id: 'L3', claimRisk: undefined, wording: 'No risk set' })];
  t('a withdrawn entry is not one to copy from', linkedClaimsLibraryEntry(lib, 'L2') === undefined && !!linkedClaimsLibraryEntry(lib, 'L1'));
  t('an entry the claim does not name is not found', linkedClaimsLibraryEntry(lib, '') === undefined && linkedClaimsLibraryEntry(lib, 'nope') === undefined);

  const forged = claim({ libraryEntryId: 'L1', approvedWording: 'forged', claimCategory: 'Therapeutic', claimRisk: 'High', libraryStatus: 'New claim — not yet in Claims Library' });
  const [filled] = applyClaimsLibraryInheritance(claimCfg.columns, [forged], lib, [claim()], 'all');
  t('a linked claim takes wording, category, risk and the Linked declaration from the entry, whatever the request carried',
    filled.approvedWording === 'Hydrates skin for 24 hours' && filled.claimCategory === 'Cosmetic' && filled.claimRisk === 'Low' && filled.libraryStatus === LINKED);

  const [noRisk] = applyClaimsLibraryInheritance(claimCfg.columns, [claim({ libraryEntryId: 'L3', claimRisk: 'Pending classification' })], lib, [claim()], 'all');
  t('a value the entry holds nothing for is left as the person typed it', noRisk.claimRisk === 'Pending classification' && noRisk.approvedWording === 'No risk set');

  const [newClaim] = applyClaimsLibraryInheritance(claimCfg.columns, [claim({ approvedWording: 'My own new claim', claimCategory: 'Cosmetic' })], lib, [claim()], 'all');
  t('a claim with no link is a new claim: what was typed stays', newClaim.approvedWording === 'My own new claim');
  const [toWithdrawn] = applyClaimsLibraryInheritance(claimCfg.columns, [claim({ libraryEntryId: 'L2', approvedWording: 'kept as saved' })], lib, [claim({ libraryEntryId: 'L2' })], 'all');
  t('a claim linked to withdrawn wording keeps what it held (it is flagged, not rewritten)', toWithdrawn.approvedWording === 'kept as saved');

  // The two passes of the server: a changed link before the revision checks, the others after.
  const committed = [claim({ libraryEntryId: 'L1', approvedWording: 'old text' })];
  const keep = claim({ libraryEntryId: 'L1', approvedWording: 'old text' });
  t('the "changed" pass leaves a claim that kept its link alone', applyClaimsLibraryInheritance(claimCfg.columns, [keep], lib, committed, 'changed')[0].approvedWording === 'old text');
  t('...and the "unchanged" pass makes it follow the library', applyClaimsLibraryInheritance(claimCfg.columns, [keep], lib, committed, 'unchanged')[0].approvedWording === 'Hydrates skin for 24 hours');
  const moved = claim({ libraryEntryId: 'L3', approvedWording: 'old text' });
  t('a link just changed is applied by the "changed" pass', applyClaimsLibraryInheritance(claimCfg.columns, [moved], lib, committed, 'changed')[0].approvedWording === 'No risk set');
  t('...and is not touched again by the "unchanged" pass', applyClaimsLibraryInheritance(claimCfg.columns, [moved], lib, committed, 'unchanged')[0].approvedWording === 'old text');

  const [cleared] = applyClaimsLibraryInheritance(claimCfg.columns, [claim({ libraryEntryId: '', libraryStatus: LINKED, approvedWording: 'typed again' })], lib, committed, 'changed');
  t('clearing the link drops the Linked declaration, so the person says "New claim" on purpose', cleared.libraryStatus === '' && cleared.approvedWording === 'typed again');
  t('the cells taken from an entry are exactly the marked columns', Object.keys(claimsLibraryInheritedCells(claimCfg.columns, entry())).sort().join() === 'approvedWording,claimCategory,claimRisk,libraryStatus');
}

// --- the market profile and the Regulatory Checklist Status ---------------------------------------------------------------------------------------
{
  const profile = (over: Partial<MarketProfile> = {}): MarketProfile =>
    ({ id: 'M1', market: 'Australia', adverseEventReporting: true, pmsRecordsRequired: true, enhancedSurveillance: false, dossierType: 'ARTG listing', revision: 1, ...over }) as MarketProfile;
  const dossier = dossierCfg.columns.find((c) => c.key === 'dossierType')!;
  t('the register\'s Required dossier type is marked as read from the market profile', dossier.inheritFromMarketProfile === 'dossierType');
  t('a profile is found by market, whatever the capitalisation', !!marketProfileFor([profile()], ' australia ') && marketProfileFor([profile()], 'Japan') === undefined && marketProfileFor([profile()], '') === undefined);

  const [row] = applyMarketProfileInheritance(dossierCfg.columns, [{ market: 'Australia', dossierType: 'forged' }], [profile()]);
  t('the dossier type is the profile\'s, whatever the row carried', row.dossierType === 'ARTG listing');
  const [blankProfile] = applyMarketProfileInheritance(dossierCfg.columns, [{ market: 'Australia', dossierType: 'typed by Regulatory' }], [profile({ dossierType: '' })]);
  t('a profile that names no dossier type leaves the typed value', blankProfile.dossierType === 'typed by Regulatory');
  const [noProfile] = applyMarketProfileInheritance(dossierCfg.columns, [{ market: 'Japan', dossierType: 'typed' }], [profile()]);
  t('a market with no profile keeps what was typed', noProfile.dossierType === 'typed');

  const p: ProjectData = createEmptyProject({ id: 'T-1', productCode: 'T', projectLead: 'x', markets: ['Australia'], reviewers: {} } as never);
  p.reference = { ...p.reference, marketProfiles: [profile()] };
  const derived = deriveRegisterRows('regulatoryChecklistStatus', [{ market: 'Australia', dossierType: 'stale' }], p);
  t('the register is derived from the profile on every read and save (deriveRegisterRows)', derived[0].dossierType === 'ARTG listing');
  p.reference = { ...p.reference, marketProfiles: [profile({ dossierType: 'Notification' })] };
  t('...so a later change to the profile shows at once, without anyone saving the row', deriveRegisterRows('regulatoryChecklistStatus', [{ market: 'Australia', dossierType: 'ARTG listing' }], p)[0].dossierType === 'Notification');
}

console.log(bad === 0 ? '\nall passed' : `\n${bad} FAILED`);
process.exit(bad === 0 ? 0 : 1);
