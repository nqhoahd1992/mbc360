// SW-37: who may decide a gate, backtrack and change market approvals on a project — assignment, not a role grid.
// Run: npm run verify:project-authority
import { createEmptyProject } from '../../../apps/web/src/store/factory';
import { canChangeMarketTracks, canDecideGate, gateApproverNames } from '../src/utils/projectAuthority';

let bad = 0;
const t = (name: string, ok: boolean) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) bad++;
};
const project = createEmptyProject({
  id: 'T', productCode: 'T', projectLead: 'Lena Lead', markets: ['Vietnam'],
  reviewers: { regulatory: 'Rita Reg', 'project-manager': 'Pam PM', ri: 'Rick RI' },
} as never);
project.gateSignOffs.push({ gateId: 'SG04', role: 'Approved by', assignedToName: 'Alan Approver' } as never);
project.gateSignOffs.push({ gateId: 'SG04', role: 'Reviewed by', assignedToName: 'Ron Reviewer' } as never);
const who = (displayName: string, isAdmin = false) => ({ displayName, isAdmin });

t('the nominated Approved-by signer of the gate decides it', canDecideGate(project, 'SG04', who('Alan Approver')));
t('...names are compared without case or spaces', canDecideGate(project, 'SG04', who('  alan approver ')));
t('...but only that gate: SG05 has no nominated approver', !canDecideGate(project, 'SG05', who('Alan Approver')));
t('the Reviewed-by signer does not decide', !canDecideGate(project, 'SG04', who('Ron Reviewer')));
t('the project Lead decides any gate', canDecideGate(project, 'SG07', who('Lena Lead')));
t('an administrator decides any gate', canDecideGate(project, 'SG07', who('Sam Stranger', true)));
t('a stranger does not', !canDecideGate(project, 'SG04', who('Sam Stranger')));
t('a review-area owner who is not the approver does not', !canDecideGate(project, 'SG04', who('Rick RI')));
t('an empty name never matches', !canDecideGate(project, 'SG04', who('')));
t('approver names list the nominated approver only', gateApproverNames(project, 'SG04').size === 1);

t('the project Regulatory person changes market approvals', canChangeMarketTracks(project, who('Rita Reg')));
t('the Project Manager does', canChangeMarketTracks(project, who('Pam PM')));
t('the Lead does', canChangeMarketTracks(project, who('Lena Lead')));
t('an administrator does', canChangeMarketTracks(project, who('Sam Stranger', true)));
t('another review-area owner does not', !canChangeMarketTracks(project, who('Rick RI')));
t('a stranger does not', !canChangeMarketTracks(project, who('Sam Stranger')));

console.log(bad === 0 ? '\nall passed' : `\n${bad} FAILED`);
process.exit(bad === 0 ? 0 : 1);
