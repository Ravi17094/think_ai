import { useEffect, useMemo, useRef, useState } from "react";
import { Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import NetInfo from "@react-native-community/netinfo";
import { getAttendanceRegister, getTAReport, login, saveAttendanceRecord } from "./src/api";
import { connectLiveStudio } from "./src/liveSocket";
import GradingScreen from "./src/GradingScreen";
import InstructorControlsScreen from "./src/InstructorControlsScreen";
import AttendanceReportScreen from "./src/AttendanceReportScreen";
import RbacMatrixScreen from "./src/RbacMatrixScreen";
import { configurePushNotifications, retryPendingDeviceRegistration, subscribeToForegroundNotifications, subscribeToNotificationResponses } from "./src/notifications";
import { COLORS } from "./src/theme";

const ACCOUNT_STORAGE_KEY = "thinkz-mobile-account";
const CHAT_QUEUE_STORAGE_KEY = "thinkz-live-chat-outbox";
const RECORDING_URL = process.env.EXPO_PUBLIC_SESSION_RECORDING_URL || "";

function Card({ title, value, detail }) {
  return <View style={styles.card}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardValue}>{value}</Text><Text style={styles.muted}>{detail}</Text></View>;
}

function LiveStudio({ account, notificationNotice }) {
  const [status, setStatus] = useState("connecting");
  const [notice, setNotice] = useState("Connecting to Live Studio...");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [attendees, setAttendees] = useState([]);
  const [controls, setControls] = useState({ mic: false, camera: false, sharing: false, handRaised: false });
  const [retryCount, setRetryCount] = useState(0);
  const [secondsUntilRetry, setSecondsUntilRetry] = useState(5);
  const [networkOnline, setNetworkOnline] = useState(true);
  const outbox = useRef([]);
  const retryTimer = useRef(null);
  const flushOutbox = async () => {
    if (!outbox.current.length) return;
    const queued = [...outbox.current];
    outbox.current = [];
    queued.forEach((message) => socket.emit("chat:send", { sessionId: "s1", ...message }));
    await SecureStore.deleteItemAsync(CHAT_QUEUE_STORAGE_KEY);
    setMessages((current) => [...current, { id: `sync-${Date.now()}`, userName: "System", text: `${queued.length} queued message(s) sent.` }]);
  };
  const socket = useMemo(() => connectLiveStudio({
    token: account.token, user: account.user,
    onState: (session) => { setStatus(session.status || "live"); setAttendees(session.attendees || []); setNotice("Connected to Live Studio."); },
    onMessage: (message) => setMessages((current) => [...current, message]),
    onPoll: () => {},
    onError: (message) => { setStatus("offline"); setNotice(message); },
    onConnected: () => { setRetryCount(0); flushOutbox(); },
  }), [account]);

  useEffect(() => {
    SecureStore.getItemAsync(CHAT_QUEUE_STORAGE_KEY).then((value) => { outbox.current = value ? JSON.parse(value) : []; }).catch(() => {});
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setNetworkOnline(online);
      if (!online) { setStatus("offline"); setNotice("Connection lost. Messages will be sent when you reconnect."); }
    });
    return () => unsubscribe();
  }, []);
  useEffect(() => () => { if (retryTimer.current) clearInterval(retryTimer.current); socket.disconnect(); }, [socket]);
  useEffect(() => {
    if (status === "live" || !networkOnline || retryCount >= 6) { if (retryTimer.current) clearInterval(retryTimer.current); retryTimer.current = null; return undefined; }
    setSecondsUntilRetry(5);
    retryTimer.current = setInterval(() => {
      setSecondsUntilRetry((seconds) => {
        if (seconds > 1) return seconds - 1;
        setRetryCount((current) => {
          const next = current + 1;
          if (next <= 6) { setNotice(`Reconnecting (${next}/6)...`); socket.connect(); }
          return next;
        });
        return 5;
      });
    }, 1000);
    return () => { if (retryTimer.current) clearInterval(retryTimer.current); retryTimer.current = null; };
  }, [status, networkOnline, retryCount, socket]);
  const toggle = (key) => setControls((current) => ({ ...current, [key]: !current[key] }));
  const send = () => {
    const message = text.trim();
    if (!message) return;
    if (status === "live") socket.emit("chat:send", { sessionId: "s1", text: message, user: account.user });
    else {
      const queued = { id: `local-${Date.now()}`, text: message, user: account.user };
      outbox.current = [...outbox.current, queued];
      SecureStore.setItemAsync(CHAT_QUEUE_STORAGE_KEY, JSON.stringify(outbox.current)).catch(() => {});
      setMessages((current) => [...current, { ...queued, userName: "You (queued)" }]);
    }
    setText("");
  };
  const retry = () => { setRetryCount(0); setSecondsUntilRetry(5); setStatus("connecting"); setNotice("Trying to reconnect..."); socket.connect(); };
  const openRecording = async () => {
    if (!RECORDING_URL) { setNotice("The recording link has not been supplied for this session yet."); return; }
    await Linking.openURL(RECORDING_URL);
  };
  return <ScrollView contentContainerStyle={styles.screen}>
    <Text style={styles.heading}>Live Studio</Text><Text style={styles.badge}>{status.toUpperCase()}</Text><Text style={styles.muted}>{notice}</Text>{notificationNotice && <Text style={styles.muted}>{notificationNotice}</Text>}
    <View style={styles.video}><Text style={styles.videoText}>Video room connects when EXPO_PUBLIC_JITSI_URL is configured.</Text>{status !== "live" && <View style={styles.connectionOverlay}><Text style={styles.overlayTitle}>{retryCount >= 6 ? "Session unavailable" : "Connection lost"}</Text><Text style={styles.overlayText}>{retryCount >= 6 ? "Unable to reconnect after six attempts." : networkOnline ? `Retrying in ${secondsUntilRetry}s - attempt ${retryCount + 1} of 6` : "Reconnect to the internet to continue."}</Text></View>}</View>
    <View style={styles.toolbar}>
      <Pressable onPress={() => toggle("mic")} style={styles.tool}><Text>{controls.mic ? "Mic on" : "Mic off"}</Text></Pressable>
      <Pressable onPress={() => toggle("camera")} style={styles.tool}><Text>{controls.camera ? "Camera on" : "Camera off"}</Text></Pressable>
      <Pressable onPress={() => toggle("sharing")} style={styles.tool}><Text>{controls.sharing ? "Stop share" : "Share"}</Text></Pressable>
      <Pressable onPress={() => toggle("handRaised")} style={styles.tool}><Text>{controls.handRaised ? "Hand raised" : "Raise hand"}</Text></Pressable>
    </View>
    {status !== "live" && <><Pressable onPress={retry} style={styles.secondary}><Text style={styles.secondaryText}>{retryCount >= 6 ? "Try again" : "Retry connection"}</Text></Pressable>{retryCount >= 6 && <><Text style={styles.unavailable}>Session unavailable. Queued chat is preserved and will send after reconnection.</Text><Pressable onPress={openRecording} style={styles.secondary}><Text style={styles.secondaryText}>Open session recording</Text></Pressable></>}</>}
    <Text style={styles.section}>Attendees ({attendees.filter((item) => item.online).length})</Text>
    {attendees.length === 0 && <Text style={styles.muted}>No live attendees are connected yet.</Text>}
    {attendees.map((item) => <Text key={item.userId} style={styles.row}>{item.name} - {item.online ? "online" : "offline"}</Text>)}
    <Text style={styles.section}>Class chat</Text>
    {messages.map((item) => <Text key={item.id} style={styles.row}><Text style={styles.strong}>{item.userName}: </Text>{item.text}</Text>)}
    <View style={styles.messageRow}><TextInput value={text} onChangeText={setText} placeholder="Message the class" style={styles.input}/><Pressable onPress={send} style={styles.primary}><Text style={styles.primaryText}>Send</Text></Pressable></View>
  </ScrollView>;
}

function TADashboard({ account }) {
  const sessionDate = new Date().toISOString().slice(0, 10);
  const sessionTitle = "Mobile TA session";
  const [attendance, setAttendance] = useState([]);
  const [report, setReport] = useState(null);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState("Loading TA data...");
  const [busy, setBusy] = useState(false);
  const load = async () => {
    setBusy(true);
    try {
      const [registerResponse, reportResponse] = await Promise.all([
        getAttendanceRegister(account.token, sessionDate, sessionTitle),
        getTAReport(account.token),
      ]);
      setAttendance((registerResponse.data || []).map((student) => ({ id: student.enrollmentId, name: student.studentName, status: student.status, notes: student.notes || "" })));
      setReport(reportResponse.data || null);
      setNotice("Live TA data loaded from Thinkz API.");
    } catch (error) {
      setNotice(error.message || "Could not load TA data.");
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => { load(); }, []);
  const advanceStatus = (id) => setAttendance((current) => current.map((student) => {
    if (student.id !== id) return student;
    const next = { PRESENT: "TARDY", TARDY: "ABSENT", ABSENT: "EXCUSED", EXCUSED: "PRESENT" };
    return { ...student, status: next[student.status] };
  }));
  const save = async () => {
    setBusy(true);
    try {
      await Promise.all(attendance.map((student) => saveAttendanceRecord(account.token, { enrollmentId: student.id, sessionDate, sessionTitle, status: student.status, notes: student.notes })));
      setSaved(true);
      setNotice("Attendance saved to Thinkz API.");
      await load();
    } catch (error) {
      setNotice(error.message || "Could not save attendance.");
    } finally {
      setBusy(false);
    }
  };
  return <ScrollView contentContainerStyle={styles.screen}><Text style={styles.heading}>TA Dashboard</Text><Text style={styles.muted}>{notice}</Text><View style={styles.grid}><Card title="Active modules" value={report?.coursework?.activeModules ?? "--"} detail="Current coursework"/><Card title="Active assessments" value={report?.coursework?.activeAssessments ?? "--"} detail="Current assessments"/><Card title="Auto-graded" value={report?.grading?.graded ?? "--"} detail="Assessment results"/><Card title="Support tasks" value={report?.grading?.pending ?? "--"} detail="Needs follow-up"/></View><Text style={styles.section}>Attendance register</Text><Text style={styles.muted}>Tap a learner to cycle Present, Tardy, Absent, and Excused.</Text>{attendance.length === 0 && <Text style={styles.muted}>No learners are available for this session.</Text>}{attendance.map((student) => <Pressable key={student.id} onPress={() => { advanceStatus(student.id); setSaved(false); }} style={styles.permission}><Text style={styles.strong}>{student.name}</Text><Text>{student.status}</Text></Pressable>)}<View style={styles.actionRow}><Pressable disabled={busy} onPress={save} style={styles.primary}><Text style={styles.primaryText}>{busy ? "Working..." : saved ? "Attendance saved" : "Save attendance"}</Text></Pressable><Pressable disabled={busy} onPress={load} style={styles.secondary}><Text style={styles.secondaryText}>Refresh</Text></Pressable></View></ScrollView>;
}

function LegacyRBACMatrix({ account }) {
  const [matrix, setMatrix] = useState(null);
  const [selectedRole, setSelectedRole] = useState("TA");
  const [notice, setNotice] = useState("Loading RBAC permissions...");
  const [busy, setBusy] = useState(false);
  const load = async () => {
    setBusy(true);
    try {
      const response = await getRoleMatrix(account.token);
      setMatrix(response);
      setSelectedRole((current) => response.roles?.includes(current) ? current : response.roles?.[0]);
      setNotice("Live permissions loaded from Thinkz API.");
    } catch (error) {
      setNotice(error.message || "Could not load RBAC permissions. Admin access is required.");
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => { load(); }, []);
  const toggle = async (permission) => {
    if (!matrix || busy) return;
    const granted = !(matrix.grants?.[selectedRole] || []).includes(permission);
    setBusy(true);
    try {
      await updateRolePermission(account.token, selectedRole, permission, granted);
      setMatrix((current) => {
        const grants = { ...current.grants, [selectedRole]: granted ? [...(current.grants[selectedRole] || []), permission] : (current.grants[selectedRole] || []).filter((item) => item !== permission) };
        return { ...current, grants };
      });
      setNotice(`${permission} ${granted ? "granted" : "revoked"} for ${selectedRole}.`);
    } catch (error) {
      setNotice(error.message || "Could not update permission.");
    } finally {
      setBusy(false);
    }
  };
  return <ScrollView contentContainerStyle={styles.screen}><Text style={styles.heading}>RBAC Matrix</Text><Text style={styles.muted}>{notice}</Text>{matrix?.roles && <View style={styles.roleTabs}>{matrix.roles.map((role) => <Pressable key={role} onPress={() => setSelectedRole(role)} style={[styles.tab, role === selectedRole && styles.tabActive]}><Text>{role}</Text></Pressable>)}</View>}{matrix?.permissions?.map((permission) => { const enabled = (matrix.grants?.[selectedRole] || []).includes(permission); return <Pressable key={permission} disabled={busy} onPress={() => toggle(permission)} style={styles.permission}><Text style={styles.strong}>{permission}</Text><Text>{enabled ? "Granted" : "Denied"}</Text></Pressable>; })}<Pressable disabled={busy} onPress={load} style={styles.secondary}><Text style={styles.secondaryText}>{busy ? "Working..." : "Refresh RBAC"}</Text></Pressable></ScrollView>;
}

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Sign in with an existing Thinkz TA, Instructor, or Admin account.");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!email.trim() || !password) { setMessage("Enter your email and password."); return; }
    setBusy(true);
    try {
      const response = await login(email.trim(), password);
      onLogin({ token: response.token, user: response.user });
    } catch (error) {
      setMessage(error.message || "Login failed.");
    } finally {
      setBusy(false);
    }
  };
  return <ScrollView contentContainerStyle={styles.loginScreen}><Text style={styles.heading}>Thinkz AI Mobile</Text><Text style={styles.muted}>{message}</Text><TextInput autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="Email" style={styles.input}/><TextInput secureTextEntry value={password} onChangeText={setPassword} placeholder="Password" style={styles.input}/><Pressable disabled={busy} onPress={submit} style={styles.primary}><Text style={styles.primaryText}>{busy ? "Signing in..." : "Sign in"}</Text></Pressable></ScrollView>;
}

export default function App() {
  const [tab, setTab] = useState("live");
  const [account, setAccount] = useState(null);
  const [ready, setReady] = useState(false);
  const [notificationNotice, setNotificationNotice] = useState("");
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedAccount = await SecureStore.getItemAsync(ACCOUNT_STORAGE_KEY);
        if (savedAccount) setAccount(JSON.parse(savedAccount));
      } catch (_) {
        await SecureStore.deleteItemAsync(ACCOUNT_STORAGE_KEY);
      } finally {
        setReady(true);
      }
    };
    restoreSession();
  }, []);
  const saveAccount = async (nextAccount) => {
    await SecureStore.setItemAsync(ACCOUNT_STORAGE_KEY, JSON.stringify(nextAccount));
    setAccount(nextAccount);
  };
  const logout = async () => {
    await SecureStore.deleteItemAsync(ACCOUNT_STORAGE_KEY);
    setAccount(null);
  };
  useEffect(() => {
    if (!account) { setNotificationNotice(""); return undefined; }
    configurePushNotifications({ token: account.token, onOpen: setTab }).then(async (result) => {
      try {
        if (await retryPendingDeviceRegistration(account.token)) setNotificationNotice("Notifications are enabled for this device.");
        else setNotificationNotice(result.message);
      } catch (_) { setNotificationNotice(result.message); }
    }).catch(() => setNotificationNotice("Notification setup could not be completed on this device."));
    const removeResponseListener = subscribeToNotificationResponses(setTab);
    const removeForegroundListener = subscribeToForegroundNotifications(setNotificationNotice);
    return () => { removeResponseListener(); removeForegroundListener(); };
  }, [account]);
  if (!ready) return <SafeAreaView style={styles.app}><View style={styles.loading}><Text style={styles.muted}>Restoring secure session...</Text></View></SafeAreaView>;
  if (!account) return <SafeAreaView style={styles.app}><LoginScreen onLogin={saveAccount}/></SafeAreaView>;
  const role = String(account?.user?.role || account?.role || "").toLowerCase();
  const canManageRbac = ["admin", "super_admin", "superadmin"].includes(role);
  const navigationTabs = [["live", "Live"], ["ta", "TA"], ["report", "Report"], ["grade", "Grade"], ["controls", "Controls"], ...(canManageRbac ? [["rbac", "RBAC"]] : [])];

  return <SafeAreaView style={styles.app}><View style={styles.navigation}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>{navigationTabs.map(([key, label]) => <Pressable key={key} onPress={() => setTab(key)} style={[styles.tab, tab === key && styles.tabActive]}><Text>{label}</Text></Pressable>)}</ScrollView><Pressable onPress={logout} style={styles.signOut}><Text style={styles.signOutText}>Log out</Text></Pressable></View>{tab === "live" ? <LiveStudio account={account} notificationNotice={notificationNotice}/> : tab === "ta" ? <TADashboard account={account}/> : tab === "report" ? <AttendanceReportScreen account={account}/> : tab === "grade" ? <GradingScreen account={account}/> : tab === "controls" ? <InstructorControlsScreen account={account}/> : <RbacMatrixScreen account={account}/>}</SafeAreaView>;
}

const styles = StyleSheet.create({ app:{flex:1,backgroundColor:COLORS.background}, loading:{flex:1,alignItems:"center",justifyContent:"center"}, navigation:{backgroundColor:COLORS.surface,borderBottomWidth:1,borderBottomColor:COLORS.border}, tabs:{flexDirection:"row",gap:8,paddingHorizontal:16,paddingVertical:10,paddingRight:32,alignItems:"center"},tab:{paddingVertical:10,paddingHorizontal:12,borderRadius:8},tabActive:{backgroundColor:COLORS.primarySoft},signOut:{alignSelf:"flex-end",paddingHorizontal:16,paddingVertical:10},signOutText:{color:COLORS.textSecondary,fontWeight:"600"},screen:{padding:16,gap:12},loginScreen:{padding:24,gap:14,justifyContent:"center",flexGrow:1},heading:{fontSize:26,fontWeight:"700",color:COLORS.text},badge:{alignSelf:"flex-start",backgroundColor:COLORS.dangerSoft,color:COLORS.danger,padding:6,borderRadius:16,fontWeight:"700"},unavailable:{backgroundColor:COLORS.dangerSurface,color:COLORS.dangerStrong,padding:12,borderRadius:8},grid:{flexDirection:"row",flexWrap:"wrap",gap:10},card:{width:"47%",backgroundColor:COLORS.surface,padding:14,borderRadius:12},cardTitle:{fontSize:12,color:COLORS.muted},cardValue:{fontSize:28,fontWeight:"700",marginVertical:8},muted:{color:COLORS.muted},section:{marginTop:12,fontWeight:"700",fontSize:17},video:{height:210,borderRadius:12,backgroundColor:COLORS.darkSurface,alignItems:"center",justifyContent:"center",padding:18,overflow:"hidden"},videoText:{color:COLORS.surface,textAlign:"center"},connectionOverlay:{position:"absolute",inset:0,backgroundColor:"rgba(15,23,42,0.92)",alignItems:"center",justifyContent:"center",padding:20,gap:8},overlayTitle:{color:COLORS.surface,fontWeight:"700",fontSize:22},overlayText:{color:COLORS.inputBorder,textAlign:"center"},toolbar:{flexDirection:"row",flexWrap:"wrap",justifyContent:"space-around",backgroundColor:COLORS.surface,padding:10,borderRadius:12,gap:6},tool:{padding:8,borderRadius:6,backgroundColor:COLORS.primarySurface},row:{paddingVertical:8,borderBottomWidth:1,borderColor:COLORS.border},strong:{fontWeight:"700"},messageRow:{flexDirection:"row",gap:8},input:{backgroundColor:COLORS.surface,borderWidth:1,borderColor:COLORS.inputBorder,borderRadius:8,padding:10},primary:{alignSelf:"flex-start",backgroundColor:COLORS.primary,padding:11,borderRadius:8},primaryText:{color:COLORS.surface,fontWeight:"700"},secondary:{alignSelf:"flex-start",borderWidth:1,borderColor:COLORS.primary,padding:10,borderRadius:8},secondaryText:{color:COLORS.primaryDark,fontWeight:"700"},actionRow:{flexDirection:"row",gap:10},roleTabs:{flexDirection:"row",flexWrap:"wrap",gap:8},permission:{flexDirection:"row",justifyContent:"space-between",backgroundColor:COLORS.surface,padding:14,borderRadius:10} });
