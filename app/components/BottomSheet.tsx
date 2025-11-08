"use client";

import { useEffect, useState, useRef, ReactNode } from 'react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  snapPoints?: number[]; // Percentages of viewport height [30, 60, 90]
  initialSnap?: number; // Index of snapPoints to start at
}

export default function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  snapPoints = [90],
  initialSnap = 0,
}: BottomSheetProps) {
  const [currentSnap, setCurrentSnap] = useState(initialSnap);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Reset snap when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentSnap(initialSnap);
      setCurrentY(0);
    }
  }, [isOpen, initialSnap]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaY = e.touches[0].clientY - startY;

    // Only allow dragging down
    if (deltaY > 0) {
      setCurrentY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    // If dragged down more than 100px, close
    if (currentY > 100) {
      onClose();
    } else if (currentY > 50 && snapPoints.length > 1 && currentSnap < snapPoints.length - 1) {
      // Snap to lower position
      setCurrentSnap(prev => Math.min(prev + 1, snapPoints.length - 1));
    }

    setCurrentY(0);
    setStartY(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartY(e.clientY);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const deltaY = e.clientY - startY;

    // Only allow dragging down
    if (deltaY > 0) {
      setCurrentY(deltaY);
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // If dragged down more than 100px, close
    if (currentY > 100) {
      onClose();
    } else if (currentY > 50 && snapPoints.length > 1 && currentSnap < snapPoints.length - 1) {
      // Snap to lower position
      setCurrentSnap(prev => Math.min(prev + 1, snapPoints.length - 1));
    }

    setCurrentY(0);
    setStartY(0);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, startY, currentY]);

  if (!isOpen) return null;

  const height = snapPoints[currentSnap];
  const transform = isDragging ? `translateY(${currentY}px)` : 'translateY(0)';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black transition-opacity z-50 md:bg-opacity-50"
        style={{
          backgroundColor: `rgba(0, 0, 0, ${isDragging ? Math.min(0.5 - (currentY / 1000), 0.5) : 0.5})`,
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className="fixed left-0 right-0 bg-white z-50 transition-all duration-300 ease-out md:left-auto md:right-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:max-w-2xl md:w-full md:shadow-lifted"
        style={{
          bottom: 0,
          height: `${height}vh`,
          transform: `${transform}`,
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.15)',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'bottom-sheet-title' : undefined}
      >
        {/* Drag Handle */}
        <div
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing md:hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
        >
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 id="bottom-sheet-title" className="text-xl font-bold text-gray-900">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto" style={{ height: title ? 'calc(100% - 80px)' : 'calc(100% - 40px)' }}>
          {children}
        </div>
      </div>
    </>
  );
}
