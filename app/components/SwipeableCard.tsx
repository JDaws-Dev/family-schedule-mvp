"use client";

import { useRef, useState, useEffect, useCallback, ReactNode } from 'react';

interface SwipeableCardProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: {
    label: string;
    icon: ReactNode;
    color: string;
  };
  rightAction?: {
    label: string;
    icon: ReactNode;
    color: string;
  };
  threshold?: number; // Swipe threshold in pixels
}

export default function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  threshold = 80,
}: SwipeableCardProps) {
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isHorizontalSwipe, setIsHorizontalSwipe] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Use refs to track current values for event handlers
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const currentXRef = useRef(0);
  const isHorizontalSwipeRef = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    setStartX(x);
    setStartY(y);
    startXRef.current = x;
    startYRef.current = y;
    setIsSwiping(true);
    setIsHorizontalSwipe(false);
    isHorizontalSwipeRef.current = false;
    currentXRef.current = 0;
    setCurrentX(0);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!startXRef.current) return;

    const deltaX = e.touches[0].clientX - startXRef.current;
    const deltaY = e.touches[0].clientY - startYRef.current;

    // Determine if this is a horizontal swipe on first significant movement
    if (!isHorizontalSwipeRef.current && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
      if (Math.abs(deltaX) > Math.abs(deltaY) * 0.8) {
        // More lenient horizontal detection
        isHorizontalSwipeRef.current = true;
        setIsHorizontalSwipe(true);
      }
    }

    // If this is a horizontal swipe, prevent scrolling
    if (isHorizontalSwipeRef.current) {
      e.preventDefault();
      e.stopPropagation();
      setCurrentX(deltaX);
      currentXRef.current = deltaX;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!startXRef.current) return;

    const finalX = currentXRef.current;
    setIsSwiping(false);
    setIsHorizontalSwipe(false);

    // Check if swipe threshold is met
    if (isHorizontalSwipeRef.current && Math.abs(finalX) >= threshold) {
      if (finalX > 0 && onSwipeRight) {
        // Swiped right
        onSwipeRight();
      } else if (finalX < 0 && onSwipeLeft) {
        // Swiped left
        onSwipeLeft();
      }
    }

    // Reset position
    setCurrentX(0);
    setStartX(0);
    setStartY(0);
    currentXRef.current = 0;
    startXRef.current = 0;
    startYRef.current = 0;
    isHorizontalSwipeRef.current = false;
  }, [threshold, onSwipeLeft, onSwipeRight]);

  // Attach/detach native touch event listeners with passive: false
  useEffect(() => {
    const element = cardRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Calculate opacity and position of action indicators
  const swipeProgress = Math.min(Math.abs(currentX) / threshold, 1);
  const isSwipingLeft = currentX < 0;
  const isSwipingRight = currentX > 0;

  return (
    <div className="relative overflow-hidden">
      {/* Left Action Background */}
      {rightAction && (
        <div
          className="absolute inset-y-0 left-0 flex items-center justify-start pl-6 transition-opacity"
          style={{
            width: `${Math.max(currentX, 0)}px`,
            backgroundColor: rightAction.color,
            opacity: isSwipingRight ? swipeProgress : 0,
          }}
        >
          <div className="flex items-center gap-2 text-white font-semibold">
            {rightAction.icon}
            <span>{rightAction.label}</span>
          </div>
        </div>
      )}

      {/* Right Action Background */}
      {leftAction && (
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-end pr-6 transition-opacity"
          style={{
            width: `${Math.abs(Math.min(currentX, 0))}px`,
            backgroundColor: leftAction.color,
            opacity: isSwipingLeft ? swipeProgress : 0,
          }}
        >
          <div className="flex items-center gap-2 text-white font-semibold">
            <span>{leftAction.label}</span>
            {leftAction.icon}
          </div>
        </div>
      )}

      {/* Swipeable Card Content */}
      <div
        ref={cardRef}
        className="relative transition-transform select-none"
        style={{
          transform: `translateX(${currentX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          userSelect: 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}
