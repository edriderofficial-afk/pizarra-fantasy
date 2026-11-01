import { themes } from '@pizarra/ui';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

const t = themes.dark;

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  if (!scroll) return <View className="flex-1 bg-dark-background">{children}</View>;
  return (
    <ScrollView className="flex-1 bg-dark-background" contentContainerClassName="gap-4 p-4 pb-10">
      {children}
    </ScrollView>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <View className={`gap-2 rounded-lg border border-dark-border bg-dark-surface p-4 ${className}`}>
      {children}
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" className="text-lg font-bold text-dark-text">
      {children}
    </Text>
  );
}

export function Muted({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <Text className={`text-sm text-dark-textMuted ${className}`}>{children}</Text>;
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`rounded-full border px-3 py-1 ${selected ? 'border-dark-primary bg-dark-primary' : 'border-dark-border'}`}
    >
      <Text className={selected ? 'font-semibold text-dark-onPrimary' : 'text-dark-text'}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline';
}) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`items-center rounded-md px-4 py-3 ${primary ? 'bg-dark-primary' : 'border border-dark-border'}`}
    >
      <Text
        className={primary ? 'font-semibold text-dark-onPrimary' : 'font-semibold text-dark-text'}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function LoadingState() {
  const { t: tr } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center gap-2 bg-dark-background p-8">
      <ActivityIndicator color={t.primary} />
      <Muted>{tr('common.loading')}</Muted>
    </View>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  const { t: tr } = useTranslation();
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-dark-background p-8">
      <Text className="text-base text-dark-text">{tr('common.error')}</Text>
      {onRetry ? <Button label={tr('common.retry')} onPress={onRetry} /> : null}
    </View>
  );
}

export function Disclaimer() {
  const { t: tr } = useTranslation();
  return <Muted className="text-center text-xs">{tr('common.disclaimer')}</Muted>;
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-[30%] flex-1 gap-1">
      <Muted className="text-xs">{label}</Muted>
      <Text className="text-lg font-bold text-dark-text">{value}</Text>
    </View>
  );
}

export function Placeholder({ text }: { text: string }) {
  return (
    <View className="flex-1 bg-dark-background p-4">
      <Muted className="text-base">{text}</Muted>
    </View>
  );
}
