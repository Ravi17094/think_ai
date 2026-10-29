import { useState } from "react";
import { Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { signOut } from "@/api/session";
import type { ScreenProps } from "@/navigation/types";
import { lmsApi } from "../api";
import { useLms } from "../LmsProvider";
import { roleHome } from "../access";
import { Card, Field, Message, Screen, styles } from "../ui";
export function AdminHomeScreen({ navigation }: ScreenProps<"AdminHome">) {
  const { account } = useLms();
  return (
    <Screen title="Admin workspace">
      <Card>
        <Text style={styles.heading}>
          Welcome, {account?.name || "Administrator"}
        </Text>
        <Text style={styles.muted}>
          Manage learning analytics and reporting for your organization.
        </Text>
        <Text style={styles.badge}>{account?.role}</Text>
      </Card>
      <Card>
        <Text style={styles.heading}>Analytics and reports</Text>
        <Text style={styles.text}>
          Review enrollment, completion, scores, activity and attendance. Filter
          course performance, export CSV/PDF reports and check scheduled
          delivery.
        </Text>
        <AppButton
          title="Open analytics and reports"
          onPress={() => navigation.navigate("Analytics")}
        />
      </Card>
      <View style={styles.row}>
        <AppButton
          title="My account"
          variant="secondary"
          onPress={() => navigation.navigate("Account")}
        />
        <AppButton
          title="Sign out"
          variant="secondary"
          onPress={() => void signOut()}
        />
      </View>
    </Screen>
  );
}
export function AccountScreen() {
  const { account, refreshAccess } = useLms();
  const [name, setName] = useState(account?.name || "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save() {
    setBusy(true);
    setMessage("");
    try {
      await lmsApi.updateName(name.trim());
      await refreshAccess();
      setMessage("Account updated.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Account could not be updated.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen title="My account">
      <Card>
        <Text style={styles.text}>{account?.email}</Text>
        <Text style={styles.badge}>{account?.role}</Text>
        <Field label="Display name" value={name} onChangeText={setName} />
        <AppButton
          title="Save account"
          loading={busy}
          disabled={!name.trim()}
          onPress={() => void save()}
        />
        {message ? <Message text={message} /> : null}
      </Card>
    </Screen>
  );
}
export function SignInScreen({ navigation }: ScreenProps<"SignIn" | "Login">) {
  const { session, account } = useLms();
  return (
    <Screen title="Sign in">
      {session.token ? (
        <AppButton
          title="Open my workspace"
          onPress={() => navigation.replace(roleHome(account?.role))}
        />
      ) : null}
    </Screen>
  );
}
