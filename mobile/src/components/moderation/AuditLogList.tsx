import { FlatList, StyleSheet, Text, View } from 'react-native';

import { EmptyState, ErrorState, Skeleton } from '@/components/common';
import { palette, radii, spacing, typography } from '@/theme/tokens';
import { formatRelativeTime } from '@/utils/datetime';
import type { AuditLogEntry } from '@/types/community';

export interface AuditLogListProps {
  entries: AuditLogEntry[];
  isLoading?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  testID?: string;
}

/** Audit trail tab — every moderation action the backend recorded. */
export function AuditLogList({
  entries,
  isLoading = false,
  hasError = false,
  errorMessage,
  onRetry,
  testID = 'audit-log-list',
}: AuditLogListProps) {
  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={entries}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        hasError ? (
          <ErrorState
            message={errorMessage ?? 'Unable to load the audit log.'}
            onRetry={onRetry}
          />
        ) : isLoading ? (
          <View testID={`${testID}-skeleton`}>
            <Skeleton height={48} />
            <Skeleton height={48} />
            <Skeleton height={48} />
          </View>
        ) : (
          <EmptyState
            icon="📜"
            message="Moderation actions will be recorded here."
            testID={`${testID}-empty`}
            title="No activity yet"
          />
        )
      }
      testID={testID}
      renderItem={({ item, index }) => (
        <View
          style={styles.row}
          testID={`${testID}-row-${index}`}
        >
          <View style={styles.rowHeader}>
            <Text style={styles.type} testID={`${testID}-row-${index}-type`}>
              {item.type}
            </Text>
            <Text style={styles.timestamp}>
              {formatRelativeTime(item.timestamp)}
            </Text>
          </View>
          {item.detail ? (
            <Text numberOfLines={3} style={styles.detail}>
              {item.detail}
            </Text>
          ) : null}
          <Text style={styles.targets}>
            {item.targetUserId ? `user: ${item.targetUserId}` : ''}
            {item.targetUserId && item.targetContentId ? ' · ' : ''}
            {item.targetContentId
              ? `${item.contentType ?? 'content'}: ${item.targetContentId}`
              : ''}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  row: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xxs,
    marginBottom: spacing.sm,
    padding: spacing.sm,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  type: {
    ...typography.caption,
    color: palette.accent,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  timestamp: {
    ...typography.caption,
    color: palette.textMuted,
  },
  detail: {
    ...typography.body,
    color: palette.textPrimary,
  },
  targets: {
    ...typography.caption,
    color: palette.textSecondary,
  },
});

export default AuditLogList;
