import { useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { NavigationContext } from "@react-navigation/native";
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
  // Keep initial content clear of the development host's floating header.
  content: { padding: 20, paddingTop: 116, gap: 16, paddingBottom: 48 },
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
  loginShell: { flex: 1, justifyContent: "center", paddingTop: 44, gap: 14 },
  loginBrand: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 22 },
  loginMark: { color: palette.textPrimary, backgroundColor: palette.brand, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, fontSize: 17, fontWeight: "800" },
  loginBrandText: { color: palette.textPrimary, fontSize: 21, fontWeight: "800", letterSpacing: 0.4 },
  loginTitle: { color: palette.textPrimary, fontSize: 34, lineHeight: 40, fontWeight: "800" },
  loginSubtitle: { color: palette.textSecondary, fontSize: 16, lineHeight: 24, marginBottom: 16 },
  loginCard: { padding: 20, gap: 14, borderRadius: 24, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.borderStrong },
  loginCardTitle: { color: palette.textPrimary, fontSize: 18, fontWeight: "700", marginBottom: 4 },
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
    <View style={styles.loginShell}>
      <View style={styles.loginBrand}><Text style={styles.loginMark}>tz</Text><Text style={styles.loginBrandText}>Thinkz.ai</Text></View>
      <Text style={styles.loginTitle}>Welcome back</Text>
      <Text style={styles.loginSubtitle}>Sign in to continue your learning journey.</Text>
      <View style={styles.loginCard}>
      <Text style={styles.loginCardTitle}>Your learning, in one place</Text>
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
    </View>
  );
}
export function Screen({
  title: _title,
  children,
}: PropsWithChildren<{ title: string }>) {
  const { session, ready, online, account } = useLms();
  const admin = isAdministrator(account?.role);
  // React Native's installed ScrollView declaration is a function component,
  // so use the small imperative surface this screen needs rather than its
  // component type as the ref type.
  const scrollRef = useRef<{ scrollTo: (options: { y: number; animated: boolean }) => void } | null>(null);
  const navigation = useContext(NavigationContext);
  const resetScroll = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);
  useEffect(() => {
    const resetAfterFocus = () => {
      const frame = requestAnimationFrame(resetScroll);
      const delayedReset = setTimeout(resetScroll, 350);
      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(delayedReset);
      };
    };
    const cleanInitialReset = resetAfterFocus();
    const unsubscribe = navigation?.addListener?.("focus", resetAfterFocus);
    return () => {
      cleanInitialReset();
      unsubscribe?.();
    };
  }, [navigation, resetScroll]);
  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollRef as never}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="never"
          onContentSizeChange={() => {
            resetScroll();
          }}
          contentContainerStyle={styles.content}
        >
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
