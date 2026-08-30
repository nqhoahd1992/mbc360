import { useMemo, useState } from 'react';
import { Alert, App, Button, Card, Checkbox, DatePicker, Input, Space, Table, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import type { ProjectData, SupersessionDecision } from '@mbc360/shared/types';
import {
  formulaVersionState,
  marketsAwaitingSupersession,
  supersessionGaps,
  transitioningVersions,
} from '@mbc360/shared/utils/formulaLifecycle';
import { useAppStore } from '../store/useAppStore';
import { TEXT } from '../theme/tokens';

// Round 4 question 2 — the per-market supersession decision (2026-08-30).
//
// Built after the final round-4 review found the gap: the store action, the
// endpoint and the rule engine all existed, and no screen called any of them, so
// `createFormulaVersion` parked the outgoing version in "Transition in Progress"
// with no way out. That is worse than the behaviour it replaced, which at least
// reached a terminal state — the same shape as question 24's lesson, where moving
// a requirement from creation-time to gate-time left it with no write path.
//
// Every field here is entered by a person and nothing is derived, because the
// answer is explicit that the supersession decision "must be recorded by a person,
// never inferred automatically by the system". The card only reports which of the
// ten facts are still missing.
const FIELDS: {
  key: keyof SupersessionDecision;
  label: string;
  kind: 'text' | 'date';
  hint?: string;
}[] = [
  { key: 'replacementVersion', label: 'Replacement formula version', kind: 'text' },
  { key: 'effectiveTransitionDate', label: 'Effective transition date', kind: 'date' },
  { key: 'lastReleaseDate', label: 'Last manufacturing / release date (old version)', kind: 'date' },
  { key: 'stockDisposition', label: 'Stock disposition or sell-through', kind: 'text' },
  { key: 'regulatoryNotificationStatus', label: 'Regulatory notification / registration status', kind: 'text' },
  { key: 'artworkTransition', label: 'Artwork and ingredient-list transition', kind: 'text' },
  { key: 'pifUpdate', label: 'PIF / Product Master File update', kind: 'text' },
  { key: 'salesMarketingCommunication', label: 'Sales and Marketing communication', kind: 'text' },
  { key: 'distributorCommunication', label: 'Distributor or customer communication', kind: 'text' },
];

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
  const { message } = App.useApp();
  // Local drafts, keyed by version+market. Not `useDraft`: the endpoint writes ONE
  // market at a time (confirming is an act that stamps who decided and when), so
  // there is no bulk save for a SaveBar to drive — the same reason the modal-gated
  // flows in this app commit on their own explicit button.
  const [drafts, setDrafts] = useState<Record<DraftKey, SupersessionDecision>>({});
  const [busy, setBusy] = useState<DraftKey | null>(null);

  const versions = useMemo(() => transitioningVersions(project), [project]);
  if (versions.length === 0) return null;

  const stored = new Map(project.supersessionDecisions.map((d) => [`${d.version}|${d.market}`, d]));

  const decisionFor = (version: string, market: string): SupersessionDecision => {
    const key = `${version}|${market}`;
    return drafts[key] ?? stored.get(key) ?? blankDecision(version, market);
  };

  const patch = (version: string, market: string, part: Partial<SupersessionDecision>) => {
    const key = `${version}|${market}`;
    setDrafts((d) => ({ ...d, [key]: { ...decisionFor(version, market), ...part } }));
  };

  const submit = async (version: string, market: string, confirm: boolean) => {
    const key = `${version}|${market}`;
    setBusy(key);
    try {
      await setDecision(project.identity.id, { ...decisionFor(version, market), confirm });
      setDrafts((d) => {
        const next = { ...d };
        delete next[key];
        return next;
      });
      message.success(
        confirm ? `Supersession confirmed for ${market}` : `Draft saved for ${market}`,
      );
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card title="Formula supersession (per market)" style={{ marginTop: 16 }}>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="An older formula version does not close automatically when its replacement is approved."
        description="Approving a replacement puts the outgoing version into Transition in Progress. It becomes Superseded only once a person has recorded all ten facts below for every market the project sells into — the system never infers it."
      />
      {versions.map((v) => {
        const awaiting = marketsAwaitingSupersession(project, v.version);
        return (
          <Card
            key={v.version}
            type="inner"
            style={{ marginBottom: 16 }}
            title={
              <Space>
                <span>Version {v.version}</span>
                <Tag color={STATE_COLOR[formulaVersionState(project, v.version)] ?? 'default'}>
                  {formulaVersionState(project, v.version)}
                </Tag>
              </Space>
            }
            extra={
              <span style={{ color: TEXT.secondary }}>
                {awaiting.length === 0
                  ? 'All markets decided'
                  : `Awaiting: ${awaiting.join(', ')}`}
              </span>
            }
          >
            <Table
              size="small"
              rowKey={(m) => m}
              pagination={false}
              dataSource={project.identity.markets}
              expandable={{
                expandedRowRender: (market) => {
                  const d = decisionFor(v.version, market);
                  const locked = !!stored.get(`${v.version}|${market}`)?.confirmedBy;
                  const key = `${v.version}|${market}`;
                  return (
                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                      {FIELDS.map((f) =>
                        f.kind === 'date' ? (
                          <Space key={f.key} style={{ width: '100%' }}>
                            <span style={{ display: 'inline-block', width: 320, color: TEXT.secondary }}>
                              {f.label}
                            </span>
                            <DatePicker
                              disabled={locked}
                              value={d[f.key] ? dayjs(d[f.key] as string) : null}
                              onChange={(date) =>
                                patch(v.version, market, {
                                  [f.key]: date ? date.format('YYYY-MM-DD') : '',
                                } as Partial<SupersessionDecision>)
                              }
                            />
                          </Space>
                        ) : (
                          <Space key={f.key} style={{ width: '100%' }}>
                            <span style={{ display: 'inline-block', width: 320, color: TEXT.secondary }}>
                              {f.label}
                            </span>
                            <Input
                              disabled={locked}
                              style={{ width: 420 }}
                              value={(d[f.key] as string) ?? ''}
                              onChange={(e) =>
                                patch(v.version, market, {
                                  [f.key]: e.target.value,
                                } as Partial<SupersessionDecision>)
                              }
                            />
                          </Space>
                        ),
                      )}
                      <Checkbox
                        disabled={locked}
                        checked={d.noFurtherBatchesConfirmed}
                        onChange={(e) => patch(v.version, market, { noFurtherBatchesConfirmed: e.target.checked })}
                      >
                        No further batches will be released under the old version
                      </Checkbox>
                      <Input.TextArea
                        disabled={locked}
                        rows={2}
                        placeholder="Notes"
                        value={d.notes ?? ''}
                        onChange={(e) => patch(v.version, market, { notes: e.target.value })}
                      />
                      {!locked && (
                        <Space>
                          <Button loading={busy === key} onClick={() => submit(v.version, market, false)}>
                            Save draft
                          </Button>
                          <Tooltip
                            title={
                              supersessionGaps(d).length > 0
                                ? `Still missing: ${supersessionGaps(d).join('; ')}`
                                : undefined
                            }
                          >
                            <Button
                              type="primary"
                              loading={busy === key}
                              // Deliberately NOT disabled on an incomplete draft: the
                              // server names every missing fact in its rejection, which
                              // is more useful than a dead button, and it is the
                              // authoritative check either way.
                              onClick={() => submit(v.version, market, true)}
                            >
                              Confirm supersession in {market}
                            </Button>
                          </Tooltip>
                        </Space>
                      )}
                    </Space>
                  );
                },
              }}
              columns={[
                { title: 'Market', dataIndex: undefined, width: 180, render: (_, m) => m },
                {
                  title: 'Status',
                  width: 200,
                  render: (_, m) => {
                    const s = stored.get(`${v.version}|${m}`);
                    if (s?.confirmedBy) return <Tag color="green">Confirmed</Tag>;
                    const gaps = supersessionGaps(decisionFor(v.version, m));
                    return <Tag color="orange">{gaps.length} of 11 still missing</Tag>;
                  },
                },
                {
                  title: 'Confirmed by',
                  render: (_, m) => {
                    const s = stored.get(`${v.version}|${m}`);
                    return s?.confirmedBy ? (
                      <span>
                        {s.confirmedBy}
                        <span style={{ color: TEXT.secondary }}>
                          {s.confirmedAt ? ` · ${s.confirmedAt.slice(0, 10)}` : ''}
                        </span>
                      </span>
                    ) : (
                      <span style={{ color: TEXT.secondary }}>—</span>
                    );
                  },
                },
              ]}
            />
          </Card>
        );
      })}
    </Card>
  );
}
