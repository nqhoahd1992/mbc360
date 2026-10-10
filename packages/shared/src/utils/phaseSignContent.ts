import { GATES } from '../config/gates';
import { PHASE_CONFIGS } from '../config/phases';
import type { ProjectData } from '../types';

// What a PHASE signature attests to: everything the phase page shows for that phase, as it stands.
// Project owner's reading (2026-10-10): the data on the phase's own screen IS the scope of its signature.
// So this is the gates' records, the Key Gate Checks, the checklist selections and requirement rows, the
// 8 Angles, the Next Actions, the evidence summary and the pre-work acceptance.
//
// The ONE definition: the signing preview shows it and the server hashes it, so the signer reads
// precisely what their signature is bound to.
//
// Left out on purpose: the three signature rows themselves (they are what is being created), the phase's
// quick links (SW-22 keeps them editable — they point at where the work lives, they are not evidence)
// and the registers (each register is closed and frozen by its own signatures and its own gate).
export interface PhaseSignSection {
  title: string;
  columns: { key: string; label: string }[];
  rows: Record<string, string>[];
}

export interface PhaseSignContent {
  phase: number;
  sections: PhaseSignSection[];
}

const s = (v: unknown): string => (v === undefined || v === null ? '' : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v));
const cols = (...pairs: [string, string][]) => pairs.map(([key, label]) => ({ key, label }));
const yn = (v: string) => (v === 'NA' ? 'N/A' : v);

export function phaseSignContent(project: ProjectData, phase: number): PhaseSignContent | undefined {
  const config = PHASE_CONFIGS[phase];
  if (!config) return undefined;
  const gates = GATES.filter((g) => g.phase === phase);
  const numbers = gates.map((g) => g.number);
  const closure = project.phaseClosures[phase];
  const sections: PhaseSignSection[] = [];

  sections.push({
    title: 'Phase gate flow',
    columns: cols(['gate', 'Gate'], ['status', 'Stage status'], ['decision', 'Gate decision'], ['owner', 'Owner'], ['dueDate', 'Due date'], ['evidenceLink', 'Evidence / link'], ['notes', 'Notes']),
    rows: gates.map((g) => {
      const r = project.gates.find((x) => x.gateId === g.id);
      return {
        gate: `${g.number} ${g.name}`,
        status: s(r?.status),
        decision: s(r?.decision),
        owner: s(r?.owner),
        dueDate: s(r?.dueDate),
        evidenceLink: s(r?.evidenceLink),
        notes: s(r?.notes),
      };
    }),
  });

  for (const section of config.checklistSections) {
    const items = (project.checklists[section.key] ?? []).filter((i) => i.selected);
    sections.push({
      title: `${section.title} (selected options)`,
      columns: cols(['label', 'Option'], ['primary', 'Primary'], ['ownerFunction', 'Owner / function'], ['status', 'Status'], ['evidenceLink', 'Evidence / link'], ['notes', 'Notes']),
      rows: items.map((i) => ({
        label: s(i.label),
        primary: i.isPrimary ? 'Yes' : '',
        ownerFunction: s(i.ownerFunction),
        status: yn(s(i.status)),
        evidenceLink: s(i.evidenceLink),
        notes: s(i.notes),
      })),
    });
  }

  for (const section of config.requirementSections) {
    sections.push({
      title: section.title,
      columns: cols(['gate', 'Gate'], ['requirement', 'Requirement'], ['requirementText', 'Detail'], ['priority', 'Priority'], ['minimumRequirement', 'Minimum requirement'], ['rationale', 'Rationale'], ['owner', 'Owner'], ['status', 'Status'], ['naRationale', 'Why not applicable'], ['evidenceLink', 'Evidence / link'], ['notes', 'Notes']),
      rows: (project.requirements[section.key] ?? []).map((r) => ({
        gate: s(r.gate),
        requirement: s(r.requirement),
        requirementText: s(r.requirementText),
        priority: s(r.priority),
        minimumRequirement: s(r.minimumRequirement),
        rationale: s(r.rationale),
        owner: s(r.owner),
        status: s(r.status),
        naRationale: s(r.naRationale),
        evidenceLink: s(r.evidenceLink),
        notes: s(r.notes),
      })),
    });
  }

  // The same filter the closure rule uses (phaseCompletionChecklist), so the signer sees exactly the checks
  // that had to be done for this phase to be signable.
  sections.push({
    title: 'Key Gate Checks',
    columns: cols(['gate', 'Gate'], ['check', 'Check'], ['done', 'Done'], ['ynna', 'Y / N / N/A'], ['date', 'Date'], ['evidenceRef', 'Evidence'], ['notes', 'Notes']),
    rows: project.gateChecks
      .filter((c) => numbers.includes(c.gate) || (phase === 4 && c.gate === 'ALL'))
      .map((c) => ({ gate: s(c.gate), check: s(c.check), done: s(c.done), ynna: yn(s(c.ynna)), date: s(c.date), evidenceRef: s(c.evidenceRef), notes: s(c.notes) })),
  });

  sections.push({
    title: '8 Angles coverage',
    columns: cols(['angle', 'Angle'], ['covered', 'Covered'], ['ynna', 'Y / N / N/A'], ['date', 'Date'], ['evidenceRef', 'Evidence'], ['internalLink', 'Internal link'], ['comments', 'Comments']),
    rows: (closure?.angles ?? []).map((a) => ({ angle: s(a.angle), covered: s(a.covered), ynna: yn(s(a.ynna)), date: s(a.date), evidenceRef: s(a.evidenceRef), internalLink: s(a.internalLink), comments: s(a.comments) })),
  });

  sections.push({
    title: 'Next Actions',
    columns: cols(['gate', 'Gate'], ['description', 'Action'], ['owner', 'Owner'], ['dueDate', 'Due date'], ['priority', 'Priority'], ['status', 'Status']),
    rows: project.nextActions
      .filter((a) => gates.some((g) => g.id === a.gateId))
      .map((a) => ({ gate: s(a.gateId), description: s(a.description), owner: s(a.owner), dueDate: s(a.dueDate), priority: s(a.priority), status: s(a.status) })),
  });

  sections.push({
    title: 'Evidence summary and pre-work',
    columns: cols(['item', 'Item'], ['value', 'Recorded']),
    rows: [
      { item: 'Evidence summary', value: s(closure?.evidenceSummary) },
      { item: 'Pre-work accepted by', value: s(closure?.preWork?.acceptedBy) },
      { item: 'Pre-work accepted on', value: s(closure?.preWork?.acceptedDate) },
    ],
  });

  return { phase, sections };
}
