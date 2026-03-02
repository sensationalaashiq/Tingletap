
import { useState, useRef, useCallback, useEffect } from 'react';

const useDraggable = ({
  initialPosition = { x: 100, y: 100 },
  bounds = null,
  disabled = false,
  onDragStart = null,
  onDrag = null,
  onDragEnd = null,
  handle = null
} = {}) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const elementRef = useRef(null);
  const isDraggingRef = useRef(false);
  const animationFrameRef = useRef(null);
  const lastPositionRef = useRef(initialPosition);
  const velocityRef = useRef({ x: 0, y: 0 });
  const lastMoveTime = useRef(0);

  // Constrain position within bounds with smooth clamping
  const constrainPosition = useCallback((pos) => {
    if (!bounds || !elementRef.current) return pos;
    
    try {
      const rect = elementRef.current.getBoundingClientRect();
      const { top = 0, left = 0, right = window.innerWidth, bottom = window.innerHeight } = bounds;
      
      // Smooth boundary constraints with padding
      const padding = 10;
      const constrainedX = Math.max(left + padding, Math.min(pos.x, right - rect.width - padding));
      const constrainedY = Math.max(top + padding, Math.min(pos.y, bottom - rect.height - padding));
      
      return { x: constrainedX, y: constrainedY };
    } catch (error) {
      console.warn('Error constraining position:', error);
      return pos;
    }
  }, [bounds]);

  // High precision client coordinates with touch/mouse support
  const getClientCoords = useCallback((e) => {
    if (e.type === 'touchstart' || e.type === 'touchmove' || e.type === 'touchend') {
      const touch = e.touches?.[0] || e.changedTouches?.[0];
      if (touch) {
        return { x: touch.clientX, y: touch.clientY };
      }
    }
    return { x: e.clientX || 0, y: e.clientY || 0 };
  }, []);

  // Enhanced drag target validation
  const isValidDragTarget = useCallback((target) => {
    if (disabled || !target) return false;
    
    try {
      // Handle selector support
      if (handle) {
        const handleElement = elementRef.current?.querySelector(handle);
        if (!handleElement) return false;
        return handleElement === target || handleElement.contains(target);
      }
      
      // Block interactive elements
      const tagName = target.tagName?.toLowerCase() || '';
      const interactiveElements = ['button', 'input', 'textarea', 'select', 'a', 'video', 'audio'];
      
      if (interactiveElements.includes(tagName)) return false;
      if (target.closest?.('button, input, textarea, select, a, video, audio, [contenteditable]')) return false;
      
      // Block elements with click handlers
      if (target.onclick || target.getAttribute?.('onclick')) return false;
      
      return true;
    } catch (error) {
      console.warn('Error validating drag target:', error);
      return true;
    }
  }, [disabled, handle]);

  // INSTANT drag start - zero delay
  const handleMouseDown = useCallback((e) => {
    if (isDraggingRef.current || disabled) return;
    
    const target = e.target;
    if (!isValidDragTarget(target) || !elementRef.current) return;

    // INSTANT start - no try/catch
    e.preventDefault();
    e.stopPropagation();

    const coords = getClientCoords(e);
    const rect = elementRef.current.getBoundingClientRect();
    
    const offset = {
      x: coords.x - rect.left,
      y: coords.y - rect.top
    };

    // INSTANT state updates
    setIsDragging(true);
    isDraggingRef.current = true;
    setDragOffset(offset);

    // INSTANT cursor feedback
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    document.body.style.touchAction = 'none';

    // INSTANT hardware acceleration and disable transitions
    if (elementRef.current) {
      elementRef.current.style.willChange = 'transform';
      elementRef.current.style.transform = 'translate3d(0,0,0)';
      elementRef.current.style.transition = 'none';
      elementRef.current.style.pointerEvents = 'none'; // Prevent child elements from interfering
    }

    if (onDragStart) {
      onDragStart({ position, event: e });
    }
  }, [position, isValidDragTarget, getClientCoords, onDragStart, disabled]);

  // ULTRA-FAST zero-delay drag movement - DIRECT DOM MANIPULATION
  const handleMouseMove = useCallback((e) => {
    if (!isDraggingRef.current || !elementRef.current) return;

    e.preventDefault();
    e.stopPropagation();
    
    const coords = getClientCoords(e);
    
    // Calculate new position INSTANTLY
    const newX = coords.x - dragOffset.x;
    const newY = coords.y - dragOffset.y;
    
    // Apply position DIRECTLY to DOM - no React state updates during drag
    elementRef.current.style.left = `${newX}px`;
    elementRef.current.style.top = `${newY}px`;
    elementRef.current.style.transform = 'translate3d(0, 0, 0)';
    
    // Store position for React state update at drag end only
    lastPositionRef.current = { x: newX, y: newY };
    
  }, [dragOffset, getClientCoords]);

  // INSTANT drag end - sync DOM position with React state
  const handleMouseUp = useCallback((e) => {
    if (!isDraggingRef.current) return;

    // INSTANT state reset
    setIsDragging(false);
    isDraggingRef.current = false;
    
    // Sync React state with final DOM position
    const finalPosition = constrainPosition(lastPositionRef.current);
    setPosition(finalPosition);
    
    // INSTANT style reset
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.body.style.touchAction = '';

    // INSTANT element style reset
    if (elementRef.current) {
      elementRef.current.style.willChange = '';
      elementRef.current.style.transform = '';
      // Apply final constrained position
      elementRef.current.style.left = `${finalPosition.x}px`;
      elementRef.current.style.top = `${finalPosition.y}px`;
    }

    if (onDragEnd) {
      onDragEnd({ position: finalPosition, event: e });
    }
  }, [onDragEnd, constrainPosition]);

  // Touch event handlers with enhanced precision
  const handleTouchStart = useCallback((e) => {
    // Prevent default touch behaviors
    if (e.cancelable) e.preventDefault();
    handleMouseDown(e);
  }, [handleMouseDown]);

  const handleTouchMove = useCallback((e) => {
    if (e.cancelable) e.preventDefault();
    handleMouseMove(e);
  }, [handleMouseMove]);

  const handleTouchEnd = useCallback((e) => {
    if (e.cancelable) e.preventDefault();
    handleMouseUp(e);
  }, [handleMouseUp]);

  // ULTRA-HIGH-PERFORMANCE event listeners
  useEffect(() => {
    if (!isDragging) return;

    // DIRECT function references for maximum speed
    const preventEvent = (e) => e.preventDefault();

    // Add INSTANT listeners
    document.addEventListener('mousemove', handleMouseMove, { passive: false, capture: true });
    document.addEventListener('mouseup', handleMouseUp, { passive: false, capture: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: false, capture: true });
    document.addEventListener('contextmenu', preventEvent, { passive: false });
    document.addEventListener('selectstart', preventEvent, { passive: false });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, { capture: true });
      document.removeEventListener('mouseup', handleMouseUp, { capture: true });
      document.removeEventListener('touchmove', handleTouchMove, { capture: true });
      document.removeEventListener('touchend', handleTouchEnd, { capture: true });
      document.removeEventListener('contextmenu', preventEvent);
      document.removeEventListener('selectstart', preventEvent);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Comprehensive cleanup
  useEffect(() => {
    return () => {
      // Reset all document styles
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.style.touchAction = '';
      document.body.style.webkitUserSelect = '';
      document.body.style.mozUserSelect = '';
      document.body.style.msUserSelect = '';
      
      isDraggingRef.current = false;
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Public methods
  const setPositionProgrammatically = useCallback((newPosition) => {
    const constrainedPosition = constrainPosition(newPosition);
    setPosition(constrainedPosition);
    lastPositionRef.current = constrainedPosition;
  }, [constrainPosition]);

  const resetPosition = useCallback(() => {
    setPositionProgrammatically(initialPosition);
  }, [setPositionProgrammatically, initialPosition]);

  // Return optimized hook interface
  return {
    ref: elementRef,
    position,
    isDragging,
    onMouseDown: handleMouseDown,
    onTouchStart: handleTouchStart,
    setPosition: setPositionProgrammatically,
    resetPosition,
    style: {
      position: 'fixed',
      left: `${position.x}px`,
      top: `${position.y}px`,
      cursor: isDragging ? 'grabbing' : 'grab',
      userSelect: 'none',
      webkitUserSelect: 'none',
      mozUserSelect: 'none',
      msUserSelect: 'none',
      zIndex: isDragging ? 10001 : 10000,
      transition: 'none', // Always no transition for maximum speed
      willChange: isDragging ? 'transform' : 'auto',
      transform: 'translate3d(0, 0, 0)', // Always hardware accelerated
      touchAction: 'none',
      webkitTouchCallout: 'none',
      webkitTapHighlightColor: 'transparent',
      pointerEvents: isDragging ? 'none' : 'auto'
    }
  };
};

export default useDraggable;
