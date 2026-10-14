import { useEffect, useState } from 'react';
import { Alert, Collapse, Input, Modal, Select, Spin, Table, Tag, Typography } from 'antd';
import type { PhaseSignPreview } from '@mbc360/shared/types';
import { GATE_PASSING_DECISIONS } from '@mbc360/shared/config/gateSignOff';
import { GATE_DECISIONS } from '@mbc360/shared/config/gates';
import { previewPhaseSignOff } from '../api/projectsApi';

// The phase's content as sections of tables — shared by the signing review and the History view of a signature already
// given, so what is read before signing and what is read afterwards are drawn by the same code.
export function PhaseContentSections({ sections }: { sections: PhaseSignPreview['sections'] }) {
  return (
    <Collapse
      size="small"
      defaultActiveKey={sections.map((_, i) => String(i)).filter((_, i) => sections[i].rows.length > 0).slice(0, 2)}
      items={sections.map((section, i) => ({
        key: String(i),
        label: (
          <span>
            {section.title} <Tag>{section.rows.length}</Tag>
          </span>
        ),
        children:
          section.rows.length === 0 ? (
            <Typography.Text type="secondary">Nothing recorded.</Typography.Text>
          ) : (
            <Table
              size="small"
              pagination={false}
              scroll={{ x: 'max-content' }}
              rowKey="__n"
              dataSource={section.rows.map((r, n) => ({ ...r, __n: String(n) }))}
              columns={section.columns.map((c) => ({
                title: c.label,
                dataIndex: c.key,
                render: (v: string | undefined) => v || <Typography.Text type="secondary">—</Typography.Text>,
              }))}
            />
          ),
      }))}
    />
  );
}

// What a phase signature attests to, on one screen, before the authenticator step: everything the phase
// page shows for that phase, exactly as it is now. Same idea as GateSignPreviewModal. What is shown is
// the server's own content — the object the hash is taken from — so there is no second rendering that
// could drift from what is actually signed, and the server refuses the signature if the phase changes
// after this screen was loaded.
export default function PhaseSignPreviewModal({
  open,
  projectId,
  phase,
  roleLabel,
  decision,
  comment,
  onChange,
  problem,
  earlier = [],
  changed = false,
  onCancel,
  onContinue,
}: {
  open: boolean;
  projectId: string;
  phase: number;
  roleLabel: string;
  // The signer's own decision and comment are entered HERE, beside the content they attest to (the same as a gate's
  // signing preview), so what is typed and what is shown are on one screen.
  decision?: string;
  comment?: string;
  onChange: (patch: { decision?: string; comments?: string }) => void;
  // Why the signature cannot be given yet (no decision, a missing comment); null when it can.
  problem: string | null;
  // Signatures already given on this phase, so the signer sees what the others decided before adding their own.
  earlier?: { role: string; name: string; decision: string; comment: string }[];
  // The phase changed while the signer was reading and was refused: say so, and the screen below is the NEW content.
  changed?: boolean;
  onCancel: () => void;
  onContinue: (preview: PhaseSignPreview) => void;
}) {
  const [preview, setPreview] = useState<PhaseSignPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Reloaded every time it opens: the point is that the signer reads what is there NOW.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPreview(null);
    previewPhaseSignOff(projectId, phase)
      .then((p) => {
        if (!cancelled) setPreview(p);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load the phase');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, projectId, phase]);

  return (
    <Modal
      open={open}
      width={980}
      title={`Review before signing — ${roleLabel}, Phase ${phase}`}
      okText="Continue to sign"
      okButtonProps={{ disabled: !preview || loading || !!problem }}
      onOk={() => preview && onContinue(preview)}
      onCancel={onCancel}
      destroyOnHidden
    >
      <Typography.Paragraph type="secondary">
        This is everything the phase page shows for Phase {phase}, as it is right now — what your signature will
        attest to. If any of it changes before you submit, you will be asked to review it again.
      </Typography.Paragraph>
      {changed && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          title="The phase changed after you opened the review"
          description="Your signature was not recorded. What is shown below is the phase as it is now — read it again before signing."
        />
      )}
      {earlier.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Already signed</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {earlier.map((e) => (
              <li key={e.role}>
                {e.role} · {e.name}{' '}
                <span className={`c-tag c-tag-dot ${GATE_PASSING_DECISIONS.includes(e.decision) ? 'c-tag-ok' : 'c-tag-warn'}`}>{e.decision}</span>
                {e.comment && <span style={{ color: '#666' }}> “{e.comment}”</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div style={{ display: 'grid', gap: 12, margin: '8px 0 16px' }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Your decision</span>
          <Select
            allowClear
            value={decision}
            placeholder="Select a decision"
            options={GATE_DECISIONS.filter((d) => d !== 'Backtrack').map((d) => ({ value: d, label: d }))}
            onChange={(v?: string) => onChange({ decision: v })}
          />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Comments / conditions</span>
          <Input.TextArea
            autoSize={{ minRows: 2, maxRows: 8 }}
            value={comment}
            placeholder="Required unless the decision is Proceed"
            onChange={(e) => onChange({ comments: e.target.value })}
          />
        </label>
        {problem && <Typography.Text type="danger">{problem}</Typography.Text>}
      </div>
      {error && <Alert type="error" showIcon title={error} />}
      {loading && !preview && <Spin />}
      {preview && (
        <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
          <PhaseContentSections sections={preview.sections} />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Content fingerprint {preview.hash.slice(0, 16)}… · loaded {new Date(preview.previewedAt).toLocaleTimeString()}
          </Typography.Text>
        </div>
      )}
    </Modal>
  );
}
