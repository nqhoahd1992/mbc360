import { Link } from 'react-router-dom';
import { needsTechnologyTraceability } from '@mbc360/shared/config/registers';
import type { RegisterRow } from '@mbc360/shared/types';
import DynamicTable from './DynamicTable';

// The "Needs -> Technology Traceability Matrix" of Step 1, shown read-only on Step 3 (Target Product & Tech Platform). The
// workbook says it "carries into" Sheet 3: the technology direction and critical attributes chosen there are the input to the
// platform defined here, so the person filling this page sees them beside it instead of copying them across by hand.
// Nothing here is editable and nothing reads it as a rule — it is for checking the two against each other.
//
// It is the SAME table component the matrix is edited in on Needs & Scientific Basis (DynamicTable, read-only), with the same
// four columns in the list (config.listColumns) and the whole entry in the drawer, so the two screens cannot drift apart.

export default function NeedsTraceabilityReference({ projectId, rows }: { projectId: string; rows: RegisterRow[] }) {
  return (
    <DynamicTable
      config={needsTechnologyTraceability}
      rows={rows}
      onSave={() => undefined}
      readOnly
      hideDescription
      readOnlyReason={
        <>
          Shown for checking — this is Step 1's matrix.{' '}
          <Link to={`/projects/${projectId}/needs-scientific-basis?scrollTo=sec-needs-traceability`}>Edit it on Needs &amp; Scientific Basis</Link>.
        </>
      }
    />
  );
}
