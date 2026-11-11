import { useMemo } from 'react';
import { Alert, Card, DatePicker, Input, Table, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import type { PostLaunchReview, ProjectData } from '@mbc360/shared/types';
import {
  onMarketTracks,
  overdueReviews,
  projectLaunchStatus,
  reviewMilestoneLabel,
  reviewScheduleMilestones,
} from '@mbc360/shared/utils/postLaunch';
import { useAppStore } from '../store/useAppStore';
import { patchArray, useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';
import UserSelect from './UserSelect';
import { TEXT, TABLE_STICKY } from '../theme/tokens';
import '../styles/concept.css';

// Round 4 questions 13 and 14 (2026-08-29). The review SCHEDULE is derived — 1
// month for enhanced-surveillance products, then 3, 12 and annually, all measured
// from each market's ACTUAL commercial launch date — so this card generates the
// rows rather than asking anybody to create them. Only what was DONE about a
// milestone is stored.
//
// A milestone with no stored review is rendered from the derived schedule and
// saved on first edit; that is why the table's data source is the union rather
// than `project.postLaunchReviews` alone.
// The words for a milestone are shared with the Change Control assessment, which names the review cycle a finding belongs to.
const milestoneLabel = reviewMilestoneLabel;

export default function PostLaunchReviewCard({
  project,
  enhanced,
  market,
}: {
  project: ProjectData;
  enhanced: boolean;
  // The market chosen on the gate tab (Gate 12): the schedule of THAT market. The draft still holds every market's rows, so switching
  // market never loses an unsaved edit.
  market?: string;
}) {
  const setReviews = useAppStore((s) => s.setPostLaunchReviews);
  const today = dayjs().format('YYYY-MM-DD');

  // Every milestone that exists today, whether or not anybody has touched it.
  const rows = useMemo(() => {
    const stored = new Map(project.postLaunchReviews.map((r) => [`${r.market}|${r.milestone}`, r]));
    // One schedule per market, dated from the earliest launch still on sale there
    // (F4: an older version may still be on the shelf beside the new one).
    const derived: PostLaunchReview[] = reviewScheduleMilestones(project, { enhanced, asOf: today, profiles: project.reference.marketProfiles })
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
  const allOverdue = overdueReviews(project, { enhanced, asOf: today, profiles: project.reference.marketProfiles });
  const overdue = market ? allOverdue.filter((m) => m.market === market) : allOverdue;
  // The rows shown are the chosen market's; an edit is addressed to the row's place in the whole draft.
  const shown = market ? draft.filter((r) => r.market === market) : draft;
  const at = (r: PostLaunchReview) => draft.indexOf(r);
  const status = projectLaunchStatus(project);

  return (
    <Card
      size="small"
      className="ph-card"
      title={
        <span>
          Post-launch review schedule{market ? ` — ${market}` : ''} <Tag color="blue">{status}</Tag>
        </span>
      }
      extra={
        <span style={{ color: TEXT.secondary, fontSize: 12 }}>
          Measured from each market&apos;s actual commercial launch date
        </span>
      }
    >
      {onMarketTracks(project).length === 0 ? (
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
            dataSource={shown}
            pagination={false}
            sticky={TABLE_STICKY}
            scroll={{ x: 1200 }}
            columns={[
              { title: 'Market', width: 130, fixed: 'left', hidden: !!market, render: (_, r) => <b>{r.market}</b> },
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
                render: (_, r) => (
                  <DatePicker
                    style={{ width: 130 }}
                    value={r.completedDate ? dayjs(r.completedDate) : null}
                    onChange={(d) => patch(at(r), { completedDate: d ? d.format('YYYY-MM-DD') : undefined })}
                  />
                ),
              },
              {
                title: 'Reviewer',
                width: 180,
                render: (_, r) => (
                  <UserSelect
                    value={r.reviewer}
                    // Required to complete — flagged here, refused by the API.
                    style={{ width: '100%' }}
                    onChange={(v) => patch(at(r), { reviewer: v })}
                  />
                ),
              },
              {
                title: 'Outcome',
                width: 260,
                render: (_, r) => (
                  <Input.TextArea
                    autoSize={{ minRows: 1, maxRows: 3 }}
                    status={r.completedDate && !(r.outcome ?? '').trim() ? 'error' : undefined}
                    placeholder={r.completedDate ? 'Required to complete a review' : 'What the review found'}
                    value={r.outcome}
                    onChange={(e) => patch(at(r), { outcome: e.target.value })}
                  />
                ),
              },
              {
                title: 'Evidence link',
                width: 170,
                render: (_, r) => (
                  <Input
                    placeholder="link"
                    value={r.evidenceLink}
                    onChange={(e) => patch(at(r), { evidenceLink: e.target.value })}
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
