import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Marks a route (or whole controller) as reachable without a session —
// everything else is protected by the global SessionAuthGuard.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
