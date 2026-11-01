import type { Offer, Position } from '@pizarra/core';
import { palette } from '@pizarra/ui';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { PlayerRow } from '../../components/player-row';
import {
  Card,
  ErrorState,
  LoadingState,
  Muted,
  Screen,
  SectionTitle,
  Stat,
} from '../../components/ui';
import { fmtMoney, fmtSigned } from '../../lib/format';
import {
  useActiveLeague,
  useOffers,
  useProjections,
  useSquad,
  useStandings,
  useTeams,
} from '../../lib/queries';
import { useAppStore } from '../../state/app-store';

const ORDER: Record<Position, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 };

export default function SquadScreen() {
  const { t } = useTranslation();
  const { league } = useActiveLeague();
  const squad = useSquad(league?.id);
  const offers = useOffers(league?.id);
  const standings = useStandings(league?.id);
  const proj = useProjections(league?.competition);
  const teams = useTeams(league?.competition);
  const toggleCompare = useAppStore((s) => s.toggleCompare);

  const rows = useMemo(() => {
    if (!squad.data || !proj.data) return [];
    return squad.data.players
      .flatMap((sp) => {
        const player = proj.data.playersById.get(sp.playerId);
        return player ? [{ sp, player, projection: proj.data.projections.get(sp.playerId) }] : [];
      })
      .sort(
        (a, b) =>
          ORDER[a.player.position] - ORDER[b.player.position] ||
          (b.projection?.xPts ?? 0) - (a.projection?.xPts ?? 0),
      );
  }, [squad.data, proj.data]);

  if (squad.isLoading || proj.isLoading) return <LoadingState />;
  if (squad.error || proj.error || !squad.data) {
    return (
      <ErrorState
        onRetry={() => {
          void squad.refetch();
          void proj.refetch();
        }}
      />
    );
  }

  const value = standings.data?.find((s) => s.managerId === squad.data.managerId)?.teamValue;
  const managerName = (id: string | null) =>
    id === null
      ? t('squad.offerFromGame')
      : t('squad.offerFrom', {
          from: standings.data?.find((s) => s.managerId === id)?.managerName ?? id,
        });

  const header = (
    <View className="gap-4 p-4">
      <Card>
        <View className="flex-row flex-wrap gap-3">
          <Stat label={t('common.balance')} value={fmtMoney(squad.data.balance)} />
          {value !== undefined ? <Stat label={t('squad.value')} value={fmtMoney(value)} /> : null}
          <Stat
            label={t('tabs.squad')}
            value={t('squad.players', { count: squad.data.players.length })}
          />
        </View>
      </Card>
      <Card>
        <SectionTitle>{t('squad.offers')}</SectionTitle>
        {(offers.data ?? []).length === 0 ? <Muted>{t('squad.noOffers')}</Muted> : null}
        {(offers.data ?? []).map((o: Offer) => {
          const p = proj.data?.playersById.get(o.playerId);
          return (
            <View key={o.id} className="flex-row items-center justify-between py-1">
              <View className="flex-1">
                <Text className="text-base text-dark-text">{p?.name ?? o.playerId}</Text>
                <Muted className="text-xs">{managerName(o.fromManagerId)}</Muted>
              </View>
              <Text className="font-semibold text-dark-text">{fmtMoney(o.amount)}</Text>
            </View>
          );
        })}
      </Card>
    </View>
  );

  return (
    <Screen scroll={false}>
      <FlashList
        data={rows}
        keyExtractor={(r) => r.sp.playerId}
        ListHeaderComponent={header}
        renderItem={({ item }) => {
          const change = item.player.price - item.sp.purchasePrice;
          const opp = item.projection?.fixture
            ? teams.byId.get(item.projection.fixture.opponentTeamId)?.shortName
            : undefined;
          return (
            <PlayerRow
              player={item.player}
              teamShort={teams.byId.get(item.player.teamId)?.shortName ?? ''}
              opponentShort={opp}
              projection={item.projection}
              onPress={() =>
                router.push({ pathname: '/player/[id]', params: { id: item.player.id } })
              }
              onLongPress={() => toggleCompare(item.player.id)}
              right={
                <View className="items-end">
                  <Text className="text-xs text-dark-textMuted">{fmtMoney(item.player.price)}</Text>
                  <Text
                    accessibilityLabel={`${t('squad.change')}: ${fmtSigned(change / 1_000_000)}M`}
                    className="text-xs font-semibold"
                    style={{ color: change >= 0 ? palette.success : palette.danger }}
                  >
                    {fmtSigned(change / 1_000_000)}M
                  </Text>
                </View>
              }
            />
          );
        }}
      />
    </Screen>
  );
}
