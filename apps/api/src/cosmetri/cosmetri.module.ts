import { Module } from '@nestjs/common';
import { CosmetriController } from './cosmetri.controller';
import { CosmetriDataService } from './cosmetri-data.service';
import { CosmetriTokenService } from './cosmetri-token.service';
import { CosmetriRefreshJob } from './cosmetri-refresh.job';

@Module({
  controllers: [CosmetriController],
  providers: [CosmetriTokenService, CosmetriDataService, CosmetriRefreshJob],
  exports: [CosmetriTokenService],
})
export class CosmetriModule {}
