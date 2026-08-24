import { Module } from '@nestjs/common';
import { OneTimeCodeService } from './one-time-code.service';
import { TotpService } from './totp.service';

// OneTimeCodeService is the RETIRED emailed-code step-up (see the note on
// OneTimeCode in schema.prisma) — still provided, no longer injected
// anywhere, and due for deletion with MailerService once the authenticator
// flow is confirmed working in the field.
@Module({
  providers: [OneTimeCodeService, TotpService],
  exports: [OneTimeCodeService, TotpService],
})
export class VerificationModule {}
