import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Empty, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PROJECT_WIDE_AUTHORITY,
  independentFunctionsByGate,
  roleMatrix,
  type RoleMatrixRow,
} from '@mbc360/shared/utils/roleMatrix';
import { useAppStore } from '../store/useAppStore';
import '../styles/concept.css';
import './ProjectOverview.css';

// The authorised role matrix (Round 5 question 37(b), 2026-11-06): who holds every role on this project and what each role is
// authorised to do, on one page the review team can read and confirm. Read-only and GENERATED — every figure comes from the
// configuration the rules themselves use (see utils/roleMatrix.ts), so nothing on this page can disagree with what the
// application enforces. What it shows is our reading until the review team confirms it [ASSUMPTION: R6-Q2].

const KIND_LABEL: Record<RoleMatrixRow['kind'], string> = {
  area: 'Review area',
  function: 'Function',
  specialist: 'Specialist',
};

const gateNumber = (gateId: string) => gateId.replace('SG', 'Gate ');

export default function RoleMatrix() {
  const { projectId } = useParams();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const rows = useMemo(() => (project ? roleMatrix(project) : []), [project]);
  const gates = useMemo(() => independentFunctionsByGate(), []);

  if (!project) return <Empty description="Not found" />;

  const columns: ColumnsType<RoleMatrixRow> = [
    {
      title: 'Role',
      dataIndex: 'label',
      render: (_: string, row) => (
        <div>
          <strong>{row.label}</strong>
          <div>
            <Tag>{KIND_LABEL[row.kind]}</Tag>
            {row.parentLabel && <span className="po-muted">inside {row.parentLabel}</span>}
          </div>
        </div>
      ),
    },
    {
      title: 'Named when the project is created',
      dataIndex: 'requiredAtCreation',
      width: 150,
      render: (required: boolean) => (required ? 'Required' : 'Optional'),
    },
    {
      title: 'Held on this project by',
      dataIndex: 'holder',
      render: (holder: string | undefined) =>
        holder ?? <Tag color="orange">Unassigned</Tag>,
    },
    {
      title: 'Sheets it owns · co-reviews · co-signs',
      width: 190,
      render: (_: unknown, row) => `${row.sheetsOwned} · ${row.sheetsCoReviewed} · ${row.sheetsCoSigned}`,
    },
    {
      title: 'Acknowledges "not applicable" reasons for',
      width: 170,
      render: (_: unknown, row) => (row.acknowledges.length > 0 ? `${row.acknowledges.length} items (open the row)` : '—'),
    },
    {
      title: 'Also authorised to',
      render: (_: unknown, row) => (row.alsoAuthorised.length > 0 ? row.alsoAuthorised.join('; ') : '—'),
    },
  ];

  return (
    <div className="concept">
      <div>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Role &amp; Authority Matrix
        </Typography.Title>
        <Typography.Text type="secondary">
          Who holds each role on <b>{project.identity.id}</b> and what each role is authorised to do. This page is generated from the
          same configuration the application enforces, so it cannot disagree with it, and it cannot be edited here. It shows how the
          software development team has read the review team&apos;s answers; the review team will be asked to confirm it.
        </Typography.Text>
      </div>

      <section className="c-card" style={{ padding: 16 }}>
        <Typography.Title level={5} style={{ marginTop: 0 }}>
          Roles on this project
        </Typography.Title>
        <Table<RoleMatrixRow>
          size="middle"
          rowKey="key"
          columns={columns}
          dataSource={rows}
          pagination={false}
          scroll={{ x: 'max-content' }}
          expandable={{
            rowExpandable: (row) => row.acknowledges.length > 0,
            expandedRowRender: (row) => (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {row.acknowledges.map((a) => (
                  <li key={`${a.gateId}-${a.itemId}`}>
                    <b>{gateNumber(a.gateId)}</b> — {a.label}
                    {a.togetherWith.length > 0 && <span className="po-muted"> · together with {a.togetherWith.join(' and ')}</span>}
                    {a.orInstead.length > 0 && <span className="po-muted"> · or {a.orInstead.join(' or ')} instead</span>}
                  </li>
                ))}
              </ul>
            ),
          }}
        />
        <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
          A role nobody holds reads <b>Unassigned</b>. Whatever needs that role waits; nobody is substituted for it, the Lead and
          administrators included. Only the optional roles can be empty, and they are used to acknowledge "not applicable" reasons.
          Gate, phase and market decisions follow people the Lead nominated or review areas named when the project was created.
        </Typography.Paragraph>
      </section>

      <section className="c-card" style={{ padding: 16 }}>
        <Typography.Title level={5} style={{ marginTop: 0 }}>
          Authority that follows the project&apos;s assignment, not a role
        </Typography.Title>
        <Table
          size="middle"
          rowKey="action"
          pagination={false}
          dataSource={PROJECT_WIDE_AUTHORITY}
          columns={[
            { title: 'Action', dataIndex: 'action' },
            { title: 'Who may', dataIndex: 'whoMay' },
          ]}
        />
      </section>

      <section className="c-card" style={{ padding: 16 }}>
        <Typography.Title level={5} style={{ marginTop: 0 }}>
          Independent function required at the critical gates
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          At these gates at least one of the Reviewer or the Approver must also represent the function shown. It comes from the
          person&apos;s system role (Users &amp; Roles), not from the roles above.
        </Typography.Paragraph>
        <Table
          size="middle"
          rowKey="gateId"
          pagination={false}
          dataSource={gates}
          columns={[
            { title: 'Gate', dataIndex: 'gateId', width: 140, render: gateNumber },
            { title: 'Independent function', dataIndex: 'function' },
          ]}
        />
      </section>
    </div>
  );
}
