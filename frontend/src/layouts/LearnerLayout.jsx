import React, { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout, selectUser } from '../features/auth/authSlice';
import { useTheme } from '../components/ThemeContext';
import GlobalSearch from '../pages/search/GlobalSearch';
import NotificationContainer from '../components/preferenceNotification/PreferenceNotificationContainer';
import NotificationDropdown from '../components/preferenceNotification/PreferenceNotificationsDropDown';
import LiveSessionNotificationListener from '../components/preferenceNotification/LiveSessionNotificationListener';

export default function LearnerLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const { isDarkMode, toggleTheme } = useTheme();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false); 
  const unreadCount = useSelector((state) => state.notifications?.unreadCount) || 0;
  const isAdmin = user?.role === 'Admin' || user?.role === 'ADMIN' || user?.isAdmin;

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const handleLinkClick = () => {
    setIsMobileMenuOpen(false);
    setIsNotificationOpen(false);
  };

  return (
    <div className={`min-h-screen h-screen flex flex-col overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-[#181b22] text-[#f1f3f9]' : 'bg-slate-50 text-slate-900'}`}>

      <NotificationContainer />
      <LiveSessionNotificationListener />

      <header className={`shrink-0 z-50 border-b backdrop-blur-md transition-colors duration-300 ${isDarkMode ? 'bg-[#212631]/90 border-[#323846] text-[#f1f3f9]' : 'bg-white border-slate-200 text-slate-900'}`}>
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">

            <div className="flex items-center gap-6 sm:gap-8">
              <Link to="/learner" className="flex items-center gap-2.5 font-bold tracking-tight text-lg">
                <span className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-mono text-xs font-bold shadow-md">tz</span>
                <span className={`tracking-normal font-bold text-xl ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Thinkz<span className="text-purple-500 font-bold">.ai</span></span>
              </Link>
              <GlobalSearch />

              <nav className="hidden md:flex items-center space-x-6">
                <Link to="/learner" className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-[#94a3b8] hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>Dashboard</Link>
                <Link to="/learner/courses" className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-[#94a3b8] hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>Courses</Link>
                <Link to="/learner/assignments" className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-[#94a3b8] hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>Assignments</Link>
                <Link to="/learner/playground" className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-[#94a3b8] hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>Playground</Link>
                <Link to="/learner/certificates" className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-[#94a3b8] hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>Certificates</Link>
                <Link to="/learner/live" className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-[#94a3b8] hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>Live Classes</Link>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin/dashboard')}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 transition-colors text-xs font-semibold cursor-pointer"
                >
                  <span>&larr; Admin Console</span>
                </button>
              )}

              {/* Notification Bell with Dropdown Toggle */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsNotificationOpen((prev) => !prev);
                  }}
                  className={`p-2 rounded-xl transition-colors relative cursor-pointer flex items-center justify-center border ${isDarkMode ? 'bg-[#2a3040] hover:bg-[#32394c] text-[#94a3b8] hover:text-white border-[#3e4658]' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'}`}
                  title="Notifications"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>

                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Dropdown Menu */}
                {isNotificationOpen && (
                  <div className="absolute right-0 mt-2 z-50">
                    <NotificationDropdown isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} />
                  </div>
                )}
              </div>

              <button
                onClick={toggleTheme}
                className={`p-1.5 px-3 rounded-full transition-colors cursor-pointer text-xs font-medium border ${isDarkMode ? 'bg-[#2a3040] hover:bg-[#32394c] text-amber-300 border-[#3e4658]' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'}`}
                title="Toggle Theme"
              >
                {isDarkMode ? '☀️ Light' : '🌙 Dark'}
              </button>

              <div className={`flex items-center gap-3 pl-2 sm:pl-4 sm:border-l ${isDarkMode ? 'sm:border-[#323846]' : 'sm:border-slate-200'}`}>
                <span className={`text-sm font-medium hidden sm:block ${isDarkMode ? 'text-[#f1f3f9]' : 'text-slate-700'}`}>
                  {user?.name || 'Alex Rivera'}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-xs uppercase tracking-wider font-bold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer hidden sm:block"
                >
                  Logout
                </button>
              </div>

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`md:hidden p-2 rounded-lg border focus:outline-none cursor-pointer ${isDarkMode ? 'bg-[#2a3040] border-[#3e4658] text-[#94a3b8]' : 'bg-slate-100 border-slate-200 text-slate-600'}`}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>

          </div>
        </div>

        {isMobileMenuOpen && (
          <div className={`md:hidden px-4 py-4 space-y-3 shadow-xl border-b ${isDarkMode ? 'bg-[#212631] text-[#f1f3f9] border-[#323846]' : 'bg-white text-slate-900 border-slate-200'}`}>
            {isAdmin && (
              <button
                onClick={() => { handleLinkClick(); navigate('/admin/dashboard'); }}
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-purple-600/20 text-purple-300 border border-purple-500/30"
              >
                &larr; Back to Admin Console
              </button>
            )}
            <Link to="/learner" onClick={handleLinkClick} className={`block px-3 py-2 rounded-lg text-sm font-medium ${isDarkMode ? 'text-[#94a3b8] hover:bg-[#2a3040] hover:text-white' : 'text-slate-600 hover:bg-slate-100'}`}>My Dashboard</Link>
            <Link to="/learner/courses" onClick={handleLinkClick} className={`block px-3 py-2 rounded-lg text-sm font-medium ${isDarkMode ? 'text-[#94a3b8] hover:bg-[#2a3040] hover:text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Courses</Link>
            <Link to="/learner/assignments" onClick={handleLinkClick} className={`block px-3 py-2 rounded-lg text-sm font-medium ${isDarkMode ? 'text-[#94a3b8] hover:bg-[#2a3040] hover:text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Assignments</Link>
            <Link to="/learner/playground" onClick={handleLinkClick} className={`block px-3 py-2 rounded-lg text-sm font-medium ${isDarkMode ? 'text-[#94a3b8] hover:bg-[#2a3040] hover:text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Playground</Link>
            <Link to="/learner/certificates" onClick={handleLinkClick} className={`block px-3 py-2 rounded-lg text-sm font-medium ${isDarkMode ? 'text-[#94a3b8] hover:bg-[#2a3040] hover:text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Certificates</Link>
            <Link to="/learner/live" onClick={handleLinkClick} className={`block px-3 py-2 rounded-lg text-sm font-medium ${isDarkMode ? 'text-[#94a3b8] hover:bg-[#2a3040] hover:text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Live Classes</Link>
            <Link to="/learner/settings/notifications" onClick={handleLinkClick} className={`block px-3 py-2 rounded-lg text-sm font-medium text-purple-400 ${isDarkMode ? 'hover:bg-[#2a3040]' : 'hover:bg-slate-100'}`}>Notification Settings</Link>
          </div>
        )}
      </header>

      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 overflow-y-auto overflow-x-hidden">
        <Outlet />
      </main>

    </div>
  );
}