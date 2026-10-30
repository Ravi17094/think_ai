import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { createModule } from "../../api/moduleApi";
import { getCourses } from "../../api/courseApi";
import InputField from "../../components/common/InputField";

function AddModule() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [saving, setSaving] = useState(false);

  const [module, setModule] = useState({
    title: "",
    description: "",
    courseId: "",
  });

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const response = await getCourses();
      setCourses(response.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load courses");
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

    if (!module.courseId) {
      toast.error("Please select a course");
      return;
    }

    try {
      setSaving(true);
      await createModule(module);
      toast.success("Module Added Successfully", { theme: "dark" });
      navigate("/admin/modules");
    } catch (error) {
      console.error(error);
      const message = error.response?.data?.message || "Failed to Add Module";
      toast.error(message, { theme: "dark" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative flex flex-col h-full space-y-4 sm:space-y-6 -mt-2 overflow-hidden pb-2">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 max-w-3xl mx-auto w-full">
        <div>
          <h1 className="text-2xl font-semibold text-white">Add Module</h1>
          <p className="text-sm text-gray-400 mt-1">Create a new module under a course.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/admin/modules")}
          className="text-xs px-3.5 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-gray-500 transition-all uppercase tracking-wider font-semibold"
        >
          ← Back
        </button>
      </div>

      {/* Form Card */}
      <div className="flex-1 overflow-auto glass-panel rounded-2xl p-6 sm:p-8 bg-[#1A1F2B] border border-gray-800 custom-scrollbar max-w-3xl mx-auto w-full">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="sm:col-span-2 flex flex-col space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Module Title</label>
            <InputField
              type="text"
              name="title"
              value={module.title}
              onChange={handleChange}
              placeholder="Enter module title"
              required
            />
          </div>

          <div className="sm:col-span-2 flex flex-col space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Course</label>
            <select
              name="courseId"
              value={module.courseId}
              onChange={handleChange}
              className="bg-[#0B0F19] border border-gray-700/80 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-cyan-500 transition-all cursor-pointer"
              required
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
              placeholder="Enter module description"
              rows={4}
              className="bg-[#0B0F19] border border-gray-700/80 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-cyan-500 transition-all resize-none"
            />
          </div>

          <div className="col-span-1 sm:col-span-2 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 text-sm font-bold bg-gradient-to-r from-indigo-500 to-cyan-400 hover:from-indigo-400 hover:to-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed text-white border-0 rounded-xl transition-all duration-300 shadow-lg hover:shadow-cyan-500/50 uppercase tracking-wider"
            >
              {saving ? "Saving..." : "Save Module"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddModule;