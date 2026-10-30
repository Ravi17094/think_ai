import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { getUserById } from "../../api/userApi";
import { DetailsSkeleton } from "../../components/common/LoadingSkeleton";

function UserDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, [id]);

  const loadUser = async () => {
    try {
      setLoading(true);

      const response = await getUserById(id);

      setUser(response.data.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load user");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <DetailsSkeleton />;
  }

  if (!user) {
    return (
      <div className="bg-[#1A1F2B] border border-gray-800 rounded-2xl p-12 text-center">

        <div className="text-5xl mb-4">
          👤
        </div>

        <h2 className="text-2xl font-semibold text-gray-300">
          User Not Found
        </h2>

        <p className="text-gray-500 mt-2">
          The user you are looking for does not exist.
        </p>

        <button
          type="button"
          onClick={() => navigate("/admin/users")}
          className="mt-6 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-5 py-3 rounded-xl transition"
        >
          ← Back to Users
        </button>

      </div>
    );
  }

  return (
    <div>

      <div className="flex justify-between items-center mb-8">

        <div>
          <h1 className="text-3xl font-bold text-white">
            User Details
          </h1>

          <p className="text-gray-400 mt-1">
            View complete user information.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/admin/users")}
          className="px-5 py-3 rounded-xl bg-[#1A1F2B] border border-gray-700 text-cyan-400 hover:bg-[#22283A] transition"
        >
          ← Back
        </button>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div className="bg-[#1A1F2B] border border-gray-800 rounded-2xl p-6">

          <p className="text-gray-400 text-sm">
            Name
          </p>

          <h2 className="text-white text-xl font-semibold mt-2">
            {user.name}
          </h2>

        </div>

        <div className="bg-[#1A1F2B] border border-gray-800 rounded-2xl p-6">

          <p className="text-gray-400 text-sm">
            Email
          </p>

          <h2 className="text-white text-xl font-semibold mt-2">
            {user.email}
          </h2>

        </div>

        <div className="bg-[#1A1F2B] border border-gray-800 rounded-2xl p-6">

          <p className="text-gray-400 text-sm">
            Role
          </p>

          <h2 className="text-white text-xl font-semibold mt-2">
            {user.role}
          </h2>

        </div>

        <div className="bg-[#1A1F2B] border border-gray-800 rounded-2xl p-6">

          <p className="text-gray-400 text-sm">
            Status
          </p>

          <span
            className={`inline-block mt-2 px-4 py-2 rounded-full text-sm font-semibold ${
              user.status === "ACTIVE"
                ? "bg-green-500/20 text-green-400"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            {user.status}
          </span>

        </div>

        <div className="md:col-span-2 bg-[#1A1F2B] border border-gray-800 rounded-2xl p-6">

          <p className="text-gray-400 text-sm">
            Joined On
          </p>

          <p className="text-gray-300 mt-2">
            {user.createdAt
              ? new Date(user.createdAt).toLocaleDateString()
              : "N/A"}
          </p>

        </div>

      </div>

    </div>
  );
}

export default UserDetails;