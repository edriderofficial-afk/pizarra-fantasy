import { useTranslation } from 'react-i18next';
import { Placeholder } from '../../components/ui';

export default function RadarScreen() {
  const { t } = useTranslation();
  return <Placeholder text={t('placeholder.radar')} />;
}
