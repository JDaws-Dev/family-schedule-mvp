"use client";

import { useEffect, useState } from "react";

interface CelebrationToastProps {
  message: string;
  emoji?: string;
  onClose: () => void;
  duration?: number;
}

export default function CelebrationToast({
  message,
  emoji = "🎉",
  onClose,
  duration = 5000
}: CelebrationToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={`fixed top-4 right-4 z-50 transition-all duration-300 transform ${
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
    >
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl shadow-strong p-4 max-w-md">
        <div className="flex items-start gap-3">
          <span className="text-3xl animate-bounce">{emoji}</span>
          <div className="flex-1">
            <p className="font-semibold text-lg mb-1">Awesome!</p>
            <p className="text-sm text-green-50">{message}</p>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
