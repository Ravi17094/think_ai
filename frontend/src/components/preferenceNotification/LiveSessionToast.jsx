
import { Link } from 'react-router-dom';

/**
 * Live Session Notification Toast
 *
 * Handles Socket.IO notifications:
 * - session:started
 * - session:ended
 *
 * Displays notification title, message,
 * session link, and dismiss button.
 */
export default function LiveSessionToast({ toast, onDismiss }) {
  if (!toast) return null;

  const {
    title,
    message,
    link,
    linkLabel,
  } = toast;

  const isExternalLink =
    typeof link === 'string' &&
    /^https?:\/\//i.test(link);

  const displayTitle = title || 'Live Session';
  const displayMessage =
    message || 'A live session is available.';
  const displayLinkLabel = linkLabel || 'Open session';

  const linkClassName =
    'inline-block mt-2 px-3 py-1.5 rounded-lg ' +
    'bg-emerald-600 hover:bg-emerald-500 ' +
    'text-white text-xs font-semibold ' +
    'transition-colors cursor-pointer';

  return (
    <div
      data-testid="live-session-toast"
      role="alert"
      className="flex items-start gap-3 bg-slate-900 border border-slate-700 text-slate-100 p-4 rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-right-5 border-l-4 border-l-emerald-500"
    >
      <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs">
        {'▶'}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-white">
          {displayTitle}
        </h4>

        <p className="text-xs text-slate-300 mt-0.5">
          {displayMessage}
        </p>

        {link && (
          isExternalLink ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClassName}
            >
              {displayLinkLabel}
            </a>
          ) : (
            <Link
              to={link}
              className={linkClassName}
            >
              {displayLinkLabel}
            </Link>
          )
        )}
      </div>

      {typeof onDismiss === 'function' && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-slate-400 hover:text-white text-lg leading-none cursor-pointer"
          aria-label="Dismiss notification"
        >
          &times;
        </button>
      )}
    </div>
  );
}
