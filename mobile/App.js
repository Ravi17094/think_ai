import { useEffect, useMemo, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { connectLiveStudio } from "./src/liveSocket";

const user = { id: "mobile-demo-ta", name: "Mobile Demo TA", role: "TA" };

function Card({ title, value, detail }) {
  return <View style={styles.card}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardValue}>{value}</Text><Text style={styles.muted}>{detail}</Text></View>;
}

function LiveStudio() {
  const [status, setStatus] = useState("connecting");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [attendees, setAttendees] = useState([]);
  const socket = useMemo(() => connectLiveStudio({
    token: "", user,
    onState: (session) => { setStatus(session.status || "live"); setAttendees(session.attendees || []); },
    onMessage: (message) => setMessages((current) => [...current, message]),
    onPoll: () => {},
  }), []);

  useEffect(() => () => socket.disconnect(), [socket]);
  const send = () => { if (!text.trim()) return; socket.emit("chat:send", { sessionId: "s1", text, user }); setText(""); };
  return <ScrollView contentContainerStyle={styles.screen}>
    <Text style={styles.heading}>Live Studio</Text><Text style={styles.badge}>{status.toUpperCase()}</Text>
    <View style={styles.video}><Text style={styles.videoText}>Video room connects when EXPO_PUBLIC_JITSI_URL is configured.</Text></View>
    <View style={styles.toolbar}><Text>Mic</Text><Text>Camera</Text><Text>Share</Text><Text>Raise hand</Text></View>
    <Text style={styles.section}>Attendees ({attendees.filter((item) => item.online).length})</Text>
    {attendees.map((item) => <Text key={item.userId} style={styles.row}>{item.name} - {item.online ? "online" : "offline"}</Text>)}
    <Text style={styles.section}>Class chat</Text>
    {messages.map((item) => <Text key={item.id} style={styles.row}><Text style={styles.strong}>{item.userName}: </Text>{item.text}</Text>)}
    <View style={styles.messageRow}><TextInput value={text} onChangeText={setText} placeholder="Message the class" style={styles.input}/><Pressable onPress={send} style={styles.primary}><Text style={styles.primaryText}>Send</Text></Pressable></View>
  </ScrollView>;
}

function TADashboard() {
  return <ScrollView contentContainerStyle={styles.screen}><Text style={styles.heading}>TA Dashboard</Text><View style={styles.grid}><Card title="Assigned courses" value="3" detail="Current assignments"/><Card title="Upcoming sessions" value="2" detail="Next seven days"/><Card title="Auto-graded" value="--" detail="Assessment results"/><Card title="Support tasks" value="0" detail="No follow-up needed"/></View><Text style={styles.section}>Attendance and progress reporting are available through the Thinkz API.</Text></ScrollView>;
}

function RBACMatrix() {
  const [permissions, setPermissions] = useState({ view_courses: true, edit_courses: false, view_assessments: true });
  const [saved, setSaved] = useState(true);
  const toggle = (key) => { setPermissions((current) => ({ ...current, [key]: !current[key] })); setSaved(false); };
  return <ScrollView contentContainerStyle={styles.screen}><Text style={styles.heading}>RBAC Matrix</Text><Text style={styles.muted}>Changes are staged until saved.</Text>{Object.entries(permissions).map(([key, enabled]) => <Pressable key={key} onPress={() => toggle(key)} style={styles.permission}><Text style={styles.strong}>{key}</Text><Text>{enabled ? "Granted" : "Denied"}</Text></Pressable>)}<Pressable onPress={() => setSaved(true)} style={styles.primary}><Text style={styles.primaryText}>{saved ? "All changes saved" : "Save changes"}</Text></Pressable></ScrollView>;
}

export default function App() {
  const [tab, setTab] = useState("live");
  return <SafeAreaView style={styles.app}><View style={styles.tabs}>{[["live", "Live"], ["ta", "TA"], ["rbac", "RBAC"]].map(([key, label]) => <Pressable key={key} onPress={() => setTab(key)} style={[styles.tab, tab === key && styles.tabActive]}><Text>{label}</Text></Pressable>)}</View>{tab === "live" ? <LiveStudio/> : tab === "ta" ? <TADashboard/> : <RBACMatrix/>}</SafeAreaView>;
}

const styles = StyleSheet.create({ app:{flex:1,backgroundColor:"#f8fafc"}, tabs:{flexDirection:"row",gap:8,padding:12,backgroundColor:"white"},tab:{padding:10,borderRadius:8},tabActive:{backgroundColor:"#dbeafe"},screen:{padding:16,gap:12},heading:{fontSize:26,fontWeight:"700",color:"#0f172a"},badge:{alignSelf:"flex-start",backgroundColor:"#fee2e2",color:"#b91c1c",padding:6,borderRadius:16,fontWeight:"700"},grid:{flexDirection:"row",flexWrap:"wrap",gap:10},card:{width:"47%",backgroundColor:"white",padding:14,borderRadius:12},cardTitle:{fontSize:12,color:"#64748b"},cardValue:{fontSize:28,fontWeight:"700",marginVertical:8},muted:{color:"#64748b"},section:{marginTop:12,fontWeight:"700",fontSize:17},video:{height:210,borderRadius:12,backgroundColor:"#0f172a",alignItems:"center",justifyContent:"center",padding:18},videoText:{color:"white",textAlign:"center"},toolbar:{flexDirection:"row",justifyContent:"space-around",backgroundColor:"white",padding:14,borderRadius:12},row:{paddingVertical:8,borderBottomWidth:1,borderColor:"#e2e8f0"},strong:{fontWeight:"700"},messageRow:{flexDirection:"row",gap:8},input:{flex:1,backgroundColor:"white",borderWidth:1,borderColor:"#cbd5e1",borderRadius:8,padding:10},primary:{alignSelf:"flex-start",backgroundColor:"#2563eb",padding:11,borderRadius:8},primaryText:{color:"white",fontWeight:"700"},permission:{flexDirection:"row",justifyContent:"space-between",backgroundColor:"white",padding:14,borderRadius:10} });
