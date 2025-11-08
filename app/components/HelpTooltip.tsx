"use client";

import { useState } from "react";

interface HelpTooltipProps {
  content: string;
  position?: "top" | "bottom" | "left" | "right";
}

export default function HelpTooltip({ content, position = "top" }: HelpTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2"
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 hover:bg-primary-100 text-gray-600 hover:text-primary-600 transition-colors cursor-help"
        aria-label="Help"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {isVisible && (
        <div
          className={`absolute z-50 ${positionClasses[position]} w-64 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg`}
        >
          <div className="relative">
            {content}
            {/* Arrow */}
            <div
              className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${
                position === "top" ? "bottom-[-4px] left-1/2 -translate-x-1/2" :
                position === "bottom" ? "top-[-4px] left-1/2 -translate-x-1/2" :
                position === "left" ? "right-[-4px] top-1/2 -translate-y-1/2" :
                "left-[-4px] top-1/2 -translate-y-1/2"
              }`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
