import type { RegisterColumn } from '@mbc360/shared/config/registers';

// A register column has to be at least as wide as the control it renders.
//
// The bug this fixes: `prohibitedIngredients` declares `owner` (a `user`
// column) at width 110, while UserSelect carries `minWidth: 120`. `min-width`
// beats `width: 100%`, so the picker rendered 120px wide inside a 110px cell
// with ~16px of padding — about 26px of it sitting on top of the next column
// ("Linked gate"). Nothing clipped it, because antd only hides cell overflow
// for ellipsis columns.
//
// Widening the column is the right end to fix: the control's minimum is a
// usability requirement (a 90px dropdown showing "Regulatory …" is not usable),
// and every one of these tables already scrolls horizontally, so a wider column
// costs scroll rather than layout. Config keeps saying what it wants; this is
// the floor.
//
// Values are the control's own min-width plus the 16px an antd `size="small"`
// cell spends on padding, and 2px so the border never lands on the seam.
// Only the controls that actually declare a `min-width` are listed. A
// DatePicker and NextActionSelect are `width: 100%` with no minimum, so they
// shrink with their column and cannot overlap anything — giving THOSE a floor
// would just widen ~25 date columns for no reason. Keep this list in step with
// the components: DynamicTable's select (110), UserSelect (120),
// MarketSelect (110), ClaimSelect (140).
const PADDING = 18;
const CONTROL_MIN_WIDTH: Partial<Record<RegisterColumn['type'], number>> = {
  select: 110 + PADDING,
  user: 120 + PADDING,
  market: 110 + PADDING,
  markets: 110 + PADDING,
  claimRef: 140 + PADDING,
};

export const DEFAULT_COLUMN_WIDTH = 140;

export function columnWidth(column: RegisterColumn): number {
  return Math.max(column.width ?? DEFAULT_COLUMN_WIDTH, CONTROL_MIN_WIDTH[column.type] ?? 0);
}

// Sum for a table's `scroll={{ x }}`, so the horizontal scroll matches the
// widths actually rendered.
export function columnsTotalWidth(columns: RegisterColumn[], extra = 0): number {
  return columns.reduce((sum, column) => sum + columnWidth(column), 0) + extra;
}
