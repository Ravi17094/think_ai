import { Hand, Mic, MicOff, Video } from "lucide-react";

/**
 * Attendee panel with online/offline indicators, mic/camera state and
 * raised hands (Phase 6/7). Rendered Google Meet-style with SVG status
 * icons instead of emojis.
 */
export default function AttendeeList({ attendees = [], hostId, currentUserId, onClose }) {
  return (
    <div className="studio-panel studio-drawer">
      <div className="studio-drawer__header">
        <h2>
          Attendees ({attendees.filter((a) => a.online).length}/{attendees.length} online)
        </h2>
        {onClose && (
          <button
            type="button"
            className="studio-close-btn"
            onClick={onClose}
            aria-label="Close attendees"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
      <ul className="attendee-list" data-testid="attendee-list">
        {attendees.map((attendee) => (
          <li key={attendee.userId} className="attendee-row" data-attendee-id={attendee.userId}>
            <span
              className={`attendee-status ${attendee.online ? "attendee-status--online" : ""}`}
              title={attendee.online ? "Online" : "Offline"}
            />
            <span className="attendee-name">
              {attendee.name}
              {attendee.userId === currentUserId ? " (you)" : ""}
            </span>
            {attendee.userId === hostId && <span className="attendee-host">HOST</span>}
            <span className="attendee-icons" aria-hidden="true">
              {attendee.raisedHand && (
                <span className="attendee-hand" title="Raised hand">
                  <Hand size={14} />
                </span>
              )}
              {attendee.muted && <span title="Microphone off"><MicOff size={14} /></span>}
              {!attendee.muted && <span title="Microphone on"><Mic size={14} /></span>}
              {attendee.cameraOn && <span title="Camera on"><Video size={14} /></span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}