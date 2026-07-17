import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { loadAuthConfig } from './auth-config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionAuthGuard } from './session-auth.guard';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: loadAuthConfig().sessionSecret,
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    // Global: every route requires a session unless marked @Public().
    { provide: APP_GUARD, useClass: SessionAuthGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
