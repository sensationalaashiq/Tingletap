import React from 'react';
import './GenderBadge.css';

const GenderBadge = ({ gender, size = 'small', className = '' }) => {
  const renderGenderIcon = () => {
    const genderLower = gender?.toLowerCase();

    if (genderLower === 'female') {
      return (
        <svg width="100%" height="100%" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <path d="m35 38.607a11.983 11.983 0 0 0 4.477-20.983 10 10 0 1 0 -14.954 0 11.983 11.983 0 0 0 4.477 20.983v10.393h-8v6h8v8h6v-8h8v-6h-8zm-3-31.607a4 4 0 1 1 -4 4 4 4 0 0 1 4-4zm-6 20a6 6 0 1 1 6 6 6 6 0 0 1 -6-6z" fill="#ec4899"/>
          <circle cx="32" cy="11" r="2" fill="#ffffff" />
        </svg>
      );
    } else if (genderLower === 'other' || genderLower === 'non-binary') {
      return (
        <svg width="100%" height="100%" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
          <circle cx="256" cy="256" r="200" fill="#8b5cf6" stroke="#ffffff" strokeWidth="8"/>
          <text x="256" y="280" textAnchor="middle" fill="white" fontSize="120" fontWeight="bold">∞</text>
        </svg>
      );
    } else {
      // Default to male
      return (
        <svg width="100%" height="100%" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <g transform="translate(-106 -159)">
            <g transform="translate(-764.321 -65.93)">
              <path d="m903.204 236.514-7.015 7.014c-4.849-3.22-11.433-2.709-15.673 1.532-4.841 4.84-4.822 12.734.06 17.617 4.883 4.882 12.777 4.901 17.617.06 4.241-4.24 4.752-10.824 1.532-15.673l7.004-7.004.014 3.371c.006 1.38 1.131 2.495 2.511 2.489s2.495-1.131 2.489-2.511l-.04-9.392c-.006-1.374-1.12-2.486-2.494-2.489l-9.374-.022c-1.38-.003-2.503 1.114-2.506 2.494s1.114 2.503 2.494 2.506zm-19.092 22.627c-2.923-2.923-2.959-7.648-.061-10.546s7.624-2.862 10.546.06c2.923 2.923 2.959 7.649.061 10.547-2.898 2.897-7.624 2.862-10.546-.061z" fill="#3b82f6"/>
            </g>
          </g>
          <circle cx="24" cy="24" r="3" fill="#ffffff" />
        </svg>
      );
    }
  };

  return (
    <div className={`gender-badge gender-badge-${size} ${className}`}>
      <div className="gender-badge-icon">
        {renderGenderIcon()}
      </div>
    </div>
  );
};

export default GenderBadge;