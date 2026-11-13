import { Logger } from '@nestjs/common';
import { notifyHubAccessChanged } from './hub-connector';

const logger = new Logger('HubNotify');

// Someone's way IN changed (account created / deleted, switched on or off, roles going from none to some or back): tell
// AppHub, so its Apps menu stops (or starts) dimming MBc360 for them at once (AppHub repo: docs/01-sso-protocol.md
// section 7c). Only a nudge — AppHub re-asks POST /api/hub/access (hub.controller.ts). Without it the menu catches up on
// AppHub's own refresh. Swapping one role for another changes nothing here, so it doesn't call this.
// Call AFTER the change is saved and never await it: AppHub being down must not fail the change. Never throws.
export function notifyHubAccess(email: string | null | undefined, send: typeof notifyHubAccessChanged = notifyHubAccessChanged): Promise<boolean> {
  const hubUrl = process.env.HUB_URL?.trim().replace(/\/$/, '');
  const app = process.env.HUB_APP?.trim();
  // During a secret change HUB_SECRET_NEXT is the new key: AppHub accepts it both before and after "Activate".
  const secret = (process.env.HUB_SECRET_NEXT || process.env.HUB_SECRET)?.trim();
  if (!hubUrl || !app || !secret || !email) return Promise.resolve(false); // AppHub not set up: nothing to tell

  return Promise.resolve()
    .then(() => send({ hubUrl, app, secret, email, apiUrl: process.env.HUB_API_URL, lanRewrite: process.env.HUB_LAN_REWRITE }))
    .then((result) => {
      if (!result.ok) logger.warn(`hub access-changed: AppHub did not take it for ${email} — ${result.reason}`);
      return result.ok;
    })
    .catch((error: unknown) => {
      logger.warn(`hub access-changed: ${(error as Error)?.message ?? error}`);
      return false;
    });
}
