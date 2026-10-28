import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";

import DiscussionListPage from "../../pages/forum/DiscussionListPage";
import DiscussionDetailsPage from "../../pages/forum/DiscussionDetailsPage";
import NotificationCenterPage from "../../pages/forum/NotificationCenterPage";
import { categoryFixture, commentFixture, discussionFixture, notificationFixture } from "../helpers";

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
  fetchBookmarks: vi.fn().mockResolvedValue([]),
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
import { fetchNotifications } from "../../services/moderationApi";

const VIEWPORTS = [375, 768, 1440];
const __dirname = dirname(fileURLToPath(import.meta.url));

function setViewport(width) {
  window.innerWidth = width;
  window.innerHeight = 1200;
  window.dispatchEvent(new Event("resize"));
}

function cssText(name) {
  return readFileSync(join(__dirname, "..", "..", "styles", name), "utf8");
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchDiscussions.mockResolvedValue({
    items: [discussionFixture()],
    page: 1,
    limit: 10,
    total: 1,
    totalPages: 1,
  });
  fetchCategories.mockResolvedValue([categoryFixture()]);
  fetchDiscussionById.mockResolvedValue(discussionFixture());
  fetchComments.mockResolvedValue([commentFixture()]);
  fetchNotifications.mockResolvedValue([notificationFixture()]);
});

describe.each(VIEWPORTS)("responsive verification at %ipx", (width) => {
  it("renders the community list page with its primary actions", async () => {
    setViewport(width);
    render(
      <MemoryRouter initialEntries={["/forum"]}>
        <DiscussionListPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId("discussion-card")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "+ New discussion" })).toBeInTheDocument();
    expect(screen.getByLabelText("Search discussions")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter by category")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "🔔 Notifications" })).toBeInTheDocument();
  });

  it("renders the notification center with list + mark-all at every width", async () => {
    setViewport(width);
    render(
      <MemoryRouter initialEntries={["/forum/notifications"]}>
        <NotificationCenterPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(1));
    expect(screen.getByRole("button", { name: "Mark all read" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /unread: @priya/i })).toBeInTheDocument();
  });

  it("renders the thread details with reply controls at every width", async () => {
    setViewport(width);
    render(
      <MemoryRouter initialEntries={["/forum/d1"]}>
        <DiscussionDetailsPage />
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Welcome to the Thinkz AI Community/i)
    );
    expect(screen.getByText(/Comments \(/)).toBeInTheDocument();
    expect(screen.getByTestId("rich-text-editor")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Post comment" })).toBeInTheDocument();
  });
});

describe("CSS breakpoint coverage (375 / 768 / 1440)", () => {
  it("forum.css contains the three Day 13 breakpoints", () => {
    const css = cssText("forum.css");
    expect(css).toMatch(/@media\s*\(max-width:\s*375px\)/);
    expect(css).toMatch(/@media\s*\(min-width:\s*768px\)/);
    expect(css).toMatch(/@media\s*\(min-width:\s*1440px\)/);
  });

  it("moderation.css contains mobile guards and coarse-pointer touch sizing", () => {
    const css = cssText("moderation.css");
    expect(css).toMatch(/@media\s*\(max-width:\s*375px\)/);
    expect(css).toMatch(/@media\s*\(max-width:\s*768px\)/);
    expect(css).toMatch(/@media\s*\(hover:\s*none\)\s*and\s*\(pointer:\s*coarse\)/);
  });

  it("checkout.css sizes touch targets for coarse pointers", () => {
    const css = cssText("checkout.css");
    expect(css).toMatch(/@media\s*\(max-width:\s*375px\)/);
    expect(css).toMatch(/@media\s*\(hover:\s*none\)\s*and\s*\(pointer:\s*coarse\)/);
  });
});