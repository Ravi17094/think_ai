/**
 * Configured Jitsi room embed. Local development keeps the existing preview
 * until a deployment supplies a Jitsi domain through VITE_JITSI_DOMAIN.
 *
 * Authentication for a production video room must use a short-lived,
 * server-issued Jitsi token; the application's login token is never exposed
 * to an external iframe.
 */
export default function JitsiMeeting({ sessionId, title }) {
  const domain = import.meta.env.VITE_JITSI_DOMAIN;

  if (!domain) return null;

  const roomName = `thinkz-${String(sessionId || "live").replace(/[^a-z0-9_-]/gi, "-")}`;
  const url = new URL(`https://${domain}/${roomName}`);
  url.hash = "config.prejoinPageEnabled=false&config.startWithAudioMuted=true";

  return (
    <div className="jitsi-meeting" data-testid="jitsi-meeting">
      <iframe
        title={`${title || "Live class"} video meeting`}
        src={url.toString()}
        allow="camera; microphone; display-capture; fullscreen; autoplay"
        allowFullScreen
      />
    </div>
  );
}
