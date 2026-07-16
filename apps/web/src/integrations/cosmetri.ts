// Cosmetri API client — DEMO MOCK.
//
// Shapes follow docs/swagger-init.json (OpenAPI 3.0, base
// https://app1-env.cosmetri.com/api/v1):
//  - POST /oauth/token  grant_type=password  -> access_token + refresh_token
//  - PUT  /oauth/token  grant_type=refresh_token
//  - POST /formula/list, POST /formula/{id}   (formula_composition rows)
//  - POST /raw-material/details               (supplier_name, status_label, ...)
//  - GET  /compliance/{formulaId}             (inci_name, cas_no, ec_no, % w/w)
//
// This demo has no backend, so every call is simulated against the mock data
// below. A production build must proxy these calls through the MBc360 backend
// (CORS + credential handling) and keep Cosmetri strictly READ-ONLY per the
// confirmed A3 decision (the API's PUT /raw-material/update is not used).

export const COSMETRI_DEFAULT_BASE_URL = 'https://app1-env.cosmetri.com/api/v1';

export interface CosmetriTokenSet {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
}

export interface CosmetriFormulaSummary {
  id: number;
  reference: string; // inf_reference
  version: string;
  productTitle: string;
  status: string;
}

// One importable BOM row, assembled the way a real integration would combine
// /formula/{id} (composition) + /raw-material/details (supplier_name, status)
// + /compliance/{formulaId} (inci_name, cas_no).
export interface CosmetriImportRow {
  rmId: number;
  tradeName: string;
  inciName: string;
  casNo: string;
  percentWw: number;
  supplierName: string;
  qualityStatus: string; // status_label, e.g. "Approved"
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function fakeToken(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

// POST /oauth/token (grant_type=password). Any non-empty credentials succeed
// in the demo; a real call returns 401 handling and throttling (429).
export async function cosmetriAuthenticate(
  _baseUrl: string,
  username: string,
  password: string,
): Promise<CosmetriTokenSet> {
  await delay(600);
  if (!username.trim() || !password.trim()) {
    throw new Error('Username and password are required for the password grant.');
  }
  const now = Date.now();
  return {
    accessToken: fakeToken('at'),
    refreshToken: fakeToken('rt'),
    accessTokenExpiresAt: new Date(now + 60 * 60 * 1000).toISOString(), // 1 hour
    refreshTokenExpiresAt: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  };
}

// --- Mock master data -------------------------------------------------------

const MOCK_FORMULAS: (CosmetriFormulaSummary & { rows: CosmetriImportRow[] })[] = [
  {
    id: 212,
    reference: 'FRM-BALM-02',
    version: '2.0.0',
    productTitle: 'Soothing Nipple & Baby Balm 50g',
    status: 'active',
    rows: [
      { rmId: 2511, tradeName: 'Lanolin Ultra', inciName: 'Lanolin', casNo: '8006-54-0', percentWw: 60, supplierName: 'NZ Lanolin Co', qualityStatus: 'Approved' },
      { rmId: 2512, tradeName: 'Shea Butter Refined', inciName: 'Butyrospermum Parkii (Shea) Butter', casNo: '194043-92-0', percentWw: 20, supplierName: 'Naturals SEA', qualityStatus: 'Approved' },
      { rmId: 2513, tradeName: 'Coconut Oil RBD', inciName: 'Cocos Nucifera (Coconut) Oil', casNo: '8001-31-8', percentWw: 15, supplierName: 'Naturals SEA', qualityStatus: 'Approved' },
      { rmId: 2514, tradeName: 'Vitamin E Oil', inciName: 'Tocopherol', casNo: '10191-41-0', percentWw: 0.5, supplierName: 'VitaChem', qualityStatus: 'Approved' },
      { rmId: 2515, tradeName: 'Calendula CO2 Extract', inciName: 'Calendula Officinalis Extract', casNo: '84776-23-8', percentWw: 4.5, supplierName: 'BotaniPure', qualityStatus: 'Approved' },
    ],
  },
  {
    id: 305,
    reference: 'FRM-STRETCH-01',
    version: '1.1.0',
    productTitle: 'Stretch Mark Comfort Cream 100g',
    status: 'active',
    rows: [
      { rmId: 2601, tradeName: 'Aqua Purified', inciName: 'Aqua', casNo: '7732-18-5', percentWw: 62, supplierName: 'In-house', qualityStatus: 'Approved' },
      { rmId: 2602, tradeName: 'Shea Butter Refined', inciName: 'Butyrospermum Parkii (Shea) Butter', casNo: '194043-92-0', percentWw: 12, supplierName: 'Naturals SEA', qualityStatus: 'Approved' },
      { rmId: 2603, tradeName: 'Retinyl Palmitate 1.6 MIU', inciName: 'Retinyl Palmitate', casNo: '79-81-2', percentWw: 0.2, supplierName: 'VitaChem', qualityStatus: 'Quarantined' },
      { rmId: 2604, tradeName: 'Caffeine Anhydrous', inciName: 'Caffeine', casNo: '58-08-2', percentWw: 1, supplierName: 'ActiveLabs', qualityStatus: 'Approved' },
      { rmId: 2605, tradeName: 'Glyceryl Stearate SE', inciName: 'Glyceryl Stearate', casNo: '31566-31-1', percentWw: 4, supplierName: 'EmulsiCo', qualityStatus: 'Approved' },
    ],
  },
  {
    id: 401,
    reference: 'FRM-WASH-01',
    version: '1.0.0',
    productTitle: 'Gentle Feminine Wash 250mL',
    status: 'active',
    rows: [
      { rmId: 2701, tradeName: 'Aqua Purified', inciName: 'Aqua', casNo: '7732-18-5', percentWw: 78, supplierName: 'In-house', qualityStatus: 'Approved' },
      { rmId: 2702, tradeName: 'Coco Glucoside 50%', inciName: 'Coco-Glucoside', casNo: '110615-47-9', percentWw: 12, supplierName: 'GreenSurf', qualityStatus: 'Approved' },
      { rmId: 2703, tradeName: 'Salicylic Acid USP', inciName: 'Salicylic Acid', casNo: '69-72-7', percentWw: 0.5, supplierName: 'ActiveLabs', qualityStatus: 'Approved' },
      { rmId: 2704, tradeName: 'Lactic Acid 88%', inciName: 'Lactic Acid', casNo: '50-21-5', percentWw: 1.2, supplierName: 'ActiveLabs', qualityStatus: 'Approved' },
    ],
  },
];

// POST /formula/list (paginated in the real API).
export async function cosmetriListFormulas(): Promise<CosmetriFormulaSummary[]> {
  await delay(400);
  return MOCK_FORMULAS.map(({ rows: _rows, ...summary }) => summary);
}

// Combined /formula/{id} + /raw-material/details + /compliance/{id} view.
export async function cosmetriGetFormulaImport(formulaId: number): Promise<CosmetriImportRow[]> {
  await delay(500);
  const formula = MOCK_FORMULAS.find((f) => f.id === formulaId);
  if (!formula) throw new Error(`Formula ${formulaId} not found in Cosmetri.`);
  return formula.rows.map((r) => ({ ...r }));
}
