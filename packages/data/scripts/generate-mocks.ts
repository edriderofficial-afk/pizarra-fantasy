/**
 * Deterministic generator for MockProvider fixtures.
 * All teams, players and managers are FICTIONAL. Run with:
 *   pnpm --filter @pizarra/data generate:mocks
 * Output: packages/data/src/mock/fixtures/*.json (committed).
 * Self-contained on purpose (no workspace imports) so it runs with plain `node`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

type Position = 'GK' | 'DEF' | 'MID' | 'FWD';
type Competition = 'primera' | 'hypermotion';
type Status = 'available' | 'doubtful' | 'injured' | 'suspended';

const SEED = 20262027;
const PLAYED_MATCHDAYS = 10;
const TOTAL_MATCHDAYS = 15;
const NEXT_MATCHDAY = PLAYED_MATCHDAYS + 1;
const PRICE_DAYS = 45;
const DAY = 86_400_000;
/** Matchday 1 kicks off on this Friday; one matchday per week. */
const MD1 = Date.UTC(2026, 7, 28, 19, 0, 0);
const kickoffOf = (md: number, slot: number) =>
  new Date(MD1 + (md - 1) * 7 * DAY + slot * 3 * 3_600_000 + Math.floor(slot / 4) * DAY)
    .toISOString()
    .replace('.000Z', 'Z');
const NOW = new Date(MD1 + PLAYED_MATCHDAYS * 7 * DAY - 2 * DAY)
  .toISOString()
  .replace('.000Z', 'Z');

// ---------- PRNG ----------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);
const between = (min: number, max: number) => min + rand() * (max - min);
const int = (min: number, max: number) => Math.floor(between(min, max + 1));
const chance = (p: number) => rand() < p;
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)] as T;
}
function poisson(lambda: number): number {
  const l = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rand();
  } while (p > l);
  return k - 1;
}
function weightedIndex(weights: readonly number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i] as number;
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

// ---------- Fictional names ----------
const TEAM_NAMES_PRIMERA = [
  ['Real Brisamar', 'BRI'],
  ['Atlético Olivar', 'OLI'],
  ['CD Montecierzo', 'MON'],
  ['UD Salinera', 'SAL'],
  ['Racing Altamira Sur', 'ALT'],
  ['SD Valdeluna', 'VAL'],
  ['CF Puertoviejo', 'PUE'],
  ['Deportivo Robledal', 'ROB'],
  ['Unión Castrovega', 'CAS'],
  ['Sporting Mareaalta', 'MAR'],
  ['CD Peñaserena', 'PEN'],
  ['Real Arenisca', 'ARE'],
  ['Atlético Riberalta', 'RIB'],
  ['UD Campoclaro', 'CAM'],
  ['CF Torreblanca Norte', 'TOR'],
  ['SD Fuentefría', 'FUE'],
  ['Club Lagunaverde', 'LAG'],
  ['CD Sierraluz', 'SIE'],
  ['Real Villacobre', 'VIL'],
  ['UD Rocamar', 'ROC'],
] as const;
const TEAM_NAMES_HYPER = [
  ['CD Pinarejo', 'PIN'],
  ['UD Almenara Baja', 'ALM'],
  ['Racing Cumbresol', 'CUM'],
  ['SD Navalrío', 'NAV'],
] as const;
const FIRST = [
  'Adrián',
  'Bruno',
  'Carlos',
  'Dani',
  'Eloy',
  'Fermín',
  'Gael',
  'Hugo',
  'Iker',
  'Jaime',
  'Koldo',
  'Lucas',
  'Mario',
  'Nico',
  'Óscar',
  'Pablo',
  'Quique',
  'Raúl',
  'Sergio',
  'Tomás',
  'Unai',
  'Víctor',
  'Xavi',
  'Yago',
  'Álex',
  'Rubén',
  'Marcos',
  'Iván',
  'Jon',
  'Teo',
  'Enzo',
  'Leo',
  'Ander',
  'Gonzalo',
  'Martín',
  'Diego',
];
const LAST = [
  'Arribas',
  'Belmonte',
  'Cuevas',
  'Doral',
  'Echarri',
  'Ferrán',
  'Galdós',
  'Hierro',
  'Ibarra',
  'Jurado',
  'Lizarra',
  'Maldonado',
  'Navas',
  'Ordás',
  'Prieto',
  'Quintanar',
  'Rosales',
  'Sandoval',
  'Toral',
  'Urrutia',
  'Valcárcel',
  'Zabala',
  'Montoro',
  'Alcaraz',
  'Barrena',
  'Cifuentes',
  'Garmendia',
  'Lerma',
  'Otxoa',
  'Reboredo',
  'Salcedo',
  'Tejero',
  'Villar',
  'Yáñez',
  'Almagro',
  'Carrasco',
  'Escobedo',
  'Lastra',
  'Mendizábal',
  'Peralta',
];
const MANAGERS = ['Tú', 'Lucía', 'Marcos', 'Irene', 'Javi', 'Nerea', 'Pau', 'Sofía'];
const HYPER_MANAGERS = ['Tú', 'Andrés', 'Carla'];

// ---------- Teams & players ----------
interface TeamGen {
  id: string;
  name: string;
  shortName: string;
  competition: Competition;
  strength: number;
}
interface PlayerGen {
  id: string;
  name: string;
  teamId: string;
  competition: Competition;
  position: Position;
  quality: number;
  depth: number;
  price: number;
  status: Status;
  setPieces: { penalties: boolean; freeKicks: boolean; corners: boolean };
}

const teams: TeamGen[] = [];
const addTeams = (
  list: readonly (readonly [string, string])[],
  competition: Competition,
  prefix: string,
) => {
  list.forEach(([name, shortName], i) => {
    teams.push({
      id: `${prefix}${String(i + 1).padStart(2, '0')}`,
      name,
      shortName,
      competition,
      strength: between(0.65, 1.4),
    });
  });
};
addTeams(TEAM_NAMES_PRIMERA, 'primera', 't');
addTeams(TEAM_NAMES_HYPER, 'hypermotion', 'h');

const SHAPE: Record<Position, number> = { GK: 2, DEF: 6, MID: 6, FWD: 4 };
const usedNames = new Set<string>();
function uniqueName(): string {
  for (;;) {
    const n = `${pick(FIRST)} ${pick(LAST)}`;
    if (!usedNames.has(n)) {
      usedNames.add(n);
      return n;
    }
  }
}

const players: PlayerGen[] = [];
let pid = 0;
for (const team of teams) {
  for (const pos of ['GK', 'DEF', 'MID', 'FWD'] as const) {
    const qualities = Array.from(
      { length: SHAPE[pos] },
      () => team.strength * between(0.6, 1.25),
    ).sort((a, b) => b - a);
    qualities.forEach((quality, depth) => {
      pid++;
      players.push({
        id: `p${String(pid).padStart(4, '0')}`,
        name: uniqueName(),
        teamId: team.id,
        competition: team.competition,
        position: pos,
        quality,
        depth,
        price: 0,
        status: 'available',
        setPieces: { penalties: false, freeKicks: false, corners: false },
      });
    });
  }
  const outfield = players.filter(
    (p) => p.teamId === team.id && p.position !== 'GK' && p.depth < 4,
  );
  const best = (pos: Position[]) =>
    outfield.filter((p) => pos.includes(p.position)).sort((a, b) => b.quality - a.quality)[0];
  const pen = best(['FWD']);
  const fk = best(['MID']);
  if (pen) pen.setPieces.penalties = true;
  if (fk) fk.setPieces.freeKicks = true;
  if (fk) fk.setPieces.corners = true;
}

// ---------- Fixtures (circle method round robin) ----------
interface FixtureGen {
  id: string;
  competition: Competition;
  matchday: number;
  homeTeamId: string;
  awayTeamId: string;
  kickoff: string;
  status: 'scheduled' | 'finished';
  homeGoals: number | null;
  awayGoals: number | null;
}
function roundRobin(ids: string[]): [string, string][][] {
  const list = [...ids];
  const rounds: [string, string][][] = [];
  for (let r = 0; r < list.length - 1; r++) {
    const round: [string, string][] = [];
    for (let i = 0; i < list.length / 2; i++) {
      const a = list[i] as string;
      const b = list[list.length - 1 - i] as string;
      round.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(round);
    list.splice(1, 0, list.pop() as string);
  }
  return rounds;
}
const fixtures: FixtureGen[] = [];
for (const competition of ['primera', 'hypermotion'] as const) {
  const ids = teams.filter((t) => t.competition === competition).map((t) => t.id);
  const rounds = roundRobin(ids);
  for (let md = 1; md <= TOTAL_MATCHDAYS; md++) {
    const round = rounds[(md - 1) % rounds.length] as [string, string][];
    const flip = Math.floor((md - 1) / rounds.length) % 2 === 1;
    round.forEach(([h, a], slot) => {
      const [home, away] = flip ? [a, h] : [h, a];
      fixtures.push({
        id: `${competition === 'primera' ? 'm' : 'hm'}${md}-${slot + 1}`,
        competition,
        matchday: md,
        homeTeamId: home,
        awayTeamId: away,
        kickoff: kickoffOf(md, slot),
        status: 'scheduled',
        homeGoals: null,
        awayGoals: null,
      });
    });
  }
}

// ---------- Match simulation ----------
const STAT_COLUMNS = [
  'playerId',
  'fixtureId',
  'matchday',
  'started',
  'minutes',
  'points',
  'goals',
  'assists',
  'shots',
  'saves',
  'clearances',
  'duelsWon',
  'possessionsLost',
  'goalsConceded',
  'yellowCards',
  'redCards',
] as const;
type StatRow = [
  string,
  string,
  number,
  boolean,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];
const statRows: StatRow[] = [];
const GOAL_PTS: Record<Position, number> = { GK: 10, DEF: 6, MID: 5, FWD: 4 };
const CS_PTS: Record<Position, number> = { GK: 4, DEF: 3, MID: 1, FWD: 0 };
const GOAL_W: Record<Position, number> = { GK: 0, DEF: 0.12, MID: 0.33, FWD: 0.55 };
const ASSIST_W: Record<Position, number> = { GK: 0.01, DEF: 0.2, MID: 0.5, FWD: 0.29 };
const unavailableUntil = new Map<string, number>();
const teamPlayers = (teamId: string) => players.filter((p) => p.teamId === teamId);

function pickLineup(teamId: string, md: number) {
  const squad = teamPlayers(teamId).filter((p) => (unavailableUntil.get(p.id) ?? 0) < md);
  const shape: Record<Position, number> = chance(0.5)
    ? { GK: 1, DEF: 4, MID: 4, FWD: 2 }
    : { GK: 1, DEF: 4, MID: 3, FWD: 3 };
  const starters: PlayerGen[] = [];
  for (const pos of ['GK', 'DEF', 'MID', 'FWD'] as const) {
    const pool = squad.filter((p) => p.position === pos).sort((a, b) => a.depth - b.depth);
    const chosen = pool.slice(0, shape[pos]);
    // rotation: occasionally swap a starter for the next in line
    if (pos !== 'GK' && chance(0.3) && pool.length > shape[pos]) {
      chosen[int(0, chosen.length - 1)] = pool[shape[pos]] as PlayerGen;
    }
    starters.push(...chosen);
  }
  const bench = squad.filter((p) => !starters.includes(p) && p.position !== 'GK');
  const subs = [...bench].sort(() => rand() - 0.5).slice(0, 3);
  return { starters, subs };
}

for (const f of fixtures) {
  if (f.matchday > PLAYED_MATCHDAYS) continue;
  const home = teams.find((t) => t.id === f.homeTeamId) as TeamGen;
  const away = teams.find((t) => t.id === f.awayTeamId) as TeamGen;
  const hg = poisson(1.45 * (home.strength / away.strength) ** 0.8);
  const ag = poisson(1.1 * (away.strength / home.strength) ** 0.8);
  f.homeGoals = hg;
  f.awayGoals = ag;
  f.status = 'finished';

  for (const [team, scored, conceded] of [
    [home, hg, ag],
    [away, ag, hg],
  ] as const) {
    const { starters, subs } = pickLineup(team.id, f.matchday);
    const minutes = new Map<string, number>();
    starters.forEach((p) => minutes.set(p.id, 90));
    subs.forEach((s, i) => {
      const out = starters.filter((p) => p.position === s.position && p.position !== 'GK')[i % 2];
      const m = int(10, 35);
      if (out) minutes.set(out.id, 90 - m);
      minutes.set(s.id, m);
    });
    const onPitch = [...minutes.keys()].map((id) => players.find((p) => p.id === id) as PlayerGen);
    const goals = new Map<string, number>();
    const assists = new Map<string, number>();
    const inc = (m: Map<string, number>, id: string) => m.set(id, (m.get(id) ?? 0) + 1);
    for (let g = 0; g < scored; g++) {
      const w = onPitch.map(
        (p) => GOAL_W[p.position] * p.quality * ((minutes.get(p.id) ?? 0) / 90),
      );
      const scorer = onPitch[weightedIndex(w)] as PlayerGen;
      inc(goals, scorer.id);
      if (chance(0.75)) {
        const others = onPitch.filter((p) => p !== scorer);
        const aw = others.map(
          (p) => ASSIST_W[p.position] * p.quality * ((minutes.get(p.id) ?? 0) / 90),
        );
        inc(assists, (others[weightedIndex(aw)] as PlayerGen).id);
      }
    }
    for (const p of teamPlayers(team.id)) {
      const mins = minutes.get(p.id) ?? 0;
      const started = starters.includes(p);
      if (mins === 0) {
        statRows.push([p.id, f.id, f.matchday, false, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
        continue;
      }
      const g = goals.get(p.id) ?? 0;
      const a = assists.get(p.id) ?? 0;
      const yellow = chance(0.12) ? 1 : 0;
      const red = chance(0.012) ? 1 : 0;
      const gc = mins >= 60 ? conceded : 0;
      const saves = p.position === 'GK' ? poisson(2.5 + conceded * 0.6) : 0;
      let pts = mins >= 60 ? 2 : 1;
      pts += g * GOAL_PTS[p.position] + a * 3;
      if (mins >= 60 && conceded === 0) pts += CS_PTS[p.position];
      if (p.position === 'GK' || p.position === 'DEF')
        pts -= Math.floor(gc / 2) * (p.position === 'GK' ? 2 : 1);
      pts -= yellow + red * 3;
      pts += Math.min(4, Math.max(0, Math.round(p.quality * 1.6 + between(-1.5, 1.5) + g)));
      statRows.push([
        p.id,
        f.id,
        f.matchday,
        started,
        mins,
        pts,
        g,
        a,
        p.position === 'GK'
          ? 0
          : poisson(p.position === 'FWD' ? 2.2 : p.position === 'MID' ? 1.2 : 0.4),
        saves,
        poisson(p.position === 'DEF' ? 4 : p.position === 'GK' ? 1 : 0.8),
        poisson(p.position === 'GK' ? 0.3 : 4),
        poisson(p.position === 'GK' ? 4 : 8),
        gc,
        yellow,
        red,
      ]);
      if (red) unavailableUntil.set(p.id, f.matchday + 1);
      if (chance(0.015)) unavailableUntil.set(p.id, f.matchday + int(1, 5));
    }
  }
}

// Current status from injuries/suspensions still running at the next matchday
for (const p of players) {
  const until = unavailableUntil.get(p.id) ?? 0;
  if (until >= NEXT_MATCHDAY) p.status = until - NEXT_MATCHDAY >= 1 ? 'injured' : 'suspended';
  else if (chance(0.03)) p.status = 'doubtful';
}

// ---------- Prices ----------
const pointsByPlayer = new Map<string, number[]>();
for (const r of statRows) {
  const arr = pointsByPlayer.get(r[0]) ?? [];
  arr.push(r[5]);
  pointsByPlayer.set(r[0], arr);
}
const round10k = (n: number) => Math.max(150_000, Math.round(n / 10_000) * 10_000);
const priceSeries: Record<string, number[]> = {};
for (const p of players) {
  const posBase: Record<Position, number> = { GK: 0.7, DEF: 0.85, MID: 1, FWD: 1.15 };
  const depthFactor = [1, 0.75, 0.45, 0.3, 0.2, 0.15][p.depth] ?? 0.15;
  const compFactor = p.competition === 'hypermotion' ? 0.25 : 1;
  let price =
    1_500_000 * Math.exp(p.quality * 1.9) * posBase[p.position] * depthFactor * compFactor;
  const pts = pointsByPlayer.get(p.id) ?? [];
  const form = pts.length ? pts.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, pts.length) : 0;
  const drift = (form - 4) * 0.002;
  const series: number[] = [];
  for (let d = 0; d < PRICE_DAYS; d++) {
    price *= 1 + drift + between(-0.012, 0.012);
    if (p.status === 'injured' && d > PRICE_DAYS - 6) price *= 0.985;
    series.push(round10k(price));
  }
  priceSeries[p.id] = series;
  p.price = series[series.length - 1] as number;
}
const priceStartDate = new Date(Date.parse(NOW) - (PRICE_DAYS - 1) * DAY)
  .toISOString()
  .slice(0, 10);

// ---------- Leagues, squads, market ----------
const lockAfter = (days: number) =>
  new Date(Date.parse(NOW) + days * DAY).toISOString().replace('.000Z', 'Z');
const marketCloses = new Date(Date.parse(kickoffOf(NEXT_MATCHDAY, 0)) - 3_600_000)
  .toISOString()
  .replace('.000Z', 'Z');

function buildLeague(
  id: string,
  name: string,
  competition: Competition,
  managerNames: string[],
  squadShape: Record<Position, number>,
) {
  const pool = players
    .filter((p) => p.competition === competition && p.depth < 5)
    .sort(() => rand() - 0.5);
  const taken = new Set<string>();
  const managers = managerNames.map((n, i) => ({ id: `${id}-mgr${i + 1}`, name: n }));
  const squads = managers.map((m) => {
    const chosen: PlayerGen[] = [];
    for (const pos of ['GK', 'DEF', 'MID', 'FWD'] as const) {
      const options = pool.filter((p) => p.position === pos && !taken.has(p.id));
      for (let i = 0; i < squadShape[pos]; i++) {
        const p = options[i] as PlayerGen;
        taken.add(p.id);
        chosen.push(p);
      }
    }
    const byPos = (pos: Position) => chosen.filter((p) => p.position === pos);
    // a plausible but not optimal 4-4-2 lineup (by price, not by form)
    const top = (pos: Position, n: number) =>
      [...byPos(pos)].sort((a, b) => b.price - a.price).slice(0, n);
    const eleven = [...top('GK', 1), ...top('DEF', 4), ...top('MID', 4), ...top('FWD', 2)];
    return {
      leagueId: id,
      managerId: m.id,
      managerName: m.name,
      balance: int(-2, 30) * 500_000,
      players: chosen.map((p) => ({
        playerId: p.id,
        purchasePrice: round10k(p.price * between(0.7, 1.2)),
        clause: round10k(p.price * between(1.3, 2.2)),
        clauseLockedUntil: chance(0.25) ? lockAfter(int(1, 10)) : null,
      })),
      lineup: {
        formation: '4-4-2',
        playerIds: eleven.map((p) => p.id),
        captainId: (eleven[eleven.length - 1] as PlayerGen).id,
      },
    };
  });
  const free = pool.filter((p) => !taken.has(p.id));
  const market = [
    ...free.slice(0, 14).map((p) => ({
      playerId: p.id,
      askingPrice: p.price,
      sellerManagerId: null,
      expiresAt: marketCloses,
    })),
    ...squads.slice(1, 3).map((s) => {
      const sp = s.players[int(0, s.players.length - 1)] as { playerId: string };
      const p = players.find((x) => x.id === sp.playerId) as PlayerGen;
      return {
        playerId: p.id,
        askingPrice: round10k(p.price * 1.15),
        sellerManagerId: s.managerId,
        expiresAt: marketCloses,
      };
    }),
  ];
  const mine = squads[0] as (typeof squads)[number];
  const offers = mine.players.slice(0, 3).map((sp, i) => {
    const p = players.find((x) => x.id === sp.playerId) as PlayerGen;
    return {
      id: `${id}-offer${i + 1}`,
      playerId: p.id,
      fromManagerId: i === 0 ? null : (managers[i] as { id: string }).id,
      amount: round10k(p.price * between(0.9, 1.25)),
      expiresAt: marketCloses,
    };
  });
  const pointsOf = (squad: (typeof squads)[number], md: number) =>
    squad.lineup.playerIds.reduce((acc, pidX) => {
      const r = statRows.find((s) => s[0] === pidX && s[2] === md);
      return acc + (r ? r[5] : 0);
    }, 0);
  const totals = squads.map((s) => {
    let total = 0;
    for (let md = 1; md <= PLAYED_MATCHDAYS; md++) total += pointsOf(s, md);
    const teamValue = s.players.reduce(
      (a, sp) => a + (players.find((p) => p.id === sp.playerId) as PlayerGen).price,
      0,
    );
    return {
      managerId: s.managerId,
      managerName: s.managerName,
      points: total,
      lastMatchdayPoints: pointsOf(s, PLAYED_MATCHDAYS),
      teamValue,
    };
  });
  const standings = [...totals]
    .sort((a, b) => b.points - a.points || a.managerId.localeCompare(b.managerId))
    .map((t, i) => ({ ...t, rank: i + 1 }));
  const live = {
    leagueId: id,
    matchday: PLAYED_MATCHDAYS,
    updatedAt: NOW,
    entries: totals.map((t) => ({
      managerId: t.managerId,
      managerName: t.managerName,
      points: t.lastMatchdayPoints,
      playersPending: 0,
    })),
  };
  return {
    league: {
      id,
      name,
      competition,
      myManagerId: (managers[0] as { id: string }).id,
      marketClosesAt: marketCloses,
    },
    standings,
    squads,
    market,
    offers,
    live,
  };
}

const leagues = [
  buildLeague('lg-amigos', 'Liga de los Amigos', 'primera', MANAGERS, {
    GK: 2,
    DEF: 5,
    MID: 5,
    FWD: 3,
  }),
  buildLeague('lg-hyper', 'Pachanga Hypermotion', 'hypermotion', HYPER_MANAGERS, {
    GK: 2,
    DEF: 5,
    MID: 5,
    FWD: 3,
  }),
];

// ---------- Write ----------
const outDir = join(dirname(fileURLToPath(import.meta.url)), '../src/mock/fixtures');
mkdirSync(outDir, { recursive: true });
const write = (name: string, data: unknown) =>
  writeFileSync(join(outDir, name), `${JSON.stringify(data)}\n`);

write('meta.json', {
  seed: SEED,
  now: NOW,
  nextMatchday: NEXT_MATCHDAY,
  playedMatchdays: PLAYED_MATCHDAYS,
});
write(
  'teams.json',
  teams.map(({ strength: _s, ...t }) => t),
);
write(
  'players.json',
  players.map(({ quality: _q, depth: _d, ...p }) => p),
);
write('fixtures.json', fixtures);
write('stats.json', { columns: STAT_COLUMNS, rows: statRows });
write('prices.json', { startDate: priceStartDate, series: priceSeries });
write('leagues.json', leagues);
console.log(
  `Generated ${teams.length} teams, ${players.length} players, ${fixtures.length} fixtures, ${statRows.length} stat rows -> ${outDir}`,
);
