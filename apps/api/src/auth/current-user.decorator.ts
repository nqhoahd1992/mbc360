import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { SessionUser } from './session-user';

// Injects the user the SessionAuthGuard attached to the request.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as SessionUser;
  },
);
