import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthController } from './health/health.controller';
import { MetaController } from './meta/meta.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { RbacModule } from './rbac/rbac.module';
import { AdminModule } from './admin/admin.module';
import { CosmetriModule } from './cosmetri/cosmetri.module';
import { ProjectsModule } from './projects/projects.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuditModule,
    AuthModule,
    RbacModule,
    AdminModule,
    CosmetriModule,
    ProjectsModule,
  ],
  controllers: [HealthController, MetaController],
})
export class AppModule {}
