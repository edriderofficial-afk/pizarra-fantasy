import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';
import { useActiveLeague, useLeagues } from '../lib/queries';
import { useAppStore } from '../state/app-store';
import { Chip } from './ui';

/** Multi-league selector; hidden when the user plays a single league. */
export function LeagueSwitcher() {
  const { t } = useTranslation();
  const { data } = useLeagues();
  const { league } = useActiveLeague();
  const setActive = useAppStore((s) => s.setActiveLeague);
  if (!data || data.length < 2) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
      {data.map((l) => (
        <Chip
          key={l.id}
          label={`${l.name} · ${t(`competitions.${l.competition}`)}`}
          selected={l.id === league?.id}
          onPress={() => setActive(l.id)}
        />
      ))}
    </ScrollView>
  );
}
