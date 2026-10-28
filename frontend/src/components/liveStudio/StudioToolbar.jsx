import {
  BarChart2,
  Hand,
  LayoutGrid,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Users,
  Video,
  VideoOff,
} from "lucide-react";

/**
 * Bottom studio toolbar in a Google Meet style: circular icon buttons with
 * labels below. Mic, camera, screen share and raise-hand controls on the
 * left; contextual tools (chat, attendees, polls, breakout rooms) in the
 * middle; an end-call button on the right. State is controlled by the page.
 */
export default function StudioToolbar({
  muted,
  cameraOn,
  sharing,
  handRaised,
  activePanel,
  onToggleMute,
  onToggleCamera,
  onToggleShare,
  onToggleHand,
  onOpenChat,
  onOpenAttendees,
  onOpenPolls,
  onOpenBreakout,
  onLeaveCall,
}) {
  return (
    <div className="studio-toolbar" role="toolbar" aria-label="Studio controls">
      <button
        type="button"
        className={`toolbar-button ${muted ? "is-off" : "is-on"}`}
        aria-pressed={muted}
        title={muted ? "Turn on microphone" : "Turn off microphone"}
        onClick={onToggleMute}
      >
        <span className="toolbar-icon" aria-hidden="true">
          {muted ? <MicOff size={20} /> : <Mic size={20} />}
        </span>
        {muted ? "Unmute" : "Mute"}
      </button>

      <button
        type="button"
        className={`toolbar-button ${cameraOn || activePanel === "camera" ? "is-on" : "is-off"}`}
        aria-pressed={cameraOn || activePanel === "camera"}
        title={cameraOn || activePanel === "camera" ? "Turn off camera" : "Turn on camera"}
        onClick={onToggleCamera}
      >
        <span className="toolbar-icon" aria-hidden="true">
          {cameraOn || activePanel === "camera" ? <Video size={20} /> : <VideoOff size={20} />}
        </span>
        Camera
      </button>

      <button
        type="button"
        className={`toolbar-button ${sharing ? "is-on" : ""}`}
        aria-pressed={sharing}
        title="Present your screen"
        onClick={onToggleShare}
      >
        <span className="toolbar-icon" aria-hidden="true">
          <MonitorUp size={20} />
        </span>
        Share
      </button>

      <button
        type="button"
        className={`toolbar-button ${handRaised ? "is-active-hand" : ""}`}
        aria-pressed={handRaised}
        title="Raise or lower hand"
        onClick={onToggleHand}
      >
        <span className="toolbar-icon" aria-hidden="true">
          <Hand size={20} />
        </span>
        Hand
      </button>

      <span className="toolbar-divider" aria-hidden="true" />

      <button
        type="button"
        className={`toolbar-button toolbar-button--tool ${activePanel === "chat" ? "is-active-tool" : ""}`}
        aria-pressed={activePanel === "chat"}
        title="Open chat"
        onClick={onOpenChat}
      >
        <span className="toolbar-icon" aria-hidden="true">
          <MessageSquare size={20} />
        </span>
        Chat
      </button>

      <button
        type="button"
        className={`toolbar-button toolbar-button--tool ${activePanel === "attendees" ? "is-active-tool" : ""}`}
        aria-pressed={activePanel === "attendees"}
        title="Show attendees"
        onClick={onOpenAttendees}
      >
        <span className="toolbar-icon" aria-hidden="true">
          <Users size={20} />
        </span>
        Attendees
      </button>

      <button
        type="button"
        className={`toolbar-button toolbar-button--tool ${activePanel === "polls" ? "is-active-tool" : ""}`}
        aria-pressed={activePanel === "polls"}
        title="Open polls"
        onClick={onOpenPolls}
      >
        <span className="toolbar-icon" aria-hidden="true">
          <BarChart2 size={20} />
        </span>
        Polls
      </button>

      <button
        type="button"
        className={`toolbar-button toolbar-button--tool ${activePanel === "breakout" ? "is-active-tool" : ""}`}
        aria-pressed={activePanel === "breakout"}
        title="Open breakout rooms"
        onClick={onOpenBreakout}
      >
        <span className="toolbar-icon" aria-hidden="true">
          <LayoutGrid size={20} />
        </span>
        Rooms
      </button>

      <span className="toolbar-divider" aria-hidden="true" />

      {onLeaveCall && (
        <button
          type="button"
          className="toolbar-button toolbar-button--leave"
          title="Leave the live studio"
          onClick={onLeaveCall}
        >
          <span className="toolbar-icon" aria-hidden="true">
            <PhoneOff size={20} />
          </span>
          Leave
        </button>
      )}
    </div>
  );
}