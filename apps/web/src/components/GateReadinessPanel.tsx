import { Button, Tooltip } from 'antd';
import { CheckCircleFilled, CloseCircleFilled, ExclamationCircleFilled, ExportOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { ReadinessTier } from '@mbc360/shared/config/gateReadiness';
import type { GateReadinessItem } from '@mbc360/shared/utils/gateProgress';
import '../styles/concept.css';
import './GateReadinessPanel.css';

const UNCONFIRMED_SOURCE_NOTE = 'Added on our own reading; not yet confirmed by the review team.';

// The SME's own verbatim definitions, on hover of the tier badge.
const READINESS_TIER_DEFINITIONS: Record<ReadinessTier, string> = {
  Mandatory: 'Must be complete before the gate can pass.',
  Conditional: 'Required only when the stated condition applies to this project.',
  Supporting: 'Good practice and useful context; does not by itself hold the gate.',
};

// "What's blocking Gate N", grouped by what the reader can DO about each item:
// a count line, then blocking · to confirm · satisfied, the satisfied group
// collapsed behind its own count (a satisfied item stays reachable rather than
// vanishing — vanishing read as "this requirement was forgotten").
//
// 2026-10-02 (user-reported "text and badge colours blur together"): every
// blocking item used to be red text beside a red "Mandatory" badge. Now the
// text is the ordinary text colour and only the leading icon carries the state
// (red ✕ blocking · amber ! confirm · green ✓ met). The Mandatory badge is gone
// — everything that blocks is mandatory by definition, so it said nothing —
// and Conditional / Supporting keep a neutral badge, since those are the tiers
// that need explaining.
export default function GateReadinessPanel({
  gateNumber,
  items,
  projectId,
  currentPath,
  showSatisfied,
  onToggleSatisfied,
  hideSummary,
}: {
  gateNumber: string;
  items: GateReadinessItem[];
  projectId?: string;
  currentPath: string;
  showSatisfied: boolean;
  onToggleSatisfied: () => void;
  // The Phase page rail prints its own "N blocking the decision" heading.
  hideSummary?: boolean;
}) {
  const blocking = items.filter((i) => !i.satisfied && i.hardBlock);
  const toConfirm = items.filter((i) => !i.satisfied && !i.hardBlock);
  const satisfied = items.filter((i) => i.satisfied);

  const renderItem = (item: GateReadinessItem) => {
    const state = item.satisfied ? 'met' : item.hardBlock ? 'blocking' : 'confirm';
    const icon =
      state === 'met' ? <CheckCircleFilled /> : state === 'blocking' ? <CloseCircleFilled /> : <ExclamationCircleFilled />;
    const targetPath = item.link ? (item.link.absolute ? item.link.href : `/projects/${projectId}${item.link.href}`) : undefined;
    const targetHref = targetPath ? `${targetPath}${item.link?.scrollToId ? `?scrollTo=${item.link.scrollToId}` : ''}` : undefined;
    // A link to a section on the page already open here navigates + scrolls in
    // place; a link to a DIFFERENT page (a register, the BOM page…) opens in a
    // new browser tab, so the gate view being read is not replaced.
    const isSamePage = targetPath === currentPath;
    const label = targetHref ? (
      isSamePage ? (
        <Link to={targetHref} className="grp-link">
          {item.label}
        </Link>
      ) : (
        <a href={`#${targetHref}`} target="_blank" rel="noopener noreferrer" className="grp-link">
          {item.label}
          <ExportOutlined className="grp-ext" aria-label="opens in a new tab" />
        </a>
      )
    ) : (
      <span>{item.label}</span>
    );
    // Written for whoever is working the gate, not for whoever maintains config.
    const note = item.pending
      ? 'The system cannot check this one — confirm it yourself before passing the gate.'
      : !item.satisfied && item.advisory
        ? 'Applies only in certain cases; it will not block this gate.'
        : !item.satisfied && !item.hardBlock
          ? 'Clears with Proceed with Conditions.'
          : undefined;
    return (
      <li key={item.id} className={`grp-item grp-${state}`}>
        <span className="grp-icon">{icon}</span>
        <div className="grp-body">
          <div className="grp-label">
            {label}
            {item.tier && item.tier !== 'Mandatory' && (
              <Tooltip title={READINESS_TIER_DEFINITIONS[item.tier]}>
                <span className="c-tag grp-tier">{item.tier}</span>
              </Tooltip>
            )}
          </div>
          {note && <div className="grp-note">{note}</div>}
          {item.source === 'dev-decision' && <div className="grp-note">{UNCONFIRMED_SOURCE_NOTE}</div>}
          {item.coverageNote && <div className="grp-note">Partly checked: {item.coverageNote}</div>}
        </div>
      </li>
    );
  };

  const group = (title: string, list: GateReadinessItem[]) =>
    list.length === 0 ? null : (
      <div className="grp-group">
        <div className="grp-group-title">
          {title} <span>{list.length}</span>
        </div>
        <ul className="grp-list">{list.map(renderItem)}</ul>
      </div>
    );

  return (
    <div className="concept-tokens grp">
      {!hideSummary && (
        <div className={`grp-summary${blocking.length ? ' grp-summary-bad' : ''}`}>
          {blocking.length > 0
            ? `Gate ${gateNumber} — ${blocking.length} of ${items.length} requirement(s) still blocking`
            : `Gate ${gateNumber} readiness — nothing blocking`}
        </div>
      )}
      {group('Blocking now', blocking)}
      {group('Will not block, but confirm', toConfirm)}
      {satisfied.length > 0 && (
        <div className="grp-group">
          <Button type="link" size="small" className="grp-toggle" onClick={onToggleSatisfied} aria-expanded={showSatisfied}>
            {showSatisfied ? 'Hide' : 'Show'} {satisfied.length} already met
          </Button>
          {showSatisfied && <ul className="grp-list">{satisfied.map(renderItem)}</ul>}
        </div>
      )}
    </div>
  );
}
