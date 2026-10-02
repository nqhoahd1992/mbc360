import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { ALLOW_WITHOUT_ROLE_KEY, IS_PUBLIC_KEY } from './public.decorator';
import { SESSION_COOKIE } from './auth-config';

// Global guard: every route requires a valid session cookie unless marked
// @Public(). The user is re-loaded from the database on each request so
// deactivation (users.active = false) and role changes take effect
// immediately — required for an approval/audit system.
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = (request.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
    if (!token) throw new UnauthorizedException('No session');

    let payload: { sub?: string };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
    if (!payload.sub) throw new UnauthorizedException('Invalid session payload');

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { department: true, roles: { include: { role: true } } },
    });
    if (!user) throw new UnauthorizedException('Unknown user');
    // Access rule (project owner, 2026-10-02): signing in with Microsoft 365
    // only proves the person belongs to the company tenant; being let IN
    // needs an active account holding at least one role, granted by an
    // administrator in Users & Roles. Checked on every request, not only at
    // sign-in, so deactivating someone or removing their last role takes
    // effect at once. The `code` lets the sign-in screen say which it was.
    const allowWithoutRole = this.reflector.getAllAndOverride<boolean>(ALLOW_WITHOUT_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!allowWithoutRole) {
      if (!user.active) throw new ForbiddenException({ code: 'INACTIVE', email: user.email, message: 'This account has been deactivated' });
      if (user.roles.length === 0) {
        throw new ForbiddenException({ code: 'NO_ROLE', email: user.email, message: 'No role has been assigned to this account yet' });
      }
    }

    (request as Request & { user: typeof user }).user = user;
    return true;
  }
}
