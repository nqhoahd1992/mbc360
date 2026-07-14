import type { EvidenceItem } from '../types';

export const EVIDENCE_AREAS: Omit<EvidenceItem, 'status' | 'evidenceLink' | 'notes'>[] = [
  { area: 'Project / SKU identity', required: 'Y', trigger: 'Project opened or SKU added', primaryTemplate: 'Phase 1 (Marketing)', owner: 'Project owner', gate: '01-03' },
  { area: 'Formula BOM / costing', required: 'Y', trigger: 'Formula route or cost decision', primaryTemplate: 'Formula BOM / Costing Calc', owner: 'R&I / Finance', gate: '05' },
  { area: 'Raw material supplier evidence', required: 'Y', trigger: 'Any raw material used', primaryTemplate: 'Supplier RM Evidence', owner: 'Procurement / Quality', gate: '04/05' },
  { area: 'Full formulation safety', required: 'Y', trigger: 'Formula version locked', primaryTemplate: 'Formulation Safety', owner: 'Safety / Regulatory', gate: '07/10' },
  { area: 'Fragrance / allergen safety', required: 'Conditional', trigger: 'Fragrance, essential oil or allergen present', primaryTemplate: 'Fragrance Safety', owner: 'R&I / Regulatory', gate: '07/10' },
  { area: 'Prohibited ingredient check', required: 'Y', trigger: 'Per formula', primaryTemplate: 'Prohibited Ingredients', owner: 'Regulatory', gate: '07' },
  { area: 'Pregnancy/BF caution limits', required: 'Y', trigger: 'Per formula', primaryTemplate: 'PB Caution Limits', owner: 'Safety / Regulatory', gate: '07' },
  { area: 'Packaging specs & artwork', required: 'Y', trigger: 'Per SKU/market', primaryTemplate: 'Packaging Specs Artwork', owner: 'Packaging / Regulatory', gate: '06/10/11' },
  { area: 'Micro / PET evidence', required: 'Conditional', trigger: 'Where relevant', primaryTemplate: 'Micro PET Evidence', owner: 'Quality', gate: '08' },
  { area: 'Stability & release', required: 'Y', trigger: 'Per formula/pack', primaryTemplate: 'Stability Release', owner: 'Quality', gate: '09/11' },
  { area: 'Mechanism & claims map', required: 'Y', trigger: 'Before claim approval', primaryTemplate: 'Mechanism Claims Map', owner: 'R&I / Claims', gate: '03/10' },
  { area: 'Clinical / human evidence', required: 'Conditional', trigger: 'Where human support is needed', primaryTemplate: 'Clinical Human Evidence', owner: 'Clinical / R&I', gate: '08/10' },
  { area: 'ASEAN PIF map & checklist', required: 'Y', trigger: 'Per market', primaryTemplate: 'PIF Checklist ASEAN', owner: 'Regulatory', gate: '10' },
  { area: 'Change control & communication', required: 'Y', trigger: 'When anything changes', primaryTemplate: 'Change Control Comm', owner: 'Project owner / QA', gate: 'ALL' },
  { area: 'GMP links', required: 'Y', trigger: 'At launch/release', primaryTemplate: 'GMP Links', owner: 'Quality / Manufacturing', gate: '11' },
  { area: 'Post-market / CAPA', required: 'Y', trigger: 'After launch', primaryTemplate: 'PostMarket CAPA', owner: 'Quality / PV-PMS', gate: '12' },
];
