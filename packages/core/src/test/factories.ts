import type { Fixture, Player, PlayerMatchStats } from '../domain/schemas';

export function player(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    name: 'Jugador Prueba',
    teamId: 'A',
    competition: 'primera',
    position: 'MID',
    price: 10_000_000,
    status: 'available',
    setPieces: { penalties: false, freeKicks: false, corners: false },
    ...overrides,
  };
}

export function match(
  matchday: number,
  overrides: Partial<PlayerMatchStats> = {},
): PlayerMatchStats {
  return {
    playerId: 'p1',
    fixtureId: `f${matchday}`,
    matchday,
    started: true,
    minutes: 90,
    points: 5,
    goals: 0,
    assists: 0,
    shots: 1,
    saves: 0,
    clearances: 1,
    duelsWon: 3,
    possessionsLost: 5,
    goalsConceded: 1,
    yellowCards: 0,
    redCards: 0,
    ...overrides,
  };
}

export function fixture(
  matchday: number,
  home: string,
  away: string,
  goals: [number, number] | null = null,
): Fixture {
  return {
    id: `${matchday}-${home}-${away}`,
    competition: 'primera',
    matchday,
    homeTeamId: home,
    awayTeamId: away,
    kickoff: `2026-09-${String(matchday).padStart(2, '0')}T18:00:00Z`,
    status: goals ? 'finished' : 'scheduled',
    homeGoals: goals ? goals[0] : null,
    awayGoals: goals ? goals[1] : null,
  };
}
