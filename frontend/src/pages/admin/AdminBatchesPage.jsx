import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import InputField from '../../components/common/InputField';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import BatchModal from '../../components/admin/BatchModal';
import {
  fetchBatches,
  createBatch,
  updateBatch,
  deleteBatch,
  selectBatches,
  selectBatchesLoading,
  selectBatchesError,
} from '../../features/batches/batchSlice';

export default function AdminBatchesPage() {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);

  const dispatch = useDispatch();
  const batches = useSelector(selectBatches) ?? [];
  const loading = useSelector(selectBatchesLoading);
  const error = useSelector(selectBatchesError);

  useEffect(() => {
    dispatch(fetchBatches());
  }, [dispatch]);

  const filteredBatches = useMemo(() => {
    return batches.filter((b) =>
      b.batchName?.toLowerCase().includes(search.toLowerCase())
    );
  }, [batches, search]);

  const handleOpenModal = (batch = null) => {
    setSelectedBatch(batch);
    setIsModalOpen(true);
  };

  const handleSaveBatch = async (batchData) => {
    if (batchData.id) {
      await dispatch(updateBatch({ id: batchData.id, updates: batchData }));
    } else {
      await dispatch(createBatch(batchData));
    }
    setIsModalOpen(false);
  };

  const handleDeleteBatch = (id) => {
    dispatch(deleteBatch(id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Batches</h1>
          <p className="text-sm text-gray-400 mt-1">Manage live cohort batches across courses.</p>
        </div>
        <Button label="+ New Batch" onClick={() => handleOpenModal()} />
      </div>

      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="max-w-sm">
          <InputField
            label="Search"
            id="batch-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search batches"
          />
        </div>

        {loading && <LoadingSpinner label="Loading batches..." />}

        {!loading && error && (
          <ErrorState message={error} onRetry={() => dispatch(fetchBatches())} />
        )}

        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="py-3 font-medium">Batch Name</th>
                  <th className="py-3 font-medium">Course ID</th>
                  <th className="py-3 font-medium">Trainer</th>
                  <th className="py-3 font-medium">Schedule</th>
                  <th className="py-3 font-medium">Mode</th>
                  <th className="py-3 font-medium">Enrolled / Capacity</th>
                  <th className="py-3 font-medium">Status</th>
                  <th className="py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.map((b) => (
                  <tr key={b.id} className="border-b border-gray-900 hover:bg-gray-900/40">
                    <td className="py-3 text-gray-200">{b.batchName}</td>
                    <td className="py-3 text-gray-400">{b.courseId}</td>
                    <td className="py-3 text-gray-400">{b.trainerName}</td>
                    <td className="py-3 text-gray-400 text-xs">
                      {b.startDate} \u2192 {b.endDate}<br />
                      <span className="text-gray-600">{b.timing}</span>
                    </td>
                    <td className="py-3 text-gray-400">{b.mode}</td>
                    <td className="py-3 text-gray-400">{b.enrolledCount} / {b.capacity}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs border bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 text-right space-x-3">
                      <button
                        onClick={() => handleOpenModal(b)}
                        className="text-cyan-400 hover:text-cyan-300 text-xs transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteBatch(b.id)}
                        className="text-gray-400 hover:text-red-400 text-xs transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredBatches.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-500">
                      No batches match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BatchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        batch={selectedBatch}
        onSave={handleSaveBatch}
      />
    </div>
  );
}