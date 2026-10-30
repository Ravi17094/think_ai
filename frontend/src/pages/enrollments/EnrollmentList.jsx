import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getEnrollments,
  deleteEnrollment,
} from "../../api/enrollmentApi";

function EnrollmentList() {
  const [enrollments, setEnrollments] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    try {
      const response = await getEnrollments();
      setEnrollments(response.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load enrollments");
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this enrollment?"
    );

    if (!confirmDelete) return;

    try {
      await deleteEnrollment(id);

      toast.success("Enrollment deleted successfully");

      fetchEnrollments();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete enrollment");
    }
  };

  const filteredEnrollments = enrollments.filter(
    (enrollment) =>
      enrollment.studentName
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||
      enrollment.studentEmail
        ?.toLowerCase()
        .includes(search.toLowerCase())
  );

  return (
    <div>

      <div className="flex justify-between items-center mb-6">

        <h1 className="text-3xl font-bold">
          Enrollment Management
        </h1>

        <div className="flex items-center gap-3">

          <input
            type="text"
            placeholder="🔍 Search Student..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-4 py-2 w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <Link
            to="/enrollments/add"
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg"
          >
            + Add Enrollment
          </Link>

        </div>

      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">

        <table className="w-full">

          <thead className="bg-blue-600 text-white">

            <tr>
              <th className="p-3">ID</th>
              <th>Student</th>
              <th>Email</th>
              <th>Batch</th>
              <th>Status</th>
              <th>Enrolled On</th>
              <th className="p-3">Actions</th>
            </tr>

          </thead>

          <tbody>

            {filteredEnrollments.length > 0 ? (

              filteredEnrollments.map((enrollment) => (

                <tr
                  key={enrollment.id}
                  className="border-b hover:bg-gray-100"
                >

                  <td className="p-3 text-center">
                    {enrollment.id}
                  </td>

                  <td>{enrollment.studentName}</td>

                  <td>{enrollment.studentEmail}</td>

                  <td>{enrollment.batch?.name}</td>

                  <td>

                    <span
                      className={`px-3 py-1 rounded-full text-white text-sm ${
                        enrollment.enrollmentStatus === "ACTIVE"
                          ? "bg-green-500"
                          : "bg-red-500"
                      }`}
                    >
                      {enrollment.enrollmentStatus}
                    </span>

                  </td>

                  <td>
                    {new Date(enrollment.enrolledAt).toLocaleDateString()}
                  </td>

                  <td>

                    <div className="flex justify-center gap-2">

                      <Link
                        to={`/enrollments/${enrollment.id}`}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                      >
                        View
                      </Link>

                      <Link
                        to={`/enrollments/edit/${enrollment.id}`}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded"
                      >
                        Edit
                      </Link>

                      <button
                        onClick={() => handleDelete(enrollment.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                      >
                        Delete
                      </button>

                    </div>

                  </td>

                </tr>

              ))

            ) : (

              <tr>

                <td
                  colSpan="7"
                  className="text-center py-8 text-gray-500"
                >
                  No Enrollments Found
                </td>

              </tr>

            )}

          </tbody>

        </table>

      </div>

    </div>
  );
}

export default EnrollmentList;