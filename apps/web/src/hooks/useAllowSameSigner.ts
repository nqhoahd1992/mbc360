import { useEffect, useState } from 'react';

// Development only: the API reports DEV_ALLOW_SAME_SIGNER on the public /api/auth/options, so the signer pickers stop disabling a person who
// already holds another signature on the record. Always false in production.
let cached: Promise<boolean> | undefined;
const load = () =>
  (cached ??= fetch('/api/auth/options')
    .then((res) => (res.ok ? (res.json() as Promise<{ allowSameSigner?: boolean }>) : undefined))
    .then((o) => o?.allowSameSigner === true)
    .catch(() => false));

export function useAllowSameSigner(): boolean {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    let live = true;
    void load().then((v) => live && setAllowed(v));
    return () => {
      live = false;
    };
  }, []);
  return allowed;
}
