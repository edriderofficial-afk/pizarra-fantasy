import Feather from '@expo/vector-icons/Feather';
import { themes } from '@pizarra/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text } from 'react-native';
import { useAppStore } from '../state/app-store';

export function CompareHeaderButton() {
  const { t } = useTranslation();
  const count = useAppStore((s) => s.compareIds.length);
  if (count === 0) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common.compareCount', { count })}
      onPress={() => router.push('/compare')}
      className="mr-4 flex-row items-center gap-1"
    >
      <Feather name="columns" size={16} color={themes.dark.primary} />
      <Text style={{ color: themes.dark.primary }} className="font-semibold">
        {count}
      </Text>
    </Pressable>
  );
}
