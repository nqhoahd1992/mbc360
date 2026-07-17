import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { MetaController } from './meta/meta.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { RbacModule } from './rbac/rbac.module';

@Module({
  imports: [PrismaModule, AuditModule, AuthModule, RbacModule],
  controllers: [HealthController, MetaController],
})
export class AppModule {}
