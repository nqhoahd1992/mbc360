// Round 5 question 14 (SME answer, 2026-11-05): a Phase 2-4 requirement row may be "not applicable" — "Yes, with a specific rationale and relevant
// reviewer acknowledgement for critical items".
//
// The rationale was already built (a row marked N/A with a rationale counts as dealt with). What this file adds is the acknowledgement: on a
// CRITICAL item, an N/A a person entered counts only once the holder of the relevant function has acknowledged that rationale — the same
// rule question 1 set for an N/A the system writes itself (readinessAck.ts), applied to the row a person marked. The acknowledgement is of the
// WORDS: change the rationale and it no longer counts; the reviewer must look again.
//
// Which section is critical and which function acknowledges it reuses the team's own table for the infant items (ACKNOWLEDGEMENT_FUNCTIONS);
// for the sections that table does not name, the function is the area the section belongs to and "critical" is "on one of the seven critical
// gates". Those readings are ours, [ASSUMPTION: R6-Q20].
import type { NaAcknowledgement, RequirementItem } from '../types';
import { REQUIREMENT_NOT_APPLICABLE } from '../config/gates';
import { CRITICAL_GATES } from '../config/gateSignOff';
import { REVIEW_ROLES } from '../config/reviewers';
import { ACKNOWLEDGEMENT_FUNCTIONS, isCriticalForAcknowledgement } from './readinessAck';

interface SectionRule {
  // The readiness item whose acknowledgement functions and criticality this section follows, by the gate of the row ('02' -> item id).
  itemByGate?: Record<string, string>;
  // Otherwise the functions named here (one inner list per function that has to acknowledge; any ONE holder of those keys fills it).
  groups?: string[][];
}

const REQUIREMENT_NA_RULES: Record<string, SectionRule> = {
  infantUseContext: { itemByGate: { '02': 'sg02-infant-context' } },
  infantIngredientSuitability: { itemByGate: { '04': 'sg04-infant-suitability' } },
  infantFormulaAssessment: { itemByGate: { '05': 'sg05-infant-formula' } },
  infantPackaging: { itemByGate: { '06': 'sg06-infant-packaging' } },
  infantTesting: { itemByGate: { '08': 'sg08-infant-testing', '09': 'sg09-infant-testing' } },
  infantPif: { itemByGate: { '10': 'sg10-infant-pif' } },
  skincareForTwo: { itemByGate: { '07': 'sg07-maternal-infant' } },
  humanStudy: { itemByGate: { '08': 'sg08-human-study' } },
  stabilityRelease: { groups: [['quality']] },
  dossierEvidence: { groups: [['regulatory']] },
  changeControlClosure: { groups: [['quality-change-control']] },
};

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

// The functions that have to acknowledge an N/A on this row, or undefined when the row needs no acknowledgement (not a critical item, or a
// section the rule does not cover).
export function requirementNaAckGroups(section: string, gate: string): string[][] | undefined {
  const rule = REQUIREMENT_NA_RULES[section];
  if (!rule) return undefined;
  const gateId = `SG${gate}`;
  if (rule.itemByGate) {
    const itemId = rule.itemByGate[gate];
    if (!itemId || !isCriticalForAcknowledgement(gateId, itemId)) return undefined;
    return ACKNOWLEDGEMENT_FUNCTIONS[itemId];
  }
  return CRITICAL_GATES.includes(gateId) ? rule.groups : undefined;
}

export interface RequirementNaSlot {
  functionKeys: string[];
  label: string;
  ack?: NaAcknowledgement;
  state: 'acknowledged' | 'stale' | 'missing';
}

const labelOf = (keys: string[]): string => keys.map((k) => REVIEW_ROLES.find((r) => r.key === k)?.label ?? k).join(' or ');

// One slot per function, each acknowledged against the rationale the row carries NOW. Undefined = nothing to acknowledge.
export function requirementNaAckSlots(
  section: string,
  row: Pick<RequirementItem, 'gate' | 'status' | 'naRationale' | 'naAcknowledgements'>,
): RequirementNaSlot[] | undefined {
  if (row.status !== REQUIREMENT_NOT_APPLICABLE) return undefined;
  const groups = requirementNaAckGroups(section, row.gate);
  if (!groups) return undefined;
  const rationale = text(row.naRationale);
  // Without a rationale there is nothing to acknowledge yet (and the row does not settle anything: it still needs the reason).
  if (rationale === '') return undefined;
  return groups.map((keys) => {
    const ack = (row.naAcknowledgements ?? []).find((a) => keys.includes(a.functionKey));
    const state = !ack ? 'missing' : ack.rationale === rationale ? 'acknowledged' : 'stale';
    return { functionKeys: keys, label: labelOf(keys), ack, state };
  });
}

// An N/A row settles a check only when nothing has to be acknowledged, or every function has acknowledged THIS rationale.
export function requirementNaAckSettled(section: string, row: Pick<RequirementItem, 'gate' | 'status' | 'naRationale' | 'naAcknowledgements'>): boolean {
  const slots = requirementNaAckSlots(section, row);
  return !slots || slots.every((s) => s.state === 'acknowledged');
}
