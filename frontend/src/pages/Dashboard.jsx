import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCourses } from "../api/courseApi";
import { getBatches } from "../api/batchApi";
import { getEnrollments } from "../api/enrollmentApi";
import { FaBook, FaUsers, FaUserGraduate } from "react-icons/fa";

function Dashboard() {
  const [stats, setStats] = useState({
    courses: 0,
    batches: 0,
    enrollments: 0,
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [coursesRes, batchesRes, enrollmentsRes] =
        await Promise.all([
          getCourses(),
          getBatches(),
          getEnrollments(),
        ]);

      setStats({
        courses: coursesRes.data.data.length,
        batches: batchesRes.data.data.length,
        enrollments: enrollmentsRes.data.data.length,
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>

      <h1 className="text-3xl font-bold text-black mb-8">
        Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <Link
          to="/courses"
          className="bg-white rounded-xl shadow-lg p-6 flex items-center justify-between hover:shadow-2xl hover:scale-105 transition-all duration-300"
        >
          <div>
            <h2 className="text-xl font-semibold text-black">
              Total Courses
            </h2>

            <p className="text-5xl font-bold text-blue-600 mt-4">
              {stats.courses}
            </p>
          </div>

          <FaBook className="text-6xl text-blue-600" />
        </Link>

        <Link
          to="/batches"
          className="bg-white rounded-xl shadow-lg p-6 flex items-center justify-between hover:shadow-2xl hover:scale-105 transition-all duration-300"
        >
          <div>
            <h2 className="text-xl font-semibold text-black">
              Total Batches
            </h2>

            <p className="text-5xl font-bold text-green-600 mt-4">
              {stats.batches}
            </p>
          </div>

          <FaUsers className="text-6xl text-green-600" />
        </Link>

        <Link
          to="/enrollments"
          className="bg-white rounded-xl shadow-lg p-6 flex items-center justify-between hover:shadow-2xl hover:scale-105 transition-all duration-300"
        >
          <div>
            <h2 className="text-xl font-semibold text-black">
              Total Enrollments
            </h2>

            <p className="text-5xl font-bold text-purple-600 mt-4">
              {stats.enrollments}
            </p>
          </div>

          <FaUserGraduate className="text-6xl text-purple-600" />
        </Link>

      </div>

    </div>
  );
}

export default Dashboard;