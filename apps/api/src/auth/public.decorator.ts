import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Marks a route (or whole controller) as reachable without a session —
// everything else is protected by the global SessionAuthGuard.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ALLOW_WITHOUT_ROLE_KEY = 'allowWithoutRole';

// A signed-in user with no role may still reach this route. Only sign-out uses
// it: a user who has just lost their last role must still be able to end the
// session (2026-10-02 access rule — see SessionAuthGuard).
export const AllowWithoutRole = () => SetMetadata(ALLOW_WITHOUT_ROLE_KEY, true);
