import { useEffect, useMemo, useState } from 'react';
import { Alert, Collapse, Modal, Spin, Table, Tag, Typography } from 'antd';
import type { GateContentChangedBody, GateEvidenceSnapshot, GateSigningPreview } from '@mbc360/shared/types';
import { REGISTER_CONFIGS } from '@mbc360/shared/config/registers';
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
    digest.split('|').filter(Boolean).map((p) => p.replace('=', ' — ').replace(/\/+$/g, ''));

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
            <Typography.Text type="secondary">{key}</Typography.Text>
            <Lines lines={tickedChecklist(digest)} />
          </div>
        ))}
      </Block>
      <Block title="Requirements owned by this gate" count={Object.keys(snapshot.requirements).length}>
        {Object.entries(snapshot.requirements).map(([key, digest]) => (
          <div key={key} style={{ marginBottom: 6 }}>
            <Typography.Text type="secondary">{key}</Typography.Text>
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
              label: name,
              children: (
                <pre style={{ margin: 0, maxHeight: 240, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{digest || '—'}</pre>
              ),
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
                label: name,
                children: (
                  <pre style={{ margin: 0, maxHeight: 240, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{digest || '—'}</pre>
                ),
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
  changed,
  onCancel,
  onContinue,
}: {
  open: boolean;
  projectId: string;
  gateId: string;
  market?: string;
  roleLabel: string;
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
      okButtonProps={{ disabled: !preview || loading }}
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
    </Modal>
  );
}
