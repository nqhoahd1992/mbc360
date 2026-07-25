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
} from '@nestjs/common';
import { GATE_DECISIONS, STAGE_STATUSES } from '@mbc360/shared/config/gates';
import { REVIEW_ROLE_KEYS } from '@mbc360/shared/config/reviewers';
import type { GateRecord } from '@mbc360/shared/types';
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
  list(): Promise<ProjectListItem[]> {
    return this.projects.list();
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
    for (const field of ['productCode', 'projectLead', 'productSku', 'ownerDepartment'] as const) {
      if (!body[field]?.trim()) throw new BadRequestException(`${field} is required`);
    }
    if (!body.targetLaunchDate) throw new BadRequestException('targetLaunchDate is required');
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

  @Delete(':id')
  async remove(@CurrentUser() user: SessionUser, @Param('id') id: string): Promise<{ ok: true }> {
    await this.projects.remove(user.id, id);
    return { ok: true };
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
    return this.projects.updateGate(user.id, id, gateId, patch, expectedVersion);
  }

  @Put(':id/gates')
  updateGates(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: GatesBulkBody,
  ): Promise<ProjectEnvelope> {
    if (!Array.isArray(body.gates)) throw new BadRequestException('gates must be an array');
    body.gates.forEach(validateGatePatch);
    return this.projects.updateGates(user.id, id, body.gates, body.expectedVersion);
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
      user.id,
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
