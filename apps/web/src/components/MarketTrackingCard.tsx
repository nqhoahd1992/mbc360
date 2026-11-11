import { Alert, Card, Collapse, DatePicker, Input, Select, Table, Tag, Tooltip } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { MarketApprovalStatus, MarketTrack } from '@mbc360/shared/types';
import { useAppStore } from '../store/useAppStore';
import { usePermissionView } from '../auth/previewMode';
import { roleLabel } from '../utils/roles';
import OpenChangesNotice from './OpenChangesNotice';
import { canChangeMarketTracks, MARKET_TRACKS_REASON } from '@mbc360/shared/utils/projectAuthority';
import { useSession } from '../auth/useSession';
import { patchArray, useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';
import { TEXT, TABLE_STICKY } from '../theme/tokens';
import '../styles/concept.css';
import './MarketTrackingCard.css';

const STATUS_OPTIONS: MarketApprovalStatus[] = [
  'Not Started',
  'In Progress',
  'Approved',
  'Blocked',
  'N/A',
];

const STATUS_COLORS: Record<MarketApprovalStatus, string> = {
  'Not Started': 'default',
  'In Progress': 'processing',
  Approved: 'success',
  Blocked: 'error',
  'N/A': 'default',
};

// Per-market tracking for Gates 10-12 (confirmed rule A1): development runs
// once (Gates 1-9), but regulatory approval, PIF, claims and launch readiness
// are tracked per market. Rule C5: launch approval is hard-blocked until the
// market's PIF status is Approved — a product may launch in one country while
// remaining blocked in another.
export default function MarketTrackingCard({
  projectId,
  tracks,
  currentVersion,
  market,
}: {
  projectId: string;
  // The current formula version's tracks plus older versions still on sale (F4).
  tracks: MarketTrack[];
  currentVersion: string;
  // The market chosen on the gate tab (Gates 10-12). With one chosen, the card shows THAT market as a detail card instead of a table
  // of every market and version. The draft still holds every market, so switching market never loses an unsaved edit.
  market?: string;
}) {
  const setTracksBulk = useAppStore((s) => s.setMarketTracksBulk);
  const permissionView = usePermissionView();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const { user } = useSession();
  const { draft, dirty, update, markSaved, discard } = useDraft(tracks);
  // SW-37: the project's Regulatory and Project Manager people, the Lead and administrators.
  const canEdit = !!project && canChangeMarketTracks(project, { displayName: user?.displayName ?? '', isAdmin: permissionView.isAdmin });

  const patch = (index: number, p: Partial<MarketTrack>) => update((prev) => patchArray(prev, index, p));
  // F4: an older version's track is closed for approvals — its Gate 10-12 work
  // was done for that formula. It stays on screen while that version is on sale,
  // and only its withdrawal can still be recorded.
  const isLegacy = (t: MarketTrack) => t.formulaVersion !== currentVersion;
  const save = () => {
    setTracksBulk(projectId, draft);
    markSaved();
  };

  const statusSelect = (
    track: MarketTrack,
    index: number,
    field: 'pifStatus' | 'regulatoryStatus' | 'claimsApproval',
    block?: boolean,
  ) => (
    <Select
      style={{ width: block ? '100%' : 120 }}
      value={track[field]}
      disabled={!canEdit || isLegacy(track)}
      options={STATUS_OPTIONS.map((s) => ({
        value: s,
        label: <Tag color={STATUS_COLORS[s]}>{s}</Tag>,
        // C5: launch approval rests on an Approved PIF, so the PIF cannot leave
        // Approved while launch approval stands — the server refuses it too.
        disabled: field === 'pifStatus' && s !== 'Approved' && track.launchApproval === 'Approved',
        title:
          field === 'pifStatus' && s !== 'Approved' && track.launchApproval === 'Approved'
            ? 'Change the launch approval first (rule C5)'
            : undefined,
      }))}
      onChange={(v: MarketApprovalStatus) => {
        const p: Partial<MarketTrack> = { [field]: v };
        if (field === 'pifStatus') {
          p.pifApprovedDate = v === 'Approved' ? dayjs().format('YYYY-MM-DD') : undefined;
        }
        patch(index, p);
      }}
    />
  );

  const launchApprovalSelect = (t: MarketTrack, i: number, block?: boolean) => {
    const pifApproved = t.pifStatus === 'Approved';
    return (
      <span style={{ display: block ? 'flex' : 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Select
          style={block ? { flex: 1, minWidth: 0 } : { width: 120 }}
          value={t.launchApproval}
          disabled={!pifApproved || !canEdit || isLegacy(t)}
          options={STATUS_OPTIONS.map((s) => ({
            value: s,
            label: <Tag color={STATUS_COLORS[s]}>{s}</Tag>,
          }))}
          onChange={(v: MarketApprovalStatus) =>
            patch(i, {
              launchApproval: v,
              launchApprovedDate: v === 'Approved' ? dayjs().format('YYYY-MM-DD') : undefined,
            })
          }
        />
        {!pifApproved && (
          <Tooltip title="Hard-blocked (rule C5): PIF must be Approved for this market before launch approval.">
            <LockOutlined style={{ color: '#cf1322' }} />
          </Tooltip>
        )}
      </span>
    );
  };
  // Round 4 questions 13 and 14, 2026-08-29. A different fact from "Launch approved" beside it: approval is permission to sell, this is
  // the day selling started — "a product has launched in a market when the actual commercial launch date for that market is recorded" —
  // and every post-launch review interval runs from it. Editable, unlike the two approval dates, which are stamped by the approval itself.
  const actualLaunchPicker = (t: MarketTrack, i: number, width: number | string = 130) => (
    <DatePicker
      style={{ width }}
      value={t.actualLaunchDate ? dayjs(t.actualLaunchDate) : null}
      disabled={!canEdit || t.launchApproval !== 'Approved' || isLegacy(t)}
      placeholder={t.launchApproval === 'Approved' ? 'Date on sale' : 'Needs approval'}
      onChange={(d) => patch(i, { actualLaunchDate: d ? d.format('YYYY-MM-DD') : undefined })}
    />
  );
  const withdrawnPicker = (t: MarketTrack, i: number, width: number | string = 130) => (
    <DatePicker
      style={{ width }}
      value={t.withdrawnDate ? dayjs(t.withdrawnDate) : null}
      disabled={!canEdit}
      placeholder="Still selling"
      onChange={(d) => patch(i, { withdrawnDate: d ? d.format('YYYY-MM-DD') : undefined })}
    />
  );
  const withdrawalReasonInput = (t: MarketTrack, i: number) => (
    <Input
      status={(t.withdrawnReason ?? '').trim() === '' ? 'error' : undefined}
      placeholder="Required"
      value={t.withdrawnReason}
      disabled={!canEdit}
      onChange={(e) => patch(i, { withdrawnReason: e.target.value })}
    />
  );
  const notesInput = (t: MarketTrack, i: number, roomy?: boolean) => (
    <Input.TextArea
      autoSize={roomy ? { minRows: 2, maxRows: 5 } : { minRows: 1, maxRows: 3 }}
      value={t.regulatoryNotes}
      onChange={(e) => patch(i, { regulatoryNotes: e.target.value })}
    />
  );

  // One track of the chosen market as a form: the three statuses, then launch, then notes. Labels sit above their fields.
  const trackForm = (t: MarketTrack, i: number) => (
    <div className="mt-form">
      <label>
        <span className="mt-labelrow">
          <span className="mt-label">PIF status</span>
          {t.pifApprovedDate && <span className="mt-sub">approved {t.pifApprovedDate}</span>}
        </span>
        {statusSelect(t, i, 'pifStatus', true)}
      </label>
      <label>
        <span className="mt-label">Regulatory status</span>
        {statusSelect(t, i, 'regulatoryStatus', true)}
      </label>
      <label>
        <span className="mt-label">Claims approval</span>
        {statusSelect(t, i, 'claimsApproval', true)}
      </label>
      <label>
        <span className="mt-labelrow">
          <span className="mt-label">Launch approval</span>
          {t.launchApprovedDate && <span className="mt-sub">approved {t.launchApprovedDate}</span>}
        </span>
        {launchApprovalSelect(t, i, true)}
      </label>
      <label>
        <span className="mt-label">Actual launch</span>
        {actualLaunchPicker(t, i, '100%')}
      </label>
      <label>
        <span className="mt-label">Withdrawn</span>
        {withdrawnPicker(t, i, '100%')}
      </label>
      {t.withdrawnDate && (
        <label className="mt-wide">
          <span className="mt-label">Withdrawal reason</span>
          {withdrawalReasonInput(t, i)}
        </label>
      )}
      <label className="mt-wide">
        <span className="mt-label">Regulatory notes</span>
        {notesInput(t, i, true)}
      </label>
    </div>
  );

  // With a market chosen: its tracks, the current version first and any earlier version still on sale after it.
  const marketTracks = market
    ? draft
        .map((t, index) => ({ t, index }))
        .filter(({ t }) => t.market === market)
        .sort((a, b) => Number(isLegacy(a.t)) - Number(isLegacy(b.t)))
    : [];
  const currentTracks = marketTracks.filter(({ t }) => !isLegacy(t));
  const earlierTracks = marketTracks.filter(({ t }) => isLegacy(t));

  return (
    <Card
      size="small"
      className="ph-card"
      title={
        <span>
          {market ? `Regulatory & launch tracking — ${market}` : 'Market Regulatory & Launch Tracking (Gates 10-12)'}
          {!market && (
            <>
              {' '}
              <span style={{ fontWeight: 400, color: TEXT.secondary, fontSize: 12 }}>
                — tracked per market; launch approval is hard-blocked until the market's PIF is Approved
              </span>
            </>
          )}
        </span>
      }
    >
      <OpenChangesNotice
        projectId={projectId}
        gateNumbers={['10', '11', '12']}
        scope="the market tracks"
        note="A change that names no market applies to every market."
      />
      {!canEdit && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          title={`${MARKET_TRACKS_REASON}${permissionView.previewing ? ` — previewing as ${roleLabel(permissionView.previewRole!)}` : ''}`}
          description="Notes stay open to contributors."
        />
      )}
      {market && (
        <>
          <p className="mt-desc">Launch approval stays locked until this market's PIF is Approved.</p>
          {marketTracks.length === 0 && <Alert type="info" showIcon title={`No tracking record for ${market}.`} />}
          {currentTracks.map(({ t, index }) => (
            <section key={`${t.market}|${t.formulaVersion}`} className="mt-track">
              <div className="mt-track-head">
                <Tag color="blue">{t.formulaVersion}</Tag>
                <span className="mt-track-note">current formula version</span>
              </div>
              {trackForm(t, index)}
            </section>
          ))}
          {earlierTracks.length > 0 && (
            <Collapse
              ghost
              className="mt-earlier"
              items={earlierTracks.map(({ t, index }) => ({
                key: `${t.market}|${t.formulaVersion}`,
                label: (
                  <span className="mt-earlier-label">
                    <Tag style={{ margin: 0 }}>{t.formulaVersion} · on sale</Tag>
                    <span className="mt-track-note">earlier formula version still on sale here — approvals are closed, only its withdrawal can be recorded</span>
                  </span>
                ),
                children: trackForm(t, index),
              }))}
            />
          )}
        </>
      )}
      {!market && (
      <Table
        size="small"
        rowKey={(t) => `${t.market}|${t.formulaVersion}`}
        dataSource={draft}
        pagination={false}
        sticky={TABLE_STICKY}
        scroll={{ x: 1600 }}
        locale={{ emptyText: 'No target markets recorded in the project identity' }}
        columns={[
          { title: 'Market', width: 120, fixed: 'left', render: (_, t) => <b>{t.market}</b> },
          {
            title: 'Formula version',
            width: 140,
            render: (_, t) =>
              isLegacy(t) ? (
                <Tooltip title="An earlier formula version still on sale here — it stays until it is withdrawn or superseded (F4)">
                  <Tag>{t.formulaVersion} · on sale</Tag>
                </Tooltip>
              ) : (
                <Tag color="blue">{t.formulaVersion}</Tag>
              ),
          },
          { title: 'PIF status', width: 140, render: (_, t, i) => statusSelect(t, i, 'pifStatus') },
          { title: 'Regulatory status', width: 140, render: (_, t, i) => statusSelect(t, i, 'regulatoryStatus') },
          { title: 'Claims approval', width: 140, render: (_, t, i) => statusSelect(t, i, 'claimsApproval') },
          { title: 'Launch approval', width: 170, render: (_, t, i) => launchApprovalSelect(t, i) },
          {
            title: 'PIF approved',
            width: 110,
            render: (_, t) => <span style={{ color: TEXT.secondary }}>{t.pifApprovedDate ?? '—'}</span>,
          },
          {
            title: 'Launch approved',
            width: 110,
            render: (_, t) => <span style={{ color: TEXT.secondary }}>{t.launchApprovedDate ?? '—'}</span>,
          },
          {
            // Round 4 questions 13 and 14, 2026-08-29. A different fact from
            // "Launch approved" beside it: approval is permission to sell, this is
            // the day selling started — "a product has launched in a market when
            // the actual commercial launch date for that market is recorded" — and
            // every post-launch review interval runs from it. Editable, unlike the
            // two approval dates, which are stamped by the approval itself.
            title: 'Actual launch',
            width: 150,
            render: (_, t, i) => actualLaunchPicker(t, i),
          },
          { title: 'Withdrawn', width: 150, render: (_, t, i) => withdrawnPicker(t, i) },
          {
            title: 'Withdrawal reason',
            width: 200,
            render: (_, t, i) => (t.withdrawnDate ? withdrawalReasonInput(t, i) : <span style={{ color: '#d9d9d9' }}>—</span>),
          },
          { title: 'Regulatory notes', width: 240, render: (_, t, i) => notesInput(t, i) },
        ]}
      />
      )}
      <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
    </Card>
  );
}
