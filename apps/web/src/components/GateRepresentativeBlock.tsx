import { useState } from 'react';
import { Button, Segmented, Select } from 'antd';
import type { GateSignOffRole, ProjectData } from '@mbc360/shared/types';
import {
  INDEPENDENT_FUNCTIONS,
  findGateSignOff,
  gateRepresentative,
  independentFunctionsForGate,
} from '@mbc360/shared/config/gateSignOff';
import { useAppStore } from '../store/useAppStore';
import { EMPTY_GRANTS, hasCapability } from '../utils/permissions';
import { usePickerUsers } from '../hooks/useUserOptions';
import './GateSignOffPanel.css';

// Critical gates (Round 4 question 29(4); project owner 2026-10-15): before anyone signs, the project Lead names the person who
// represents the gate's independent function — Safety, Regulatory, Quality or Technical — and which signature that person gives,
// Reviewed by or Approved by. Candidates are the users holding the matching represent-* capability; the preparer is not offered.
// The other signature slot is then nominated freely, as on any gate. The server enforces all of it again.
export default function GateRepresentativeBlock({
  project,
  gateId,
  market,
  canEdit,
}: {
  project: ProjectData;
  gateId: string;
  market?: string;
  // The Lead or an administrator, on a project that is open for work.
  canEdit: boolean;
}) {
  const users = usePickerUsers();
  const grants = useAppStore((s) => s.permissionGrid?.grants ?? EMPTY_GRANTS);
  const setRepresentative = useAppStore((s) => s.setGateRepresentative);
  const functions = independentFunctionsForGate(gateId);
  const rep = gateRepresentative(project, gateId, market);
  const preparer = findGateSignOff(project, gateId, market, 'Prepared by');
  const preparerId = preparer?.signedByUserId ?? preparer?.assignedToUserId;
  const [editing, setEditing] = useState(false);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [slot, setSlot] = useState<GateSignOffRole>('Reviewed by');
  const [fn, setFn] = useState<string | undefined>(undefined);

  const label = functions.map((f) => INDEPENDENT_FUNCTIONS[f].label).join(' or ');
  const holds = (keys: string[] | undefined, f: string) => hasCapability(grants, keys ?? [], INDEPENDENT_FUNCTIONS[f].capability);
  const candidates = users.filter((u) => u.id !== preparerId && functions.some((f) => holds(u.roleKeys, f)));
  const chosen = users.find((u) => u.id === userId);
  const chosenFunctions = chosen ? functions.filter((f) => holds(chosen.roleKeys, f)) : [];
  const signed = !!rep?.signedAt;

  const save = () => {
    if (!userId) return;
    setRepresentative(project.identity.id, gateId, market, { userId, slot, function: fn ?? chosenFunctions[0] });
    setEditing(false);
  };

  const showForm = canEdit && (!rep || editing);
  return (
    <div className="concept-tokens gso-gate-hold gso-notice gso-rep">
      <div className="gso-rep-body">
        <div>
          <strong>Independent function · {label}</strong>
          {rep ? (
            <div>
              <strong>{rep.assignedToName ?? 'The representative'}</strong> represents {INDEPENDENT_FUNCTIONS[rep.representsFunction ?? '']?.label ?? label} and gives the{' '}
              <strong>{rep.role}</strong> signature.
              {signed && ' They have signed — withdraw that signature before changing the representative.'}
            </div>
          ) : (
            <div>
              {canEdit
                ? `Name the person who represents ${label}, and which signature they give, before anyone signs.`
                : `Waiting for the project Lead (${project.identity.projectLead}) to name the person who represents ${label}.`}
            </div>
          )}
        </div>
        {showForm && (
          <div className="gso-rep-form">
            <Select
              showSearch
              optionFilterProp="label"
              placeholder={`Select a person who represents ${label}`}
              value={userId}
              options={candidates.map((u) => ({ value: u.id, label: u.roleName ? `${u.displayName} — ${u.roleName}` : u.displayName }))}
              onChange={(v?: string) => {
                setUserId(v);
                setFn(undefined);
              }}
              notFoundContent={`Nobody holds ${label} yet — assign that role in Users & Roles`}
            />
            {chosenFunctions.length > 1 && (
              <Select
                value={fn ?? chosenFunctions[0]}
                options={chosenFunctions.map((f) => ({ value: f, label: INDEPENDENT_FUNCTIONS[f].label }))}
                onChange={(v: string) => setFn(v)}
              />
            )}
            <Segmented
              value={slot}
              options={[
                { value: 'Reviewed by', label: 'Reviewed by' },
                { value: 'Approved by', label: 'Approved by' },
              ]}
              onChange={(v) => setSlot(v as GateSignOffRole)}
            />
            <Button type="primary" disabled={!userId} onClick={save}>
              {rep ? 'Change representative' : 'Name representative'}
            </Button>
            {editing && <Button onClick={() => setEditing(false)}>Cancel</Button>}
          </div>
        )}
        {canEdit && rep && !editing && !signed && (
          <div className="gso-rep-form">
            <Button size="small" onClick={() => setEditing(true)}>
              Change
            </Button>
            <Button size="small" danger onClick={() => setRepresentative(project.identity.id, gateId, market, { userId: null })}>
              Clear
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
