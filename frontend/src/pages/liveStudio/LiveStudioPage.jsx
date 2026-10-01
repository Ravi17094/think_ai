import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../../styles/liveStudio.css";

import VideoPlaceholder from "../../components/liveStudio/VideoPlaceholder";
import AttendeeList from "../../components/liveStudio/AttendeeList";
import ChatPanel from "../../components/liveStudio/ChatPanel";
import PollPanel from "../../components/liveStudio/PollPanel";
import BreakoutRooms from "../../components/liveStudio/BreakoutRooms";
import CameraModal from "../../components/liveStudio/CameraModal";
import StudioToolbar from "../../components/liveStudio/StudioToolbar";
import NotificationToast from "../../components/forum/NotificationToast";

import {
  createStudioPoll,
  fetchStudioSession,
  joinStudioSession,
  updateStudioSessionStatus,
  voteStudioPoll,
} from "../../services/studioApi";
import { getCurrentUserId, getCurrentUserRole } from "../../services/forumHttpClient";
import { useStudioSocket } from "../../hooks/useWebSocket";
import { STUDIO_EVENTS } from "../../services/websocket";

const DEFAULT_SESSION_ID = "s1";
const LIVE_SUPPORT_ROLES = ["INSTRUCTOR", "ADMIN", "TA"];
const LIVE_SESSION_MANAGER_ROLES = ["INSTRUCTOR", "ADMIN"];

const ACTIVE_PANELS = {
  CAMERA: "camera",
  CHAT: "chat",
  ATTENDEES: "attendees",
  POLLS: "polls",
  BREAKOUT: "breakout",
};

const SESSION_STATUS = {
  scheduled: { label: "SCHEDULED", className: "session-status--scheduled" },
  live: { label: "LIVE", className: "session-status--live" },
  ended: { label: "ENDED", className: "session-status--ended" },
};
const DATE_TIME_LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const part = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())}T${part(date.getHours())}:${part(date.getMinutes())}`;
}

/** Live Class Studio (Phase 6/7). */
export default function LiveStudioPage() {
  const sessionId = DEFAULT_SESSION_ID;
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [polls, setPolls] = useState([]);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [isUpdatingSession, setIsUpdatingSession] = useState(false);
  const [scheduledFor, setScheduledFor] = useState("");

  const [muted, setMuted] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [activePanel, setActivePanel] = useState(null);

  const user = useMemo(
    () => ({ id: getCurrentUserId(), name: "You" }),
    []
  );
  const currentRole = useMemo(() => String(getCurrentUserRole()).toUpperCase(), []);

  const { mode, subscribe, emit } = useStudioSocket({ sessionId, user });

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchStudioSession(sessionId), joinStudioSession(sessionId)])
      .then(([fetched]) => {
        if (cancelled) return;
        setSession(fetched);
        setScheduledFor(toDateTimeLocal(fetched.scheduledAt));
        setMessages(fetched.messages || []);
        setPolls(fetched.polls || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load studio session");
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Real-time subscriptions (live socket or mock fallback).
  useEffect(() => {
    const unsubState = subscribe(STUDIO_EVENTS.STATE, (state) => {
      setSession(state);
      if (!state.messages?.length) return;
    });

    const unsubChat = subscribe(STUDIO_EVENTS.CHAT_NEW, (message) => {
      setMessages((previous) =>
        previous.some((m) => m.id === message.id) ? previous : [...previous, message]
      );
    });

    const unsubPoll = subscribe(STUDIO_EVENTS.POLL_UPDATE, (poll) => {
      setPolls((previous) => {
        const index = previous.findIndex((p) => p.id === poll.id);
        if (index === -1) return [...previous, poll];
        const next = [...previous];
        next[index] = poll;
        return next;
      });
    });

    const unsubDeleted = subscribe(STUDIO_EVENTS.MESSAGE_DELETED, ({ messageId }) => {
      setMessages((previous) =>
        previous.map((m) => (m.id === messageId ? { ...m, deleted: true } : m))
      );
    });

    return () => {
      unsubState();
      unsubChat();
      unsubPoll();
      unsubDeleted();
    };
  }, [subscribe]);

  const pushToast = useCallback((notification) => {
    setToasts((previous) => [...previous.slice(-2), notification]);
  }, []);

  // Open contextual panel on matching notifications (chat/poll).
  useEffect(() => {
    const unsubChatNotify = subscribe(STUDIO_EVENTS.CHAT_NEW, (message) => {
      if (message.userId !== user.id) {
        pushToast({
          id: `chat-${Date.now()}`,
          type: "chat",
          panel: ACTIVE_PANELS.CHAT,
          message: `New message from ${message.userName || "attendee"}`,
        });
      }
    });

    const unsubPollNotify = subscribe(STUDIO_EVENTS.POLL_UPDATE, (poll) => {
      if (poll.status === "open") {
        pushToast({
          id: `poll-${Date.now()}`,
          type: "poll",
          panel: ACTIVE_PANELS.POLLS,
          message: "A new poll is available.",
        });
      }
    });

    return () => {
      unsubChatNotify();
      unsubPollNotify();
    };
  }, [subscribe, pushToast, user.id]);

  // Close focused UI when Escape is pressed.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setActivePanel(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const patchSelf = useCallback((patch) => {
    emit(STUDIO_EVENTS.PRESENCE, { sessionId, userId: user.id, patch });
    setSession((previous) =>
      previous
        ? {
            ...previous,
            attendees: previous.attendees.map((attendee) =>
              attendee.userId === user.id ? { ...attendee, ...patch } : attendee
            ),
          }
        : previous
    );
  }, [emit, sessionId, user.id]);

  const handleSend = (text) =>
    emit(STUDIO_EVENTS.CHAT_SEND, { sessionId, text, user });

  const handleVotePoll = async (pollId, optionId) => {
    try {
      const updatedPoll = await voteStudioPoll(pollId, optionId);
      setPolls((previous) => previous.map((p) => (p.id === pollId ? updatedPoll : p)));
    } catch (err) {
      pushToast({ id: `poll-err-${Date.now()}`, message: err.message || "Vote failed" });
    }
  };

  const handleCreatePoll = async ({ question, options }) => {
    try {
      const created = await createStudioPoll(sessionId, { question, options });
      setPolls((previous) => [...previous, created]);
      emit(STUDIO_EVENTS.POLL_CREATE, { sessionId, poll: created });
      pushToast({ id: `poll-${Date.now()}`, message: "Poll published to attendees." });
    } catch (err) {
      pushToast({ id: `poll-err-${Date.now()}`, message: err.message || "Could not create poll" });
    }
  };

  const handleSessionStatus = async (status) => {
    if (status === "scheduled" && !DATE_TIME_LOCAL_PATTERN.test(scheduledFor)) {
      pushToast({
        id: `schedule-error-${Date.now()}`,
        message: "Use a valid four-digit year, for example 2026.",
      });
      return;
    }
    setIsUpdatingSession(true);
    try {
      const scheduleValue = status === "scheduled" ? new Date(scheduledFor).toISOString() : undefined;
      const updated = await updateStudioSessionStatus(sessionId, status, scheduleValue);
      setSession(updated);
      setScheduledFor(toDateTimeLocal(updated.scheduledAt));
      pushToast({
        id: `session-${Date.now()}`,
        message: status === "live"
          ? "Live class started."
          : status === "ended"
            ? "Live class ended."
            : "Session prepared and scheduled.",
      });
    } catch (err) {
      pushToast({
        id: `session-error-${Date.now()}`,
        message: err.message || "Could not update the session status.",
      });
    } finally {
      setIsUpdatingSession(false);
    }
  };

  const handleTogglePanel = useCallback((panel) => {
    setActivePanel((previous) => (previous === panel ? null : panel));
  }, []);

  const handleOpenPanel = useCallback(
    (panel) => setActivePanel((previous) => (previous === panel ? previous : panel)),
    []
  );

  const handleCloseCamera = useCallback(() => {
    setCameraOn(false);
    patchSelf({ cameraOn: false });
    setActivePanel(null);
  }, [patchSelf]);

  const canModerate = LIVE_SUPPORT_ROLES.includes(currentRole);
  const canManageSession = LIVE_SESSION_MANAGER_ROLES.includes(currentRole);
  const attendees = session?.attendees || [];
  const onlineCount = attendees.filter((a) => a.online).length;
  const sessionStatus = SESSION_STATUS[String(session?.status || "scheduled").toLowerCase()] || SESSION_STATUS.scheduled;
  const formattedSchedule = session?.scheduledAt
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(session.scheduledAt))
    : null;

  if (error) {
    return (
      <div className="studio-page">
        <div className="studio-container">
          <div className="error-banner" role="alert">{error}</div>
          <Link to="/forum" className="btn btn--ghost">← Back to forum</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="studio-page">
      <div className="studio-container">
        <header className="studio-header">
          <h1>{session?.title || "Live Class Studio"}</h1>
          <span className={`session-status ${sessionStatus.className}`} aria-label={`Session status: ${sessionStatus.label}`}>
            <span aria-hidden="true">●</span> {sessionStatus.label}
          </span>
          <span className="mode-pill">socket: {mode}</span>
          {formattedSchedule && (
            <span className="studio-schedule-time">Starts: {formattedSchedule}</span>
          )}
          {canManageSession && sessionStatus.label === "SCHEDULED" && (
            <button
              type="button"
              className="btn btn--small studio-session-action"
              disabled={isUpdatingSession || !session?.scheduledAt}
              title={session?.scheduledAt ? "Start the scheduled class" : "Choose a date and time first"}
              onClick={() => handleSessionStatus("live")}
            >
              {isUpdatingSession ? "Starting…" : "Start live class"}
            </button>
          )}
          {canManageSession && sessionStatus.label === "LIVE" && (
            <button
              type="button"
              className="btn btn--small studio-session-action studio-session-action--end"
              disabled={isUpdatingSession}
              onClick={() => handleSessionStatus("ended")}
            >
              {isUpdatingSession ? "Ending…" : "End session"}
            </button>
          )}
          <span style={{ flex: 1 }} />
          <Link to="/forum" className="btn btn--ghost btn--small">← Forum</Link>
        </header>

        {canManageSession && sessionStatus.label !== "LIVE" && (
          <section className="studio-schedule-form" aria-label="Schedule live class">
            <label htmlFor="studio-scheduled-for">Class date and time</label>
            <input
              id="studio-scheduled-for"
              type="datetime-local"
              value={scheduledFor}
              min="2026-01-01T00:00"
              max="2099-12-31T23:59"
              onChange={(event) => setScheduledFor(event.target.value)}
            />
            <button
              type="button"
              className="btn btn--small studio-session-action"
              disabled={isUpdatingSession || !scheduledFor}
              onClick={() => handleSessionStatus("scheduled")}
            >
              {isUpdatingSession ? "Saving…" : "Save schedule"}
            </button>
            <span>Choose a time, save it, then start the class.</span>
          </section>
        )}

        {/* Main live class workspace stays compact. */}
        <div className="studio-grid">
          <div className="studio-main-col">
            <VideoPlaceholder
              title={session?.title || "Waiting for session…"}
              isSharing={sharing}
              attendeeCount={onlineCount}
              onOpenCamera={() => handleOpenPanel(ACTIVE_PANELS.CAMERA)}
            />
          </div>

          {/* Contextual side panels open only when activated. */}
          {activePanel === ACTIVE_PANELS.CHAT && (
            <div className="studio-side-col">
              <ChatPanel
                messages={messages}
                onSend={handleSend}
                onDeleteMessage={(messageId) =>
                  emit(STUDIO_EVENTS.DELETE_MESSAGE, { sessionId, messageId })
                }
                canModerate={canModerate}
                onClose={() => setActivePanel(null)}
              />
            </div>
          )}

          {activePanel === ACTIVE_PANELS.ATTENDEES && (
            <div className="studio-side-col">
              <AttendeeList
                attendees={attendees}
                hostId={session?.hostId}
                currentUserId={user.id}
                onClose={() => setActivePanel(null)}
              />
            </div>
          )}

          {activePanel === ACTIVE_PANELS.POLLS && (
            <div className="studio-side-col">
              <PollPanel
                polls={polls}
                onVote={handleVotePoll}
                onCreatePoll={handleCreatePoll}
                canCreatePoll={canModerate}
                onClose={() => setActivePanel(null)}
              />
            </div>
          )}

          {activePanel === ACTIVE_PANELS.BREAKOUT && (
            <div className="studio-side-col">
              <BreakoutRooms
                sessionId={sessionId}
                isHost={canModerate}
                currentUserId={user.id}
                onClose={() => setActivePanel(null)}
              />
            </div>
          )}
        </div>

        <StudioToolbar
          muted={muted}
          cameraOn={cameraOn}
          sharing={sharing}
          handRaised={handRaised}
          activePanel={activePanel}
          onToggleMute={() => {
            setMuted((previous) => !previous);
            patchSelf({ muted: !muted });
          }}
          onToggleCamera={() => {
            if (!cameraOn) {
              setCameraOn(true);
              patchSelf({ cameraOn: true });
              handleOpenPanel(ACTIVE_PANELS.CAMERA);
            } else {
              handleCloseCamera();
            }
          }}
          onToggleShare={() => {
            setSharing((previous) => !previous);
            pushToast({
              id: `share-${Date.now()}`,
              type: "moderation",
              message: sharing
                ? "Screen share stopped."
                : "Screen share placeholder enabled — real capture arrives with the media module.",
            });
          }}
          onToggleHand={() => {
            setHandRaised((previous) => !previous);
            patchSelf({ raisedHand: !handRaised });
          }}
          onOpenChat={() => handleTogglePanel(ACTIVE_PANELS.CHAT)}
          onOpenAttendees={() => handleTogglePanel(ACTIVE_PANELS.ATTENDEES)}
          onOpenPolls={() => handleTogglePanel(ACTIVE_PANELS.POLLS)}
          onOpenBreakout={() => handleTogglePanel(ACTIVE_PANELS.BREAKOUT)}
        />
      </div>

      {/* Focused camera overlay — opens only when requested; real WebRTC
          preview (CameraModal) starts/stops on mount/unmount. */}
      {activePanel === ACTIVE_PANELS.CAMERA && (
        <CameraModal
          title={session?.title || "Camera preview"}
          onClose={handleCloseCamera}
        />
      )}

      <NotificationToast
        notifications={toasts}
        onDismiss={(id) => setToasts((previous) => previous.filter((t) => t.id !== id))}
        onAction={(notification) => {
          if (notification.panel) handleOpenPanel(notification.panel);
        }}
      />
    </div>
  );
}
