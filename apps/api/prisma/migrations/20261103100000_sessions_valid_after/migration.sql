-- AppHub sign-out revokes every session issued before this moment (hub/hub.controller.ts, auth/session-auth.guard.ts).
ALTER TABLE "users" ADD COLUMN "sessionsValidAfter" TIMESTAMP(3);
