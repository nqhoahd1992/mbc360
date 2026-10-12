import { useMemo } from 'react';
import type { RegisterConfig } from '@mbc360/shared/config/registers';
import type { ProjectData } from '@mbc360/shared/types';
import { cellFrozenBy, frozenGateSet, rowsFrozenBy, rowsFrozenReason } from '@mbc360/shared/utils/registerRowLocks';

// Which cells and rows of a register are frozen, by the gates that have passed OR have a signature standing on
// them (SW-5, SW-24). The same shared answer the API refuses the write with, so a table can grey a cell before the
// person types into it instead of failing at Save. A column of a LATER gate stays open.
export function useRegisterFreeze(project: ProjectData | undefined, config: RegisterConfig) {
  const frozenGates = useMemo(() => (project ? frozenGateSet(project) : new Set<string>()), [project]);
  return useMemo(() => {
    const rowsFrozen = rowsFrozenBy(frozenGates, config);
    return {
      // The gate that froze this column, or undefined while it is open.
      frozenBy: (columnKey: string) => cellFrozenBy(frozenGates, config, columnKey),
      isFrozen: (columnKey: string) => !!cellFrozenBy(frozenGates, config, columnKey),
      // Set once any column is frozen: rows can then be neither added nor removed.
      rowsFrozen,
      rowsFrozenReason: rowsFrozen ? rowsFrozenReason(rowsFrozen) : undefined,
    };
  }, [frozenGates, config]);
}
