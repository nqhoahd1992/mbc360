import { Body, Controller, Delete, Get, Post, Put } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionUser } from '../auth/session-user';
import { AccountService } from './account.service';
import { TotpService } from '../verification/totp.service';

// My Account (2026-08-21): self-service only, no admin surface. Every route
// operates on @CurrentUser().id — there is no target-user id anywhere here.
@Controller('account')
export class AccountController {
  constructor(
    private readonly account: AccountService,
    private readonly totp: TotpService,
  ) {}

  @Get('signature')
  getSignature(@CurrentUser() user: SessionUser) {
    return this.account.getSignature(user);
  }

  @Put('signature')
  saveSignature(@CurrentUser() user: SessionUser, @Body() body: { imageData?: string }) {
    return this.account.saveSignature(user, body.imageData);
  }

  @Delete('signature')
  deleteSignature(@CurrentUser() user: SessionUser) {
    return this.account.deleteSignature(user);
  }

  // Authenticator (TOTP), the second factor a signer proves before their
  // saved signature may be attached to a sign-off. Enrolment is two steps on
  // purpose: `enroll` hands out the QR payload, `activate` is where entering
  // a first correct code turns it into a usable factor.
  @Get('totp')
  totpStatus(@CurrentUser() user: SessionUser) {
    return this.totp.status(user.id);
  }

  @Post('totp/enroll')
  beginTotpEnrollment(@CurrentUser() user: SessionUser) {
    return this.totp.beginEnrollment(user);
  }

  @Post('totp/activate')
  activateTotp(@CurrentUser() user: SessionUser, @Body() body: { code?: string }) {
    return this.totp.activate(user, body.code ?? '');
  }

  // Needs a current code — see TotpService.disable.
  @Post('totp/remove')
  removeTotp(@CurrentUser() user: SessionUser, @Body() body: { code?: string }) {
    return this.totp.disable(user, body.code ?? '');
  }
}
