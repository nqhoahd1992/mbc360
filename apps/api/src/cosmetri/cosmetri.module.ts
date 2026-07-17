import { Module } from '@nestjs/common';
import { CosmetriController } from './cosmetri.controller';
import { CosmetriTokenService } from './cosmetri-token.service';
import { CosmetriRefreshJob } from './cosmetri-refresh.job';

@Module({
  controllers: [CosmetriController],
  providers: [CosmetriTokenService, CosmetriRefreshJob],
  exports: [CosmetriTokenService],
})
export class CosmetriModule {}
