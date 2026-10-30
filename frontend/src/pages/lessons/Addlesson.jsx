import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { createLesson } from "../../api/lessonApi";
import { getModules } from "../../api/moduleApi";
import InputField from "../../components/common/InputField";

function AddLesson() {
  const navigate = useNavigate();
  const [modules, setModules] = useState([]);

  const [lesson, setLesson] = useState({
    title: "",
    moduleId: "",
    videoUrl: "",
    content: "",
    duration: "",
    order: "",
  });

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    try {
      const response = await getModules();
      setModules(response.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load modules");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLesson({
      ...lesson,
      [name]:
        name === "moduleId" || name === "duration" || name === "order"
          ? value === "" ? "" : Number(value)
          : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: lesson.title,
        moduleId: Number(lesson.moduleId),
        videoUrl: lesson.videoUrl,
        content: lesson.content,
        duration: lesson.duration === "" ? 0 : Number(lesson.duration),
        order: lesson.order === "" ? 0 : Number(lesson.order),
      };

      await createLesson(payload);
      toast.success("Lesson Added Successfully", { theme: "dark" });
      navigate("/admin/lessons");
    } catch (error) {
      console.error(error);
      toast.error("Failed to Add Lesson", { theme: "dark" });
    }
  };

  return (
    <div className="relative flex flex-col space-y-4 sm:space-y-6 -mt-2 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 max-w-3xl mx-auto w-full">
        <div>
          <h1 className="text-2xl font-semibold text-white">Add Lesson</h1>
          <p className="text-sm text-gray-400 mt-1">Create a new lesson under a module.</p>
        </div>
      </div>

      {/* Form Card */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 bg-[#1A1F2B] border border-gray-800 max-w-3xl mx-auto w-full">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="flex flex-col space-y-1 sm:col-span-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Lesson Title</label>
            <InputField
              type="text"
              name="title"
              value={lesson.title}
              onChange={handleChange}
              placeholder="Enter lesson title"
              required
            />
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Module</label>
            <select
              name="moduleId"
              value={lesson.moduleId}
              onChange={handleChange}
              className="bg-[#0B0F19] border border-gray-700/80 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-cyan-500 transition-all"
              required
            >
              <option value="">Select Module</option>
              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Duration (minutes)</label>
            <InputField
              type="number"
              name="duration"
              value={lesson.duration}
              onChange={handleChange}
              placeholder="Enter duration"
              required
            />
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Order</label>
            <InputField
              type="number"
              name="order"
              value={lesson.order}
              onChange={handleChange}
              placeholder="Position within module"
            />
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Video URL</label>
            <InputField
              type="text"
              name="videoUrl"
              value={lesson.videoUrl}
              onChange={handleChange}
              placeholder="https://..."
            />
          </div>

          <div className="col-span-1 sm:col-span-2 flex flex-col space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Content</label>
            <textarea
              name="content"
              value={lesson.content}
              onChange={handleChange}
              rows={5}
              placeholder="Lesson notes / description"
              className="bg-[#0B0F19] border border-gray-700/80 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-cyan-500 transition-all resize-none"
            />
          </div>

          <div className="col-span-1 sm:col-span-2 pt-4">
            <button
              type="submit"
              className="w-full py-3.5 text-sm font-bold bg-gradient-to-r from-indigo-500 to-cyan-400 hover:from-indigo-400 hover:to-cyan-300 text-white border-0 rounded-xl transition-all duration-300 shadow-lg hover:shadow-cyan-500/50 uppercase tracking-wider"
            >
              Save Lesson
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddLesson;