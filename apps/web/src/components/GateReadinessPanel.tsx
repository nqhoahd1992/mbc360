import { Button, Tag, Tooltip, Typography } from 'antd';
import { Link } from 'react-router-dom';
import type { ReadinessTier } from '@mbc360/shared/config/gateReadiness';
import type { GateReadinessItem } from '@mbc360/shared/utils/gateProgress';
import { TEXT } from '../theme/tokens';

const UNCONFIRMED_SOURCE_NOTE = ' — added on our own reading; not yet confirmed by the review team';

// The SME's own verbatim definitions, on hover of the tier badge.
const READINESS_TIER_DEFINITIONS: Record<ReadinessTier, string> = {
  Mandatory: 'Must be complete before the gate can pass.',
  Conditional: 'Required only when the stated condition applies to this project.',
  Supporting: 'Good practice and useful context; does not by itself hold the gate.',
};

const READINESS_TIER_COLORS: Record<ReadinessTier, string> = {
  Mandatory: 'red',
  Conditional: 'orange',
  Supporting: 'default',
};

// "What's blocking Gate N", grouped by what the reader can DO about each item.
//
// It used to be one flat <ul> in config order: on Gate 10 that is 24 bullets
// where the seven that actually block are interleaved with fourteen green ticks
// and three "the system cannot check this" notes, and two of them carry a
// three-line caveat. Everything at one visual weight, ~600px tall, and the
// question people open it for — "what do I have to do next?" — needs the whole
// list read to answer.
//
// Now: a count line first, then three groups — blocking · to confirm ·
// satisfied — and the satisfied group collapsed behind its own count.
//
// On collapsing the satisfied items: the 2026-07-26 decision was that a
// satisfied item must render green rather than VANISH, because vanishing read
// as "this requirement was forgotten". A count that is always on screen with a
// one-click reveal keeps that property — the items are still accounted for and
// still reachable — while giving the outstanding work the space. What is not
// preserved is seeing all 24 at once without a click; that is the trade, and
// the appendix order still holds inside each group.
export default function GateReadinessPanel({
  gateNumber,
  items,
  projectId,
  currentPath,
  showSatisfied,
  onToggleSatisfied,
}: {
  gateNumber: string;
  items: GateReadinessItem[];
  projectId?: string;
  currentPath: string;
  showSatisfied: boolean;
  onToggleSatisfied: () => void;
}) {
  const blocking = items.filter((i) => !i.satisfied && i.hardBlock);
  const toConfirm = items.filter((i) => !i.satisfied && !i.hardBlock);
  const satisfied = items.filter((i) => i.satisfied);

  const renderItem = (item: GateReadinessItem) => {
    const color = item.satisfied ? '#389e0d' : item.pending || item.advisory ? '#d48806' : '#cf1322';
    const targetPath = item.link
      ? item.link.absolute
        ? item.link.href
        : `/projects/${projectId}${item.link.href}`
      : undefined;
    const targetHref = targetPath
      ? `${targetPath}${item.link?.scrollToId ? `?scrollTo=${item.link.scrollToId}` : ''}`
      : undefined;
    // A link to a section on the phase page already open here navigates +
    // scrolls in place; a link to a DIFFERENT page (a register, the BOM page…)
    // opens in a new browser tab, so the Gate Flow view being read is not
    // replaced. Landing there auto-expands its sidebar group (App.tsx derives
    // openKeys from the route).
    const isSamePage = targetPath === currentPath;
    return (
      <li key={item.id} style={{ color, breakInside: 'avoid', marginBottom: 2 }}>
        {item.satisfied && '✓ '}
        {targetHref ? (
          isSamePage ? (
            <Link to={targetHref} style={{ color }}>
              {item.label}
            </Link>
          ) : (
            <a href={`#${targetHref}`} target="_blank" rel="noopener noreferrer" style={{ color }}>
              {item.label}
            </a>
          )
        ) : (
          item.label
        )}
        {item.tier && (
          <Tooltip title={READINESS_TIER_DEFINITIONS[item.tier]}>
            <Tag color={READINESS_TIER_COLORS[item.tier]} style={{ marginLeft: 6, cursor: 'default' }}>
              {item.tier}
            </Tag>
          </Tooltip>
        )}
        {/* Written for whoever is working the gate, not for whoever maintains
            the config (2026-08-11): the information — "this will not block you,
            and the system cannot judge it for you" — is the same, but "wired to
            a data source" and "Conditional/Supporting tier" were our
            vocabulary, not theirs. The tier badge still carries the SME's own
            definition on hover. */}
        {item.pending
          ? ' — the system cannot check this one; confirm it yourself before passing the gate'
          : !item.satisfied && item.advisory
            ? ' — applies only in certain cases; it will not block this gate'
            : !item.satisfied && !item.hardBlock && ' — clears with Proceed with Conditions'}
        {item.source === 'dev-decision' && UNCONFIRMED_SOURCE_NOTE}
        {item.coverageNote && (
          // Capped measure: these run three lines at full page width, which is
          // where a caveat stops being read.
          <div style={{ color: TEXT.disabled, fontSize: 11, marginTop: 2, maxWidth: '80ch' }}>
            Partly checked: {item.coverageNote}
          </div>
        )}
      </li>
    );
  };

  // Two columns once there is room: 24 short bullets in a single column is
  // mostly empty page and twice the height.
  const listStyle = {
    margin: '2px 0 0',
    paddingLeft: 18,
    columnWidth: '520px',
    columnGap: '32px',
  } as const;

  const Group = ({
    title,
    tone,
    group,
  }: {
    title: string;
    tone: string;
    group: GateReadinessItem[];
  }) =>
    group.length === 0 ? null : (
      <div style={{ marginTop: 6 }}>
        <Typography.Text strong style={{ fontSize: 12, color: tone }}>
          {title} ({group.length})
        </Typography.Text>
        <ul style={listStyle}>{group.map(renderItem)}</ul>
      </div>
    );

  return (
    <div style={{ fontSize: 12 }}>
      <span style={{ fontWeight: 600, color: blocking.length > 0 ? '#cf1322' : '#389e0d' }}>
        {blocking.length > 0
          ? `Gate ${gateNumber} — ${blocking.length} of ${items.length} requirement(s) still blocking`
          : `Gate ${gateNumber} readiness — nothing blocking`}
      </span>

      <Group title="Blocking now" tone="#cf1322" group={blocking} />
      <Group title="Will not block, but confirm" tone="#d48806" group={toConfirm} />

      {satisfied.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <Button
            type="link"
            size="small"
            style={{ padding: 0, fontSize: 12, height: 'auto' }}
            onClick={onToggleSatisfied}
            aria-expanded={showSatisfied}
          >
            {showSatisfied ? 'Hide' : 'Show'} {satisfied.length} already satisfied
          </Button>
          {showSatisfied && <ul style={listStyle}>{satisfied.map(renderItem)}</ul>}
        </div>
      )}
    </div>
  );
}
