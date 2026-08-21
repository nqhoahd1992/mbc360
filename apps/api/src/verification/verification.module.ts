import { Module } from '@nestjs/common';
import { OneTimeCodeService } from './one-time-code.service';

@Module({
  providers: [OneTimeCodeService],
  exports: [OneTimeCodeService],
})
export class VerificationModule {}
