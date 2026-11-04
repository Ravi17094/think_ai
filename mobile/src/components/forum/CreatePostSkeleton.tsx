import { useThemedStyles } from "@/theme/useThemedStyles";
import type { Palette } from "@/theme/tokens";
import { StyleSheet, View } from 'react-native';
import { Skeleton } from '@/components/common';
import { radii, spacing } from '@/theme/tokens';

/**
 * Field skeletons for the create-post form while categories and the tag
 * taxonomy load — mirrors title / category / editor / tag rows.
 */
export function CreatePostSkeleton({
  testID = 'create-post-skeleton'
}: {
  testID?: string;
}) {
  const styles = useThemedStyles(createStyles);
  return <View style={styles.form} testID={testID}>
      <Skeleton height={12} width="30%" testID={`${testID}-title-label`} />
      <Skeleton height={44} width="100%" radius={12} testID={`${testID}-title-field`} />

      <Skeleton height={12} width="34%" testID={`${testID}-category-label`} />
      <Skeleton height={44} width={220} radius={12} testID={`${testID}-category-field`} />

      <Skeleton height={12} width="26%" testID={`${testID}-body-label`} />
      <Skeleton height={140} width="100%" radius={12} testID={`${testID}-body-field`} />

      <Skeleton height={12} width="22%" testID={`${testID}-tags-label`} />
      <View style={styles.tagRow}>
        <Skeleton height={28} width={70} radius={999} />
        <Skeleton height={28} width={58} radius={999} />
        <Skeleton height={28} width={64} radius={999} />
      </View>
    </View>;
}
const createStyles = (palette: Palette) => StyleSheet.create({
  form: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  tagRow: {
    flexDirection: 'row',
    gap: spacing.xs
  }
});
export default CreatePostSkeleton;
