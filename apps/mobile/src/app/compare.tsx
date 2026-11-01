import { type MetricDirection, bestByMetric, summarizePlayer } from '@pizarra/core';
import { palette } from '@pizarra/ui';
import { useQueries } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Button, Muted, Screen } from '../components/ui';
import { useDataProvider } from '../lib/data-context';
import { fmtMoney, fmtNumber } from '../lib/format';
import { useActiveLeague, useProjections } from '../lib/queries';
import { useAppStore } from '../state/app-store';

const METRICS: { key: string; dir: MetricDirection; fmt: (n: number) => string }[] = [
  { key: 'xPts', dir: 'higher', fmt: (n) => fmtNumber(n) },
  { key: 'totalPoints', dir: 'higher', fmt: String },
  { key: 'averagePoints', dir: 'higher', fmt: (n) => fmtNumber(n) },
  { key: 'lastPoints', dir: 'higher', fmt: String },
  { key: 'price', dir: 'lower', fmt: fmtMoney },
  { key: 'goals', dir: 'higher', fmt: String },
  { key: 'assists', dir: 'higher', fmt: String },
  { key: 'shots', dir: 'higher', fmt: String },
  { key: 'saves', dir: 'higher', fmt: String },
  { key: 'clearances', dir: 'higher', fmt: String },
  { key: 'duelsWon', dir: 'higher', fmt: String },
  { key: 'possessionsLost', dir: 'lower', fmt: String },
  { key: 'goalsConceded', dir: 'lower', fmt: String },
  { key: 'yellowCards', dir: 'lower', fmt: String },
  { key: 'redCards', dir: 'lower', fmt: String },
  { key: 'minutes', dir: 'higher', fmt: String },
];

export default function CompareScreen() {
  const { t } = useTranslation();
  const provider = useDataProvider();
  const ids = useAppStore((s) => s.compareIds);
  const toggle = useAppStore((s) => s.toggleCompare);
  const clear = useAppStore((s) => s.clearCompare);
  const { league } = useActiveLeague();
  const proj = useProjections(league?.competition);
  const players = useQueries({
    queries: ids.map((id) => ({ queryKey: ['player', id], queryFn: () => provider.getPlayer(id) })),
  });
  const histories = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['playerHistory', id],
      queryFn: () => provider.getPlayerHistory(id),
    })),
  });

  if (ids.length === 0) {
    return (
      <Screen>
        <Muted className="text-base">{t('compare.empty')}</Muted>
        <Button
          label={t('tabs.market')}
          onPress={() => router.navigate('/mercado')}
          variant="outline"
        />
      </Screen>
    );
  }

  const rows = ids.map((id, i) => {
    const p = players[i]?.data;
    const s = histories[i]?.data ? summarizePlayer(histories[i].data) : null;
    return {
      id,
      name: p?.name ?? '…',
      metrics: {
        xPts: proj.data?.projections.get(id)?.xPts ?? null,
        price: p?.price ?? null,
        totalPoints: s?.totalPoints ?? null,
        averagePoints: s?.averagePoints ?? null,
        lastPoints: s?.lastPoints ?? null,
        goals: s?.goals ?? null,
        assists: s?.assists ?? null,
        shots: s?.shots ?? null,
        saves: s?.saves ?? null,
        clearances: s?.clearances ?? null,
        duelsWon: s?.duelsWon ?? null,
        possessionsLost: s?.possessionsLost ?? null,
        goalsConceded: s?.goalsConceded ?? null,
        yellowCards: s?.yellowCards ?? null,
        redCards: s?.redCards ?? null,
        minutes: s?.minutes ?? null,
      } as Record<string, number | null>,
    };
  });
  const best = bestByMetric(rows, Object.fromEntries(METRICS.map((m) => [m.key, m.dir])));
  const colW = 96;

  return (
    <Screen>
      <ScrollView horizontal>
        <View>
          <View className="flex-row border-b border-dark-border pb-2">
            <View style={{ width: 120 }} />
            {rows.map((r) => (
              <Pressable
                key={r.id}
                style={{ width: colW }}
                accessibilityRole="button"
                accessibilityLabel={`${t('common.removeFromCompare')}: ${r.name}`}
                onPress={() => toggle(r.id)}
                className="items-center gap-1 px-1"
              >
                <Text numberOfLines={2} className="text-center text-sm font-bold text-dark-text">
                  {r.name}
                </Text>
                <Muted className="text-xs">✕</Muted>
              </Pressable>
            ))}
          </View>
          {METRICS.map((m) => (
            <View key={m.key} className="flex-row border-b border-dark-border py-2">
              <Text style={{ width: 120 }} className="text-sm text-dark-textMuted">
                {t(`stats.${m.key}`)}
              </Text>
              {rows.map((r) => {
                const v = r.metrics[m.key];
                const winners = best[m.key] ?? [];
                // a tie across every player carries no information: highlight nothing
                const isBest =
                  rows.length > 1 && winners.length < rows.length && winners.includes(r.id);
                return (
                  <Text
                    key={r.id}
                    style={{ width: colW, color: isBest ? palette.success : undefined }}
                    accessibilityLabel={isBest ? `${t('compare.best')}: ${v}` : undefined}
                    className={`text-center text-sm ${isBest ? 'font-bold' : 'text-dark-text'}`}
                  >
                    {v === null || v === undefined ? '–' : m.fmt(v)}
                    {isBest ? ' ▲' : ''}
                  </Text>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
      <Muted className="text-xs">{t('common.estimate')}</Muted>
      <Button label={t('compare.clear')} variant="outline" onPress={clear} />
    </Screen>
  );
}
