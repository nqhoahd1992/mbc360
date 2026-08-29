import { Alert, Card, DatePicker, Input, Select, Table, Tag, Tooltip } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { MarketApprovalStatus, MarketTrack } from '@mbc360/shared/types';
import { useAppStore } from '../store/useAppStore';
import { roleLabel } from '../utils/roles';
import { canEditMarketTrack, EMPTY_GRANTS } from '../utils/permissions';
import { patchArray, useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';
import { TEXT, TABLE_STICKY } from '../theme/tokens';

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
}: {
  projectId: string;
  tracks: MarketTrack[];
}) {
  const setTracksBulk = useAppStore((s) => s.setMarketTracksBulk);
  const viewRole = useAppStore((s) => s.viewRole);
  const grants = useAppStore((s) => s.permissionGrid?.grants ?? EMPTY_GRANTS);
  const { draft, dirty, update, markSaved, discard } = useDraft(tracks);
  // A4 example ruling: "only Regulatory can approve regulatory decisions".
  const canEdit = canEditMarketTrack(grants, viewRole);

  const patch = (index: number, p: Partial<MarketTrack>) => update((prev) => patchArray(prev, index, p));
  const save = () => {
    setTracksBulk(projectId, draft);
    markSaved();
  };

  const statusSelect = (
    track: MarketTrack,
    index: number,
    field: 'pifStatus' | 'regulatoryStatus' | 'claimsApproval',
  ) => (
    <Select
      style={{ width: 120 }}
      value={track[field]}
      disabled={!canEdit}
      options={STATUS_OPTIONS.map((s) => ({
        value: s,
        label: <Tag color={STATUS_COLORS[s]}>{s}</Tag>,
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

  return (
    <Card
      size="small"
      title={
        <span>
          Market Regulatory & Launch Tracking (Gates 10-12){' '}
          <span style={{ fontWeight: 400, color: TEXT.secondary, fontSize: 12 }}>
            — tracked per market; launch approval is hard-blocked until the market's PIF is Approved
          </span>
        </span>
      }
    >
      {!canEdit && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          title={`Market approvals are restricted to Regulatory — you are viewing as ${roleLabel(viewRole)}`}
          description="Notes stay open to contributors. RBAC demo simulation — the real role matrix is pending confirmation (F6)."
        />
      )}
      <Table
        size="small"
        rowKey={(t) => t.market}
        dataSource={draft}
        pagination={false}
        sticky={TABLE_STICKY}
        scroll={{ x: 1600 }}
        locale={{ emptyText: 'No target markets recorded in the project identity' }}
        columns={[
          { title: 'Market', width: 120, fixed: 'left', render: (_, t) => <b>{t.market}</b> },
          { title: 'PIF status', width: 140, render: (_, t, i) => statusSelect(t, i, 'pifStatus') },
          { title: 'Regulatory status', width: 140, render: (_, t, i) => statusSelect(t, i, 'regulatoryStatus') },
          { title: 'Claims approval', width: 140, render: (_, t, i) => statusSelect(t, i, 'claimsApproval') },
          {
            title: 'Launch approval',
            width: 170,
            render: (_, t, i) => {
              const pifApproved = t.pifStatus === 'Approved';
              return (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Select
                    style={{ width: 120 }}
                    value={t.launchApproval}
                    disabled={!pifApproved || !canEdit}
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
            },
          },
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
            render: (_, t, i) => (
              <DatePicker
                style={{ width: 130 }}
                value={t.actualLaunchDate ? dayjs(t.actualLaunchDate) : null}
                disabled={!canEdit || t.launchApproval !== 'Approved'}
                placeholder={t.launchApproval === 'Approved' ? 'Date on sale' : 'Needs approval'}
                onChange={(d) => patch(i, { actualLaunchDate: d ? d.format('YYYY-MM-DD') : undefined })}
              />
            ),
          },
          {
            title: 'Withdrawn',
            width: 150,
            render: (_, t, i) => (
              <DatePicker
                style={{ width: 130 }}
                value={t.withdrawnDate ? dayjs(t.withdrawnDate) : null}
                disabled={!canEdit}
                placeholder="Still selling"
                onChange={(d) => patch(i, { withdrawnDate: d ? d.format('YYYY-MM-DD') : undefined })}
              />
            ),
          },
          {
            title: 'Withdrawal reason',
            width: 200,
            render: (_, t, i) =>
              t.withdrawnDate ? (
                <Input
                  status={(t.withdrawnReason ?? '').trim() === '' ? 'error' : undefined}
                  placeholder="Required"
                  value={t.withdrawnReason}
                  disabled={!canEdit}
                  onChange={(e) => patch(i, { withdrawnReason: e.target.value })}
                />
              ) : (
                <span style={{ color: '#d9d9d9' }}>—</span>
              ),
          },
          {
            title: 'Regulatory notes',
            width: 240,
            render: (_, t, i) => (
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 3 }}
                value={t.regulatoryNotes}
                onChange={(e) => patch(i, { regulatoryNotes: e.target.value })}
              />
            ),
          },
        ]}
      />
      <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
    </Card>
  );
}
