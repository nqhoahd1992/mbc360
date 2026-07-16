import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { MetaController } from './meta/meta.controller';

@Module({
  controllers: [HealthController, MetaController],
})
export class AppModule {}
