import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout, selectUser } from '../features/auth/authSlice';
import { useTheme } from '../components/ThemeContext';
import NotificationContainer from '../components/preferenceNotification/PreferenceNotificationContainer';

const NAV_ITEMS = [
  { to: '/instructor/dashboard', label: 'Dashboard', icon: '▦' },
  { to: '/instructor/modules', label: 'Modules & lessons', icon: '□' },
  { to: '/instructor/assignments/create', label: 'Assignments', icon: '✎' },
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
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      <NotificationContainer />
      <div className="flex min-h-screen">
        <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:block">
          <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-6 dark:border-slate-800">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-sm font-black text-white">tz</span>
            <span className="text-lg font-bold tracking-tight text-slate-800 dark:text-white">Thinkz.ai</span>
          </div>
          <div className="px-4 py-6">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Instructor Console</p>
            <nav className="mt-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const active = location.pathname === item.to;
                return <Link key={item.to} to={item.to} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${active ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}><span>{item.icon}</span>{item.label}</Link>;
              })}
            </nav>
          </div>
          <div className="absolute bottom-0 w-60 border-t border-slate-100 p-4 text-xs text-slate-400 dark:border-slate-800">Instructor Workspace</div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 dark:border-slate-800 dark:bg-slate-900 sm:px-8">
            <div className="flex items-center gap-3"><Link to="/instructor/dashboard" className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-xs font-black text-white lg:hidden">tz</Link><span className="text-sm font-medium text-slate-500 dark:text-slate-400">Instructor Console</span></div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={toggleTheme} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">{isDarkMode ? '☀ Light' : '◐ Dark'}</button>
              <div className="relative"><button type="button" aria-expanded={isAccountMenuOpen} aria-label="Instructor account menu" onClick={() => setIsAccountMenuOpen((current) => !current)} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 text-left transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"><span className="grid h-8 w-8 place-items-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">{(user?.name || 'I').slice(0, 1).toUpperCase()}</span><span className="hidden leading-tight sm:block"><span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{user?.name || 'Instructor'}</span><span className="block text-xs text-slate-500 dark:text-slate-400">Instructor</span></span><span className="text-xs text-slate-400">⌄</span></button>{isAccountMenuOpen && <div className="absolute right-0 z-20 mt-2 w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"><button type="button" onClick={handleLogout} className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700">Log out</button></div>}</div>
            </div>
          </header>
          <main className="min-h-[calc(100vh-4rem)]"><Outlet /></main>
        </div>
      </div>
    </div>
  );
}
