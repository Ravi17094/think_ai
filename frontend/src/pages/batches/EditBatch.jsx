import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getBatchById, updateBatch } from "../../api/batchApi";
import { getCourses } from "../../api/courseApi";

function EditBatch() {
  const { id } = useParams();
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
    loadBatch();
  }, []);

  const loadCourses = async () => {
    try {
      const response = await getCourses();
      setCourses(response.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadBatch = async () => {
    try {
      const response = await getBatchById(id);

      const data = response.data.data;

      // ✅ Only keep editable fields
      setBatch({
        name: data.name,
        courseId: data.courseId,
        instructorName: data.instructorName,
        capacity: data.capacity,
        startDate: data.startDate.split("T")[0],
        endDate: data.endDate.split("T")[0],
        status: data.status,
      });

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

      // ✅ Send only allowed fields
      const payload = {
        name: batch.name,
        courseId: Number(batch.courseId),
        instructorName: batch.instructorName,
        capacity: Number(batch.capacity),
        startDate: new Date(batch.startDate).toISOString(),
        endDate: new Date(batch.endDate).toISOString(),
        status: batch.status,
      };

      await updateBatch(id, payload);

      alert("Batch Updated Successfully");

      navigate("/batches");

    } catch (error) {
      console.error(error);

      if (error.response) {
        console.log(error.response.data);
      }

      alert("Update Failed");
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-8">

      <h1 className="text-3xl font-bold mb-6">
        Edit Batch
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
          Update Batch
        </button>

      </form>

    </div>
  );
}

export default EditBatch;