import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getEnrollmentById,
  updateEnrollment,
} from "../../api/enrollmentApi";
import { getBatches } from "../../api/batchApi";

function EditEnrollment() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [batches, setBatches] = useState([]);

  const [enrollment, setEnrollment] = useState({
    studentName: "",
    studentEmail: "",
    batchId: "",
    enrollmentStatus: "ACTIVE",
  });

  useEffect(() => {
    loadBatches();
    loadEnrollment();
  }, []);

  const loadBatches = async () => {
    try {
      const response = await getBatches();
      setBatches(response.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load batches");
    }
  };

  const loadEnrollment = async () => {
    try {
      const response = await getEnrollmentById(id);

      const data = response.data.data;

      setEnrollment({
        studentName: data.studentName,
        studentEmail: data.studentEmail,
        batchId: data.batchId,
        enrollmentStatus: data.enrollmentStatus,
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to load enrollment");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setEnrollment({
      ...enrollment,
      [name]: name === "batchId" ? Number(value) : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await updateEnrollment(id, enrollment);

      toast.success("Enrollment Updated Successfully");

      navigate("/enrollments");
    } catch (error) {
      console.error(error);

      if (error.response) {
        console.log(error.response.data);
      }

      toast.error("Failed to Update Enrollment");
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-8">

      <div className="flex justify-between items-center mb-6">

        <h1 className="text-3xl font-bold">
          Edit Enrollment
        </h1>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg"
        >
          ← Back
        </button>

      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-2 gap-5"
      >

        <input
          type="text"
          name="studentName"
          placeholder="Student Name"
          value={enrollment.studentName}
          onChange={handleChange}
          className="border p-3 rounded"
          required
        />

        <input
          type="email"
          name="studentEmail"
          placeholder="Student Email"
          value={enrollment.studentEmail}
          onChange={handleChange}
          className="border p-3 rounded"
          required
        />

        <select
          name="batchId"
          value={enrollment.batchId}
          onChange={handleChange}
          className="border p-3 rounded"
          required
        >
          <option value="">Select Batch</option>

          {batches.map((batch) => (
            <option
              key={batch.id}
              value={batch.id}
            >
              {batch.name}
            </option>
          ))}
        </select>

        <select
          name="enrollmentStatus"
          value={enrollment.enrollmentStatus}
          onChange={handleChange}
          className="border p-3 rounded"
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>

        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded col-span-2"
        >
          Update Enrollment
        </button>

      </form>

    </div>
  );
}

export default EditEnrollment;