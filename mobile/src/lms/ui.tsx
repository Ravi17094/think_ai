import { useState, type PropsWithChildren } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton } from "@/components/common/AppButton";
import { palette } from "@/theme/tokens";
import { login } from "./api";
import { useLms } from "./LmsProvider";
import { isAdministrator } from "./access";
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  content: { padding: 20, gap: 16, paddingBottom: 48 },
  card: {
    padding: 18,
    gap: 12,
    backgroundColor: palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  title: { fontSize: 26, fontWeight: "700", color: palette.textPrimary },
  heading: { fontSize: 18, fontWeight: "600", color: palette.textPrimary },
  text: { fontSize: 15, color: palette.textPrimary, lineHeight: 23 },
  muted: { fontSize: 13, color: palette.textSecondary, lineHeight: 20 },
  input: {
    backgroundColor: palette.surfaceMuted,
    color: palette.textPrimary,
    padding: 12,
    borderRadius: 10,
    minHeight: 48,
    borderWidth: 1,
    borderColor: palette.borderStrong,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
  },
  error: { color: palette.danger, fontSize: 14 },
  badge: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: palette.surfaceMuted,
    color: palette.accent,
  },
});
export function Field({
  label,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.muted}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={palette.textSecondary}
        {...props}
        style={[styles.input, props.style]}
      />
    </View>
  );
}
export function Message({
  text,
  error = false,
}: {
  text: string;
  error?: boolean;
}) {
  return (
    <Text
      accessibilityLiveRegion="polite"
      style={error ? styles.error : styles.muted}
    >
      {text}
    </Text>
  );
}
export function LoginForm() {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    setError("");
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Sign in to your account</Text>
      <Field
        label="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Field
        label="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Message error text={error} /> : null}
      <AppButton
        title="Sign in"
        onPress={() => void submit()}
        loading={busy}
        disabled={!email || !password}
      />
    </View>
  );
}
export function Screen({
  title,
  children,
}: PropsWithChildren<{ title: string }>) {
  const { session, ready, online, syncStatus, account } = useLms();
  const admin = isAdministrator(account?.role);
  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          {!ready ? (
            <ActivityIndicator />
          ) : !session.token ? (
            <LoginForm />
          ) : (
            <>
              {!online ? (
                <Message
                  text={
                    admin
                      ? "You are offline. Reconnect to refresh analytics and reports."
                      : "You are offline. Downloaded lessons and saved drafts remain available."
                  }
                />
              ) : null}
              {!admin ? <Message text={syncStatus} /> : null}
              {children}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Card({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}
export function LoadState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string | null;
  retry: () => unknown;
}) {
  return (
    <>
      {loading ? <ActivityIndicator accessibilityLabel="Loading" /> : null}
      {error ? (
        <>
          <Message text={error} error />
          <AppButton
            title="Retry"
            variant="secondary"
            onPress={() => void retry()}
          />
        </>
      ) : null}
    </>
  );
}
