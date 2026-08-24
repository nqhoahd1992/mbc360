// Semantic text colours.
//
// Two problems this replaces. (1) Contrast: `#999` on white is 2.85:1 and
// `#bfbfbf` is 1.9:1, both well under the 4.5:1 body text needs — and nearly
// every use was a 12px caption, where it matters most (subtitles, row counts,
// dates, empty states, "Link a Claim ID first"). (2) Raw hex literals spread
// across ~20 components, so the scale could not be changed — or a dark theme
// added — without hunting each one down.
//
// Ratios are against white, the app's only surface today.
export const TEXT = {
  /** Body and table content. 12.6:1 */
  primary: '#262626',
  /** Captions, subtitles, counts, empty states — anything that must still
   *  read comfortably. 7.0:1, matching antd's own colorTextSecondary. */
  secondary: '#595959',
  /** ONLY genuinely inert affordances: a locked phase, a zero count. 3.5:1,
   *  below the text threshold, which is exactly why it is not for prose. */
  disabled: '#8c8c8c',
} as const;

// Decorative icons that sit next to their own visible label: exempt from the
// text ratio, kept dim on purpose so the label leads.
export const ICON_MUTED = '#8c8c8c';

// antd's Layout.Header is 64px tall and this app pins it (`position: sticky`),
// so a table's own sticky header has to stop just below it instead of at
// viewport top — otherwise the two overlap while scrolling.
//
// Why sticky headers matter here specifically: every table renders with
// `pagination={false}`, so a register with 30+ rows scrolls the whole page and
// the column names leave the screen entirely. In a table where "Status",
// "Owner", "Evidence link" and "Notes" are all free text, a scrolled-away
// header means guessing which column you are typing into.
//
// 64 is not a guess: antd's Layout token sets `headerHeight: controlHeight * 2`
// (layout/style/index.js) and controlHeight defaults to 32.
//
// The offset alone is not enough — the app header also has to outrank the
// table's own sticky z-index, or the table header paints over it while being
// pushed out of view at the end of the table's scroll. See the comment on
// `zIndex` in App.tsx's Header.
//
// ⚠️ Page tables ONLY. Inside a Modal or Drawer the scroll container is the
// dialog body while this pins against the VIEWPORT, so the header detaches and
// floats across the middle of the rows (which is exactly what it did in the
// Change-trigger reference modal). In a dialog use `scroll={{ y }}` instead —
// that pins the header to the top of the table's own scroll area.
export const TABLE_STICKY = { offsetHeader: 64 } as const;
