import { useCallback, useEffect, useState } from "react";
import apiClient from "../services/apiClient";

/**
 * Loads the TA's independent dashboard data concurrently. Attendance and the
 * report can fail independently so a temporary report error never hides an
 * otherwise usable attendance register.
 */
export default function useTADashboard({ initialDate, initialSessionTitle }) {
  const [attendance, setAttendance] = useState([]);
  const [attendanceError, setAttendanceError] = useState("");
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true);
  const [report, setReport] = useState(null);
  const [reportError, setReportError] = useState("");
  const [isRefreshingReport, setIsRefreshingReport] = useState(false);
  const [reportUpdatedAt, setReportUpdatedAt] = useState("");

  const loadAttendance = useCallback(async ({ sessionDate, sessionTitle }) => {
    setIsLoadingAttendance(true);
    setAttendanceError("");
    try {
      const response = await apiClient.get("/attendance/ta/register", { params: { sessionDate, sessionTitle } });
      setAttendance(response.data?.data || []);
    } catch (error) {
      setAttendanceError(error.response?.data?.message || "Could not load attendance.");
    } finally {
      setIsLoadingAttendance(false);
    }
  }, []);

  const loadReport = useCallback(async () => {
    setIsRefreshingReport(true);
    setReportError("");
    try {
      const response = await apiClient.get("/attendance/ta/report");
      setReport(response.data?.data || null);
      setReportUpdatedAt(new Date().toLocaleTimeString());
    } catch (error) {
      setReportError(error.response?.data?.message || "Could not refresh the TA progress report.");
    } finally {
      setIsRefreshingReport(false);
    }
  }, []);

  const refreshDashboard = useCallback((filters) => Promise.all([
    loadAttendance(filters),
    loadReport(),
  ]), [loadAttendance, loadReport]);

  useEffect(() => {
    refreshDashboard({ sessionDate: initialDate, sessionTitle: initialSessionTitle });
  }, [initialDate, initialSessionTitle, refreshDashboard]);

  return {
    attendance, setAttendance, attendanceError, isLoadingAttendance,
    report, reportError, isRefreshingReport, reportUpdatedAt,
    loadAttendance, loadReport, refreshDashboard,
  };
}
