import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import SessionPrepChecklist from '../../components/instructor/SessionPrepChecklist';

function StatCard({ title, count, description }) {
  return <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p><p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{count}</p><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{description}</p></article>;
}

export default function InstructorDashboard() {
  const navigate = useNavigate();
  const [report, setReport] = useState(null);

  useEffect(() => {
    apiClient.get('/attendance/ta/report').then((response) => setReport(response.data?.data || null)).catch(() => setReport(null));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <div className="mb-7"><p className="text-sm font-medium text-blue-600">Dashboard</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Instructor Workspace</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Manage modules, lessons, assessments, live classes, and learner progress.</p></div>
      <section className="grid gap-4 sm:grid-cols-3"><StatCard title="Active modules" count={report?.coursework?.activeModules ?? '—'} description="Modules in the database" /><StatCard title="Module assignments" count={report?.coursework?.activeAssessments ?? '—'} description="Active assessments in the database" /><StatCard title="Pending submissions" count={report?.grading?.pending ?? '—'} description="Submitted learner assessments" /></section>

      <section className="mt-7"><SessionPrepChecklist /></section>

      <section className="mt-7 grid gap-5 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold text-slate-900 dark:text-white">Modules & lessons</h2><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Create course modules and manage nested lessons, topics, and videos.</p></div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">Content</span></div><button type="button" onClick={() => navigate('/instructor/modules')} className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Manage Modules</button></article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold text-slate-900 dark:text-white">Module assignments</h2><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Create MCQ and coding assessments with answer keys and test cases.</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">Assessments</span></div><button type="button" onClick={() => navigate('/instructor/assignments/create')} className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Create Assignment</button></article>
      </section>

      <section className="mt-7 grid gap-5 lg:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"><h2 className="text-lg font-semibold text-slate-900 dark:text-white">Student submissions</h2><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">View submitted assessments and automatic results.</p><button type="button" onClick={() => navigate('/instructor/student-submissions')} className="mt-5 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-300">View submissions →</button></article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"><h2 className="text-lg font-semibold text-slate-900 dark:text-white">Certificates report</h2><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Monitor learner certificate completion and records.</p><button type="button" onClick={() => navigate('/instructor/certificates')} className="mt-5 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-300">View certificates →</button></article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"><h2 className="text-lg font-semibold text-slate-900 dark:text-white">Live class and breakouts</h2><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Manage live classes, polls, chat, and breakout rooms.</p><button type="button" onClick={() => navigate('/forum/studio')} className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Open Live Studio</button></article>
      </section>
    </div>
  );
}
