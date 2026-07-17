import { Body, Controller, ForbiddenException, Get, Post } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionUser } from '../auth/session-user';
import { PermissionsService } from '../rbac/permissions.service';
import { CosmetriTokenService } from './cosmetri-token.service';

// Cosmetri is read-only master data (A3) and its credentials never touch the
// browser. Status is visible to any signed-in user (e.g. to decide whether
// "Import from Cosmetri" should be offered); connecting/disconnecting/forcing
// a refresh changes shared, org-wide state, so those are admin-only.
@Controller('integrations/cosmetri')
export class CosmetriController {
  constructor(
    private readonly tokens: CosmetriTokenService,
    private readonly permissions: PermissionsService,
    private readonly audit: AuditService,
  ) {}

  private requireAdmin(user: SessionUser): void {
    if (!this.permissions.isAdmin(user)) throw new ForbiddenException('Admin role required');
  }

  @Get('status')
  status() {
    return this.tokens.getStatus();
  }

  @Post('connect')
  async connect(
    @CurrentUser() user: SessionUser,
    @Body() body: { baseUrl?: string; accessToken?: string; refreshToken?: string },
  ) {
    this.requireAdmin(user);
    const status = await this.tokens.connect({
      baseUrl: body.baseUrl ?? '',
      accessToken: body.accessToken ?? '',
      refreshToken: body.refreshToken ?? '',
    });
    await this.audit.record({
      actorId: user.id,
      entityType: 'cosmetri_connection',
      entityId: 'singleton',
      action: 'cosmetri.connected',
      after: { baseUrl: status.baseUrl },
    });
    return status;
  }

  @Post('disconnect')
  async disconnect(@CurrentUser() user: SessionUser) {
    this.requireAdmin(user);
    await this.tokens.disconnect();
    await this.audit.record({
      actorId: user.id,
      entityType: 'cosmetri_connection',
      entityId: 'singleton',
      action: 'cosmetri.disconnected',
    });
    return { connected: false };
  }

  @Post('refresh-now')
  async refreshNow(@CurrentUser() user: SessionUser) {
    this.requireAdmin(user);
    return this.tokens.refresh({ throwOnError: true });
  }
}
