import { Module } from '@nestjs/common';
import { MarketProfilesController } from './market-profiles.controller';
import { ClaimsLibraryController } from './claims-library.controller';
import { RmRiskController } from './rm-risk.controller';
import { ReferenceDataService } from './reference-data.service';

// Company-level controlled reference data (Round 4 questions 4, 17, 28 —
// 2026-08-24). Market profiles and the Raw Material Risk Overlay; the Claims
// Library joins this module as its own controller, sharing ReferenceDataService.
@Module({
  controllers: [MarketProfilesController, RmRiskController, ClaimsLibraryController],
  providers: [ReferenceDataService],
  exports: [ReferenceDataService],
})
export class ReferenceModule {}
