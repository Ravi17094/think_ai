import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUser } from '../../features/auth/authSlice';
import apiClient from '../../services/apiClient';

function StatCard({ title, count, description, color }) {
  return (
    <div className="bg-white dark:bg-[#1a1e2b] border border-slate-200 dark:border-[#262b38] p-6 rounded-3xl shadow-xl space-y-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
      <h3 className={`text-3xl font-black ${color}`}>{count}</h3>
      <p className="text-xs text-slate-500 dark:text-[#94a3b8]">{description}</p>
    </div>
  );
}

export default function InstructorDashboard() {
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const [report, setReport] = useState(null);

  useEffect(() => {
    apiClient.get('/attendance/ta/report')
      .then((response) => setReport(response.data?.data || null))
      .catch(() => setReport(null));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-slate-50 dark:bg-[#151821] text-slate-900 dark:text-[#f1f3f9] min-h-screen transition-colors duration-300">

      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-[#262b38] bg-white dark:bg-[#1a1e2b] p-6 md:p-8 backdrop-blur-2xl shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />
        
        <div className="space-y-2 relative z-10">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
            Instructor Control Hub
          </span>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
            Welcome back, <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">{user?.name || 'Instructor'}</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-[#94a3b8] max-w-xl">
            Manage your curriculum modules, configure lesson topics, build module assignments, and track automated certificate completions.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => navigate('/instructor/modules')}
            className="px-6 py-3 text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white rounded-2xl shadow-lg shadow-purple-500/25 transition-all cursor-pointer"
          >
            + Manage Modules & Lessons
          </button>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard 
          title="Active Modules" 
          count={report?.coursework?.activeModules ?? '—'}
          description="Modules in the database"
          color="text-purple-600 dark:text-purple-400" 
        />
        <StatCard 
          title="Module Assignments" 
          count={report?.coursework?.activeAssessments ?? '—'}
          description="Active assessments in the database"
          color="text-indigo-600 dark:text-indigo-400" 
        />
        <StatCard 
          title="Pending Submissions" 
          count={report?.grading?.pending ?? '—'}
          description="Submitted assessments awaiting grading"
          color="text-emerald-500" 
        />
      </div>

      {/* Quick Action Navigation Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Panel 1: Modules & Lessons Management */}
        <div className="bg-white dark:bg-[#1a1e2b] border border-slate-200 dark:border-[#262b38] p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Modules & Topics (Lessons)</h3>
            <button 
              onClick={() => navigate('/instructor/modules')}
              className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
            >
              Open Modules →
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-[#94a3b8]">Create course modules and manage multiple nested lesson topics and videos.</p>
          <div className="pt-2">
            <button
              onClick={() => navigate('/instructor/modules')}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-[#222736] hover:bg-slate-200 dark:hover:bg-[#2b3244] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border border-slate-200 dark:border-[#3e4658]"
            >
              Configure Module Lessons
            </button>
          </div>
        </div>

        {/* Panel 2: Assignments & Grading */}
        <div className="bg-white dark:bg-[#1a1e2b] border border-slate-200 dark:border-[#262b38] p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Module Assignments</h3>
            <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Active Quizzes
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-[#94a3b8]">Create module assessments, set correct answer keys, and manage student submissions.</p>
          <div className="pt-2">
            <button
              onClick={() => navigate('/instructor/assignments/create')}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-[#222736] hover:bg-slate-200 dark:hover:bg-[#2b3244] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border border-slate-200 dark:border-[#3e4658]"
            >
              + Create New Assignment
            </button>
          </div>
        </div>

      </div>

      <div className="bg-white dark:bg-[#1a1e2b] border border-slate-200 dark:border-[#262b38] p-6 rounded-3xl shadow-xl space-y-4">
        <div>
          <h3 className="text-lg font-bold">Instructor tools & reports</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#94a3b8]">Review learner submissions and monitor certificate progress.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/instructor/student-submissions')}
            className="rounded-xl bg-slate-100 dark:bg-[#222736] hover:bg-slate-200 dark:hover:bg-[#2b3244] px-4 py-3 text-left text-sm font-bold border border-slate-200 dark:border-[#3e4658]"
          >
            Student Submissions →
          </button>
          <button
            onClick={() => navigate('/instructor/certificates')}
            className="rounded-xl bg-slate-100 dark:bg-[#222736] hover:bg-slate-200 dark:hover:bg-[#2b3244] px-4 py-3 text-left text-sm font-bold border border-slate-200 dark:border-[#3e4658]"
          >
            Certificates Report →
          </button>
        </div>
      </div>

    </div>
  );
}
