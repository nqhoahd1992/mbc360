import { Alert, Card, DatePicker, Input, Select, Table, Tag } from 'antd';
import UserSelect from './UserSelect';
import { CheckCircleFilled, SafetyCertificateOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { StudyApproval } from '@mbc360/shared/types';
import { useAppStore } from '../store/useAppStore';
import { patchArray, useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';

const DEPARTMENTS = [
  'NPD / Formulation',
  'R&I',
  'Quality',
  'Quality & GMP',
  'Regulatory',
  'Safety / Scientific Review',
  'Marketing / Sales',
  'Packaging',
  'Supply Chain',
  'Management',
];

const DECISIONS = ['Approve', 'Approve with conditions', 'Reject'];

// Dedicated Study / Human Trial approval workflow (confirmed rule C2) —
// separate from the generic gate/phase sign-off. Three ROLES (not named
// individuals): Study Author, Department Reviewer, Independent Reviewer. The
// Independent Reviewer must not belong to the Study Author's department.
export default function StudyApprovalCard({
  projectId,
  approvals,
}: {
  projectId: string;
  approvals: StudyApproval[];
}) {
  const setApprovalsBulk = useAppStore((s) => s.setStudyApprovalsBulk);
  const { draft, dirty, update, markSaved, discard } = useDraft(approvals);

  const author = draft.find((a) => a.role === 'Study Author');
  const authorDept = author?.department?.trim().toLowerCase();

  const complete =
    draft.length === 3 && draft.every((a) => !!a.name?.trim() && !!a.department?.trim() && !!a.date);

  const patch = (index: number, p: Partial<StudyApproval>) => update((prev) => patchArray(prev, index, p));
  const save = () => {
    setApprovalsBulk(projectId, draft);
    markSaved();
  };

  return (
    <Card
      size="small"
      title={
        <span>
          <SafetyCertificateOutlined style={{ marginRight: 8 }} />
          Study Approval Workflow{' '}
          <span style={{ fontWeight: 400, color: '#999', fontSize: 12 }}>
            — dedicated approval trail for human/consumer studies, separate from gate sign-offs
          </span>
          {complete && (
            <Tag icon={<CheckCircleFilled />} color="success" style={{ marginLeft: 8 }}>
              Approval trail complete
            </Tag>
          )}
        </span>
      }
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        title="Roles, not named individuals"
        description="The Independent Reviewer must belong to a different department than the Study Author (conflict-of-interest control) — the author's department is not selectable for the independent review."
      />
      <Table
        size="small"
        rowKey={(a) => a.role}
        dataSource={draft}
        pagination={false}
        scroll={{ x: 950 }}
        columns={[
          { title: 'Role', width: 170, dataIndex: 'role', render: (v) => <b>{v}</b> },
          {
            title: 'Name',
            width: 170,
            render: (_, a, i) => (
              <UserSelect value={a.name} onChange={(v) => patch(i, { name: v ?? '' })} />
            ),
          },
          {
            title: 'Department',
            width: 200,
            render: (_, a, i) => (
              <Select
                size="small"
                allowClear
                style={{ width: 190 }}
                placeholder="Select department"
                value={a.department}
                options={DEPARTMENTS.map((d) => ({
                  value: d,
                  label: d,
                  // C2: block selecting the Study Author's department for the
                  // Independent Reviewer.
                  disabled:
                    a.role === 'Independent Reviewer' &&
                    !!authorDept &&
                    d.toLowerCase() === authorDept,
                }))}
                onChange={(v) => patch(i, { department: v })}
              />
            ),
          },
          {
            title: 'Date',
            width: 140,
            render: (_, a, i) => (
              <DatePicker
                size="small"
                value={a.date ? dayjs(a.date) : null}
                onChange={(d) => patch(i, { date: d ? d.format('YYYY-MM-DD') : undefined })}
              />
            ),
          },
          {
            title: 'Decision',
            width: 190,
            render: (_, a, i) => (
              <Select
                size="small"
                allowClear
                style={{ width: 180 }}
                value={a.decision}
                options={DECISIONS.map((d) => ({ value: d, label: d }))}
                onChange={(v) => patch(i, { decision: v })}
              />
            ),
          },
          {
            title: 'Comments',
            width: 240,
            render: (_, a, i) => (
              <Input size="small" value={a.comments} onChange={(e) => patch(i, { comments: e.target.value })} />
            ),
          },
        ]}
      />
      <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
    </Card>
  );
}
