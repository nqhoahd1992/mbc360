import type { ProjectData } from '../types';

// C3 (confirmed): whenever a Formula BOM is entered, the system automatically
// compares ingredients against the Prohibited Ingredients and Pregnancy/
// Breastfeeding Caution watch-lists and flags potential matches for review.
//
// Matching runs on two keys, in priority order:
//  1. CAS number (exact) — authoritative; sourced from the Cosmetri
//     /compliance endpoint (`cas_no`) when the BOM is imported (decision F12).
//  2. INCI name keywords — fallback for manually typed lines. The watch-lists
//     (config/registers.ts fixedRows) hold ingredient GROUPS ("Parabens"), so
//     each group carries a keyword/synonym list here.
// Follow-up F3: ownership of the per-group CAS mapping is still to be
// confirmed; this table is the demo stand-in.

export type WatchListKind = 'prohibited' | 'pbCaution';

interface WatchGroup {
  group: string; // ingredientGroup label as it appears in the register
  keywords: string[]; // lower-case tokens matched against the INCI name
  cas?: string[]; // CAS numbers for exact matching
}

const PROHIBITED_GROUPS: WatchGroup[] = [
  { group: 'Parabens', keywords: ['paraben'], cas: ['99-76-3', '94-13-3', '120-47-8', '94-26-8'] },
  { group: 'Phthalates', keywords: ['phthalate', 'dehp', 'dibp'], cas: ['117-81-7', '84-74-2', '84-69-5', '85-68-7'] },
  { group: 'Cyclomethicone D4/D5/D6', keywords: ['cyclomethicone', 'cyclotetrasiloxane', 'cyclopentasiloxane', 'cyclohexasiloxane'], cas: ['556-67-2', '541-02-6', '540-97-6'] },
  { group: 'Triclosan', keywords: ['triclosan'], cas: ['3380-34-5'] },
  { group: 'Benzophenone', keywords: ['benzophenone', 'oxybenzone'], cas: ['119-61-9'] },
  { group: 'Methanol', keywords: ['methanol'], cas: ['67-56-1'] },
  { group: 'Heavy metals Pb Hg Cd As', keywords: ['lead ', 'mercury', 'cadmium', 'arsenic'], cas: ['7439-92-1', '7439-97-6', '7440-43-9', '7440-38-2'] },
  { group: 'Lilial BMHCA', keywords: ['lilial', 'butylphenyl methylpropional', 'bmhca'], cas: ['80-54-6'] },
  { group: 'Retinol Retinyl Palmitate Tretinoin', keywords: ['retinol', 'retinyl', 'tretinoin', 'retinal'], cas: ['68-26-8', '79-81-2', '302-79-4'] },
  { group: '4-Methylbenzylidene Camphor 4-MBC', keywords: ['methylbenzylidene camphor', '4-mbc'], cas: ['36861-47-9'] },
  { group: 'Formaldehyde releasers', keywords: ['formaldehyde', 'dmdm hydantoin', 'quaternium-15', 'imidazolidinyl urea', 'diazolidinyl urea', 'bronopol'], cas: ['50-00-0', '6440-58-0', '4080-31-3', '39236-46-9', '78491-02-8', '52-51-7'] },
  { group: 'Bisphenol S', keywords: ['bisphenol'], cas: ['80-09-1'] },
];

const PB_CAUTION_GROUPS: WatchGroup[] = [
  { group: 'Oxybenzone (Benzophenone-3)', keywords: ['oxybenzone', 'benzophenone-3'], cas: ['131-57-7'] },
  { group: 'Homosalate', keywords: ['homosalate'], cas: ['118-56-9'] },
  { group: 'Hydroquinone', keywords: ['hydroquinone'], cas: ['123-31-9'] },
  { group: 'Essential oils', keywords: ['essential oil', 'lavandula', 'melaleuca', 'eucalyptus', 'mentha piperita', 'rosmarinus', 'salvia officinalis'] },
  { group: 'Caffeine topical', keywords: ['caffeine'], cas: ['58-08-2'] },
  { group: 'Arnica montana', keywords: ['arnica'], cas: ['68990-11-4'] },
  { group: 'BHT', keywords: ['butylated hydroxytoluene', 'bht'], cas: ['128-37-0'] },
  { group: 'BHA', keywords: ['butylated hydroxyanisole'], cas: ['25013-16-5'] },
  { group: 'Kojic acid', keywords: ['kojic'], cas: ['501-30-4'] },
  { group: 'Licorice root extract', keywords: ['licorice', 'glycyrrhiza', 'glycyrrhizin'], cas: ['1405-86-3', '68916-91-6'] },
  { group: 'Salicylic acid / salicylates', keywords: ['salicylic', 'salicylate'], cas: ['69-72-7'] },
];

export interface WatchHit {
  kind: WatchListKind;
  group: string; // matched watch-list row (ingredientGroup)
  matchedBy: 'cas' | 'name';
  matchedValue: string; // the CAS number or keyword that matched
}

// Short tokens ('bht', '4-mbc') must match as whole words to avoid noise.
function matchesKeyword(inci: string, keyword: string): boolean {
  if (keyword.length <= 5) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`).test(inci);
  }
  return inci.includes(keyword);
}

export function matchIngredientWatchLists(inciName: string, casNo?: string): WatchHit[] {
  const inci = inciName.trim().toLowerCase();
  const cas = casNo?.trim();
  if (!inci && !cas) return [];
  const hits: WatchHit[] = [];
  for (const { list, kind } of [
    { list: PROHIBITED_GROUPS, kind: 'prohibited' as const },
    { list: PB_CAUTION_GROUPS, kind: 'pbCaution' as const },
  ]) {
    for (const groupDef of list) {
      if (cas && groupDef.cas?.includes(cas)) {
        hits.push({ kind, group: groupDef.group, matchedBy: 'cas', matchedValue: cas });
        continue;
      }
      const keyword = inci ? groupDef.keywords.find((k) => matchesKeyword(inci, k)) : undefined;
      if (keyword) hits.push({ kind, group: groupDef.group, matchedBy: 'name', matchedValue: keyword });
    }
  }
  return hits;
}

export interface BomWatchMatch {
  line: number;
  inciName: string;
  hits: WatchHit[];
}

// All flagged Formula BOM lines for a project.
export function bomWatchMatches(project: ProjectData): BomWatchMatch[] {
  return project.bom
    .map((l) => ({ line: l.line, inciName: l.inciName, hits: matchIngredientWatchLists(l.inciName, l.casNo) }))
    .filter((m) => m.hits.length > 0);
}
