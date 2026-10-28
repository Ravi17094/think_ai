import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette, radii, spacing, typography } from '@/theme/tokens';
import { RBAC_KEY, defaultPermissions, loadStored, saveStored } from './staffStorage';

type Grants = Record<string, string[]>;
const initial: Grants = { Admin: [...defaultPermissions], Instructor: ['view_courses', 'edit_courses', 'view_assessments'], TA: ['view_courses', 'view_assessments'] };
export function RbacMatrixScreen() {
  const [grants, setGrants] = useState<Grants>(initial); const [role, setRole] = useState('TA'); const [saved, setSaved] = useState<Grants>(initial); const [notice, setNotice] = useState('Loading role permissions…');
  useEffect(() => { loadStored(RBAC_KEY, initial).then((value) => { setGrants(value); setSaved(value); setNotice('Changes are staged until you save.'); }); }, []);
  const changes = useMemo(() => JSON.stringify(grants) !== JSON.stringify(saved), [grants, saved]);
  const toggle = (permission: string) => setGrants((current) => {
    const rolePermissions = current[role] ?? [];
    return {
      ...current,
      [role]: rolePermissions.includes(permission)
        ? rolePermissions.filter((item) => item !== permission)
        : [...rolePermissions, permission],
    };
  });
  const save = async () => { await saveStored(RBAC_KEY, grants); setSaved(grants); setNotice('Role permission changes saved on this device.'); };
  return <SafeAreaView edges={['top','left','right']} style={styles.safe}><ScrollView contentContainerStyle={styles.content}><Text style={styles.title}>Role permissions</Text><Text style={styles.note}>{notice}</Text><View style={styles.tabs}>{Object.keys(grants).map((item) => <Pressable key={item} onPress={() => setRole(item)} style={[styles.tab, role === item && styles.activeTab]}><Text style={[styles.tabText, role === item && styles.activeText]}>{item}</Text></Pressable>)}</View><Text style={styles.change}>{changes ? 'Unsaved changes' : 'All changes saved'}</Text>
    {defaultPermissions.map((permission) => { const allowed = (grants[role] ?? []).includes(permission); return <Pressable key={permission} onPress={() => toggle(permission)} style={styles.permission}><Text style={styles.permissionName}>{permission}</Text><Text style={allowed ? styles.granted : styles.denied}>{allowed ? 'Granted' : 'Denied'}</Text></Pressable>; })}<View style={styles.actions}><Pressable onPress={save} disabled={!changes} style={[styles.save, !changes && styles.disabled]}><Text style={styles.saveText}>Save changes</Text></Pressable><Pressable onPress={() => { setGrants(saved); setNotice('Staged changes discarded.'); }} style={styles.discard}><Text style={styles.discardText}>Discard</Text></Pressable></View>
  </ScrollView></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:palette.background},content:{padding:spacing.md,gap:spacing.md},title:{...typography.title,color:palette.textPrimary},note:{...typography.body,color:palette.textSecondary},tabs:{flexDirection:'row',gap:spacing.xs},tab:{padding:spacing.sm,borderRadius:radii.pill,backgroundColor:palette.surfaceMuted},activeTab:{backgroundColor:palette.brand},tabText:{...typography.label,color:palette.textSecondary},activeText:{color:palette.textPrimary},change:{...typography.caption,color:palette.brand},permission:{backgroundColor:palette.surface,borderColor:palette.border,borderWidth:1,borderRadius:radii.md,padding:spacing.md,flexDirection:'row',justifyContent:'space-between'},permissionName:{...typography.label,color:palette.textPrimary},granted:{...typography.label,color:palette.success},denied:{...typography.label,color:palette.danger},actions:{flexDirection:'row',gap:spacing.sm},save:{backgroundColor:palette.brand,borderRadius:radii.md,padding:spacing.md},saveText:{...typography.label,color:palette.textPrimary},discard:{borderColor:palette.brand,borderWidth:1,borderRadius:radii.md,padding:spacing.md},discardText:{...typography.label,color:palette.brand},disabled:{opacity:.45}});
