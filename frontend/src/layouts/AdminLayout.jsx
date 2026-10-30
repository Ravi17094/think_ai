import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../features/auth/authSlice';
import Branding from '../components/auth/Branding';

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/courses', label: 'Courses' },
  { to: '/admin/batches', label: 'Batches' },
];

export default function AdminLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = () => {
    setIsDropdownOpen(false);
    dispatch(logout());
    navigate('/home');
  };

  const handleLinkClick = () => {
    setIsDropdownOpen(false);
  };

  return (
      <div className="h-screen w-full flex bg-[#161A24] text-white overflow-hidden relative">
        <aside className="hidden md:flex w-64 flex-col border-r border-gray-700 bg-[#1A1E2A] p-6">
        <Branding size="small" />
        <nav className="mt-10 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-gray-800 px-8 py-4 z-30 relative">
          <p className="text-sm text-gray-400">Admin Console</p>
          <div className="flex items-center gap-6">
            <button className="text-gray-500 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>

            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-3 bg-[#112435] px-4 py-2 rounded-xl text-left border border-gray-800 hover:border-gray-700 transition-colors"
              >
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-teal-600 flex items-center justify-center text-xs text-cyan-400">
                    {(user?.name || 'A').charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border border-[#112435]"></div>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-white">{user?.name || 'Admin'}</p>
                  <p className="text-xs text-gray-400">{user?.role || 'System Admin'}</p>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-[#1A1F2B] border border-gray-800 rounded-lg shadow-xl z-20 overflow-hidden">
                  <ul className="text-sm text-gray-300">
                    <li>
                      <NavLink to="/admin/profile" onClick={handleLinkClick} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800/60 transition-colors">
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        View Profile
                      </NavLink>
                    </li>
                    <li>
                      <NavLink to="/admin/profile/edit" onClick={handleLinkClick} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800/60 transition-colors">
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Edit Profile
                      </NavLink>
                    </li>
                    <li className="border-t border-gray-800"></li>
                    <li>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800/60 transition-colors text-left"
                      >
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Log out
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 z-0 relative">
          <Outlet />
        </main>
      </div>

      {isDropdownOpen && (
        <div
          className="fixed inset-0 bg-transparent z-20"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
}
