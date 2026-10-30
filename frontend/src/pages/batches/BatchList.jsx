import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getBatches, deleteBatch } from "../../api/batchApi";

function BatchList() {
  const [batches, setBatches] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchBatches(search);
  }, [search]);

  const fetchBatches = async (searchText = "") => {
    try {
      const response = await getBatches(searchText);
      setBatches(response.data.data);
    } catch (error) {
      console.error("Error fetching batches:", error);
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this batch?"
    );

    if (!confirmDelete) return;

    try {
      await deleteBatch(id);
      alert("Batch deleted successfully");
      fetchBatches(search);
    } catch (error) {
      console.error(error);
      alert("Failed to delete batch");
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">
          Batch Management
        </h1>

        <Link
          to="/batches/add"
          className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add Batch
        </Link>
      </div>

      <div className="mb-5">
        <input
          type="text"
          placeholder="🔍 Search Batch..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-4 py-2 w-80"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="p-3">ID</th>
              <th>Name</th>
              <th>Course</th>
              <th>Instructor</th>
              <th>Capacity</th>
              <th>Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {batches.length > 0 ? (
              batches.map((batch) => (
                <tr
                  key={batch.id}
                  className="border-b hover:bg-gray-100"
                >
                  <td className="p-3 text-center">{batch.id}</td>

                  <td>{batch.name}</td>

                  <td>{batch.course?.title}</td>

                  <td>{batch.instructorName}</td>

                  <td>{batch.capacity}</td>

                  <td>
                    <span
                      className={`px-3 py-1 rounded-full text-white text-sm ${
                        batch.status === "ACTIVE"
                          ? "bg-green-500"
                          : "bg-red-500"
                      }`}
                    >
                      {batch.status}
                    </span>
                  </td>

                  <td>
                    <div className="flex gap-2 justify-center">

                      <Link
                        to={`/batches/${batch.id}`}
                        className="bg-green-600 text-white px-3 py-1 rounded"
                      >
                        View
                      </Link>

                      <Link
                        to={`/batches/edit/${batch.id}`}
                        className="bg-yellow-500 text-white px-3 py-1 rounded"
                      >
                        Edit
                      </Link>

                      <button
                        onClick={() => handleDelete(batch.id)}
                        className="bg-red-600 text-white px-3 py-1 rounded"
                      >
                        Delete
                      </button>

                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="7"
                  className="text-center py-6"
                >
                  No Batches Found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default BatchList;