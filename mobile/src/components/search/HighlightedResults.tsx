import { Pressable, StyleSheet, Text, View } from 'react-native';

import { hitSlop, palette, radii, spacing, typography } from '@/theme/tokens';
import type { SearchResult } from '@/types';
import { buildHighlightSegments } from '@/utils/highlight';

export interface ResultRowProps {
  result: SearchResult;
  query: string;
  onSelect?: (result: SearchResult) => void;
  testID?: string;
}

/**
 * A single search result with the query term highlighted. Split out from
 * `HighlightedResults` so virtualised lists can render rows without the wrapper.
 */
export function ResultRow({
  result,
  query,
  onSelect,
  testID = 'result-row',
}: ResultRowProps) {
  const segments = buildHighlightSegments(result.title, query);

  return (
    <Pressable
      accessibilityLabel={result.title}
      accessibilityRole="button"
      hitSlop={hitSlop}
      onPress={() => onSelect?.(result)}
      style={styles.row}
      testID={`${testID}-${result.id}`}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{result.type}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>
          {segments.map((segment, index) =>
            segment.isMatch ? (
              <Text
                key={index}
                style={styles.match}
                testID={`${testID}-${result.id}-match-${index}`}>
                {segment.text}
              </Text>
            ) : (
              <Text key={index}>{segment.text}</Text>
            )
          )}
        </Text>
        <Text numberOfLines={2} style={styles.subtitle}>
          {result.subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

export interface HighlightedResultsProps {
  results: SearchResult[];
  query: string;
  onSelect?: (result: SearchResult) => void;
  testID?: string;
}

export function HighlightedResults({
  results,
  query,
  onSelect,
  testID = 'highlighted-results',
}: HighlightedResultsProps) {
  return (
    <View style={styles.container} testID={testID}>
      {results.map((result) => (
        <ResultRow
          key={result.id}
          onSelect={onSelect}
          query={query}
          result={result}
          testID={`${testID}-row`}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  badge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: radii.sm,
    backgroundColor: palette.surfaceMuted,
    alignSelf: 'flex-start',
  },
  badgeText: {
    ...typography.caption,
    color: palette.accent,
  },
  body: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    ...typography.label,
    color: palette.textPrimary,
  },
  match: {
    color: palette.accent,
    fontWeight: '700',
    backgroundColor: 'rgba(34, 211, 238, 0.16)',
  },
  subtitle: {
    ...typography.caption,
    color: palette.textMuted,
  },
});

export default HighlightedResults;
