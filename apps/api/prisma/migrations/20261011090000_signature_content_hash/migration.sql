-- A register-closing signature remembers the hash of the register content its signer was shown, so a later
-- edit can mark it stale. Nullable on purpose: signatures recorded before this carry no hash, and inventing one
-- from today's content would claim the signer saw something we never captured.
ALTER TABLE "register_closure_sign_offs" ADD COLUMN "contentHash" TEXT;
