"use client";

import { useRef, useState, useEffect, ReactNode } from 'react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  threshold?: number; // Pull threshold in pixels
}

export default function PullToRefresh({
  onRefresh,
  children,
  threshold = 80,
}: PullToRefreshProps) {
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only start pull if at top of scroll
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      setStartY(e.touches[0].clientY);
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;

    const deltaY = e.touches[0].clientY - startY;

    // Only allow pulling down
    if (deltaY > 0) {
      // Add resistance as you pull further
      const resistance = Math.min(deltaY / 2, threshold * 1.5);
      setCurrentY(resistance);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling || isRefreshing) return;
    setIsPulling(false);

    // Check if pull threshold is met
    if (currentY >= threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh error:', error);
      } finally {
        // Add small delay for better UX
        setTimeout(() => {
          setIsRefreshing(false);
          setCurrentY(0);
        }, 500);
      }
    } else {
      // Reset
      setCurrentY(0);
    }

    setStartY(0);
  };

  const pullProgress = Math.min(currentY / threshold, 1);
  const rotation = pullProgress * 360;
  const opacity = Math.min(pullProgress * 2, 1);

  return (
    <div
      ref={containerRef}
      className="relative overflow-y-auto h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull Indicator */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center transition-opacity"
        style={{
          top: `${Math.max(currentY - 60, -60)}px`,
          opacity: isRefreshing ? 1 : opacity,
          pointerEvents: 'none',
        }}
      >
        <div
          className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center shadow-medium"
          style={{
            transform: isRefreshing ? 'rotate(0deg)' : `rotate(${rotation}deg)`,
            transition: isRefreshing ? 'none' : 'transform 0.1s ease-out',
          }}
        >
          {isRefreshing ? (
            <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: isRefreshing ? `translateY(60px)` : `translateY(${currentY}px)`,
          transition: isPulling ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
