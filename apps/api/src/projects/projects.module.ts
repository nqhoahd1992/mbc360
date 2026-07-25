import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { IdempotencyService } from './idempotency.service';

// M3 Phase 1. PrismaModule and AuditModule are @Global, so only this module's
// own providers need listing here.
@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService, IdempotencyService],
})
export class ProjectsModule {}
