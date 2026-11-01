import Feather from '@expo/vector-icons/Feather';
import { palette } from '@pizarra/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useFantasySessionStatus } from '../lib/fantasy-session';

/** Clear, actionable notice when the LALIGA Fantasy session has expired. */
export function SessionExpiredBanner() {
  const { t } = useTranslation();
  const status = useFantasySessionStatus();
  if (status !== 'expired') return null;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push('/account')}
      className="flex-row items-center gap-3 rounded-lg border p-3"
      style={{ borderColor: palette.danger }}
    >
      <Feather name="alert-triangle" size={18} color={palette.danger} />
      <View className="flex-1">
        <Text className="text-sm text-dark-text">{t('account.expiredBanner')}</Text>
        <Text className="text-sm font-semibold" style={{ color: palette.danger }}>
          {t('account.reconnect')}
        </Text>
      </View>
    </Pressable>
  );
}

export function AccountHeaderButton() {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('account.title')}
      onPress={() => router.push('/account')}
      className="ml-4"
    >
      <Feather name="user" size={20} color={palette.ink[100]} />
    </Pressable>
  );
}
