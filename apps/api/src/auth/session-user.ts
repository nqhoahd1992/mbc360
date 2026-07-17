import type { Prisma } from '../generated/prisma/client';

// The authenticated user as loaded by SessionAuthGuard on every request —
// fresh from the database (so deactivation and role changes apply immediately),
// with department and roles included for permission checks.
export type SessionUser = Prisma.UserGetPayload<{
  include: { department: true; roles: { include: { role: true } } };
}>;
