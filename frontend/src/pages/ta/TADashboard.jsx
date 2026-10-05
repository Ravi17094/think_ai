import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import apiClient from "../../services/apiClient";
import { logout } from "../../features/auth/authSlice";
import { ATTENDANCE_STATUSES } from "../../constants/attendance";
import useTADashboard from "../../hooks/useTADashboard";

const dashboardPreview = {
  courses: ["Java Fundamentals", "React Essentials", "Python for Data"],
  sessions: [
    { title: "React doubt-clearing", time: "Today, 4:00 PM" },
    { title: "Java live lab", time: "Tomorrow, 10:30 AM" },
  ],
};

function StatCard({ label, value, helper }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{helper}</p>
    </article>
  );
}

export default function TADashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const dashboard = useMemo(() => dashboardPreview, []);
  const today = new Date().toISOString().slice(0, 10);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem("ta-theme") === "dark");
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(today);
  const [attendanceSession, setAttendanceSession] = useState("TA session");
  const [savingEnrollmentId, setSavingEnrollmentId] = useState(null);
  const {
    attendance, setAttendance, attendanceError, isLoadingAttendance,
    report, reportError, isRefreshingReport, reportUpdatedAt,
    loadAttendance, loadReport,
  } = useTADashboard({ initialDate: today, initialSessionTitle: "TA session" });
  const learnerAlerts = attendance.filter((row) => row.status === "ABSENT" || row.status === "TARDY");
  const pendingSupportTasks = (report ? 0 : 1) + learnerAlerts.length;

  useEffect(() => {
    localStorage.setItem("ta-theme", isDarkMode ? "dark" : "light");
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  const saveAttendance = async (row, status) => {
    setSavingEnrollmentId(row.enrollmentId);
    setAttendanceError("");
    try {
      await apiClient.put("/attendance/ta/record", {
        enrollmentId: row.enrollmentId,
        sessionDate: attendanceDate,
        sessionTitle: attendanceSession,
        status,
        notes: row.notes
      });
      setAttendance((current) => current.map((item) => (
        item.enrollmentId === row.enrollmentId ? { ...item, status } : item
      )));
      await loadReport();
    } catch (error) {
      setAttendanceError(error.response?.data?.message || "Could not save attendance.");
    } finally {
      setSavingEnrollmentId(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:block">
          <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-6 dark:border-slate-800">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-sm font-black text-white">tz</span>
            <span className="text-lg font-bold tracking-tight text-slate-800 dark:text-white">Thinkz.ai</span>
          </div>
          <div className="px-4 py-6">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">TA Console</p>
            <nav className="mt-3 space-y-1 text-sm font-medium">
              <Link to="/ta" className="flex items-center gap-3 rounded-lg bg-blue-50 px-3 py-2.5 text-blue-700"><span>▦</span> Dashboard</Link>
              <a href="#attendance" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"><span>✓</span> Attendance</a>
              <a href="#reports" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"><span>▤</span> Progress reports</a>
              <Link to="/forum/studio" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"><span>◉</span> Live Studio</Link>
            </nav>
          </div>
          <div className="absolute bottom-0 w-60 border-t border-slate-100 p-4 text-xs text-slate-400 dark:border-slate-800">Teaching Assistant Workspace</div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 dark:border-slate-800 dark:bg-slate-900 sm:px-8">
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-xs font-black text-white lg:hidden">tz</span>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Teaching Assistant Console</span>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setIsDarkMode((current) => !current)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">{isDarkMode ? "☀ Light" : "◐ Dark"}</button>
              <div className="relative">
                <button
                  type="button"
                  aria-expanded={isAccountMenuOpen}
                  aria-label="Teaching Assistant account menu"
                  onClick={() => setIsAccountMenuOpen((current) => !current)}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 text-left transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">TA</span>
                  <span className="hidden leading-tight sm:block"><span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Teaching Assistant</span><span className="block text-xs text-slate-500 dark:text-slate-400">TA</span></span>
                  <span className="text-xs text-slate-400">⌄</span>
                </button>
                {isAccountMenuOpen && (
                  <div className="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => { dispatch(logout()); navigate("/login"); }}
                      className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
            <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Dashboard</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Teaching Assistant Workspace</h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Monitor learner progress, record attendance, and support live classes.</p>
              </div>
            </div>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard label="Assigned courses" value={dashboard.courses.length} helper="Active teaching assignments" />
              <StatCard label="Upcoming sessions" value={dashboard.sessions.length} helper="Next seven days" />
              <StatCard label="Absent today" value={attendance.filter((row) => row.status === "ABSENT").length} helper="Attendance register" />
              <StatCard label="Auto-graded" value={report?.grading?.graded ?? "—"} helper="Automatic assessment results" />
              <StatCard label="Support tasks" value={pendingSupportTasks} helper="Attendance and report follow-up" />
            </section>

            <section id="attendance" className="mt-7 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-col gap-4 border-b border-slate-100 p-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Attendance register</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Mark learner attendance for a teaching session.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input aria-label="Attendance session title" value={attendanceSession} onChange={(event) => setAttendanceSession(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                  <input aria-label="Attendance date" type="date" value={attendanceDate} onChange={(event) => setAttendanceDate(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                  <button type="button" onClick={() => loadAttendance({ sessionDate: attendanceDate, sessionTitle: attendanceSession })} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Load</button>
                </div>
              </div>
              {attendanceError && <p className="px-5 pt-4 text-sm text-rose-600">{attendanceError}</p>}
              {isLoadingAttendance ? (
                <p className="p-5 text-sm text-slate-500 dark:text-slate-400">Loading attendance...</p>
              ) : attendance.length === 0 ? (
                <p className="p-5 text-sm text-slate-500 dark:text-slate-400">No enrolled learners are available yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400"><tr><th className="px-5 py-3">Learner</th><th className="px-5 py-3">Course</th><th className="px-5 py-3 text-right">Attendance</th></tr></thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {attendance.map((row) => (
                        <tr key={row.enrollmentId}>
                          <td className="px-5 py-4 font-medium text-slate-800 dark:text-slate-100">{row.studentName}</td>
                          <td className="px-5 py-4 text-slate-500 dark:text-slate-400">{row.courseTitle}</td>
                          <td className="px-5 py-4 text-right"><select aria-label={`Attendance status for ${row.studentName}`} value={row.status} onChange={(event) => saveAttendance(row, event.target.value)} disabled={savingEnrollmentId === row.enrollmentId} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white">{ATTENDANCE_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select>{savingEnrollmentId === row.enrollmentId && <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">Saving...</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section id="reports" className="mt-7 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-5 dark:border-slate-800">
                <div><h2 className="text-lg font-semibold text-slate-900 dark:text-white">TA progress report</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Attendance and automatic assessment-result summary.</p></div>
                <button type="button" onClick={loadReport} disabled={isRefreshingReport} className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20">{isRefreshingReport ? "Refreshing..." : "Refresh report"}</button>
              </div>
              {reportError && <p className="px-5 pt-4 text-sm text-rose-600">{reportError}</p>}
              {!reportError && reportUpdatedAt && <p className="px-5 pt-4 text-sm text-slate-500 dark:text-slate-400">Updated at {reportUpdatedAt}</p>}
              {!report ? <p className="p-5 text-sm text-slate-500 dark:text-slate-400">Report will appear after the backend is available.</p> : <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-5"><StatCard label="Present" value={report.attendance.PRESENT} helper={`${report.attendance.total} records marked`} /><StatCard label="Tardy" value={report.attendance.TARDY || 0} helper="Recorded late arrivals" /><StatCard label="Absent" value={report.attendance.ABSENT} helper="Recorded absences" /><StatCard label="Auto-graded" value={report.grading.graded} helper="Completed assessment results" /><StatCard label="Average score" value={report.grading.averagePercentage === null ? "-" : `${report.grading.averagePercentage}%`} helper="Automatic assessment results" /></div>}
            </section>

            <section className="mt-7 grid gap-5 lg:grid-cols-2">
              <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Live class and breakout rooms</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Join the Live Studio to support a class, create and join breakout rooms, and manage the class discussion.</p>
                <Link to="/forum/studio" className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Open Live Studio</Link>
              </article>
              <article className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800"><h2 className="text-lg font-semibold text-slate-900 dark:text-white">Upcoming live sessions</h2></div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">{dashboard.sessions.map((session) => <div key={session.title} className="flex items-center justify-between gap-4 px-5 py-4"><div><p className="font-medium text-slate-800 dark:text-slate-100">{session.title}</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{session.time}</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">Scheduled</span></div>)}</div>
              </article>
            </section>

            <section className="mt-7 grid gap-5 lg:grid-cols-2">
              <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Student alerts</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Learners needing follow-up based on the selected attendance register.</p>
                {learnerAlerts.length === 0 ? <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-300">No attendance alerts for this session.</p> : <ul className="mt-4 space-y-2">{learnerAlerts.map((row) => <li key={row.enrollmentId} className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm dark:bg-amber-500/10"><span className="font-medium text-slate-800 dark:text-slate-100">{row.studentName}</span><span className="font-semibold text-amber-700 dark:text-amber-300">{row.status}</span></li>)}</ul>}
              </article>
              <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">TA support checklist</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">A focused checklist for the next teaching session.</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <li>{report ? "✓ Progress report is current" : "• Refresh the progress report"}</li>
                  <li>{learnerAlerts.length ? `• Follow up with ${learnerAlerts.length} learner${learnerAlerts.length === 1 ? "" : "s"}` : "✓ No attendance follow-up needed"}</li>
                  <li>• Review upcoming session details before class</li>
                </ul>
              </article>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
