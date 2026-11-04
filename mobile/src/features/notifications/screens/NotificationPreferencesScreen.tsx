import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette, spacing, typography } from '@/theme/tokens';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { useNotificationPreferences } from '../hooks/useNotificationPreferences';
import { PreferenceGroup } from '../components/PreferenceGroup';
import { SaveButton } from '../components/SaveButton';
import { UnsavedWarningModal } from '../components/UnsavedWarningModal';
import { EventGroup } from '../types';

export function NotificationPreferencesScreen() {
  const nav = useNavigation<any>();
  const {
    prefs,
    loading,
    saving,
    hasUnsavedChanges,
    error,
    setGroupChannel,
    save,
  } = useNotificationPreferences();
  const [showWarning, setShowWarning] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const pendingNav = useRef<any>(null);

  useEffect(() => {
    if (toast === null) return undefined;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  useFocusEffect(() => {
    const unsubscribe = nav.addListener('beforeRemove', (e: any) => {
      if (!hasUnsavedChanges) return;
      e.preventDefault();
      pendingNav.current = e.data.action;
      setShowWarning(true);
    });
    return unsubscribe;
  });

  const onSave = async () => {
    const ok = await save();
    setToast(
      ok ? 'Notification preferences saved.' : 'Could not save preferences.'
    );
  };

  const discard = () => {
    setShowWarning(false);
    const action = pendingNav.current;
    pendingNav.current = null;
    if (action) nav.dispatch(action);
  };
  const cancel = () => {
    setShowWarning(false);
    pendingNav.current = null;
  };

  const groups: EventGroup[] = ['replies', 'mentions', 'sessions', 'payments'];
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safe}><ScrollView
      contentContainerStyle={styles.container}
      testID="notification-preferences-screen">
      <View style={styles.header}><Text style={styles.eyebrow}>NOTIFICATIONS</Text><Text style={styles.title}>Stay in the loop</Text><Text style={styles.subtitle}>Choose how you want to receive updates from Thinkz.ai.</Text></View>
      {loading ? (
        <View accessibilityLiveRegion="polite" style={styles.loading}>
          <ActivityIndicator
            accessibilityLabel="Loading notification preferences"
            testID="prefs-loading"
          />
          <Text>Loading preferences...</Text>
        </View>
      ) : null}
      {groups.map((g) => (
        <PreferenceGroup
          key={g}
          group={g}
          value={prefs[g]}
          onChannelChange={(c, v) => setGroupChannel(g, c, v)}
        />
      ))}
      {error ? (
        <Text
          accessibilityLiveRegion="assertive"
          style={styles.error}
          testID="prefs-error">
          {error}
        </Text>
      ) : null}
      <SaveButton saving={saving} onPress={onSave} />
      {toast ? (
        <Text
          accessibilityLiveRegion="polite"
          style={styles.toast}
          testID="prefs-save-toast">
          {toast}
        </Text>
      ) : null}
      <UnsavedWarningModal
        visible={showWarning}
        onDiscard={discard}
        onCancel={cancel}
      />
    </ScrollView></SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  container: {
    padding: spacing.lg,
    paddingTop: 116,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  header: { gap: spacing.xs, marginBottom: spacing.xs },
  eyebrow: { ...typography.caption, color: palette.accent, fontWeight: '800', letterSpacing: 1.1 },
  title: { ...typography.display, color: palette.textPrimary },
  subtitle: { ...typography.body, color: palette.textSecondary },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.sm,
  },
  error: {
    color: palette.danger,
    ...typography.caption,
  },
  toast: {
    color: palette.success,
    ...typography.caption,
    fontWeight: '600',
  },
});
