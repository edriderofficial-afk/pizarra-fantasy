import Feather from '@expo/vector-icons/Feather';
import { palette } from '@pizarra/ui';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { Button, Card, Disclaimer, Muted, Screen, SectionTitle } from '../components/ui';
import { backend } from '../lib/backend';
import { FANTASY_PROVIDER_AVAILABLE, useDataProvider } from '../lib/data-context';
import { fantasySession, useFantasySessionStatus } from '../lib/fantasy-session';
import { useRemoteConfig } from '../lib/remote-config';

const STATUS_COLOR = {
  unknown: palette.ink[300],
  disconnected: palette.ink[300],
  connected: palette.success,
  expired: palette.danger,
} as const;

export default function AccountScreen() {
  const { t } = useTranslation();
  const status = useFantasySessionStatus();
  const remote = useRemoteConfig();
  const provider = useDataProvider();
  const canConnect = FANTASY_PROVIDER_AVAILABLE && remote.fantasyProviderEnabled;

  return (
    <Screen>
      <Card>
        <SectionTitle>{t('account.laliga')}</SectionTitle>
        <View
          className="flex-row items-center gap-2"
          accessible
          accessibilityLabel={t(`account.status.${status}`)}
        >
          <Feather
            name={
              status === 'connected'
                ? 'check-circle'
                : status === 'expired'
                  ? 'alert-triangle'
                  : 'circle'
            }
            size={16}
            color={STATUS_COLOR[status]}
          />
          <Text className="text-base text-dark-text">{t(`account.status.${status}`)}</Text>
        </View>
        {status === 'connected' ? (
          <Button
            label={t('account.disconnect')}
            variant="outline"
            onPress={() => void fantasySession.disconnect()}
          />
        ) : canConnect ? (
          <Button
            label={status === 'expired' ? t('account.reconnect') : t('account.connect')}
            onPress={() => {
              /* Phase 2B: official login (WebView/AuthSession) -> fantasySession.connect(...) */
            }}
          />
        ) : (
          <Muted>
            {FANTASY_PROVIDER_AVAILABLE ? t('account.disabledRemotely') : t('account.comingSoon')}
          </Muted>
        )}
        <Muted className="text-xs">{t('account.privacy')}</Muted>
      </Card>

      <Card>
        <SectionTitle>{t('account.dataSource')}</SectionTitle>
        <Text className="text-base text-dark-text">
          {provider.kind === 'mock' ? t('account.sourceMock') : t('account.sourceFantasy')}
        </Text>
      </Card>

      <Card>
        <SectionTitle>{t('account.backend')}</SectionTitle>
        <Text className="text-base text-dark-text">
          {backend ? t('account.backendOn') : t('account.backendOff')}
        </Text>
      </Card>
      <Disclaimer />
    </Screen>
  );
}
