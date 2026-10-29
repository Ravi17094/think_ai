import type { PropsWithChildren } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { signOut } from "@/api/session";
import { allowsAudience, type AccessAudience } from "./access";
import { useLms } from "./LmsProvider";
import { Screen, styles } from "./ui";
export function AccessGate({
  audience,
  onHome,
  children,
}: PropsWithChildren<{ audience: AccessAudience; onHome: () => void }>) {
  const { session, ready, account, accessStatus, accessError, refreshAccess } =
    useLms();
  if (!ready || (session.token && accessStatus === "checking"))
    return (
      <View
        style={[
          styles.screen,
          { padding: 24, gap: 16, justifyContent: "center" },
        ]}
      >
        <ActivityIndicator accessibilityLabel="Verifying account access" />
        <Text style={styles.text}>Checking your account access…</Text>
      </View>
    );
  if (!session.token) return <Screen title="Sign in" />;
  if (accessStatus === "error" || !account)
    return (
      <View
        style={[
          styles.screen,
          { padding: 24, gap: 16, justifyContent: "center" },
        ]}
      >
        <Text style={styles.heading}>Account access could not be verified</Text>
        <Text style={styles.muted}>
          {accessError || "Reconnect and try again."}
        </Text>
        <AppButton
          title="Retry account access"
          onPress={() => void refreshAccess()}
        />
        <AppButton
          title="Sign out"
          variant="secondary"
          onPress={() => void signOut()}
        />
      </View>
    );
  if (!allowsAudience(audience, account.role))
    return (
      <View
        style={[
          styles.screen,
          { padding: 24, gap: 16, justifyContent: "center" },
        ]}
      >
        <Text style={styles.heading}>
          {audience === "admin"
            ? "Administrator access required"
            : audience === "learner"
              ? "This is a learner page"
              : "This page is not available for your role"}
        </Text>
        <Text style={styles.muted}>
          Open your workspace to use the features available to your account.
        </Text>
        <AppButton title="Go to my workspace" onPress={onHome} />
      </View>
    );
  return <>{children}</>;
}
