import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { navItemHref, resolveSheetRefs } from '@mbc360/shared/config/registers';

// "Formula_BOM; Mechanism_Claims_Map" as the app's own pages: "Formula BOM · Mechanism & Claims Evidence Map", each one a link. Text that is
// not a sheet name ("literature/evidence link") is shown as written.
export default function SheetRefs({ value, projectId }: { value: string; projectId?: string }) {
  const refs = resolveSheetRefs(value);
  if (refs.length === 0) return <span className="rt-muted">—</span>;
  return (
    <>
      {refs.map((r, i) => (
        <Fragment key={`${r.text}-${i}`}>
          {i > 0 && <span className="rt-muted"> · </span>}
          {r.item && projectId ? <Link to={navItemHref(r.item, projectId)}>{r.text}</Link> : r.text}
        </Fragment>
      ))}
    </>
  );
}
