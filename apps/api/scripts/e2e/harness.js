// Starts the BUILT API for the end-to-end run (apps/api/scripts/e2e/run.ts). TEST ONLY.
//
// In this process only, the readiness lists of SG01-SG12 are cut down to their sign-off item, so
// those gates can pass on the three signatures alone instead of on every unrelated Mandatory
// item. Nothing is written to disk and no production code path changes: the signing, the
// authenticator step-up, the snapshot and every freeze rule run exactly as shipped.
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..', '..', '..');
const { GATE_READINESS } = require(path.join(root, 'packages/shared/dist/config/gateReadiness.js'));
for (const gate of ['SG01', 'SG02', 'SG03', 'SG04', 'SG05', 'SG06', 'SG07', 'SG08', 'SG09', 'SG10', 'SG11', 'SG12']) {
  GATE_READINESS[gate] = GATE_READINESS[gate].filter((item) => item.check.kind === 'gateSignedOff');
}
require(path.join(root, 'apps/api/dist/main.js'));
