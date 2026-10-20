import { useState, type ReactNode } from 'react';
import { Modal } from 'antd';
import { BookOutlined } from '@ant-design/icons';
import { useAppStore } from '../store/useAppStore';
import EvidenceRulesContent from './EvidenceRulesContent';
import './EvidenceRulesLink.css';

// The corporate evidence-grading / transferability / literature-search rulebook ("6. Evidence & Search Rules") applies to Sheets 1-5.
// It has no entry in the sidebar menu (NavItem.hidden): every page that mentions it opens it here, as a popup, so reading the rules
// never takes the person off the sheet they are filling in.
export default function EvidenceRulesLink({
  projectId,
  className,
  children,
}: {
  projectId: string;
  className?: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  return (
    <>
      <button type="button" className={className ?? 'erl'} onClick={() => setOpen(true)} disabled={!project}>
        {children ?? (
          <>
            <BookOutlined /> Evidence grading &amp; search rules
          </>
        )}
      </button>
      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width="min(1040px, calc(100vw - 32px))"
        centered
        destroyOnHidden
        title="Evidence Hierarchy & Search Rules"
        // The sheet is long: the popup keeps its title in view and scrolls the tables inside it, instead of growing past the screen.
        styles={{ body: { maxHeight: 'calc(100vh - 160px)', overflowY: 'auto', paddingRight: 8 } }}
      >
        <p style={{ margin: '0 0 20px', color: 'var(--c-text-2)' }}>
          No need or claim may progress to formula or label without an assigned evidence Grade, a passed transferability check (or
          explicit inference flag), and a complete, dated, linked search record.
        </p>
        {project && <EvidenceRulesContent project={project} />}
      </Modal>
    </>
  );
}
