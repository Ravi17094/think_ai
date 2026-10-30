import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { removeToast } from '../../features/preferenceNotification/preferenceNotificationSlice';

export default function NotificationContainer() {
  const dispatch = useDispatch();
  
  // Use optional chaining (?.) and fallback to [] to prevent undefined errors
  const activeToasts = useSelector((state) => state.notifications?.activeToasts) || [];

  useEffect(() => {
    if (activeToasts.length > 0) {
      const timer = setTimeout(() => {
        dispatch(removeToast(activeToasts[0].id));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [activeToasts, dispatch]);

  if (!activeToasts.length) return null;

  return (
    <div className="fixed top-20 right-5 z-[9999] flex flex-col gap-3 w-80">
      {activeToasts.map((toast) => (
        <div 
          key={toast.id} 
          className="flex items-start gap-3 bg-slate-900 border border-slate-700 text-slate-100 p-4 rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-right-5 border-l-4 border-l-purple-500"
        >
          <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 font-bold text-xs">
            ✓
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-white">{toast.title}</h4>
            <p className="text-xs text-slate-300 mt-0.5">{toast.message}</p>
          </div>
          <button 
            onClick={() => dispatch(removeToast(toast.id))}
            className="text-slate-400 hover:text-white text-lg leading-none cursor-pointer"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}