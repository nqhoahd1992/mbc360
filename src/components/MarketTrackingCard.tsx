import { Alert, Card, Input, Select, Table, Tag, Tooltip } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { MarketApprovalStatus, MarketTrack } from '../types';
import { useAppStore } from '../store/useAppStore';
import { canEditMarketTrack, roleLabel } from '../utils/roles';

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
  const setMarketTrack = useAppStore((s) => s.setMarketTrack);
  const viewRole = useAppStore((s) => s.viewRole);
  // A4 example ruling: "only Regulatory can approve regulatory decisions".
  const canEdit = canEditMarketTrack(viewRole);

  const statusSelect = (
    track: MarketTrack,
    field: 'pifStatus' | 'regulatoryStatus' | 'claimsApproval',
  ) => (
    <Select
      size="small"
      style={{ width: 120 }}
      value={track[field]}
      disabled={!canEdit}
      options={STATUS_OPTIONS.map((s) => ({
        value: s,
        label: <Tag color={STATUS_COLORS[s]}>{s}</Tag>,
      }))}
      onChange={(v: MarketApprovalStatus) => {
        const patch: Partial<MarketTrack> = { [field]: v };
        if (field === 'pifStatus') {
          patch.pifApprovedDate = v === 'Approved' ? dayjs().format('YYYY-MM-DD') : undefined;
        }
        setMarketTrack(projectId, track.market, patch);
      }}
    />
  );

  return (
    <Card
      size="small"
      title={
        <span>
          Market Regulatory & Launch Tracking (Gates 10-12){' '}
          <span style={{ fontWeight: 400, color: '#999', fontSize: 12 }}>
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
          message={`Market approvals are restricted to Regulatory — you are viewing as ${roleLabel(viewRole)}`}
          description="Notes stay open to contributors. RBAC demo simulation — the real role matrix is pending confirmation (F6)."
        />
      )}
      <Table
        size="small"
        rowKey={(t) => t.market}
        dataSource={tracks}
        pagination={false}
        scroll={{ x: 1100 }}
        locale={{ emptyText: 'No target markets recorded in the project identity' }}
        columns={[
          { title: 'Market', width: 120, render: (_, t) => <b>{t.market}</b> },
          { title: 'PIF status', width: 140, render: (_, t) => statusSelect(t, 'pifStatus') },
          { title: 'Regulatory status', width: 140, render: (_, t) => statusSelect(t, 'regulatoryStatus') },
          { title: 'Claims approval', width: 140, render: (_, t) => statusSelect(t, 'claimsApproval') },
          {
            title: 'Launch approval',
            width: 170,
            render: (_, t) => {
              const pifApproved = t.pifStatus === 'Approved';
              return (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Select
                    size="small"
                    style={{ width: 120 }}
                    value={t.launchApproval}
                    disabled={!pifApproved || !canEdit}
                    options={STATUS_OPTIONS.map((s) => ({
                      value: s,
                      label: <Tag color={STATUS_COLORS[s]}>{s}</Tag>,
                    }))}
                    onChange={(v: MarketApprovalStatus) =>
                      setMarketTrack(projectId, t.market, {
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
            render: (_, t) => <span style={{ color: '#888' }}>{t.pifApprovedDate ?? '—'}</span>,
          },
          {
            title: 'Launch approved',
            width: 110,
            render: (_, t) => <span style={{ color: '#888' }}>{t.launchApprovedDate ?? '—'}</span>,
          },
          {
            title: 'Regulatory notes',
            width: 240,
            render: (_, t) => (
              <Input.TextArea
                size="small"
                autoSize={{ minRows: 1, maxRows: 3 }}
                value={t.regulatoryNotes}
                onChange={(e) =>
                  setMarketTrack(projectId, t.market, { regulatoryNotes: e.target.value })
                }
              />
            ),
          },
        ]}
      />
    </Card>
  );
}
