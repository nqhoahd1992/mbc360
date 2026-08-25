import { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Input, InputNumber, Space, Switch, Table, Tag, message } from 'antd';
import type { MarketProfile } from '@mbc360/shared/config/referenceData';
import { PHASE_CONFIGS } from '@mbc360/shared/config/phases';
import { ASEAN_MARKETS } from '@mbc360/shared/config/registers';
import { useAppStore } from '../store/useAppStore';
import { useSession } from '../auth/useSession';
import { canEditReferenceData, EMPTY_GRANTS } from '../utils/permissions';
import { useDraft } from '../hooks/useDraft';
import SaveBar from '../components/SaveBar';
import { TEXT } from '../theme/tokens';

// Round 4 question 4 (2026-08-24): "Do not use a permanently hard-coded country
// list. Regulatory maintains a configurable market profile indicating whether each
// market requires particular adverse-event reporting, PMS records or review
// intervals."
//
// This page is that surface. Without it the dataset would be unreachable and every
// rule reading it permanently unsatisfiable — the same trap câu 34(c) nearly fell
// into, where seven required fields had no input anywhere.
//
// It is a COMPANY-level screen, not a project one: one list every project reads and
// no project can edit (question 28's phrasing, which applies to all three reference
// datasets). That is why it sits under the admin routes beside Users & Roles rather
// than inside a project workspace.

// Every market the app can record, so Regulatory sees the full list rather than
// only the ones already configured. Taken from the Target Countries / Markets
// option list — the same controlled list a project picks from — so the two can
// never disagree about what a market is called.
function allMarkets(): string[] {
  const options = PHASE_CONFIGS[1]?.checklistSections.find((s) => s.key === 'targetMarkets')?.options ?? [];
  return options.filter((m) => m !== 'Other - specify');
}

export default function AdminMarketProfiles() {
  const profiles = useAppStore((s) => s.marketProfiles);
  const loadMarketProfiles = useAppStore((s) => s.loadMarketProfiles);
  const grants = useAppStore((s) => s.permissionGrid?.grants ?? EMPTY_GRANTS);
  const { user } = useSession();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profiles === null) void loadMarketProfiles();
  }, [profiles, loadMarketProfiles]);

  // Checked against the REAL signed-in roles, not the "View as" simulator: this
  // edits company-wide rules, so a demo role switch must not grant it — the same
  // reasoning as archive/delete.
  const roleKeys = useMemo(() => (user?.roles ?? []).map((r) => r.key), [user]);
  const canEdit = canEditReferenceData(grants, roleKeys, 'market-profile');

  // One row per known market, merged with whatever Regulatory has configured. A
  // market with no profile row shows as unconfigured rather than being absent —
  // "Regulatory has not set this up" is a state the reader needs to see.
  const rows = useMemo(() => {
    const byMarket = new Map((profiles ?? []).map((p) => [p.market, p]));
    return allMarkets().map<MarketProfile & { configured: boolean }>((market) => {
      const p = byMarket.get(market);
      return {
        id: p?.id ?? market,
        market,
        adverseEventReporting: p?.adverseEventReporting ?? false,
        pmsRecordsRequired: p?.pmsRecordsRequired ?? false,
        reviewIntervalMonths: p?.reviewIntervalMonths,
        enhancedSurveillance: p?.enhancedSurveillance ?? false,
        dossierType: p?.dossierType,
        claimRestrictions: p?.claimRestrictions,
        evidenceLink: p?.evidenceLink,
        reviewDate: p?.reviewDate,
        notes: p?.notes,
        revision: p?.revision ?? 0,
        updatedBy: p?.updatedBy,
        updatedAt: p?.updatedAt,
        configured: !!p,
      };
    });
  }, [profiles]);

  const { draft, dirty, update, markSaved, discard } = useDraft(rows);
  const patch = (market: string, p: Partial<MarketProfile>) =>
    update((prev) => prev.map((r) => (r.market === market ? { ...r, ...p } : r)));

  // Only the rows that actually changed are sent, one request each: the endpoint
  // is an upsert keyed by market and each write gets its own revision, so batching
  // them into one call would collapse several distinct rule changes into one
  // revision entry.
  const save = async () => {
    const changed = draft.filter((d, i) => JSON.stringify(d) !== JSON.stringify(rows[i]));
    if (changed.length === 0) return;
    setSaving(true);
    try {
      for (const row of changed) {
        const res = await fetch(`/api/reference/market-profiles/${encodeURIComponent(row.market)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patch: row }),
        });
        if (!res.ok) throw new Error((await res.json())?.message ?? 'Could not save');
      }
      await loadMarketProfiles();
      markSaved();
      message.success(`${changed.length} market profile(s) saved`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Alert
        type="info"
        showIcon
        message="Company-level reference data — one list, read by every project"
        description="The review team asked that market requirements be configurable here rather than hard-coded. A market with no profile is treated as having no market-specific requirement, which is why leaving one unconfigured is a decision rather than a gap."
      />

      <Card
        size="small"
        title="Regulatory market profiles"
        extra={
          canEdit ? (
            <Tag color="blue">You may edit these</Tag>
          ) : (
            <Tag>Read-only — needs the Regulatory market-profile capability</Tag>
          )
        }
      >
        <Table
          size="small"
          rowKey={(r) => r.market}
          dataSource={draft}
          pagination={false}
          scroll={{ x: 1500 }}
          columns={[
            {
              title: 'Market',
              width: 150,
              fixed: 'left',
              render: (_, r) => (
                <Space size={4}>
                  <b>{r.market}</b>
                  {ASEAN_MARKETS.includes(r.market) && <Tag color="geekblue">ASEAN</Tag>}
                </Space>
              ),
            },
            {
              title: 'Configured',
              width: 100,
              render: (_, r) =>
                r.revision > 0 ? (
                  <Tag color="green">rev {r.revision}</Tag>
                ) : (
                  <span style={{ color: TEXT.secondary }}>not set</span>
                ),
            },
            {
              title: 'Adverse-event reporting',
              width: 150,
              render: (_, r) => (
                <Switch
                  size="small"
                  disabled={!canEdit}
                  checked={r.adverseEventReporting}
                  onChange={(v) => patch(r.market, { adverseEventReporting: v })}
                />
              ),
            },
            {
              title: 'PMS records',
              width: 110,
              render: (_, r) => (
                <Switch
                  size="small"
                  disabled={!canEdit}
                  checked={r.pmsRecordsRequired}
                  onChange={(v) => patch(r.market, { pmsRecordsRequired: v })}
                />
              ),
            },
            {
              // One of question 4's fourteen enhanced-review conditions is
              // "market-specific vigilance requirement" — this is that flag.
              title: 'Enhanced surveillance',
              width: 140,
              render: (_, r) => (
                <Switch
                  size="small"
                  disabled={!canEdit}
                  checked={r.enhancedSurveillance}
                  onChange={(v) => patch(r.market, { enhancedSurveillance: v })}
                />
              ),
            },
            {
              title: 'Review interval (months)',
              width: 160,
              render: (_, r) => (
                <InputNumber
                  size="small"
                  min={1}
                  max={120}
                  disabled={!canEdit}
                  placeholder="company default"
                  value={r.reviewIntervalMonths}
                  onChange={(v) => patch(r.market, { reviewIntervalMonths: v ?? undefined })}
                />
              ),
            },
            {
              title: 'Required dossier type',
              width: 190,
              render: (_, r) => (
                <Input
                  size="small"
                  disabled={!canEdit}
                  placeholder="e.g. ASEAN PIF, EU CPSR"
                  value={r.dossierType}
                  onChange={(e) => patch(r.market, { dossierType: e.target.value })}
                />
              ),
            },
            {
              title: 'Claim restrictions',
              width: 240,
              render: (_, r) => (
                <Input.TextArea
                  size="small"
                  autoSize={{ minRows: 1, maxRows: 3 }}
                  disabled={!canEdit}
                  placeholder="Any restriction this market imposes on claims"
                  value={r.claimRestrictions}
                  onChange={(e) => patch(r.market, { claimRestrictions: e.target.value })}
                />
              ),
            },
            {
              title: 'Evidence link',
              width: 160,
              render: (_, r) => (
                <Input
                  size="small"
                  disabled={!canEdit}
                  value={r.evidenceLink}
                  onChange={(e) => patch(r.market, { evidenceLink: e.target.value })}
                />
              ),
            },
            {
              title: 'Reviewed',
              width: 140,
              render: (_, r) => (
                <Input
                  size="small"
                  type="date"
                  disabled={!canEdit}
                  value={r.reviewDate}
                  onChange={(e) => patch(r.market, { reviewDate: e.target.value })}
                />
              ),
            },
            {
              title: 'Last change',
              width: 160,
              render: (_, r) =>
                r.updatedBy ? (
                  <span style={{ fontSize: 12, color: TEXT.secondary }}>
                    {r.updatedBy}
                    {r.updatedAt ? ` · ${r.updatedAt.slice(0, 10)}` : ''}
                  </span>
                ) : (
                  <span style={{ color: TEXT.secondary }}>—</span>
                ),
            },
          ]}
        />
        {canEdit && <SaveBar dirty={dirty && !saving} onSave={save} onDiscard={discard} />}
      </Card>
    </div>
  );
}
