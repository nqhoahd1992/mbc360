import { useMemo } from 'react';
import { Alert, Card, DatePicker, Input, Table, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import type { PostLaunchReview, ProjectData } from '@mbc360/shared/types';
import {
  isMarketLaunched,
  overdueReviews,
  projectLaunchStatus,
  reviewMilestonesFor,
} from '@mbc360/shared/utils/postLaunch';
import { useAppStore } from '../store/useAppStore';
import { patchArray, useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';
import UserSelect from './UserSelect';
import { TEXT, TABLE_STICKY } from '../theme/tokens';

// Round 4 questions 13 and 14 (2026-08-29). The review SCHEDULE is derived — 1
// month for enhanced-surveillance products, then 3, 12 and annually, all measured
// from each market's ACTUAL commercial launch date — so this card generates the
// rows rather than asking anybody to create them. Only what was DONE about a
// milestone is stored.
//
// A milestone with no stored review is rendered from the derived schedule and
// saved on first edit; that is why the table's data source is the union rather
// than `project.postLaunchReviews` alone.
const MILESTONE_LABELS: Record<string, string> = {
  '1m': 'One month (enhanced surveillance)',
  '3m': 'Three months (first standard review)',
  '12m': 'Twelve months (full post-market review)',
  signal: 'Signal-triggered review',
};

function milestoneLabel(milestone: string): string {
  if (MILESTONE_LABELS[milestone]) return MILESTONE_LABELS[milestone];
  const annual = /^annual-(\d+)$/.exec(milestone);
  if (annual) return `Annual review ${annual[1]}`;
  return milestone;
}

export default function PostLaunchReviewCard({
  project,
  enhanced,
}: {
  project: ProjectData;
  enhanced: boolean;
}) {
  const setReviews = useAppStore((s) => s.setPostLaunchReviews);
  const today = dayjs().format('YYYY-MM-DD');

  // Every milestone that exists today, whether or not anybody has touched it.
  const rows = useMemo(() => {
    const stored = new Map(project.postLaunchReviews.map((r) => [`${r.market}|${r.milestone}`, r]));
    const derived: PostLaunchReview[] = project.marketTracks
      .filter(isMarketLaunched)
      .flatMap((track) =>
        reviewMilestonesFor(track, {
          enhanced,
          asOf: today,
          intervalOverrideMonths: project.reference.marketProfiles.find((p) => p.market === track.market)
            ?.reviewIntervalMonths,
        }),
      )
      .map((m) => {
        const existing = stored.get(`${m.market}|${m.milestone}`);
        return existing ?? { id: `${m.market}|${m.milestone}`, market: m.market, milestone: m.milestone, dueDate: m.dueDate };
      });
    // A stored review whose milestone the schedule no longer generates (a signal
    // review, or one recorded before a launch date was corrected) still belongs on
    // screen — losing sight of a completed review would be worse than an odd row.
    const derivedKeys = new Set(derived.map((r) => `${r.market}|${r.milestone}`));
    const orphans = project.postLaunchReviews.filter((r) => !derivedKeys.has(`${r.market}|${r.milestone}`));
    return [...derived, ...orphans];
  }, [project, enhanced, today]);

  const { draft, dirty, update, markSaved, discard } = useDraft(rows);
  const patch = (index: number, p: Partial<PostLaunchReview>) => update((prev) => patchArray(prev, index, p));
  const overdue = overdueReviews(project, { enhanced, asOf: today, profiles: project.reference.marketProfiles });
  const status = projectLaunchStatus(project);

  return (
    <Card
      size="small"
      title={
        <span>
          Post-launch review schedule <Tag color="blue">{status}</Tag>
        </span>
      }
      extra={
        <span style={{ color: TEXT.secondary, fontSize: 12 }}>
          Measured from each market&apos;s actual commercial launch date
        </span>
      }
    >
      {project.marketTracks.every((t) => !isMarketLaunched(t)) ? (
        <Alert
          type="info"
          showIcon
          message="No market has an actual commercial launch date yet"
          description="The review schedule starts from the day a product goes on sale in a market, not from its launch approval. Record the actual launch date on Market Regulatory & Launch Tracking above."
        />
      ) : (
        <>
          {overdue.length > 0 && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              message={`${overdue.length} scheduled review${overdue.length === 1 ? '' : 's'} due and not completed`}
              description={overdue.map((m) => `${m.market} — ${milestoneLabel(m.milestone)} (due ${m.dueDate})`).join(' · ')}
            />
          )}
          <Table
            size="small"
            rowKey={(r) => `${r.market}|${r.milestone}`}
            dataSource={draft}
            pagination={false}
            sticky={TABLE_STICKY}
            scroll={{ x: 1200 }}
            columns={[
              { title: 'Market', width: 130, fixed: 'left', render: (_, r) => <b>{r.market}</b> },
              { title: 'Review', width: 260, render: (_, r) => milestoneLabel(r.milestone) },
              {
                title: 'Due',
                width: 120,
                render: (_, r) => {
                  const late = r.dueDate <= today && !r.completedDate;
                  return late ? (
                    <Tooltip title="Due and not completed">
                      <Tag color="red">{r.dueDate}</Tag>
                    </Tooltip>
                  ) : (
                    <span style={{ color: TEXT.secondary }}>{r.dueDate}</span>
                  );
                },
              },
              {
                title: 'Completed',
                width: 150,
                render: (_, r, i) => (
                  <DatePicker
                    style={{ width: 130 }}
                    value={r.completedDate ? dayjs(r.completedDate) : null}
                    onChange={(d) => patch(i, { completedDate: d ? d.format('YYYY-MM-DD') : undefined })}
                  />
                ),
              },
              {
                title: 'Reviewer',
                width: 180,
                render: (_, r, i) => (
                  <UserSelect
                    value={r.reviewer}
                    // Required to complete — flagged here, refused by the API.
                    style={{ width: '100%' }}
                    onChange={(v) => patch(i, { reviewer: v })}
                  />
                ),
              },
              {
                title: 'Outcome',
                width: 260,
                render: (_, r, i) => (
                  <Input.TextArea
                    autoSize={{ minRows: 1, maxRows: 3 }}
                    status={r.completedDate && !(r.outcome ?? '').trim() ? 'error' : undefined}
                    placeholder={r.completedDate ? 'Required to complete a review' : 'What the review found'}
                    value={r.outcome}
                    onChange={(e) => patch(i, { outcome: e.target.value })}
                  />
                ),
              },
              {
                title: 'Evidence link',
                width: 170,
                render: (_, r, i) => (
                  <Input
                    placeholder="link"
                    value={r.evidenceLink}
                    onChange={(e) => patch(i, { evidenceLink: e.target.value })}
                  />
                ),
              },
            ]}
          />
          <SaveBar
            dirty={dirty}
            onSave={() => {
              setReviews(project.identity.id, draft);
              markSaved();
            }}
            onDiscard={discard}
          />
        </>
      )}
    </Card>
  );
}
