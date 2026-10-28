import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff } from "lucide-react";

const STARTING = "starting";
const ACTIVE = "active";
const ERROR = "error";

/**
 * Real WebRTC camera preview. The component only mounts when the user asks to
 * open the camera, so `getUserMedia` is requested on demand (never in the
 * background). The stream is stopped and cleaned up when the modal closes or
 * unmounts.
 */
export default function CameraModal({ title, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState(STARTING);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    let stream = null;
    const videoEl = videoRef.current;

    async function start() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setStatus(ERROR);
        setErrorMsg("Camera access is not supported in this browser.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoEl) {
          videoEl.srcObject = stream;
          videoEl.play().catch(() => {});
        }
        setStatus(ACTIVE);
      } catch (error) {
        if (cancelled) return;
        setStatus(ERROR);
        setErrorMsg(
          error?.name === "NotAllowedError"
            ? "Camera permission was denied. Allow access and try again."
            : error?.name === "NotFoundError"
              ? "No camera was found on this device."
              : "Could not start the camera."
        );
      }
    }

    start();

    return () => {
      cancelled = true;
      if (stream) stream.getTracks().forEach((track) => track.stop());
      if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoEl) videoEl.srcObject = null;
    };
  }, []);

  return (
    <div className="studio-overlay" role="dialog" aria-modal="true" aria-label="Camera preview">
      <div
        className="studio-overlay__backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="studio-overlay__content studio-camera-modal">
        <div className="studio-camera-modal__header">
          <h2>Camera</h2>
          <button
            type="button"
            className="studio-close-btn"
            onClick={onClose}
            aria-label="Close camera"
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
        </div>

        <div className="studio-camera-modal__stage">
          {status === ACTIVE ? (
            <video
              ref={videoRef}
              className="studio-camera-modal__video"
              autoPlay
              playsInline
              muted
              data-testid="camera-preview"
            />
          ) : status === ERROR ? (
            <div className="studio-camera-modal__state" data-testid="camera-error">
              <span className="studio-camera-modal__icon" aria-hidden="true">
                <CameraOff size={40} />
              </span>
              <span>{errorMsg}</span>
            </div>
          ) : (
            <div className="studio-camera-modal__state" data-testid="camera-starting">
              <span className="studio-camera-modal__icon" aria-hidden="true">
                <Camera size={40} />
              </span>
              <span>Requesting camera…</span>
            </div>
          )}
          <span className="studio-camera-modal__title">{title}</span>
        </div>

        <div className="studio-camera-modal__actions">
          <button type="button" className="btn btn--primary btn--small" onClick={onClose}>
            {status === ACTIVE ? "Stop Video" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}