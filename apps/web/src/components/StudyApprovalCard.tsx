import { Alert, Card, DatePicker, Input, Select, Table, Tag } from 'antd';
import UserSelect from './UserSelect';
import { usePickerUsers } from '../hooks/useUserOptions';
import { isGateRefLocked } from '@mbc360/shared/utils/gateProgress';
import { getRegisterConfig } from '@mbc360/shared/config/registers';
import { CheckCircleFilled, SafetyCertificateOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { StudyApproval } from '@mbc360/shared/types';
import { useAppStore } from '../store/useAppStore';
import { patchArray, useDraft } from '../hooks/useDraft';
import SaveBar from './SaveBar';
import { TEXT, TABLE_STICKY } from '../theme/tokens';

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

  const users = usePickerUsers();
  // C9: the trail belongs to the Study Protocol register (gate 08); the API
  // refuses changes once that gate has passed.
  const project = useAppStore((st) => st.projects.find((p) => p.identity.id === projectId));
  const locked = !!project && isGateRefLocked(project, getRegisterConfig('studyProtocolSetup')?.gate);
  const author = draft.find((a) => a.role === 'Study Author');
  const independent = draft.find((a) => a.role === 'Independent Reviewer');
  // C2: the same check the server runs, on the SSO departments shown below.
  const sameDepartment =
    !!author?.department && !!independent?.department &&
    author.department.trim().toLowerCase() === independent.department.trim().toLowerCase();

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
          <span style={{ fontWeight: 400, color: TEXT.secondary, fontSize: 12 }}>
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
        description="The Independent Reviewer must belong to a different department than the Study Author (conflict-of-interest control). Each person's department comes from their account."
      />
      {sameDepartment && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          title={`The Independent Reviewer is in the same department as the Study Author (${author?.department}) — choose someone from another department (rule C2)`}
        />
      )}
      <Table
        size="small"
        rowKey={(a) => a.role}
        dataSource={draft}
        pagination={false}
        sticky={TABLE_STICKY}
        scroll={{ x: 950 }}
        columns={[
          { title: 'Role', width: 170, dataIndex: 'role', fixed: 'left', render: (v) => <b>{v}</b> },
          {
            title: 'Name',
            width: 170,
            render: (_, a, i) => (
              <UserSelect
                value={a.name}
                onChange={(v) =>
                  patch(i, { name: v ?? '', department: users.find((u) => u.displayName === v)?.department ?? undefined })
                }
              />
            ),
          },
          {
            // C2/C5: the department is the selected person's own SSO department,
            // not a choice — the server takes it from the account either way.
            title: 'Department',
            width: 200,
            render: (_, a) => <span>{a.department || (a.name ? 'No department on account' : '—')}</span>,
          },
          {
            title: 'Date',
            width: 140,
            render: (_, a, i) => (
              <DatePicker
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
              <Input value={a.comments} onChange={(e) => patch(i, { comments: e.target.value })} />
            ),
          },
        ]}
      />
      <SaveBar
        dirty={dirty}
        onSave={save}
        onDiscard={discard}
        disabled={sameDepartment || locked}
        disabledReason={
          locked
            ? 'Gate 08 has passed — the approval trail is read-only (use Backtrack)'
            : 'The Independent Reviewer must be from a different department than the Study Author (rule C2)'
        }
      />
    </Card>
  );
}
