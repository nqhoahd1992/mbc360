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
  inciName: string;
  casNo: string;
  percentWw: number;
  supplierName: string;
  qualityStatus: string;
}

interface CosmetriEnvelope<T> {
  success: boolean;
  message: string;
  data?: T;
}

@Injectable()
export class CosmetriDataService {
  constructor(private readonly tokens: CosmetriTokenService) {}

  private async request<T>(path: string, method: 'GET' | 'POST', body?: unknown): Promise<T> {
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
    return envelope.data;
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

  async getFormulaImport(formulaId: number): Promise<CosmetriImportRow[]> {
    const formula = await this.request<{
      formula_composition: Array<{ inf_id: string; inf_trade_name: string; com_percentage: string }>;
    }>(`/formula/${formulaId}`, 'POST');

    const composition = formula.formula_composition ?? [];
    if (composition.length === 0) return [];

    const [rawMaterials, compliance] = await Promise.all([
      this.request<Array<{ inf_id: string; supplier_name: string; status_label: string }>>(
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
    const chemistryByTradeName = new Map<string, { inciName: string; casNo: string }>();
    for (const chem of compliance.chemical_composition ?? []) {
      for (const source of chem.INCI_source_raw_materials ?? []) {
        chemistryByTradeName.set(source.raw_title.trim().toLowerCase(), {
          inciName: chem.inci_name,
          casNo: chem.cas_no,
        });
      }
    }

    return composition.map((c) => {
      const rmId = Number(c.inf_id);
      const rawMaterial = rawMaterialById.get(rmId);
      const chemistry = chemistryByTradeName.get(c.inf_trade_name.trim().toLowerCase());
      return {
        rmId,
        tradeName: c.inf_trade_name,
        inciName: chemistry?.inciName ?? '',
        casNo: chemistry?.casNo ?? '',
        percentWw: Number(c.com_percentage),
        supplierName: rawMaterial?.supplier_name ?? '',
        qualityStatus: rawMaterial?.status_label ?? 'Unknown',
      };
    });
  }
}
