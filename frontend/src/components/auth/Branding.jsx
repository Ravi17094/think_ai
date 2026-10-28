import React from 'react';
import PropTypes from 'prop-types';

export default function Branding({ size = 'large', showIcon = true, showName = true }) {
  const sizes = {
    small: {
      icon: "w-7 h-7 rounded-md", 
      name: "text-lg",           
      gap: "gap-2"
    },
    medium: {
      icon: "w-8 h-8 lg:w-9 lg:h-9 rounded-lg",
      name: "text-lg lg:text-xl", 
      gap: "gap-3"
    },
    large: {
      icon: "w-10 h-10 lg:w-12 lg:h-12 rounded-xl", 
      name: "text-xl lg:text-2xl",  
      gap: "gap-3.5"
    }
  };

  const currentSize = sizes[size];

  return (
    <div className={`flex items-center ${currentSize.gap} mb-6 lg:mb-8`}>
      {showIcon && (
        <div
          className={`flex items-center justify-center ${currentSize.icon}
            bg-indigo-500/20 border border-indigo-400/30
            shadow-[0_0_15px_rgba(164,53,240,0.4)]`}
        >
          <span className={`font-mono text-purple-400 text-sm lg:text-lg
            drop-shadow-[0_0_8px_rgba(164,53,240,0.8)]`}>
            tz
          </span>
        </div>
      )}

      {showName && (
        <span
          className={`font-mono ${currentSize.name} tracking-wide font-bold 
            bg-gradient-to-r from-purple-500 to-purple-700 bg-clip-text text-transparent`}
        >
          Thinkz.ai
        </span>
      )}
    </div>
  );
}

Branding.propTypes = {
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  showIcon: PropTypes.bool,
  showName: PropTypes.bool,
};
