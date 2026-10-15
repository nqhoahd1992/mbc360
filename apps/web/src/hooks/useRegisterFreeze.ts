import { useMemo } from 'react';
import type { RegisterConfig } from '@mbc360/shared/config/registers';
import type { ProjectData } from '@mbc360/shared/types';
import { registerLockReason, registerLocks } from '@mbc360/shared/utils/registerClosures';

// Which cells and rows of a register are locked by a closing signature that stands (SW-36). The same shared answer
// the API refuses the write with, so a table can grey a cell before the person types into it instead of failing at
// Save. A column that only a later gate settles stays open.
export function useRegisterFreeze(project: ProjectData | undefined, config: RegisterConfig) {
  return useMemo(() => {
    const locks = project ? registerLocks(project, config) : { columns: new Map<string, string>(), rows: undefined };
    return {
      // The gate whose closure locks this column, or undefined while it is open.
      frozenBy: (columnKey: string) => locks.columns.get(columnKey),
      isFrozen: (columnKey: string) => locks.columns.has(columnKey),
      // Set once a closure stands on a free-form register: rows can then be neither added nor removed.
      rowsFrozen: locks.rows,
      rowsFrozenReason: locks.rows ? registerLockReason(locks.rows) : undefined,
    };
  }, [project, config]);
}
