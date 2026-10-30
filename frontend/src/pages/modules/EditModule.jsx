import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { getModuleById, updateModule } from "../../api/moduleApi";
import { getCourses } from "../../api/courseApi";
import InputField from "../../components/common/InputField";

function EditModule() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);

  const [module, setModule] = useState({
    title: "",
    description: "",
    courseId: "",
  });

  useEffect(() => {
    loadCourses();
    loadModule();
  }, [id]);

  const loadCourses = async () => {
    try {
      const response = await getCourses();
      setCourses(response.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load courses");
    }
  };

  const loadModule = async () => {
    try {
      const response = await getModuleById(id);
      const data = response.data.data;

      setModule({
        title: data.title || "",
        description: data.description || "",
        courseId: data.courseId || data.course?.id || "",
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to load module");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setModule({
      ...module,
      [name]: name === "courseId" ? Number(value) : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Note: backend updateModule only writes title/description — courseId
      // isn't reassignable via PUT per moduleService.js. Sent anyway in case
      // that changes; backend will just ignore it if unused.
      const payload = {
        title: module.title,
        description: module.description,
      };

      await updateModule(id, payload);
      toast.success("Module Updated Successfully", { theme: "dark" });
      navigate("/admin/modules");
    } catch (error) {
      console.error(error);
      toast.error("Failed to Update Module", { theme: "dark" });
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-7">
        <div>
          <h1 className="text-3xl font-bold text-white">Edit Module</h1>
          <p className="text-gray-400 mt-1">Update module information.</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-[#1A1F2B] border border-gray-800 rounded-2xl p-8 grid grid-cols-1 sm:grid-cols-2 gap-6"
      >
        <div className="sm:col-span-2 flex flex-col space-y-1">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Module Title</label>
          <InputField
            type="text"
            name="title"
            value={module.title}
            onChange={handleChange}
            placeholder="Module title"
            required
          />
        </div>

        <div className="sm:col-span-2 flex flex-col space-y-1">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Course</label>
          <select
            name="courseId"
            value={module.courseId}
            onChange={handleChange}
            disabled
            title="Course cannot be changed after creation"
            className="bg-[#0B0F19] border border-gray-700 rounded-xl p-3 text-gray-400 cursor-not-allowed opacity-60"
          >
            <option value="">Select Course</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2 flex flex-col space-y-1">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</label>
          <textarea
            name="description"
            value={module.description}
            onChange={handleChange}
            rows={4}
            className="bg-[#0B0F19] border border-gray-700 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-cyan-500 resize-none"
          />
        </div>

        <div className="col-span-1 sm:col-span-2 flex justify-center pt-2">
          <button
            type="submit"
            className="px-8 py-3.5 text-sm font-bold bg-gradient-to-r from-indigo-500 to-cyan-400 hover:from-indigo-400 hover:to-cyan-300 text-white border-0 rounded-xl transition-all duration-300 shadow-lg hover:shadow-cyan-500/50 uppercase tracking-wider"
          >
            Update Module
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditModule;