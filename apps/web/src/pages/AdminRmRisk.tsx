import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Checkbox, DatePicker, Empty, Input, Select, Space, Table, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { RawMaterialRisk, RmRiskFlag } from '@mbc360/shared/config/referenceData';
import { RM_RISK_FLAGS } from '@mbc360/shared/config/referenceData';
import { useAppStore } from '../store/useAppStore';
import { useSession } from '../auth/useSession';
import { canEditReferenceData, EMPTY_GRANTS } from '../utils/permissions';
import { useDraft } from '../hooks/useDraft';
import SaveBar from '../components/SaveBar';
import { cosmetriListRawMaterials, type CosmetriRawMaterialSummary } from '../integrations/cosmetri';
import { useCosmetriStatus } from '../integrations/useCosmetriStatus';
import { TEXT, TABLE_STICKY } from '../theme/tokens';

// Round 4 question 17 (2026-08-24): "Do not re-enter this per project… MBc360
// maintains a shared Raw Material Risk Overlay keyed to the Cosmetri raw-material
// ID. This is not a second raw-material master."
//
// A COMPANY-level screen, like Market profiles beside it. What makes this one
// different from a per-project register is precisely the thing the answer asks for:
// a material is classified ONCE and every project that uses it reads the same
// classification.
//
// The Gate 4 readiness item `sg04-allergen` reads this list through
// `ProjectData.reference.rmRisk`. A material with no row here counts as
// UNCLASSIFIED, which blocks Gate 4 — so an empty table is not a quiet default, it
// is visible as work outstanding. Which is why this page exists at all: without it
// the rule would be permanently unsatisfiable.

type Row = RawMaterialRisk & { isNew?: boolean };

const rawMaterialLabel = (r: CosmetriRawMaterialSummary) =>
  [r.tradeName || r.code, r.supplierName].filter(Boolean).join(' · ');

export default function AdminRmRisk() {
  const overlay = useAppStore((s) => s.rmRisk);
  const loadRmRisk = useAppStore((s) => s.loadRmRisk);
  const grants = useAppStore((s) => s.permissionGrid?.grants ?? EMPTY_GRANTS);
  const { user } = useSession();
  const connected = useCosmetriStatus().status.connected;
  const [saving, setSaving] = useState(false);
  const [catalogue, setCatalogue] = useState<CosmetriRawMaterialSummary[]>([]);
  const [adding, setAdding] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (overlay === null) void loadRmRisk();
  }, [overlay, loadRmRisk]);

  // The catalogue is only needed to ADD a material — an existing row is keyed by
  // rmCode and readable without it, so a Cosmetri outage degrades this page to
  // "you can edit what is here, you cannot add" instead of breaking it.
  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    void cosmetriListRawMaterials()
      .then((rows) => {
        if (!cancelled) setCatalogue(rows);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [connected]);

  // Checked against the REAL signed-in roles, not the "View as" simulator: this
  // edits a company-wide classification every project reads.
  const roleKeys = useMemo(() => (user?.roles ?? []).map((r) => r.key), [user]);
  const canEdit = canEditReferenceData(grants, roleKeys, 'rm-risk');

  const committed = useMemo<Row[]>(() => overlay ?? [], [overlay]);
  const { draft, dirty, update, markSaved, discard } = useDraft(committed);

  const patch = (rmCode: string, p: Partial<Row>) =>
    update((prev) => prev.map((r) => (r.rmCode === rmCode ? { ...r, ...p } : r)));

  const classified = new Set(draft.map((r) => r.rmCode));
  const addOptions = catalogue
    .filter((r) => !classified.has(`RM-${r.id}`))
    .map((r) => ({ value: `RM-${r.id}`, label: rawMaterialLabel(r) }));

  const addMaterial = (rmCode: string) => {
    const material = catalogue.find((r) => `RM-${r.id}` === rmCode);
    update((prev) => [
      // A brand-new row carries revision 0 and no flags, which is NOT yet a
      // classification: it becomes one on Save, when the server assigns revision 1.
      // Until then the material still counts as unclassified everywhere else.
      {
        id: rmCode,
        rmCode,
        displayName: material ? rawMaterialLabel(material) : undefined,
        flags: [],
        revision: 0,
        isNew: true,
      },
      ...prev,
    ]);
    setAdding(undefined);
  };

  // One request per changed row: the endpoint is an upsert keyed by rmCode and each
  // write gets its own revision, so batching would collapse several distinct
  // classification changes into one history entry.
  const save = async () => {
    const byCode = new Map(committed.map((r) => [r.rmCode, r]));
    const changed = draft.filter((d) => JSON.stringify({ ...d, isNew: undefined }) !== JSON.stringify(byCode.get(d.rmCode)));
    if (changed.length === 0) return;
    setSaving(true);
    try {
      for (const row of changed) {
        const res = await fetch(`/api/reference/rm-risk/${encodeURIComponent(row.rmCode)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patch: { ...row, isNew: undefined } }),
        });
        if (!res.ok) throw new Error((await res.json())?.message ?? 'Could not save');
      }
      await loadRmRisk();
      markSaved();
      message.success(`${changed.length} raw material(s) classified`);
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
        title="Company-level reference data — classify a material once, every project reads it"
        description="A material with no entry here is UNCLASSIFIED, not risk-free: Gate 4's allergen, impurity and contaminant review blocks until every material a project uses has been classified. Saving a row with no classification ticked is a real answer — it records that the material was assessed and carries none of these risks."
      />

      <Card
        size="small"
        title="Raw Material Risk Overlay"
        extra={
          <Space>
            {canEdit ? (
              <Tag color="blue">You may edit these</Tag>
            ) : (
              <Tag>Read-only — needs the raw-material risk capability</Tag>
            )}
            {canEdit && (
              <Select
                showSearch
                allowClear
                style={{ width: 320 }}
                value={adding}
                onChange={(v) => (v ? addMaterial(v) : setAdding(undefined))}
                placeholder={
                  connected
                    ? 'Add a material from the Cosmetri catalogue'
                    : 'Cosmetri is not connected — cannot add a material'
                }
                disabled={!connected}
                options={addOptions}
                optionFilterProp="label"
                suffixIcon={<PlusOutlined />}
              />
            )}
          </Space>
        }
      >
        {draft.length === 0 ? (
          <Empty
            description={
              overlay === null
                ? 'Loading…'
                : 'No material has been classified yet. Every project will show its raw materials as unclassified at Gate 4 until they are.'
            }
          />
        ) : (
          <Table
            size="small"
            rowKey={(r) => r.rmCode}
            dataSource={draft}
            pagination={false}
            sticky={TABLE_STICKY}
            scroll={{ x: 1400 }}
            columns={[
              {
                title: 'Raw material',
                width: 260,
                fixed: 'left',
                render: (_, r) => (
                  <Space orientation="vertical" size={0}>
                    <b>{r.displayName || r.rmCode}</b>
                    <span style={{ fontSize: 12, color: TEXT.secondary }}>
                      {r.rmCode}
                      {r.revision > 0 ? ` · rev ${r.revision}` : ' · not saved yet'}
                    </span>
                  </Space>
                ),
              },
              {
                title: 'Risk classifications',
                width: 560,
                render: (_, r) => (
                  <Checkbox.Group
                    disabled={!canEdit}
                    value={r.flags}
                    onChange={(next) => patch(r.rmCode, { flags: next as RmRiskFlag[] })}
                  >
                    <Space wrap size={[12, 4]}>
                      {RM_RISK_FLAGS.map((flag) => (
                        <Checkbox key={flag} value={flag}>
                          {flag}
                        </Checkbox>
                      ))}
                    </Space>
                  </Checkbox.Group>
                ),
              },
              {
                title: 'Evidence link',
                width: 180,
                render: (_, r) => (
                  <Input
                    disabled={!canEdit}
                    value={r.evidenceLink}
                    onChange={(e) => patch(r.rmCode, { evidenceLink: e.target.value })}
                  />
                ),
              },
              {
                title: 'Reviewed',
                width: 140,
                render: (_, r) => (
                  <DatePicker
                    disabled={!canEdit}
                    value={r.reviewDate ? dayjs(r.reviewDate) : null}
                    onChange={(d) => patch(r.rmCode, { reviewDate: d ? d.format('YYYY-MM-DD') : undefined })}
                  />
                ),
              },
              {
                title: 'Notes',
                width: 220,
                render: (_, r) => (
                  <Input.TextArea
                    autoSize={{ minRows: 1, maxRows: 3 }}
                    disabled={!canEdit}
                    value={r.notes}
                    onChange={(e) => patch(r.rmCode, { notes: e.target.value })}
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
        )}
        {canEdit && <SaveBar dirty={dirty && !saving} onSave={save} onDiscard={discard} />}
      </Card>

      {!connected && canEdit && (
        <Button type="link" href="#/integrations" style={{ alignSelf: 'start' }}>
          Connect Cosmetri to add materials
        </Button>
      )}
    </div>
  );
}
