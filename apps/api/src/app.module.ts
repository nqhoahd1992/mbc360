import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { MetaController } from './meta/meta.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [HealthController, MetaController],
})
export class AppModule {}
