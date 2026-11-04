import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Palette } from '@/theme/tokens';
import { minTouchTarget, radii, spacing, typography } from '@/theme/tokens';
import { useThemedStyles } from '@/theme/useThemedStyles';

import type { RootStackParamList } from '@/navigation/types';

export type LearnerTabKey =
  | 'home'
  | 'learning'
  | 'explore'
  | 'wishlist'
  | 'profile';

export type LearnerTabRoute = Extract<
  keyof RootStackParamList,
  'LearnerDashboard' | 'MyLearning' | 'MyCourses' | 'Wishlist' | 'Profile'
>;

export interface LearnerTab {
  key: LearnerTabKey;
  label: string;
  route: LearnerTabRoute;
}

/** Single source of truth for the learner's five primary destinations. */
export const LEARNER_TABS: readonly LearnerTab[] = [
  { key: 'home', label: 'Home', route: 'LearnerDashboard' },
  { key: 'learning', label: 'My Learning', route: 'MyLearning' },
  { key: 'explore', label: 'Explore', route: 'MyCourses' },
  { key: 'wishlist', label: 'Wishlist', route: 'Wishlist' },
  { key: 'profile', label: 'Profile', route: 'Profile' },
] as const;

export const LEARNER_TAB_ROUTES: Record<LearnerTabKey, LearnerTabRoute> = {
  home: 'LearnerDashboard',
  learning: 'MyLearning',
  explore: 'MyCourses',
  wishlist: 'Wishlist',
  profile: 'Profile',
};

export interface LearnerTabBarProps {
  active: LearnerTabKey;
  onSelect: (key: LearnerTabKey) => void;
  /** Saved-course count shown on the Wishlist tab. */
  wishlistCount?: number;
  testID?: string;
}

/**
 * Custom bottom tab bar.
 *
 * The app deliberately does not use `@react-navigation/bottom-tabs`: the five
 * learner destinations already exist as stack routes (and are covered by deep
 * link tests), so rendering the bar inside each screen keeps those routes and
 * links intact while giving the learner a persistent, accessible tab strip.
 */
export function LearnerTabBar({
  active,
  onSelect,
  wishlistCount = 0,
  testID = 'learner-tab-bar',
}: LearnerTabBarProps) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.xs) }]}
      testID={testID}>
      {LEARNER_TABS.map((tab) => {
        const isActive = tab.key === active;
        const showBadge = tab.key === 'wishlist' && wishlistCount > 0;
        return (
          <Pressable
            accessibilityLabel={
              showBadge
                ? `${tab.label}, ${wishlistCount} saved course${
                    wishlistCount === 1 ? '' : 's'
                  }`
                : tab.label
            }
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            key={tab.key}
            onPress={() => onSelect(tab.key)}
            style={styles.item}
            testID={`tab-${tab.key}`}>
            <View style={styles.iconWrap}>
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={styles.vectorIcon}
                testID={`tab-icon-${tab.key}`}>
                {tab.key === 'home' ? (
                  <View style={styles.homeIcon}>
                    <View style={styles.homeRoof} />
                    <View style={styles.homeBody}><View style={styles.homeDoor} /></View>
                  </View>
                ) : tab.key === 'learning' ? (
                  <View style={styles.videoIcon}>
                    <View style={styles.playTriangle} />
                  </View>
                ) : tab.key === 'explore' ? (
                  <View style={styles.searchIcon}><View style={styles.searchHandle} /></View>
                ) : tab.key === 'wishlist' ? (
                  <Text style={styles.heartIcon}>♡</Text>
                ) : (
                  <View style={styles.profileIcon}>
                    <View style={styles.profileHead} />
                    <View style={styles.profileShoulders} />
                  </View>
                )}
              </View>
              {showBadge ? (
                <View style={styles.badge} testID="tab-wishlist-badge">
                  <Text style={styles.badgeLabel}>
                    {wishlistCount > 9 ? '9+' : wishlistCount}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
            <View
              style={[styles.indicator, isActive && styles.indicatorActive]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (palette: Palette) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'stretch',
      paddingTop: spacing.xs,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: palette.border,
      backgroundColor: palette.surface,
    },
    item: {
      flex: 1,
      minHeight: minTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      paddingVertical: spacing.xxs,
    },
    iconWrap: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
    vectorIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
    homeIcon: { width: 24, height: 24, alignItems: 'center' },
    homeRoof: { position: 'absolute', top: 4, width: 12, height: 12, borderLeftWidth: 1.6, borderTopWidth: 1.6, borderColor: palette.textSecondary, transform: [{ rotate: '45deg' }] },
    homeBody: { position: 'absolute', top: 10, width: 15, height: 12, borderWidth: 1.6, borderTopWidth: 0, borderColor: palette.textSecondary, alignItems: 'center', justifyContent: 'flex-end' },
    homeDoor: { width: 4, height: 7, borderWidth: 1.3, borderBottomWidth: 0, borderColor: palette.textSecondary },
    videoIcon: { width: 20, height: 20, borderRadius: radii.pill, borderWidth: 1.6, borderColor: palette.textSecondary, alignItems: 'center', justifyContent: 'center' },
    playTriangle: { width: 0, height: 0, marginLeft: 2, borderTopWidth: 5, borderBottomWidth: 5, borderLeftWidth: 7, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: palette.textSecondary },
    searchIcon: { width: 16, height: 16, borderRadius: radii.pill, borderWidth: 1.6, borderColor: palette.textSecondary, marginLeft: -3, marginTop: -3 },
    searchHandle: { position: 'absolute', width: 8, height: 1.6, top: 13, left: 11, backgroundColor: palette.textSecondary, transform: [{ rotate: '45deg' }] },
    heartIcon: { color: palette.textSecondary, fontSize: 23, lineHeight: 25, textAlign: 'center' },
    profileIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', gap: 2 },
    profileHead: { width: 8, height: 8, borderWidth: 1.5, borderColor: palette.textSecondary, borderRadius: radii.pill },
    profileShoulders: { width: 17, height: 9, borderWidth: 1.5, borderColor: palette.textSecondary, borderTopLeftRadius: 9, borderTopRightRadius: 9, borderBottomWidth: 0 },
    label: {
      ...typography.caption,
      color: palette.textMuted,
    },
    labelActive: {
      color: palette.brand,
      fontWeight: '700',
    },
    indicator: {
      width: 18,
      height: 3,
      marginTop: 2,
      borderRadius: radii.pill,
      backgroundColor: 'transparent',
    },
    indicatorActive: {
      backgroundColor: palette.brand,
    },
    badge: {
      position: 'absolute',
      top: -2,
      right: -8,
      minWidth: 16,
      height: 16,
      paddingHorizontal: 4,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      backgroundColor: palette.danger,
    },
    badgeLabel: {
      fontSize: 10,
      lineHeight: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });

export default LearnerTabBar;
