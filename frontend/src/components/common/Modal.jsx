import React, { useEffect } from 'react';

export default function Modal({ isOpen, onClose, title, children }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative bg-[#112435] border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex justify-between items-center p-6 border-b border-gray-800/60 bg-[#0D1220]/50">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-white transition-colors rounded-lg p-1 hover:bg-gray-800"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}