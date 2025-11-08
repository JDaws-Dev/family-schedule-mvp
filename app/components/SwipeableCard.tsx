"use client";

import { useRef, useState, ReactNode } from 'react';

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
  const [currentX, setCurrentX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const deltaX = e.touches[0].clientX - startX;
    setCurrentX(deltaX);
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;
    setIsSwiping(false);

    // Check if swipe threshold is met
    if (Math.abs(currentX) >= threshold) {
      if (currentX > 0 && onSwipeRight) {
        // Swiped right
        onSwipeRight();
      } else if (currentX < 0 && onSwipeLeft) {
        // Swiped left
        onSwipeLeft();
      }
    }

    // Reset position
    setCurrentX(0);
    setStartX(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setStartX(e.clientX);
    setIsSwiping(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isSwiping) return;
    const deltaX = e.clientX - startX;
    setCurrentX(deltaX);
  };

  const handleMouseUp = () => {
    if (!isSwiping) return;
    setIsSwiping(false);

    // Check if swipe threshold is met
    if (Math.abs(currentX) >= threshold) {
      if (currentX > 0 && onSwipeRight) {
        // Swiped right
        onSwipeRight();
      } else if (currentX < 0 && onSwipeLeft) {
        // Swiped left
        onSwipeLeft();
      }
    }

    // Reset position
    setCurrentX(0);
    setStartX(0);
  };

  // Mouse event listeners
  if (isSwiping && typeof window !== 'undefined') {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  // Cleanup
  if (!isSwiping && typeof window !== 'undefined') {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }

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
        className="relative transition-transform touch-pan-y"
        style={{
          transform: `translateX(${currentX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        {children}
      </div>
    </div>
  );
}
