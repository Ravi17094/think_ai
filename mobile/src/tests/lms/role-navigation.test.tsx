import { useEffect } from "react";
import { Text } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import { AccessGate } from "@/lms/AccessGate";
import { AdminHomeScreen } from "@/lms/screens/AdminHomeScreen";
import { LmsHomeScreen } from "@/lms/screens/HomeScreen";
import { linkingForRole } from "@/navigation/linking";

let mockContext: any;
jest.mock("@/lms/LmsProvider", () => ({ useLms: () => mockContext }));
jest.mock("@/api/session", () => ({ signOut: jest.fn() }));
jest.mock("@/lms/api", () => ({ lmsApi: {}, login: jest.fn() }));
jest.mock("@/lms/useLmsResource", () => ({
  useLmsResource: () => ({
    data: [],
    refresh: jest.fn(),
    loading: false,
    error: null,
  }),
}));
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useIsFocused: () => true,
}));

beforeEach(() => {
  mockContext = {
    session: { token: "test-only", userId: "4" },
    ready: true,
    account: {
      id: 4,
      name: "Patan",
      email: "learner@example.test",
      role: "Learner",
    },
    accessStatus: "ready",
    accessError: null,
    refreshAccess: jest.fn(),
    online: true,
    syncStatus: "Up to date",
    sync: jest.fn(),
  };
});

test("a learner cannot mount an admin page or start its requests", () => {
  const request = jest.fn();
  function Report() {
    useEffect(request, []);
    return <Text>Private report</Text>;
  }
  const home = jest.fn();
  const view = render(
    <AccessGate audience="admin" onHome={home}>
      <Report />
    </AccessGate>,
  );
  expect(request).not.toHaveBeenCalled();
  expect(view.queryByText("Private report")).toBeNull();
  fireEvent.press(view.getByText("Go to my workspace"));
  expect(home).toHaveBeenCalledTimes(1);
});

test("verified admin opens reports but cannot mount learner-only pages", () => {
  mockContext.account.role = "Admin";
  const view = render(
    <AccessGate audience="admin" onHome={jest.fn()}>
      <Text>Private report</Text>
    </AccessGate>,
  );
  expect(view.getByText("Private report")).toBeTruthy();
  view.rerender(
    <AccessGate audience="learner" onHome={jest.fn()}>
      <Text>Course attempt</Text>
    </AccessGate>,
  );
  expect(view.queryByText("Course attempt")).toBeNull();
  expect(view.getByText("This is a learner page")).toBeTruthy();
});

test.each(["checking", "error", "signed-out"])(
  "%s access does not mount protected content",
  (status) => {
    mockContext.accessStatus = status;
    mockContext.account = null;
    if (status === "signed-out") mockContext.session.token = null;
    const view = render(
      <AccessGate audience="admin" onHome={jest.fn()}>
        <Text>Private report</Text>
      </AccessGate>,
    );
    expect(view.queryByText("Private report")).toBeNull();
    if (status === "error") {
      fireEvent.press(view.getByText("Retry account access"));
      expect(mockContext.refreshAccess).toHaveBeenCalledTimes(1);
    }
  },
);

test("learner workspace exposes learning actions without analytics", () => {
  const navigate = jest.fn();
  const view = render(
    <LmsHomeScreen navigation={{ navigate } as any} route={{} as any} />,
  );
  expect(view.queryByText("Analytics")).toBeNull();
  fireEvent.press(view.getByText("Downloads"));
  expect(navigate).toHaveBeenCalledWith("Downloads");
  fireEvent.press(view.getByText("Playground"));
  expect(navigate).toHaveBeenCalledWith("CodePlayground");
});

test("admin workspace exposes reporting and account without learner actions", () => {
  mockContext.account.role = "Admin";
  const navigate = jest.fn();
  const view = render(
    <AdminHomeScreen navigation={{ navigate } as any} route={{} as any} />,
  );
  fireEvent.press(view.getByText("Open analytics and reports"));
  expect(navigate).toHaveBeenCalledWith("Analytics");
  for (const label of [
    "Playground",
    "Downloads",
    "Continue learning",
    "Sync progress",
  ])
    expect(view.queryByText(label)).toBeNull();
});

function destination(role: string | null, path: string, signedIn = true) {
  const linking = linkingForRole(role, signedIn);
  const state = linking.getStateFromPath!(path, linking.config);
  return state?.routes[state.routes.length - 1];
}

test("deep links preserve allowed learner attempt identifiers", () => {
  expect(
    destination("Learner", "learner/assessments/3/take?enrollmentId=4"),
  ).toMatchObject({
    name: "AssessmentTaking",
    params: { assessmentId: 3, enrollmentId: 4 },
  });
});

test("direct admin and learner URLs redirect to the correct role workspace", () => {
  expect(destination("Learner", "admin/analytics")).toMatchObject({
    name: "LmsHome",
  });
  expect(destination("Admin", "learner/downloads")).toMatchObject({
    name: "AdminHome",
  });
  expect(destination("Admin", "admin/analytics")).toMatchObject({
    name: "Analytics",
  });
  expect(destination(null, "admin/analytics", false)).toMatchObject({
    name: "SignIn",
  });
  expect(destination("Admin", "auth/login")).toMatchObject({
    name: "AdminHome",
  });
  expect(destination("Learner", "auth/login")).toMatchObject({
    name: "LmsHome",
  });
});

test("moderation requires an explicit moderator or administrator role", () => {
  for (const role of ["Learner", "Instructor", "TA"])
    expect(destination(role, "forum/moderate")).toMatchObject({
      name: "LmsHome",
    });
  for (const role of ["Admin", "Moderator"])
    expect(destination(role, "forum/moderate")).toMatchObject({
      name: "Moderation",
    });
});
