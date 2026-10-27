import { getRegisterConfig, type NavItem } from '@mbc360/shared/config/registers';
import { isRegisterClosed, isRegisterClosureSigned, type ProjectData } from '@mbc360/shared/types';
import { closureStateAt, isRegisterFullyClosed, registerClosureGateIds, registerClosureRoles } from '@mbc360/shared/utils/registerClosures';

// Where a menu entry stands against the closing signatures (SW-36). One reading for the section Overview and the sidebar, so the two
// can never disagree about which sheets are signed.
export interface SheetClosure {
  closed: boolean; // every closing signature the sheet needs stands
  closedGates: number; // gates it is closed at ...
  closureGates: number; // ... out of the gates it has to be closed at
  signers: string[];
}

export function sheetClosure(project: ProjectData, item: NavItem): SheetClosure {
  const config = item.registerKey ? getRegisterConfig(item.registerKey) : undefined;
  // A sheet is closed by its own signature, or by its anchor's when it is a member of a group. A PAGE (several registers on one
  // screen, `contains`) is closed when every anchor it holds is: Needs & Scientific Basis has one signature for five tables.
  const memberConfigs = config ? [config] : (item.contains ?? []).map((k) => getRegisterConfig(k)).filter((c): c is NonNullable<typeof c> => !!c);
  const anchors = [
    ...new Map(
      memberConfigs.map((c) => {
        const a = (c.closedWith && getRegisterConfig(c.closedWith)) || c;
        return [a.key, a] as const;
      }),
    ).values(),
  ];
  const closures = anchors.map((a) => {
    const gates = registerClosureGateIds(a);
    const roles = registerClosureRoles(a);
    const at = gates.filter((g) => isRegisterClosed(closureStateAt(project, a.key, g), roles));
    const who = at.flatMap((g) => (closureStateAt(project, a.key, g)?.signOffs ?? []).filter((so) => isRegisterClosureSigned(so)).map((so) => so.name ?? ''));
    return { total: gates.length, closed: at.length, who };
  });
  return {
    closed: anchors.length > 0 && anchors.every((a) => isRegisterFullyClosed(project, a)),
    closedGates: closures.reduce((n, c) => n + c.closed, 0),
    closureGates: closures.reduce((n, c) => n + c.total, 0),
    signers: [...new Set(closures.flatMap((c) => c.who))].filter(Boolean),
  };
}
