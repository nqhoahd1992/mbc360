import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Collapse, Input, Modal, Radio, Spin, Table, Typography } from 'antd';
import { CheckCircleFilled, ExclamationCircleFilled } from '@ant-design/icons';
import { GATES, GATE_DECISIONS } from '@mbc360/shared/config/gates';
import { GATE_PASSING_DECISIONS, gateSignOffNeedsComment } from '@mbc360/shared/config/gateSignOff';
import type { GateContentChangedBody, GateEvidenceSnapshot, GateSignOffRole, GateSigningPreview } from '@mbc360/shared/types';
import { REGISTER_CONFIGS } from '@mbc360/shared/config/registers';
import { PHASE_CONFIGS } from '@mbc360/shared/config/phases';
import { PROJECT_DATA_LABELS } from '@mbc360/shared/utils/gateSnapshot';
import { previewGateSignOff, verifyGateSignOffStepUp } from '../api/projectsApi';
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

// Names as the page itself prints them, so the signer finds the same words they filled in.
const FIELD_LABELS: Record<string, string> = {
  requesterName: 'Requester name',
  requesterDepartment: 'Requester department',
  initialScope: 'Initial product scope',
  initialTargetUsers: 'Initial target user / life-stage',
};
const DATA_TITLES: Record<string, string> = {
  identity: 'Opportunity & Request',
  'identity.markets': 'Countries / Markets',
};
const dataTitle = (name: string) => DATA_TITLES[name] ?? PROJECT_DATA_LABELS[name] ?? humanize(name);

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
          title: FIELD_LABELS[k] ?? humanize(k),
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
            <Typography.Text type="secondary">{FIELD_LABELS[k] ?? humanize(k)}: </Typography.Text>
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

export function SnapshotBody({ snapshot }: { snapshot: GateEvidenceSnapshot }) {
  // "label=Y/status/P/evidenceLink" per option (gateSnapshot.ts digestChecklists).
  const tickedChecklist = (digest: string): { label: string; status: string; primary: boolean; link: string }[] =>
    digest
      .split('|')
      .filter((p) => p.includes('=Y/'))
      .map((p) => {
        const at = p.indexOf('=Y/');
        const [status = '', primary = '', ...link] = p.slice(at + 3).split('/');
        return { label: p.slice(0, at), status, primary: primary === 'P', link: link.join('/') };
      });
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
  const full = snapshot.fullRecord;
  const gateRec = full?.gate ?? {};
  const GAP_LABELS: [string, string][] = [
    ['gapCriticality', 'Criticality'],
    ['gapImpactCategory', 'Impact category'],
    ['gapAssessor', 'Assessor'],
    ['gapAssessmentDate', 'Assessment date'],
    ['gapRationale', 'Rationale'],
    ['gapEvidenceLink', 'Evidence link'],
    ['gapRequiredAction', 'Required action'],
    ['gapActionOwner', 'Action owner'],
  ];
  const gapFields = GAP_LABELS.filter(([k]) => (gateRec[k] ?? '') !== '').map(([k, label]) => [label, gateRec[k]] as const);

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
        {snapshot.formulaVersion && (
          <span className="gsp-fact">
            <span className="gsp-fact-k">Formula version</span>
            <strong>{snapshot.formulaVersion}</strong>
          </span>
        )}
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
        {gateRec.owner && (
          <span className="gsp-fact">
            <span className="gsp-fact-k">Owner</span>
            <strong>{gateRec.owner}</strong>
          </span>
        )}
        {gateRec.dueDate && (
          <span className="gsp-fact">
            <span className="gsp-fact-k">Due date</span>
            <strong>{gateRec.dueDate}</strong>
          </span>
        )}
      </div>
      {gateRec.notes && (
        <Section title="Gate notes / blockers">
          <p className="gsp-prose">{gateRec.notes}</p>
        </Section>
      )}
      {gapFields.length > 0 && (
        <Section title="Gap assessment">
          <div className="gsp-data">
            {gapFields.map(([label, value]) => (
              <div key={label} className="gsp-kv">
                <span className="gsp-k">{label}: </span>
                {value}
              </div>
            ))}
          </div>
        </Section>
      )}

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
                  {(() => {
                    const d = full?.gateChecks[c.check];
                    const bits = d
                      ? ([['Date', d.date], ['Initials', d.initials], ['Evidence', d.evidenceRef], ['Method', d.methodRef], ['Link', d.internalLink]] as const).filter(([, v]) => v)
                      : [];
                    return bits.length > 0 ? (
                      <span className="gsp-meta">{bits.map(([k, v]) => `${k}: ${v}`).join(' · ')}</span>
                    ) : null;
                  })()}
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
              {tickedChecklist(digest).length === 0 ? (
                <Typography.Text type="secondary">None ticked.</Typography.Text>
              ) : (
                <ul className="gsp-options">
                  {tickedChecklist(digest).map((o) => {
                    const detail = full?.checklists[key]?.find((x) => x.label === o.label);
                    const bits = [
                      o.primary ? 'Primary' : '',
                      o.status ? `Status ${o.status}` : '',
                      detail?.owner ? `Owner / function: ${detail.owner}` : '',
                      o.link ? `Link: ${o.link}` : '',
                      detail?.notes ? `Notes: ${detail.notes}` : '',
                    ].filter(Boolean);
                    return (
                      <li key={o.label}>
                        <span className="gsp-chip">{o.label}</span>
                        {bits.length > 0 && <span className="gsp-meta">{bits.join(' · ')}</span>}
                      </li>
                    );
                  })}
                </ul>
              )}
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
              {(full?.requirements[key] ?? []).some((r) => r.owner || r.notes || r.requirementText) && (
                <ul className="gsp-options">
                  {(full?.requirements[key] ?? [])
                    .filter((r) => r.owner || r.notes || r.requirementText)
                    .map((r) => (
                      <li key={r.requirement}>
                        <span className="gsp-chip">{r.requirement}</span>
                        <span className="gsp-meta">
                          {[r.requirementText, r.owner && `Owner: ${r.owner}`, r.notes && `Notes: ${r.notes}`].filter(Boolean).join(' · ')}
                        </span>
                      </li>
                    ))}
                </ul>
              )}
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

      {/* Small slices (the Opportunity & Request fields, an assessment) are shown open: a collapsed row labelled
          with a config name read as "missing". Large ones (BOM, costing) stay one click away. */}
      {accountableData.map(([name, digest]) =>
        (digest ?? '').length <= 600 ? (
          <Section key={name} title={dataTitle(name)}>
            <div className="gsp-data">
              {name === 'identity' &&
                full?.request &&
                ([['Requester name', full.request.requesterName], ['Requester department', full.request.requesterDepartment]] as const).map(([label, value]) => (
                  <div key={label} className="gsp-kv">
                    <span className="gsp-k">{label}: </span>
                    {value || DASH}
                  </div>
                ))}
              <ProjectDataBody digest={digest} />
            </div>
          </Section>
        ) : (
          <Section key={name} title={dataTitle(name)}>
            <Collapse
              size="small"
              items={[{ key: name, label: `Show ${dataTitle(name).toLowerCase()}`, children: <ProjectDataBody digest={digest} /> }]}
            />
          </Section>
        ),
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
                label: dataTitle(name),
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
  role,
  decision,
  comment,
  onDecisionChange,
  problem,
  warning,
  earlier = [],
  changed,
  onCancel,
  onSign,
}: {
  open: boolean;
  projectId: string;
  gateId: string;
  market?: string;
  roleLabel: string;
  role: GateSignOffRole;
  // The signer's decision and comment are entered HERE, beside the evidence they attest to, and kept by the
  // caller so they survive a re-review after the evidence changed.
  decision?: string;
  comment?: string;
  onDecisionChange: (p: { decision?: string; comment?: string }) => void;
  // Why the decision cannot be signed yet (none chosen, comment missing, stage not Complete), or null.
  problem: string | null;
  // A warning about the decision itself (open change control), shown above the form.
  warning?: string | null;
  // What the roles that already signed this lane decided and wrote, shown above the signer's own choice so a
  // difference is seen, not discovered later (information only — nothing is blocked, SW-27).
  earlier?: { role: string; name: string; decision: string; comment: string }[];
  // The refusal from the last attempt, when the evidence changed after the previous preview.
  changed: GateContentChangedBody | null;
  onCancel: () => void;
  // Called once the authenticator code has been verified here, with the proof the signature spends.
  onSign: (preview: GateSigningPreview, stepUpToken: string) => void;
}) {
  const [preview, setPreview] = useState<GateSigningPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // The authenticator step is part of this same screen: one place to read, decide and confirm it is you.
  const [code, setCode] = useState('');
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);

  // Reloaded every time it opens, and again when a refusal comes back: the point is that the signer
  // reads what is there NOW.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setCode('');
    setSignError(null);
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

  const submit = async () => {
    if (!preview || signing || loading || problem) return;
    if (code.length !== 6) {
      setSignError('Enter the 6 digits currently shown in your authenticator app');
      return;
    }
    setSigning(true);
    setSignError(null);
    try {
      const { stepUpToken } = await verifyGateSignOffStepUp(projectId, gateId, market, role, code, preview.hash);
      setCode('');
      onSign(preview, stepUpToken);
    } catch (e) {
      setSignError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setSigning(false);
    }
  };

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
            <Button
              type="primary"
              loading={signing}
              disabled={!preview || loading || !!problem || code.length !== 6}
              onClick={submit}
            >
              Verify and sign
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
        {earlier.length > 0 && (
          <div className="gsp-earlier">
            <div className="gsp-field-label">Already signed</div>
            <ul>
              {earlier.map((e) => (
                <li key={e.role}>
                  <span className="gsp-earlier-who">
                    {e.role} · {e.name}
                  </span>
                  <span className={`c-tag c-tag-dot ${GATE_PASSING_DECISIONS.includes(e.decision) ? 'c-tag-ok' : 'c-tag-warn'}`}>
                    {e.decision}
                  </span>
                  {e.comment && <span className="gsp-earlier-comment">“{e.comment}”</span>}
                </li>
              ))}
            </ul>
            {!!decision && earlier.some((e) => e.decision !== decision) && (
              <Alert
                type="warning"
                showIcon
                style={{ marginTop: 8 }}
                message={`Your decision (${decision}) differs from ${earlier
                  .filter((e) => e.decision !== decision)
                  .map((e) => `${e.role} (${e.decision})`)
                  .join(' and ')}. You may still sign — yours is the gate decision.`}
              />
            )}
          </div>
        )}
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
          options={GATE_DECISIONS.filter((d) => d !== 'Backtrack').map((d) => ({ value: d, label: d }))}
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

        <div className="gsp-field-label" style={{ marginTop: 12 }}>
          Authenticator code <span className="gsp-req">*</span>
        </div>
        <Input
          className="gsp-code"
          maxLength={6}
          inputMode="numeric"
          autoComplete="one-time-code"
          spellCheck={false}
          name="gateSignOtp"
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          onPressEnter={submit}
        />
        <div className="gsp-hint">
          The current 6-digit code from your authenticator app. Signing attaches your saved signature to this gate.
        </div>
        {signError && <Alert type="error" showIcon style={{ marginTop: 8 }} message={signError} />}
      </div>
    </Modal>
  );
}
