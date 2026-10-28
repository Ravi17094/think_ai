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
  voteStudioPoll,
} from "../../services/studioApi";
import { getCurrentUserId } from "../../services/forumHttpClient";
import { useStudioSocket } from "../../hooks/useWebSocket";
import { STUDIO_EVENTS } from "../../services/websocket";

const DEFAULT_SESSION_ID = "s1";
const MODERATOR_ROLES = ["Moderator", "Admin"];

const ACTIVE_PANELS = {
  CAMERA: "camera",
  CHAT: "chat",
  ATTENDEES: "attendees",
  POLLS: "polls",
  BREAKOUT: "breakout",
};

/** Live Class Studio (Phase 6/7). */
export default function LiveStudioPage() {
  const sessionId = DEFAULT_SESSION_ID;
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [polls, setPolls] = useState([]);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);

  const [muted, setMuted] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [activePanel, setActivePanel] = useState(null);

  const user = useMemo(
    () => ({ id: getCurrentUserId(), name: "You" }),
    []
  );

  const { mode, subscribe, emit } = useStudioSocket({ sessionId, user });

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchStudioSession(sessionId), joinStudioSession(sessionId)])
      .then(([fetched]) => {
        if (cancelled) return;
        setSession(fetched);
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

  const canModerate = MODERATOR_ROLES.includes("Moderator"); // demo identity is moderator-capable host
  const attendees = session?.attendees || [];
  const onlineCount = attendees.filter((a) => a.online).length;

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
          <div className="studio-header__side studio-header__side--left">
            <Link to="/forum" className="studio-back-link" title="Back to Community Forum">
              <span className="studio-back-link__icon" aria-hidden="true">‹</span>
              Forum
            </Link>
          </div>
          <div className="studio-header__meta">
            <h1>{session?.title || "Live Class Studio"}</h1>
            <div className="studio-header__meta-row">
              <span className="live-pill">● LIVE</span>
              <span className="studio-header__count">
                {attendees.length}{" "}
                {attendees.length === 1 ? "participant" : "participants"} · {onlineCount} online
              </span>
              <span className="mode-pill">socket: {mode}</span>
            </div>
          </div>
          <div className="studio-header__side studio-header__side--right">
            <Link to="/forum" className="studio-leave-btn" title="Leave the live studio">
              Leave call
            </Link>
          </div>
        </header>

        {/* Main live class workspace stays compact. */}
        <div className="studio-grid">
          <div className="studio-main-col">
            <VideoPlaceholder
              title={session?.title || "Waiting for session…"}
              isSharing={sharing}
              attendees={attendees}
              currentUserId={user.id}
              hostId={session?.hostId}
              cameraActive={cameraOn}
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
          onLeaveCall={() => window.location.assign("/forum")}
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
