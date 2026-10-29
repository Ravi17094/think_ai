import { useAnalytics } from "@/hooks/useAnalytics";
import { useCallback, useState, type PropsWithChildren } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/common/AppButton";
import { palette } from "@/theme/tokens";
import { exportAnalytics } from "../analyticsExport";
import { DateField } from "../DateField";
import { lmsApi } from "../api";
import { useLms } from "../LmsProvider";
import type { Analytics, AnalyticsBucket, ReportStatus } from "../types";
import { useLmsResource } from "../useLmsResource";
import { LoadState, Message, Screen, styles } from "../ui";

const date = (value: Date) => value.toISOString().slice(0, 10);
const buckets: AnalyticsBucket[] = ["daily", "weekly", "monthly", "quarterly"];
const title = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const isDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  date(new Date(value)) === value;
function Panel({ children }: PropsWithChildren) {
  return <View style={layout.panel}>{children}</View>;
}

function periodLabel(value: string, bucket: AnalyticsBucket) {
  if (bucket === "quarterly") return value.replace("-", " ");
  const parsed = new Date(
    `${value}${bucket === "monthly" ? "-01" : ""}T00:00:00Z`,
  );
  return Number.isFinite(parsed.getTime())
    ? parsed.toLocaleDateString("en-GB", {
        ...(bucket !== "monthly" ? { day: "numeric" as const } : {}),
        month: "short",
        ...(bucket === "monthly" ? { year: "numeric" as const } : {}),
        timeZone: "UTC",
      })
    : value;
}

function EnrollmentChart({
  trend,
  bucket,
}: {
  trend: Analytics["trend"];
  bucket: AnalyticsBucket;
}) {
  const maximum = Math.max(1, ...trend.map((point) => point.count));
  return (
    <Panel>
      <Text style={styles.heading}>Enrollment trend</Text>
      <Text style={styles.muted}>
        New enrollments grouped {bucket}. Reporting dates use UTC.
      </Text>
      {trend.length ? (
        <View style={layout.chart} testID="enrollment-chart">
          <View style={layout.axis} accessible={false}>
            <Text style={layout.caption}>{maximum}</Text>
            <Text style={layout.caption}>0</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            contentContainerStyle={layout.plot}
          >
            {trend.map((point) => (
              <View
                key={point.date}
                style={layout.chartColumn}
                accessible
                accessibilityLabel={`${point.date}: ${point.count} enrollments`}
              >
                <View style={layout.barSpace}>
                  <Text style={layout.barCount}>{point.count}</Text>
                  <View
                    style={[
                      layout.bar,
                      { height: (point.count / maximum) * 148 },
                    ]}
                  />
                </View>
                <Text style={layout.tick}>
                  {periodLabel(point.date, bucket)}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : (
        <Message text="No enrollments in this date range." />
      )}
    </Panel>
  );
}

type SortColumn = "title" | "enrollments" | "completed" | "completion";
const columns: { key: SortColumn; label: string }[] = [
  { key: "title", label: "Course" },
  { key: "enrollments", label: "Enrollments" },
  { key: "completed", label: "Completed" },
  { key: "completion", label: "Completion" },
];
const completion = (course: Analytics["courses"][number]) =>
  course.enrollments ? (course.completed / course.enrollments) * 100 : 0;
function CourseTable({ courses }: { courses: Analytics["courses"] }) {
  const [sort, setSort] = useState<SortColumn>("enrollments");
  const [ascending, setAscending] = useState(false);
  const sorted = [...courses].sort((a, b) => {
    const difference =
      sort === "title"
        ? a.title.localeCompare(b.title)
        : sort === "completion"
          ? completion(a) - completion(b)
          : a[sort] - b[sort];
    return difference * (ascending ? 1 : -1) || a.title.localeCompare(b.title);
  });
  return (
    <Panel>
      <View style={layout.headingRow}>
        <Text style={styles.heading}>Course performance</Text>
        <Text style={layout.badge}>
          {courses.length} {courses.length === 1 ? "course" : "courses"}
        </Text>
      </View>
      <Text style={styles.muted}>
        Select a column heading to change the sort order.
      </Text>
      <ScrollView horizontal contentContainerStyle={layout.tableScroll}>
        <View style={layout.table}>
          <View style={layout.tableHeader}>
            {columns.map((column) => (
              <Pressable
                key={column.key}
                accessibilityRole="button"
                accessibilityLabel={`Sort by ${column.label.toLowerCase()}`}
                accessibilityState={{ selected: sort === column.key }}
                onPress={() => {
                  if (sort === column.key) setAscending((value) => !value);
                  else {
                    setSort(column.key);
                    setAscending(column.key === "title");
                  }
                }}
                style={[
                  layout.cell,
                  column.key === "title"
                    ? layout.courseCell
                    : layout.numberCell,
                ]}
              >
                <Text style={layout.columnHeading}>
                  {column.label}
                  {sort === column.key ? (ascending ? " ↑" : " ↓") : ""}
                </Text>
              </Pressable>
            ))}
          </View>
          {sorted.map((course) => (
            <View
              key={course.id}
              style={layout.tableRow}
              testID={`course-row-${course.id}`}
            >
              <View style={[layout.cell, layout.courseCell]}>
                <Text style={styles.text}>{course.title}</Text>
              </View>
              <View style={[layout.cell, layout.numberCell]}>
                <Text style={styles.text}>{course.enrollments}</Text>
              </View>
              <View style={[layout.cell, layout.numberCell]}>
                <Text style={styles.text}>{course.completed}</Text>
              </View>
              <View style={[layout.cell, layout.numberCell]}>
                <Text style={layout.completion}>
                  {completion(course).toFixed(1)}%
                </Text>
              </View>
            </View>
          ))}
          {!sorted.length ? (
            <View style={layout.emptyTable}>
              <Message text="No course enrollments in this date range." />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </Panel>
  );
}

function DeliveryStatus({ data }: { data: ReportStatus }) {
  const latest = data.recent[0];
  const label = !data.enabled
    ? "Scheduled reports are off"
    : !data.configured
      ? "Report setup required"
      : "Scheduled reports are enabled";
  const state =
    !data.enabled || !data.configured ? layout.warning : layout.success;
  const lastStatus: Record<string, string> = {
    SENT: "Accepted by email provider",
    PENDING: "Pending",
    SENDING: "Sending",
    PREPARING: "Preparing report",
    DISPATCHING: "Sending to email provider",
    UNKNOWN: "Needs delivery reconciliation before any resend",
    FAILED: "Failed — delivery needs attention",
  };
  return (
    <>
      <Text style={[layout.status, state]}>{label}</Text>
      <Text style={styles.text}>
        {data.recipientCount} approved{" "}
        {data.recipientCount === 1 ? "recipient" : "recipients"}
      </Text>
      <Text style={styles.muted}>
        {title(data.cadence)} · {String(data.utcHour).padStart(2, "0")}:00 UTC
      </Text>
      {!data.enabled || !data.configured ? (
        <Message text="Ask the deployment administrator to configure the approved recipients, schedule and verified email sender." />
      ) : null}
      {latest ? (
        <Text style={styles.muted}>
          Latest delivery: {lastStatus[latest.status] || latest.status}
        </Text>
      ) : (
        <Text style={styles.muted}>No scheduled report has been sent yet.</Text>
      )}
      {latest?.sentAt ? (
        <Text style={layout.caption}>
          Provider accepted at {new Date(latest.sentAt).toLocaleString()}
        </Text>
      ) : null}
    </>
  );
}

export function AnalyticsScreen() {
  const { session } = useLms();
  const [from, setFrom] = useState(date(new Date(Date.now() - 29 * 86400000)));
  const [to, setTo] = useState(date(new Date()));
  const [range, setRange] = useState({ from, to });
  const [bucket, setBucket] = useState<AnalyticsBucket>("daily");
  const [dateError, setDateError] = useState("");
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);
  const [exportMessage, setExportMessage] = useState("");
  const [exportError, setExportError] = useState("");
  const deliveryFetcher = useCallback(
    () => lmsApi.reportStatus(),
    [session.token],
  );
  const resource = useAnalytics(range.from, range.to, bucket);
  const delivery = useLmsResource(deliveryFetcher);
  const data = resource.data;
  function apply() {
    if (!isDate(from) || !isDate(to) || from > to) {
      setDateError(
        "Choose valid YYYY-MM-DD dates with the start on or before the end.",
      );
      return;
    }
    setDateError("");
    setExportError("");
    setExportMessage("");
    setRange({ from, to });
  }
  async function download(format: "csv" | "pdf") {
    if (!data || exporting) return;
    setExporting(format);
    setExportError("");
    setExportMessage("");
    try {
      await exportAnalytics(format, range, bucket);
      setExportMessage(
        `${format.toUpperCase()} report is ready to save or share.`,
      );
    } catch (error) {
      setExportError(
        error instanceof Error
          ? error.message
          : "Report export failed. Please retry.",
      );
    } finally {
      setExporting(null);
    }
  }
  const metrics = data
    ? [
        {
          label: "Enrollments",
          value: String(data.kpis.enrollmentCount),
          detail: "Enrolled during this period",
          color: palette.info,
        },
        {
          label: "Completion rate",
          value: `${data.kpis.completionRate.toFixed(1)}%`,
          detail: "Eligible completions in this cohort",
          color: palette.success,
        },
        {
          label: "Average score",
          value: `${data.kpis.averageScore.toFixed(1)}%`,
          detail: "Graded attempts, including retakes",
          color: palette.accent,
        },
        {
          label: "Active users",
          value: String(data.kpis.activeUsers),
          detail: "Learners with progress in this period",
          color: palette.warning,
        },
      ]
    : [];
  return (
    <Screen title="Admin analytics">
      <View style={layout.headingRow}>
        <View style={layout.intro}>
          <Text style={styles.muted}>
            Track learning outcomes, course activity and report delivery.
          </Text>
          <Text style={layout.badge}>
            {range.from} to {range.to} · UTC
          </Text>
        </View>
        <AppButton
          title="Refresh reports"
          variant="secondary"
          disabled={resource.loading || delivery.loading || exporting !== null}
          onPress={() => {
            void resource.refresh();
            void delivery.refresh();
          }}
        />
      </View>
      <Panel>
        <Text style={styles.heading}>Report period</Text>
        <View style={layout.filters}>
          <View style={layout.date}>
            <DateField
              label="Start date (YYYY-MM-DD)"
              value={from}
              onChange={setFrom}
            />
          </View>
          <View style={layout.date}>
            <DateField
              label="End date (YYYY-MM-DD)"
              value={to}
              onChange={setTo}
            />
          </View>
          <AppButton
            title="Apply date range"
            disabled={exporting !== null}
            onPress={apply}
          />
        </View>
        {dateError ? <Message error text={dateError} /> : null}
        <View style={layout.segments}>
          {buckets.map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityLabel={`${title(value)} grouping`}
              accessibilityState={{
                selected: value === bucket,
                disabled: exporting !== null,
              }}
              disabled={exporting !== null}
              onPress={() => {
                setBucket(value);
                setExportError("");
                setExportMessage("");
              }}
              style={[
                layout.segment,
                value === bucket && layout.segmentSelected,
              ]}
            >
              <Text
                style={[
                  layout.segmentText,
                  value === bucket && layout.segmentTextSelected,
                ]}
              >
                {title(value)}
              </Text>
            </Pressable>
          ))}
        </View>
      </Panel>
      <LoadState {...resource} retry={resource.refresh} />
      {data ? (
        <>
          <View style={layout.metrics}>
            {metrics.map((metric) => (
              <View
                key={metric.label}
                style={[layout.metric, { borderTopColor: metric.color }]}
              >
                <Text style={layout.metricLabel}>{metric.label}</Text>
                <Text style={layout.metricValue}>{metric.value}</Text>
                <Text style={layout.caption}>{metric.detail}</Text>
              </View>
            ))}
          </View>
          <EnrollmentChart trend={data.trend} bucket={bucket} />
          <CourseTable courses={data.courses} />
          <View style={layout.supporting}>
            <View style={layout.supportingPanel}>
              <Panel>
                <Text style={styles.heading}>Attendance</Text>
                <Text style={layout.metricValue}>
                  {data.kpis.attendancePercentage == null
                    ? "Unavailable"
                    : `${data.kpis.attendancePercentage.toFixed(1)}%`}
                </Text>
                {data.kpis.attendancePercentage == null ? (
                  <Message
                    text={
                      data.attendance?.status === "available"
                        ? "No eligible attendance records in this period."
                        : "Attendance data has not been connected to this report."
                    }
                  />
                ) : (
                  <>
                    {data.attendance?.eligible != null ? (
                      <Text style={styles.text}>
                        {data.attendance.attended} of {data.attendance.eligible}{" "}
                        eligible records attended
                      </Text>
                    ) : null}
                    <Text style={styles.muted}>
                      Present and late count as attended. Excused entries are
                      excluded.
                    </Text>
                  </>
                )}
              </Panel>
            </View>
            <View style={layout.supportingPanel}>
              <Panel>
                <Text style={styles.heading}>Export this report</Text>
                <Text style={styles.muted}>
                  Download all KPIs, course rows and enrollment trends for the
                  applied dates.
                </Text>
                <View style={styles.row}>
                  {(["csv", "pdf"] as const).map((format) => (
                    <AppButton
                      key={format}
                      title={`Export ${format.toUpperCase()}`}
                      variant="secondary"
                      loading={exporting === format}
                      disabled={exporting !== null}
                      onPress={() => void download(format)}
                    />
                  ))}
                </View>
                {exportError ? <Message error text={exportError} /> : null}
                {exportMessage ? <Message text={exportMessage} /> : null}
              </Panel>
            </View>
          </View>
        </>
      ) : null}
      <Panel>
        <Text style={styles.heading}>Scheduled report delivery</Text>
        {delivery.loading ? (
          <Message text="Checking report delivery status…" />
        ) : delivery.error ? (
          <>
            <Message error text="Report delivery status could not be loaded." />
            <AppButton
              title="Retry delivery status"
              variant="secondary"
              onPress={() => void delivery.refresh()}
            />
          </>
        ) : delivery.data ? (
          <DeliveryStatus data={delivery.data} />
        ) : null}
      </Panel>
    </Screen>
  );
}

const layout = StyleSheet.create({
  panel: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 14,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 14,
  },
  intro: { flexGrow: 1, flexBasis: 280, gap: 10 },
  badge: { color: palette.textSecondary, fontSize: 12, fontWeight: "500" },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: 12,
  },
  date: { flexGrow: 1, flexBasis: 230 },
  segments: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingTop: 4 },
  segment: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceMuted,
  },
  segmentSelected: {
    borderColor: palette.brand,
    backgroundColor: palette.brand,
  },
  segmentText: {
    color: palette.textSecondary,
    fontWeight: "600",
    fontSize: 13,
  },
  segmentTextSelected: { color: "#FFFFFF" },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  metric: {
    flexGrow: 1,
    flexBasis: 200,
    backgroundColor: palette.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    borderTopWidth: 3,
    padding: 20,
    gap: 9,
  },
  metricLabel: {
    color: palette.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  metricValue: { color: palette.textPrimary, fontSize: 30, fontWeight: "700" },
  caption: { color: palette.textSecondary, fontSize: 12, lineHeight: 18 },
  chart: { flexDirection: "row", height: 220, gap: 12 },
  axis: {
    width: 28,
    paddingTop: 24,
    paddingBottom: 33,
    justifyContent: "space-between",
  },
  plot: {
    flexGrow: 1,
    gap: 16,
    paddingHorizontal: 8,
    alignItems: "flex-end",
    borderBottomWidth: 1,
    borderColor: palette.border,
  },
  chartColumn: { width: 70, alignItems: "center", gap: 10 },
  barSpace: {
    height: 180,
    width: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 6,
  },
  bar: {
    width: 36,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    backgroundColor: palette.accent,
  },
  barCount: { color: palette.textPrimary, fontSize: 12, fontWeight: "600" },
  tick: { color: palette.textSecondary, fontSize: 11, height: 24 },
  tableScroll: { flexGrow: 1 },
  table: { minWidth: 640, flexGrow: 1 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: palette.surfaceMuted,
    borderRadius: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: palette.border,
    alignItems: "center",
  },
  cell: {
    paddingVertical: 15,
    paddingHorizontal: 12,
    justifyContent: "center",
    minHeight: 48,
  },
  courseCell: { flexGrow: 1, flexBasis: 250 },
  numberCell: { width: 120, alignItems: "flex-end" },
  columnHeading: {
    color: palette.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  completion: { color: palette.success, fontSize: 14, fontWeight: "600" },
  emptyTable: { paddingVertical: 24 },
  supporting: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: 14,
  },
  supportingPanel: { flexGrow: 1, flexBasis: 320 },
  status: { fontSize: 15, fontWeight: "600" },
  warning: { color: palette.warning },
  success: { color: palette.success },
});
