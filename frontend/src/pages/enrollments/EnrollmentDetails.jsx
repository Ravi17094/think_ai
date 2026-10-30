import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getEnrollmentById } from "../../api/enrollmentApi";

function EnrollmentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [enrollment, setEnrollment] = useState(null);

  useEffect(() => {
    loadEnrollment();
  }, []);

  const loadEnrollment = async () => {
    try {
      const response = await getEnrollmentById(id);
      setEnrollment(response.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  if (!enrollment) {
    return (
      <div className="text-center text-xl mt-10">
        Loading...
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-8">

      <div className="flex justify-between items-center mb-6">

        <h1 className="text-3xl font-bold">
          Enrollment Details
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
            Student Name
          </h3>
          <p className="text-xl font-bold mt-2">
            {enrollment.studentName}
          </p>
        </div>

        <div className="bg-gray-100 p-5 rounded-lg">
          <h3 className="text-gray-500 font-semibold">
            Student Email
          </h3>
          <p className="text-xl font-bold mt-2">
            {enrollment.studentEmail}
          </p>
        </div>

        <div className="bg-gray-100 p-5 rounded-lg">
          <h3 className="text-gray-500 font-semibold">
            Batch
          </h3>
          <p className="text-xl font-bold mt-2">
            {enrollment.batch?.name}
          </p>
        </div>

        <div className="bg-gray-100 p-5 rounded-lg">
          <h3 className="text-gray-500 font-semibold">
            Status
          </h3>

          <span
            className={`px-3 py-1 rounded-full text-white ${
              enrollment.enrollmentStatus === "ACTIVE"
                ? "bg-green-600"
                : "bg-red-600"
            }`}
          >
            {enrollment.enrollmentStatus}
          </span>
        </div>

        <div className="bg-gray-100 p-5 rounded-lg col-span-2">
          <h3 className="text-gray-500 font-semibold">
            Enrolled On
          </h3>
          <p className="text-xl font-bold mt-2">
            {new Date(enrollment.enrolledAt).toLocaleDateString()}
          </p>
        </div>

      </div>

    </div>
  );
}

export default EnrollmentDetails;