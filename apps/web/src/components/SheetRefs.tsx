import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { navItemHref, resolveSheetRefs } from '@mbc360/shared/config/registers';

// Workbook tabs the app models as something other than a sheet (Stage_Map is the gate ladder; "PostMarket" is the post-market pages), named as the app names them.
const TAB_NAMES: Record<string, string> = { Stage_Map: 'Phase Gate Flow', PostMarket: 'Post-Market' };

// "Formula_BOM; Mechanism_Claims_Map" as the app's own pages: "Formula BOM · Mechanism & Claims Evidence Map", each one a link. Text that is
// not a sheet name ("literature/evidence link") is shown as written.
export default function SheetRefs({ value, projectId }: { value: string; projectId?: string }) {
  // A workbook tab that has no page of its own in the app (Stage_Map, Product_Request…) still reads as a name, never as a slug.
  const label = (ref: { text: string; item?: unknown }) => (ref.item ? ref.text : (TAB_NAMES[ref.text] ?? ref.text.replace(/([A-Za-z0-9])_(?=[A-Za-z0-9])/g, '$1 ')));
  // A sentence ("Open PIF_Evidence_Export; confirm mandatory sections") keeps its wording; only the sheet names inside it become page links.
  if (/\s/.test(value.trim())) {
    return (
      <>
        {value.split(/([A-Za-z0-9]+(?:_[A-Za-z0-9]+)+|\bPostMarket\b)/).map((part, i) => {
          const ref = i % 2 === 1 ? resolveSheetRefs(part)[0] : undefined;
          if (!ref) return <Fragment key={i}>{part}</Fragment>;
          return ref.item && projectId ? <Link key={i} to={navItemHref(ref.item, projectId)}>{ref.text}</Link> : <Fragment key={i}>{label(ref)}</Fragment>;
        })}
      </>
    );
  }
  const refs = resolveSheetRefs(value);
  if (refs.length === 0) return <span className="rt-muted">—</span>;
  return (
    <>
      {refs.map((r, i) => (
        <Fragment key={`${r.text}-${i}`}>
          {i > 0 && <span className="rt-muted"> · </span>}
          {r.item && projectId ? <Link to={navItemHref(r.item, projectId)}>{r.text}</Link> : label(r)}
        </Fragment>
      ))}
    </>
  );
}
