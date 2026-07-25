import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Card, Empty, Progress, Table, Tag, Tooltip, Typography } from 'antd';
import { LockFilled, RightOutlined, UnlockOutlined } from '@ant-design/icons';
import {
  formatGate,
  getNavGroups,
  getRegisterConfig,
  navItemHref,
  type NavItem,
} from '@mbc360/shared/config/registers';
import {
  involvementIn,
  reviewRoleLabel,
  rolesAssignedTo,
  type ReviewInvolvement,
} from '@mbc360/shared/config/reviewers';
import { gateRefGateIds, isGateRefLocked } from '@mbc360/shared/utils/gateProgress';
import { useAppStore } from '../store/useAppStore';
import { useSession } from '../auth/useSession';

// The source workbook encoded "who is responsible" as a tab-name PREFIX
// (Tuan-, George-, ChiChu-, …) — that is how a person found their own tabs.
// Digitised, that prefix must not become a fixed folder: the people are
// assigned PER PROJECT on the Create New Project form, so "my sheets" is a
// live lookup against ProjectIdentity.reviewers, not a static grouping
// (2026-07-25, user-requested). This page is that lookup.

const INVOLVEMENT_META: Record<ReviewInvolvement, { label: string; color: string; blurb: string }> = {
  owner: {
    label: 'You own',
    color: 'red',
    blurb: 'You are the review owner — completing and vouching for this evidence is yours.',
  },
  'co-review': {
    label: 'You co-review',
    color: 'orange',
    blurb: 'Another area owns it; you are named as a co-reviewer of the content.',
  },
  'co-sign': {
    label: 'You co-sign',
    color: 'blue',
    blurb:
      'You are named as a co-signer at sign-off. The Project Manager co-signs every area, so this list is long for that role by design.',
  },
};

interface MySheetRow {
  key: string;
  title: string;
  sheetName?: string;
  group: string;
  gate?: string;
  href: string;
  involvement: ReviewInvolvement[];
  rows?: number;
  completed?: number;
  locked: boolean;
  lockable: boolean;
}

export default function MySheets() {
  const { projectId } = useParams();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const { user } = useSession();

  const myName = user?.displayName;
  const myRoles = useMemo(
    () => rolesAssignedTo(project?.identity.reviewers, myName),
    [project?.identity.reviewers, myName],
  );

  const rows = useMemo<MySheetRow[]>(() => {
    if (!project || myRoles.length === 0) return [];
    const out: MySheetRow[] = [];
    for (const group of getNavGroups()) {
      for (const item of group.items as NavItem[]) {
        // A dedicated-page item carries no RegisterConfig, so fall back to the
        // group's own spec — that is what its page caption composes from too.
        const config = item.registerKey ? getRegisterConfig(item.registerKey) : undefined;
        const spec = config?.reviewOwner ?? group.reviewOwner;
        const involvement = involvementIn(spec, myRoles);
        if (involvement.length === 0) continue;
        const registerRows = item.registerKey ? project.registers[item.registerKey] ?? [] : undefined;
        const hasStatusColumn = config?.columns.some((c) => c.key === 'status' && c.type === 'select');
        out.push({
          key: `${group.key}:${item.registerKey ?? item.title}`,
          title: item.title,
          sheetName: item.sheetName,
          group: group.title,
          gate: item.gate,
          href: navItemHref(item, project.identity.id),
          involvement,
          rows: registerRows?.length,
          completed:
            registerRows && hasStatusColumn
              ? registerRows.filter((r) => r.status === 'Completed' || r.status === 'Complete').length
              : undefined,
          locked: isGateRefLocked(project, item.gate),
          lockable: gateRefGateIds(item.gate).length > 0,
        });
      }
    }
    return out;
  }, [project, myRoles]);

  if (!project) return <Empty description="Not found" />;

  const ownedCount = rows.filter((r) => r.involvement.includes('owner')).length;
  const coReviewCount = rows.filter((r) => r.involvement.includes('co-review')).length;
  const coSignCount = rows.filter((r) => r.involvement.includes('co-sign')).length;
  const lockedCount = rows.filter((r) => r.locked).length;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <Typography.Title level={4} style={{ margin: 0 }}>
          My Sheets
        </Typography.Title>
        <Typography.Text type="secondary">
          The sheets <b>{myName ?? 'you'}</b> is responsible for on <b>{project.identity.id}</b> — resolved from
          this project&apos;s reviewer assignment, not from a fixed list. Assign different people on the project
          and this list changes with them.
        </Typography.Text>
      </div>

      {myRoles.length === 0 ? (
        <Alert
          type="info"
          showIcon
          message="You are not assigned to a review area on this project"
          description={
            <span>
              Review areas are assigned per project on the Create New Project form (all 13 areas are required).
              Nothing here is a permission — you can still open and contribute to any sheet from{' '}
              <b>Workbook by responsibility</b> in the sidebar. Ask the project owner to assign you if this
              project should list work for you.
            </span>
          }
        />
      ) : (
        <>
          <Card size="small">
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Your review areas on this project
                </Typography.Text>
                <div style={{ marginTop: 2 }}>
                  {myRoles.map((role) => (
                    <Tag key={role} color="geekblue">
                      {reviewRoleLabel(role)}
                    </Tag>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {(
                  [
                    ['owner', ownedCount],
                    ['co-review', coReviewCount],
                    ['co-sign', coSignCount],
                  ] as [ReviewInvolvement, number][]
                ).map(([kind, count]) => (
                  <Tooltip key={kind} title={INVOLVEMENT_META[kind].blurb}>
                    <div>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {INVOLVEMENT_META[kind].label}
                      </Typography.Text>
                      <div style={{ fontSize: 20, fontWeight: 600 }}>{count}</div>
                    </div>
                  </Tooltip>
                ))}
                <Tooltip title="Already read-only because every gate they belong to has passed. Correcting one requires a Backtrack.">
                  <div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      Now read-only
                    </Typography.Text>
                    <div style={{ fontSize: 20, fontWeight: 600, color: lockedCount > 0 ? '#d48806' : undefined }}>
                      {lockedCount}
                    </div>
                  </div>
                </Tooltip>
              </div>
            </div>
          </Card>

          <Card size="small" title={`Sheets assigned to you (${rows.length})`}>
            <Table
              size="small"
              rowKey="key"
              dataSource={rows}
              pagination={false}
              scroll={{ x: 900 }}
              columns={[
                {
                  title: 'Sheet',
                  render: (_, r: MySheetRow) => (
                    <Link to={r.href}>
                      <div style={{ fontWeight: 600 }}>
                        {r.title} <RightOutlined style={{ fontSize: 10, color: '#bbb' }} />
                      </div>
                      {r.sheetName && (
                        <Typography.Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>
                          {r.sheetName}
                        </Typography.Text>
                      )}
                    </Link>
                  ),
                },
                {
                  title: 'Your role',
                  width: 210,
                  filters: (Object.keys(INVOLVEMENT_META) as ReviewInvolvement[]).map((k) => ({
                    text: INVOLVEMENT_META[k].label,
                    value: k,
                  })),
                  onFilter: (value, r: MySheetRow) => r.involvement.includes(value as ReviewInvolvement),
                  render: (_, r: MySheetRow) => (
                    <span>
                      {r.involvement.map((i) => (
                        <Tooltip key={i} title={INVOLVEMENT_META[i].blurb}>
                          <Tag color={INVOLVEMENT_META[i].color}>{INVOLVEMENT_META[i].label}</Tag>
                        </Tooltip>
                      ))}
                    </span>
                  ),
                },
                {
                  title: 'Section',
                  width: 170,
                  render: (_, r: MySheetRow) => (
                    <Typography.Text style={{ fontSize: 12 }}>{r.group}</Typography.Text>
                  ),
                },
                {
                  title: 'Gate',
                  width: 90,
                  render: (_, r: MySheetRow) =>
                    r.gate ? <Tag>{formatGate(r.gate)}</Tag> : <Typography.Text type="secondary">—</Typography.Text>,
                },
                {
                  title: 'Progress',
                  width: 140,
                  render: (_, r: MySheetRow) => {
                    if (r.completed === undefined || r.rows === undefined) {
                      return <Typography.Text type="secondary">—</Typography.Text>;
                    }
                    if (r.rows === 0) return <Typography.Text type="secondary">No rows yet</Typography.Text>;
                    return (
                      <Progress
                        size="small"
                        percent={Math.round((r.completed / r.rows) * 100)}
                        format={() => `${r.completed}/${r.rows}`}
                      />
                    );
                  },
                },
                {
                  title: 'Edit lock',
                  width: 150,
                  render: (_, r: MySheetRow) =>
                    !r.lockable ? (
                      <Tag icon={<UnlockOutlined />}>Never locks</Tag>
                    ) : r.locked ? (
                      <Tag color="error" icon={<LockFilled />}>
                        Read-only
                      </Tag>
                    ) : (
                      <Tag color="success" icon={<UnlockOutlined />}>
                        Editable
                      </Tag>
                    ),
                },
              ]}
            />
          </Card>
        </>
      )}
    </div>
  );
}
