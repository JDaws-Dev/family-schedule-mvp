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
  threshold = 40,
}: SwipeableCardProps) {
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Use refs to track current values for event handlers
  const startXRef = useRef(0);
  const currentXRef = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    setStartX(x);
    startXRef.current = x;
    setIsSwiping(true);
    // Store starting Y position to detect vertical vs horizontal swipes
    (e.currentTarget as any)._startY = y;
    (e.currentTarget as any)._hasSwiped = false;
    console.log('Swipe started at X:', x);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const deltaX = e.touches[0].clientX - startXRef.current;
    const deltaY = e.touches[0].clientY - ((e.currentTarget as any)._startY || 0);

    // If horizontal movement is greater than vertical, prevent default to stop scrolling
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as any)._hasSwiped = true; // Mark that user is swiping
    }

    setCurrentX(deltaX);
    currentXRef.current = deltaX;
    console.log('Swiping - deltaX:', deltaX);
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;

    const finalX = currentXRef.current;
    setIsSwiping(false);

    console.log('Touch end - finalX:', finalX, 'threshold:', threshold);

    // Check if swipe threshold is met
    if (Math.abs(finalX) >= threshold) {
      console.log('Threshold met!');
      if (finalX > 0 && onSwipeRight) {
        // Swiped right
        console.log('Calling onSwipeRight');
        onSwipeRight();
      } else if (finalX < 0 && onSwipeLeft) {
        // Swiped left
        console.log('Calling onSwipeLeft');
        onSwipeLeft();
      }
    } else {
      console.log('Threshold NOT met - swipe too short');
    }

    // Reset position
    setCurrentX(0);
    setStartX(0);
    currentXRef.current = 0;
    startXRef.current = 0;
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const deltaX = e.clientX - startXRef.current;
    setCurrentX(deltaX);
    currentXRef.current = deltaX;
  }, []);

  const handleMouseUp = useCallback(() => {
    const finalX = currentXRef.current;
    setIsSwiping(false);

    // Check if swipe threshold is met
    if (Math.abs(finalX) >= threshold) {
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
    currentXRef.current = 0;
    startXRef.current = 0;
  }, [threshold, onSwipeLeft, onSwipeRight]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const x = e.clientX;
    setStartX(x);
    startXRef.current = x;
    setIsSwiping(true);
  };

  // Mouse event listeners using useEffect
  useEffect(() => {
    if (isSwiping) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isSwiping, handleMouseMove, handleMouseUp]);

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
        className="relative transition-transform"
        style={{
          transform: `translateX(${currentX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
          touchAction: 'none', // Disable browser touch handling to let our swipe work
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
