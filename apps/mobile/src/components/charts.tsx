import { palette, themes } from '@pizarra/ui';
import { Text, View } from 'react-native';
import Svg, { Line, Polyline, Rect } from 'react-native-svg';

const W = 320;

/** Simple bar chart (e.g. points per matchday). Negative values drawn below the baseline. */
export function Bars({
  values,
  labels,
  height = 120,
  accessibilityLabel,
}: {
  values: readonly number[];
  labels: readonly string[];
  height?: number;
  accessibilityLabel: string;
}) {
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const range = max - min;
  const bw = W / Math.max(values.length, 1);
  const zeroY = (max / range) * height;
  return (
    <View accessible accessibilityLabel={accessibilityLabel}>
      <Svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none">
        <Line x1={0} x2={W} y1={zeroY} y2={zeroY} stroke={themes.dark.border} strokeWidth={1} />
        {values.map((v, i) => {
          const h = (Math.abs(v) / range) * height;
          return (
            <Rect
              key={i}
              x={i * bw + bw * 0.15}
              width={bw * 0.7}
              y={v >= 0 ? zeroY - h : zeroY}
              height={Math.max(h, 1)}
              rx={2}
              fill={v >= 0 ? palette.accent[400] : palette.danger}
            />
          );
        })}
      </Svg>
      <View className="flex-row">
        {labels.map((l, i) => (
          <Text key={i} className="flex-1 text-center text-[10px] text-dark-textMuted">
            {l}
          </Text>
        ))}
      </View>
      <View className="flex-row">
        {values.map((v, i) => (
          <Text key={i} className="flex-1 text-center text-xs font-semibold text-dark-text">
            {v}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** Line sparkline (e.g. daily price). */
export function Sparkline({
  values,
  height = 80,
  accessibilityLabel,
}: {
  values: readonly number[];
  height?: number;
  accessibilityLabel: string;
}) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const pad = 4;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * W;
      const y = pad + (1 - (v - min) / range) * (height - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const up = (values.at(-1) ?? 0) >= (values[0] ?? 0);
  return (
    <View accessible accessibilityLabel={accessibilityLabel}>
      <Svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none">
        <Polyline
          points={points}
          fill="none"
          stroke={up ? palette.success : palette.danger}
          strokeWidth={2}
        />
      </Svg>
    </View>
  );
}
