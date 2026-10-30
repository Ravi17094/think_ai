import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getUsers,
  deleteUser,
  updateUser,
} from "../../api/userApi";
import { CourseListSkeleton } from "../../components/common/LoadingSkeleton";

function UserList() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers(search);
  }, [search]);

  const fetchUsers = async (searchText = "") => {
  setLoading(true);
  try {
    const response = await getUsers(searchText);
    setUsers(response.data.data || []);
  } catch (error) {
    console.error(error);
    toast.error("Failed to load users");
  } finally {
    setLoading(false);
  }

  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this user?"
    );

    if (!confirmDelete) return;

    try {
      await deleteUser(id);

      toast.success("User deleted successfully");

      fetchUsers(search);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete user");
    }
  };

  if (loading) {
    return <CourseListSkeleton />;
  }

  const handleToggleStatus = async (user) => {
    try {
      const updatedUser = {
        ...user,
        status: user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      };

      await updateUser(user.id, updatedUser);

      toast.success(
        `User ${updatedUser.status === "ACTIVE" ? "Activated" : "Deactivated"
        } Successfully`
      );

      fetchUsers(search);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update user status");
    }
  };

  return (
    <div className="space-y-6">

      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">

        <div>
          <h1 className="text-3xl font-bold text-white">
            User Management
          </h1>

          <p className="text-gray-400 mt-1">
            Manage all registered users.
          </p>
        </div>

        <div className="flex gap-3">

          <input
            type="text"
            placeholder="Search User..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-72 bg-[#0B0F19] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
          />

          <div className="shadow-[0_0_20px_rgba(168,85,247,0.3)] rounded-xl">
            <Link
              to="/admin/users/add"
              className="px-6 py-2 text-sm font-bold bg-gradient-to-r from-indigo-500 to-cyan-400 hover:from-indigo-400 hover:to-cyan-300 text-white border-0 rounded-xl transition-all duration-300 shadow-lg hover:shadow-cyan-500/50 inline-block"
            >
              + Add User
            </Link>
          </div>

        </div>

      </div>

      <div className="bg-[#1A1F2B] rounded-2xl border border-gray-800 shadow-lg overflow-hidden">

        <table className="w-full">

          <thead className="bg-[#0B0F19] border-b border-gray-800">

            <tr className="text-cyan-400">

              <th className="p-4 text-left">ID</th>
              <th className="text-left">Name</th>
              <th className="text-left">Email</th>
              <th className="text-left">Role</th>
              <th className="text-left">Status</th>
              <th className="text-center">Actions</th>

            </tr>

          </thead>

          <tbody>

            {users.length > 0 ? (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-gray-800 hover:bg-[#22283A] transition"
                >
                  <td className="p-4 text-gray-300">
                    {user.id}
                  </td>

                  <td className="text-white font-medium">
                    {user.name}
                  </td>

                  <td className="text-gray-400">
                    {user.email}
                  </td>

                  <td className="text-gray-300">
                    {user.role}
                  </td>

                  <td>
                    <div className="flex items-center gap-2">

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${user.status === "ACTIVE"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                          }`}
                      >
                        {user.status}
                      </span>

                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition ${user.status === "ACTIVE"
                            ? "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
                            : "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                          }`}
                      >
                        {user.status === "ACTIVE" ? "Deactivate" : "Activate"}
                      </button>

                    </div>
                  </td>

                  <td>
                    <div className="flex justify-center gap-2">

                      <Link
                        to={`/admin/users/${user.id}`}
                        className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition"
                      >
                        View
                      </Link>

                      <Link
                        to={`/admin/users/edit/${user.id}`}
                        className="px-3 py-1 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition"
                      >
                        Edit
                      </Link>

                      <button
                        onClick={() => handleDelete(user.id)}
                        className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                      >
                        Delete
                      </button>

                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="py-16 text-center">
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-300">
                      No Users Found
                    </h2>

                    <p className="text-gray-500 mt-2">
                      Click "Add User" to create your first user.
                    </p>

                    <Link
                      to="/admin/users/add"
                      className="inline-block mt-6 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-5 py-3 rounded-xl transition"
                    >
                      + Add User
                    </Link>
                  </div>
                </td>
              </tr>
            )}
          </tbody>

        </table>

      </div>

    </div>
  );
}

export default UserList;