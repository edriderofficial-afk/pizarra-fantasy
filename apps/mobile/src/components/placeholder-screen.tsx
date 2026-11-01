import { Text, View } from 'react-native';

interface Props {
  readonly title: string;
  readonly description: string;
}

/** Temporary screen body used until each feature lands (Phase 1+). */
export function PlaceholderScreen({ title, description }: Props) {
  return (
    <View className="flex-1 gap-2 bg-dark-background p-4">
      <Text accessibilityRole="header" className="text-xl font-bold text-dark-text">
        {title}
      </Text>
      <Text className="text-base text-dark-textMuted">{description}</Text>
    </View>
  );
}
