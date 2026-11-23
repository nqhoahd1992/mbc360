import { useParams } from 'react-router-dom';
import type { RestrictedCautionEntry } from '@mbc360/shared/types';
import { useMemo } from 'react';
import { currentRestrictedCautionEntries } from '@mbc360/shared/utils/restrictedCaution';
import { useAppStore } from '../store/useAppStore';

// The approved entries of the company's restricted and caution list that are in effect today, from what the route's project carries
// (`reference.restrictedCaution`, loaded with EVERY entry, so this narrows it). Shared by RestrictedCautionSelect and DynamicTable; kept out of the component file so that file exports only a
// component (Vite Fast Refresh cannot hot-reload a module that mixes both).
// Stable empty fallback: a selector returning a fresh `[]` loops forever (see ClaimSelect / NextActionSelect).
const NO_ENTRIES: RestrictedCautionEntry[] = [];

export function useRestrictedCautionEntries(): RestrictedCautionEntry[] {
  const { projectId } = useParams();
  const all = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId)?.reference?.restrictedCaution ?? NO_ENTRIES);
  return useMemo(() => currentRestrictedCautionEntries(all), [all]);
}
