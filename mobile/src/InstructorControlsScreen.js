import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { getSessionChecklist, isApiConfigured, saveSessionChecklist } from "./api";
import { COLORS } from "./theme";

const SESSION_ID = "mobile-demo-session";
const STORAGE_KEY = "thinkz-session-prep-checklist";
const checks = ["Test microphone", "Upload slide deck", "Configure breakout rooms", "Set poll questions", "Verify recording enabled"];

export default function InstructorControlsScreen({ account }) {
  const [completed, setCompleted] = useState([]);
  const [controls, setControls] = useState({ muted: false, chatDisabled: false, spotlight: false, recording: false });
  const [notice, setNotice] = useState("Loading saved preparation checklist...");
  const [saveState, setSaveState] = useState("loading");
  const loaded = useRef(false);

  useEffect(() => {
    const load = async () => {
      let local = [];
      try { local = JSON.parse(await SecureStore.getItemAsync(STORAGE_KEY) || "[]"); } catch (_) { local = []; }
      setCompleted(Array.isArray(local) ? local.filter((item) => checks.includes(item)) : []);
      if (!isApiConfigured() || !account?.token) { setSaveState("saved-local"); setNotice("Checklist is stored on this phone until the session API is configured."); loaded.current = true; return; }
      try {
        const response = await getSessionChecklist(account.token, SESSION_ID);
        const saved = response.data?.checklist || response.checklist || local;
        setCompleted(Array.isArray(saved) ? saved.filter((item) => checks.includes(item)) : local);
        setSaveState("saved-server"); setNotice("Saved preparation checklist loaded.");
      } catch (_) {
        setSaveState("saved-local"); setNotice("Saved on this phone. Your session preparation checklist is ready to use.");
      } finally { loaded.current = true; }
    };
    load();
  }, [account?.token]);

  useEffect(() => {
    if (!loaded.current) return undefined;
    setSaveState("saving");
    const timer = setTimeout(async () => {
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(completed));
      if (!isApiConfigured() || !account?.token) { setSaveState("saved-local"); return; }
      try { await saveSessionChecklist(account.token, SESSION_ID, completed); setSaveState("saved-server"); }
      catch (_) { setSaveState("saved-local"); setNotice("Changes saved on this phone and will sync when the session API is available."); }
    }, 1000);
    return () => clearTimeout(timer);
  }, [completed, account?.token]);

  // A temporary network/API outage must not make the instructor repeat work.
  // Local storage remains the source of safety while this quietly retries sync.
  useEffect(() => {
    if (saveState !== "saved-local" || !isApiConfigured() || !account?.token) return undefined;
    const retry = setInterval(async () => {
      try {
        await saveSessionChecklist(account.token, SESSION_ID, completed);
        setSaveState("saved-server");
        setNotice("Checklist synced to the session service.");
      } catch (_) { /* Keep the local copy and retry later. */ }
    }, 15000);
    return () => clearInterval(retry);
  }, [saveState, completed, account?.token]);

  const toggleCheck = (item) => setCompleted((current) => current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item]);
  const toggleControl = (key, label) => { setControls((current) => ({ ...current, [key]: !current[key] })); setNotice(`${label} updated in the mobile control panel.`); };
  const saveLabel = saveState === "saving" ? "Saving checklist..." : saveState === "saved-server" ? "Checklist saved" : saveState === "saved-local" ? "Saved on this phone" : "Loading checklist...";
  return <ScrollView contentContainerStyle={styles.screen}><Text style={styles.heading}>Instructor controls</Text><Text style={styles.muted}>{notice}</Text><Text style={styles.section}>Session preparation</Text><Text style={styles.saveState}>{saveLabel}</Text>{checks.map((item) => <Pressable key={item} onPress={() => toggleCheck(item)} style={styles.row}><Text style={completed.includes(item) ? styles.done : styles.label}>{completed.includes(item) ? "✓ " : "○ "}{item}</Text></Pressable>)}<Text style={styles.muted}>{completed.length} of {checks.length} checks complete</Text><Text style={styles.section}>Live controls</Text><View style={styles.grid}><Control label={controls.muted ? "Unmute all" : "Mute all"} onPress={() => toggleControl("muted", "Mute all")}/><Control label={controls.chatDisabled ? "Enable chat" : "Disable chat"} onPress={() => toggleControl("chatDisabled", "Chat")}/><Control label={controls.spotlight ? "Remove spotlight" : "Spotlight speaker"} onPress={() => toggleControl("spotlight", "Spotlight")}/><Control label={controls.recording ? "Stop recording" : "Start recording"} onPress={() => toggleControl("recording", "Recording")}/></View><Text style={styles.section}>Post-session summary</Text><View style={styles.card}><Text>Attendance: view the attendance report</Text><Text>Chat transcript: manage from Live Studio</Text><Text>Poll results: view in Live Studio</Text><Text>Recording: {controls.recording ? "recording in progress" : "not started"}</Text></View></ScrollView>;
}

function Control({ label, onPress }) { return <Pressable onPress={onPress} style={styles.control}><Text style={styles.controlText}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({ screen:{padding:16,gap:12,backgroundColor:COLORS.background},heading:{fontSize:26,fontWeight:"700",color:COLORS.text},muted:{color:COLORS.muted},saveState:{color:COLORS.primary,fontWeight:"700"},section:{fontSize:18,fontWeight:"700",marginTop:8,color:COLORS.text},row:{backgroundColor:COLORS.surface,padding:14,borderRadius:10},label:{fontWeight:"600",color:COLORS.text},done:{fontWeight:"600",textDecorationLine:"line-through",color:COLORS.muted},grid:{flexDirection:"row",flexWrap:"wrap",gap:10},control:{width:"47%",backgroundColor:COLORS.primarySurface,padding:13,borderRadius:10},controlText:{fontWeight:"700",color:COLORS.primaryDark},card:{backgroundColor:COLORS.surface,borderRadius:10,padding:14,gap:8} });
