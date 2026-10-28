import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ModerationDashboardPage from "../../pages/moderation/ModerationDashboardPage";
import {
  flaggedItemFixture,
  moderationUserFixture,
} from "../helpers";

vi.mock("../../services/moderationApi", () => ({
  fetchFlaggedQueue: vi.fn(),
  fetchModerationUsers: vi.fn(),
  fetchAuditLog: vi.fn(),
  banUser: vi.fn(),
  unbanUser: vi.fn(),
  warnUser: vi.fn(),
  muteUser: vi.fn(),
  setContentVisibility: vi.fn(),
  resolveContent: vi.fn(),
}));

import {
  banUser,
  fetchFlaggedQueue,
  fetchModerationUsers,
  fetchAuditLog,
  resolveContent,
  setContentVisibility,
  unbanUser,
  warnUser,
} from "../../services/moderationApi";

function renderPage() {
  return render(
    <MemoryRouter>
      <ModerationDashboardPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchFlaggedQueue.mockResolvedValue([
    flaggedItemFixture(),
    flaggedItemFixture({
      id: "cm7",
      type: "comment",
      title: "Comment on discussion d2",
      excerpt: "Totally unrelated promo link here, sorry.",
      reason: "Off-topic",
    }),
  ]);
  fetchModerationUsers.mockResolvedValue([
    moderationUserFixture(),
    moderationUserFixture({ id: "u2", name: "Priya Nair", username: "priya", banned: true }),
    moderationUserFixture({ id: "u3", name: "Rahul Verma", username: "rahul", role: "Instructor" }),
  ]);
  fetchAuditLog.mockResolvedValue([]);
});

describe("ModerationDashboard (Phase 8)", () => {
  it("loads and renders the flagged queue with reasons", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Spam \/ advertising/i)).toBeInTheDocument();
      expect(screen.getByText("Off-topic")).toBeInTheDocument();
    });
    expect(screen.getByText(/Flagged content \(2\)/)).toBeInTheDocument();
  });

  it("hides content only after confirmation", async () => {
    setContentVisibility.mockResolvedValue({ id: "d5", type: "discussion", hidden: true });
    renderPage();

    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: "Hide content" }).length).toBeGreaterThan(0)
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Hide content" })[0]);

    // A confirmation dialog must appear before the action is executed.
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
    expect(setContentVisibility).not.toHaveBeenCalled();
    const dialog = screen.getByTestId("confirm-dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Hide content" }));

    await waitFor(() => expect(setContentVisibility).toHaveBeenCalledWith("d5", "discussion", true));
    await waitFor(() => {
      const toast = document.querySelector('[data-notification-id]');
      expect(toast).toHaveTextContent("Discussion is now hidden");
    });
  });

  it("cancelling the confirmation does not run the hide action", async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: "Hide content" }).length).toBeGreaterThan(0)
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Hide content" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument();
    expect(setContentVisibility).not.toHaveBeenCalled();
  });

  it("resolves items only after confirmation", async () => {
    resolveContent.mockResolvedValue({ id: "d5", type: "discussion", resolved: true });
    renderPage();

    await waitFor(() => expect(screen.getAllByText("Resolve").length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByRole("button", { name: "Resolve" })[0]);
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
    const resolveDialog = screen.getByTestId("confirm-dialog");
    fireEvent.click(within(resolveDialog).getByRole("button", { name: "Resolve" }));

    await waitFor(() => {
      expect(screen.getByText(/Flagged content \(1\)/)).toBeInTheDocument();
    });
    expect(resolveContent).toHaveBeenCalledWith("d5", "discussion");
  });

  it("bans and unbans members via the user table, after confirmation", async () => {
    banUser.mockResolvedValue(moderationUserFixture({ banned: true }));
    renderPage();

    await waitFor(() => expect(screen.getByText("@priya")).toBeInTheDocument());

    // Ban an active user (requires confirmation).
    fireEvent.click(screen.getAllByRole("button", { name: "Ban" })[0]);
    const confirm = screen.getByTestId("confirm-dialog");
    fireEvent.click(within(confirm).getByRole("button", { name: "Ban" }));
    await waitFor(() => expect(banUser).toHaveBeenCalledWith("u7"));

    // Unban a previously banned user (scoped to Priya's row — Dev was just
    // banned above, so more than one Unban button exists at this point).
    unbanUser.mockResolvedValue(moderationUserFixture({ id: "u2", banned: false }));
    const priyaRow = document.querySelector('[data-user-id="u2"]');
    fireEvent.click(within(priyaRow).getByRole("button", { name: "Unban" }));
    const unbanDialog = screen.getByTestId("confirm-dialog");
    fireEvent.click(within(unbanDialog).getByRole("button", { name: "Unban" }));
    await waitFor(() => expect(unbanUser).toHaveBeenCalledWith("u2"));
  });

  it("renders the rich text editor with preview toggle", async () => {
    renderPage();

    await waitFor(() => expect(screen.getByTestId("rich-text-editor")).toBeInTheDocument());
    expect(screen.getByDisplayValue(/Keep the community friendly/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    const preview = screen.getByTestId("rich-preview");
    expect(preview.innerHTML).toContain("<strong>Notice:</strong>");
    expect(screen.queryByDisplayValue(/Keep the community friendly/)).not.toBeInTheDocument();
  });

  it("shows an error banner when loading fails", async () => {
    fetchFlaggedQueue.mockRejectedValue(new Error("Backend offline"));
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Failed to load moderation data");
    });
  });

  it("shows warn and mute buttons for active users", async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText("@devpatel")).toBeInTheDocument());
    expect(screen.getAllByText("Warn").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mute").length).toBeGreaterThan(0);
  });

  it("warns a user after confirmation", async () => {
    warnUser.mockResolvedValue(moderationUserFixture({ warned: true }));
    renderPage();

    await waitFor(() => expect(screen.getAllByText("Warn").length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText("Warn")[0]);
    const confirm = screen.getByTestId("confirm-dialog");
    fireEvent.click(within(confirm).getByRole("button", { name: "Warn" }));
    await waitFor(() => expect(warnUser).toHaveBeenCalledWith("u7"));
    await waitFor(() => {
      const toast = document.querySelector('[data-notification-id]');
      expect(toast).toHaveTextContent("warned");
    });
  });

  it("loads audit log entries", async () => {
    fetchAuditLog.mockResolvedValue([
      { id: "a1", type: "ban_user", targetUserId: "u7", detail: "Dev Patel", timestamp: "2026-08-24T12:00:00Z" },
    ]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Audit Log/)).toBeInTheDocument();
    });
    expect(screen.getByText("ban_user")).toBeInTheDocument();
  });
});
