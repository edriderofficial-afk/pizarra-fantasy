import Feather from '@expo/vector-icons/Feather';
import type { DifficultyLevel, PlayerStatus, Position } from '@pizarra/core';
import { difficulty, palette, themes } from '@pizarra/ui';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

type FeatherName = keyof typeof Feather.glyphMap;

export function DifficultyBadge({
  level,
  compact = false,
}: {
  level: DifficultyLevel;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const token = difficulty[level];
  const label = t(token.labelKey);
  return (
    <View
      accessible
      accessibilityLabel={`${t('difficulty.label')}: ${label} (${level}/5)`}
      className="flex-row items-center gap-1 rounded-sm px-2 py-0.5"
      style={{ backgroundColor: token.bg }}
    >
      <Feather name={token.icon as FeatherName} size={12} color={token.fg} />
      <Text style={{ color: token.fg }} className="text-xs font-semibold">
        {compact ? level : label}
      </Text>
    </View>
  );
}

const STATUS_STYLE: Record<PlayerStatus, { color: string; icon: FeatherName }> = {
  available: { color: palette.success, icon: 'check-circle' },
  doubtful: { color: palette.warning, icon: 'help-circle' },
  injured: { color: palette.danger, icon: 'plus-square' },
  suspended: { color: palette.danger, icon: 'slash' },
};

export function StatusBadge({
  status,
  showAvailable = false,
}: {
  status: PlayerStatus;
  showAvailable?: boolean;
}) {
  const { t } = useTranslation();
  if (status === 'available' && !showAvailable) return null;
  const s = STATUS_STYLE[status];
  return (
    <View
      accessible
      accessibilityLabel={t(`status.${status}`)}
      className="flex-row items-center gap-1"
    >
      <Feather name={s.icon} size={12} color={s.color} />
      <Text style={{ color: s.color }} className="text-xs font-semibold">
        {t(`status.${status}`)}
      </Text>
    </View>
  );
}

export function PositionBadge({ position }: { position: Position }) {
  const { t } = useTranslation();
  return (
    <View className="w-10 items-center rounded-sm bg-dark-surfaceRaised py-0.5">
      <Text className="text-xs font-bold" style={{ color: themes.dark.textMuted }}>
        {t(`positions.${position}`)}
      </Text>
    </View>
  );
}
