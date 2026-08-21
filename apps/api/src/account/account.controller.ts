import { Body, Controller, Delete, Get, Put } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionUser } from '../auth/session-user';
import { AccountService } from './account.service';

// My Account (2026-08-21): self-service only, no admin surface. Every route
// operates on @CurrentUser().id — there is no target-user id anywhere here.
@Controller('account')
export class AccountController {
  constructor(private readonly account: AccountService) {}

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
}
