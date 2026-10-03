import { useLayoutEffect, useRef, useState } from 'react';
import { Button, Drawer, Grid, Popconfirm } from 'antd';
import { DeleteOutlined, DownOutlined, PlusOutlined, RightOutlined, UpOutlined } from '@ant-design/icons';
import '../styles/concept.css';
import './DynamicTable.css';
import { useExclusiveDrawer } from '../hooks/exclusiveDrawer';

// A compact list of records with a detail drawer — the register concept
// (DynamicTable, 2026-10-02) for the phase-page blocks that are not registers:
// Key Gate Checks, Next Actions, requirement tables, 8 Angles. Each caller keeps
// its own draft, Save and rules; this only lays them out. A row shows its name,
// a subtitle and at most a couple of inline controls; every field opens in the
// drawer.
export interface RecordListProps<T> {
  title: React.ReactNode;
  description?: React.ReactNode;
  count?: React.ReactNode;
  rows: T[];
  rowKey: (row: T, index: number) => string;
  rowTitle: (row: T, index: number) => React.ReactNode;
  rowSubtitle?: (row: T, index: number) => React.ReactNode;
  // Small leading badge, e.g. the row's gate.
  rowBadge?: (row: T, index: number) => React.ReactNode;
  // Controls shown on the row itself (clicks on them do not open the drawer).
  inline?: { label: string; width?: number; render: (row: T, index: number) => React.ReactNode }[];
  // Highlight a row that still blocks something.
  rowFlag?: (row: T, index: number) => boolean;
  drawerTitle?: (row: T, index: number) => React.ReactNode;
  drawer: (row: T, index: number) => React.ReactNode;
  emptyText?: string;
  addLabel?: string;
  // Returns the index of the row it added, so the drawer opens on it.
  onAdd?: () => number;
  onRemove?: (index: number) => void;
  // True for a row with nothing typed into it: it is removed without the
  // confirmation step, since there is nothing to lose.
  isRowBlank?: (row: T, index: number) => boolean;
  removeLabel?: string;
  // Rendered after the rows (the SaveBar).
  footer?: React.ReactNode;
  // Highlight the whole card (a required section on the current gate).
  required?: boolean;
  // Optional control of which row's drawer is open, for callers that open it
  // themselves (e.g. ticking Done opens the drawer to record its evidence).
  openIndex?: number | null;
  onOpenIndexChange?: (index: number | null) => void;
  // Nothing in the list is editable (its gate has passed): the drawer drops
  // the "changes stay in the draft" hint, which would be untrue there.
  readOnly?: boolean;
}

const INLINE_DEFAULT = 168;
const TABLE_MIN = 640;

export default function RecordList<T>({
  title,
  description,
  count,
  rows,
  rowKey,
  rowTitle,
  rowSubtitle,
  rowBadge,
  inline = [],
  rowFlag,
  drawerTitle,
  drawer,
  emptyText = 'Nothing recorded yet.',
  addLabel = 'Add row',
  onAdd,
  onRemove,
  isRowBlank,
  removeLabel = 'Remove',
  footer,
  required,
  openIndex: controlledOpen,
  onOpenIndexChange,
  readOnly,
}: RecordListProps<T>) {
  const [ownOpen, setOwnOpen] = useState<number | null>(null);
  const controlled = controlledOpen !== undefined;
  const openIndex = controlled ? controlledOpen : ownOpen;
  const setOpenRaw = (index: number | null) => (controlled ? onOpenIndexChange?.(index) : setOwnOpen(index));
  // The row `onAdd` just created, until the drawer moves off it. Leaving it while
  // it is still blank (per `isRowBlank`) removes it through `onRemove`, so
  // pressing Close on a new, untouched row does not leave an empty entry behind
  // (2026-10-03, user-reported). Any way of leaving counts — the ✕, the mask,
  // Esc, another drawer opening, or stepping to another row.
  const [freshIndex, setFreshIndex] = useState<number | null>(null);
  const setOpenIndex = (target: number | null) => {
    let next = target;
    if (freshIndex !== null && next !== freshIndex) {
      const row = rows[freshIndex];
      if (row !== undefined && onRemove && isRowBlank?.(row, freshIndex)) {
        onRemove(freshIndex);
        if (next !== null && next > freshIndex) next -= 1;
      }
      setFreshIndex(null);
    }
    setOpenRaw(next);
  };
  // After an explicit Remove the row is gone already; just close.
  const closeAfterRemove = () => {
    setFreshIndex(null);
    setOpenRaw(null);
  };
  useExclusiveDrawer(openIndex !== null, () => setOpenIndex(null));
  const screens = Grid.useBreakpoint();
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(node);
    setWidth(node.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);
  const tableMode = width >= TABLE_MIN;
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const open = openIndex === null ? undefined : rows[openIndex];
  const step = (delta: number) => {
    if (openIndex === null || rows.length === 0) return;
    setOpenIndex((openIndex + delta + rows.length) % rows.length);
  };

  return (
    <div className={`concept-tokens c-card rt rt-standalone${required ? ' rl-required' : ''}`}>
      <div className="rt-head rl-head">
        <div style={{ minWidth: 0 }}>
          <div className="rt-head-title">{title}</div>
          {description && <p className="rt-head-desc">{description}</p>}
        </div>
        {count && <span className="rl-count">{count}</span>}
      </div>

      <div ref={ref} className="rt-body">
        {tableMode ? (
          <table className="rt-table">
            {inline.length > 0 && (
              <thead>
                <tr>
                  <th>Item</th>
                  {inline.map((c) => (
                    <th key={c.label} style={{ width: c.width ?? INLINE_DEFAULT }}>
                      {c.label}
                    </th>
                  ))}
                  <th style={{ width: 36 }} aria-label="Open" />
                </tr>
              </thead>
            )}
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={rowKey(row, index)}
                  className={`rt-row${rowFlag?.(row, index) ? ' rl-flag' : ''}`}
                  aria-selected={openIndex === index}
                  onClick={() => setOpenIndex(index)}
                >
                  <td>
                    <div className="rl-name">
                      {rowBadge?.(row, index)}
                      <div style={{ minWidth: 0 }}>
                        <div className="rl-title">{rowTitle(row, index)}</div>
                        {rowSubtitle && <div className="rt-sub">{rowSubtitle(row, index)}</div>}
                      </div>
                    </div>
                  </td>
                  {inline.map((c) => (
                    <td key={c.label} onClick={stop}>
                      {c.render(row, index)}
                    </td>
                  ))}
                  <td className="rt-chev">
                    <RightOutlined />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={inline.length + 2} className="rt-empty">
                    {emptyText}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <ul className="rt-list">
            {rows.map((row, index) => (
              <li
                key={rowKey(row, index)}
                className={`rt-row${rowFlag?.(row, index) ? ' rl-flag' : ''}`}
                aria-selected={openIndex === index}
                onClick={() => setOpenIndex(index)}
              >
                <div className="rt-list-head">
                  <div className="rl-name">
                    {rowBadge?.(row, index)}
                    <div style={{ minWidth: 0 }}>
                      <div className="rl-title">{rowTitle(row, index)}</div>
                      {rowSubtitle && <div className="rt-sub" style={{ whiteSpace: 'normal' }}>{rowSubtitle(row, index)}</div>}
                    </div>
                  </div>
                  <RightOutlined className="rt-chev" />
                </div>
                {inline.length > 0 && (
                  <div className="rt-list-controls" onClick={stop}>
                    {inline.map((c) => (
                      <label key={c.label}>
                        <span className="rt-label">{c.label}</span>
                        {c.render(row, index)}
                      </label>
                    ))}
                  </div>
                )}
              </li>
            ))}
            {rows.length === 0 && <li className="rt-empty">{emptyText}</li>}
          </ul>
        )}
        {onAdd && (
          <div className="rt-add">
            <Button type="dashed" block icon={<PlusOutlined />} onClick={() => {
                const index = onAdd();
                setFreshIndex(index);
                setOpenRaw(index);
              }}>
              {addLabel}
            </Button>
          </div>
        )}
      </div>

      {footer}

      <Drawer
        open={open !== undefined}
        onClose={() => setOpenIndex(null)}
        size={screens.md ? 520 : '100%'}
        mask={!screens.xxl}
        closable={false}
        rootClassName="concept-tokens"
        title={
          open &&
          openIndex !== null && (
            <div className="rt-drawer-head">
              <div style={{ minWidth: 0 }}>
                <div className="rt-drawer-count">
                  {openIndex + 1} of {rows.length}
                </div>
                <div className="rt-drawer-name">{(drawerTitle ?? rowTitle)(open, openIndex)}</div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <Button type="text" icon={<UpOutlined />} aria-label="Previous" onClick={() => step(-1)} />
                <Button type="text" icon={<DownOutlined />} aria-label="Next" onClick={() => step(1)} />
                <Button type="text" aria-label="Close" onClick={() => setOpenIndex(null)}>
                  ✕
                </Button>
              </div>
            </div>
          )
        }
        footer={
          openIndex !== null ? (
            <div className="rt-drawer-foot">
              {/* No "Done" button: it only closed the drawer (the ✕ does that)
                  while reading as if the record were finished or saved — and
                  clashed with the "Done" tick on Key Gate Checks. */}
              {readOnly ? <span /> : <span className="rt-drawer-hint">Changes stay in this section's draft until you Save it.</span>}
              {onRemove && open !== undefined && isRowBlank?.(open, openIndex) ? (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    onRemove(openIndex);
                    closeAfterRemove();
                  }}
                >
                  {removeLabel}
                </Button>
              ) : onRemove ? (
                <Popconfirm
                    title={`${removeLabel}?`}
                    okButtonProps={{ danger: true }}
                    okText={removeLabel}
                    onConfirm={() => {
                      onRemove(openIndex);
                      closeAfterRemove();
                    }}
                  >
                    <Button danger icon={<DeleteOutlined />}>
                      {removeLabel}
                    </Button>
                </Popconfirm>
              ) : null}
            </div>
          ) : undefined
        }
      >
        {open && openIndex !== null && <div className="rt-sections">{drawer(open, openIndex)}</div>}
      </Drawer>
    </div>
  );
}

// Labelled field for a RecordList drawer, matching the register drawer.
export function RecordField({ label, wide, children }: { label: React.ReactNode; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={wide ? 'rt-span-2' : undefined}>
      <span className="rt-label">{label}</span>
      {children}
    </label>
  );
}
