import { Hand, MicOff, Video } from "lucide-react";

function getInitials(name) {
  return (name || "?")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

/**
 * Video area rendered as a Google Meet-style participant tile grid. Each
 * attendee gets a tile with an initials avatar, name label and a status
 * corner (raised hand, muted mic, camera on). Real WebRTC belongs to a
 * future media module, so tiles are static placeholders (Phase 6/7).
 */
export default function VideoPlaceholder({
  title,
  isSharing,
  attendees = [],
  currentUserId,
  hostId,
  cameraActive,
  onOpenCamera,
}) {
  const tiles = attendees.length
    ? attendees
    : [{ userId: currentUserId || "self", name: "You" }];

  return (
    <div
      className={`video-placeholder ${isSharing ? "video-placeholder--sharing" : ""} ${
        cameraActive ? "video-placeholder--active" : ""
      }`}
      data-testid="video-placeholder"
    >
      <div className="studio-tile-grid" aria-label={title || "Participant tiles"}>
        {tiles.map((attendee) => {
          const isSelf = attendee.userId === currentUserId;
          const isHost = Boolean(hostId && attendee.userId === hostId);
          const isActive = cameraActive && isSelf;

          return (
            <div
              key={attendee.userId}
              className={`studio-tile ${isActive ? "studio-tile--active" : ""}`}
            >
              <div className="studio-tile__avatar" aria-hidden="true">
                <span>{getInitials(attendee.name)}</span>
              </div>

              <div className="studio-tile__status" aria-hidden="true">
                {attendee.raisedHand && (
                  <span className="studio-tile__status-item" title="Raised hand">
                    <Hand size={14} />
                  </span>
                )}
                {attendee.muted && (
                  <span className="studio-tile__status-item" title="Microphone off">
                    <MicOff size={14} />
                  </span>
                )}
                {attendee.cameraOn && (
                  <span className="studio-tile__status-item" title="Camera on">
                    <Video size={14} />
                  </span>
                )}
              </div>

              <div className="studio-tile__label">
                <span className="studio-tile__name">
                  {attendee.name || "Guest"}
                  {isSelf ? " (you)" : ""}
                </span>
                {isHost && <span className="attendee-host">HOST</span>}
              </div>
            </div>
          );
        })}
      </div>

      {onOpenCamera && !cameraActive && (
        <button
          type="button"
          className="video-placeholder__action btn btn--primary btn--small"
          onClick={onOpenCamera}
        >
          Start Video
        </button>
      )}
    </div>
  );
}