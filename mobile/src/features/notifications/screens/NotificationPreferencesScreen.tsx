import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
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
    <ScrollView
      contentContainerStyle={styles.container}
      testID="notification-preferences-screen">
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  error: {
    color: '#F87171',
    fontSize: 13,
  },
  toast: {
    color: '#34D399',
    fontSize: 13,
    fontWeight: '600',
  },
});
