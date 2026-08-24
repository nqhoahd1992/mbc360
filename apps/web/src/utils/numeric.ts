import type { CSSProperties } from 'react';

// Figures that are read DOWN a column — % w/w, kg, cost per unit — need
// same-width digits and a right edge to line up on, or comparing two rows
// means reading each number individually. Nothing in this app set either
// before, so every number column was proportional and left-aligned.
export const NUMERIC_CELL: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  // `text-align` on the cell handles static text; an antd InputNumber renders
  // its own <input>, which this is spread onto directly.
  textAlign: 'right',
};

// For an antd column definition: `...NUMERIC_COLUMN` right-aligns the header
// and cells together, so the header sits over the digits it labels.
export const NUMERIC_COLUMN = { align: 'right' as const };
