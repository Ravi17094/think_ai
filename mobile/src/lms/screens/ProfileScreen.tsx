import { useLearnerProfile } from "@/hooks/useLearnerProfile";
import { useState } from "react";
import { Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import type { ScreenProps } from "@/navigation/types";
import { lmsApi } from "../api";
import { Card, Field, LoadState, Message, Screen, styles } from "../ui";
export function LearnerProfileScreen({
  navigation,
}: ScreenProps<"LearnerProfile">) {
  const resource = useLearnerProfile();
  const profile = resource.data;
  return (
    <Screen title="Learner profile">
      <LoadState {...resource} retry={resource.refresh} />
      {profile ? (
        <>
          <Card>
            <View
              accessibilityLabel="Profile avatar"
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "#443388",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={[styles.title, { color: "#fff" }]}>
                {(profile.user.name || profile.user.email)
                  .slice(0, 1)
                  .toUpperCase()}
              </Text>
            </View>
            <Text style={styles.heading}>{profile.user.name || "Learner"}</Text>
            <Text style={styles.text}>{profile.user.email}</Text>
            <Text style={styles.badge}>{profile.user.role}</Text>
            <AppButton
              title="Edit profile"
              variant="secondary"
              onPress={() => navigation.navigate("LmsSettings")}
            />
          </Card>
          <Card>
            <Text style={styles.heading}>Learning stats</Text>
            <Text style={styles.text}>
              {profile.stats.coursesCompleted} courses completed
            </Text>
            <Text style={styles.text}>
              {profile.stats.certificatesEarned} certificates earned
            </Text>
            <Text style={styles.text}>
              {profile.stats.totalHours} total hours
            </Text>
          </Card>
          <Text style={styles.heading}>Certificates</Text>
          {profile.certificates.length ? (
            profile.certificates.map((c) => (
              <Card key={c.id}>
                <Text style={styles.text}>{c.courseName}</Text>
                <AppButton
                  title="Open certificate"
                  onPress={() =>
                    navigation.navigate("LmsCertificate", { certificateId: c.id })
                  }
                />
              </Card>
            ))
          ) : (
            <Message text="Your earned certificates will appear here." />
          )}
          <Text style={styles.heading}>Recent activity</Text>
          {profile.activity.map((item, i) => (
            <Card key={`${item.at}-${i}`}>
              <Text style={styles.text}>{item.text}</Text>
              <Text style={styles.muted}>
                {new Date(item.at).toLocaleString()}
              </Text>
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
export function LmsSettingsScreen({ navigation }: ScreenProps<"LmsSettings">) {
  const [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function save() {
    setBusy(true);
    try {
      await lmsApi.updateName(name.trim());
      navigation.replace("LearnerProfile");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen title="Profile settings">
      <Card>
        <Field label="Display name" value={name} onChangeText={setName} />
        <AppButton
          title="Save profile"
          loading={busy}
          disabled={!name.trim()}
          onPress={() => void save()}
        />
        {message ? <Message error text={message} /> : null}
      </Card>
    </Screen>
  );
}
