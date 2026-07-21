import { BadGatewayException, Injectable } from '@nestjs/common';
import { CosmetriTokenService } from './cosmetri-token.service';

// Real Cosmetri BOM-import data proxy (M4). Shapes follow docs/swagger-init.json
// (OpenAPI 3.0, bearer-authenticated):
//  - POST /formula/list                       (paginated IDs only)
//  - POST /formula/details                    (batch: inf_reference, customer_group_label)
//  - POST /formula/{id}                       (formula_composition: rm id/trade name/%)
//  - POST /raw-material/details                (supplier_name, status_label per rm id)
//  - GET  /compliance/{formulaId}              (chemical_composition: inci_name/cas_no,
//                                                joined back to raw materials by NAME —
//                                                the API gives no raw-material id here)
//
// Same output shapes as the former frontend mock (apps/web/src/integrations/cosmetri.ts)
// so CosmetriImportModal didn't need to change.

export interface CosmetriFormulaSummary {
  id: number;
  reference: string;
  version: string;
  productTitle: string;
  status: string;
}

export interface CosmetriImportRow {
  rmId: number;
  tradeName: string;
  // inf_code — Cosmetri's own human-readable raw-material code (e.g.
  // "OL-NA-006"), as shown in Cosmetri's own UI ("{trade name} | {code}").
  // NOT a CAS number, and NOT the numeric `rmId` used for the internal join.
  code: string;
  inciName: string;
  casNo: string;
  percentWw: number;
  supplierName: string;
  qualityStatus: string;
}

// A raw material from Cosmetri's own catalogue, standalone (not tied to any
// one formula's composition) — for the Formula BOM manual-line raw-material
// picker (F14: "each line should use a Cosmetri raw-material reference where
// the material already exists"). Note this level of the API does not expose
// INCI/CAS (only /compliance/{formulaId} does, per formula) — callers still
// need the user to confirm INCI/CAS by hand.
export interface CosmetriRawMaterialSummary {
  id: number;
  tradeName: string;
  code: string; // inf_code — per the confirmed field mapping this is the Batch No., not a CAS number
  supplierName: string;
  qualityStatus: string;
  category: string;
}

interface CosmetriEnvelope<T> {
  success: boolean;
  message: string;
  data?: T;
  // Present on paginated list endpoints (/formula/list, /raw-material/list).
  count?: string;
}

@Injectable()
export class CosmetriDataService {
  constructor(private readonly tokens: CosmetriTokenService) {}

  private async fetchEnvelope<T>(
    path: string,
    method: 'GET' | 'POST',
    body?: unknown,
  ): Promise<CosmetriEnvelope<T>> {
    const [accessToken, status] = await Promise.all([
      this.tokens.getValidAccessToken(),
      this.tokens.getStatus(),
    ]);
    if (!status.baseUrl) throw new BadGatewayException('Cosmetri is not connected');

    let res: Response;
    try {
      res = await fetch(`${status.baseUrl}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (err) {
      throw new BadGatewayException(
        `Could not reach Cosmetri: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const envelope = (await res.json().catch(() => undefined)) as CosmetriEnvelope<T> | undefined;
    if (!res.ok || !envelope?.success || envelope.data === undefined) {
      throw new BadGatewayException(
        envelope?.message ?? `Cosmetri request failed (HTTP ${res.status}) for ${path}`,
      );
    }
    return envelope;
  }

  private async request<T>(path: string, method: 'GET' | 'POST', body?: unknown): Promise<T> {
    const envelope = await this.fetchEnvelope<T>(path, method, body);
    return envelope.data as T;
  }

  async listFormulas(): Promise<CosmetriFormulaSummary[]> {
    const list = await this.request<Array<{ inf_id: string }>>('/formula/list', 'POST', {
      page: 1,
      limit: 100,
    });
    if (list.length === 0) return [];

    const details = await this.request<
      Array<{ inf_id: string; inf_reference: string; customer_group_label: string }>
    >('/formula/details', 'POST', { id: list.map((f) => Number(f.inf_id)) });

    return details.map((d) => ({
      id: Number(d.inf_id),
      reference: d.inf_reference,
      // Not returned by /formula/list or /formula/details — only /compliance/{id}
      // has product title / formula version, and fetching that per row here
      // would mean one extra Cosmetri call per formula just to populate a
      // picker list, so it's left blank until the formula is actually selected.
      version: '',
      productTitle: '',
      status: d.customer_group_label,
    }));
  }

  // Cosmetri caps both endpoints involved here (per docs/swagger-init.json):
  // /raw-material/list's `limit` at 100, and /raw-material/details' `id`
  // array at 100 — both enforced below, not just assumed.
  private static readonly RAW_MATERIAL_LIST_PAGE_SIZE = 100;
  private static readonly RAW_MATERIAL_DETAILS_BATCH_SIZE = 100;
  // Safety ceiling on /raw-material/list pages fetched (10 pages = up to
  // 1,000 raw materials) — bounds how many Cosmetri calls one page load can
  // trigger for a very large catalogue; every endpoint is rate-limited (429)
  // per the API docs. Revisit if a real catalogue turns out to exceed this
  // (a server-side name filter on Cosmetri's side would be the real fix, not
  // available on this API version).
  private static readonly RAW_MATERIAL_LIST_PAGE_CAP = 10;

  // Standalone raw-material catalogue listing (mirrors listFormulas' shape:
  // /raw-material/list only returns ids, so a second batch call to
  // /raw-material/details fills in the identity fields), paginated on both
  // sides to respect Cosmetri's per-call limits.
  async listRawMaterials(): Promise<CosmetriRawMaterialSummary[]> {
    const ids: number[] = [];
    let total = Infinity;
    for (
      let page = 1;
      ids.length < total && page <= CosmetriDataService.RAW_MATERIAL_LIST_PAGE_CAP;
      page++
    ) {
      const envelope = await this.fetchEnvelope<Array<{ inf_id: string }>>('/raw-material/list', 'POST', {
        page,
        limit: CosmetriDataService.RAW_MATERIAL_LIST_PAGE_SIZE,
      });
      const rows = envelope.data ?? [];
      if (rows.length === 0) break;
      ids.push(...rows.map((r) => Number(r.inf_id)));
      total = envelope.count !== undefined ? Number(envelope.count) : ids.length;
    }
    if (ids.length === 0) return [];

    const batches: number[][] = [];
    for (let i = 0; i < ids.length; i += CosmetriDataService.RAW_MATERIAL_DETAILS_BATCH_SIZE) {
      batches.push(ids.slice(i, i + CosmetriDataService.RAW_MATERIAL_DETAILS_BATCH_SIZE));
    }

    const detailBatches = await Promise.all(
      batches.map((batch) =>
        this.request<
          Array<{
            inf_id: string;
            inf_trade_name: string;
            inf_code: string;
            inf_cat_id: string;
            supplier_name: string;
            status_label: string;
            category_label: string;
          }>
        >('/raw-material/details', 'POST', { id: batch, tabs: ['info'] }),
      ),
    );

    return detailBatches
      .flat()
      // Cosmetri's raw-material catalogue is parent/child: a parent is the
      // raw material itself (e.g. "Paester GTCC | Cos-BT-001"); children are
      // its individual batches/lots (same trade name/code, each with its own
      // Batch no., inventory, expiry and status — e.g. "Quarantined" while a
      // sibling batch is fine). inf_cat_id === '0' identifies a parent; a
      // batch carries a non-zero value. A formula composition (and this BOM
      // picker) references the material itself, never one specific physical
      // batch of it, so batches are filtered out here — confirmed against a
      // real Cosmetri account's raw-material screen, not from the terse
      // swagger field label ("category") alone.
      .filter((d) => d.inf_cat_id === '0')
      .map((d) => ({
        id: Number(d.inf_id),
        tradeName: d.inf_trade_name,
        code: d.inf_code,
        supplierName: d.supplier_name,
        qualityStatus: d.status_label,
        category: d.category_label,
      }));
  }

  async getFormulaImport(formulaId: number): Promise<CosmetriImportRow[]> {
    const formula = await this.request<{
      formula_composition: Array<{ inf_id: string; inf_trade_name: string; com_percentage: string }>;
    }>(`/formula/${formulaId}`, 'POST');

    const composition = formula.formula_composition ?? [];
    if (composition.length === 0) return [];

    const [rawMaterials, compliance] = await Promise.all([
      this.request<Array<{ inf_id: string; inf_code: string; supplier_name: string; status_label: string }>>(
        '/raw-material/details',
        'POST',
        { id: composition.map((c) => Number(c.inf_id)), tabs: ['info'] },
      ),
      this.request<{
        chemical_composition: Array<{
          inci_name: string;
          cas_no: string;
          INCI_source_raw_materials: Array<{ raw_title: string }>;
        }>;
      }>(`/compliance/${formulaId}`, 'GET'),
    ]);

    const rawMaterialById = new Map(rawMaterials.map((r) => [Number(r.inf_id), r]));

    // /compliance/{id} carries no raw-material id, only a name (raw_title), so
    // matching a composition row to its INCI/CAS is a best-effort name join.
    // /compliance groups by CHEMICAL, not by raw material — a single raw
    // material's trade name can legitimately appear under more than one
    // chemical entry (e.g. a multi-component raw material declaring a minor
    // constituent under a separate INCI). Confirmed against real Cosmetri
    // data: a "D-Panthenol >75%" row's trade name also appeared under the
    // "Citric Acid" chemical entry, and a naive last-write-wins join silently
    // labelled it "CITRIC ACID" — a wrong identity, not just a missing one,
    // on the read-only/"from Cosmetri" import path the prohibited/caution
    // ingredient screen trusts. When a name resolves to more than one
    // DIFFERING (inci_name, cas_no) pair, treat it as ambiguous and leave
    // INCI/CAS blank rather than assert one arbitrarily.
    const AMBIGUOUS = Symbol('ambiguous');
    const chemistryByTradeName = new Map<
      string,
      { inciName: string; casNo: string } | typeof AMBIGUOUS
    >();
    for (const chem of compliance.chemical_composition ?? []) {
      for (const source of chem.INCI_source_raw_materials ?? []) {
        const key = source.raw_title.trim().toLowerCase();
        const existing = chemistryByTradeName.get(key);
        if (existing === undefined) {
          chemistryByTradeName.set(key, { inciName: chem.inci_name, casNo: chem.cas_no });
        } else if (
          existing !== AMBIGUOUS &&
          (existing.inciName !== chem.inci_name || existing.casNo !== chem.cas_no)
        ) {
          chemistryByTradeName.set(key, AMBIGUOUS);
        }
      }
    }

    return composition.map((c) => {
      const rmId = Number(c.inf_id);
      const rawMaterial = rawMaterialById.get(rmId);
      const chemistry = chemistryByTradeName.get(c.inf_trade_name.trim().toLowerCase());
      const resolved = chemistry && chemistry !== AMBIGUOUS ? chemistry : undefined;
      return {
        rmId,
        tradeName: c.inf_trade_name,
        code: rawMaterial?.inf_code ?? '',
        inciName: resolved?.inciName ?? '',
        casNo: resolved?.casNo ?? '',
        percentWw: Number(c.com_percentage),
        supplierName: rawMaterial?.supplier_name ?? '',
        qualityStatus: rawMaterial?.status_label ?? 'Unknown',
      };
    });
  }
}
