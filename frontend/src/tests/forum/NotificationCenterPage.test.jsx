import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NotificationCenterPage from "../../pages/forum/NotificationCenterPage";
import { notificationFixture } from "../helpers";

vi.mock("../../services/moderationApi", () => ({
  fetchNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));

vi.mock("../../services/forumHttpClient", () => ({
  getCurrentUserId: () => "u1",
}));

vi.mock("../../hooks/useForumSocket", () => ({
  useForumSocket: () => ({
    mode: "mock",
    subscribe: () => () => {},
    events: {},
  }),
}));

import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../../services/moderationApi";

function renderPage() {
  return render(
    <MemoryRouter>
      <NotificationCenterPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchNotifications.mockResolvedValue([
    notificationFixture({ id: "n1", message: "@priya mentioned you in React Hooks", type: "mention", read: false, link: "/forum/d1" }),
    notificationFixture({ id: "n2", message: "Dev replied to your thread", type: "reply", read: true, link: "/forum/d2" }),
  ]);
});

describe("NotificationCenterPage", () => {
  it("loads and renders notifications list", async () => {
    renderPage();

    await waitFor(() => expect(fetchNotifications).toHaveBeenCalled());
    expect(screen.getByText(/Notification Center/)).toBeInTheDocument();
    expect(screen.getByText("@priya mentioned you in React Hooks")).toBeInTheDocument();
    expect(screen.getByText("Dev replied to your thread")).toBeInTheDocument();
  });

  it("shows unread count", async () => {
    renderPage();

    await waitFor(() => expect(fetchNotifications).toHaveBeenCalled());
    expect(screen.getByText("1 unread notification")).toBeInTheDocument();
  });

  it("marks a notification as read", async () => {
    markNotificationRead.mockResolvedValue({});
    renderPage();

    await waitFor(() => expect(screen.getAllByRole("listitem").length).toBeGreaterThan(0));

    fireEvent.click(screen.getByLabelText(/Unread: @priya mentioned you/));
    expect(markNotificationRead).toHaveBeenCalledWith("n1");
  });

  it("marks all notifications as read", async () => {
    markAllNotificationsRead.mockResolvedValue({ userId: "u1", marked: 1 });
    renderPage();

    await waitFor(() => expect(screen.getByText("Mark all read")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Mark all read"));

    await waitFor(() => expect(markAllNotificationsRead).toHaveBeenCalledWith("u1"));
    expect(screen.queryByText("1 unread notification")).not.toBeInTheDocument();
  });

  it("renders empty state when no notifications exist", async () => {
    fetchNotifications.mockResolvedValue([]);
    renderPage();

    await waitFor(() => expect(screen.getByText("No notifications yet")).toBeInTheDocument());
    expect(screen.getByText("Browse discussions")).toBeInTheDocument();
  });

  it("shows an error banner when loading fails", async () => {
    fetchNotifications.mockRejectedValue(new Error("Backend offline"));
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/Backend offline|Failed to load notifications/);
    });
  });
});
