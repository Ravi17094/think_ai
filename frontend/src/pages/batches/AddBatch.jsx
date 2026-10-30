import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createBatch } from "../../api/batchApi";
import { getCourses } from "../../api/courseApi";

function AddBatch() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);

  const [batch, setBatch] = useState({
    name: "",
    courseId: "",
    instructorName: "",
    capacity: "",
    startDate: "",
    endDate: "",
    status: "ACTIVE",
  });

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const response = await getCourses();
      setCourses(response.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setBatch({
      ...batch,
      [name]:
        name === "courseId" || name === "capacity"
          ? Number(value)
          : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...batch,
        startDate: new Date(batch.startDate).toISOString(),
        endDate: new Date(batch.endDate).toISOString(),
      };

      await createBatch(payload);

      alert("Batch Added Successfully");

      navigate("/batches");
    } catch (error) {
      console.error(error);

      if (error.response) {
        console.log(error.response.data);
      }

      alert("Failed to Add Batch");
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-8">
      <h1 className="text-3xl font-bold mb-6">
        Add Batch
      </h1>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-2 gap-5"
      >
        <input
          type="text"
          name="name"
          placeholder="Batch Name"
          value={batch.name}
          onChange={handleChange}
          className="border p-3 rounded"
          required
        />

        <select
          name="courseId"
          value={batch.courseId}
          onChange={handleChange}
          className="border p-3 rounded"
          required
        >
          <option value="">Select Course</option>

          {courses.map((course) => (
            <option
              key={course.id}
              value={course.id}
            >
              {course.title}
            </option>
          ))}
        </select>

        <input
          type="text"
          name="instructorName"
          placeholder="Instructor Name"
          value={batch.instructorName}
          onChange={handleChange}
          className="border p-3 rounded"
          required
        />

        <input
          type="number"
          name="capacity"
          placeholder="Capacity"
          value={batch.capacity}
          onChange={handleChange}
          className="border p-3 rounded"
          required
        />

        <input
          type="date"
          name="startDate"
          value={batch.startDate}
          onChange={handleChange}
          className="border p-3 rounded"
          required
        />

        <input
          type="date"
          name="endDate"
          value={batch.endDate}
          onChange={handleChange}
          className="border p-3 rounded"
          required
        />

        <select
          name="status"
          value={batch.status}
          onChange={handleChange}
          className="border p-3 rounded col-span-2"
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>

        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded col-span-2"
        >
          Save Batch
        </button>
      </form>
    </div>
  );
}

export default AddBatch;