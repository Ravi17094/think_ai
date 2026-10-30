import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import InputField from '../common/InputField';
import Button from '../common/Button';

const EMPTY_USER = { name: '', email: '', role: 'Learner' };

export default function UserModal({ isOpen, onClose, user, onSave }) {
  const [formData, setFormData] = useState(EMPTY_USER);

  useEffect(() => {
    if (user) {
      setFormData(user);
    } else {
      setFormData(EMPTY_USER);
    }
  }, [user, isOpen]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={user ? 'Edit User Role' : 'Add New User'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <InputField
          label="Full Name"
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g. Jane Doe"
          required
        />

        <InputField
          label="Email Address"
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="jane@domain.com"
          required
        />

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-1.5">
            System Role
          </label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full bg-[#0D1220] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors cursor-pointer"
          >
            <option value="Learner">Learner</option>
            <option value="Instructor">Instructor</option>
            <option value="TA">TA</option>
            <option value="Admin">Admin</option>
          </select>
        </div>

        <div className="pt-4 mt-2 flex items-center justify-end gap-3 border-t border-gray-800/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <Button type="submit" label={user ? 'Save Role' : 'Create User'} />
        </div>
      </form>
    </Modal>
  );
}
