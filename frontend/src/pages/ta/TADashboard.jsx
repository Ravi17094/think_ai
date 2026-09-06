import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import apiClient from "../../services/apiClient";
import { logout } from "../../features/auth/authSlice";

const dashboardPreview = {
  courses: ["Java Fundamentals", "React Essentials", "Python for Data"],
  gradingQueue: [
    { learner: "Ananya Sharma", assessment: "React Hooks", due: "Today" },
    { learner: "Rahul Kumar", assessment: "Java Collections", due: "Tomorrow" },
    { learner: "Meera Reddy", assessment: "Python Functions", due: "Tomorrow" },
  ],
  sessions: [
    { title: "React doubt-clearing", time: "Today, 4:00 PM" },
    { title: "Java live lab", time: "Tomorrow, 10:30 AM" },
  ],
};

function StatCard({ label, value, helper }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl dark:border-[#262b38] dark:bg-[#1a1e2b]">
      <p className="text-sm font-medium text-slate-500 dark:text-[#94a3b8]">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-500 dark:text-[#94a3b8]">{helper}</p>
    </article>
  );
}

export default function TADashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const dashboard = useMemo(() => dashboardPreview, []);
  const today = new Date().toISOString().slice(0, 10);
  const [queue, setQueue] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [queueError, setQueueError] = useState("");
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [attendance, setAttendance] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(today);
  const [attendanceSession, setAttendanceSession] = useState("TA session");
  const [attendanceError, setAttendanceError] = useState("");
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true);
  const [savingEnrollmentId, setSavingEnrollmentId] = useState(null);
  const [report, setReport] = useState(null);

  const loadQueue = async () => {
    setIsLoadingQueue(true);
    setQueueError("");
    try {
      const response = await apiClient.get("/assessments/ta/grading-queue");
      setQueue(response.data?.data || []);
    } catch (error) {
      setQueueError(error.response?.data?.message || "Could not load the grading queue.");
    } finally {
      setIsLoadingQueue(false);
    }
  };

  const loadAttendance = async () => {
    setIsLoadingAttendance(true);
    setAttendanceError("");
    try {
      const response = await apiClient.get("/attendance/ta/register", {
        params: { sessionDate: attendanceDate, sessionTitle: attendanceSession }
      });
      setAttendance(response.data?.data || []);
    } catch (error) {
      setAttendanceError(error.response?.data?.message || "Could not load attendance.");
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  const loadReport = async () => {
    try {
      const response = await apiClient.get("/attendance/ta/report");
      setReport(response.data?.data || null);
    } catch {
      setReport(null);
    }
  };

  useEffect(() => {
    loadQueue();
    loadAttendance();
    loadReport();
  }, []);

  const openGradingForm = (submission) => {
    setSelectedSubmission(submission);
    setScore(submission.score ?? "");
    setFeedback(submission.feedback || "");
  };

  const submitGrade = async (event) => {
    event.preventDefault();
    if (!selectedSubmission) return;
    try {
      await apiClient.patch(`/assessments/submissions/${selectedSubmission.id}/grade`, { score, feedback });
      setSelectedSubmission(null);
      setScore("");
      setFeedback("");
      await loadQueue();
    } catch (error) {
      setQueueError(error.response?.data?.message || "Could not save this grade.");
    }
  };

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
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900 transition-colors duration-300 dark:bg-[#151821] dark:text-[#f1f3f9] md:p-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-purple-600 dark:text-purple-400">Teaching Assistant Portal</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">Your teaching workspace</h1>
            <p className="mt-2 text-slate-600 dark:text-[#94a3b8]">Review submissions, support live sessions, and monitor learner progress.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              dispatch(logout());
              navigate("/login");
            }}
            className="w-fit rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-[#3e4658] dark:text-slate-200 dark:hover:bg-[#222736]"
          >
            Switch account
          </button>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Assigned courses" value={dashboard.courses.length} helper="Active teaching assignments" />
          <StatCard label="Awaiting grading" value={isLoadingQueue ? "..." : queue.length} helper="Submitted assessments" />
          <StatCard label="Upcoming sessions" value={dashboard.sessions.length} helper="Next seven days" />
          <StatCard label="Absent today" value={attendance.filter((row) => row.status === "ABSENT").length} helper="Attendance register" />
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-[#262b38] dark:bg-[#1a1e2b]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Attendance register</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-[#94a3b8]">Mark each enrolled learner for a teaching session.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input aria-label="Attendance session title" value={attendanceSession} onChange={(event) => setAttendanceSession(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-[#3e4658] dark:bg-[#222736] dark:text-white" />
              <input aria-label="Attendance date" type="date" value={attendanceDate} onChange={(event) => setAttendanceDate(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-[#3e4658] dark:bg-[#222736] dark:text-white" />
              <button type="button" onClick={loadAttendance} className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-sm font-semibold text-purple-700 dark:text-purple-300">Load</button>
            </div>
          </div>
          {attendanceError && <p className="mt-4 text-sm text-rose-600">{attendanceError}</p>}
          {isLoadingAttendance ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-[#94a3b8]">Loading attendance…</p>
          ) : attendance.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-[#94a3b8]">No enrolled learners are available yet.</p>
          ) : (
            <div className="mt-4 divide-y divide-slate-100 dark:divide-[#262b38]">
              {attendance.map((row) => (
                <div key={row.enrollmentId} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-white">{row.studentName}</p>
                    <p className="text-sm text-slate-500 dark:text-[#94a3b8]">{row.courseTitle}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select aria-label={`Attendance status for ${row.studentName}`} value={row.status} onChange={(event) => saveAttendance(row, event.target.value)} disabled={savingEnrollmentId === row.enrollmentId} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-[#3e4658] dark:bg-[#222736] dark:text-white">
                      <option value="PRESENT">Present</option>
                      <option value="LATE">Late</option>
                      <option value="ABSENT">Absent</option>
                      <option value="EXCUSED">Excused</option>
                    </select>
                    {savingEnrollmentId === row.enrollmentId && <span className="text-xs text-slate-500">Saving…</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-purple-200 bg-purple-50 p-6 shadow-xl dark:border-purple-500/20 dark:bg-[#1a1e2b]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-purple-950 dark:text-white">TA progress report</h2>
              <p className="mt-1 text-sm text-purple-800 dark:text-[#94a3b8]">A live summary of attendance and assessment grading.</p>
            </div>
            <button type="button" onClick={loadReport} className="rounded-xl border border-purple-500/30 bg-white px-3 py-2 text-sm font-semibold text-purple-700 dark:bg-[#222736] dark:text-purple-300">Refresh report</button>
          </div>
          {!report ? (
            <p className="mt-4 text-sm text-purple-800 dark:text-[#94a3b8]">Report will appear after the backend is available.</p>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Present" value={report.attendance.PRESENT} helper={`${report.attendance.total} records marked`} />
              <StatCard label="Absent" value={report.attendance.ABSENT} helper="Recorded absences" />
              <StatCard label="Graded" value={report.grading.graded} helper={`${report.grading.pending} awaiting grading`} />
              <StatCard label="Average score" value={report.grading.averagePercentage === null ? "—" : `${report.grading.averagePercentage}%`} helper="Graded assessments" />
            </div>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-[#262b38] dark:bg-[#1a1e2b]">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Live class and breakout rooms</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-[#94a3b8]">Open the live studio to create breakout rooms, let learners join a room, and manage the live-class discussion.</p>
          <Link to="/forum/studio" className="mt-4 inline-flex rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 font-semibold text-white shadow-lg shadow-purple-500/25 hover:opacity-90">Open Live Studio</Link>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-[#262b38] dark:bg-[#1a1e2b]">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Grading queue</h2>
              <button className="text-sm font-semibold text-purple-600 hover:text-purple-800 dark:text-purple-400">View all</button>
            </div>
            <div className="mt-4 divide-y divide-slate-100 dark:divide-[#262b38]">
              {queueError && <p className="py-4 text-sm text-rose-600">{queueError}</p>}
              {isLoadingQueue && <p className="py-4 text-sm text-slate-500 dark:text-[#94a3b8]">Loading submissions…</p>}
              {!isLoadingQueue && !queueError && queue.length === 0 && (
                <p className="py-4 text-sm text-slate-500 dark:text-[#94a3b8]">No submitted assessments are waiting for grading.</p>
              )}
              {queue.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-white">{item.enrollment.studentName}</p>
                    <p className="text-sm text-slate-500 dark:text-[#94a3b8]">{item.assessment.title}</p>
                  </div>
                  <button onClick={() => openGradingForm(item)} className="rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">Grade</button>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-[#262b38] dark:bg-[#1a1e2b]">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Upcoming live sessions</h2>
            <div className="mt-4 space-y-3">
              {dashboard.sessions.map((session) => (
                <div key={session.title} className="rounded-2xl bg-slate-50 p-4 dark:bg-[#222736]">
                  <p className="font-semibold text-slate-800 dark:text-white">{session.title}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-[#94a3b8]">{session.time}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        {selectedSubmission && (
          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-[#262b38] dark:bg-[#1a1e2b]">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Grade {selectedSubmission.enrollment.studentName}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-[#94a3b8]">{selectedSubmission.assessment.title} · Total marks: {selectedSubmission.assessment.totalMarks}</p>
            <form onSubmit={submitGrade} className="mt-5 max-w-xl space-y-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Score
                <input required min="0" max={selectedSubmission.assessment.totalMarks} step="0.5" type="number" value={score} onChange={(event) => setScore(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-[#3e4658] dark:bg-[#222736] dark:text-white" />
              </label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Feedback
                <textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} rows="4" className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-[#3e4658] dark:bg-[#222736] dark:text-white" placeholder="Explain the score and next steps for the learner." />
              </label>
              <div className="flex gap-3">
                <button type="submit" className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 font-semibold text-white hover:opacity-90">Save grade</button>
                <button type="button" onClick={() => setSelectedSubmission(null)} className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 dark:border-[#3e4658] dark:text-slate-200">Cancel</button>
              </div>
            </form>
          </section>
        )}

      </div>
    </main>
  );
}
