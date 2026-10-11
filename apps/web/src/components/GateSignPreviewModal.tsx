import { useEffect, useMemo, useState } from 'react';
import { Alert, Collapse, Input, Modal, Select, Spin, Table, Tag, Typography } from 'antd';
import { GATE_DECISIONS } from '@mbc360/shared/config/gates';
import { gateSignOffNeedsComment } from '@mbc360/shared/config/gateSignOff';
import type { GateContentChangedBody, GateEvidenceSnapshot, GateSigningPreview } from '@mbc360/shared/types';
import { REGISTER_CONFIGS } from '@mbc360/shared/config/registers';
import { PHASE_CONFIGS } from '@mbc360/shared/config/phases';
import { PROJECT_DATA_LABELS } from '@mbc360/shared/utils/gateSnapshot';
import { previewGateSignOff } from '../api/projectsApi';

// The whole of what a signature attests to, on one screen, before the authenticator step. The gate's
// evidence comes from many pages, so the signer cannot be expected to have looked at all of it; the
// hash shown here is what the signature is then bound to, and the server refuses the submit if the
// part the signer is accountable for has changed since this screen was loaded.
//
// What is shown is the server's snapshot itself, not a summary: the same object the hash is taken
// from, so there is no second rendering that could drift from what is actually signed.

interface ParsedRow {
  [column: string]: string;
}

// "#0|rmCode=RM-1|inciName=Aqua" per line (gateSnapshot.ts digestRegisterCells).
function parseCells(digest: string): ParsedRow[] {
  if (!digest) return [];
  return digest.split('\n').map((line) => {
    const row: ParsedRow = {};
    for (const part of line.split('|')) {
      const at = part.indexOf('=');
      if (at > 0) row[part.slice(0, at)] = part.slice(at + 1);
    }
    return row;
  });
}

function RegisterBlock({ registerKey, digest }: { registerKey: string; digest: string }) {
  const config = REGISTER_CONFIGS.find((c) => c.key === registerKey);
  const rows = useMemo(() => parseCells(digest), [digest]);
  const columnKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
    return [...keys];
  }, [rows]);
  if (rows.length === 0) return <Typography.Text type="secondary">No rows.</Typography.Text>;
  return (
    <Table
      size="small"
      pagination={false}
      scroll={{ x: 'max-content', y: 260 }}
      rowKey="__n"
      dataSource={rows.map((r, i) => ({ ...r, __n: String(i + 1) }))}
      columns={[
        { title: '#', dataIndex: '__n', width: 44 },
        ...columnKeys
          .filter((k) => !k.startsWith('#'))
          .map((k) => ({
            title: config?.columns.find((c) => c.key === k)?.label ?? k,
            dataIndex: k,
            render: (v: string | undefined) => v || <Typography.Text type="secondary">—</Typography.Text>,
          })),
      ]}
    />
  );
}

// The title a person sees for a checklist or requirement section, not its config key.
const SECTION_TITLES: Record<string, string> = Object.fromEntries(
  Object.values(PHASE_CONFIGS).flatMap((p) => [...p.checklistSections, ...p.requirementSections].map((s) => [s.key, s.title])),
);

// "initialScope" -> "Initial scope".
function humanize(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_.]/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

const DASH = <Typography.Text type="secondary">—</Typography.Text>;

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);
}

// The server's project-data digests are stable JSON; shown as a person would read them: labelled
// fields, lists as comma-separated text, lists of records as small tables, never braces and quotes.
function Value({ value }: { value: unknown }): React.ReactElement {
  if (isEmpty(value)) return DASH;
  if (typeof value === 'boolean') return <>{value ? 'Yes' : 'No'}</>;
  if (Array.isArray(value)) {
    if (value.every((v) => v === null || typeof v !== 'object')) return <>{value.map(String).join(', ')}</>;
    const rows = value.filter((v): v is Record<string, unknown> => !!v && typeof v === 'object');
    const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter((k) => rows.some((r) => !isEmpty(r[k]) && typeof r[k] !== 'object'));
    return (
      <Table
        size="small"
        pagination={false}
        scroll={{ x: 'max-content', y: 240 }}
        rowKey="__n"
        dataSource={rows.map((r, i) => ({ ...r, __n: i }))}
        columns={cols.map((k) => ({
          title: humanize(k),
          dataIndex: k,
          render: (v: unknown) => <Value value={v} />,
        }))}
      />
    );
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      <div>
        {entries.map(([k, v]) => (
          <div key={k} style={{ marginBottom: 4 }}>
            <Typography.Text type="secondary">{humanize(k)}: </Typography.Text>
            <Value value={v} />
          </div>
        ))}
      </div>
    );
  }
  return <>{String(value)}</>;
}

function ProjectDataBody({ digest }: { digest: string }) {
  if (!digest) return DASH;
  let parsed: unknown;
  try {
    parsed = JSON.parse(digest);
  } catch {
    return <>{digest}</>;
  }
  return <Value value={parsed} />;
}

function Block({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <Typography.Text strong>{title}</Typography.Text>
      {count !== undefined && <Tag style={{ marginLeft: 8 }}>{count}</Tag>}
      <div style={{ marginTop: 6 }}>{children}</div>
    </div>
  );
}

function Lines({ lines }: { lines: string[] }) {
  if (lines.length === 0) return <Typography.Text type="secondary">Nothing recorded.</Typography.Text>;
  return (
    <ul style={{ margin: 0, paddingLeft: 18 }}>
      {lines.map((l, i) => (
        <li key={i}>{l}</li>
      ))}
    </ul>
  );
}

function SnapshotBody({ snapshot }: { snapshot: GateEvidenceSnapshot }) {
  const tickedChecklist = (digest: string): string[] =>
    digest
      .split('|')
      .filter((p) => p.includes('=Y/'))
      .map((p) => p.replace(/=Y\/.*$/, ''));
  const requirementLines = (digest: string): string[] =>
    digest.split('|').filter(Boolean).map((p) => {
      // "requirement=status/priority/N-A rationale/evidence link" -> "requirement — status · priority · …"
      const at = p.indexOf('=');
      const parts = p.slice(at + 1).split('/').filter(Boolean);
      return parts.length ? `${p.slice(0, at)} — ${parts.join(' · ')}` : p.slice(0, at);
    });

  const accountableRegisters = Object.entries(snapshot.registerCells ?? snapshot.registers);
  const accountableData = Object.entries(snapshot.projectData ?? {});
  const laterRegisters = Object.entries(snapshot.registerLater ?? {}).filter(([, d]) => d !== '');
  const laterData = Object.entries(snapshot.projectDataLater ?? {});

  return (
    <>
      <Block title="Gate">
        <Lines
          lines={[
            `Stage status: ${snapshot.status}`,
            `Formula version: ${snapshot.formulaVersion}`,
            ...(snapshot.market ? [`Market: ${snapshot.market}`] : []),
            ...snapshot.evidenceLinks.map((l) => `Evidence link: ${l}`),
          ]}
        />
      </Block>
      <Block title="Key Gate Checks" count={snapshot.gateChecks.length}>
        <Lines
          lines={snapshot.gateChecks.map(
            (c) => `${c.check} — ${c.done ? 'done' : 'not done'} (${c.ynna || 'no answer'})${c.notes ? ` — ${c.notes}` : ''}`,
          )}
        />
      </Block>
      <Block title="Checklists (ticked options)" count={Object.keys(snapshot.checklists).length}>
        {Object.entries(snapshot.checklists).map(([key, digest]) => (
          <div key={key} style={{ marginBottom: 6 }}>
            <Typography.Text type="secondary">{SECTION_TITLES[key] ?? humanize(key)}</Typography.Text>
            <Lines lines={tickedChecklist(digest)} />
          </div>
        ))}
      </Block>
      <Block title="Requirements owned by this gate" count={Object.keys(snapshot.requirements).length}>
        {Object.entries(snapshot.requirements).map(([key, digest]) => (
          <div key={key} style={{ marginBottom: 6 }}>
            <Typography.Text type="secondary">{SECTION_TITLES[key] ?? humanize(key)}</Typography.Text>
            <Lines lines={requirementLines(digest)} />
          </div>
        ))}
      </Block>
      <Block title="Registers (columns this gate is accountable for)" count={accountableRegisters.length}>
        <Collapse
          size="small"
          items={accountableRegisters.map(([key, digest]) => ({
            key,
            label: `${REGISTER_CONFIGS.find((c) => c.key === key)?.title ?? key} — ${digest ? digest.split('\n').length : 0} row(s)`,
            children: <RegisterBlock registerKey={key} digest={digest} />,
          }))}
        />
      </Block>
      {accountableData.length > 0 && (
        <Block title="Other project data this gate is accountable for" count={accountableData.length}>
          <Collapse
            size="small"
            items={accountableData.map(([name, digest]) => ({
              key: name,
              label: PROJECT_DATA_LABELS[name] ?? humanize(name),
              children: <ProjectDataBody digest={digest} />,
            }))}
          />
        </Block>
      )}
      <Block title="Open actions accepted as conditions" count={snapshot.openActions.length}>
        <Lines lines={snapshot.openActions.map((a) => `${a.title || a.id} — ${a.status}, ${a.priority}`)} />
      </Block>
      {(laterRegisters.length > 0 || laterData.length > 0) && (
        <Block title="Filled in by later gates — shown for information; a change here does not stop you signing">
          <Collapse
            size="small"
            items={[
              ...laterRegisters.map(([key, digest]) => ({
                key: `r-${key}`,
                label: REGISTER_CONFIGS.find((c) => c.key === key)?.title ?? key,
                children: <RegisterBlock registerKey={key} digest={digest} />,
              })),
              ...laterData.map(([name, digest]) => ({
                key: `d-${name}`,
                label: PROJECT_DATA_LABELS[name] ?? humanize(name),
                children: <ProjectDataBody digest={digest} />,
              })),
            ]}
          />
        </Block>
      )}
    </>
  );
}

export default function GateSignPreviewModal({
  open,
  projectId,
  gateId,
  market,
  roleLabel,
  decision,
  comment,
  onDecisionChange,
  problem,
  warning,
  changed,
  onCancel,
  onContinue,
}: {
  open: boolean;
  projectId: string;
  gateId: string;
  market?: string;
  roleLabel: string;
  // The signer's decision and comment are entered HERE, beside the evidence they attest to, and kept by the
  // caller so they survive a re-review after the evidence changed.
  decision?: string;
  comment?: string;
  onDecisionChange: (p: { decision?: string; comment?: string }) => void;
  // Why the decision cannot be signed yet (none chosen, comment missing, stage not Complete), or null.
  problem: string | null;
  // A warning about the decision itself (open change control), shown above the form.
  warning?: string | null;
  // The refusal from the last attempt, when the evidence changed after the previous preview.
  changed: GateContentChangedBody | null;
  onCancel: () => void;
  onContinue: (preview: GateSigningPreview) => void;
}) {
  const [preview, setPreview] = useState<GateSigningPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Reloaded every time it opens, and again when a refusal comes back: the point is that the signer
  // reads what is there NOW.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    previewGateSignOff(projectId, gateId, market)
      .then((p) => {
        if (!cancelled) setPreview(p);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load the evidence');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, projectId, gateId, market, changed]);

  return (
    <Modal
      open={open}
      width={920}
      title={`Review before signing — ${roleLabel}, ${gateId}${market ? ` (${market})` : ''}`}
      okText="Continue to sign"
      okButtonProps={{ disabled: !preview || loading || !!problem }}
      onOk={() => preview && onContinue(preview)}
      onCancel={onCancel}
      destroyOnClose
    >
      <Typography.Paragraph type="secondary">
        This is everything your signature will attest to, as it is right now. If any of it changes before you
        submit, you will be asked to review it again.
      </Typography.Paragraph>
      {changed && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message={changed.message}
          description={
            <>
              {changed.changes.length > 0 && <Lines lines={changed.changes} />}
              {changed.editedBy.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <Typography.Text type="secondary">
                    Edited since you opened it:{' '}
                    {changed.editedBy.map((e) => `${e.by} (${e.action.replace(/[._]/g, ' ')})`).join(', ')}
                  </Typography.Text>
                </div>
              )}
            </>
          }
        />
      )}
      {error && <Alert type="error" showIcon message={error} />}
      {loading && !preview && <Spin />}
      {preview && (
        <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
          <SnapshotBody snapshot={preview.snapshot} />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Content fingerprint {preview.hash.slice(0, 16)}… · loaded {new Date(preview.previewedAt).toLocaleTimeString()}
          </Typography.Text>
        </div>
      )}
      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--ant-color-border-secondary, #f0f0f0)' }}>
        {warning && <Alert type="warning" showIcon style={{ marginBottom: 12 }} message={warning} />}
        <div style={{ marginBottom: 8 }}>
          <Typography.Text strong>
            Your decision <Typography.Text type="danger">*</Typography.Text>
          </Typography.Text>
          <Select
            style={{ width: '100%', marginTop: 4 }}
            allowClear
            placeholder="Decision"
            status={!decision ? 'warning' : undefined}
            value={decision}
            options={GATE_DECISIONS.map((d) => ({ value: d, label: d }))}
            onChange={(v?: string) => onDecisionChange({ decision: v })}
          />
        </div>
        <div>
          <Typography.Text strong>
            Comment
            {!!decision && gateSignOffNeedsComment(decision) ? (
              <Typography.Text type="danger"> * required for "{decision}"</Typography.Text>
            ) : (
              <Typography.Text type="secondary"> (optional for a clean Proceed)</Typography.Text>
            )}
          </Typography.Text>
          <Input.TextArea
            style={{ marginTop: 4 }}
            autoSize={{ minRows: 2, maxRows: 8 }}
            status={!!decision && gateSignOffNeedsComment(decision) && !comment?.trim() ? 'warning' : undefined}
            placeholder="Required for anything other than a clean Proceed"
            value={comment}
            onChange={(e) => onDecisionChange({ comment: e.target.value })}
          />
        </div>
        {problem && (
          <Typography.Text type="secondary" style={{ display: 'block', marginTop: 6 }}>
            {problem}
          </Typography.Text>
        )}
      </div>
    </Modal>
  );
}
