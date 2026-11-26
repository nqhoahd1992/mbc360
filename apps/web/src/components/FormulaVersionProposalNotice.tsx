import { Button, Popconfirm } from 'antd';
import dayjs from 'dayjs';
import type { ProjectData } from '@mbc360/shared/types';
import { FORMULA_CLASSIFICATION_CAPABILITIES } from '@mbc360/shared/config/changeTriggers';
import { useAppStore } from '../store/useAppStore';
import { useSession } from '../auth/useSession';
import { usePermissionView } from '../auth/previewMode';
import { EMPTY_GRANTS, hasCapability } from '../utils/permissions';
import { useAllowSameSigner } from '../hooks/useAllowSameSigner';
import Notice from './Notice';

// Round 5 question 23(c): a formula version is proposed by its initiator and confirmed by a DIFFERENT authorised Technical or Quality reviewer.
// While one waits, this notice says what it is, who proposed it and who may confirm it, and carries the two acts. [ASSUMPTION: R6-Q31]
export default function FormulaVersionProposalNotice({ project }: { project: ProjectData }) {
  const proposal = project.formulaVersionProposal;
  const session = useSession();
  const view = usePermissionView();
  const grants = useAppStore((s) => s.permissionGrid?.grants ?? EMPTY_GRANTS);
  const allowSameSigner = useAllowSameSigner();
  const confirm = useAppStore((s) => s.confirmFormulaVersionProposal);
  const withdraw = useAppStore((s) => s.withdrawFormulaVersionProposal);
  if (!proposal) return null;

  const me = session.user?.displayName ?? '';
  const mine = me === proposal.proposedBy;
  const qualified = view.isAdmin || FORMULA_CLASSIFICATION_CAPABILITIES.some((cap) => hasCapability(grants, view.roleKeys, cap));
  const canWithdraw = mine || session.isAdmin || me === project.identity.projectLead;
  const id = project.identity.id;
  const why = mine && !allowSameSigner
    ? 'You proposed this version, so a different reviewer has to confirm it.'
    : !qualified
      ? 'Confirming needs Technical or Quality authority.'
      : undefined;

  return (
    <Notice
      tone="warn"
      title={`Formula version ${proposal.version} (${proposal.changeType}) is waiting for confirmation`}
      action={
        <div className="ph-notice-actions" style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <Popconfirm
            title={`Confirm ${proposal.version} as a ${proposal.changeType} change?`}
            description={
              proposal.changeType === 'Major' ? 'Gates 4-9 reopen and the Phase 2-3 approvals are invalidated.' : 'It is recorded in the change register.'
            }
            okText="Confirm"
            onConfirm={() => void confirm(id)}
            disabled={!!why}
          >
            <span title={why}>
              <Button type="primary" disabled={!!why}>
                Confirm version
              </Button>
            </span>
          </Popconfirm>
          {canWithdraw && (
            <Popconfirm title="Withdraw this proposal?" okText="Withdraw" onConfirm={() => void withdraw(id)}>
              <Button>Withdraw</Button>
            </Popconfirm>
          )}
        </div>
      }
    >
      <div>
        Proposed by <strong>{proposal.proposedBy}</strong> on {dayjs(proposal.proposedAt).format('YYYY-MM-DD HH:mm')}
        {proposal.reason ? ` — ${proposal.reason}` : ''}. Nothing changes until a different reviewer with Technical or Quality authority confirms it.
      </div>
      {why && <div>{why}</div>}
    </Notice>
  );
}
