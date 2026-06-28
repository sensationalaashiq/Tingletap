import React from 'react';
import './SendProgressBar.css';

const SendProgressBar = ({ progress }) => {
  if (progress === null || progress === undefined) return null;

  const isCompleting = progress >= 100;

  return (
    <div className="spb-track">
      <div
        className={`spb-fill${isCompleting ? ' spb-fill--complete' : ''}`}
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
      {!isCompleting && (
        <div className="spb-lead" style={{ left: `${Math.min(progress, 100)}%` }} />
      )}
    </div>
  );
};

export default SendProgressBar;
