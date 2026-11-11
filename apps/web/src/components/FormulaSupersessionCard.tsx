import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Alert, App, Button, Card, Checkbox, DatePicker, Input, Space, Table, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import type { ProjectData, SupersessionDecision } from '@mbc360/shared/types';
import {
  SUPERSESSION_COORDINATOR,
  SUPERSESSION_FACTS,
  allFactsConfirmed,
  formulaVersionState,
  functionLabel,
  functionsLabel,
  isLegacyConfirmed,
  marketVersionState,
  supersessionFactConfirmation,
  supersessionFactFilled,
  supersessionGaps,
  versionMarkets,
  versionsOwingSupersession,
} from '@mbc360/shared/utils/formulaLifecycle';
import { holdsRole } from '@mbc360/shared/utils/readinessAck';
import { SUPERSESSION_FINAL_CAPABILITY } from '@mbc360/shared/utils/formulaLifecycle';
import { EMPTY_GRANTS, hasCapability } from '../utils/permissions';
import { useAppStore } from '../store/useAppStore';
import { useSession } from '../auth/useSession';
import { listMessage } from '@mbc360/shared/utils/messageList';
import { usePermissionView } from '../auth/previewMode';
import { TEXT } from '../theme/tokens';

// Round 4 question 2 — the per-market supersession decision (2026-08-30), reshaped by Round 5 question 5 (2026-11-11).
//
// Each of the ten facts is recorded, then CONFIRMED by the function accountable for it (the person the project's Lead assigned to that
// function); Quality then coordinates the market; the authorised final approver confirms the completed transition, which is what makes the
// market Superseded. Nothing here is derived: the answer is explicit that the supersession decision "must be recorded by a person, never
// inferred automatically by the system". The card only reports what is still missing, and who can do each step.
const STATE_COLOR: Record<string, string> = {
  Active: 'green',
  'Transition Approved': 'gold',
  'Transition in Progress': 'orange',
  Superseded: 'default',
  Withdrawn: 'red',
  Cancelled: 'red',
};

type DraftKey = string; // `${version}|${market}`

function blankDecision(version: string, market: string): SupersessionDecision {
  return {
    id: `${version}|${market}`,
    version,
    market,
    replacementVersion: '',
    effectiveTransitionDate: '',
    lastReleaseDate: '',
    stockDisposition: '',
    regulatoryNotificationStatus: '',
    artworkTransition: '',
    pifUpdate: '',
    salesMarketingCommunication: '',
    distributorCommunication: '',
    noFurtherBatchesConfirmed: false,
  };
}

export default function FormulaSupersessionCard({ project }: { project: ProjectData }) {
  const setDecision = useAppStore((s) => s.setSupersessionDecision);
  const confirmFact = useAppStore((s) => s.confirmSupersessionFact);
  const coordinate = useAppStore((s) => s.coordinateSupersession);
  const approve = useAppStore((s) => s.approveSupersession);
  const { message } = App.useApp();
  const session = useSession();
  const view = usePermissionView();
  const grants = useAppStore((st) => st.permissionGrid?.grants ?? EMPTY_GRANTS);
  const reviewers = project.identity.reviewers;
  // The people the project's Lead assigned to each function, by name (the account is matched on the name here; the server checks the real
  // assignment). An administrator account holds no function of its own (SW-57).
  const holdsFunction = (keys: readonly string[]): boolean =>
    !!session.user && keys.some((k) => !!reviewers[k] && holdsRole({ name: reviewers[k] }, session.user!));
  // The authorised final approver: the Final Approver capability (an administrator keeps full rights). The server checks the same.
  const isFinalApprover = !!session.user && (view.isAdmin || hasCapability(grants, view.roleKeys, SUPERSESSION_FINAL_CAPABILITY));
  const [drafts, setDrafts] = useState<Record<DraftKey, SupersessionDecision>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const versions = useMemo(() => versionsOwingSupersession(project), [project]);
  const { search } = useLocation();
  const wanted = new URLSearchParams(search).get('scrollTo') === 'sec-supersession';
  useEffect(() => {
    if (wanted && versions.length > 0) document.getElementById('sec-supersession')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [wanted, versions.length]);
  if (versions.length === 0) return null;

  const stored = new Map(project.supersessionDecisions.map((d) => [`${d.version}|${d.market}`, d]));
  const decisionFor = (version: string, market: string): SupersessionDecision =>
    drafts[`${version}|${market}`] ?? stored.get(`${version}|${market}`) ?? blankDecision(version, market);
  const patch = (version: string, market: string, part: Partial<SupersessionDecision>) => {
    const key = `${version}|${market}`;
    setDrafts((d) => ({ ...d, [key]: { ...decisionFor(version, market), ...part } }));
  };

  const run = async (key: string, doing: () => Promise<void>, done: string, clearDraft?: DraftKey) => {
    setBusy(key);
    try {
      await doing();
      if (clearDraft) {
        setDrafts((d) => {
          const next = { ...d };
          delete next[clearDraft];
          return next;
        });
      }
      message.success(done);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card id="sec-supersession" title="Formula supersession (per market)" style={{ marginTop: 16 }}>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="An older formula version does not close automatically when its replacement is approved."
        description={
          <>
            <div>In each market the version is Active, in Transition once the replacement is approved for release there (Gate 11), and Superseded when the market's decision is complete.</div>
            <div>Each fact is confirmed by the function accountable for it; Quality coordinates the market; the authorised final approver confirms the completed transition.</div>
          </>
        }
      />
      {versions.map((v) => (
        <Card
          key={v.version}
          type="inner"
          style={{ marginBottom: 16 }}
          title={
            <Space>
              <span>Version {v.version}</span>
              <Tag color={STATE_COLOR[formulaVersionState(project, v.version)] ?? 'default'}>{formulaVersionState(project, v.version)}</Tag>
            </Space>
          }
        >
          <Table
            size="small"
            rowKey={(m) => m}
            pagination={false}
            dataSource={versionMarkets(project, v.version)}
            expandable={{
              expandedRowRender: (market) => {
                const key = `${v.version}|${market}`;
                const d = decisionFor(v.version, market);
                const saved = stored.get(key);
                const closed = !!saved?.confirmedBy;
                const legacy = !!saved && isLegacyConfirmed(saved);
                const dirty = !!drafts[key];
                const gaps = supersessionGaps(saved ?? d);
                return (
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    {legacy && (
                      <Alert type="info" showIcon message={`Confirmed by ${saved!.confirmedBy} before facts were confirmed one by one; it stands as recorded.`} />
                    )}
                    {SUPERSESSION_FACTS.map((fact) => {
                      const confirmation = saved ? supersessionFactConfirmation(saved, fact.key) : undefined;
                      const mine = holdsFunction(fact.functions);
                      const label = (
                        <span style={{ display: 'inline-block', width: 300, color: TEXT.secondary }}>
                          {fact.label}
                          <div style={{ fontSize: 12 }}>Confirmed by: {functionsLabel(fact.functions)}</div>
                        </span>
                      );
                      return (
                        <Space key={fact.key} style={{ width: '100%' }} align="start">
                          {label}
                          {fact.kind === 'date' ? (
                            <DatePicker
                              disabled={closed || legacy}
                              value={(d[fact.key as keyof SupersessionDecision] as string) ? dayjs(d[fact.key as keyof SupersessionDecision] as string) : null}
                              onChange={(date) => patch(v.version, market, { [fact.key]: date ? date.format('YYYY-MM-DD') : '' } as Partial<SupersessionDecision>)}
                            />
                          ) : fact.kind === 'flag' ? (
                            <Checkbox
                              disabled={closed || legacy}
                              checked={d.noFurtherBatchesConfirmed}
                              onChange={(e) => patch(v.version, market, { noFurtherBatchesConfirmed: e.target.checked })}
                            >
                              Yes
                            </Checkbox>
                          ) : (
                            <Input
                              disabled={closed || legacy}
                              style={{ width: 380 }}
                              value={(d[fact.key as keyof SupersessionDecision] as string) ?? ''}
                              onChange={(e) => patch(v.version, market, { [fact.key]: e.target.value } as Partial<SupersessionDecision>)}
                            />
                          )}
                          {confirmation ? (
                            <Tag color="green">
                              Confirmed by {confirmation.by} · {confirmation.at.slice(0, 10)}
                            </Tag>
                          ) : (
                            !closed &&
                            !legacy && (
                              <Tooltip
                                title={
                                  dirty
                                    ? 'Save the facts first'
                                    : !supersessionFactFilled(saved ?? d, fact)
                                      ? 'Record the fact first'
                                      : !mine
                                        ? `Only ${functionsLabel(fact.functions)} confirms this — the person the project's Lead assigned (Project team)`
                                        : undefined
                                }
                              >
                                <Button
                                  size="small"
                                  disabled={dirty || !saved || !supersessionFactFilled(saved, fact) || !mine}
                                  loading={busy === `${key}|${fact.key}`}
                                  onClick={() =>
                                    void run(`${key}|${fact.key}`, () => confirmFact(project.identity.id, { version: v.version, market, factKey: fact.key }), `Confirmed: ${fact.label}`)
                                  }
                                >
                                  Confirm as {functionsLabel(fact.functions)}
                                </Button>
                              </Tooltip>
                            )
                          )}
                        </Space>
                      );
                    })}
                    <Input.TextArea
                      disabled={closed || legacy}
                      rows={2}
                      placeholder="Notes"
                      value={d.notes ?? ''}
                      onChange={(e) => patch(v.version, market, { notes: e.target.value })}
                    />
                    {!closed && !legacy && (
                      <Space wrap>
                        <Button
                          disabled={!dirty}
                          loading={busy === `${key}|save`}
                          onClick={() =>
                            void run(`${key}|save`, () => setDecision(project.identity.id, d), `Facts saved for ${market}`, key)
                          }
                        >
                          Save facts
                        </Button>
                        <Tooltip
                          title={
                            saved?.coordinatedBy
                              ? undefined
                              : !saved || !allFactsConfirmed(saved)
                                ? 'Every fact has to be confirmed first'
                                : !holdsFunction([SUPERSESSION_COORDINATOR])
                                  ? `Only ${functionLabel(SUPERSESSION_COORDINATOR)} coordinates the supersession`
                                  : undefined
                          }
                        >
                          {saved?.coordinatedBy ? (
                            <Tag color="green">
                              Coordinated by {saved.coordinatedBy} ({functionLabel(SUPERSESSION_COORDINATOR)}) · {saved.coordinatedAt?.slice(0, 10)}
                            </Tag>
                          ) : (
                            <Button
                              disabled={dirty || !saved || !allFactsConfirmed(saved) || !holdsFunction([SUPERSESSION_COORDINATOR])}
                              loading={busy === `${key}|coordinate`}
                              onClick={() => void run(`${key}|coordinate`, () => coordinate(project.identity.id, { version: v.version, market }), `Coordinated for ${market}`)}
                            >
                              Coordinate as {functionLabel(SUPERSESSION_COORDINATOR)}
                            </Button>
                          )}
                        </Tooltip>
                        <Tooltip
                          title={
                            !saved?.coordinatedBy
                              ? 'Quality has to coordinate the market first'
                              : !isFinalApprover
                                ? 'Only the authorised final approver confirms the completed transition'
                                : undefined
                          }
                        >
                          <Button
                            type="primary"
                            disabled={dirty || !saved?.coordinatedBy || !isFinalApprover}
                            loading={busy === `${key}|approve`}
                            onClick={() =>
                              void run(`${key}|approve`, () => approve(project.identity.id, { version: v.version, market }), `Supersession confirmed for ${market}`)
                            }
                          >
                            Confirm completed transition in {market}
                          </Button>
                        </Tooltip>
                      </Space>
                    )}
                    {!closed && gaps.length > 0 && (
                      <div style={{ color: TEXT.secondary, fontSize: 12, whiteSpace: 'pre-line' }}>{listMessage('Still to do:', gaps)}</div>
                    )}
                    {closed && saved?.finalApprovedBy && (
                      <Tag color="green">
                        Completed transition confirmed by {saved.finalApprovedBy} · {saved.finalApprovedAt?.slice(0, 10)}
                      </Tag>
                    )}
                  </Space>
                );
              },
            }}
            columns={[
              { title: 'Market', width: 180, render: (_, m) => m },
              {
                title: 'State in this market',
                width: 200,
                render: (_, m) => <Tag color={STATE_COLOR[marketVersionState(project, v.version, m)] ?? 'default'}>{marketVersionState(project, v.version, m)}</Tag>,
              },
              {
                title: 'Decision',
                render: (_, m) => {
                  const s = stored.get(`${v.version}|${m}`);
                  if (s?.confirmedBy) {
                    return (
                      <span>
                        {s.confirmedBy}
                        <span style={{ color: TEXT.secondary }}>{s.confirmedAt ? ` · ${s.confirmedAt.slice(0, 10)}` : ''}</span>
                      </span>
                    );
                  }
                  const open = supersessionGaps(decisionFor(v.version, m)).length;
                  return <Tag color="orange">{open} still to do</Tag>;
                },
              },
            ]}
          />
        </Card>
      ))}
    </Card>
  );
}
