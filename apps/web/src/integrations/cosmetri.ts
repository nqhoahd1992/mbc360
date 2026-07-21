// Cosmetri API client for the BOM-import data endpoints.
//
// The browser never talks to Cosmetri directly and never holds its
// credentials (A3) — it calls MBc360's own backend proxy
// (apps/api/src/cosmetri/cosmetri-data.service.ts), which authenticates to
// Cosmetri with the server-held access token (see cosmetri-token.service.ts /
// useCosmetriStatus for the connection itself).

export const COSMETRI_DEFAULT_BASE_URL = 'https://app1-env.cosmetri.com/api/v1';

export interface CosmetriFormulaSummary {
  id: number;
  reference: string; // inf_reference
  version: string;
  productTitle: string;
  status: string;
}

// One importable BOM row, assembled server-side by combining
// /formula/{id} (composition) + /raw-material/details (supplier_name, status)
// + /compliance/{formulaId} (inci_name, cas_no).
export interface CosmetriImportRow {
  rmId: number;
  tradeName: string;
  // inf_code — Cosmetri's own human-readable raw-material code (e.g.
  // "OL-NA-006"), as shown in Cosmetri's own UI ("{trade name} | {code}").
  code: string;
  inciName: string;
  casNo: string;
  percentWw: number;
  supplierName: string;
  qualityStatus: string; // status_label, e.g. "Approved"
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json().catch(() => undefined);
  if (!res.ok) {
    throw new Error(
      (body && typeof body === 'object' && 'message' in body && String(body.message)) ||
        `Request to ${url} failed (HTTP ${res.status}).`,
    );
  }
  return body as T;
}

export async function cosmetriListFormulas(): Promise<CosmetriFormulaSummary[]> {
  return getJson<CosmetriFormulaSummary[]>('/api/integrations/cosmetri/formulas');
}

export async function cosmetriGetFormulaImport(formulaId: number): Promise<CosmetriImportRow[]> {
  return getJson<CosmetriImportRow[]>(`/api/integrations/cosmetri/formulas/${formulaId}/import-rows`);
}

// Standalone raw-material catalogue (F14: the manual Formula BOM line
// raw-material picker) — not INCI/CAS, only identity/supplier/status; see
// the backend service comment for why.
export interface CosmetriRawMaterialSummary {
  id: number;
  tradeName: string;
  code: string;
  supplierName: string;
  qualityStatus: string;
  category: string;
}

export async function cosmetriListRawMaterials(): Promise<CosmetriRawMaterialSummary[]> {
  return getJson<CosmetriRawMaterialSummary[]>('/api/integrations/cosmetri/raw-materials');
}
