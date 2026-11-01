import Feather from '@expo/vector-icons/Feather';
import { palette } from '@pizarra/ui';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { LeagueSwitcher } from '../../components/league-switcher';
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
import { splitDuration, useProviderNow } from '../../lib/clock';
import { fmtMoney, fmtNumber } from '../../lib/format';
import {
  useActiveLeague,
  useLineupPlan,
  useOffers,
  useProjections,
  useSeasonState,
  useStandings,
} from '../../lib/queries';

type Alert = {
  key: string;
  icon: 'alert-triangle' | 'help-circle' | 'inbox';
  color: string;
  text: string;
};

export default function HomeScreen() {
  const { t } = useTranslation();
  const { league, isLoading, error } = useActiveLeague();
  const season = useSeasonState(league?.competition);
  const standings = useStandings(league?.id);
  const offers = useOffers(league?.id);
  const proj = useProjections(league?.competition);
  const lineup = useLineupPlan(league?.id, league?.competition);
  const now = useProviderNow(season.data?.now);

  if (isLoading) return <LoadingState />;
  if (error || !league) return <ErrorState />;

  const me = standings.data?.find((s) => s.managerId === league.myManagerId);
  const msLeft = Date.parse(league.marketClosesAt) - now;
  const left = splitDuration(msLeft);

  const alerts: Alert[] = [];
  const mineIds = lineup.data?.mine?.playerIds ?? [];
  for (const id of mineIds) {
    const p = proj.data?.playersById.get(id);
    if (!p) continue;
    if (p.status === 'injured' || p.status === 'suspended') {
      alerts.push({
        key: `u-${id}`,
        icon: 'alert-triangle',
        color: palette.danger,
        text: t('home.alertUnavailable', {
          name: p.name,
          status: t(`status.${p.status}`).toLowerCase(),
        }),
      });
    } else if (p.status === 'doubtful') {
      alerts.push({
        key: `d-${id}`,
        icon: 'help-circle',
        color: palette.warning,
        text: t('home.alertDoubtful', { name: p.name }),
      });
    }
  }
  if (offers.data && offers.data.length > 0) {
    alerts.push({
      key: 'offers',
      icon: 'inbox',
      color: palette.accent[400],
      text: t('home.alertOffers', { count: offers.data.length }),
    });
  }

  const best = lineup.data?.plan.best;
  const mineTotal = lineup.data?.mineTotal;

  return (
    <Screen>
      <LeagueSwitcher />
      <Card>
        <Muted>
          {league.name} · {t(`competitions.${league.competition}`)}
        </Muted>
        {season.data ? (
          <Text className="text-xl font-bold text-dark-text">
            {t('home.matchday', { n: season.data.nextMatchday })}
          </Text>
        ) : null}
        <View className="flex-row items-center gap-2">
          <Feather name="clock" size={16} color={msLeft > 0 ? palette.warning : palette.danger} />
          <Text className="text-base text-dark-text">
            {msLeft > 0
              ? `${t('home.marketCloses')}: ${t('home.countdown', left)}`
              : t('home.marketClosed')}
          </Text>
        </View>
      </Card>

      {me ? (
        <Card>
          <View className="flex-row flex-wrap gap-3">
            <Stat label={t('home.rank')} value={`${me.rank}º`} />
            <Stat label={t('home.points')} value={String(me.points)} />
            <Stat label={t('home.lastMatchday')} value={String(me.lastMatchdayPoints)} />
          </View>
          <Muted>
            {t('squad.value')}: {fmtMoney(me.teamValue)}
          </Muted>
        </Card>
      ) : null}

      {best && mineTotal !== null && mineTotal !== undefined ? (
        <Card>
          <SectionTitle>{t('tabs.lineup')}</SectionTitle>
          <Text className="text-base text-dark-text">
            {t('home.lineupGain', { mine: fmtNumber(mineTotal), best: fmtNumber(best.totalXPts) })}
          </Text>
          <Muted className="text-xs">{t('common.estimate')}</Muted>
          <Button
            label={t('home.seeLineup')}
            onPress={() => router.navigate('/once')}
            variant="outline"
          />
        </Card>
      ) : null}

      <Card>
        <SectionTitle>{t('home.alerts')}</SectionTitle>
        {alerts.length === 0 ? <Muted>{t('home.noAlerts')}</Muted> : null}
        {alerts.map((a) => (
          <View key={a.key} className="flex-row items-start gap-2">
            <Feather name={a.icon} size={16} color={a.color} />
            <Text className="flex-1 text-sm text-dark-text">{a.text}</Text>
          </View>
        ))}
      </Card>

      {standings.data ? (
        <Card>
          <SectionTitle>{t('home.standings')}</SectionTitle>
          {standings.data.map((s) => (
            <View key={s.managerId} className="flex-row items-center justify-between py-1">
              <Text
                className={`flex-1 text-base ${s.managerId === league.myManagerId ? 'font-bold text-dark-primary' : 'text-dark-text'}`}
              >
                {s.rank}. {s.managerName}
              </Text>
              <Muted className="w-16 text-right">+{s.lastMatchdayPoints}</Muted>
              <Text className="w-14 text-right font-semibold text-dark-text">{s.points}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      <Muted className="text-center text-xs">{t('common.mockData')}</Muted>
      <Disclaimer />
    </Screen>
  );
}
