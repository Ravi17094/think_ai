import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Award, CheckCircle, Clock, UserCheck } from 'lucide-react';

export default function InstructorCertificates() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentProgress();
  }, []);

  const fetchStudentProgress = async () => {
    try {
      const response = await axios.get("/api/instructor/students-progress", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (response.data.success) {
        setStudents(response.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch students progress:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-slate-400">Loading student records...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Student Certificates & Progress</h1>
          <p className="text-xs text-slate-400 mt-1">Review student eligibility (Req: &gt;= 80% Lessons, &gt;= 40% Assignments)</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1a1e2b] border border-slate-200 dark:border-[#262b38] rounded-3xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-[#222736] text-slate-500 dark:text-slate-400 uppercase font-mono border-b border-slate-200 dark:border-[#3e4658]">
              <th className="p-4">Student Name</th>
              <th className="p-4">Course</th>
              <th className="p-4">Lesson Watch Progress</th>
              <th className="p-4">Assignment Average</th>
              <th className="p-4">Eligibility Status</th>
              <th className="p-4 text-right">Certificate Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {students.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-6 text-center text-slate-400">No enrolled students found.</td>
              </tr>
            ) : (
              students.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[#222736]/50 transition">
                  <td className="p-4 font-semibold text-slate-900 dark:text-white">
                    {item.student.name}
                    <div className="text-[10px] text-slate-400 font-normal">{item.student.email}</div>
                  </td>
                  <td className="p-4">{item.course.title}</td>
                  <td className="p-4 font-mono font-bold text-purple-500">{item.lessonPercentage}%</td>
                  <td className="p-4 font-mono font-bold text-indigo-400">{item.assignmentScoreAverage}%</td>
                  <td className="p-4">
                    {item.isEligible ? (
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-semibold">
                        Eligible
                      </span>
                    ) : (
                      <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full font-semibold">
                        Not Eligible
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {item.certificateIssued ? (
                      <a
                        href={item.certificateUrl || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider transition shadow"
                      >
                        <Award size={13} /> View Certificate
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">Pending Requirement</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}