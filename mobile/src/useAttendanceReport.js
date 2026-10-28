import { useCallback, useEffect, useMemo, useState } from "react";
import { getAttendanceRegister, getLiveSession } from "./api";

export const ATTENDANCE_FILTERS = ["ALL", "PRESENT", "ABSENT", "TARDY", "EXCUSED"];

function formatTime(value) {
  return value ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return "-";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

export function attendanceRowsToCsv(rows) {
  const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  return [
    "Student name,Email,Status,Join time,Last seen,Observed duration",
    ...rows.map((row) => [row.studentName, row.studentEmail, row.status, row.joinTime || "", row.lastSeen || "", row.duration || ""].map(escape).join(",")),
  ].join("\n");
}

export default function useAttendanceReport({ token, sessionDate, sessionTitle, sessionId = "s1" }) {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [registerResponse, liveResponse] = await Promise.all([
        getAttendanceRegister(token, sessionDate, sessionTitle),
        getLiveSession(token, sessionId).catch(() => null),
      ]);
      const attendees = liveResponse?.data?.attendees || [];
      const byId = new Map(attendees.map((attendee) => [String(attendee.userId), attendee]));
      const byName = new Map(attendees.map((attendee) => [String(attendee.name || "").trim().toLowerCase(), attendee]));
      setRows((registerResponse.data || []).map((record) => {
        const live = byId.get(String(record.studentEmail)) || byId.get(String(record.enrollmentId)) || byName.get(String(record.studentName || "").trim().toLowerCase());
        return { ...record, joinTime: live ? formatTime(live.joinedAt) : "-", lastSeen: live ? formatTime(live.lastSeenAt) : "-", duration: live ? formatDuration(live.durationSeconds) : "-" };
      }));
    } catch (requestError) { setError(requestError.message || "Could not load attendance report."); }
    finally { setLoading(false); }
  }, [token, sessionDate, sessionTitle, sessionId]);

  useEffect(() => { load(); }, [load]);

  const filteredRows = useMemo(() => filter === "ALL" ? rows : rows.filter((row) => row.status === filter), [rows, filter]);
  const summary = useMemo(() => {
    const total = rows.length;
    const PRESENT = rows.filter((row) => row.status === "PRESENT").length;
    const ABSENT = rows.filter((row) => row.status === "ABSENT").length;
    const TARDY = rows.filter((row) => row.status === "TARDY").length;
    const EXCUSED = rows.filter((row) => row.status === "EXCUSED").length;
    // Tardy learners attended the session, so they are included in the attendance rate.
    const attendancePercentage = total ? Math.round(((PRESENT + TARDY) / total) * 100) : 0;
    return { total, PRESENT, ABSENT, TARDY, EXCUSED, attendancePercentage };
  }, [rows]);

  return { rows, filteredRows, summary, filter, setFilter, loading, error, load };
}
