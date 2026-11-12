import { useState, type ReactNode } from 'react';
import { Tabs } from 'antd';
import './DrawerTabs.css';

// One concern per tab inside a detail drawer. A drawer used to stack every section of a record into one long scroll — read-only
// reference, editable fields, an act that is not a field at all, the history — so what is editable was lost among what is not,
// and the page had to be scrolled to find it. Here each kind of content has its own tab; the fields stay a draft saved with the
// drawer's one Save, exactly as before. Put whatever should stay in view (status, approvals) ABOVE the tabs.
//
// `dot` marks a tab that still needs someone — an unassessed impact, a missing field — without opening it.
export interface DrawerTab {
  key: string;
  label: ReactNode;
  children: ReactNode;
  dot?: boolean;
}

export default function DrawerTabs({
  tabs,
  activeKey,
  onChange,
}: {
  tabs: DrawerTab[];
  // Controlled when given (a page can keep the tab while the drawer moves to the next record); otherwise the component keeps its own.
  activeKey?: string;
  onChange?: (key: string) => void;
}) {
  const [own, setOwn] = useState(tabs[0]?.key);
  const current = activeKey ?? own;
  const active = tabs.some((t) => t.key === current) ? current : tabs[0]?.key;
  return (
    <Tabs
      className="dt-tabs"
      activeKey={active}
      onChange={(k) => {
        setOwn(k);
        onChange?.(k);
      }}
      items={tabs.map((t) => ({
        key: t.key,
        label: t.dot ? (
          <span>
            {t.label} <span className="dt-dot" aria-label="needs attention" />
          </span>
        ) : (
          t.label
        ),
        // Each tab is its own spacing container. The drawers this replaced got their gap between sections from a wrapper
        // (a grid with a gap) that now sits outside the tabs, so the blocks inside a tab would otherwise touch.
        children: (
          <div className="dt-pane" style={{ display: 'grid', rowGap: 28 }}>
            {t.children}
          </div>
        ),
      }))}
    />
  );
}
