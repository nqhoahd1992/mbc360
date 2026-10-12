import { useEffect, useState } from 'react';
import { Alert, Button, Spin, Table } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import type { GateSignedContent, GateSignOffEvent } from '@mbc360/shared/types';
import { getGateSignedContent } from '../api/projectsApi';
import { SnapshotBody } from './GateSignPreviewModal';
import './GateSignPreviewModal.css';

// Signatures given and withdrawn on a gate, newest first. Read from the audit trail, so a withdrawn signature —
// whose row is wiped — stays readable here. A row can be opened to read the content the signature attested to, as it
// was when signed (kept apart from this list because it is large). Shown in the gate's History popup and in the
// Gate sign-off card. The content replaces the list inside the SAME drawer (with a way back): every drawer in the app is
// exclusive, so a second one opened from here would close the one this list lives in.
export default function GateSignOffHistoryTable({ projectId, events }: { projectId: string; events: GateSignOffEvent[] }) {
  const [viewing, setViewing] = useState<GateSignOffEvent | null>(null);
  const [content, setContent] = useState<GateSignedContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!viewing?.signedAt) return;
    let cancelled = false;
    setLoading(true);
    setContent(null);
    setError(null);
    getGateSignedContent(projectId, viewing.gateId, viewing.role, viewing.signedAt, viewing.market)
      .then((c) => {
        if (!cancelled) setContent(c);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load the signed content');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewing, projectId]);

  if (viewing) {
    return (
      <div>
        <Button type="link" icon={<ArrowLeftOutlined />} style={{ paddingInline: 0 }} onClick={() => setViewing(null)}>
          Back to history
        </Button>
        <h3 style={{ margin: '4px 0 8px', fontSize: 16 }}>
          Signed content — {viewing.role}, {viewing.gateId}
          {viewing.market ? ` · ${viewing.market}` : ''}
        </h3>
        <p style={{ color: '#666', fontSize: 13, marginTop: 0 }}>
          Exactly what this signature attested to, as it stood when it was given
          {viewing.signedAt ? ` (${viewing.signedAt.slice(0, 16).replace('T', ' ')})` : ''}
          {content ? ` · fingerprint ${content.hash.slice(0, 12)}` : ''}.
          {viewing.kind === 'withdrawn' ? ' The signature has since been withdrawn.' : ''}
        </p>
        {loading && <Spin />}
        {error && <Alert type="info" showIcon message={error} />}
        {content && <SnapshotBody snapshot={content.snapshot} />}
      </div>
    );
  }

  return (
    <>
      <Table
        size="small"
        pagination={false}
        rowKey={(e) => e.id}
        dataSource={events}
        columns={[
          { title: 'Date', width: 140, dataIndex: 'date' },
          {
            title: 'Act',
            width: 170,
            render: (_, e) => (
              <span className={`c-tag ${e.kind === 'signed' ? 'c-tag-ok' : 'c-tag-warn'}`}>
                {e.kind === 'signed' ? 'Signed' : 'Withdrawn'} · {e.role}
              </span>
            ),
          },
          { title: 'By', width: 140, render: (_, e) => e.by ?? '—' },
          {
            title: 'Detail',
            render: (_, e) => (
              <>
                <span style={{ fontSize: 12, color: '#666' }}>
                  {[
                    e.market ? `Market: ${e.market}` : undefined,
                    e.decision ? `Decision: ${e.decision}` : e.kind === 'signed' ? 'Decision not recorded' : undefined,
                    e.comment ? `Comment: “${e.comment}”` : undefined,
                    e.kind === 'withdrawn' && e.signedAt ? `Had signed: ${e.signedAt.slice(0, 16).replace('T', ' ')}` : undefined,
                    e.reason ? `Reason: ${e.reason}` : undefined,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
                {e.signedAt && (
                  <div>
                    <Button type="link" size="small" style={{ paddingInline: 0 }} onClick={() => setViewing(e)}>
                      View what was {e.kind === 'signed' ? 'signed' : 'signed and withdrawn'}
                    </Button>
                  </div>
                )}
              </>
            ),
          },
        ]}
      />
    </>
  );
}
