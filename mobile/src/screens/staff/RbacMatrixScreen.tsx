import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError } from '@/api/http';
import { getRbacMatrix, saveRbacPermission, type RbacMatrix } from '@/api/staffApi';
import { palette, radii, spacing, typography } from '@/theme/tokens';

export function RbacMatrixScreen() {
  const [matrix, setMatrix] = useState<RbacMatrix | null>(null);
  const [role, setRole] = useState('');
  const [notice, setNotice] = useState('Loading role permissions…');
  const [saving, setSaving] = useState<string | null>(null);
  const permissions = useMemo(() => matrix?.permissions ?? [], [matrix]);
  const load = async () => { try { const next = await getRbacMatrix(); setMatrix(next); setRole((current) => current || next.roles[0] || ''); setNotice('Permissions are loaded from the server.'); } catch (error) { setNotice(error instanceof ApiError ? error.message : 'Could not load role permissions.'); } };
  useEffect(() => { void load(); }, []);
  const toggle = (permission: string) => {
    if (!matrix || !role) return;
    const granted = !(matrix.grants[role] ?? []).includes(permission);
    Alert.alert(`${granted ? 'Grant' : 'Remove'} permission?`, `${granted ? 'Grant' : 'Remove'} ${permission} ${granted ? 'to' : 'from'} ${role}?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', onPress: () => void (async () => {
      setSaving(permission);
      try {
        await saveRbacPermission(role, permission, granted);
        setMatrix((current) => current ? { ...current, grants: { ...current.grants, [role]: granted ? [...(current.grants[role] ?? []), permission] : (current.grants[role] ?? []).filter((item) => item !== permission) } } : current);
        setNotice(`Saved: ${permission} ${granted ? 'granted to' : 'removed from'} ${role}.`);
      } catch (error) { setNotice(error instanceof ApiError ? error.message : 'Could not save that permission.'); } finally { setSaving(null); }
    })() }]);
  };
  return <SafeAreaView edges={['top','left','right']} style={styles.safe}><ScrollView contentContainerStyle={styles.content}><Text style={styles.title}>Role permissions</Text><Text style={styles.note}>{notice}</Text><View style={styles.tabs}>{matrix?.roles.map((item) => <Pressable key={item} onPress={() => setRole(item)} style={[styles.tab, role === item && styles.activeTab]}><Text style={[styles.tabText, role === item && styles.activeText]}>{item}</Text></Pressable>)}</View>
    {permissions.map((permission) => { const allowed = (matrix?.grants[role] ?? []).includes(permission); return <Pressable disabled={saving !== null} key={permission} onPress={() => toggle(permission)} style={styles.permission}><Text style={styles.permissionName}>{permission}</Text><Text style={allowed ? styles.granted : styles.denied}>{saving === permission ? 'Saving…' : allowed ? 'Granted' : 'Denied'}</Text></Pressable>; })}
    <Pressable onPress={load} style={styles.reload}><Text style={styles.reloadText}>Reload permissions</Text></Pressable>
  </ScrollView></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:palette.background},content:{padding:spacing.md,gap:spacing.md},title:{...typography.title,color:palette.textPrimary},note:{...typography.body,color:palette.textSecondary},tabs:{flexDirection:'row',gap:spacing.xs,flexWrap:'wrap'},tab:{padding:spacing.sm,borderRadius:radii.pill,backgroundColor:palette.surfaceMuted},activeTab:{backgroundColor:palette.brand},tabText:{...typography.label,color:palette.textSecondary},activeText:{color:palette.textPrimary},permission:{backgroundColor:palette.surface,borderColor:palette.border,borderWidth:1,borderRadius:radii.md,padding:spacing.md,flexDirection:'row',justifyContent:'space-between'},permissionName:{...typography.label,color:palette.textPrimary},granted:{...typography.label,color:palette.success},denied:{...typography.label,color:palette.danger},reload:{borderColor:palette.brand,borderWidth:1,borderRadius:radii.md,padding:spacing.md,alignItems:'center'},reloadText:{...typography.label,color:palette.brand}});
