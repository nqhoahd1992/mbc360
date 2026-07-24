import type { ChangeRecord, ProjectData } from '@mbc360/shared/types';
import { DEFAULT_REVIEWERS } from '@mbc360/shared/config/reviewers';
import { createEmptyProject } from '../store/factory';

function buildSampleProjectA(): ProjectData {
  const p = createEmptyProject({
    id: 'MBC-2026-001',
    productCode: 'MBB-BALM-50',
    projectLead: 'Anna Tran',
    productGroup: 'Mother & Baby Care',
    brandCustomer: 'Max Biocare',
    dateOpened: '2026-03-02',
    targetLaunchDate: '2026-11-30',
    productSku: 'Soothing Nipple & Baby Balm 50g',
    ownerDepartment: 'NPD',
    markets: ['Vietnam', 'Australia', 'Malaysia'],
    reviewers: DEFAULT_REVIEWERS,
  });

  // Phase 1 passed and signed off, Phase 2 in progress
  p.gates = p.gates.map((g, i) => {
    if (i < 3) return { ...g, status: 'Complete', decision: 'Proceed', owner: 'Anna Tran' };
    if (i === 3) return { ...g, status: 'Complete', decision: 'Proceed', owner: 'Tuan Le' };
    if (i === 4) return { ...g, status: 'In Progress', owner: 'Tuan Le', dueDate: '2026-08-15' };
    return g;
  });

  const tick = (section: string, labels: string[]) => {
    p.checklists[section] = p.checklists[section].map((item) =>
      labels.includes(item.label)
        ? { ...item, selected: true, status: 'Y', evidenceLink: 'shared-drive/mbc-2026-001' }
        : item,
    );
  };
  tick('targetArea', ['Skin (Whole Body)', 'Lips']);
  tick('productType', ['Balm', 'Nipple product']);
  tick('targetUsers', ['Pregnancy', 'Breastfeeding', 'Postpartum', 'Infant 0+', 'Sensitive skin']);
  tick('targetMarkets', ['Vietnam', 'Australia', 'Malaysia']);
  tick('claimAreas', ['Moisturising', 'Soothing', 'Nipple comfort', 'Fragrance-free', 'Pregnancy suitable', 'Breastfeeding suitable']);
  tick('evidenceRoute', ['Supplier evidence', 'Peer-reviewed article', 'Consumer / sensory trial']);
  tick('rmDocPack', ['Specification', 'CoA', 'SDS', 'Allergen statement', 'Origin statement']);
  tick('sensoryChoices', ['Rich', 'Non-greasy', 'Fragrance-free', 'Tube-friendly']);

  p.gateChecks = p.gateChecks.map((c) =>
    ['01', '02', '03', '04'].includes(c.gate)
      ? { ...c, done: true, ynna: 'Y', date: '2026-05-20', initials: 'AT' }
      : c,
  );

  p.phaseClosures[1] = {
    ...p.phaseClosures[1],
    evidenceSummary:
      'Concept locked as fragrance-free maternal balm. Claims limited to comfort/moisturising pending human study.',
    signOffs: [
      { role: 'Prepared by', name: 'Anna Tran', initials: 'AT', date: '2026-05-20', decision: 'Proceed', comments: '' },
      { role: 'Reviewed by', name: 'George Pham', initials: 'GP', date: '2026-05-21', decision: 'Proceed', comments: '' },
      { role: 'Approved by', name: 'Sekar N.', initials: 'SN', date: '2026-05-22', decision: 'Proceed', comments: 'Proceed to NPD' },
    ],
    // B3: every angle must be covered or justified N/A before the phase can close.
    angles: p.phaseClosures[1].angles.map((a) =>
      ['Consumer need', 'Use context & life stage', 'Claims evidence'].includes(a.angle)
        ? { ...a, ynna: 'Y', covered: true, date: '2026-05-20', initials: 'AT' }
        : { ...a, ynna: 'NA', comments: 'Not assessable at concept stage — first reviewed in Phase 2/3.' },
    ),
  };

  // B2: next actions are controlled per-gate records. SG04's action is closed;
  // SG05 carries an open action, so SG05 cannot pass on a plain Proceed until
  // it is done (or the decision is Proceed with Conditions).
  p.nextActions = [
    {
      id: 'NA-SEED-1',
      gateId: 'SG04',
      description: 'Collect missing allergen statement for RM-005 (calendula extract)',
      owner: 'Chidkamon',
      dueDate: '2026-06-30',
      status: 'Closed',
      priority: 'High',
      verifiedBy: 'George',
      dateCompleted: '2026-06-24',
    },
    {
      id: 'NA-SEED-2',
      gateId: 'SG05',
      description: 'Confirm pilot batch pH range with manufacturing before locking formula',
      owner: 'Tuan Le',
      dueDate: '2026-08-10',
      status: 'Open',
      priority: 'Medium',
    },
  ];

  // A1: per-market Gate 10-12 tracking (regulatory work differs by country).
  p.marketTracks = p.marketTracks.map((t) =>
    t.market === 'Vietnam'
      ? { ...t, pifStatus: 'In Progress', regulatoryStatus: 'In Progress', regulatoryNotes: 'PIF compilation started early — VN re-registration lead time ~6 months.' }
      : t,
  );

  // Established formula — its lines are reconciled to Cosmetri (F14); a newly
  // added manual line defaults to "Draft - Not Reconciled" until reconciled.
  p.bom = [
    { line: 1, rmCode: 'RM-001', inciName: 'Lanolin', functionRole: 'Emollient / base', supplier: 'NZ Lanolin Co', percentWw: 60, costPerKg: 18.5, reconciled: true },
    { line: 2, rmCode: 'RM-002', inciName: 'Butyrospermum Parkii (Shea) Butter', functionRole: 'Emollient', supplier: 'Naturals SEA', percentWw: 20, costPerKg: 9.2, reconciled: true },
    { line: 3, rmCode: 'RM-003', inciName: 'Cocos Nucifera (Coconut) Oil', functionRole: 'Emollient', supplier: 'Naturals SEA', percentWw: 15, costPerKg: 6.8, reconciled: true },
    { line: 4, rmCode: 'RM-004', inciName: 'Tocopherol', functionRole: 'Antioxidant', supplier: 'VitaChem', percentWw: 0.5, costPerKg: 42, reconciled: true },
    { line: 5, rmCode: 'RM-005', inciName: 'Calendula Officinalis Extract', functionRole: 'Soothing active', supplier: 'BotaniPure', percentWw: 4.5, costPerKg: 55, reconciled: true },
  ];
  p.costing = {
    batchSizeKg: 100,
    fillSizeG: 50,
    targetUnits: 2000,
    packagingCostPerUnit: 0.45,
    labourOverheadPerUnit: 0.3,
    freightOtherPerUnit: 0.12,
    targetSellPrice: 12.5,
  };

  p.evidence = p.evidence.map((e) =>
    ['Project / SKU identity', 'Formula BOM / costing', 'Raw material supplier evidence'].includes(e.area)
      ? { ...e, status: 'Completed', evidenceLink: 'shared-drive/mbc-2026-001/evidence' }
      : e.area === 'Prohibited ingredient check'
        ? { ...e, status: 'In Progress' }
        : e,
  );

  p.feedback = [
    {
      id: 'FB-001', testerName: 'Linh Vo', gender: 'F', dept: 'Marketing', dateTested: '2026-06-10',
      texture: 4, fragrance: 5, overall: 4, tooOilySlippery: false, wouldRecommend: true,
      bestLiked: 'Absorbs well, no scent', concerns: 'Slightly waxy on first apply',
    },
    {
      id: 'FB-002', testerName: 'Minh Dao', gender: 'M', dept: 'Quality', dateTested: '2026-06-11',
      texture: 3, fragrance: 4, overall: 3, tooOilySlippery: true, wouldRecommend: true,
      bestLiked: 'Gentle feel', concerns: 'Slippery residue on hands - flag for safety note',
    },
  ];

  return p;
}

function buildSampleProjectB(): ProjectData {
  const p = createEmptyProject({
    id: 'MBC-2026-002',
    productCode: 'GFW-250',
    projectLead: 'Bao Nguyen',
    productGroup: 'Feminine Care',
    brandCustomer: 'Max Biocare',
    dateOpened: '2026-06-20',
    targetLaunchDate: '2027-03-31',
    productSku: 'Gentle Feminine Wash 250mL',
    ownerDepartment: 'Marketing',
    markets: ['Vietnam'],
    reviewers: DEFAULT_REVIEWERS,
  });
  p.gates = p.gates.map((g, i) =>
    i === 0 ? { ...g, status: 'In Progress', owner: 'Bao Nguyen', dueDate: '2026-07-31' } : g,
  );
  return p;
}

export function seedProjects(): ProjectData[] {
  return [buildSampleProjectA(), buildSampleProjectB()];
}

export function seedChanges(): ChangeRecord[] {
  return [
    {
      changeId: 'CHG-001',
      projectId: 'MBC-2026-001',
      // Links the change to the Formula ingredient trigger (gates 05/08), so it
      // soft-locks Gate 05 — the demo's current gate — until it is closed (F9).
      triggerId: 'formula-ingredient',
      trigger: 'Supplier discontinued RM-005 grade',
      productSku: 'Soothing Nipple & Baby Balm 50g',
      affectedArea: 'Formula / Supplier',
      oldVersion: 'F1.0',
      riskLevel: 'Medium',
      requiredAction: 'Qualify substitute calendula extract; update Ingredient Substitution record',
      requiredSignOffs: 'R&I, Safety, Regulatory',
      communicationRequired: true,
      salesMarketingMessage: 'No consumer-facing change; same soothing profile.',
      dueDate: '2026-08-30',
      status: 'In Implementation',
      owner: 'Tuan Le',
      notes: 'Awaiting supplier CoA for replacement grade.',
    },
  ];
}
