import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { getModuleById } from "../../api/moduleApi";
import { DetailsSkeleton } from "../../components/common/LoadingSkeleton";

export default function ModuleDetails() {
  const { id } = useParams();

  const [module, setModule] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModule();
  }, [id]);

  const loadModule = async () => {
    try {
      setLoading(true);
      const response = await getModuleById(id);
      setModule(response.data.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load module");
      setModule(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <DetailsSkeleton />;
  }

  if (!module) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="text-cyan-400 text-xl font-semibold animate-pulse">
          Loading Module...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Module - {module.title}</h1>
          <p className="text-sm text-gray-400 mt-1">Module information</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={`/admin/modules/edit/${module.id}`}
            className="px-4 py-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-lg text-sm font-medium hover:bg-cyan-500/20 transition-colors"
          >
            Edit Module
          </Link>
        </div>
      </div>

      <div className="bg-[#112435] border border-gray-800 rounded-2xl p-8 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -z-10" />

        <div className="space-y-6">
          <div>
            <p className="text-sm text-gray-400 mb-1">Module Title</p>
            <p className="text-lg font-medium text-white">{module.title}</p>
          </div>

          <div>
            <p className="text-sm text-gray-400 mb-1">Associated Course</p>
            <p className="text-lg text-cyan-400 font-medium">{module.course?.title || "N/A"}</p>
          </div>

          <div>
            <p className="text-sm text-gray-400 mb-1">Description</p>
            <p className="text-white text-sm leading-relaxed">{module.description || "No description provided."}</p>
          </div>
        </div>
      </div>
    </div>
  );
}