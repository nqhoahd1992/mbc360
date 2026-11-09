import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { App, Button } from 'antd';
import { DownOutlined, RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { generatedNaEntries, isGatePassed, type GeneratedNaEntry } from '@mbc360/shared/utils/gateProgress';
import { useAppStore } from '../store/useAppStore';
import { useSession } from '../auth/useSession';
import './GeneratedNaAcks.css';

// Where a critical item's generated "not applicable" is acknowledged: in the block that holds the data behind it
// (project owner, 2026-11-05), not in the readiness list beside the gate. A block asks for the entries that belong to
// it by `home` (see acknowledgementHome in the shared readiness code), and optionally narrows them to one gate — a
// requirement table shown on the Gate 8 tab must not offer the Gate 9 acknowledgement of the same table.
//
// Acknowledging is one click and asks for nothing: the wording is the system's, the actor is the signed-in person.
// There is no way to refuse; an item nobody has acknowledged stays blocked.
//
// Who acknowledges is the person holding the FUNCTION the review team names for the item (Round 5 question 1), one line
// per function: "Safety / Scientific Review — Unassigned" tells the Lead what to fix in Project team, and a function
// held by somebody else reads "Waiting for <name>". Only that person gets the button, never an administrator.
export default function GeneratedNaAcks({
  home,
  homePrefix,
  gateId,
  caption,
}: {
  /** Exactly this home — `requirement:infantTesting`, `register:pbCautionLimits`, … */
  home?: string;
  /** Every home starting with this, e.g. `gatecheck:` for the Key Gate Checks table. */
  homePrefix?: string;
  /** Only this gate's entries (a gate tab); omit on a page that spans gates. */
  gateId?: string;
  /** Names the part of the block the entry is about — the Key Gate Check row — when the block has several. */
  caption?: (entry: GeneratedNaEntry) => string | undefined;
}) {
  const { projectId } = useParams();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const acknowledge = useAppStore((s) => s.acknowledgeReadinessItem);
  const withdraw = useAppStore((s) => s.withdrawReadinessAcknowledgement);
  const { user } = useSession();
  const { modal } = App.useApp();
  const [acking, setAcking] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState<ReadonlySet<string>>(new Set());

  const entries = useMemo(() => {
    if (!project) return [];
    return generatedNaEntries(project).filter(
      (e) =>
        e.home !== undefined &&
        (home !== undefined ? e.home === home : homePrefix !== undefined && e.home.startsWith(homePrefix)) &&
        (gateId === undefined || e.gateId === gateId),
    );
  }, [project, home, homePrefix, gateId]);

  // One block for every item that waits on the SAME people for the SAME reason about the SAME data, earliest gate first
  // (project owner, 2026-11-06): the Pregnancy / Breastfeeding Caution list serves a Gate 4 item and two Gate 7 items, all
  // acknowledged by Safety for one reason, and three identical blocks made the person do one thing three times. The block says
  // which readiness items it settles, and acknowledging once records it for each of them.
  const groups = useMemo(() => {
    const reasonOf = (e: GeneratedNaEntry) => (e.rationale.startsWith(`${e.label} — `) ? e.rationale.slice(e.label.length + 3) : e.rationale);
    const out: { key: string; reason: string; entries: GeneratedNaEntry[] }[] = [];
    const sorted = [...entries].sort((x, y) => Number(x.gateId.replace('SG', '')) - Number(y.gateId.replace('SG', '')));
    for (const e of sorted) {
      const key = [e.home, e.slots.map((sl) => sl.functionKeys.join('+')).join('|'), reasonOf(e)].join('::');
      const existing = out.find((g) => g.key === key);
      if (existing) existing.entries.push(e);
      else out.push({ key, reason: reasonOf(e), entries: [e] });
    }
    return out;
  }, [entries]);

  if (!project || !projectId || entries.length === 0) return null;

  const record = async (entry: GeneratedNaEntry, functionKey: string, confirmClear: boolean) => {
    await acknowledge(projectId, entry.gateId, entry.itemId, functionKey, confirmClear);
  };

  // Acknowledge as one function, for every item of the block that function has not yet acknowledged. One click, one request per
  // item (each is its own readiness item with its own record), in gate order.
  const acknowledgeGroup = async (group: (typeof groups)[number], slotIndex: number, functionKey: string, confirmClear: boolean) => {
    setAcking(`${group.key}|${functionKey}`);
    try {
      for (const entry of group.entries) {
        if (entry.slots[slotIndex]?.state === 'acknowledged') continue;
        await record(entry, functionKey, confirmClear);
      }
    } finally {
      setAcking(null);
    }
  };

  // Acknowledging "not applicable" on a table that exists only for the trigger clears what was entered in it. The person is
  // told exactly what goes before it does, and the values stay in the audit trail (SW-56).
  const acknowledgeEntry = (group: (typeof groups)[number], slotIndex: number, functionKey: string) => {
    const section = group.entries.find((e) => e.dedicatedSection && e.dedicatedSection.rowsWithData > 0)?.dedicatedSection;
    if (!section) {
      void acknowledgeGroup(group, slotIndex, functionKey, false);
      return;
    }
    modal.confirm({
      title: 'Clear the data and acknowledge?',
      content: `"${section.title}" has data in ${section.rowsWithData} row${section.rowsWithData === 1 ? '' : 's'}. Acknowledging that it does not apply clears it. The values stay in the audit trail.`,
      okText: 'Clear and acknowledge',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: () => acknowledgeGroup(group, slotIndex, functionKey, true),
    });
  };

  // Take back what this slot acknowledged, on every item of the block whose gate has not passed (a passed gate is read-only).
  const withdrawGroup = async (group: (typeof groups)[number], slotIndex: number) => {
    setAcking(`${group.key}|withdraw|${slotIndex}`);
    try {
      for (const entry of group.entries) {
        const ack = entry.slots[slotIndex]?.ack;
        if (!ack || isGatePassed(project, entry.gateId)) continue;
        await withdraw(projectId, entry.gateId, entry.itemId, ack.functionKey);
      }
    } finally {
      setAcking(null);
    }
  };
  const confirmWithdraw = (group: (typeof groups)[number], slotIndex: number) => {
    const clears = group.entries.some((e) => e.dedicatedSection);
    modal.confirm({
      title: 'Withdraw this acknowledgement?',
      content: `The ${group.entries.length > 1 ? 'items go' : 'item goes'} back to waiting for an acknowledgement and block their gate again.${
        clears ? ' What was cleared when it was acknowledged is not restored; its earlier values stay in the audit trail.' : ''
      } The withdrawal is recorded in the history.`,
      okText: 'Withdraw',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: () => withdrawGroup(group, slotIndex),
    });
  };

  const gateNumberOf = (gate: string) => Number(gate.replace('SG', ''));

  return (
    <div className="gna" role="group" aria-label="Not applicable for this project — needs acknowledgement">
      {groups.map((group) => {
        const key = group.key;
        const first = group.entries[0];
        const me = user?.displayName?.trim();
        const done = group.entries.every((e) => e.state === 'acknowledged');
        const many = group.entries.length > 1;
        const gates = [...new Set(group.entries.map((e) => gateNumberOf(e.gateId)))];
        const history = (project.readinessAckLog ?? []).filter((ev) => group.entries.some((e) => e.gateId === ev.gateId && e.itemId === ev.itemId));
        const section = group.entries.find((e) => e.dedicatedSection)?.dedicatedSection;
        const rowsWithData = Math.max(0, ...group.entries.map((e) => e.dedicatedSection?.rowsWithData ?? 0));
        // How far along it is, said at the top: an item that needs several functions reads "1 of 2", not a row of identical buttons.
        const slotsDone = first.slots.filter((_, i) => group.entries.every((e) => e.slots[i]?.state === 'acknowledged')).length;
        const stateText = done
          ? 'Acknowledged'
          : first.slots.length > 1
            ? `${slotsDone} of ${first.slots.length} acknowledged`
            : 'Waiting for acknowledgement';
        return (
          <div key={key} className={`gna-item ${done ? 'gna-done' : 'gna-wait'}`}>
            <div className="gna-head">
              <div className="gna-title">
                {/* The same kicker an assessment wears, with a different word: a quick look says which of the two this is. The gate is
                    named only where the view spans gates. */}
                <span className="gna-kicker">Acknowledgement{gateId === undefined ? ` · Gate ${gates[0]}` : ''}</span>
                <strong>{many ? `One acknowledgement for ${group.entries.length} readiness items` : first.label}</strong>
              </div>
              <span className={`c-tag c-tag-dot ${done ? 'c-tag-ok' : 'c-tag-warn'}`}>{stateText}</span>
            </div>
            {!many && caption?.(first) && <p className="gna-sub">{caption(first)}</p>}
            <p className="gna-reason">Not applicable: {group.reason}</p>
            {many && (
              <div className="gna-covers">
                <p className="gna-reason">
                  {gates.length > 1
                    ? `Do it once, at Gate ${gates[0]}. It settles each of these, so you are not asked again at ${gates
                        .slice(1)
                        .map((g) => `Gate ${g}`)
                        .join(' or ')}:`
                    : 'It settles these together:'}
                </p>
                <ul>
                  {group.entries.map((e) => (
                    <li key={`${e.gateId}|${e.itemId}`}>
                      <span className="c-tag">Gate {gateNumberOf(e.gateId)}</span>
                      {e.label}
                      {caption?.(e) && <span className="gna-extra"> · {caption(e)}</span>}
                      {e.state === 'acknowledged' && <span className="gna-status"> · done</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {section && (
              <p className="gna-reason gna-lock">
                The table below is read-only while this does not apply.
                {rowsWithData > 0 && ` It still has data in ${rowsWithData} row${rowsWithData === 1 ? '' : 's'}; acknowledging clears it.`}
              </p>
            )}
            <ul className="gna-slots">
              {first.slots.map((slot, slotIndex) => {
                const slotKey = slot.functionKeys.join('+');
                const slotStates = group.entries.map((e) => e.slots[slotIndex]);
                const slotDone = slotStates.every((x) => x?.state === 'acknowledged');
                const slotStale = !slotDone && slotStates.some((x) => x?.state === 'stale');
                const staleFacts = slotStale && slotStates.some((x) => x?.staleBecause === 'facts');
                const reworded = slotDone && slotStates.some((x) => x?.reworded);
                const staleBy = slotStates.find((x) => x?.state === 'stale')?.ack?.acknowledgedByName;
                const myFunction = me ? slot.holders.find((h) => h.name === me)?.functionKey : undefined;
                const doneAck = slotStates[0]?.ack;
                // The person who gave it, or whoever holds the function now, may take it back while a gate of the block is still open.
                const canWithdraw =
                  !!me &&
                  group.entries.some((e) => !!e.slots[slotIndex]?.ack && !isGatePassed(project, e.gateId)) &&
                  (slotStates.some((x) => !!x?.ack && x.ack.acknowledgedByUserId === user?.id) || !!myFunction);
                return (
                  <li key={slotKey} className="gna-slot">
                    <strong className="gna-fn">{slot.label}</strong>
                    {slotDone ? (
                      <span className="gna-status">
                        acknowledged by {doneAck?.acknowledgedByName}
                        {doneAck ? ` · ${dayjs(doneAck.acknowledgedAt).format('YYYY-MM-DD HH:mm')}` : ''}
                        {reworded && ' · the wording of the reason was corrected since (editorial only, so it still stands)'}
                        {canWithdraw && (
                          <Button
                            type="link"
                            size="small"
                            danger
                            disabled={false}
                            loading={acking === `${key}|withdraw|${slotIndex}`}
                            onClick={() => confirmWithdraw(group, slotIndex)}
                          >
                            Withdraw
                          </Button>
                        )}
                      </span>
                    ) : slot.holders.length === 0 ? (
                      <span className="gna-status">
                        Unassigned — nobody holds {slot.functionKeys.length > 1 ? 'either function' : 'this function'} on this project, so nobody can
                        acknowledge this yet. The project’s Lead assigns it in Project team.
                      </span>
                    ) : myFunction ? (
                      <Button
                        size="small"
                        className="gna-act"
                        aria-label={`Acknowledge as ${slot.label}`}
                        loading={acking === `${key}|${myFunction}`}
                        onClick={() => acknowledgeEntry(group, slotIndex, myFunction)}
                      >
                        Acknowledge{many ? ` (${group.entries.length} items)` : ''}
                      </Button>
                    ) : (
                      <span className="gna-status">
                        {slotStale
                          ? staleFacts
                            ? `${staleBy}'s earlier acknowledgement no longer stands: the target users, markets or major formula version changed since. Reassess it against the new facts. `
                            : `${staleBy}'s earlier acknowledgement no longer matches this reason. `
                          : ''}
                        Waiting for {slot.holders.map((h) => h.name).join(' or ')}.
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="gna-foot">
              {history.length > 1 && (
                <Button
                  type="link"
                  size="small"
                  className="gna-toggle"
                  disabled={false}
                  icon={historyOpen.has(key) ? <DownOutlined /> : <RightOutlined />}
                  aria-expanded={historyOpen.has(key)}
                  onClick={() =>
                    setHistoryOpen((prev) => {
                      const next = new Set(prev);
                      if (!next.delete(key)) next.add(key);
                      return next;
                    })
                  }
                >
                  History ({history.length})
                </Button>
              )}
            </div>
            {historyOpen.has(key) && (
              <ul className="gna-history">
                {history.map((e) => (
                  <li key={e.id}>
                    {dayjs(e.date).format('YYYY-MM-DD HH:mm')} · {e.by} — {e.kind === 'withdrawn' ? 'withdrew the acknowledgement' : 'acknowledged'}
                    {many ? ` (Gate ${gateNumberOf(e.gateId)})` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
