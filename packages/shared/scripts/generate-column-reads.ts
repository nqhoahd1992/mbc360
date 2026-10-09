// Regenerates packages/shared/src/config/registerColumnReads.ts. See column-reads-lib.ts.
import { writeFileSync } from 'fs';
import { join } from 'path';
import { renderColumnReadsFile, traceColumnReads } from './column-reads-lib';

const { reads, errors } = traceColumnReads();
if (errors.length > 0) {
  console.log(`${errors.length} check(s) threw while being traced (the trace is incomplete for them):`);
  for (const e of errors) console.log(`  ${e}`);
  process.exit(1);
}
const file = join(__dirname, '..', 'src', 'config', 'registerColumnReads.ts');
writeFileSync(file, renderColumnReadsFile(reads));
const registers = new Set([...Object.values(reads.checks), ...Object.values(reads.triggers)].flatMap((r) => Object.keys(r)));
console.log(`Wrote ${file}: ${Object.keys(reads.checks).length} gates read by checks, ${Object.keys(reads.triggers).length} by triggers, ${registers.size} registers.`);
