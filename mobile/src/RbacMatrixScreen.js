import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { getRoleMatrix, updateRolePermission } from "./api";
import { COLORS } from "./theme";

const clone = (grants = {}) => Object.fromEntries(Object.entries(grants).map(([role, permissions]) => [role, [...permissions]]));

export default function RbacMatrixScreen({ account }) {
  const [matrix, setMatrix] = useState(null);
  const [baseline, setBaseline] = useState({});
  const [draft, setDraft] = useState({});
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await getRoleMatrix(account.token);
      const next = clone(response.grants);
      setMatrix(response); setBaseline(next); setDraft(clone(next)); setRole((current) => response.roles?.includes(current) ? current : response.roles?.[0] || "");
    } catch (requestError) { setError(requestError.message || "Could not load RBAC matrix. Admin access is required."); }
    finally { setLoading(false); }
  }, [account.token]);
  useEffect(() => { load(); }, [load]);
  const changes = useMemo(() => !matrix ? [] : matrix.roles.flatMap((currentRole) => matrix.permissions.flatMap((permission) => ((baseline[currentRole] || []).includes(permission) === (draft[currentRole] || []).includes(permission)) ? [] : [{ role: currentRole, permission, granted: (draft[currentRole] || []).includes(permission) }])), [matrix, baseline, draft]);
  const toggle = (permission) => setDraft((current) => { const next = new Set(current[role] || []); next.has(permission) ? next.delete(permission) : next.add(permission); return { ...current, [role]: [...next] }; });
  const save = () => {
    if (!changes.length || saving) return;
    Alert.alert("Save permission changes?", `${changes.length} permission change${changes.length === 1 ? "" : "s"} will be applied.`, [{ text:"Cancel", style:"cancel" }, { text:"Save", onPress: async () => { setSaving(true); setError(""); try { await Promise.all(changes.map((item) => updateRolePermission(account.token, item.role, item.permission, item.granted))); setBaseline(clone(draft)); setToast(`${changes.length} permission change${changes.length === 1 ? "" : "s"} saved.`); } catch (requestError) { setError(requestError.message || "Could not save RBAC changes."); } finally { setSaving(false); } } }]);
  };
  if (loading) return <ScrollView contentContainerStyle={styles.screen}><Text style={styles.title}>RBAC Matrix</Text><Text style={styles.muted}>Loading role permissions…</Text>{[1,2,3,4,5].map((item) => <View key={item} style={styles.skeleton}/>)}</ScrollView>;
  if (error && !matrix) return <ScrollView contentContainerStyle={styles.screen}><Text style={styles.title}>RBAC Matrix</Text><Text style={styles.error}>{error}</Text><Pressable onPress={load} style={styles.secondary}><Text style={styles.secondaryText}>Retry</Text></Pressable></ScrollView>;
  return <ScrollView contentContainerStyle={styles.screen}><Text style={styles.title}>RBAC Matrix</Text><Text style={styles.muted}>Changes are staged locally until you save.</Text>{toast ? <Text style={styles.toast}>{toast}</Text> : null}{error ? <Text style={styles.error}>{error}</Text> : null}<ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={styles.roleTabs}>{matrix.roles.map((item) => <Pressable key={item} onPress={() => setRole(item)} style={[styles.tab, item === role && styles.tabActive]}><Text style={item === role && styles.tabActiveText}>{item}</Text></Pressable>)}</View></ScrollView><Text style={styles.muted}>{changes.length ? `${changes.length} unsaved change${changes.length === 1 ? "" : "s"}` : "All changes saved"}</Text>{matrix.permissions.map((permission) => { const granted = (draft[role] || []).includes(permission); return <Pressable key={permission} disabled={saving} onPress={() => toggle(permission)} style={styles.permission}><Text style={styles.name}>{permission}</Text><Text style={granted ? styles.granted : styles.denied}>{granted ? "Granted" : "Denied"}</Text></Pressable>; })}<View style={styles.actions}><Pressable disabled={!changes.length || saving} onPress={save} style={[styles.primary, (!changes.length || saving) && styles.disabled]}><Text style={styles.primaryText}>{saving ? "Saving…" : "Save changes"}</Text></Pressable><Pressable disabled={saving || !changes.length} onPress={() => { setDraft(clone(baseline)); setToast(""); }} style={styles.secondary}><Text style={styles.secondaryText}>Discard</Text></Pressable><Pressable disabled={saving} onPress={load} style={styles.secondary}><Text style={styles.secondaryText}>Refresh</Text></Pressable></View></ScrollView>;
}
const styles = StyleSheet.create({ screen:{padding:16,gap:12,backgroundColor:COLORS.background}, title:{fontSize:26,fontWeight:"700",color:COLORS.text}, muted:{color:COLORS.muted}, error:{color:COLORS.danger,fontWeight:"600"}, toast:{color:COLORS.success,backgroundColor:COLORS.successSoft,padding:10,borderRadius:8,fontWeight:"700"}, roleTabs:{flexDirection:"row",gap:8}, tab:{padding:10,borderRadius:8,backgroundColor:COLORS.border}, tabActive:{backgroundColor:COLORS.primarySoft}, tabActiveText:{fontWeight:"700",color:COLORS.primaryDark}, permission:{flexDirection:"row",justifyContent:"space-between",backgroundColor:COLORS.surface,padding:14,borderRadius:10}, name:{fontWeight:"700",color:COLORS.text}, granted:{color:COLORS.success,fontWeight:"700"},denied:{color:COLORS.danger,fontWeight:"700"},actions:{flexDirection:"row",flexWrap:"wrap",gap:10},primary:{alignSelf:"flex-start",backgroundColor:COLORS.primary,padding:11,borderRadius:8},primaryText:{color:COLORS.surface,fontWeight:"700"},secondary:{alignSelf:"flex-start",borderWidth:1,borderColor:COLORS.primary,padding:10,borderRadius:8},secondaryText:{color:COLORS.primaryDark,fontWeight:"700"},disabled:{opacity:.5},skeleton:{height:56,borderRadius:10,backgroundColor:COLORS.border}});
