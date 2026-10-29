import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { API_BASE_URL } from "@/api/http";
import { getSession, restoreSession } from "@/api/session";

export async function exportAnalytics(
  format: "csv" | "pdf",
  range: { from: string; to: string },
  bucket: string,
) {
  await restoreSession();
  const token = getSession().token;
  if (!token) throw new Error("Sign in to export analytics.");
  const query = `from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}&bucket=${encodeURIComponent(bucket)}&format=${format}`;
  const url = `${API_BASE_URL.replace(/\/$/, "")}/lms/analytics/export?${query}`;
  const headers = { Authorization: `Bearer ${token}` };
  if (Platform.OS === "web") {
    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok)
      throw new Error(
        "Report export failed. Check your Admin access and retry.",
      );
    const target = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = target;
    link.download = `learning-analytics.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(target), 60000);
    return;
  }
  if (!FileSystem.cacheDirectory)
    throw new Error("Device file storage is unavailable.");
  const target = `${FileSystem.cacheDirectory}learning-analytics-${Date.now()}.${format}`;
  const result = await FileSystem.downloadAsync(url, target, { headers });
  if (result.status !== 200) {
    await FileSystem.deleteAsync(target, { idempotent: true });
    throw new Error("Report export failed. Check your Admin access and retry.");
  }
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("File sharing is unavailable on this device.");
  await Sharing.shareAsync(target, {
    mimeType: format === "csv" ? "text/csv" : "application/pdf",
    dialogTitle: "Save analytics report",
  });
}
