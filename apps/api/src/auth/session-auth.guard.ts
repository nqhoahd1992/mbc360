import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { IS_PUBLIC_KEY } from './public.decorator';
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
    if (!user || !user.active) throw new UnauthorizedException('Unknown or deactivated user');

    (request as Request & { user: typeof user }).user = user;
    return true;
  }
}
