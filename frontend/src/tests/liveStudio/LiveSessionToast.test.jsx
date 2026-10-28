import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import LiveSessionToast from "../../components/preferenceNotification/LiveSessionToast";

function renderToast(toast, onDismiss) {
  return render(
    <MemoryRouter>
      <LiveSessionToast toast={toast} onDismiss={onDismiss} />
    </MemoryRouter>
  );
}

describe("LiveSessionToast", () => {
  it("renders a session:started toast with a join link", () => {
    renderToast({
      id: 1,
      title: "React Basics",
      message: "Live class starting now — React Basics",
      type: "success",
      link: "/live-studio/sess-1",
      linkLabel: "Join live class",
    });

    expect(screen.getByText("Live class starting now — React Basics")).toBeInTheDocument();
    const joinLink = screen.getByRole("link", { name: "Join live class" });
    expect(joinLink).toHaveAttribute("href", "/live-studio/sess-1");
  });

  it("renders a session:ended toast with a summary/recording link", () => {
    renderToast({
      id: 2,
      title: "React Basics",
      message: "Recording available — React Basics",
      type: "info",
      link: "/learner/live/sess-1",
      linkLabel: "View summary & recording",
    });

    expect(screen.getByText("Recording available — React Basics")).toBeInTheDocument();
    const summaryLink = screen.getByRole("link", { name: "View summary & recording" });
    expect(summaryLink).toHaveAttribute("href", "/learner/live/sess-1");
  });

  it("dismisses on the close button", async () => {
    const onDismiss = vi.fn();
    renderToast({ id: 1, title: "T", message: "M", type: "info" }, onDismiss);
    await userEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
    expect(onDismiss).toHaveBeenCalled();
  });

  it("renders no link when the toast has no link data", () => {
    renderToast({ id: 3, title: "T", message: "M", type: "info" });
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("renders nothing when toast payload is null/undefined", () => {
    const { container } = render(
      <MemoryRouter>
        <LiveSessionToast toast={null} />
      </MemoryRouter>
    );
    expect(container.firstChild).toBeNull();
  });
});