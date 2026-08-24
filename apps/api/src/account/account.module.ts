import { Module } from '@nestjs/common';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { VerificationModule } from '../verification/verification.module';

// PrismaModule/AuditModule are @Global; VerificationModule is imported for
// TotpService (authenticator enrolment).
@Module({
  imports: [VerificationModule],
  controllers: [AccountController],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
