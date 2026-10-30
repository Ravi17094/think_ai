import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCourseById } from "../../api/courseApi";

function CourseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);

  useEffect(() => {
    loadCourse();
  }, []);

  const loadCourse = async () => {
    try {
      const response = await getCourseById(id);
      setCourse(response.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  if (!course) {
    return (
      <h2 className="text-xl text-center mt-10">
        Loading...
      </h2>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-8">

      <div className="flex justify-between items-center mb-6">

        <h1 className="text-3xl font-bold">
          Course Details
        </h1>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg"
        >
          ← Back
        </button>

      </div>

      <div className="grid grid-cols-2 gap-6">

        <div className="bg-gray-100 p-5 rounded-lg">
          <h3 className="text-gray-500 font-semibold">
            Title
          </h3>
          <p className="text-xl font-bold mt-2">
            {course.title}
          </p>
        </div>

        <div className="bg-gray-100 p-5 rounded-lg">
          <h3 className="text-gray-500 font-semibold">
            Category
          </h3>
          <p className="text-xl font-bold mt-2">
            {course.category}
          </p>
        </div>

        <div className="bg-gray-100 p-5 rounded-lg">
          <h3 className="text-gray-500 font-semibold">
            Price
          </h3>
          <p className="text-xl font-bold mt-2">
            ₹ {course.price}
          </p>
        </div>

        <div className="bg-gray-100 p-5 rounded-lg">
          <h3 className="text-gray-500 font-semibold">
            Duration
          </h3>
          <p className="text-xl font-bold mt-2">
            {course.duration}
          </p>
        </div>

        <div className="bg-gray-100 p-5 rounded-lg">
          <h3 className="text-gray-500 font-semibold">
            Status
          </h3>

          <span
            className={`px-3 py-1 rounded-full text-white ${
              course.status === "ACTIVE"
                ? "bg-green-600"
                : "bg-red-600"
            }`}
          >
            {course.status}
          </span>
        </div>

        <div className="bg-gray-100 p-5 rounded-lg">
          <h3 className="text-gray-500 font-semibold">
            Thumbnail
          </h3>
          <p className="text-xl font-bold mt-2">
            {course.thumbnail}
          </p>
        </div>

        <div className="bg-gray-100 p-5 rounded-lg col-span-2">
          <h3 className="text-gray-500 font-semibold">
            Description
          </h3>
          <p className="text-lg mt-2">
            {course.description}
          </p>
        </div>

      </div>

    </div>
  );
}

export default CourseDetails;