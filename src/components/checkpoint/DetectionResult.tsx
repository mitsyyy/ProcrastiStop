import { StyleSheet, Text, View } from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { CheckpointDetectionAnalysis } from '@/features/checkpoints/checkpointAnalyzer';
import { AppIcon } from '../ui/AppIcon';

interface DetectionResultProps {
  result: CheckpointDetectionAnalysis;
}

export function DetectionResult({ result }: DetectionResultProps) {
  const palette = useAppTheme();
  const passed = result.verificationResult === 'passed';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: passed ? palette.successSoft : palette.warningSoft,
          borderColor: passed ? palette.success : palette.warning,
        },
      ]}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: passed ? 'rgba(83,197,134,0.2)' : 'rgba(255,180,60,0.22)' },
          ]}
        >
          <AppIcon
            name={passed ? 'check' : 'help'}
            size={20}
            color={passed ? palette.successText : palette.warningText}
          />
        </View>
        <View style={styles.titleBlock}>
          <Text style={[Typography.h3, { color: palette.text }]}>{result.headline}</Text>
          <Text style={[Typography.small, { color: palette.textMuted }]}>
            Confidence: {(result.confidence * 100).toFixed(0)}% · Image not saved (privacy mode)
          </Text>
        </View>
      </View>

      {result.detectedObjects.length > 0 ? (
        <View style={styles.chipsRow}>
          {result.detectedObjects.map((label) => (
            <View
              key={label}
              style={[styles.objectChip, { backgroundColor: palette.surfaceGlassStrong }]}
            >
              <Text style={[Typography.small, { color: palette.text, fontWeight: '700' }]}>
                {label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={[Typography.caption, { color: palette.textSecondary, lineHeight: 18 }]}>
        {result.guidance}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs + 2,
    marginVertical: 2,
  },
  objectChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
});
