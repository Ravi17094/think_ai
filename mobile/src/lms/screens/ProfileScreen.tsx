import { useLearnerProfile } from "@/hooks/useLearnerProfile";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import type { ScreenProps } from "@/navigation/types";
import { palette } from "@/theme/tokens";
import { lmsApi } from "../api";
import { Card, Field, LoadState, Message, Screen } from "../ui";
export function LearnerProfileScreen({
  navigation,
}: ScreenProps<"LearnerProfile">) {
  const resource = useLearnerProfile();
  const profile = resource.data;
  return (
    <Screen title="Profile">
      <LoadState {...resource} retry={resource.refresh} />
      {profile ? (
        <>
          <Text style={profileStyles.subtitle}>Signed in</Text>
          <View style={profileStyles.identityCard}>
            <View style={profileStyles.identityRow}>
              <View accessibilityLabel="Profile avatar" style={profileStyles.avatar}>
                <Text style={profileStyles.avatarText}>
                {(profile.user.name || profile.user.email)
                  .slice(0, 1)
                  .toUpperCase()}
                </Text>
              </View>
              <View style={profileStyles.identityCopy}>
                <Text numberOfLines={1} style={profileStyles.name}>{profile.user.name || "Learner"}</Text>
                <Text numberOfLines={1} style={profileStyles.email}>{profile.user.email}</Text>
                <Text style={profileStyles.role}>{profile.user.role}</Text>
              </View>
            </View>
            <Pressable onPress={() => navigation.navigate("LmsSettings")} style={profileStyles.edit} accessibilityRole="button"><Text style={profileStyles.editText}>Edit profile</Text></Pressable>
          </View>

          <View style={profileStyles.statRow}>
            <Stat value={profile.stats.coursesCompleted} label="Completed" />
            <Stat value={profile.stats.certificatesEarned} label="Certificates" />
            <Stat value={profile.stats.totalHours} label="Hours learned" />
          </View>

          <Text style={profileStyles.sectionTitle}>Learner details</Text>
          <View style={profileStyles.detailsCard}>
            <DetailRow label="Learner ID" value={`TZ-${profile.user.id}`} />
            <DetailRow label="Account role" value={profile.user.role} />
            <DetailRow label="Saved courses" value="0" last />
          </View>

          <Text style={profileStyles.sectionTitle}>Certificates</Text>
          {profile.certificates.length ? (
            profile.certificates.map((c) => (
              <View key={c.id} style={profileStyles.certificateCard}>
                <Text style={profileStyles.certificateName}>{c.courseName}</Text>
                <AppButton
                  title="Open certificate"
                  onPress={() =>
                    navigation.navigate("LmsCertificate", { certificateId: c.id })
                  }
                />
              </View>
            ))
          ) : (
            <Message text="Your earned certificates will appear here." />
          )}
          <Text style={profileStyles.sectionTitle}>Recent activity</Text>
          {profile.activity.map((item, i) => (
            <View key={`${item.at}-${i}`} style={profileStyles.activityCard}>
              <Text style={profileStyles.activityText}>{item.text}</Text>
              <Text style={profileStyles.activityDate}>
                {new Date(item.at).toLocaleString()}
              </Text>
            </View>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return <View style={profileStyles.stat}><Text style={profileStyles.statValue}>{value}</Text><Text style={profileStyles.statLabel}>{label}</Text></View>;
}

function DetailRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return <View style={[profileStyles.detailRow, last && profileStyles.lastDetailRow]}><Text style={profileStyles.detailLabel}>{label}</Text><Text style={profileStyles.detailValue}>{value}</Text></View>;
}

const profileStyles = StyleSheet.create({
  subtitle: { color: palette.textSecondary, fontSize: 16, marginTop: -8 },
  identityCard: { gap: 16, padding: 18, borderRadius: 24, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.borderStrong },
  identityRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatar: { width: 74, height: 74, borderRadius: 37, alignItems: "center", justifyContent: "center", backgroundColor: palette.brand },
  avatarText: { color: palette.textPrimary, fontSize: 29, fontWeight: "900" },
  identityCopy: { flex: 1, gap: 3 },
  name: { color: palette.textPrimary, fontSize: 25, fontWeight: "800" },
  email: { color: palette.textSecondary, fontSize: 15 },
  role: { color: palette.accent, fontSize: 14, fontWeight: "700", marginTop: 2, textTransform: "capitalize" },
  edit: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 15, borderWidth: 1, borderColor: palette.borderStrong, backgroundColor: palette.surfaceMuted },
  editText: { color: palette.textPrimary, fontSize: 16, fontWeight: "800" },
  statRow: { flexDirection: "row", gap: 10 },
  stat: { flex: 1, minHeight: 92, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.borderStrong },
  statValue: { color: palette.textPrimary, fontSize: 28, fontWeight: "900" },
  statLabel: { color: palette.textSecondary, fontSize: 11, fontWeight: "700", textAlign: "center", marginTop: 4 },
  sectionTitle: { color: palette.textPrimary, fontSize: 25, fontWeight: "800", marginTop: 14 },
  detailsCard: { borderRadius: 20, overflow: "hidden", backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.borderStrong },
  detailRow: { flexDirection: "row", justifyContent: "space-between", gap: 16, paddingHorizontal: 16, paddingVertical: 17, borderBottomWidth: 1, borderBottomColor: palette.border },
  lastDetailRow: { borderBottomWidth: 0 },
  detailLabel: { color: palette.textSecondary, fontSize: 15 },
  detailValue: { flexShrink: 1, color: palette.textPrimary, fontSize: 15, fontWeight: "800", textAlign: "right" },
  certificateCard: { padding: 16, gap: 12, borderRadius: 18, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.borderStrong },
  certificateName: { color: palette.textPrimary, fontSize: 16, fontWeight: "800" },
  activityCard: { padding: 16, gap: 5, borderRadius: 18, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border },
  activityText: { color: palette.textPrimary, fontSize: 15 },
  activityDate: { color: palette.textSecondary, fontSize: 13 },
});
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
