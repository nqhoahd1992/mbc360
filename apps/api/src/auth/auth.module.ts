import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { loadAuthConfig } from './auth-config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionAuthGuard } from './session-auth.guard';
import { PinnedAdminsService } from './pinned-admins';
import { HubController } from '../hub/hub.controller';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: loadAuthConfig().sessionSecret,
    }),
  ],
  controllers: [AuthController, HubController],
  providers: [
    AuthService,
    // Applies PINNED_ADMINS on every start (= every deploy).
    PinnedAdminsService,
    // Global: every route requires a session unless marked @Public().
    { provide: APP_GUARD, useClass: SessionAuthGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
