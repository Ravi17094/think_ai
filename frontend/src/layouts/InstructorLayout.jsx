import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout, selectUser } from '../features/auth/authSlice';
import { useTheme } from '../components/ThemeContext';
import NotificationContainer from '../components/preferenceNotification/PreferenceNotificationContainer';
import NotificationDropdown from '../components/preferenceNotification/PreferenceNotificationsDropDown';

const INSTRUCTOR_NAV_LINKS = [
  { to: '/instructor/dashboard', label: 'Dashboard', icon: '▦' },
  { to: '/instructor/modules', label: 'Modules & lessons', icon: '□' },
  { to: '/instructor/assignments', label: 'Assignments', icon: '✎' },
  { to: '/instructor/student-submissions', label: 'Student submissions', icon: '▤' },
  { to: '/instructor/certificates', label: 'Certificates', icon: '◇' },
  { to: '/forum/studio', label: 'Live Studio', icon: '◉' },
];

export default function InstructorLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector(selectUser);
  const { isDarkMode, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const unreadCount = useSelector((state) => state.notifications?.unreadCount) || 0;

  const handleLogout = () => { dispatch(logout()); navigate('/login'); };
  const active = (to) => location.pathname === to || (to === '/instructor/assignments' && location.pathname.startsWith('/instructor/assignments'));
  const navClass = (to) => `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${active(to)
    ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:ring-purple-500/30'
    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'}`;

  return (
    <div className={`flex h-screen overflow-hidden ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <NotificationContainer />
      <aside className={`hidden w-72 shrink-0 border-r lg:flex lg:flex-col ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
        <Link to="/instructor/dashboard" className={`flex h-24 items-center gap-3 border-b px-8 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-purple-600 text-sm font-black text-white shadow-lg shadow-purple-500/25">tz</span>
          <span className="text-xl font-bold tracking-tight">Thinkz<span className="text-purple-600">.ai</span></span>
        </Link>
        <nav className="flex-1 space-y-1 px-5 py-8">
          <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Instructor Console</p>
          {INSTRUCTOR_NAV_LINKS.map((link) => <Link key={link.to} to={link.to} className={navClass(link.to)}><span className="w-4 text-center text-purple-600 dark:text-purple-300">{link.icon}</span>{link.label}</Link>)}
        </nav>
        <div className={`border-t px-6 py-5 text-xs ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'}`}>Instructor workspace</div>
      </aside>

      <div className="min-w-0 flex flex-1 flex-col">
        <header className={`flex h-24 shrink-0 items-center justify-between border-b px-5 sm:px-10 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center gap-3"><button onClick={() => setIsMobileMenuOpen((open) => !open)} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-600 lg:hidden dark:border-slate-700 dark:text-slate-300">☰</button><span className="text-base font-medium text-slate-500 dark:text-slate-400">Instructor Console</span></div>
          <div className="flex items-center gap-3">
            <div className="relative"><button onClick={() => setIsNotificationOpen((open) => !open)} className={`relative grid h-11 w-11 place-items-center rounded-lg border ${isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-600'}`} aria-label="Notifications">♧{unreadCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-[10px] font-bold text-white">{unreadCount}</span>}</button>{isNotificationOpen && <div className="absolute right-0 z-50 mt-2"><NotificationDropdown isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} /></div>}</div>
            <button onClick={toggleTheme} className={`rounded-lg border px-4 py-2.5 text-sm font-semibold ${isDarkMode ? 'border-slate-700 bg-slate-800 text-amber-300' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>{isDarkMode ? '☀ Light' : '◐ Dark'}</button>
            <div className="relative hidden sm:block">
              <button onClick={() => setIsAccountMenuOpen((open) => !open)} aria-expanded={isAccountMenuOpen} className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left ${isDarkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'}`}><span className="grid h-8 w-8 place-items-center rounded-full bg-purple-100 text-xs font-bold text-purple-700">{(user?.name || 'I').slice(0, 1).toUpperCase()}</span><span><span className="block text-sm font-semibold">{user?.name || 'Instructor'}</span><span className="block text-xs text-slate-500">Instructor</span></span><span className="text-slate-400">⌄</span></button>
              {isAccountMenuOpen && <div className={`absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border py-1 shadow-xl ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}><button onClick={handleLogout} type="button" className="w-full px-5 py-3 text-left text-sm font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10">Log out</button></div>}
            </div>
          </div>
        </header>
        {isMobileMenuOpen && <nav className={`absolute left-0 top-24 z-40 w-72 space-y-1 border-r border-b p-5 shadow-xl lg:hidden ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>{INSTRUCTOR_NAV_LINKS.map((link) => <Link key={link.to} to={link.to} onClick={() => setIsMobileMenuOpen(false)} className={navClass(link.to)}><span className="w-4 text-center text-purple-600">{link.icon}</span>{link.label}</Link>)}</nav>}
        <main className="min-h-0 flex-1 overflow-y-auto px-5 py-8 sm:px-10"><Outlet /></main>
      </div>
    </div>
  );
}
