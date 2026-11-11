import type { ProjectData } from '@mbc360/shared/types';
import { gateSignOffMarkets, isPerMarketGate } from '@mbc360/shared/config/gateSignOff';

// The markets a gate tab can be switched between (Gates 10-12 are signed per market). Empty for any other gate. The switch is only
// offered when there is more than one: with a single market the lane is the whole project.
export function gateMarkets(project: ProjectData, gateId: string): string[] {
  return isPerMarketGate(gateId) ? gateSignOffMarkets(project, gateId).filter((m): m is string => !!m) : [];
}

// Which of them is showing: the one in the address (`?market=`) when it is one of the lanes, else the first. Used by the phase page
// and by the breadcrumb, so the two can never show different markets.
export function effectiveMarket(lanes: string[], param: string | null): string | undefined {
  if (lanes.length < 2) return undefined;
  return param && lanes.includes(param) ? param : lanes[0];
}
