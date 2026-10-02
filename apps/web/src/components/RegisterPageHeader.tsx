import { InfoCircleOutlined, LockOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { NavGroup, RegisterConfig } from '@mbc360/shared/config/registers';
import type { ProjectData } from '@mbc360/shared/types';
import { composeReviewOwner } from '@mbc360/shared/config/reviewers';
import '../styles/concept.css';
import './RegisterPageHeader.css';

// Header of every single-register page (2026-10-02 concept): breadcrumb to the
// responsibility group, title with gate + Open/Read-only tags, one meta line
// (project · product · review owner) and the register's description — then the
// lock banner when the register is read-only. Replaces the Project
// Identification card and the separate Review owner card these pages used to
// stack above the table.
export default function RegisterPageHeader({
  project,
  config,
  parent,
  readOnly,
  readOnlyReason,
}: {
  project: ProjectData;
  config: RegisterConfig;
  parent?: NavGroup;
  readOnly: boolean;
  readOnlyReason?: string;
}) {
  const reviewOwnerText = config.reviewOwner ? composeReviewOwner(config.reviewOwner, project.identity.reviewers) : '';
  return (
    <>
      <div className="rph">
        {parent && (
          <Link className="c-link rph-crumb" to={`/projects/${project.identity.id}/registers/cat/${parent.key}`}>
            {parent.title}
          </Link>
        )}
        <div className="rph-title-row">
          <h1 className="rph-title">{config.title}</h1>
          {config.gate && <span className="c-tag">Gate {config.gate}</span>}
          {readOnly ? (
            <span className="c-tag c-tag-ok">
              <LockOutlined />
              Read-only
            </span>
          ) : (
            <span className="c-tag">Open</span>
          )}
        </div>
        <p className="rph-meta">
          {project.identity.id} · {project.identity.productSku}
          {reviewOwnerText && (
            <>
              {' '}· Review owner <b>{reviewOwnerText}</b>
            </>
          )}
        </p>
        {config.description && <p className="rph-desc">{config.description}</p>}
      </div>
      {readOnly && (
        <div className="c-card rph-lock">
          <LockOutlined />
          <div>
            <div className="rph-lock-title">Read-only</div>
            <div className="rph-lock-text">
              {readOnlyReason ?? 'The gate this register belongs to has passed. Correcting an entry needs a Backtrack on the Phase Gate Flow.'}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Completion card for a register that has a `status` column — the same
// Completed/Complete count the group overview already shows per register.
export function RegisterProgressCard({ completed, total }: { completed: number; total: number }) {
  const pct = total ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="c-card rph-progress">
      <div className="rph-label">Completed</div>
      <div className="rph-big">
        <b>{completed}</b>
        <span>of {total} rows</span>
      </div>
      <div className="rph-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={completed === total ? 'rph-bar-done' : undefined} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Header of a page that stacks several registers (Formulation Safety, the NPD
// Front-End Roadmap pages, Evidence & Search Rules): the same title + meta line
// as a single-register page, plus the page's one-line note on what it gates.
// Replaces the blue Alert + Project Identification card those pages stacked
// above their first table; the shared review owner moves here from every
// table's own caption.
export function CompositePageHeader({
  project,
  title,
  description,
  note,
  reviewOwnerText,
}: {
  project: ProjectData;
  title: string;
  description: React.ReactNode;
  note?: { title: string; text: React.ReactNode };
  reviewOwnerText?: string;
}) {
  return (
    <>
      <div className="rph">
        <div className="rph-title-row">
          <h1 className="rph-title">{title}</h1>
        </div>
        <p className="rph-meta">
          {project.identity.id} · {project.identity.productSku}
          {reviewOwnerText && (
            <>
              {' '}· Review owner <b>{reviewOwnerText}</b>
            </>
          )}
        </p>
        <p className="rph-desc">{description}</p>
      </div>
      {note && (
        <div className="c-card rph-note">
          <InfoCircleOutlined />
          <div>
            <div className="rph-lock-title">{note.title}</div>
            <div className="rph-lock-text">{note.text}</div>
          </div>
        </div>
      )}
    </>
  );
}
