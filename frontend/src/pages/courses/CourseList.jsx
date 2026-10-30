import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { getCourses, deleteCourse } from "../../api/courseApi";

function CourseList() {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchCourses(search);
  }, [search]);

  const fetchCourses = async (searchText = "") => {
    try {
      const response = await getCourses(searchText);
      setCourses(response.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load courses");
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this course?"
    );

    if (!confirmDelete) return;

    try {
      await deleteCourse(id);

      toast.success("Course deleted successfully");

      fetchCourses(search);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete course");
    }
  };

  return (
    <div>

      <div className="flex justify-between items-center mb-6">

        <h1 className="text-3xl font-bold">
          Course Management
        </h1>

        <div className="flex items-center gap-3">

          <input
            type="text"
            placeholder="🔍 Search Course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-4 py-2 w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <Link
            to="/courses/add"
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg"
          >
            + Add Course
          </Link>

        </div>

      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">

        <table className="w-full">

          <thead className="bg-blue-600 text-white">

            <tr>
              <th className="p-3">ID</th>
              <th>Title</th>
              <th>Description</th>
              <th>Category</th>
              <th>Price</th>
              <th>Duration</th>
              <th>Status</th>
              <th className="p-3">Actions</th>
            </tr>

          </thead>

          <tbody>

            {courses.length > 0 ? (

              courses.map((course) => (

                <tr
                  key={course.id}
                  className="border-b hover:bg-gray-100"
                >

                  <td className="p-3 text-center">
                    {course.id}
                  </td>

                  <td>{course.title}</td>

                  <td>{course.description}</td>

                  <td>{course.category}</td>

                  <td>₹ {course.price}</td>

                  <td>{course.duration}</td>

                  <td>
                    <span
                      className={`px-3 py-1 rounded-full text-white text-sm ${
                        course.status === "ACTIVE"
                          ? "bg-green-500"
                          : "bg-red-500"
                      }`}
                    >
                      {course.status}
                    </span>
                  </td>

                  <td>

                    <div className="flex justify-center gap-2">

                      <Link
                        to={`/courses/${course.id}`}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                      >
                        View
                      </Link>

                      <Link
                        to={`/courses/edit/${course.id}`}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded"
                      >
                        Edit
                      </Link>

                      <button
                        onClick={() => handleDelete(course.id)}
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
                  colSpan="8"
                  className="text-center py-8 text-gray-500"
                >
                  No Courses Found
                </td>

              </tr>

            )}

          </tbody>

        </table>

      </div>

    </div>
  );
}

export default CourseList;