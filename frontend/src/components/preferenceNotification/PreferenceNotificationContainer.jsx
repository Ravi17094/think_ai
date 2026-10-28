import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { removeToast } from '../../features/preferenceNotification/preferenceNotificationSlice';
import LiveSessionToast from './LiveSessionToast';

const AUTO_DISMISS_MS = 5000;

export default function NotificationContainer() {
  const dispatch = useDispatch();
  const activeToasts = useSelector((state) => state.notifications?.activeToasts) || [];
  const timersRef = useRef(new Map());
  const [pausedIds, setPausedIds] = useState(() => new Set());

  useEffect(() => {
    activeToasts.forEach((toast) => {
      if (pausedIds.has(toast.id)) return;
      if (timersRef.current.has(toast.id)) return;
      const timer = setTimeout(() => {
        dispatch(removeToast(toast.id));
        timersRef.current.delete(toast.id);
      }, AUTO_DISMISS_MS);
      timersRef.current.set(toast.id, timer);
    });

    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, [activeToasts, dispatch, pausedIds]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  const handleMouseEnter = useCallback((toastId) => {
    setPausedIds((previous) => {
      const next = new Set(previous);
      next.add(toastId);
      return next;
    });
    const timer = timersRef.current.get(toastId);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(toastId);
    }
  }, []);

  const handleMouseLeave = useCallback((toastId) => {
    setPausedIds((previous) => {
      const next = new Set(previous);
      next.delete(toastId);
      return next;
    });
  }, []);

  if (!activeToasts.length) return null;

  return (
    <div className="fixed top-20 right-5 z-[9999] flex flex-col gap-3 w-80">
      {activeToasts.map((toast) => (
        toast.link ? (
          <LiveSessionToast
            key={toast.id}
            toast={toast}
            onDismiss={() => dispatch(removeToast(toast.id))}
          />
        ) : (
        <div
          key={toast.id}
          className="flex items-start gap-3 bg-slate-900 border border-slate-700 text-slate-100 p-4 rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-right-5 border-l-4 border-l-purple-500"
          onMouseEnter={() => handleMouseEnter(toast.id)}
          onMouseLeave={() => handleMouseLeave(toast.id)}
        >
          <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 font-bold text-xs">
            {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : '🔔'}
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-white">{toast.title}</h4>
            <p className="text-xs text-slate-300 mt-0.5">{toast.message}</p>
          </div>
          <button
            onClick={() => dispatch(removeToast(toast.id))}
            className="text-slate-400 hover:text-white text-lg leading-none cursor-pointer"
            aria-label="Dismiss notification"
          >
            &times;
          </button>
        </div>
        )
      ))}
    </div>
  );
}
