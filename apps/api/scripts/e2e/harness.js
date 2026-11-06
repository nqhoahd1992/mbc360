// Starts the BUILT API for the end-to-end run (apps/api/scripts/e2e/run.ts). TEST ONLY.
//
// In this process only, the readiness lists of SG01-SG12 are cut down to their sign-off item, so
// those gates can pass on the three signatures alone instead of on every unrelated Mandatory
// item. Two critical items with an auto-generated N/A are kept on purpose and are what the reviewer-acknowledgement cases
// (Round 4 question 16) run against: `sg07-maternal-caution` (its data is in a shared register) and `sg08-infant-testing`
// (its data is in a table that exists only for the infant trigger, which is read-only while it does not apply and is
// cleared by the acknowledgement — SW-56). Nothing is written to disk and no production code path changes: the signing, the
// authenticator step-up, the snapshot and every freeze rule run exactly as shipped.
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..', '..', '..');
const { GATE_READINESS } = require(path.join(root, 'packages/shared/dist/config/gateReadiness.js'));
for (const gate of ['SG01', 'SG02', 'SG03', 'SG04', 'SG05', 'SG06', 'SG07', 'SG08', 'SG09', 'SG10', 'SG11', 'SG12']) {
  GATE_READINESS[gate] = GATE_READINESS[gate].filter((item) => item.check.kind === 'gateSignedOff' || item.id === 'sg07-maternal-caution' || item.id === 'sg08-infant-testing');
}
// E2E_API_DIST lets a run use a copy of the build, so it never needs to overwrite the dist a running dev API watches.
require(path.join(root, 'apps/api', process.env.E2E_API_DIST || 'dist', 'main.js'));
