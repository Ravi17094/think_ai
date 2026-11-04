import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { signOut } from '@/api/session';
import { ScreenHeader } from '@/components/common';
import { LearnerTabBar } from '@/components/learner';
import type { LearnerTabKey } from '@/components/learner';
import { LEARNER_TAB_ROUTES } from '@/components/learner/LearnerTabBar';
import { getLearnerProfile } from '@/features/profile/learnerProfile';
import { useEnrollments } from '@/hooks/useEnrollments';
import { useSession } from '@/hooks/useSession';
import { useWishlist } from '@/hooks/useWishlist';
import type { ScreenProps } from '@/navigation/types';
import { useTheme } from '@/theme/ThemeProvider';
import { hitSlop, minTouchTarget, radii, spacing, typography } from '@/theme/tokens';
import type { Palette, ThemeMode } from '@/theme/tokens';
import { useThemedStyles } from '@/theme/useThemedStyles';

const THEME_OPTIONS: readonly { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: 'light', label: 'Light', icon: '☀' },
  { mode: 'dark', label: 'Dark', icon: '☾' },
];

export function ProfileScreen({ navigation }: ScreenProps<'Profile'>) {
  const styles = useThemedStyles(createStyles);
  const { mode, setMode } = useTheme();
  const session = useSession();
  const profile = useMemo(() => getLearnerProfile(session.userId), [session.userId]);
  const { enrollments, isLoading } = useEnrollments();
  const { count: wishlistCount } = useWishlist();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);

  const completed = enrollments.filter(
    (enrollment) => enrollment.status === 'completed'
  ).length;
  const lessonsDone = enrollments.reduce(
    (sum, enrollment) => sum + enrollment.completedLessons,
    0
  );

  const handleTabSelect = useCallback(
    (key: LearnerTabKey) => {
      navigation.navigate(LEARNER_TAB_ROUTES[key] as never);
    },
    [navigation]
  );

  const handleSignOut = useCallback(async () => {
    if (isSigningOut) {
      return;
    }
    setIsSigningOut(true);
    try {
      await signOut();
      navigation.replace('Login');
    } finally {
      setIsSigningOut(false);
    }
  }, [isSigningOut, navigation]);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={styles.safeArea}
      testID="profile-screen">
      <ScrollView
        contentContainerStyle={styles.content}
        testID="profile-scroll-view">
        <ScreenHeader
          subtitle={session.isSignedIn ? 'Signed in' : 'Guest learner'}
          title="Profile"
          testID="profile-header"
        />

        <View style={styles.identityCard} testID="profile-identity">
          <View style={styles.avatar} testID="profile-avatar">
            <Text style={styles.avatarLabel}>{profile.initials}</Text>
          </View>
          <View style={styles.identityText}>
            <Text style={styles.name} testID="profile-name">
              {profile.name}
            </Text>
            <Text style={styles.email} testID="profile-email">
              {profile.email}
            </Text>
            <Text style={styles.meta}>
              {profile.role} • {profile.batch}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow} testID="profile-stats">
          <View style={styles.statCard}>
            <Text style={styles.statValue} testID="profile-stat-enrolled">
              {isLoading && enrollments.length === 0 ? '—' : enrollments.length}
            </Text>
            <Text style={styles.statLabel}>Enrolled</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue} testID="profile-stat-completed">
              {isLoading && enrollments.length === 0 ? '—' : completed}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue} testID="profile-stat-lessons">
              {isLoading && enrollments.length === 0 ? '—' : lessonsDone}
            </Text>
            <Text style={styles.statLabel}>Lessons done</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Learner details
          </Text>
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Learner ID</Text>
              <Text style={styles.detailValue} testID="profile-user-id">
                {profile.id}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Joined</Text>
              <Text style={styles.detailValue}>{profile.joinedAt}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>{profile.location}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Saved courses</Text>
              <Text style={styles.detailValue} testID="profile-wishlist-count">
                {wishlistCount}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: showAppearance }} accessibilityLabel="Appearance settings" onPress={() => setShowAppearance((visible) => !visible)} style={styles.appearanceHeading} testID="profile-appearance-toggle">
            <View>
              <Text style={styles.sectionTitle}>Appearance</Text>
              <Text style={styles.appearanceSummary}>Current theme: {mode === 'light' ? 'Light' : 'Dark'}</Text>
            </View>
            <Text style={styles.chevron}>{showAppearance ? '⌃' : '⌄'}</Text>
          </Pressable>
          {showAppearance ? (
            <View style={styles.themeRow} testID="profile-theme-options">
              {THEME_OPTIONS.map((option) => {
                const selected = mode === option.mode;
                return (
                  <Pressable accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={option.label + ' theme'} key={option.mode} onPress={() => setMode(option.mode)} style={[styles.themeOption, selected && styles.themeOptionActive]} testID={'theme-option-' + option.mode}>
                    <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.themeIcon}>{option.icon}</Text>
                    <Text style={[styles.themeLabel, selected && styles.themeLabelActive]}>{option.label}</Text>
                    {selected ? <Text style={styles.themeCheck}>✓</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Community
          </Text>
          <Pressable
            accessibilityLabel="Open the Thinkz AI community forum"
            accessibilityRole="button"
            onPress={() => navigation.navigate('ForumHome')}
            style={styles.communityCard}
            testID="profile-community">
            <View style={styles.communityIconWrap}>
              <Text style={styles.communityIcon}>💬</Text>
            </View>
            <View style={styles.communityText}>
              <Text style={styles.communityTitle}>Community forum</Text>
              <Text style={styles.communitySubtitle}>
                Ask questions, share wins and learn with other learners.
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Learning shortcuts
          </Text>
          <View style={styles.linkCard}>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('MyLearning')}
              style={styles.linkRow}
              testID="profile-my-learning">
              <Text style={styles.linkLabel}>My Learning</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('Wishlist')}
              style={styles.linkRow}
              testID="profile-wishlist">
              <Text style={styles.linkLabel}>Wishlist</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('NotificationPreferences')}
              style={styles.linkRow}
              testID="profile-notifications">
              <Text style={styles.linkLabel}>Notification preferences</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          accessibilityLabel="Sign out"
          accessibilityRole="button"
          accessibilityState={{ busy: isSigningOut, disabled: isSigningOut }}
          disabled={isSigningOut}
          hitSlop={hitSlop}
          onPress={handleSignOut}
          style={[styles.signOut, isSigningOut && styles.signOutDisabled]}
          testID="profile-signout">
          <Text style={styles.signOutLabel}>
            {isSigningOut ? 'Signing out…' : 'Sign out'}
          </Text>
        </Pressable>
      </ScrollView>

      <LearnerTabBar
        active="profile"
        onSelect={handleTabSelect}
        wishlistCount={wishlistCount}
      />
    </SafeAreaView>
  );
}

const createStyles = (palette: Palette) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: palette.background,
    },
    content: {
      paddingBottom: spacing.xxl,
      gap: spacing.xxs,
    },
    identityCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginHorizontal: spacing.md,
      padding: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
    },
    avatar: {
      width: 64,
      height: 64,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.pill,
      backgroundColor: palette.brand,
    },
    avatarLabel: {
      ...typography.title,
      color: palette.textInverse,
    },
    identityText: {
      flex: 1,
      gap: 2,
    },
    name: {
      ...typography.title,
      color: palette.textPrimary,
    },
    email: {
      ...typography.caption,
      color: palette.textSecondary,
    },
    meta: {
      ...typography.caption,
      color: palette.textMuted,
    },
    statsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      marginTop: spacing.sm,
    },
    statCard: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderRadius: radii.lg,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
    },
    statValue: {
      ...typography.title,
      color: palette.textPrimary,
    },
    statLabel: {
      ...typography.caption,
      color: palette.textMuted,
    },
    section: {
      paddingHorizontal: spacing.md,
      marginTop: spacing.lg,
    },
    sectionTitle: {
      ...typography.subtitle,
      color: palette.textPrimary,
      marginBottom: spacing.sm,
    },
    detailCard: {
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      paddingHorizontal: spacing.md,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      minHeight: minTouchTarget,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.border,
    },
    detailLabel: {
      ...typography.caption,
      color: palette.textMuted,
    },
    detailValue: {
      ...typography.label,
      color: palette.textPrimary,
      flexShrink: 1,
      textAlign: 'right',
    },
    appearanceHeading: { minHeight: minTouchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, borderRadius: radii.lg, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
    appearanceSummary: { ...typography.caption, color: palette.textMuted },
    themeRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    themeOption: {
      flex: 1,
      minHeight: minTouchTarget + 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
    },
    themeOptionActive: {
      borderColor: palette.brand,
      backgroundColor: palette.surfaceMuted,
    },
    themeIcon: {
      fontSize: 18,
      color: palette.textPrimary,
    },
    themeLabel: {
      ...typography.label,
      color: palette.textSecondary,
    },
    themeLabelActive: {
      color: palette.textPrimary,
    },
    themeCheck: {
      ...typography.label,
      color: palette.brand,
    },
    communityCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      minHeight: minTouchTarget + 12,
      padding: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
    },
    communityIconWrap: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.pill,
      backgroundColor: palette.surfaceMuted,
    },
    communityIcon: {
      fontSize: 20,
    },
    communityText: {
      flex: 1,
      gap: 2,
    },
    communityTitle: {
      ...typography.label,
      color: palette.textPrimary,
    },
    communitySubtitle: {
      ...typography.caption,
      color: palette.textMuted,
    },
    linkCard: {
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      paddingHorizontal: spacing.md,
    },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: minTouchTarget,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.border,
    },
    linkLabel: {
      ...typography.label,
      color: palette.textPrimary,
    },
    chevron: {
      fontSize: 22,
      color: palette.textMuted,
    },
    signOut: {
      minHeight: minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: spacing.md,
      marginTop: spacing.xl,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: palette.danger,
    },
    signOutDisabled: {
      opacity: 0.6,
    },
    signOutLabel: {
      ...typography.label,
      color: palette.danger,
    },
  });

export default ProfileScreen;
