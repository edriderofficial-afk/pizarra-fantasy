import Feather from '@expo/vector-icons/Feather';
import { summarizePlayer, upcomingFixtures } from '@pizarra/core';
import { palette } from '@pizarra/ui';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { DifficultyBadge, PositionBadge, StatusBadge } from '../../components/badges';
import { Bars, Sparkline } from '../../components/charts';
import { ReasonList } from '../../components/reasons';
import {
  Button,
  Card,
  Disclaimer,
  ErrorState,
  LoadingState,
  Muted,
  Screen,
  SectionTitle,
  Stat,
} from '../../components/ui';
import { fmtDateTime, fmtMoney, fmtNumber, fmtPercent, fmtSigned } from '../../lib/format';
import {
  useFixtures,
  usePlayer,
  usePlayerHistory,
  usePriceHistory,
  useProjections,
  useTeams,
} from '../../lib/queries';
import { MAX_COMPARE, useAppStore } from '../../state/app-store';

export default function PlayerScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const player = usePlayer(id);
  const history = usePlayerHistory(id);
  const prices = usePriceHistory(id);
  const competition = player.data?.competition;
  const proj = useProjections(competition);
  const fixtures = useFixtures(competition);
  const teams = useTeams(competition);
  const compareIds = useAppStore((s) => s.compareIds);
  const toggleCompare = useAppStore((s) => s.toggleCompare);

  const summary = useMemo(
    () => (history.data ? summarizePlayer(history.data) : null),
    [history.data],
  );
  const upcoming = useMemo(
    () =>
      player.data && fixtures.data && proj.data
        ? upcomingFixtures(player.data.teamId, fixtures.data, proj.data.matchday, 5)
        : [],
    [player.data, fixtures.data, proj.data],
  );

  if (player.isLoading) return <LoadingState />;
  if (player.error || !player.data) return <ErrorState onRetry={() => void player.refetch()} />;

  const p = player.data;
  const projection = proj.data?.projections.get(p.id);
  const team = teams.byId.get(p.teamId);
  const inCompare = compareIds.includes(p.id);
  const compareFull = !inCompare && compareIds.length >= MAX_COMPARE;
  const priceValues = (prices.data ?? []).map((x) => x.price);
  const priceChange =
    priceValues.length > 1 ? (priceValues.at(-1) as number) - (priceValues[0] as number) : 0;
  const lastTen = (history.data ?? []).slice(-10);
  const sp = p.setPieces;
  const setPieces = [
    sp.penalties && t('player.penalties'),
    sp.freeKicks && t('player.freeKicks'),
    sp.corners && t('player.corners'),
  ].filter((x): x is string => typeof x === 'string');

  return (
    <Screen>
      <Stack.Screen options={{ title: p.name }} />
      <Card>
        <View className="flex-row items-center gap-2">
          <PositionBadge position={p.position} />
          <Text className="flex-1 text-xl font-bold text-dark-text">{p.name}</Text>
        </View>
        <Muted>
          {team?.name ?? ''} · {t(`competitions.${p.competition}`)}
        </Muted>
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-dark-text">{fmtMoney(p.price)}</Text>
          <StatusBadge status={p.status} showAvailable />
        </View>
        {setPieces.length > 0 ? (
          <View className="flex-row items-center gap-2">
            <Feather name="target" size={14} color={palette.accent[400]} />
            <Muted>
              {t('player.setPieces')}: {setPieces.join(', ')}
            </Muted>
          </View>
        ) : null}
      </Card>

      {projection ? (
        <Card>
          <SectionTitle>{t('player.nextMatch')}</SectionTitle>
          {projection.fixture ? (
            <View className="flex-row items-center gap-2">
              <Text className="text-base text-dark-text">
                {projection.fixture.isHome ? t('common.home') : t('common.away')} · {t('common.vs')}{' '}
                {teams.byId.get(projection.fixture.opponentTeamId)?.name}
              </Text>
              <DifficultyBadge level={projection.fixture.difficulty} />
            </View>
          ) : (
            <Muted>{t('common.noFixture')}</Muted>
          )}
          <Text className="text-3xl font-bold text-dark-text">
            {fmtNumber(projection.xPts)}{' '}
            <Text className="text-base font-normal text-dark-textMuted">{t('common.xpts')}</Text>
          </Text>
          <Muted>
            {t('player.range', { p10: fmtNumber(projection.p10), p90: fmtNumber(projection.p90) })}{' '}
            · {t('player.startProb', { value: fmtPercent(projection.pStart) })}
          </Muted>
          <Text className="mt-2 font-semibold text-dark-text">{t('player.why')}</Text>
          <ReasonList reasons={projection.reasons} />
          <Muted className="text-xs">
            {t('common.estimate')} · v{projection.modelVersion}
          </Muted>
        </Card>
      ) : null}

      <Button
        label={
          inCompare
            ? t('common.removeFromCompare')
            : compareFull
              ? t('compare.max')
              : t('common.addToCompare')
        }
        variant="outline"
        onPress={() => (compareFull ? undefined : toggleCompare(p.id))}
      />

      {upcoming.length > 0 ? (
        <Card>
          <SectionTitle>{t('player.upcoming')}</SectionTitle>
          {upcoming.map((f) => (
            <View key={f.fixtureId} className="flex-row items-center justify-between py-1">
              <View className="flex-1">
                <Text className="text-dark-text">
                  J{f.matchday} · {f.isHome ? t('common.vs') : '@'}{' '}
                  {teams.byId.get(f.opponentTeamId)?.shortName}
                </Text>
                <Muted className="text-xs">{fmtDateTime(f.kickoff)}</Muted>
              </View>
              <DifficultyBadge level={f.difficulty} />
            </View>
          ))}
        </Card>
      ) : null}

      {lastTen.length > 0 ? (
        <Card>
          <SectionTitle>{t('player.history')}</SectionTitle>
          <Bars
            values={lastTen.map((h) => h.points)}
            labels={lastTen.map((h) => `J${h.matchday}`)}
            accessibilityLabel={`${t('player.history')}: ${lastTen.map((h) => `J${h.matchday} ${h.points}`).join(', ')}`}
          />
        </Card>
      ) : null}

      {priceValues.length > 1 ? (
        <Card>
          <View className="flex-row items-center justify-between">
            <SectionTitle>{t('player.price')}</SectionTitle>
            <Text
              style={{ color: priceChange >= 0 ? palette.success : palette.danger }}
              className="font-semibold"
            >
              {fmtSigned(priceChange / 1_000_000)}M
            </Text>
          </View>
          <Sparkline
            values={priceValues}
            accessibilityLabel={`${t('player.price')}: ${fmtMoney(priceValues[0] as number)} → ${fmtMoney(priceValues.at(-1) as number)}`}
          />
        </Card>
      ) : null}

      {summary ? (
        <Card>
          <SectionTitle>{t('player.season')}</SectionTitle>
          <View className="flex-row flex-wrap gap-3">
            <Stat label={t('stats.totalPoints')} value={String(summary.totalPoints)} />
            <Stat
              label={t('stats.averagePoints')}
              value={summary.averagePoints === null ? '–' : fmtNumber(summary.averagePoints)}
            />
            <Stat label={t('stats.starts')} value={String(summary.starts)} />
            <Stat label={t('stats.minutes')} value={String(summary.minutes)} />
            <Stat label={t('stats.goals')} value={String(summary.goals)} />
            <Stat label={t('stats.assists')} value={String(summary.assists)} />
            {p.position === 'GK' ? (
              <Stat label={t('stats.saves')} value={String(summary.saves)} />
            ) : null}
            <Stat label={t('stats.yellowCards')} value={String(summary.yellowCards)} />
          </View>
        </Card>
      ) : null}
      <Disclaimer />
    </Screen>
  );
}
