import { useState } from 'react';
import dayjs from 'dayjs';
import { Button, Tooltip } from 'antd';
import { CheckCircleFilled, CloseCircleFilled, DownOutlined, ExclamationCircleFilled, ExportOutlined, RightOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { ReadinessTier } from '@mbc360/shared/config/gateReadiness';
import type { GateReadinessItem, GateReadinessPart } from '@mbc360/shared/utils/gateProgress';
import GateReadinessListModal from './GateReadinessListModal';
import ClampedText from './ClampedText';
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
  signatureItemId,
  keepGate,
}: {
  gateNumber: string;
  /** Gate tab to stay on when a link points at a section of the page already open (a link carrying no `gate` falls back to the CURRENT gate, which is the wrong tab once this gate has passed). */
  keepGate?: string;
  items: GateReadinessItem[];
  projectId?: string;
  currentPath: string;
  showSatisfied: boolean;
  onToggleSatisfied: () => void;
  // The Phase page rail prints its own "N blocking the decision" heading.
  hideSummary?: boolean;
  // Id of the item that only signing can satisfy; listed under "Signatures", not "Before sign-off".
  signatureItemId?: string;
}) {
  // The item whose list (e.g. the registers still to close) is open in the modal.
  const [listFor, setListFor] = useState<GateReadinessItem | null>(null);
  // Items whose condition list is open. Collapsed by default: the list is the
  // detail behind one line, not something every reader needs on first look.
  const [openParts, setOpenParts] = useState<ReadonlySet<string>>(new Set());
  const toggleParts = (id: string) =>
    setOpenParts((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const blocking = items.filter((i) => !i.satisfied && i.hardBlock);
  // The sign-off item is only satisfied BY signing, so when the caller names it, it is listed apart from what has
  // to be done before signing and is not part of that count.
  const signatures = blocking.filter((i) => i.id === signatureItemId);
  const beforeSignOff = signatureItemId ? blocking.filter((i) => i.id !== signatureItemId) : blocking;
  const toConfirm = items.filter((i) => !i.satisfied && !i.hardBlock);
  const satisfied = items.filter((i) => i.satisfied);

  // Same linking rule as an item: in place on the open page, a new tab elsewhere.
  const renderPartLabel = (part: GateReadinessPart) => {
    if (!part.link) return <span>{part.label}</span>;
    const path = part.link.absolute ? part.link.href : `/projects/${projectId}${part.link.href}`;
    const href = `${path}${part.link.scrollToId ? `?scrollTo=${part.link.scrollToId}${keepGate && path === currentPath ? `&gate=${keepGate}` : ''}` : ''}`;
    return path === currentPath ? (
      <Link to={href} className="grp-link">
        {part.label}
      </Link>
    ) : (
      <a href={`#${href}`} target="_blank" rel="noopener noreferrer" className="grp-link">
        {part.label}
        <ExportOutlined className="grp-ext" aria-label="opens in a new tab" />
      </a>
    );
  };

  // A critical item whose "not applicable" the system generated. It is acknowledged in the block that holds the data
  // behind it, not here (project owner, 2026-11-05): this list only says where things stand, and clicking the item
  // goes to that block. There is no way to refuse; an item nobody has acknowledged stays blocked.
  const renderAcknowledgement = (item: GateReadinessItem) => {
    const ack = item.acknowledgement;
    if (!ack) return null;
    if (ack.state === 'acknowledged') {
      return (
        <div className="grp-note">
          Acknowledged by {ack.by}
          {ack.at ? ` · ${dayjs(ack.at).format('YYYY-MM-DD HH:mm')}` : ''}
        </div>
      );
    }
    const waiting = ack.slots.filter((x) => x.state !== 'acknowledged');
    const unassigned = waiting.filter((x) => x.holders.length === 0);
    return (
      <div className="grp-note">
        {ack.state === 'stale' ? 'An earlier acknowledgement no longer matches the reason. ' : ''}
        {waiting
          .map((x) => (x.holders.length === 0 ? `${x.label}: Unassigned` : `${x.label}: waiting for ${x.holders.map((h) => h.name).join(' or ')}`))
          .join(' · ')}
        {unassigned.length > 0
          ? ' — the project’s Lead assigns a function in Project team.'
          : ' — open this item to acknowledge it where the data is.'}
      </div>
    );
  };

  const renderItem = (item: GateReadinessItem) => {
    const state = item.satisfied ? 'met' : item.hardBlock ? 'blocking' : 'confirm';
    const icon =
      state === 'met' ? <CheckCircleFilled /> : state === 'blocking' ? <CloseCircleFilled /> : <ExclamationCircleFilled />;
    const targetPath = item.link ? (item.link.absolute ? item.link.href : `/projects/${projectId}${item.link.href}`) : undefined;
    const targetHref = targetPath
      ? `${targetPath}${item.link?.scrollToId ? `?scrollTo=${item.link.scrollToId}${keepGate && targetPath === currentPath ? `&gate=${keepGate}` : ''}` : ''}`
      : undefined;
    // A link to a section on the page already open here navigates + scrolls in
    // place; a link to a DIFFERENT page (a register, the BOM page…) opens in a
    // new browser tab, so the gate view being read is not replaced.
    const isSamePage = targetPath === currentPath;
    const baseLabel = targetHref ? (
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
    // An item that is really a list (the registers still to close): the line opens that list, so the person can go
    // straight to the register that is open rather than read a truncated run of names.
    const tierBadge =
      item.tier && item.tier !== 'Mandatory' ? (
        <Tooltip title={READINESS_TIER_DEFINITIONS[item.tier]}>
          <span className="c-tag grp-tier">{item.tier}</span>
        </Tooltip>
      ) : null;
    const criticalBadge = item.critical ? (
      <Tooltip title="Critical: if the system writes a “not applicable” reason for this item, the responsible reviewer has to acknowledge it before the gate can close. It says nothing about the project's risk.">
        <span className="c-tag grp-critical">Critical</span>
      </Tooltip>
    ) : null;
    const open = item.list ? item.list.rows.filter((r) => !r.done).length : 0;
    const label = item.list ? (
      <button type="button" className="grp-link grp-listbtn" onClick={() => setListFor(item)}>
        {item.label}
        <span className="grp-listbtn-hint">{open > 0 ? `View the ${open} still open` : 'View the list'}</span>
      </button>
    ) : (
      baseLabel
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
            {tierBadge}
            {criticalBadge}
            {item.scope === 'project' && (
              <Tooltip title="This item is about the whole project, not one market, so it applies to every market's lane.">
                <span className="c-tag grp-tier">All markets</span>
              </Tooltip>
            )}
          </div>
          {item.parts && !item.satisfied && (
            <>
              <Button
                type="link"
                size="small"
                disabled={false}
                className="grp-toggle grp-parts-toggle"
                icon={openParts.has(item.id) ? <DownOutlined /> : <RightOutlined />}
                onClick={() => toggleParts(item.id)}
                aria-expanded={openParts.has(item.id)}
              >
                {item.parts.filter((p) => p.satisfied).length}/{item.parts.length} steps done
              </Button>
              {openParts.has(item.id) && (
                <ul className="grp-parts">
                  {item.parts.map((part) => (
                    <li key={part.label} className={part.satisfied ? 'grp-part-met' : 'grp-part-open'}>
                      <span className="grp-part-icon">{part.satisfied ? <CheckCircleFilled /> : <CloseCircleFilled />}</span>
                      <span>
                        {renderPartLabel(part)}
                        {part.emptyNote && <span className="grp-part-empty">{part.emptyNote}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {note && <div className="grp-note">{note}</div>}
          {renderAcknowledgement(item)}
          {item.source === 'dev-decision' && <div className="grp-note">{UNCONFIRMED_SOURCE_NOTE}</div>}
          {/* The long explanation is what gets cut at three lines and opened on click — never the item's title. */}
          {item.coverageNote && (
            <div className="grp-note">
              <ClampedText>Partly checked: {item.coverageNote}</ClampedText>
            </div>
          )}
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
      <GateReadinessListModal item={listFor} projectId={projectId} onClose={() => setListFor(null)} />
      {!hideSummary && (
        <div className={`grp-summary${blocking.length ? ' grp-summary-bad' : ''}`}>
          {blocking.length > 0
            ? `Gate ${gateNumber} — ${blocking.length} of ${items.length} requirement(s) still blocking`
            : `Gate ${gateNumber} readiness — nothing blocking`}
        </div>
      )}
      {group(signatureItemId ? 'Before sign-off' : 'Blocking now', beforeSignOff)}
      {group('Signatures', signatures)}
      {group('Will not block, but confirm', toConfirm)}
      {satisfied.length > 0 && (
        <div className="grp-group">
          <Button type="link" size="small" disabled={false} className="grp-toggle" onClick={onToggleSatisfied} aria-expanded={showSatisfied}>
            {showSatisfied ? 'Hide' : 'Show'} {satisfied.length} already met
          </Button>
          {showSatisfied && <ul className="grp-list">{satisfied.map(renderItem)}</ul>}
        </div>
      )}
    </div>
  );
}
