import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { getCourseById, updateCourse } from "../../api/courseApi";

function EditCourse() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState({
    title: "",
    description: "",
    category: "",
    price: "",
    duration: "",
    thumbnail: "",
    status: "ACTIVE",
  });

  useEffect(() => {
    loadCourse();
  }, []);

  const loadCourse = async () => {
    try {
      const response = await getCourseById(id);

      const data = response.data.data;

      setCourse({
        title: data.title,
        description: data.description,
        category: data.category,
        price: data.price,
        duration: data.duration,
        thumbnail: data.thumbnail,
        status: data.status,
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to load course");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setCourse({
      ...course,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        title: course.title,
        description: course.description,
        category: course.category,
        price: Number(course.price),
        duration: course.duration,
        thumbnail: course.thumbnail,
        status: course.status,
      };

      await updateCourse(id, payload);

      toast.success("Course Updated Successfully");

      navigate("/courses");
    } catch (error) {
      console.error(error);

      if (error.response) {
        console.log(error.response.data);
      }

      toast.error("Failed to Update Course");
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow">

      <div className="flex justify-between items-center mb-6">

        <h1 className="text-3xl font-bold">
          Edit Course
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
          name="title"
          placeholder="Course Title"
          value={course.title}
          onChange={handleChange}
          className="border p-3 rounded"
          required
        />

        <input
          type="text"
          name="category"
          placeholder="Category"
          value={course.category}
          onChange={handleChange}
          className="border p-3 rounded"
          required
        />

        <input
          type="number"
          name="price"
          placeholder="Price"
          value={course.price}
          onChange={handleChange}
          className="border p-3 rounded"
          required
        />

        <input
          type="text"
          name="duration"
          placeholder="Duration"
          value={course.duration}
          onChange={handleChange}
          className="border p-3 rounded"
          required
        />

        <input
          type="text"
          name="thumbnail"
          placeholder="Thumbnail"
          value={course.thumbnail}
          onChange={handleChange}
          className="border p-3 rounded"
        />

        <select
          name="status"
          value={course.status}
          onChange={handleChange}
          className="border p-3 rounded"
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>

        <textarea
          name="description"
          placeholder="Description"
          value={course.description}
          onChange={handleChange}
          className="border p-3 rounded col-span-2"
          rows="5"
          required
        />

        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded col-span-2"
        >
          Update Course
        </button>

      </form>

    </div>
  );
}

export default EditCourse;