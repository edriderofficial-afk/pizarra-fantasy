import type { Position } from '@pizarra/core';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { PlayerRow } from '../../components/player-row';
import { Chip, ErrorState, LoadingState, Muted, Screen } from '../../components/ui';
import { fmtMoney, fmtNumber } from '../../lib/format';
import {
  useActiveLeague,
  useMarket,
  useProjections,
  useStandings,
  useTeams,
} from '../../lib/queries';
import { useAppStore } from '../../state/app-store';

type Sort = 'xpts' | 'value' | 'price';
const POSITIONS: (Position | 'ALL')[] = ['ALL', 'GK', 'DEF', 'MID', 'FWD'];

export default function MarketScreen() {
  const { t } = useTranslation();
  const { league } = useActiveLeague();
  const market = useMarket(league?.id);
  const proj = useProjections(league?.competition);
  const teams = useTeams(league?.competition);
  const standings = useStandings(league?.id);
  const toggleCompare = useAppStore((s) => s.toggleCompare);
  const [position, setPosition] = useState<Position | 'ALL'>('ALL');
  const [sort, setSort] = useState<Sort>('xpts');

  const rows = useMemo(() => {
    if (!market.data || !proj.data) return [];
    const list = market.data.flatMap((listing) => {
      const player = proj.data.playersById.get(listing.playerId);
      if (!player || (position !== 'ALL' && player.position !== position)) return [];
      const projection = proj.data.projections.get(listing.playerId);
      const xPts = projection?.xPts ?? 0;
      const perXpt = xPts > 0.1 ? listing.askingPrice / xPts : Number.POSITIVE_INFINITY;
      return [{ listing, player, projection, xPts, perXpt }];
    });
    const cmp: Record<Sort, (a: (typeof list)[number], b: (typeof list)[number]) => number> = {
      xpts: (a, b) => b.xPts - a.xPts,
      value: (a, b) => a.perXpt - b.perXpt,
      price: (a, b) => a.listing.askingPrice - b.listing.askingPrice,
    };
    return list.sort(cmp[sort]);
  }, [market.data, proj.data, position, sort]);

  if (market.isLoading || proj.isLoading) return <LoadingState />;
  if (market.error || proj.error) {
    return (
      <ErrorState
        onRetry={() => {
          void market.refetch();
          void proj.refetch();
        }}
      />
    );
  }

  const sellerName = (id: string | null) =>
    id === null
      ? t('market.free')
      : t('market.seller', {
          name: standings.data?.find((s) => s.managerId === id)?.managerName ?? id,
        });

  return (
    <Screen scroll={false}>
      <View className="gap-2 border-b border-dark-border p-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2"
        >
          {POSITIONS.map((p) => (
            <Chip
              key={p}
              label={p === 'ALL' ? t('common.all') : t(`positions.${p}`)}
              selected={position === p}
              onPress={() => setPosition(p)}
            />
          ))}
        </ScrollView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2"
        >
          <Chip
            label={t('market.sortXpts')}
            selected={sort === 'xpts'}
            onPress={() => setSort('xpts')}
          />
          <Chip
            label={t('market.sortValue')}
            selected={sort === 'value'}
            onPress={() => setSort('value')}
          />
          <Chip
            label={t('market.sortPrice')}
            selected={sort === 'price'}
            onPress={() => setSort('price')}
          />
        </ScrollView>
        <Muted className="text-xs">{t('common.estimate')}</Muted>
      </View>
      <FlashList
        data={rows}
        keyExtractor={(r) => r.listing.playerId}
        renderItem={({ item }) => {
          const fx = item.projection?.fixture;
          return (
            <PlayerRow
              player={item.player}
              teamShort={teams.byId.get(item.player.teamId)?.shortName ?? ''}
              opponentShort={fx ? teams.byId.get(fx.opponentTeamId)?.shortName : undefined}
              projection={item.projection}
              onPress={() =>
                router.push({ pathname: '/player/[id]', params: { id: item.player.id } })
              }
              onLongPress={() => toggleCompare(item.player.id)}
              right={
                <View className="items-end">
                  <Text className="text-xs font-semibold text-dark-text">
                    {fmtMoney(item.listing.askingPrice)}
                  </Text>
                  <Text className="text-[11px] text-dark-textMuted">
                    {Number.isFinite(item.perXpt)
                      ? t('common.perXpt', { value: `${fmtNumber(item.perXpt / 1_000_000, 2)}M` })
                      : '–'}
                  </Text>
                  <Text className="text-[11px] text-dark-textMuted">
                    {sellerName(item.listing.sellerManagerId)}
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
