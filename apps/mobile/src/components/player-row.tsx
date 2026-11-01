import type { Player, PlayerProjection } from '@pizarra/core';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { fmtNumber } from '../lib/format';
import { DifficultyBadge, PositionBadge, StatusBadge } from './badges';

interface Props {
  readonly player: Player;
  readonly teamShort: string;
  readonly opponentShort?: string | undefined;
  readonly projection: PlayerProjection | undefined;
  readonly right?: ReactNode;
  readonly onPress: () => void;
  readonly onLongPress?: () => void;
}

export function PlayerRow({
  player,
  teamShort,
  opponentShort,
  projection,
  right,
  onPress,
  onLongPress,
}: Props) {
  const { t } = useTranslation();
  const fx = projection?.fixture;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onLongPress={onLongPress}
      className="flex-row items-center gap-3 border-b border-dark-border bg-dark-background px-4 py-3"
    >
      <PositionBadge position={player.position} />
      <View className="flex-1 gap-1">
        <Text className="text-base font-semibold text-dark-text" numberOfLines={1}>
          {player.name}
        </Text>
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="text-xs text-dark-textMuted">
            {teamShort}
            {fx && opponentShort ? ` · ${fx.isHome ? t('common.vs') : '@'} ${opponentShort}` : ''}
          </Text>
          {fx ? <DifficultyBadge level={fx.difficulty} compact /> : null}
          <StatusBadge status={player.status} />
        </View>
      </View>
      <View className="items-end gap-1">
        <Text className="text-base font-bold text-dark-text">
          {projection ? fmtNumber(projection.xPts) : '–'}
          <Text className="text-xs font-normal text-dark-textMuted"> {t('common.xpts')}</Text>
        </Text>
        {right}
      </View>
    </Pressable>
  );
}
