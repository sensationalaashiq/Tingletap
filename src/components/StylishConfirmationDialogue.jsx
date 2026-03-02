
import React from 'react';
import './StylishConfirmationDialogue.css';

const StylishConfirmationDialogue = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  type = "warning" // warning, danger, info, success
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return '⚠️';
      case 'success':
        return '✅';
      case 'info':
        return 'ℹ️';
      default:
        return '❓';
    }
  };

  const getAccentColor = () => {
    switch (type) {
      case 'danger':
        return '#e74c3c';
      case 'success':
        return '#27ae60';
      case 'info':
        return '#3498db';
      default:
        return '#f39c12';
    }
  };

  return (
    <div className="premium-confirmation-overlay">
      <div className="premium-confirmation-modal" style={{ '--accent-color': getAccentColor() }}>
        <div className="premium-header">
          <span className="premium-icon">{getIcon()}</span>
          <h4 className="premium-title">{title}</h4>
        </div>
        
        <p className="premium-message">{message}</p>
        
        <div className="premium-actions">
          <button className="premium-btn cancel-btn" onClick={onCancel}>
            {cancelText}
          </button>
          <button className="premium-btn confirm-btn" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StylishConfirmationDialogue;
