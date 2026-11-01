import {
  type CompetitionId,
  type League,
  type PlayerProjection,
  type Team,
  currentSeasonRules,
  evaluateLineup,
  optimizeLineup,
  projectMatchday,
} from '@pizarra/core';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAppStore } from '../state/app-store';
import { useDataProvider } from './data-context';

export function useLeagues() {
  const p = useDataProvider();
  return useQuery({ queryKey: ['leagues'], queryFn: () => p.getLeagues() });
}

/** The league the user is looking at (first one by default). */
export function useActiveLeague(): {
  league: League | undefined;
  isLoading: boolean;
  error: unknown;
} {
  const { data, isLoading, error } = useLeagues();
  const activeId = useAppStore((s) => s.activeLeagueId);
  const league = data?.find((l) => l.id === activeId) ?? data?.[0];
  return { league, isLoading, error };
}

export function useSeasonState(competition: CompetitionId | undefined) {
  const p = useDataProvider();
  return useQuery({
    queryKey: ['season', competition],
    queryFn: () => p.getSeasonState(competition as CompetitionId),
    enabled: !!competition,
  });
}

export function useStandings(leagueId: string | undefined) {
  const p = useDataProvider();
  return useQuery({
    queryKey: ['standings', leagueId],
    queryFn: () => p.getStandings(leagueId as string),
    enabled: !!leagueId,
  });
}

export function useSquad(leagueId: string | undefined) {
  const p = useDataProvider();
  return useQuery({
    queryKey: ['squad', leagueId],
    queryFn: () => p.getSquad(leagueId as string),
    enabled: !!leagueId,
  });
}

export function useMarket(leagueId: string | undefined) {
  const p = useDataProvider();
  return useQuery({
    queryKey: ['market', leagueId],
    queryFn: () => p.getMarket(leagueId as string),
    enabled: !!leagueId,
  });
}

export function useOffers(leagueId: string | undefined) {
  const p = useDataProvider();
  return useQuery({
    queryKey: ['offers', leagueId],
    queryFn: () => p.getOffers(leagueId as string),
    enabled: !!leagueId,
  });
}

export function useTeams(competition: CompetitionId | undefined) {
  const p = useDataProvider();
  const q = useQuery({
    queryKey: ['teams', competition],
    queryFn: () => p.getTeams(competition as CompetitionId),
    enabled: !!competition,
  });
  const byId = useMemo(() => new Map<string, Team>((q.data ?? []).map((t) => [t.id, t])), [q.data]);
  return { ...q, byId };
}

export function usePlayer(playerId: string | undefined) {
  const p = useDataProvider();
  return useQuery({
    queryKey: ['player', playerId],
    queryFn: () => p.getPlayer(playerId as string),
    enabled: !!playerId,
  });
}

export function usePlayerHistory(playerId: string | undefined) {
  const p = useDataProvider();
  return useQuery({
    queryKey: ['playerHistory', playerId],
    queryFn: () => p.getPlayerHistory(playerId as string),
    enabled: !!playerId,
  });
}

export function usePriceHistory(playerId: string | undefined) {
  const p = useDataProvider();
  return useQuery({
    queryKey: ['priceHistory', playerId],
    queryFn: () => p.getPriceHistory(playerId as string),
    enabled: !!playerId,
  });
}

export function useFixtures(competition: CompetitionId | undefined) {
  const p = useDataProvider();
  return useQuery({
    queryKey: ['fixtures', competition],
    queryFn: () => p.getFixtures(competition as CompetitionId),
    enabled: !!competition,
  });
}

export interface CompetitionProjections {
  readonly matchday: number;
  readonly players: Awaited<ReturnType<ReturnType<typeof useDataProvider>['getPlayers']>>;
  readonly playersById: Map<string, CompetitionProjections['players'][number]>;
  readonly projections: Map<string, PlayerProjection>;
}

/** Players + xPts projections for the next matchday of a competition (computed once, cached). */
export function useProjections(competition: CompetitionId | undefined) {
  const p = useDataProvider();
  return useQuery({
    queryKey: ['projections', competition],
    enabled: !!competition,
    staleTime: Infinity,
    queryFn: async (): Promise<CompetitionProjections> => {
      const c = competition as CompetitionId;
      const [players, fixtures, stats, state] = await Promise.all([
        p.getPlayers(c),
        p.getFixtures(c),
        p.getMatchStats(c),
        p.getSeasonState(c),
      ]);
      const projections = projectMatchday({
        players,
        fixtures,
        stats,
        matchday: state.nextMatchday,
      });
      return {
        matchday: state.nextMatchday,
        players,
        playersById: new Map(players.map((pl) => [pl.id, pl])),
        projections,
      };
    },
  });
}

/** Recommended eleven for the user's squad vs. the eleven they have set. */
export function useLineupPlan(
  leagueId: string | undefined,
  competition: CompetitionId | undefined,
) {
  const squad = useSquad(leagueId);
  const proj = useProjections(competition);
  const data = useMemo(() => {
    if (!squad.data || !proj.data) return undefined;
    const rules = currentSeasonRules;
    const { projections, playersById } = proj.data;
    const candidates = squad.data.players.flatMap((sp) => {
      const pl = playersById.get(sp.playerId);
      const pr = projections.get(sp.playerId);
      if (!pl || !pr) return [];
      return [
        {
          playerId: pl.id,
          position: pl.position,
          xPts: pr.xPts,
          available: pr.fixture !== null && pr.pStart + pr.pSub > 0,
        },
      ];
    });
    const plan = optimizeLineup(candidates, {
      formations: rules.lineup.formations,
      captainMultiplier: rules.captain.multiplier,
    });
    const xById = new Map(candidates.map((c) => [c.playerId, c.xPts]));
    const mine = squad.data.lineup;
    const mineTotal = mine
      ? evaluateLineup(mine.playerIds, mine.captainId, xById, rules.captain.multiplier)
      : null;
    return { plan, mine, mineTotal };
  }, [squad.data, proj.data]);
  return {
    data,
    isLoading: squad.isLoading || proj.isLoading,
    error: squad.error ?? proj.error,
    refetch: () => {
      void squad.refetch();
      void proj.refetch();
    },
  };
}
