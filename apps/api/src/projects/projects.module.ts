import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { IdempotencyService } from './idempotency.service';
import { RbacModule } from '../rbac/rbac.module';
import { VerificationModule } from '../verification/verification.module';

// M3 Phase 1. PrismaModule and AuditModule are @Global; RbacModule is imported
// for PermissionsService, which enforces the A4/F6 gate-decision grants
// server-side (the browser only disables the dropdown). VerificationModule
// backs the sign-off authenticator step-up (2026-08-21).
@Module({
  imports: [RbacModule, VerificationModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, IdempotencyService],
})
export class ProjectsModule {}
