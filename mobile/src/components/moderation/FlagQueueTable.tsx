import type { ReactElement } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState, ErrorState } from '@/components/common';
import { palette, radii, spacing, typography } from '@/theme/tokens';
import { formatRelativeTime } from '@/utils/datetime';
import type { FlagQueueRow } from '@/types/community';
import { ModerationSkeleton } from './ModerationSkeleton';
import { SeverityBadge } from './SeverityBadge';

export interface FlagQueueTableProps {
  rows: FlagQueueRow[];
  isLoading?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  isActing?: boolean;
  onPreview?: (row: FlagQueueRow) => void;
  onHide?: (row: FlagQueueRow) => void;
  onShow?: (row: FlagQueueRow) => void;
  onDismiss?: (row: FlagQueueRow) => void;
  onDelete?: (row: FlagQueueRow) => void;
  listHeader?: ReactElement | null;
  testID?: string;
}

interface RowButtonProps {
  label: string;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  onPress: () => void;
  testID: string;
}

function RowButton({
  label,
  tone = 'default',
  disabled = false,
  onPress,
  testID,
}: RowButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        tone === 'danger' && styles.actionDanger,
        pressed && styles.pressed,
      ]}
      testID={testID}>
      <Text
        style={[
          styles.actionLabel,
          tone === 'danger' && styles.actionDangerLabel,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Flagged-content queue table: content, severity, report count and the
 * moderation actions (preview, hide/show, dismiss flag, soft delete).
 */
export function FlagQueueTable({
  rows,
  isLoading = false,
  hasError = false,
  errorMessage,
  onRetry,
  isRefreshing = false,
  onRefresh,
  isActing = false,
  onPreview,
  onHide,
  onShow,
  onDismiss,
  onDelete,
  listHeader,
  testID = 'flag-queue-table',
}: FlagQueueTableProps) {
  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.tableHeader} testID={`${testID}-header`}>
        <Text style={[styles.headerCell, styles.contentCell]}>Content</Text>
        <Text style={[styles.headerCell, styles.severityCell]}>Severity</Text>
        <Text style={[styles.headerCell, styles.reportsCell]}>Reports</Text>
      </View>

      <FlatList
        contentContainerStyle={styles.content}
        data={rows}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        ListEmptyComponent={
          hasError ? (
            <ErrorState
              message={errorMessage ?? 'Unable to load the flag queue.'}
              onRetry={onRetry}
            />
          ) : isLoading ? (
            <ModerationSkeleton testID={`${testID}-skeleton`} />
          ) : (
            <EmptyState
              icon="🛡️"
              message="Nothing needs review right now. Flagged threads and replies appear here."
              testID={`${testID}-empty`}
              title="Queue is clear"
            />
          )
        }
        ListHeaderComponent={listHeader ?? null}
        onRefresh={onRefresh}
        refreshing={isRefreshing}
        testID={`${testID}-list`}
        renderItem={({ item, index }) => (
          <View
            style={[styles.row, item.hidden && styles.rowHidden]}
            testID={`${testID}-row-${index}`}>
            <View style={styles.rowMain}>
              <View style={styles.contentCellView}>
                <View style={styles.badgeRow}>
                  <Text style={styles.typeChip}>
                    {item.type === 'discussion' ? 'Thread' : 'Reply'}
                  </Text>
                  {item.hidden ? (
                    <Text style={styles.hiddenChip} testID={`${testID}-row-${index}-hidden`}>
                      Hidden
                    </Text>
                  ) : null}
                </View>
                <Text
                  numberOfLines={1}
                  style={styles.title}
                  testID={`${testID}-row-${index}-title`}>
                  {item.title}
                </Text>
                <Text numberOfLines={2} style={styles.excerpt}>
                  {item.excerpt}
                </Text>
                <Text style={styles.meta} testID={`${testID}-row-${index}-meta`}>
                  {item.reason
                    ? `Reason: ${item.reason}`
                    : 'No reason given'}{' '}
                  · {item.authorName} · {formatRelativeTime(item.flaggedAt)}
                </Text>
              </View>

              <View style={styles.severityCellView}>
                <SeverityBadge severity={item.severity} />
              </View>

              <Text
                style={styles.reportsCellView}
                testID={`${testID}-row-${index}-reports`}>
                {item.reportCount}
              </Text>
            </View>

            <View style={styles.actions} testID={`${testID}-row-${index}-actions`}>
              <RowButton
                label="Preview"
                onPress={() => onPreview?.(item)}
                testID={`${testID}-row-${index}-preview`}
              />
              <RowButton
                label={item.hidden ? 'Show' : 'Hide'}
                onPress={() =>
                  item.hidden ? onShow?.(item) : onHide?.(item)
                }
                testID={`${testID}-row-${index}-visibility`}
              />
              <RowButton
                label="Dismiss"
                onPress={() => onDismiss?.(item)}
                testID={`${testID}-row-${index}-dismiss`}
              />
              <RowButton
                disabled={isActing}
                label="Delete"
                onPress={() => onDelete?.(item)}
                testID={`${testID}-row-${index}-delete`}
                tone="danger"
              />
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.border,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  headerCell: {
    ...typography.caption,
    color: palette.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  contentCell: {
    flex: 1,
  },
  severityCell: {
    width: 76,
    textAlign: 'center',
  },
  reportsCell: {
    width: 56,
    textAlign: 'right',
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  row: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  rowHidden: {
    borderColor: palette.warning,
    opacity: 0.85,
  },
  rowMain: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  contentCellView: {
    flex: 1,
    gap: spacing.xxs,
  },
  severityCellView: {
    width: 76,
    alignItems: 'center',
  },
  reportsCellView: {
    ...typography.subtitle,
    color: palette.textPrimary,
    width: 56,
    textAlign: 'right',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xxs,
  },
  typeChip: {
    ...typography.caption,
    color: palette.accent,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  hiddenChip: {
    ...typography.caption,
    color: palette.warning,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    ...typography.label,
    color: palette.textPrimary,
    fontWeight: '700',
  },
  excerpt: {
    ...typography.caption,
    color: palette.textSecondary,
  },
  meta: {
    ...typography.caption,
    color: palette.textMuted,
    marginTop: spacing.xxs,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
  },
  actionDanger: {
    backgroundColor: 'rgba(248, 113, 113, 0.14)',
    borderColor: palette.danger,
  },
  pressed: {
    opacity: 0.75,
  },
  actionLabel: {
    ...typography.caption,
    color: palette.textPrimary,
    fontWeight: '700',
  },
  actionDangerLabel: {
    color: palette.danger,
  },
});

export default FlagQueueTable;
