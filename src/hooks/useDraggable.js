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

  const elementRef = useRef(null);
  const isDraggingRef = useRef(false);
  const animationFrameRef = useRef(null);
  const positionRef = useRef(initialPosition);
  const dragStartCoordsRef = useRef({ x: 0, y: 0 });
  const basePosRef = useRef(initialPosition);
  const currentDeltaRef = useRef({ x: 0, y: 0 });
  const elSizeRef = useRef({ width: 280, height: 260 });

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const getDynamicBounds = useCallback(() => {
    const dynamic = typeof onDrag === 'function' ? onDrag({ position: positionRef.current }) : null;
    if (dynamic && typeof dynamic.right === 'number') return dynamic;
    if (bounds) return bounds;
    return {
      top: 0,
      left: 0,
      right: typeof window !== 'undefined' ? window.innerWidth : 1200,
      bottom: typeof window !== 'undefined' ? window.innerHeight : 800
    };
  }, [bounds, onDrag]);

  const constrainPosition = useCallback((pos, sizeOverride = null) => {
    const b = getDynamicBounds();
    const rect = sizeOverride || elementRef.current?.getBoundingClientRect() || elSizeRef.current;
    const width = rect?.width || 280;
    const height = rect?.height || 260;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    const top = b.top ?? 0;
    const left = b.left ?? 0;
    const right = Math.min(b.right ?? vw, vw);
    const bottom = Math.min(b.bottom ?? vh, vh);
    const padding = 8;

    const maxX = Math.max(left + padding, right - width - padding);
    const maxY = Math.max(top + padding, bottom - height - padding);

    return {
      x: Math.max(left + padding, Math.min(pos.x, maxX)),
      y: Math.max(top + padding, Math.min(pos.y, maxY))
    };
  }, [getDynamicBounds]);

  const getClientCoords = useCallback((e) => {
    if (e.type?.startsWith('touch')) {
      const touch = e.touches?.[0] || e.changedTouches?.[0];
      if (touch) return { x: touch.clientX, y: touch.clientY };
    }
    return { x: e.clientX || 0, y: e.clientY || 0 };
  }, []);

  const isValidDragTarget = useCallback((target) => {
    if (disabled || !target) return false;
    try {
      const interactiveClosest = target.closest?.('button, input, textarea, select, a, video, audio, [contenteditable]');
      if (interactiveClosest) return false;

      if (handle) {
        const handleElement = elementRef.current?.querySelector(handle) ||
          (elementRef.current?.matches?.(handle) ? elementRef.current : null);
        if (!handleElement) return false;
        return handleElement === target || handleElement.contains(target);
      }

      if (target.onclick || target.getAttribute?.('onclick')) return false;
      return true;
    } catch {
      return true;
    }
  }, [disabled, handle]);

  const applyGpuTransform = useCallback(() => {
    animationFrameRef.current = null;
    const el = elementRef.current;
    if (!el || !isDraggingRef.current) return;
    const { x: dx, y: dy } = currentDeltaRef.current;
    el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (isDraggingRef.current || disabled) return;
    if (e.button !== undefined && e.button !== 0 && !e.type?.startsWith('touch')) return;

    const target = e.target;
    if (!isValidDragTarget(target) || !elementRef.current) return;

    if (e.cancelable) e.preventDefault();
    e.stopPropagation();

    const coords = getClientCoords(e);
    const rect = elementRef.current.getBoundingClientRect();
    elSizeRef.current = { width: rect.width, height: rect.height };
    basePosRef.current = { x: rect.left, y: rect.top };
    dragStartCoordsRef.current = coords;
    currentDeltaRef.current = { x: 0, y: 0 };

    isDraggingRef.current = true;
    setIsDragging(true);

    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    const el = elementRef.current;
    el.style.willChange = 'transform';
    el.style.transition = 'none';
    el.style.left = `${rect.left}px`;
    el.style.top = `${rect.top}px`;
    el.style.transform = 'translate3d(0px, 0px, 0)';

    if (onDragStart) {
      onDragStart({ position: basePosRef.current, event: e });
    }
  }, [disabled, isValidDragTarget, getClientCoords, onDragStart]);

  const handleMouseMove = useCallback((e) => {
    if (!isDraggingRef.current || !elementRef.current) return;

    if (e.cancelable) e.preventDefault();
    e.stopPropagation();

    const coords = getClientCoords(e);
    const rawTarget = {
      x: basePosRef.current.x + (coords.x - dragStartCoordsRef.current.x),
      y: basePosRef.current.y + (coords.y - dragStartCoordsRef.current.y)
    };
    const clamped = constrainPosition(rawTarget, elSizeRef.current);
    currentDeltaRef.current = {
      x: clamped.x - basePosRef.current.x,
      y: clamped.y - basePosRef.current.y
    };

    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(applyGpuTransform);
    }
  }, [getClientCoords, constrainPosition, applyGpuTransform]);

  const handleMouseUp = useCallback((e) => {
    if (!isDraggingRef.current) return;

    isDraggingRef.current = false;
    setIsDragging(false);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const finalPosition = constrainPosition(
      {
        x: basePosRef.current.x + currentDeltaRef.current.x,
        y: basePosRef.current.y + currentDeltaRef.current.y
      },
      elSizeRef.current
    );

    positionRef.current = finalPosition;
    currentDeltaRef.current = { x: 0, y: 0 };
    setPosition(finalPosition);

    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';

    if (elementRef.current) {
      elementRef.current.style.willChange = 'auto';
      elementRef.current.style.left = `${finalPosition.x}px`;
      elementRef.current.style.top = `${finalPosition.y}px`;
      elementRef.current.style.transform = 'translate3d(0px, 0px, 0)';
    }

    if (onDragEnd) {
      onDragEnd({ position: finalPosition, event: e });
    }
  }, [constrainPosition, onDragEnd]);

  const handleTouchStart = useCallback((e) => {
    handleMouseDown(e);
  }, [handleMouseDown]);

  const handleTouchMove = useCallback((e) => {
    handleMouseMove(e);
  }, [handleMouseMove]);

  const handleTouchEnd = useCallback((e) => {
    handleMouseUp(e);
  }, [handleMouseUp]);

  useEffect(() => {
    if (!isDragging) return;

    const preventSelect = (e) => e.preventDefault();

    document.addEventListener('mousemove', handleMouseMove, { passive: false, capture: true });
    document.addEventListener('mouseup', handleMouseUp, { passive: false, capture: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: false, capture: true });
    document.addEventListener('touchcancel', handleTouchEnd, { passive: false, capture: true });
    document.addEventListener('selectstart', preventSelect, { passive: false });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, { capture: true });
      document.removeEventListener('mouseup', handleMouseUp, { capture: true });
      document.removeEventListener('touchmove', handleTouchMove, { capture: true });
      document.removeEventListener('touchend', handleTouchEnd, { capture: true });
      document.removeEventListener('touchcancel', handleTouchEnd, { capture: true });
      document.removeEventListener('selectstart', preventSelect);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  useEffect(() => {
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      isDraggingRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const setPositionProgrammatically = useCallback((newPosition) => {
    const constrainedPosition = constrainPosition(newPosition);
    positionRef.current = constrainedPosition;
    setPosition(constrainedPosition);
  }, [constrainPosition]);

  const resetPosition = useCallback(() => {
    setPositionProgrammatically(initialPosition);
  }, [setPositionProgrammatically, initialPosition]);

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
      WebkitUserSelect: 'none',
      zIndex: isDragging ? 10001 : 10000,
      transition: 'none',
      willChange: isDragging ? 'transform' : 'auto',
      transform: 'translate3d(0px, 0px, 0)',
      touchAction: 'none',
      WebkitTouchCallout: 'none',
      WebkitTapHighlightColor: 'transparent',
      pointerEvents: 'auto'
    }
  };
};

export default useDraggable;

