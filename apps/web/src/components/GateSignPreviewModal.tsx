import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Collapse, Input, Modal, Radio, Spin, Table, Typography } from 'antd';
import { CheckCircleFilled, ExclamationCircleFilled } from '@ant-design/icons';
import { GATES, GATE_DECISIONS } from '@mbc360/shared/config/gates';
import { gateSignOffNeedsComment } from '@mbc360/shared/config/gateSignOff';
import type { GateContentChangedBody, GateEvidenceSnapshot, GateSigningPreview } from '@mbc360/shared/types';
import { REGISTER_CONFIGS } from '@mbc360/shared/config/registers';
import { PHASE_CONFIGS } from '@mbc360/shared/config/phases';
import { PROJECT_DATA_LABELS } from '@mbc360/shared/utils/gateSnapshot';
import { previewGateSignOff } from '../api/projectsApi';
import '../styles/concept.css';
import './GateSignPreviewModal.css';

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

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="gsp-section">
      <h3 className="gsp-h">
        {title}
        {count !== undefined && <span className="gsp-count">{count}</span>}
      </h3>
      {children}
    </section>
  );
}

function Lines({ lines }: { lines: string[] }) {
  if (lines.length === 0) return <Typography.Text type="secondary">Nothing recorded.</Typography.Text>;
  return (
    <ul className="gsp-lines">
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
  const checklists = Object.entries(snapshot.checklists);
  const requirements = Object.entries(snapshot.requirements);
  const doneChecks = snapshot.gateChecks.filter((c) => c.done).length;

  // Sections with nothing in them collapse into ONE line at the end instead of five headings
  // that each say "0": the reader still sees they were covered, without scrolling past them.
  const empty = [
    ...(snapshot.gateChecks.length === 0 ? ['Key Gate Checks'] : []),
    ...(checklists.length === 0 ? ['Checklists'] : []),
    ...(requirements.length === 0 ? ['Requirements'] : []),
    ...(accountableRegisters.length === 0 ? ['Registers'] : []),
    ...(snapshot.openActions.length === 0 ? ['Open actions accepted as conditions'] : []),
  ];

  return (
    <>
      <div className="gsp-facts">
        <span className="gsp-fact">
          <span className="gsp-fact-k">Stage status</span>
          <strong>{snapshot.status}</strong>
        </span>
        <span className="gsp-fact">
          <span className="gsp-fact-k">Formula version</span>
          <strong>{snapshot.formulaVersion}</strong>
        </span>
        {snapshot.market && (
          <span className="gsp-fact">
            <span className="gsp-fact-k">Market</span>
            <strong>{snapshot.market}</strong>
          </span>
        )}
        {snapshot.evidenceLinks.map((l) => (
          <span className="gsp-fact" key={l}>
            <span className="gsp-fact-k">Evidence link</span>
            <strong>{l}</strong>
          </span>
        ))}
      </div>

      {snapshot.gateChecks.length > 0 && (
        <Section title="Key Gate Checks">
          <ul className="gsp-checks">
            {snapshot.gateChecks.map((c) => (
              <li key={c.check}>
                {c.done ? (
                  <CheckCircleFilled className="gsp-ok" aria-label="Done" />
                ) : (
                  <ExclamationCircleFilled className="gsp-warn" aria-label="Not done" />
                )}
                <span className="gsp-check-text">
                  {c.check}
                  {c.notes && <span className="gsp-note"> — {c.notes}</span>}
                </span>
                <span className="gsp-ynna">{c.ynna || 'No answer'}</span>
              </li>
            ))}
          </ul>
          <div className="gsp-sub">
            {doneChecks} of {snapshot.gateChecks.length} done
          </div>
        </Section>
      )}

      {checklists.length > 0 && (
        <Section title="Ticked checklist options">
          {checklists.map(([key, digest]) => (
            <div key={key} className="gsp-group">
              <div className="gsp-group-title">{SECTION_TITLES[key] ?? humanize(key)}</div>
              <div className="gsp-chips">
                {tickedChecklist(digest).length === 0 ? (
                  <Typography.Text type="secondary">None ticked.</Typography.Text>
                ) : (
                  tickedChecklist(digest).map((o) => (
                    <span className="gsp-chip" key={o}>
                      {o}
                    </span>
                  ))
                )}
              </div>
            </div>
          ))}
        </Section>
      )}

      {requirements.length > 0 && (
        <Section title="Requirements owned by this gate" count={requirements.length}>
          {requirements.map(([key, digest]) => (
            <div key={key} className="gsp-group">
              <div className="gsp-group-title">{SECTION_TITLES[key] ?? humanize(key)}</div>
              <Lines lines={requirementLines(digest)} />
            </div>
          ))}
        </Section>
      )}

      {accountableRegisters.length > 0 && (
        <Section title="Registers this gate is accountable for" count={accountableRegisters.length}>
          <Collapse
            size="small"
            items={accountableRegisters.map(([key, digest]) => ({
              key,
              label: `${REGISTER_CONFIGS.find((c) => c.key === key)?.title ?? key} — ${digest ? digest.split('\n').length : 0} row(s)`,
              children: <RegisterBlock registerKey={key} digest={digest} />,
            }))}
          />
        </Section>
      )}

      {accountableData.length > 0 && (
        <Section title="Other project data this gate is accountable for" count={accountableData.length}>
          <Collapse
            size="small"
            items={accountableData.map(([name, digest]) => ({
              key: name,
              label: PROJECT_DATA_LABELS[name] ?? humanize(name),
              children: <ProjectDataBody digest={digest} />,
            }))}
          />
        </Section>
      )}

      {snapshot.openActions.length > 0 && (
        <Section title="Open actions accepted as conditions" count={snapshot.openActions.length}>
          <Lines lines={snapshot.openActions.map((a) => `${a.title || a.id} — ${a.status}, ${a.priority}`)} />
        </Section>
      )}

      {(laterRegisters.length > 0 || laterData.length > 0) && (
        <Section title="Filled in by later gates">
          <p className="gsp-sub gsp-sub-first">Shown for information. A change here does not stop you signing.</p>
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
        </Section>
      )}

      {empty.length > 0 && <p className="gsp-empty">Nothing recorded for: {empty.join(' · ')}.</p>}
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

  const needsComment = !!decision && gateSignOffNeedsComment(decision);
  const gateName = GATES.find((g) => g.id === gateId)?.name;

  return (
    <Modal
      open={open}
      width={840}
      style={{ top: 24 }}
      rootClassName="concept-tokens gsp-modal"
      title={
        <div className="gsp-title">
          <span className="gsp-title-main">Review before signing</span>
          <span className="gsp-title-meta">
            <span className="gsp-role">{roleLabel}</span>
            <span>
              {gateId}
              {gateName ? ` · ${gateName}` : ''}
              {market ? ` · ${market}` : ''}
            </span>
          </span>
        </div>
      }
      onCancel={onCancel}
      destroyOnClose
      footer={
        <div className="gsp-footer">
          <span className="gsp-fingerprint">
            {preview ? `Fingerprint ${preview.hash.slice(0, 12)} · loaded ${new Date(preview.previewedAt).toLocaleTimeString()}` : ''}
          </span>
          <span className="gsp-footer-actions">
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="primary" disabled={!preview || loading || !!problem} onClick={() => preview && onContinue(preview)}>
              Continue to sign
            </Button>
          </span>
        </div>
      }
    >
      <p className="gsp-intro">
        Your signature attests to everything below as it is now. If any of it changes before you submit, you will be
        asked to review it again.
      </p>
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
        <div className="gsp-scroll" tabIndex={0} aria-label="Evidence this signature attests to">
          <SnapshotBody snapshot={preview.snapshot} />
        </div>
      )}

      <div className="gsp-decision">
        {warning && <Alert type="warning" showIcon style={{ marginBottom: 12 }} message={warning} />}
        <div className="gsp-field-label" id="gsp-decision-label">
          Your decision <span className="gsp-req">*</span>
        </div>
        <Radio.Group
          className="gsp-radios"
          optionType="button"
          buttonStyle="solid"
          aria-labelledby="gsp-decision-label"
          value={decision}
          onChange={(e) => onDecisionChange({ decision: e.target.value })}
          options={GATE_DECISIONS.map((d) => ({ value: d, label: d }))}
        />
        <div className="gsp-field-label" style={{ marginTop: 12 }}>
          Comment{' '}
          {needsComment ? (
            <span className="gsp-req">* required for “{decision}”</span>
          ) : (
            <span className="gsp-optional">· optional for a clean Proceed</span>
          )}
        </div>
        <Input.TextArea
          autoSize={{ minRows: 2, maxRows: 6 }}
          status={needsComment && !comment?.trim() ? 'warning' : undefined}
          placeholder={needsComment ? 'Say why — this is recorded with your signature' : 'Add a note for the record (optional)'}
          value={comment}
          onChange={(e) => onDecisionChange({ comment: e.target.value })}
        />
        {problem && <div className="gsp-problem">{problem}</div>}
      </div>
    </Modal>
  );
}
