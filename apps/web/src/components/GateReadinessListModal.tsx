import { useMemo, useState } from 'react';
import { Button, Empty, Input, Modal, Segmented } from 'antd';
import { ExportOutlined, SearchOutlined } from '@ant-design/icons';
import { findNavGroupForRegister } from '@mbc360/shared/config/registers';
import type { GateReadinessItem } from '@mbc360/shared/utils/gateProgress';
import '../styles/concept.css';
import './GateReadinessListModal.css';

// The list behind a readiness item that is really a LIST of things to open one by one (today: every register that
// must be closed before a gate can pass — dozens of them). It replaces a truncated run of names in the item's text:
// the person sees what is still open first, can search by name, and goes straight to the register from here.
// A register is a different page from the gate being read, so it opens in a new tab (the same rule as a readiness
// link to another page) and the gate view stays where it is.
type View = 'open' | 'all' | 'closed';

export default function GateReadinessListModal({
  item,
  projectId,
  onClose,
}: {
  item: GateReadinessItem | null;
  projectId?: string;
  onClose: () => void;
}) {
  const [view, setView] = useState<View>('open');
  const [query, setQuery] = useState('');
  const rows = useMemo(() => item?.list?.rows ?? [], [item]);
  const open = rows.filter((r) => !r.done).length;
  const closed = rows.length - open;

  const q = query.trim().toLowerCase();
  const shown = rows.filter(
    (r) => (view === 'all' || (view === 'open' ? !r.done : r.done)) && (q === '' || r.title.toLowerCase().includes(q)),
  );

  return (
    <Modal
      open={!!item}
      onCancel={onClose}
      footer={<Button onClick={onClose}>Close</Button>}
      width={640}
      title={item?.list?.title}
      destroyOnHidden
      className="grl-modal"
      afterClose={() => {
        setQuery('');
        setView('open');
      }}
    >
      <div className="concept-tokens grl">
        <p className="grl-hint">Each register is closed by its Review owner and Co-sign. Every one has to be closed before this gate can pass.</p>
        <div className="grl-tools">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search registers"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Segmented
            value={view}
            onChange={(v) => setView(v as View)}
            options={[
              { value: 'open', label: `Not closed (${open})` },
              { value: 'all', label: `All (${rows.length})` },
              { value: 'closed', label: `Closed (${closed})` },
            ]}
          />
        </div>
        {shown.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={q ? 'No register matches that search.' : view === 'open' ? 'Every register is closed.' : 'Nothing here.'}
          />
        ) : (
          <ul className="grl-list">
            {shown.map((r) => {
              const group = findNavGroupForRegister(r.key)?.title;
              return (
                <li key={r.key} className="grl-row">
                  <div className="grl-main">
                    <div className="grl-title">{r.title}</div>
                    {group && <div className="grl-group">{group}</div>}
                  </div>
                  <span className={`c-tag c-tag-dot ${r.done ? 'c-tag-ok' : 'c-tag-warn'}`}>{r.done ? 'Closed' : 'Not closed'}</span>
                  <a
                    className="grl-open"
                    href={`#/projects/${projectId}${r.href}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${r.title} in a new tab`}
                  >
                    Open <ExportOutlined />
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}
