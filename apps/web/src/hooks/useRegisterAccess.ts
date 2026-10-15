import { useMemo } from 'react';
import type { RegisterConfig } from '@mbc360/shared/config/registers';
import type { ProjectData, RegisterRow } from '@mbc360/shared/types';
import {
  canChangeRegisterRow,
  canChangeRegisterRows,
  isSensitiveColumn,
  registerAccessReason,
} from '@mbc360/shared/utils/registerAccess';
import { useSession } from '../auth/useSession';

// What the signed-in person may change in a register (SW-34): the same shared functions the server refuses with, so the table
// greys a cell out exactly when a save would be rejected. Keyed on the REAL session, never the "View as" preview.
export function useRegisterAccess(project: ProjectData | undefined, config: RegisterConfig) {
  const session = useSession();
  const actor = useMemo(
    () => ({ displayName: session.user?.displayName ?? '', isAdmin: !!session.isAdmin }),
    [session.user?.displayName, session.isAdmin],
  );
  return useMemo(() => {
    if (!project) return { canChangeRows: true, cellBlocked: () => false, reason: '' };
    const canChangeRows = canChangeRegisterRows(project, config, actor);
    return {
      canChangeRows,
      // True when this person may NOT change this cell: an important column of a row they have no access to.
      cellBlocked: (columnKey: string, row: RegisterRow | undefined) => {
        const column = config.columns.find((c) => c.key === columnKey);
        return !!column && isSensitiveColumn(column) && !canChangeRegisterRow(project, config, row, actor);
      },
      reason: registerAccessReason(config),
    };
  }, [project, config, actor]);
}
