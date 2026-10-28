import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../features/auth/authSlice';
import { useTheme } from '../components/ThemeContext';
import Branding from '../components/auth/Branding';
import NotificationDropdown from '../components/preferenceNotification/PreferenceNotificationsDropDown';
import { selectUnreadCount } from '../features/preferenceNotification/preferenceNotificationSlice';

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/rbac', label: 'RBAC' },
  { to: '/admin/audit-logs', label: 'Audit logs' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/courses', label: 'Courses' },
  { to: '/admin/batches', label: 'Batches' },
  { to: '/admin/enrollments', label: 'Enrollments' },
  { to: '/admin/modules', label: 'Modules' },
  { to: '/admin/lessons', label: 'Lessons' },
  { to: '/admin/assessments', label: 'Assessments' },
];

export default function AdminLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { isDarkMode, toggleTheme } = useTheme();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const unreadCount = useSelector(selectUnreadCount);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    dispatch(logout());
    navigate('/home');
  };

  const handleLinkClick = () => {
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className={`h-screen w-screen flex flex-col md:flex-row overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-[#151821] text-[#f1f3f9]' : 'bg-slate-50 text-slate-900'}`}>

      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex w-64 flex-col border-r p-6 h-full shrink-0 transition-colors duration-300 ${isDarkMode ? 'border-[#262b38] bg-[#1a1e2b]' : 'border-slate-200 bg-white'}`}>
        <Branding size="small" />
        <nav className="mt-10 flex flex-col gap-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                  ? isDarkMode
                    ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                  : isDarkMode
                    ? 'text-[#94a3b8] hover:text-white hover:bg-[#222736]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content Area Wrapper */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">

        {/* Sticky Header */}
        <header className={`shrink-0 flex items-center justify-between border-b px-4 sm:px-8 py-4 z-10 backdrop-blur-md transition-colors duration-300 ${isDarkMode ? 'bg-[#1a1e2b]/90 border-[#262b38]' : 'bg-white/90 border-slate-200'}`}>
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Menu Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`md:hidden p-2 rounded-lg border focus:outline-none cursor-pointer ${isDarkMode ? 'bg-[#222736] border-[#313849] text-[#94a3b8]' : 'bg-slate-100 border-slate-200 text-slate-600'}`}
              aria-label="Toggle Menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            {/* Mobile-only brand mark */}
            <Link to="/admin/dashboard" className="md:hidden flex items-center gap-2 font-bold tracking-tight">
              <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-mono text-[10px] font-bold shadow-[0_0_10px_rgba(37,99,235,0.4)]">tz</span>
              <span className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Thinkz<span className="text-blue-600">.ai</span></span>
            </Link>

            <p className={`text-sm hidden sm:block ${isDarkMode ? 'text-[#94a3b8]' : 'text-slate-600'}`}>Admin Console</p>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">

            {/* Notification Bell Icon */}
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className={`p-2.5 rounded-xl transition-colors cursor-pointer border relative ${isDarkMode ? 'bg-[#222736] border-[#313849] text-[#94a3b8] hover:text-white' : 'bg-slate-100 border-slate-300 text-slate-700'}`}
                title="Notifications"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              <NotificationDropdown isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
            </div>

            {/* Dark/Light Mode Toggle Button */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition-colors cursor-pointer text-sm font-semibold border ${isDarkMode ? 'bg-[#222736] border-[#313849] text-amber-300 hover:bg-[#2b3244]' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'}`}
              title="Toggle Theme"
            >
              {isDarkMode ? '☀️ Light' : '🌙 Dark'}
            </button>

            {/* Profile Dropdown Container */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`flex items-center gap-3 px-2 sm:px-4 py-2 rounded-xl text-left border transition-colors cursor-pointer ${isDarkMode ? 'bg-[#222736] border-[#313849] hover:border-[#3d475d] text-white' : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900 shadow-sm'}`}
              >
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-blue-500/20 border border-blue-600 flex items-center justify-center text-xs text-blue-400 font-bold">
                    {(user?.name || 'A').charAt(0).toUpperCase()}
                  </div>
                  <div className={`absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border ${isDarkMode ? 'border-[#222736]' : 'border-white'}`}></div>
                </div>
                <div className="text-left hidden sm:block">
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{user?.name || 'Admin'}</p>
                  <p className={`text-xs ${isDarkMode ? 'text-[#94a3b8]' : 'text-slate-500'}`}>{user?.role || 'System Admin'}</p>
                </div>
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform hidden sm:block ${isDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Backdrop for closing dropdown on click outside */}
              {isDropdownOpen && (
                <div
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setIsDropdownOpen(false)}
                />
              )}

              {/* Dropdown Menu Items */}
              {isDropdownOpen && (
                <div className={`absolute top-full right-0 mt-2 w-48 border rounded-lg shadow-xl z-50 overflow-hidden ${isDarkMode ? 'bg-[#1a1e2b] border-[#262b38] text-[#f1f3f9]' : 'bg-white border-slate-200 text-slate-700'}`}>
                  <ul className="text-sm">
                    <li>
                      <NavLink to="/admin/profile" onClick={handleLinkClick} className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${isDarkMode ? 'hover:bg-[#222736]' : 'hover:bg-slate-100'}`}>
                        View Profile
                      </NavLink>
                    </li>
                    <li>
                      <NavLink to="/admin/profile/edit" onClick={handleLinkClick} className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${isDarkMode ? 'hover:bg-[#222736]' : 'hover:bg-slate-100'}`}>
                        Edit Profile
                      </NavLink>
                    </li>
                    <li className={`border-t ${isDarkMode ? 'border-[#262b38]' : 'border-slate-100'}`}></li>
                    <li>
                      <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left cursor-pointer text-rose-500 ${isDarkMode ? 'hover:bg-[#222736]' : 'hover:bg-rose-50'}`}
                      >
                        Log out
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Nav Drawer */}
        {isMobileMenuOpen && (
          <>
            <div className="fixed inset-0 z-20 bg-black/40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
            <div className={`md:hidden border-b px-4 py-4 space-y-1 shadow-xl z-30 relative transition-colors duration-300 ${isDarkMode ? 'bg-[#1a1e2b] text-white border-[#262b38]' : 'bg-white text-slate-900 border-slate-200'}`}>
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={handleLinkClick}
                  className={({ isActive }) =>
                    `block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                      ? isDarkMode
                        ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                        : 'bg-blue-50 text-blue-700'
                      : isDarkMode
                        ? 'text-[#94a3b8] hover:text-white hover:bg-[#222736]'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </>
        )}

        {/* Dedicated Scrollable Content Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
