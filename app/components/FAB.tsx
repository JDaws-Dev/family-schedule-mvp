"use client";

import { useState } from "react";

interface FABProps {
  onAction: (action: "manual" | "paste" | "photo" | "voice") => void;
}

export default function FAB({ onAction }: FABProps) {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    {
      id: "photo" as const,
      label: "Snap Photo",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: "from-primary-500 to-primary-600",
      description: "Flyer or schedule",
    },
    {
      id: "voice" as const,
      label: "Voice",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      ),
      color: "from-secondary-500 to-secondary-600",
      description: "Say it out loud",
    },
    {
      id: "paste" as const,
      label: "Paste Text",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: "from-accent-500 to-accent-600",
      description: "Copy & paste",
    },
    {
      id: "manual" as const,
      label: "Type it in",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      color: "from-gray-500 to-gray-600",
      description: "Manual entry",
    },
  ];

  const handleActionClick = (actionId: typeof actions[number]["id"]) => {
    setIsOpen(false);
    onAction(actionId);
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden animate-fadeIn"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Action Menu */}
      {isOpen && (
        <div
          className="fixed right-6 z-50 md:hidden space-y-3 animate-slideInUp"
          style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
        >
          {actions.map((action, index) => (
            <button
              key={action.id}
              onClick={() => handleActionClick(action.id)}
              className="flex items-center gap-3 bg-white rounded-2xl shadow-lifted hover:shadow-strong transition-all p-3 group min-w-[200px]"
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center text-white shadow-soft group-hover:scale-105 transition-transform flex-shrink-0`}>
                {action.icon}
              </div>
              <div className="text-left flex-1">
                <div className="font-bold text-gray-900">{action.label}</div>
                <div className="text-xs text-gray-600 mt-0.5">{action.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed right-6 z-50 w-14 h-14 md:w-16 md:h-16 md:right-8 rounded-full bg-primary-600 text-white shadow-lifted hover:shadow-strong active:scale-95 transition-all flex items-center justify-center ${
          isOpen ? "rotate-45" : ""
        }`}
        style={{
          bottom: 'max(2rem, calc(4.75rem + env(safe-area-inset-bottom)))',
        }}
        aria-label="Add event"
      >
        <svg
          className="w-7 h-7 md:w-8 md:h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideInUp {
          animation: slideInUp 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
