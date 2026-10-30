import React from 'react';
import PropTypes from 'prop-types';

export default function FeedbackHeader({
  title,
  description,
  status = 'default',
  align = 'center', 
}) {
  const statusStyles = {
    default: {
      title: "text-white text-shadow-[0_0_5px_rgba(34,211,238,0.5)]",
      iridescent: true, 
    },
    success: {
      title: "text-emerald-400 text-shadow-[0_0_10px_rgba(52,211,153,0.8)]",
      iridescent: false,
    },
    error: {
      title: "text-rose-400 text-shadow-[0_0_10px_rgba(244,63,94,0.8)]",
      iridescent: false,
    },
    warning: {
      title: "text-amber-400 text-shadow-[0_0_8px_rgba(251,191,36,0.8)]",
      iridescent: false,
    },
  };

  const currentStyle = statusStyles[status] || statusStyles.default;

 
  const titleClassBase = currentStyle.iridescent
    ? "text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-cyan-400"
    : currentStyle.title;

  return (
    <div className={`mb-6 lg:mb-8 text-${align} w-full`}>
      
      <h1 className={`${titleClassBase} text-2xl lg:text-3xl font-semibold mb-2 tracking-tight`}>
        {title}
      </h1>

      <p className="text-white text-xs lg:text-sm max-w-lg mx-auto leading-relaxed">
        {description}
      </p>
    </div>
  );
}

FeedbackHeader.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  status: PropTypes.oneOf(['default', 'success', 'error', 'warning']),
  align: PropTypes.oneOf(['left', 'center', 'right']),
};