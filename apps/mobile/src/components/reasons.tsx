import type { XPtsReason } from '@pizarra/core';
import { palette } from '@pizarra/ui';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { fmtNumber, fmtPercent, fmtSigned } from '../lib/format';

function formatValue(r: XPtsReason): string {
  switch (r.code) {
    case 'startProbability':
      return fmtPercent(r.value);
    case 'lowSample':
      return String(r.value);
    case 'opponent':
    case 'venue':
    case 'status':
      return fmtNumber(r.value, 2);
    default:
      return fmtNumber(r.value);
  }
}

/** Quantified reasons behind an estimate (explainability). */
export function ReasonList({ reasons, max = 4 }: { reasons: readonly XPtsReason[]; max?: number }) {
  const { t } = useTranslation();
  return (
    <View className="gap-2">
      {reasons.slice(0, max).map((r) => {
        const showImpact = Math.abs(r.impact) >= 0.05;
        return (
          <View key={r.code} className="flex-row items-start justify-between gap-3">
            <Text className="flex-1 text-sm text-dark-text">
              {t(`reasons.${r.code}`, { value: formatValue(r) })}
            </Text>
            {showImpact ? (
              <Text
                className="text-sm font-semibold"
                style={{ color: r.impact >= 0 ? palette.success : palette.danger }}
              >
                {fmtSigned(r.impact)}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
