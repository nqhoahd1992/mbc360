import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Empty, Input, Modal, Select, Space, Table, Tag, Tooltip, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ClaimLibraryEntry } from '@mbc360/shared/config/referenceData';
import {
  CLAIMS_LIBRARY_REGULATORY_APPROVAL,
  CLAIMS_LIBRARY_TECHNICAL_APPROVAL,
  CLAIM_LIBRARY_AUDIENCES,
} from '@mbc360/shared/config/referenceData';
import { useAppStore } from '../store/useAppStore';
import { useSession } from '../auth/useSession';
import { canEditReferenceData, EMPTY_GRANTS, hasCapability } from '../utils/permissions';
import { TEXT, TABLE_STICKY } from '../theme/tokens';

// Round 4 question 28 (2026-08-24), built 2026-08-30. The company-level Claims
// Library — the third reference dataset, and the only one with a workflow.
//
// What makes this page different from Market profiles and Raw material risk beside
// it is the two-party gate: "Technical AND Regulatory must both approve an entry
// before it becomes Approved Library Wording. Marketing/Brand may propose wording
// but not provide final technical/regulatory approval." So the status is never
// edited here — it is a consequence of the two approval buttons, and the server
// derives it on every write.
//
// The library is what finally makes C1's first condition readable: "wording is not
// in the approved Claims Library". A project claim links to an entry, and a claim
// linked to nothing — or to an entry that is only Proposed, or Withdrawn — triggers
// Regulatory review.
const STATUS_COLOURS: Record<string, string> = {
  Proposed: 'processing',
  Approved: 'success',
  Withdrawn: 'default',
};

const TAG_FIELDS: { key: keyof ClaimLibraryEntry; label: string }[] = [
  { key: 'brands', label: 'Brand' },
  { key: 'productFamilies', label: 'Product family' },
  { key: 'skus', label: 'SKU' },
  { key: 'markets', label: 'Market' },
  { key: 'languages', label: 'Language' },
  { key: 'channels', label: 'Channel' },
];

export default function AdminClaimsLibrary() {
  const entries = useAppStore((s) => s.claimsLibrary);
  const load = useAppStore((s) => s.loadClaimsLibrary);
  const grants = useAppStore((s) => s.permissionGrid?.grants ?? EMPTY_GRANTS);
  const { user } = useSession();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Partial<ClaimLibraryEntry> | null>(null);
  const [withdrawing, setWithdrawing] = useState<ClaimLibraryEntry | null>(null);
  const [reason, setReason] = useState('');
  const [impact, setImpact] = useState<LinkedClaim[] | null>(null);

  useEffect(() => {
    if (entries === null) void load();
  }, [entries, load]);

  const roleKeys = useMemo(() => (user?.roles ?? []).map((r) => r.key), [user]);
  const canEdit = canEditReferenceData(grants, roleKeys, 'claims-library');
  const canApproveTechnical = hasCapability(grants, roleKeys, CLAIMS_LIBRARY_TECHNICAL_APPROVAL);
  const canApproveRegulatory = hasCapability(grants, roleKeys, CLAIMS_LIBRARY_REGULATORY_APPROVAL);

  const call = async (path: string, init: RequestInit) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/reference/claims-library${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...init,
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        message.error(typeof body?.message === 'string' ? body.message : 'Request failed');
        return null;
      }
      await load();
      return body;
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!editing) return;
    const id = editing.id ?? 'new';
    const ok = await call(`/${id}`, { method: 'PUT', body: JSON.stringify({ patch: editing }) });
    if (ok) setEditing(null);
  };

  const confirmWithdraw = async () => {
    if (!withdrawing) return;
    const result = await call(`/${withdrawing.id}/withdraw`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    if (result) {
      setImpact(result.impact ?? []);
      setWithdrawing(null);
      setReason('');
    }
  };

  if (entries === null) return <Card size="small" loading title="Claims Library" />;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Alert
        type="info"
        showIcon
        message="Company-level Claims Library"
        description={
          <>
            Approved wording every project can reuse. An entry becomes <strong>Approved Library Wording</strong> only
            when <strong>both</strong> Technical and Regulatory have approved it — Marketing may propose wording but
            not approve it. A project claim that is not linked to an Approved entry triggers Regulatory review, which
            is what makes the &ldquo;not in the approved Claims Library&rdquo; rule enforceable at all.
          </>
        }
      />

      {!canEdit && (
        <Alert
          type="warning"
          showIcon
          message="You can read this library but not change it"
          description="Editing and proposing need the Claims Library edit capability; the two approvals need their own. An administrator grants these in Users & Roles → Roles."
        />
      )}

      <Card
        size="small"
        title="Claims Library"
        extra={
          canEdit && (
            <Button icon={<PlusOutlined />} onClick={() => setEditing({ wording: '' })}>
              Propose an entry
            </Button>
          )
        }
      >
        {entries.length === 0 ? (
          <Empty description="No library entries yet. Until an entry exists and is approved, every project claim counts as “not in the approved Claims Library” and triggers Regulatory review." />
        ) : (
          <Table
            size="small"
            rowKey="id"
            dataSource={entries}
            pagination={false}
            sticky={TABLE_STICKY}
            scroll={{ x: 1400 }}
            columns={[
              {
                title: 'Approved wording',
                width: 300,
                fixed: 'left',
                render: (_, e) => (
                  <span>
                    <strong>{e.wording}</strong>
                    <div style={{ fontSize: 11, color: TEXT.secondary }}>
                      rev {e.revision}
                      {e.proposedBy ? ` · proposed by ${e.proposedBy}` : ''}
                      {e.proposedFromProjectId ? ` (${e.proposedFromProjectId})` : ''}
                    </div>
                  </span>
                ),
              },
              {
                title: 'Status',
                width: 220,
                render: (_, e) => (
                  <Space orientation="vertical" size={2}>
                    <Tag color={STATUS_COLOURS[e.status] ?? 'default'}>{e.status}</Tag>
                    <span style={{ fontSize: 11, color: TEXT.secondary }}>
                      Technical: {e.technicalApprovedBy ?? '—'}
                    </span>
                    <span style={{ fontSize: 11, color: TEXT.secondary }}>
                      Regulatory: {e.regulatoryApprovedBy ?? '—'}
                    </span>
                    {e.withdrawnReason && (
                      <span style={{ fontSize: 11, color: '#cf1322' }}>Withdrawn: {e.withdrawnReason}</span>
                    )}
                  </Space>
                ),
              },
              { title: 'Category', width: 170, dataIndex: 'claimCategory' },
              { title: 'Evidence requirement', width: 220, dataIndex: 'evidenceRequirement' },
              {
                title: 'Applies to',
                width: 260,
                render: (_, e) => (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {TAG_FIELDS.map(({ key, label }) => {
                      const value = String(e[key] ?? '').trim();
                      return value ? (
                        <Tooltip key={key} title={label}>
                          <Tag>{value}</Tag>
                        </Tooltip>
                      ) : null;
                    })}
                    {e.audience && <Tag color="blue">{e.audience}</Tag>}
                  </div>
                ),
              },
              { title: 'Effective', width: 110, dataIndex: 'effectiveDate' },
              { title: 'Review', width: 110, dataIndex: 'reviewDate' },
              {
                title: '',
                width: 260,
                render: (_, e) => (
                  <Space wrap>
                    {canEdit && e.status !== 'Withdrawn' && (
                      <Button size="small" onClick={() => setEditing(e)}>
                        Edit
                      </Button>
                    )}
                    {e.status !== 'Withdrawn' && !e.technicalApprovedBy && (
                      <Tooltip title={canApproveTechnical ? undefined : 'Needs the Technical approval capability'}>
                        <Button
                          size="small"
                          disabled={!canApproveTechnical || busy}
                          onClick={() => void call(`/${e.id}/approve/technical`, { method: 'POST' })}
                        >
                          Approve (Technical)
                        </Button>
                      </Tooltip>
                    )}
                    {e.status !== 'Withdrawn' && !e.regulatoryApprovedBy && (
                      <Tooltip title={canApproveRegulatory ? undefined : 'Needs the Regulatory approval capability'}>
                        <Button
                          size="small"
                          disabled={!canApproveRegulatory || busy}
                          onClick={() => void call(`/${e.id}/approve/regulatory`, { method: 'POST' })}
                        >
                          Approve (Regulatory)
                        </Button>
                      </Tooltip>
                    )}
                    {canEdit && e.status !== 'Withdrawn' && (
                      <Button size="small" danger onClick={() => setWithdrawing(e)}>
                        Withdraw
                      </Button>
                    )}
                  </Space>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Modal
        open={editing !== null}
        title={editing?.id ? 'Edit library entry' : 'Propose a library entry'}
        okText="Save"
        confirmLoading={busy}
        onOk={save}
        onCancel={() => setEditing(null)}
        width={720}
      >
        <Space orientation="vertical" style={{ width: '100%' }} size={10}>
          {editing?.id && (editing.technicalApprovedBy || editing.regulatoryApprovedBy) && (
            <Alert
              type="warning"
              showIcon
              message="Changing the wording retracts both approvals"
              description="An approval stands for the words that were approved. Editing them means the entry goes back to Proposed and has to pass the two-party gate again."
            />
          )}
          <Input.TextArea
            autoSize={{ minRows: 2, maxRows: 5 }}
            placeholder="Approved wording"
            value={editing?.wording}
            onChange={(e) => setEditing((prev) => ({ ...prev, wording: e.target.value }))}
          />
          <Space wrap>
            <Input
              style={{ width: 220 }}
              placeholder="Claim category"
              value={editing?.claimCategory}
              onChange={(e) => setEditing((prev) => ({ ...prev, claimCategory: e.target.value }))}
            />
            <Input
              style={{ width: 180 }}
              placeholder="Claim risk"
              value={editing?.claimRisk}
              onChange={(e) => setEditing((prev) => ({ ...prev, claimRisk: e.target.value }))}
            />
            <Select
              style={{ width: 180 }}
              allowClear
              placeholder="Consumer / professional"
              value={editing?.audience || undefined}
              options={CLAIM_LIBRARY_AUDIENCES.map((a) => ({ value: a, label: a }))}
              onChange={(v?: string) => setEditing((prev) => ({ ...prev, audience: v }))}
            />
          </Space>
          <Input.TextArea
            autoSize={{ minRows: 1, maxRows: 3 }}
            placeholder="Evidence requirement"
            value={editing?.evidenceRequirement}
            onChange={(e) => setEditing((prev) => ({ ...prev, evidenceRequirement: e.target.value }))}
          />
          <Space wrap>
            {TAG_FIELDS.map(({ key, label }) => (
              <Input
                key={key}
                style={{ width: 210 }}
                placeholder={`${label} (comma separated)`}
                value={String(editing?.[key] ?? '')}
                onChange={(e) => setEditing((prev) => ({ ...prev, [key]: e.target.value }))}
              />
            ))}
          </Space>
          <Space wrap>
            <Input
              style={{ width: 210 }}
              placeholder="Effective date (YYYY-MM-DD)"
              value={editing?.effectiveDate}
              onChange={(e) => setEditing((prev) => ({ ...prev, effectiveDate: e.target.value }))}
            />
            <Input
              style={{ width: 210 }}
              placeholder="Review date (YYYY-MM-DD)"
              value={editing?.reviewDate}
              onChange={(e) => setEditing((prev) => ({ ...prev, reviewDate: e.target.value }))}
            />
          </Space>
        </Space>
      </Modal>

      <Modal
        open={withdrawing !== null}
        title={`Withdraw "${withdrawing?.wording ?? ''}"`}
        okText="Withdraw"
        okButtonProps={{ danger: true, disabled: !reason.trim() }}
        confirmLoading={busy}
        onOk={confirmWithdraw}
        onCancel={() => {
          setWithdrawing(null);
          setReason('');
        }}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Withdrawing flags affected material for re-review — it does not remove anything"
          description="Every project claim linked to this entry is listed afterwards so an impact assessment can be run. Nothing is taken off the market automatically."
        />
        <Input.TextArea
          rows={3}
          value={reason}
          placeholder="Why is this entry being withdrawn?"
          onChange={(e) => setReason(e.target.value)}
        />
      </Modal>

      <Modal
        open={impact !== null}
        title="Affected claims"
        footer={null}
        onCancel={() => setImpact(null)}
        width={720}
      >
        {impact?.length === 0 ? (
          <Empty description="No project claim was linked to this entry." />
        ) : (
          <Table
            size="small"
            rowKey={(r) => `${r.projectId}|${r.claimId}`}
            dataSource={impact ?? []}
            pagination={false}
            columns={[
              { title: 'Project', dataIndex: 'projectId', width: 150 },
              { title: 'Claim', dataIndex: 'claimId', width: 110 },
              { title: 'Wording', dataIndex: 'wording' },
              { title: 'Status', dataIndex: 'status', width: 110 },
              { title: 'Markets', width: 160, render: (_, r) => r.markets.join(', ') || '—' },
              { title: 'Published records', dataIndex: 'publishedRecords', width: 130 },
            ]}
          />
        )}
      </Modal>
    </div>
  );
}

interface LinkedClaim {
  projectId: string;
  claimId: string;
  wording: string;
  status: string;
  skus: string[];
  markets: string[];
  publishedRecords: number;
}
