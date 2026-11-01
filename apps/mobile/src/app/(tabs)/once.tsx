import type { LineupCandidate, LineupPlan } from '@pizarra/core';
import { palette } from '@pizarra/ui';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { Pitch } from '../../components/pitch';
import {
  Card,
  Chip,
  ErrorState,
  LoadingState,
  Muted,
  Screen,
  SectionTitle,
} from '../../components/ui';
import { fmtNumber, fmtSigned } from '../../lib/format';
import { useActiveLeague, useLineupPlan, useProjections } from '../../lib/queries';

type View_ = { kind: 'best' } | { kind: 'mine' } | { kind: 'alt'; index: number };

export default function LineupScreen() {
  const { t } = useTranslation();
  const { league } = useActiveLeague();
  const lineup = useLineupPlan(league?.id, league?.competition);
  const proj = useProjections(league?.competition);
  const [view, setView] = useState<View_>({ kind: 'best' });

  const minePlan = useMemo((): LineupPlan | null => {
    const mine = lineup.data?.mine;
    if (!mine || !proj.data) return null;
    const starters: LineupCandidate[] = mine.playerIds.flatMap((id) => {
      const p = proj.data.playersById.get(id);
      return p
        ? [
            {
              playerId: id,
              position: p.position,
              xPts: proj.data.projections.get(id)?.xPts ?? 0,
              available: true,
            },
          ]
        : [];
    });
    return {
      formation: mine.formation,
      starters,
      bench: [],
      captainId: mine.captainId,
      totalXPts: lineup.data?.mineTotal ?? 0,
    };
  }, [lineup.data, proj.data]);

  if (lineup.isLoading) return <LoadingState />;
  if (lineup.error || !lineup.data || !proj.data) return <ErrorState onRetry={lineup.refetch} />;

  const { plan, mineTotal } = lineup.data;
  if (!plan.best) {
    return (
      <Screen>
        <Muted>{t('lineup.noLineup')}</Muted>
      </Screen>
    );
  }
  const shown =
    view.kind === 'best'
      ? plan.best
      : view.kind === 'mine'
        ? minePlan
        : (plan.alternatives[view.index] ?? plan.best);
  const diff =
    shown && mineTotal !== null && view.kind !== 'mine' ? shown.totalXPts - mineTotal : null;

  return (
    <Screen>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2"
      >
        <Chip
          label={`${t('lineup.recommended')} ${plan.best.formation}`}
          selected={view.kind === 'best'}
          onPress={() => setView({ kind: 'best' })}
        />
        {minePlan ? (
          <Chip
            label={`${t('lineup.mine')} ${minePlan.formation}`}
            selected={view.kind === 'mine'}
            onPress={() => setView({ kind: 'mine' })}
          />
        ) : null}
        {plan.alternatives.map((a, i) => (
          <Chip
            key={a.formation}
            label={a.formation}
            selected={view.kind === 'alt' && view.index === i}
            onPress={() => setView({ kind: 'alt', index: i })}
          />
        ))}
      </ScrollView>

      {shown ? (
        <>
          <Card>
            <View className="flex-row items-baseline justify-between">
              <Muted>{t('lineup.total')}</Muted>
              <Text className="text-2xl font-bold text-dark-text">
                {fmtNumber(shown.totalXPts)}{' '}
                <Text className="text-sm font-normal text-dark-textMuted">{t('common.xpts')}</Text>
              </Text>
            </View>
            {diff !== null ? (
              <Text
                style={{ color: diff >= 0 ? palette.success : palette.danger }}
                className="text-sm font-semibold"
              >
                {t('lineup.diff', { sign: '', value: fmtSigned(diff) })}
              </Text>
            ) : null}
            <Muted className="text-xs">{t('common.estimate')}</Muted>
          </Card>
          <Pitch
            starters={shown.starters}
            captainId={shown.captainId}
            playersById={proj.data.playersById}
            onPressPlayer={(id) => router.push({ pathname: '/player/[id]', params: { id } })}
          />
          {shown.bench.length > 0 ? (
            <Card>
              <SectionTitle>{t('lineup.bench')}</SectionTitle>
              {shown.bench.map((b) => (
                <View key={b.playerId} className="flex-row justify-between py-1">
                  <Text className="text-dark-text">
                    {t(`positions.${b.position}`)} · {proj.data.playersById.get(b.playerId)?.name}
                  </Text>
                  <Muted>{fmtNumber(b.xPts)}</Muted>
                </View>
              ))}
            </Card>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
