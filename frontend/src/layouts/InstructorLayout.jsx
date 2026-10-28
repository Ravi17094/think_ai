import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout, selectUser } from '../features/auth/authSlice';
import { useTheme } from '../components/ThemeContext';
import GlobalSearch from '../pages/search/GlobalSearch';
import NotificationContainer from '../components/preferenceNotification/PreferenceNotificationContainer';
import NotificationDropdown from '../components/preferenceNotification/PreferenceNotificationsDropDown';

const INSTRUCTOR_NAV_LINKS = [
  { to: '/instructor/dashboard', label: 'Dashboard' },
  { to: '/instructor/modules', label: 'Modules & Lessons' },
  { to: '/instructor/assignments', label: 'Assignments' },
  { to: '/instructor/student-submissions', label: 'Student Submissions' },
  { to: '/instructor/certificates', label: 'Certificates' },
];

export default function InstructorLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector(selectUser);
  const { isDarkMode, toggleTheme } = useTheme();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const unreadCount = useSelector((state) => state.notifications?.unreadCount) || 0;
  const isAdmin = user?.role === 'Admin' || user?.role === 'ADMIN' || user?.isAdmin;

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const handleLinkClick = () => {
    setIsMobileMenuOpen(false);
    setIsNotificationOpen(false);
    setIsSearchOpen(false);
  };

  return (
    <div className={`min-h-screen h-screen flex flex-col overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-[#181b22] text-[#f1f3f9]' : 'bg-slate-50 text-slate-900'}`}>

      <NotificationContainer />

      <header className={`shrink-0 z-50 border-b backdrop-blur-md transition-colors duration-300 relative ${isDarkMode ? 'bg-[#212631]/90 border-[#323846] text-[#f1f3f9]' : 'bg-white border-slate-200 text-slate-900'}`}>
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">

            <div className="flex items-center gap-4 sm:gap-6">
              <Link to="/instructor/dashboard" className="flex items-center gap-2.5 font-bold tracking-tight text-lg">
                <span className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-mono text-xs font-bold shadow-md">tz</span>
                <span className={`tracking-normal font-bold text-xl ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Thinkz<span className="text-purple-500 font-bold">.ai</span></span>
              </Link>

              {/* Search Toggle Icon Button & Inline Search Container */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSearchOpen((prev) => !prev)}
                  className={`p-2.5 rounded-full transition-all duration-300 cursor-pointer flex items-center justify-center border ${
                    isDarkMode 
                      ? 'bg-[#2a3040] hover:bg-[#32394c] text-[#94a3b8] hover:text-white border-[#3e4658]' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                  }`}
                  title="Search Platform"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>

                {/* Inline Expanding Search Box */}
                {isSearchOpen && (
                  <div className="relative flex items-center animate-fadeIn w-48 sm:w-64 md:w-80">
                    <div className="w-full [&_input]:rounded-full">
                      <GlobalSearch />
                    </div>
                    <button 
                      onClick={() => setIsSearchOpen(false)}
                      className="ml-2 text-slate-400 hover:text-slate-700 dark:hover:text-white font-bold text-sm cursor-pointer px-1"
                      title="Close Search"
                    >
                      &times;
                    </button>
                  </div>
                )}
              </div>

              {/* Desktop Nav Links with Active Highlighting & Hover Effects */}
              {!isSearchOpen && (
                <nav className="hidden md:flex items-center space-x-2">
                  {INSTRUCTOR_NAV_LINKS.map((link) => {
                    const isActive = location.pathname === link.to;
                    return (
                      <Link
                        key={link.to}
                        to={link.to}
                        className={`relative px-4 py-2 text-sm font-medium transition-all duration-300 rounded-full group ${
                          isActive
                            ? isDarkMode
                              ? 'text-purple-400 bg-purple-500/10 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                              : 'text-purple-700 bg-purple-50 border border-purple-200 shadow-sm'
                            : isDarkMode
                              ? 'text-[#94a3b8] hover:text-white hover:bg-[#2a3040]'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </nav>
              )}
            </div>

            <div className="flex items-center gap-3">
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin/dashboard')}
                  className="hidden sm:flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 transition-colors text-xs font-semibold cursor-pointer"
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
                  className={`p-2.5 rounded-full transition-colors relative cursor-pointer flex items-center justify-center border ${isDarkMode ? 'bg-[#2a3040] hover:bg-[#32394c] text-[#94a3b8] hover:text-white border-[#3e4658]' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'}`}
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

                {isNotificationOpen && (
                  <div className="absolute right-0 mt-2 z-50">
                    <NotificationDropdown isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} />
                  </div>
                )}
              </div>

              <button
                onClick={toggleTheme}
                className={`p-2 px-3.5 rounded-full transition-colors cursor-pointer text-xs font-medium border ${isDarkMode ? 'bg-[#2a3040] hover:bg-[#32394c] text-amber-300 border-[#3e4658]' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'}`}
                title="Toggle Theme"
              >
                {isDarkMode ? '☀️ Light' : '🌙 Dark'}
              </button>

              <div className={`flex items-center gap-3 pl-2 sm:pl-4 sm:border-l ${isDarkMode ? 'sm:border-[#323846]' : 'sm:border-slate-200'}`}>
                <span className={`text-sm font-medium hidden sm:block ${isDarkMode ? 'text-[#f1f3f9]' : 'text-slate-700'}`}>
                  {user?.name || 'Instructor Portal'}
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
                className={`md:hidden p-2.5 rounded-full border focus:outline-none cursor-pointer ${isDarkMode ? 'bg-[#2a3040] border-[#3e4658] text-[#94a3b8]' : 'bg-slate-100 border-slate-200 text-slate-600'}`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                className="w-full text-left px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-600/20 text-purple-300 border border-purple-500/30"
              >
                &larr; Back to Admin Console
              </button>
            )}
            {INSTRUCTOR_NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={handleLinkClick}
                className={`block px-4 py-2 rounded-full text-sm font-medium ${
                  location.pathname === link.to ? 'text-purple-400 bg-purple-500/10 font-semibold' : isDarkMode ? 'text-[#94a3b8] hover:bg-[#2a3040] hover:text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      <main className="min-h-0 flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 overflow-y-auto overflow-x-hidden">
        <Outlet />
      </main>

    </div>
  );
}
