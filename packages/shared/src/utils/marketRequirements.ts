import type { ChecklistSectionConfig, RequirementRowConfig } from '../config/phases';
import { isAseanMarket } from './marketDossier';

// What a project has once some of its rows are a market's own (project owner, 2026-11-11): requirement rows, Key Gate Checks and the
// options of a checklist. Each is written once in the configuration with a scope, and made once for every market it applies to — in place,
// so a market's own rows read beside the shared ones. One set of functions for the web scaffold, the API scaffold and a change of a
// project's markets, so the three can never disagree about which rows a project has.
export type MarketScope = 'each' | 'asean';

// The markets a scope applies to. No scope = one shared row (market undefined).
export function marketsForScope(scope: MarketScope | undefined, markets: readonly string[]): (string | undefined)[] {
  if (scope === 'each') return [...markets];
  if (scope === 'asean') return markets.filter(isAseanMarket);
  return [undefined];
}

export interface ExpandedRequirementRow {
  row: RequirementRowConfig;
  market?: string;
}

export function requirementRowMarkets(row: RequirementRowConfig, markets: readonly string[]): (string | undefined)[] {
  return marketsForScope(row.marketScope, markets);
}

export function expandRequirementRows(rows: readonly RequirementRowConfig[], markets: readonly string[]): ExpandedRequirementRow[] {
  return rows.flatMap((row) => requirementRowMarkets(row, markets).map((market) => ({ row, ...(market ? { market } : {}) })));
}

// Identifies a row of a section: its requirement and its market (blank for a shared row).
export const requirementRowKey = (requirement: string, market?: string): string => `${requirement}|${market ?? ''}`;

// Key Gate Checks: one row per market for a check with a scope.
export function expandGateChecks<T extends { marketScope?: MarketScope }>(
  checks: readonly T[],
  markets: readonly string[],
): { check: T; market?: string }[] {
  return checks.flatMap((check) => marketsForScope(check.marketScope, markets).map((market) => ({ check, ...(market ? { market } : {}) })));
}
export const gateCheckRowKey = (gate: string, check: string, market?: string): string => `${gate}|${check}|${market ?? ''}`;

// A checklist made per market lists ALL its options for the first market, then all of them for the next, so each market's own list is
// one block; a checklist with no scope is its options once.
export function expandChecklistOptions(
  section: Pick<ChecklistSectionConfig, 'options' | 'marketScope'>,
  markets: readonly string[],
): { label: string; market?: string }[] {
  if (section.marketScope === 'each') return markets.flatMap((market) => section.options.map((label) => ({ label, market })));
  return section.options.map((label) => ({ label }));
}
export const checklistItemKey = (label: string, market?: string): string => `${label}|${market ?? ''}`;
