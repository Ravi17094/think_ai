import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { AnalyticsScreen } from "@/lms/screens/AnalyticsScreen";
import { lmsApi } from "@/lms/api";
import { exportAnalytics } from "@/lms/analyticsExport";

jest.mock("@/lms/api", () => ({
  lmsApi: { analytics: jest.fn(), reportStatus: jest.fn() },
}));
jest.mock("@/lms/LmsProvider", () => ({
  useLms: () => ({
    session: { token: "test-only" },
    ready: true,
    online: true,
    syncStatus: "Up to date",
    syncing: false,
    pending: 0,
  }),
}));
jest.mock("@/lms/analyticsExport", () => ({ exportAnalytics: jest.fn() }));
jest.mock("@/lms/DateField", () => ({
  DateField: ({ label, value, onChange }: any) => {
    const Input = require("react-native").TextInput;
    return (
      <Input accessibilityLabel={label} value={value} onChangeText={onChange} />
    );
  },
}));

const sample = {
  kpis: {
    enrollmentCount: 6,
    completionRate: 66.67,
    averageScore: 61.67,
    activeUsers: 6,
    attendancePercentage: null,
  },
  trend: [{ date: "2026-10-23", count: 6 }],
  courses: [
    { id: 1, title: "Zulu course", enrollments: 4, completed: 2 },
    { id: 2, title: "Alpha course", enrollments: 2, completed: 2 },
  ],
};
const reports = {
  enabled: false,
  configured: false,
  cadence: "weekly",
  utcHour: 9,
  recipientCount: 0,
  recent: [],
};
beforeEach(() => {
  jest.clearAllMocks();
  (lmsApi.analytics as jest.Mock).mockResolvedValue(sample);
  (lmsApi.reportStatus as jest.Mock).mockResolvedValue(reports);
  (exportAnalytics as jest.Mock).mockResolvedValue(undefined);
});

test("renders the four KPIs, enrollment chart and honest missing-data/report states", async () => {
  const view = render(<AnalyticsScreen />);
  await waitFor(() => expect(view.getByText("Unavailable")).toBeTruthy());
  for (const label of [
    "Enrollments",
    "Completion rate",
    "Average score",
    "Active users",
  ])
    expect(view.getByText(label)).toBeTruthy();
  expect(view.getByText("66.7%")).toBeTruthy();
  expect(view.getByText("61.7%")).toBeTruthy();
  expect(view.getByLabelText("2026-10-23: 6 enrollments")).toBeTruthy();
  expect(view.getByText("Scheduled reports are off")).toBeTruthy();
  expect(view.queryByText("Unavailable%")).toBeNull();
});

test("applies the date range, changes quarterly grouping and exports that exact report", async () => {
  const view = render(<AnalyticsScreen />);
  await waitFor(() => expect(view.getByText("Export PDF")).toBeTruthy());
  fireEvent.changeText(
    view.getByLabelText("Start date (YYYY-MM-DD)"),
    "2026-04-01",
  );
  fireEvent.changeText(
    view.getByLabelText("End date (YYYY-MM-DD)"),
    "2026-09-30",
  );
  fireEvent.press(view.getByText("Apply date range"));
  fireEvent.press(view.getByLabelText("Quarterly grouping"));
  await waitFor(() =>
    expect(lmsApi.analytics).toHaveBeenLastCalledWith(
      "2026-04-01",
      "2026-09-30",
      "quarterly",
    ),
  );
  await waitFor(() => expect(view.getByText("Export PDF")).toBeTruthy());
  fireEvent.press(view.getByText("Export PDF"));
  await waitFor(() =>
    expect(exportAnalytics).toHaveBeenCalledWith(
      "pdf",
      { from: "2026-04-01", to: "2026-09-30" },
      "quarterly",
    ),
  );
  await waitFor(() =>
    expect(
      view.getByText("PDF report is ready to save or share."),
    ).toBeTruthy(),
  );
});

test("rejects calendar rollover dates and reversed ranges before requesting data", async () => {
  const view = render(<AnalyticsScreen />);
  await waitFor(() => expect(view.getByText("Export CSV")).toBeTruthy());
  fireEvent.changeText(
    view.getByLabelText("Start date (YYYY-MM-DD)"),
    "2026-02-31",
  );
  fireEvent.press(view.getByText("Apply date range"));
  expect(
    view.getByText(
      "Choose valid YYYY-MM-DD dates with the start on or before the end.",
    ),
  ).toBeTruthy();
  expect(lmsApi.analytics).toHaveBeenCalledTimes(1);
  fireEvent.changeText(
    view.getByLabelText("Start date (YYYY-MM-DD)"),
    "2026-10-20",
  );
  fireEvent.changeText(
    view.getByLabelText("End date (YYYY-MM-DD)"),
    "2026-01-01",
  );
  fireEvent.press(view.getByText("Apply date range"));
  expect(lmsApi.analytics).toHaveBeenCalledTimes(1);
});

test("sorts actual course table rows by title, enrollments and completion percentage", async () => {
  const view = render(<AnalyticsScreen />);
  await waitFor(() => expect(view.getByText("Zulu course")).toBeTruthy());
  const rows = () =>
    view.getAllByTestId(/^course-row-/).map((row) => row.props.testID);
  expect(rows()).toEqual(["course-row-1", "course-row-2"]);
  fireEvent.press(view.getByLabelText("Sort by course"));
  expect(rows()).toEqual(["course-row-2", "course-row-1"]);
  fireEvent.press(view.getByLabelText("Sort by course"));
  expect(rows()).toEqual(["course-row-1", "course-row-2"]);
  fireEvent.press(view.getByLabelText("Sort by completion"));
  expect(rows()).toEqual(["course-row-2", "course-row-1"]);
  fireEvent.press(view.getByLabelText("Sort by enrollments"));
  expect(rows()).toEqual(["course-row-1", "course-row-2"]);
});

test("shows an export failure next to the export controls and allows retry", async () => {
  (exportAnalytics as jest.Mock).mockRejectedValueOnce(
    new Error("Administrator access required."),
  );
  const view = render(<AnalyticsScreen />);
  await waitFor(() => expect(view.getByText("Export CSV")).toBeTruthy());
  fireEvent.press(view.getByText("Export CSV"));
  await waitFor(() =>
    expect(view.getByText("Administrator access required.")).toBeTruthy(),
  );
  fireEvent.press(view.getByText("Export CSV"));
  await waitFor(() =>
    expect(
      view.getByText("CSV report is ready to save or share."),
    ).toBeTruthy(),
  );
  expect(exportAnalytics).toHaveBeenCalledTimes(2);
});

test("hides old charts and export controls until the new filter response arrives", async () => {
  const view = render(<AnalyticsScreen />);
  await waitFor(() => expect(view.getByText("Export CSV")).toBeTruthy());
  let finish!: (value: typeof sample) => void;
  (lmsApi.analytics as jest.Mock).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  fireEvent.press(view.getByLabelText("Monthly grouping"));
  expect(view.queryByText("Export CSV")).toBeNull();
  expect(view.queryByText("Zulu course")).toBeNull();
  await act(async () =>
    finish({
      ...sample,
      courses: [
        { id: 3, title: "New filtered course", enrollments: 1, completed: 0 },
      ],
    }),
  );
  expect(view.getByText("New filtered course")).toBeTruthy();
  expect(view.getByText("Export CSV")).toBeTruthy();
});

test("report-status failure has an independent retry and does not hide analytics", async () => {
  (lmsApi.reportStatus as jest.Mock).mockRejectedValueOnce(
    new Error("Unavailable"),
  );
  const view = render(<AnalyticsScreen />);
  await waitFor(() =>
    expect(
      view.getByText("Report delivery status could not be loaded."),
    ).toBeTruthy(),
  );
  expect(view.getByText("Zulu course")).toBeTruthy();
  fireEvent.press(view.getByText("Retry delivery status"));
  await waitFor(() =>
    expect(view.getByText("Scheduled reports are off")).toBeTruthy(),
  );
  expect(lmsApi.analytics).toHaveBeenCalledTimes(1);
  expect(lmsApi.reportStatus).toHaveBeenCalledTimes(2);
});

test("empty periods show explicit chart, table and attendance empty states", async () => {
  (lmsApi.analytics as jest.Mock).mockResolvedValue({
    ...sample,
    trend: [],
    courses: [],
    attendance: { status: "available", eligible: 0, attended: 0 },
  });
  const view = render(<AnalyticsScreen />);
  await waitFor(() =>
    expect(view.getByText("No enrollments in this date range.")).toBeTruthy(),
  );
  expect(
    view.getByText("No course enrollments in this date range."),
  ).toBeTruthy();
  expect(
    view.getByText("No eligible attendance records in this period."),
  ).toBeTruthy();
});

test("scheduled report status distinguishes provider acceptance from inbox delivery", async () => {
  (lmsApi.reportStatus as jest.Mock).mockResolvedValue({
    ...reports,
    enabled: true,
    configured: true,
    recipientCount: 2,
    recent: [{ id: 1, status: "SENT", sentAt: "2026-10-23T09:00:00Z" }],
  });
  const view = render(<AnalyticsScreen />);
  await waitFor(() =>
    expect(view.getByText("Scheduled reports are enabled")).toBeTruthy(),
  );
  expect(
    view.getByText("Latest delivery: Accepted by email provider"),
  ).toBeTruthy();
  expect(view.getByText("2 approved recipients")).toBeTruthy();
});
