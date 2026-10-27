import { Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getNavGroups, navItemHref, resolveSheetRefs, type NavItem } from '@mbc360/shared/config/registers';

// Workbook tabs the app models as something other than a sheet (Stage_Map is the gate ladder; "PostMarket" is the post-market pages), named as the app names them.
const TAB_NAMES: Record<string, string> = { Stage_Map: 'Phase Gate Flow', PostMarket: 'Post-Market' };

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Page titles worth finding in prose: long enough not to be an ordinary word ("Overview"), longest first so a title never loses to a
// shorter one that it contains.
let titleIndex: { re: RegExp; byTitle: Map<string, NavItem> } | undefined;
function titles() {
  if (titleIndex) return titleIndex;
  const byTitle = new Map<string, NavItem>();
  for (const item of getNavGroups().flatMap((g) => g.items)) {
    if (item.title.length >= 12 && !byTitle.has(item.title)) byTitle.set(item.title, item);
  }
  const sorted = [...byTitle.keys()].sort((a, b) => b.length - a.length);
  titleIndex = { re: new RegExp(`(${sorted.map(escapeRe).join('|')})`), byTitle };
  return titleIndex;
}

// "Formula_BOM; Mechanism_Claims_Map" as the app's own pages: "Formula BOM · Mechanism & Claims Evidence Map", each one a link. Text that is
// not a sheet name ("literature/evidence link") is shown as written. In a sentence, a workbook slug AND a page's own title as the app
// writes it ("Carries into the Target Product & Tech Platform dossier") both become links, so a mention of a sheet opens it.
export default function SheetRefs({ value, projectId }: { value: string; projectId?: string }) {
  const { pathname } = useLocation();
  // A workbook tab that has no page of its own in the app (Stage_Map, Product_Request…) still reads as a name, never as a slug.
  const label = (ref: { text: string; item?: unknown }) => (ref.item ? ref.text : (TAB_NAMES[ref.text] ?? ref.text.replace(/([A-Za-z0-9])_(?=[A-Za-z0-9])/g, '$1 ')));
  // A sentence ("Open PIF_Evidence_Export; confirm mandatory sections") keeps its wording; only the sheet names inside it become page links.
  if (/\s/.test(value.trim())) {
    const { re, byTitle } = titles();
    const link = (item: NavItem, text: string, key: string | number) => {
      const href = projectId ? navItemHref(item, projectId) : undefined;
      // A page does not link to itself.
      return href && !pathname.endsWith(href) ? (
        <Link key={key} to={href}>
          {text}
        </Link>
      ) : (
        <Fragment key={key}>{text}</Fragment>
      );
    };
    return (
      <>
        {value.split(/([A-Za-z0-9]+(?:_[A-Za-z0-9]+)+|\bPostMarket\b)/).map((part, i) => {
          if (i % 2 === 1) {
            const ref = resolveSheetRefs(part)[0];
            if (!ref) return <Fragment key={i}>{part}</Fragment>;
            return ref.item && projectId ? link(ref.item, ref.text, i) : <Fragment key={i}>{label(ref)}</Fragment>;
          }
          // Plain text: its own page titles become links too.
          return (
            <Fragment key={i}>
              {part.split(re).map((piece, j) => {
                const item = j % 2 === 1 ? byTitle.get(piece) : undefined;
                return item ? link(item, piece, `${i}-${j}`) : <Fragment key={`${i}-${j}`}>{piece}</Fragment>;
              })}
            </Fragment>
          );
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
