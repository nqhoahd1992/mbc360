import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { GATE_DECISIONS, STAGE_STATUSES } from '@mbc360/shared/config/gates';
import { REVIEW_ROLE_KEYS } from '@mbc360/shared/config/reviewers';
import type {
  AngleRow,
  ChangeRecord,
  ChecklistItem,
  GateCheck,
  GateRecord,
  ProjectData,
  RegisterRow,
  RequirementItem,
  SignOff,
} from '@mbc360/shared/types';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionUser } from '../auth/session-user';
import { IdempotencyService } from './idempotency.service';
import { ProjectsService, type ProjectEnvelope, type ProjectListItem } from './projects.service';
import type { NewProjectReviewer } from './project-scaffold';

// M3 Phase 1 endpoints. SessionAuthGuard is global, so every route here already
// requires a signed-in user and `@CurrentUser()` is the audited actor — the
// client can no longer pass its own "changed by" name (it used to).
interface CreateProjectBody {
  id?: string;
  productCode: string;
  projectLead: string;
  productGroup: string;
  brandCustomer: string;
  dateOpened?: string;
  targetLaunchDate: string;
  productSku: string;
  ownerDepartment: string;
  markets?: string[];
  reviewers?: Record<string, string> | NewProjectReviewer[];
}

interface GatePatchBody extends Partial<GateRecord> {
  expectedVersion: number;
}

interface GatesBulkBody {
  gates: (Partial<GateRecord> & { gateId: string })[];
  expectedVersion: number;
}

interface BacktrackBody {
  fromGateId: string;
  toGateId: string;
  reason: string;
  initiatedBy?: string;
  expectedVersion: number;
}

// Dropdown-valued fields are validated against the shared lists rather than DB
// enums (the project's stated convention), so a client cannot write a status or
// decision the UI could never produce.
function validateGatePatch(patch: Partial<GateRecord>): void {
  if (patch.status !== undefined && !STAGE_STATUSES.includes(patch.status)) {
    throw new BadRequestException(`Unknown stage status "${patch.status}"`);
  }
  if (
    patch.decision !== undefined &&
    patch.decision !== null &&
    !GATE_DECISIONS.includes(patch.decision)
  ) {
    throw new BadRequestException(`Unknown gate decision "${patch.decision}"`);
  }
}

// The frontend stores reviewers as roleKey -> displayName; accept that shape as
// well as the richer array so POST /projects works straight from the existing
// Create New Project form without changing it.
function normaliseReviewers(
  input: CreateProjectBody['reviewers'],
): NewProjectReviewer[] | undefined {
  if (!input) return undefined;
  if (Array.isArray(input)) return input;
  return Object.entries(input)
    .filter(([roleKey, name]) => REVIEW_ROLE_KEYS.includes(roleKey) && !!name?.trim())
    .map(([roleKey, name]) => ({ roleKey, name: name.trim() }));
}

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Get()
  list(@Query('includeArchived') includeArchived?: string): Promise<ProjectListItem[]> {
    return this.projects.list(includeArchived === '1' || includeArchived === 'true');
  }

  @Get(':id')
  get(@Param('id') id: string): Promise<ProjectEnvelope> {
    return this.projects.get(id);
  }

  @Post()
  create(
    @CurrentUser() user: SessionUser,
    @Body() body: CreateProjectBody,
    @Headers('idempotency-key') key: string | undefined,
  ): Promise<ProjectEnvelope> {
    const idempotencyKey = this.idempotency.requireKey(key);
    for (const field of [
      'productCode',
      'projectLead',
      'productSku',
      'ownerDepartment',
      'productGroup',
      'brandCustomer',
    ] as const) {
      if (!body[field]?.trim()) throw new BadRequestException(`${field} is required`);
    }
    if (!body.targetLaunchDate) throw new BadRequestException('targetLaunchDate is required');
    if (!body.markets || body.markets.length === 0) {
      throw new BadRequestException('markets is required');
    }
    return this.projects.create(
      user.id,
      {
        id: body.id?.trim() || undefined,
        productCode: body.productCode.trim(),
        projectLead: body.projectLead.trim(),
        productGroup: body.productGroup?.trim() ?? '',
        brandCustomer: body.brandCustomer?.trim() ?? '',
        dateOpened: body.dateOpened ? new Date(body.dateOpened) : new Date(),
        targetLaunchDate: new Date(body.targetLaunchDate),
        productSku: body.productSku.trim(),
        ownerDepartment: body.ownerDepartment.trim(),
        markets: body.markets ?? [],
        reviewers: normaliseReviewers(body.reviewers),
      },
      idempotencyKey,
    );
  }

  // Admin-only (checked in the service). Also removes the project's audit trail.
  @Delete(':id')
  async remove(@CurrentUser() user: SessionUser, @Param('id') id: string): Promise<{ ok: true }> {
    await this.projects.remove(user, id);
    return { ok: true };
  }

  // Archive / restore — the reversible alternative to delete, gated by the
  // `project|archive` capability (seeded to Project Owner).
  @Post(':id/archive')
  archive(@CurrentUser() user: SessionUser, @Param('id') id: string): Promise<ProjectEnvelope> {
    return this.projects.setArchived(user, id, true);
  }

  @Post(':id/restore')
  restore(@CurrentUser() user: SessionUser, @Param('id') id: string): Promise<ProjectEnvelope> {
    return this.projects.setArchived(user, id, false);
  }

  @Put(':id/gates/:gateId')
  updateGate(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Param('gateId') gateId: string,
    @Body() body: GatePatchBody,
  ): Promise<ProjectEnvelope> {
    const { expectedVersion, ...patch } = body;
    validateGatePatch(patch);
    return this.projects.updateGate(user, id, gateId, patch, expectedVersion);
  }

  @Put(':id/gates')
  updateGates(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: GatesBulkBody,
  ): Promise<ProjectEnvelope> {
    if (!Array.isArray(body.gates)) throw new BadRequestException('gates must be an array');
    body.gates.forEach(validateGatePatch);
    return this.projects.updateGates(user, id, body.gates, body.expectedVersion);
  }

  // --- M3 Phase 2-6: one route per section, mirroring the store's bulk actions.
  // Every one goes through ProjectsService.mutate, so they all share the
  // transaction, expectedVersion 409, archived-read-only check and audit row.
  @Put(':id/checklists/:section')
  setChecklist(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Param('section') section: string,
    @Body() body: { items: ChecklistItem[]; expectedVersion: number },
  ): Promise<ProjectEnvelope> {
    return this.projects.setChecklistSection(user, id, section, body.items ?? [], body.expectedVersion);
  }

  @Put(':id/requirements/:section')
  setRequirements(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Param('section') section: string,
    @Body() body: { items: RequirementItem[]; expectedVersion: number },
  ): Promise<ProjectEnvelope> {
    return this.projects.setRequirementSection(user, id, section, body.items ?? [], body.expectedVersion);
  }

  @Put(':id/gate-checks')
  setGateChecks(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: { updates: { gate: string; check: string; patch: Partial<GateCheck> }[]; expectedVersion: number },
  ): Promise<ProjectEnvelope> {
    return this.projects.setGateChecks(user, id, body.updates ?? [], body.expectedVersion);
  }

  @Put(':id/phases/:phase/angles')
  setAngles(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Param('phase') phase: string,
    @Body() body: { angles: AngleRow[]; expectedVersion: number },
  ): Promise<ProjectEnvelope> {
    return this.projects.setAngles(user, id, Number(phase), body.angles ?? [], body.expectedVersion);
  }

  @Put(':id/phases/:phase/sign-offs')
  setSignOffs(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Param('phase') phase: string,
    @Body() body: { signOffs: SignOff[]; expectedVersion: number },
  ): Promise<ProjectEnvelope> {
    return this.projects.setSignOffs(user, id, Number(phase), body.signOffs ?? [], body.expectedVersion);
  }

  @Put(':id/phases/:phase/evidence-summary')
  setEvidenceSummary(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Param('phase') phase: string,
    @Body() body: { value: string; expectedVersion: number },
  ): Promise<ProjectEnvelope> {
    return this.projects.setEvidenceSummary(user, id, Number(phase), body.value ?? '', body.expectedVersion);
  }

  @Post(':id/phases/:phase/accept-pre-work')
  acceptPreWork(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Param('phase') phase: string,
    @Body() body: { expectedVersion: number },
  ): Promise<ProjectEnvelope> {
    return this.projects.acceptPreWork(user, id, Number(phase), body.expectedVersion);
  }

  @Put(':id/registers/:registerKey')
  setRegisterRows(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Param('registerKey') registerKey: string,
    @Body() body: { rows: RegisterRow[]; expectedVersion: number },
  ): Promise<ProjectEnvelope> {
    return this.projects.setRegisterRows(user, id, registerKey, body.rows ?? [], body.expectedVersion);
  }

  @Put(':id/evidence')
  setEvidence(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: { items: ProjectData['evidence']; expectedVersion: number },
  ): Promise<ProjectEnvelope> {
    return this.projects.setEvidenceItems(user, id, body.items ?? [], body.expectedVersion);
  }

  @Put(':id/bom')
  setBom(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: { lines: ProjectData['bom']; expectedVersion: number },
  ): Promise<ProjectEnvelope> {
    return this.projects.setBom(user, id, body.lines ?? [], body.expectedVersion);
  }

  @Put(':id/packaging-bom')
  setPackagingBom(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: { lines: ProjectData['packagingBom']; expectedVersion: number },
  ): Promise<ProjectEnvelope> {
    return this.projects.setPackagingBom(user, id, body.lines ?? [], body.expectedVersion);
  }

  @Put(':id/costing')
  setCosting(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: { patch: Partial<ProjectData['costing']>; expectedVersion: number },
  ): Promise<ProjectEnvelope> {
    return this.projects.setCosting(user, id, body.patch ?? {}, body.expectedVersion);
  }

  @Put(':id/identity')
  setIdentity(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: { patch: Partial<ProjectData['identity']>; expectedVersion: number },
  ): Promise<ProjectEnvelope> {
    return this.projects.setIdentity(user, id, body.patch ?? {}, body.expectedVersion);
  }

  @Put(':id/next-actions')
  setNextActions(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: { gateIds: string[]; actions: ProjectData['nextActions']; expectedVersion: number },
  ): Promise<ProjectEnvelope> {
    return this.projects.setNextActions(user, id, body.gateIds ?? [], body.actions ?? [], body.expectedVersion);
  }

  @Put(':id/market-tracks')
  setMarketTracks(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: { tracks: ProjectData['marketTracks']; expectedVersion: number },
  ): Promise<ProjectEnvelope> {
    return this.projects.setMarketTracks(user, id, body.tracks ?? [], body.expectedVersion);
  }

  @Put(':id/study-approvals')
  setStudyApprovals(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: { approvals: ProjectData['studyApprovals']; expectedVersion: number },
  ): Promise<ProjectEnvelope> {
    return this.projects.setStudyApprovals(user, id, body.approvals ?? [], body.expectedVersion);
  }

  @Put(':id/capa')
  setCapa(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: { records: ProjectData['capa']; expectedVersion: number },
  ): Promise<ProjectEnvelope> {
    return this.projects.setCapa(user, id, body.records ?? [], body.expectedVersion);
  }

  @Put(':id/feedback')
  setFeedback(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: { entries: ProjectData['feedback']; expectedVersion: number },
  ): Promise<ProjectEnvelope> {
    return this.projects.setFeedback(user, id, body.entries ?? [], body.expectedVersion);
  }

  @Put(':id/changes')
  setChanges(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: { records: ChangeRecord[]; expectedVersion: number },
  ): Promise<ProjectEnvelope> {
    return this.projects.setChanges(user, id, body.records ?? [], body.expectedVersion);
  }

  @Post(':id/formula-versions')
  createFormulaVersion(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body()
    body: {
      version: string;
      changeType: 'Major' | 'Minor';
      reason?: string;
      initiatedBy?: string;
      majorCriteria?: string[];
      classificationConfirmedBy?: string;
      expectedVersion: number;
    },
    @Headers('idempotency-key') key: string | undefined,
  ): Promise<ProjectEnvelope> {
    const idempotencyKey = this.idempotency.requireKey(key);
    const { expectedVersion, ...input } = body;
    return this.projects.createFormulaVersion(user, id, input, expectedVersion, idempotencyKey);
  }

  @Post(':id/backtrack')
  backtrack(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: BacktrackBody,
    @Headers('idempotency-key') key: string | undefined,
  ): Promise<ProjectEnvelope> {
    const idempotencyKey = this.idempotency.requireKey(key);
    return this.projects.backtrack(
      user,
      id,
      {
        fromGateId: body.fromGateId,
        toGateId: body.toGateId,
        reason: body.reason,
        // The audit actor comes from the session; `initiatedBy` is kept only as
        // the human label shown on the immutable event.
        initiatedBy: body.initiatedBy ?? user.displayName,
      },
      body.expectedVersion,
      idempotencyKey,
    );
  }
}
