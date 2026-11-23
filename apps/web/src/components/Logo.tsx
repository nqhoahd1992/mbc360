import './Logo.css';

/** The app's name, shown beside the company mark. */
export const SITE_NAME = 'MBc360';

/**
 * The Max Biocare Group mark, drawn as markup so it stays sharp at any size and
 * takes its red from the palette. Everything is in `em`: the caller sets the
 * size with `font-size` (a style or className on the wrapper).
 */
export function Logo({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <span role="img" aria-label="Max Biocare Group" className={`mbc-logo ${className}`} style={style}>
      <span aria-hidden="true" className="mbc-logo-line">
        <span className="mbc-logo-brand">max</span> <span className="mbc-logo-grey">biocare</span>
      </span>
      <span aria-hidden="true" className="mbc-logo-line2">
        <span className="mbc-logo-group">group</span>
        <span className="mbc-logo-bar" />
      </span>
    </span>
  );
}
