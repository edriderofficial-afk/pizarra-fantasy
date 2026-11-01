import type { LineupCandidate, Player, Position } from '@pizarra/core';
import { palette, themes } from '@pizarra/ui';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { fmtNumber } from '../lib/format';

const ROW_Y: Record<Position, number> = { FWD: 0.14, MID: 0.4, DEF: 0.66, GK: 0.88 };

interface PitchProps {
  readonly starters: readonly LineupCandidate[];
  readonly captainId: string | null;
  readonly playersById: ReadonlyMap<string, Player>;
  readonly onPressPlayer: (id: string) => void;
}

/** Football pitch (SVG) with the eleven laid out by line. */
export function Pitch({ starters, captainId, playersById, onPressPlayer }: PitchProps) {
  const { t } = useTranslation();
  const lines: Record<Position, LineupCandidate[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  for (const s of starters) lines[s.position].push(s);
  const stroke = 'rgba(255,255,255,0.35)';
  return (
    <View className="w-full overflow-hidden rounded-lg" style={{ aspectRatio: 0.72 }}>
      <Svg width="100%" height="100%" viewBox="0 0 72 100" style={{ position: 'absolute' }}>
        <Rect x={0} y={0} width={72} height={100} fill={themes.dark.pitch} />
        {[0, 1, 2, 3, 4].map((i) => (
          <Rect key={i} x={0} y={i * 20} width={72} height={10} fill="rgba(0,0,0,0.06)" />
        ))}
        <Rect x={3} y={3} width={66} height={94} fill="none" stroke={stroke} strokeWidth={0.5} />
        <Line x1={3} x2={69} y1={50} y2={50} stroke={stroke} strokeWidth={0.5} />
        <Circle cx={36} cy={50} r={8} fill="none" stroke={stroke} strokeWidth={0.5} />
        <Rect x={18} y={3} width={36} height={14} fill="none" stroke={stroke} strokeWidth={0.5} />
        <Rect x={18} y={83} width={36} height={14} fill="none" stroke={stroke} strokeWidth={0.5} />
      </Svg>
      {(Object.keys(lines) as Position[]).map((pos) =>
        lines[pos].map((s, i) => {
          const n = lines[pos].length;
          const left = `${((i + 1) / (n + 1)) * 100}%` as const;
          const top = `${ROW_Y[pos] * 100}%` as const;
          const player = playersById.get(s.playerId);
          const isCaptain = s.playerId === captainId;
          return (
            <Pressable
              key={s.playerId}
              accessibilityRole="button"
              accessibilityLabel={`${player?.name ?? s.playerId}, ${fmtNumber(s.xPts)} xPts${isCaptain ? ', capitán' : ''}`}
              onPress={() => onPressPlayer(s.playerId)}
              style={{
                position: 'absolute',
                left,
                top,
                width: 76,
                marginLeft: -38,
                marginTop: -22,
              }}
              className="items-center"
            >
              <View
                className="h-9 w-9 items-center justify-center rounded-full border-2"
                style={{
                  backgroundColor: themes.dark.surface,
                  borderColor: isCaptain ? palette.warning : themes.dark.border,
                }}
              >
                <Text className="text-xs font-bold text-dark-text">{fmtNumber(s.xPts)}</Text>
              </View>
              {isCaptain ? (
                <View
                  className="absolute right-3 top-0 h-4 w-4 items-center justify-center rounded-full"
                  style={{ backgroundColor: palette.warning }}
                >
                  <Text className="text-[10px] font-bold" style={{ color: themes.dark.background }}>
                    {t('lineup.captain')}
                  </Text>
                </View>
              ) : null}
              <Text
                numberOfLines={1}
                className="mt-0.5 rounded-sm px-1 text-[11px] font-semibold text-chalk"
                style={{ backgroundColor: 'rgba(10,14,26,0.75)' }}
              >
                {player ? shortName(player.name) : s.playerId}
              </Text>
            </Pressable>
          );
        }),
      )}
    </View>
  );
}

function shortName(full: string): string {
  const parts = full.split(' ');
  if (parts.length < 2) return full;
  return `${(parts[0] as string).charAt(0)}. ${parts.slice(1).join(' ')}`;
}
