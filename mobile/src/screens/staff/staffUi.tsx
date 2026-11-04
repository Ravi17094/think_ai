import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { palette, radii, spacing, typography } from "@/theme/tokens";

/** Shared visual building blocks for the TA and instructor workspace. */
export function StaffPageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.header}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

export function StaffNotice({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "danger";
}) {
  return (
    <View
      style={[
        styles.notice,
        tone === "success" && styles.noticeSuccess,
        tone === "danger" && styles.noticeDanger,
      ]}
    >
      <Text
        style={[
          styles.noticeText,
          tone === "success" && styles.noticeSuccessText,
          tone === "danger" && styles.noticeDangerText,
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

export function StaffSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function StaffButton({
  title,
  onPress,
  disabled = false,
  variant = "primary",
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" && styles.secondaryButton,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === "secondary" && styles.secondaryButtonText,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export const staffStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  // The preview host overlays a tall navigation bar; this keeps the first card visible.
  content: { padding: spacing.lg, paddingTop: 116, paddingBottom: spacing.xxl, gap: spacing.md },
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.md,
  },
  input: {
    minHeight: 52,
    borderColor: palette.borderStrong,
    borderWidth: 1,
    borderRadius: radii.md,
    backgroundColor: palette.surfaceMuted,
    color: palette.textPrimary,
    paddingHorizontal: spacing.md,
    ...typography.body,
  },
  muted: { ...typography.body, color: palette.textSecondary },
});

const styles = StyleSheet.create({
  header: { gap: spacing.xs, paddingTop: spacing.xs },
  eyebrow: {
    ...typography.caption,
    color: palette.accent,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  title: { ...typography.display, color: palette.textPrimary },
  description: { ...typography.body, color: palette.textSecondary, lineHeight: 23 },
  notice: {
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  noticeSuccess: { backgroundColor: "rgba(52, 211, 153, 0.12)", borderColor: "rgba(52, 211, 153, 0.45)" },
  noticeDanger: { backgroundColor: "rgba(248, 113, 113, 0.12)", borderColor: "rgba(248, 113, 113, 0.45)" },
  noticeText: { ...typography.caption, color: palette.textSecondary, lineHeight: 19 },
  noticeSuccessText: { color: palette.success },
  noticeDangerText: { color: palette.danger },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.subtitle, color: palette.textPrimary, marginTop: spacing.xs },
  button: {
    minHeight: 52,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.brand,
    paddingHorizontal: spacing.md,
  },
  secondaryButton: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.brand },
  buttonText: { ...typography.label, color: palette.textPrimary, fontSize: 15 },
  secondaryButtonText: { color: palette.brand },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
});
