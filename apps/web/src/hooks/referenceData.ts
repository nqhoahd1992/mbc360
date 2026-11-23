import { useParams } from 'react-router-dom';
import type { ClaimLibraryEntry, MarketProfile } from '@mbc360/shared/types';
import { useAppStore } from '../store/useAppStore';

// The company reference data a register cell may be read from (SW-59), as the route's project carries it (`ProjectData.reference`, loaded with
// every project). Kept out of the component file so that file exports only a component (Vite Fast Refresh cannot hot-reload a mixed module).
// Stable empty fallbacks: a selector returning a fresh `[]` loops forever (see ClaimSelect / NextActionSelect).
const NO_ENTRIES: ClaimLibraryEntry[] = [];
const NO_PROFILES: MarketProfile[] = [];

export function useClaimsLibraryEntries(): ClaimLibraryEntry[] {
  const { projectId } = useParams();
  return useAppStore((s) => s.projects.find((p) => p.identity.id === projectId)?.reference?.claimsLibrary ?? NO_ENTRIES);
}

export function useMarketProfiles(): MarketProfile[] {
  const { projectId } = useParams();
  return useAppStore((s) => s.projects.find((p) => p.identity.id === projectId)?.reference?.marketProfiles ?? NO_PROFILES);
}
