import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import InputField from '../common/InputField';
import Button from '../common/Button';

const EMPTY_COURSE = {
  title: '',
  description: '',
  instructor: '',
  duration: '',
  category: '',
  level: 'Beginner',
  language: 'English',
  price: '',
  thumbnail: '',
  status: 'ACTIVE',
};

export default function CourseModal({ isOpen, onClose, course, onSave }) {
  const [formData, setFormData] = useState(EMPTY_COURSE);

  useEffect(() => {
    if (course) {
      setFormData({ ...EMPTY_COURSE, ...course });
    } else {
      setFormData(EMPTY_COURSE);
    }
  }, [course, isOpen]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? Number(value) : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={course ? 'Edit Course' : 'Add New Course'}
    >
      <form onSubmit={handleSubmit} className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
        <InputField
          label="Course Title"
          id="title"
          name="title"
          type="text"
          value={formData.title}
          onChange={handleChange}
          placeholder="e.g. Node.js Fundamentals"
          required
        />

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1.5">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            placeholder="Learn Node.js from scratch"
            className="w-full bg-[#0D1220] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
          />
        </div>

        <InputField
          label="Instructor Name"
          id="instructor"
          name="instructor"
          type="text"
          value={formData.instructor}
          onChange={handleChange}
          placeholder="e.g. Priya Sharma"
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="Duration"
            id="duration"
            name="duration"
            type="text"
            value={formData.duration}
            onChange={handleChange}
            placeholder="e.g. 30 Days"
          />
          <InputField
            label="Category"
            id="category"
            name="category"
            type="text"
            value={formData.category}
            onChange={handleChange}
            placeholder="e.g. Backend"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="level" className="block text-sm font-medium text-gray-300 mb-1.5">Level</label>
            <select
              id="level"
              name="level"
              value={formData.level}
              onChange={handleChange}
              className="w-full bg-[#0D1220] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors cursor-pointer"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
          <InputField
            label="Language"
            id="language"
            name="language"
            type="text"
            value={formData.language}
            onChange={handleChange}
            placeholder="e.g. English"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="Price £"
            id="price"
            name="price"
            type="number"
            value={formData.price}
            onChange={handleChange}
            placeholder="4999"
          />
          <InputField
            label="Thumbnail filename"
            id="thumbnail"
            name="thumbnail"
            type="text"
            value={formData.thumbnail}
            onChange={handleChange}
            placeholder="e.g. node.png"
          />
        </div>

        <InputField
          label="Status"
          id="status"
          name="status"
          type="text"
          value={formData.status}
          onChange={handleChange}
          placeholder="ACTIVE"
        />

        <div className="pt-4 mt-2 flex items-center justify-end gap-3 border-t border-gray-800/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <Button
            type="submit"
            label={course ? 'Save Changes' : 'Create Course'}
          />
        </div>
      </form>
    </Modal>
  );
}

