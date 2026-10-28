import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import axe from "axe-core";

import DiscussionListPage from "../../pages/forum/DiscussionListPage";
import DiscussionDetailsPage from "../../pages/forum/DiscussionDetailsPage";
import NotificationCenterPage from "../../pages/forum/NotificationCenterPage";
import BookmarksPage from "../../pages/forum/BookmarksPage";
import {
  categoryFixture,
  commentFixture,
  discussionFixture,
  notificationFixture,
} from "../helpers";

vi.mock("../../services/forumApi", () => ({
  fetchDiscussions: vi.fn(),
  fetchDiscussionById: vi.fn(),
  fetchComments: vi.fn(),
  postComment: vi.fn().mockResolvedValue({}),
  voteDiscussion: vi.fn().mockResolvedValue({ success: true }),
  flagDiscussion: vi.fn().mockResolvedValue({}),
  setDiscussionSolved: vi.fn().mockResolvedValue({}),
}));

vi.mock("../../services/categoryApi", () => ({
  fetchCategories: vi.fn(),
}));

vi.mock("../../services/tagApi", () => ({
  fetchTags: vi.fn().mockResolvedValue(["community", "ama", "onboarding"]),
}));

vi.mock("../../services/bookmarkApi", () => ({
  fetchBookmarks: vi.fn(),
  addBookmark: vi.fn().mockResolvedValue({}),
  removeBookmark: vi.fn().mockResolvedValue({}),
}));

vi.mock("../../services/moderationApi", () => ({
  fetchNotifications: vi.fn(),
  markNotificationRead: vi.fn().mockResolvedValue({}),
  markAllNotificationsRead: vi.fn().mockResolvedValue({}),
}));

vi.mock("../../services/forumHttpClient", () => ({
  getCurrentUserId: () => "u1",
}));

vi.mock("../../hooks/useForumSocket", () => ({
  useForumSocket: () => ({
    mode: "mock",
    subscribe: () => () => {},
    emit: () => {},
    events: {},
  }),
}));

import { fetchDiscussions, fetchDiscussionById, fetchComments } from "../../services/forumApi";
import { fetchCategories } from "../../services/categoryApi";
import { fetchBookmarks } from "../../services/bookmarkApi";
import { fetchNotifications } from "../../services/moderationApi";

const VIEWPORTS = [375, 768, 1440];

function setViewport(width) {
  window.innerWidth = width;
  window.innerHeight = 1200;
  window.dispatchEvent(new Event("resize"));
}

async function auditPage(ui) {
  // The app shell (Learner/Instructor layouts) already provides the <main>
  // landmark; mirror that here so the `region` rule sees content inside one.
  render(<main>{ui}</main>);
  await waitFor(() => {
    const heading = document.querySelector("h1, h2");
    if (!heading) throw new Error("still loading");
  });
  // Let fetched lists render.
  await waitFor(() => {
    if (screen.queryByText(/loading/i)) throw new Error("still loading");
  });

  // Day 13 staging item: record the audit output. jsdom cannot compute real
  // paint colors, so color-contrast is reported but not asserted here (it
  // needs the browser demo pass); every other axe rule must be clean.
  const report = await axe.run(document.body, {
    rules: { "color-contrast": { enabled: false } },
  });
  const violations = report.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.length,
    help: violation.help,
  }));
  console.log(`[axe:${window.innerWidth}px] ${JSON.stringify(violations)}`);
  expect(violations).toEqual([]);
}

async function auditAndResolve(page) {
  const timeout = setTimeout(() => {}, 0);
  await auditPage(page);
  clearTimeout(timeout);
  cleanup();
}

beforeEach(() => {
  vi.clearAllMocks();
  document.documentElement.lang = "en";
  fetchDiscussions.mockResolvedValue({
    items: [discussionFixture()],
    page: 1,
    limit: 10,
    total: 1,
    totalPages: 1,
  });
  fetchCategories.mockResolvedValue([categoryFixture()]);
  fetchBookmarks.mockResolvedValue([
    { id: "bk1", discussionId: "d1", createdAt: "2026-08-01T00:00:00.000Z", discussion: discussionFixture() },
  ]);
  fetchDiscussionById.mockResolvedValue(discussionFixture());
  fetchComments.mockResolvedValue([commentFixture()]);
  fetchNotifications.mockResolvedValue([notificationFixture()]);
});

afterEach(() => cleanup());

describe.each(VIEWPORTS)("axe-core audit at %ipx viewport", (width) => {
  it("DiscussionListPage has no violations", async () => {
    setViewport(width);
    await auditAndResolve(
      <MemoryRouter initialEntries={["/forum"]}>
        <DiscussionListPage />
      </MemoryRouter>
    );
    expect(fetchDiscussions).toHaveBeenCalled();
  });

  it("DiscussionDetailsPage has no violations", async () => {
    setViewport(width);
    await auditAndResolve(
      <MemoryRouter initialEntries={["/forum/d1"]}>
        <DiscussionDetailsPage />
      </MemoryRouter>
    );
    expect(fetchDiscussionById).toHaveBeenCalled();
  });

  it("NotificationCenterPage has no violations", async () => {
    setViewport(width);
    await auditAndResolve(
      <MemoryRouter initialEntries={["/forum/notifications"]}>
        <NotificationCenterPage />
      </MemoryRouter>
    );
    expect(fetchNotifications).toHaveBeenCalled();
  });

  it("BookmarksPage has no violations", async () => {
    setViewport(width);
    await auditAndResolve(
      <MemoryRouter initialEntries={["/forum/bookmarks"]}>
        <BookmarksPage />
      </MemoryRouter>
    );
    expect(fetchBookmarks).toHaveBeenCalled();
  });
});