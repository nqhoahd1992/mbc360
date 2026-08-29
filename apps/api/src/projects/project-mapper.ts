// Prisma rows -> the frontend's `ProjectData` shape (M3 Phase 1, 2026-07-26).
//
// Two consumers, one mapper on purpose:
//   1. GET /api/projects/:id returns this object, so the frontend keeps its
//      existing types and components unchanged (BACKEND_PLAN §1: "giữ nguyên
//      chữ ký các store action... để UI gần như không đổi").
//   2. The server-side guards call the SAME rule engine the browser does
//      (gateProgress.ts's gateBlockers / hardGateBlockers / isGateUnlocked),
//      which are pure functions over `ProjectData`. Rebuilding that object here
//      is what lets the API enforce B1/F9/F1/C7 without re-implementing a line
//      of rule logic (BACKEND_PLAN §3 principle 1, "never fork a copy").
//
// Every field is read, not just the ones Phase 1 can WRITE: the rule engine
// needs checklists/gateChecks/registers/bom/nextActions to evaluate readiness,
// and a response missing them would make pages for later phases render empty.
import { GATES } from '@mbc360/shared/config/gates';
import { REVIEW_ROLE_KEYS } from '@mbc360/shared/config/reviewers';
import type {
  BacktrackEvent,
  BomLine,
  ChecklistItem,
  EvidenceItem,
  GateChangeLogEntry,
  GateCheck,
  GateRecord,
  ProjectData,
  ProjectReferenceData,
  RegisterClosureSignOff,
  RegisterClosureState,
  RegisterRow,
  RequirementItem,
  SignOff,
} from '@mbc360/shared/types';
import type { Prisma } from '../generated/prisma/client';

// Everything GET /projects/:id and the guards need, in one query.
export const PROJECT_INCLUDE = {
  markets: { orderBy: { market: 'asc' } },
  reviewers: true,
  archivedBy: { select: { displayName: true } },
  gates: true,
  checklistItems: { orderBy: [{ sectionKey: 'asc' }, { itemOrder: 'asc' }] },
  requirementItems: { orderBy: [{ sectionKey: 'asc' }, { itemOrder: 'asc' }] },
  gateChecks: { orderBy: { id: 'asc' } },
  phaseClosures: {
    include: {
      // `assignedTo` is included for its displayName only — the authoritative
      // check is on the id (see signSignOff).
      signOffs: { include: { assignedTo: { select: { displayName: true } } } },
      angles: true,
      keyLinks: true,
    },
    orderBy: { phase: 'asc' },
  },
  nextActions: { orderBy: { createdAt: 'asc' } },
  backtrackEvents: { orderBy: { occurredAt: 'asc' } },
  marketTracks: { orderBy: { market: 'asc' } },
  studyApprovals: true,
  packagingBom: { orderBy: { line: 'asc' } },
  costing: true,
  evidenceItems: { orderBy: { id: 'asc' } },
  registerRows: { orderBy: [{ registerKey: 'asc' }, { rowOrder: 'asc' }] },
  registerClosures: { include: { signOffs: true }, orderBy: { registerKey: 'asc' } },
  formulaVersions: { include: { bomLines: { orderBy: { line: 'asc' } } }, orderBy: { createdAt: 'asc' } },
  capaRecords: { orderBy: { id: 'asc' } },
  changeRecords: { orderBy: { createdAt: 'asc' } },
  feedbackEntries: { orderBy: { id: 'asc' } },
} satisfies Prisma.ProjectInclude;

export type ProjectWithAll = Prisma.ProjectGetPayload<{ include: typeof PROJECT_INCLUDE }>;

// Prisma returns `null` for an unset column; the frontend types use optional
// (`?`) properties, and the difference is visible in JSON (`"owner": null` vs
// absent). Normalising to undefined keeps the API response byte-identical in
// shape to what the store used to hold locally.
function opt(value: string | null): string | undefined {
  return value ?? undefined;
}

// Date columns are `@db.Date`; the frontend stores plain 'YYYY-MM-DD' strings.
function dateOnly(value: Date | null): string | undefined {
  return value ? value.toISOString().slice(0, 10) : undefined;
}

function dateTime(value: Date): string {
  // Same 'YYYY-MM-DD HH:mm' shape the store used for change-log entries.
  return value.toISOString().slice(0, 16).replace('T', ' ');
}

function toGateRecord(g: ProjectWithAll['gates'][number]): GateRecord {
  return {
    gateId: g.gateId,
    status: g.status as GateRecord['status'],
    decision: opt(g.decision) as GateRecord['decision'],
    owner: opt(g.owner),
    dueDate: dateOnly(g.dueDate),
    evidenceLink: opt(g.evidenceLink),
    notes: opt(g.notes),
    // Round 4 question 3. `opt` drops nulls, so an ungraded gap arrives with these
    // absent — which is what `gapBlocksDecision` reads as "not assessed".
    gapCriticality: opt(g.gapCriticality) as GateRecord['gapCriticality'],
    gapImpactCategory: opt(g.gapImpactCategory),
    gapAssessor: opt(g.gapAssessor),
    gapAssessmentDate: opt(g.gapAssessmentDate),
    gapRationale: opt(g.gapRationale),
    gapEvidenceLink: opt(g.gapEvidenceLink),
    gapRequiredAction: opt(g.gapRequiredAction),
    gapActionOwner: opt(g.gapActionOwner),
  };
}

function toSignOff(s: ProjectWithAll['phaseClosures'][number]['signOffs'][number]): SignOff {
  return {
    role: s.role as SignOff['role'],
    assignedToUserId: opt(s.assignedToUserId),
    assignedToName: opt(s.assignedTo?.displayName ?? null),
    name: opt(s.name),
    initials: opt(s.initials),
    date: dateOnly(s.date),
    decision: opt(s.decision) as SignOff['decision'],
    comments: opt(s.comments),
    signedByUserId: opt(s.signedByUserId),
    signedAt: s.signedAt ? s.signedAt.toISOString() : undefined,
    roleAtSigning: opt(s.roleAtSigning),
    recordVersion: s.recordVersion ?? undefined,
    signatureImage: opt(s.signatureImage),
    signatureVerifiedAt: s.signatureVerifiedAt ? s.signatureVerifiedAt.toISOString() : undefined,
  };
}

function toRegisterClosureSignOff(
  s: ProjectWithAll['registerClosures'][number]['signOffs'][number],
): RegisterClosureSignOff {
  return {
    role: s.role as RegisterClosureSignOff['role'],
    name: opt(s.name),
    signedByUserId: opt(s.signedByUserId),
    signedAt: s.signedAt ? s.signedAt.toISOString() : undefined,
    roleAtSigning: opt(s.roleAtSigning),
    recordVersion: s.recordVersion ?? undefined,
    signatureImage: opt(s.signatureImage),
    signatureVerifiedAt: s.signatureVerifiedAt ? s.signatureVerifiedAt.toISOString() : undefined,
  };
}

// gateChangeLog has no table of its own (M3 plan decision #1): every gate write
// already records an append-only audit_events row carrying the field diff, so
// the log is derived from those rows instead of duplicating them.
export function toGateChangeLog(
  events: { id: string; entityId: string; occurredAt: Date; after: Prisma.JsonValue; actor: { displayName: string } | null }[],
): GateChangeLogEntry[] {
  const entries: GateChangeLogEntry[] = [];
  for (const e of events) {
    const after = (e.after ?? {}) as { changes?: GateChangeLogEntry['changes']; changedBy?: string };
    if (!after.changes || after.changes.length === 0) continue;
    entries.push({
      id: e.id,
      gateId: e.entityId,
      date: dateTime(e.occurredAt),
      // Prefer the real actor from the session over anything the client sent.
      changedBy: e.actor?.displayName ?? after.changedBy,
      changes: after.changes,
    });
  }
  return entries;
}

// Change Control rows are project-scoped in the database but the store keeps one
// global list, so they are returned alongside ProjectData rather than inside it.
export function toChangeRecords(p: ProjectWithAll) {
  return p.changeRecords.map((c) => ({
    changeId: c.changeId,
    projectId: p.id,
    triggerId: opt(c.triggerId),
    trigger: c.trigger,
    productSku: c.productSku,
    affectedArea: c.affectedArea,
    oldVersion: opt(c.oldVersion),
    riskLevel: c.riskLevel,
    impactAreas: c.impactAreas,
    requiredAction: opt(c.requiredAction),
    evidenceLink: opt(c.evidenceLink),
    requiredSignOffs: opt(c.requiredSignOffs),
    communicationRequired: c.communicationRequired,
    salesMarketingMessage: opt(c.salesMarketingMessage),
    dueDate: dateOnly(c.dueDate),
    status: c.status,
    closureEvidence: opt(c.closureEvidence),
    closedDate: dateOnly(c.closedDate),
    // Round 4 question 34(c) — the other five parts of a final disposition.
    closureOutcome: opt(c.closureOutcome),
    closureImplementation: opt(c.closureImplementation),
    closureImpactedVersions: opt(c.closureImpactedVersions),
    closureVerifier: opt(c.closureVerifier),
    closureRemainingAction: opt(c.closureRemainingAction),
    owner: c.owner,
    notes: opt(c.notes),
  }));
}

// `reference` is a REQUIRED parameter, not an optional one defaulting to empty.
// Round 4 questions 4 and 17 put company reference data inside the rule engine, and
// a call site that forgot to supply it would evaluate those rules against nothing.
// Making it required means the compiler catches that, rather than the gate quietly
// behaving differently on the server than in the browser (BACKEND_PLAN principle 7).
export function toProjectData(
  p: ProjectWithAll,
  gateChangeLog: GateChangeLogEntry[],
  reference: ProjectReferenceData,
): ProjectData {
  const checklists: Record<string, ChecklistItem[]> = {};
  for (const item of p.checklistItems) {
    (checklists[item.sectionKey] ??= []).push({
      label: item.label,
      gate: item.gate,
      selected: item.selected,
      ownerFunction: item.ownerFunction,
      status: item.status as ChecklistItem['status'],
      ...(item.isPrimary ? { isPrimary: true } : {}),
      evidenceLink: opt(item.evidenceLink),
      notes: opt(item.notes),
    });
  }

  const requirements: Record<string, RequirementItem[]> = {};
  for (const item of p.requirementItems) {
    (requirements[item.sectionKey] ??= []).push({
      gate: item.gate,
      requirement: item.requirement,
      ...(item.priority ? { priority: item.priority } : {}),
      ...(item.requirementText ? { requirementText: item.requirementText } : {}),
      minimumRequirement: item.minimumRequirement,
      rationale: item.rationale,
      owner: item.owner,
      status: item.status as RequirementItem['status'],
      ...(item.naRationale ? { naRationale: item.naRationale } : {}),
      evidenceLink: opt(item.evidenceLink),
      notes: opt(item.notes),
    });
  }

  const registers: Record<string, RegisterRow[]> = {};
  for (const row of p.registerRows) {
    (registers[row.registerKey] ??= []).push(row.data as RegisterRow);
  }

  const registerClosures: Record<string, RegisterClosureState> = {};
  for (const closure of p.registerClosures) {
    registerClosures[closure.registerKey] = { signOffs: closure.signOffs.map(toRegisterClosureSignOff) };
  }

  const phaseClosures: ProjectData['phaseClosures'] = {};
  for (const closure of p.phaseClosures) {
    phaseClosures[closure.phase] = {
      evidenceSummary: opt(closure.evidenceSummary),
      keyLinks: Object.fromEntries(closure.keyLinks.map((l) => [l.label, l.url])),
      signOffs: closure.signOffs.map(toSignOff),
      angles: closure.angles.map((a) => ({
        angle: a.angle,
        ynna: a.ynna as 'Y' | 'N' | 'NA',
        covered: a.covered,
        date: dateOnly(a.date),
        evidenceRef: opt(a.evidenceRef),
        internalLink: opt(a.internalLink),
        initials: opt(a.initials),
        comments: opt(a.comments),
      })),
      ...(closure.preWorkAcceptedBy || closure.preWorkAcceptedDate
        ? {
            preWork: {
              acceptedBy: opt(closure.preWorkAcceptedBy),
              acceptedDate: dateOnly(closure.preWorkAcceptedDate),
            },
          }
        : {}),
    };
  }

  // "Current" formula version = the Active one (the schema deliberately has no
  // scalar field on Project — see the note at the top of schema.prisma).
  const active = p.formulaVersions.find((v) => v.status === 'Active') ?? p.formulaVersions.at(-1);
  const superseded = p.formulaVersions.filter((v) => v.id !== active?.id);
  const versionById = new Map(p.formulaVersions.map((v) => [v.id, v.version]));

  const toBomLine = (l: ProjectWithAll['formulaVersions'][number]['bomLines'][number]): BomLine => ({
    line: l.line,
    rmCode: l.rmCode,
    inciName: l.inciName,
    casNo: opt(l.casNo),
    functionRole: l.functionRole,
    supplier: l.supplier,
    percentWw: l.percentWw,
    costPerKg: l.costPerKg,
    evidenceLink: opt(l.evidenceLink),
    notes: opt(l.notes),
  });

  const reviewers: Record<string, string> = {};
  for (const r of p.reviewers) {
    if (REVIEW_ROLE_KEYS.includes(r.roleKey)) reviewers[r.roleKey] = r.name;
  }

  // Gates in canonical SG01..SG12 order regardless of insert order — the rule
  // engine indexes by position (currentGateIndex / isGateUnlocked).
  const gateByIdRow = new Map(p.gates.map((g) => [g.gateId, g]));
  const gates = GATES.map((meta) => {
    const row = gateByIdRow.get(meta.id);
    return row ? toGateRecord(row) : { gateId: meta.id, status: 'Not Started' as const };
  });

  return {
    identity: {
      id: p.id,
      productCode: p.productCode,
      projectLead: p.projectLead,
      productGroup: p.productGroup,
      brandCustomer: p.brandCustomer,
      dateOpened: p.dateOpened.toISOString().slice(0, 10),
      targetLaunchDate: p.targetLaunchDate.toISOString().slice(0, 10),
      productSku: p.productSku,
      ownerDepartment: p.ownerDepartment,
      markets: p.markets.map((m) => m.market),
      // Gate 1 opportunity capture (B1/B2/B3) — nullable in the database,
      // omitted rather than sent as null so the readiness check's `?.trim()`
      // treats "never filled" and "cleared" identically.
      ...(p.requesterName ? { requesterName: p.requesterName } : {}),
      ...(p.requesterDepartment ? { requesterDepartment: p.requesterDepartment } : {}),
      ...(p.initialScope ? { initialScope: p.initialScope } : {}),
      ...(p.initialTargetUsers ? { initialTargetUsers: p.initialTargetUsers } : {}),
      reviewers,
      ...(p.archivedAt
        ? { archived: { at: p.archivedAt.toISOString().slice(0, 10), by: p.archivedBy?.displayName } }
        : {}),
    },
    gates,
    checklists,
    requirements,
    gateChecks: p.gateChecks.map(
      (c): GateCheck => ({
        gate: c.gate,
        check: c.check,
        done: c.done,
        ynna: c.ynna as GateCheck['ynna'],
        date: dateOnly(c.date),
        evidenceRef: opt(c.evidenceRef),
        methodRef: opt(c.methodRef),
        internalLink: opt(c.internalLink),
        initials: opt(c.initials),
        notes: opt(c.notes),
      }),
    ),
    phaseClosures,
    bom: (active?.bomLines ?? []).map(toBomLine),
    packagingBom: p.packagingBom.map((l) => ({
      line: l.line,
      component: l.component,
      componentType: l.componentType,
      supplier: l.supplier,
      unitsPerFinishedUnit: l.unitsPerFinishedUnit,
      unitCost: l.unitCost,
      wastagePercent: l.wastagePercent,
      leadTime: opt(l.leadTime),
      moq: opt(l.moq),
      evidenceLink: opt(l.evidenceLink),
      methodRef: opt(l.methodRef),
      notes: opt(l.notes),
      approval: opt(l.approval),
    })),
    formulaProperties: {
      ...(p.microSusceptibility ? { microSusceptibility: p.microSusceptibility } : {}),
      ...(p.microRationale ? { microRationale: p.microRationale } : {}),
    },
    // Round 4 questions 8/9/11/12. Omitting a null column rather than mapping it to
    // '' keeps "nobody answered" distinguishable from "answered with nothing" —
    // the engine reads an absent value as `notAssessed` and must not be handed a
    // blank string that looks like a considered answer.
    assessments: {
      ...(p.changeControlRequired ? { changeControlRequired: p.changeControlRequired } : {}),
      ...(p.changeControlReviewer ? { changeControlReviewer: p.changeControlReviewer } : {}),
      ...(p.changeControlReviewDate ? { changeControlReviewDate: p.changeControlReviewDate } : {}),
      ...(p.changeControlRationale ? { changeControlRationale: p.changeControlRationale } : {}),
      ...(p.changeControlRecordId ? { changeControlRecordId: p.changeControlRecordId } : {}),
      ...(p.changeControlEvidenceLink ? { changeControlEvidenceLink: p.changeControlEvidenceLink } : {}),
      ...(p.humanStudyPlanned ? { humanStudyPlanned: p.humanStudyPlanned } : {}),
      ...(p.administrativeOnly ? { administrativeOnly: p.administrativeOnly } : {}),
      ...(p.administrativeOnlyConfirmedBy ? { administrativeOnlyConfirmedBy: p.administrativeOnlyConfirmedBy } : {}),
      ...(p.scaleUpRiskIdentified ? { scaleUpRiskIdentified: p.scaleUpRiskIdentified } : {}),
      ...(p.scaleUpRiskDescription ? { scaleUpRiskDescription: p.scaleUpRiskDescription } : {}),
      ...(p.scaleUpRiskAssessor ? { scaleUpRiskAssessor: p.scaleUpRiskAssessor } : {}),
      ...(p.scaleUpRiskAssessmentDate ? { scaleUpRiskAssessmentDate: p.scaleUpRiskAssessmentDate } : {}),
      ...(p.scaleUpRiskRationale ? { scaleUpRiskRationale: p.scaleUpRiskRationale } : {}),
      ...(p.scaleUpRiskActivity ? { scaleUpRiskActivity: p.scaleUpRiskActivity } : {}),
      ...(p.scaleUpRiskEvidenceLink ? { scaleUpRiskEvidenceLink: p.scaleUpRiskEvidenceLink } : {}),
    },
    costing: {
      batchSizeKg: p.costing?.batchSizeKg ?? 0,
      fillSizeG: p.costing?.fillSizeG ?? 0,
      targetUnits: p.costing?.targetUnits ?? 0,
      packagingCostPerUnit: p.costing?.packagingCostPerUnit ?? 0,
      labourOverheadPerUnit: p.costing?.labourOverheadPerUnit ?? 0,
      freightOtherPerUnit: p.costing?.freightOtherPerUnit ?? 0,
      targetSellPrice: p.costing?.targetSellPrice ?? 0,
      ...(p.costing?.feasibilityStatus ? { feasibilityStatus: p.costing.feasibilityStatus } : {}),
      ...(p.costing?.assessor ? { assessor: p.costing.assessor } : {}),
      ...(p.costing?.reviewDate ? { reviewDate: dateOnly(p.costing.reviewDate) as string } : {}),
      ...(p.costing?.assumptions ? { assumptions: p.costing.assumptions } : {}),
      ...(p.costing?.evidenceLink ? { evidenceLink: p.costing.evidenceLink } : {}),
    },
    evidence: p.evidenceItems.map((e) => ({
      area: e.area,
      required: e.required as 'Y' | 'Conditional',
      trigger: e.trigger,
      primaryTemplate: e.primaryTemplate,
      owner: e.owner,
      // EvidenceItem's own status, not RequirementItem's — the two were the same
      // type until question 21 gave requirement rows an 'N/A' disposition, and
      // this cast was reading the wrong one.
      status: e.status as EvidenceItem['status'],
      gate: e.gate,
      evidenceLink: opt(e.evidenceLink),
      notes: opt(e.notes),
    })),
    capa: p.capaRecords.map((c) => ({
      id: c.code,
      market: c.market,
      eventType: c.eventType,
      summary: c.summary,
      severity: c.severity as ProjectData['capa'][number]['severity'],
      status: c.status as ProjectData['capa'][number]['status'],
      owner: c.owner,
      notes: opt(c.notes),
    })),
    feedback: p.feedbackEntries.map((f) => ({
      id: f.id,
      testerName: f.testerName,
      gender: f.gender as 'M' | 'F',
      dept: f.dept,
      dateTested: dateOnly(f.dateTested) ?? '',
      texture: f.texture,
      fragrance: f.fragrance,
      overall: f.overall,
      tooOilySlippery: f.tooOilySlippery,
      wouldRecommend: f.wouldRecommend,
      bestLiked: opt(f.bestLiked),
      concerns: opt(f.concerns),
    })),
    registers,
    registerClosures,
    nextActions: p.nextActions.map((a) => ({
      id: a.id,
      gateId: a.gateId,
      description: a.description,
      owner: opt(a.owner),
      dueDate: dateOnly(a.dueDate),
      status: a.status as ProjectData['nextActions'][number]['status'],
      priority: a.priority as ProjectData['nextActions'][number]['priority'],
      dateCompleted: dateOnly(a.dateCompleted),
      raisedBy: opt(a.raisedBy),
      verifiedBy: opt(a.verifiedBy),
    })),
    // E3(b): the readiness engine evaluates each open change's impact at Gate 11,
    // so the changes have to travel with the project rather than only in the
    // envelope's separate slice.
    changes: toChangeRecords(p) as ProjectData['changes'],
    backtrackEvents: p.backtrackEvents.map(
      (e): BacktrackEvent => ({
        id: e.id,
        date: dateOnly(e.occurredAt) ?? dateTime(e.occurredAt),
        initiatedBy: opt(e.initiatedBy),
        reason: opt(e.reason),
        fromGateId: e.fromGateId,
        toGateId: e.toGateId,
        reopenedGateIds: e.reopenedGateIds,
        // Snapshots are stored as opaque JSON on purpose (the whole point is an
        // immutable record of what the rows looked like), so the cast goes via
        // unknown rather than pretending Prisma's JsonValue overlaps the type.
        previousGates: (e.previousGates ?? []) as unknown as GateRecord[],
        previousSignOffs: (e.previousSignOffs ?? {}) as unknown as Record<number, SignOff[]>,
      }),
    ),
    gateChangeLog,
    marketTracks: p.marketTracks.map((t) => ({
      market: t.market,
      pifStatus: t.pifStatus as ProjectData['marketTracks'][number]['pifStatus'],
      regulatoryStatus: t.regulatoryStatus as ProjectData['marketTracks'][number]['regulatoryStatus'],
      claimsApproval: t.claimsApproval as ProjectData['marketTracks'][number]['claimsApproval'],
      launchApproval: t.launchApproval as ProjectData['marketTracks'][number]['launchApproval'],
      regulatoryNotes: opt(t.regulatoryNotes),
      pifApprovedDate: dateOnly(t.pifApprovedDate),
      launchApprovedDate: dateOnly(t.launchApprovedDate),
    })),
    studyApprovals: p.studyApprovals.map((s) => ({
      role: s.role as ProjectData['studyApprovals'][number]['role'],
      name: opt(s.name),
      department: opt(s.department),
      date: dateOnly(s.date),
      decision: opt(s.decision) as ProjectData['studyApprovals'][number]['decision'],
      comments: opt(s.comments),
    })),
    formulaVersion: active?.version ?? 'F1.0',
    formulaVersionHistory: superseded.map((v) => ({
      version: v.version,
      previousVersion: (v.previousVersionId ? versionById.get(v.previousVersionId) : undefined) ?? '',
      date: dateOnly(v.createdAt) ?? '',
      changeType: (v.changeType ?? 'Minor') as 'Major' | 'Minor',
      reason: opt(v.reason),
      initiatedBy: opt(v.initiatedBy),
      previousBomSnapshot: v.bomLines.map(toBomLine),
    })),
    reference,
  };
}
