import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError } from "@/api/http";
import { getRbacMatrix, saveRbacPermission, type RbacMatrix } from "@/api/staffApi";
import { palette, radii, spacing, typography } from "@/theme/tokens";
import { StaffButton, StaffNotice, StaffPageHeader, StaffSection, staffStyles } from "./staffUi";

export function RbacMatrixScreen() {
  const [matrix, setMatrix] = useState<RbacMatrix | null>(null);
  const [role, setRole] = useState("");
  const [notice, setNotice] = useState("Loading role permissions…");
  const [saving, setSaving] = useState<string | null>(null);
  const permissions = useMemo(() => matrix?.permissions ?? [], [matrix]);

  const load = async () => {
    try {
      const next = await getRbacMatrix();
      setMatrix(next);
      setRole((current) => current || next.roles[0] || "");
      setNotice("Permissions are loaded from the server.");
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "Could not load role permissions.");
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const initialLoad = setTimeout(() => void load(), 0);
    return () => clearTimeout(initialLoad);
  }, []);

  const toggle = (permission: string) => {
    if (!matrix || !role) return;
    const granted = !(matrix.grants[role] ?? []).includes(permission);
    Alert.alert(`${granted ? "Grant" : "Remove"} permission?`, `${granted ? "Grant" : "Remove"} ${permission} ${granted ? "to" : "from"} ${role}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", onPress: () => void (async () => {
        setSaving(permission);
        try {
          await saveRbacPermission(role, permission, granted);
          setMatrix((current) => current ? { ...current, grants: { ...current.grants, [role]: granted ? [...(current.grants[role] ?? []), permission] : (current.grants[role] ?? []).filter((item) => item !== permission) } } : current);
          setNotice(`Saved: ${permission} ${granted ? "granted to" : "removed from"} ${role}.`);
        } catch (error) {
          setNotice(error instanceof ApiError ? error.message : "Could not save that permission.");
        } finally {
          setSaving(null);
        }
      })() },
    ]);
  };

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={staffStyles.safe}>
      <ScrollView contentContainerStyle={staffStyles.content}>
        <StaffPageHeader eyebrow="ACCESS MANAGEMENT" title="Role permissions" description="Review and securely update the permissions available to each role." />
        <StaffNotice>{notice}</StaffNotice>
        <StaffSection title="Choose a role">
          <View style={styles.roleList}>
            {matrix?.roles.map((item) => <Pressable key={item} onPress={() => setRole(item)} style={[styles.role, role === item && styles.activeRole]} accessibilityRole="tab" accessibilityState={{ selected: role === item }}><Text style={[styles.roleText, role === item && styles.activeRoleText]}>{item}</Text></Pressable>)}
          </View>
        </StaffSection>
        <StaffSection title={`${role || "Role"} permissions`}>
          <Text style={styles.help}>Tap a permission to grant or remove it. Changes require confirmation and are saved to the server.</Text>
          {permissions.map((permission) => {
            const allowed = (matrix?.grants[role] ?? []).includes(permission);
            return <Pressable disabled={saving !== null} key={permission} onPress={() => toggle(permission)} style={[styles.permission, allowed && styles.permissionGranted]} accessibilityRole="switch" accessibilityState={{ checked: allowed, disabled: saving !== null }}>
              <View style={styles.permissionCopy}><Text style={styles.permissionName}>{permission}</Text><Text style={styles.permissionHint}>{allowed ? "Allowed for this role" : "Not allowed"}</Text></View>
              <View style={[styles.toggle, allowed && styles.toggleOn]}><View style={[styles.knob, allowed && styles.knobOn]} /></View>
            </Pressable>;
          })}
        </StaffSection>
        <StaffButton title="Reload permissions" onPress={() => void load()} variant="secondary" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  roleList: { flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" },
  role: { minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radii.pill, borderWidth: 1, borderColor: palette.borderStrong, backgroundColor: palette.surface, justifyContent: "center" },
  activeRole: { borderColor: palette.brand, backgroundColor: "#28164E" },
  roleText: { ...typography.label, color: palette.textSecondary, textTransform: "capitalize" },
  activeRoleText: { color: palette.textPrimary },
  help: { ...typography.caption, color: palette.textSecondary, lineHeight: 19 },
  permission: { ...staffStyles.card, padding: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  permissionGranted: { borderColor: "rgba(52, 211, 153, .6)", backgroundColor: "rgba(52, 211, 153, .08)" },
  permissionCopy: { flex: 1 },
  permissionName: { ...typography.label, color: palette.textPrimary },
  permissionHint: { ...typography.caption, color: palette.textSecondary, marginTop: spacing.xxs },
  toggle: { width: 48, height: 28, padding: 3, borderRadius: radii.pill, backgroundColor: palette.borderStrong },
  toggleOn: { backgroundColor: palette.success },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: palette.textPrimary },
  knobOn: { alignSelf: "flex-end" },
});
