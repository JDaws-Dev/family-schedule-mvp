"use client";

import { useState } from "react";

interface FABProps {
  onAction: (action: "manual" | "paste" | "photo" | "voice" | "discover") => void;
}

export default function FAB({ onAction }: FABProps) {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    {
      id: "manual" as const,
      label: "Type it",
      icon: "✍️",
      color: "from-primary-500 to-primary-600",
    },
    {
      id: "paste" as const,
      label: "Paste text",
      icon: "📋",
      color: "from-blue-500 to-blue-600",
    },
    {
      id: "photo" as const,
      label: "Photo",
      icon: "📸",
      color: "from-purple-500 to-purple-600",
    },
    {
      id: "voice" as const,
      label: "Voice",
      icon: "🎤",
      color: "from-pink-500 to-pink-600",
    },
    {
      id: "discover" as const,
      label: "Discover",
      icon: "🔍",
      color: "from-amber-500 to-amber-600",
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
        <div className="fixed bottom-24 right-6 z-50 md:hidden space-y-3 animate-slideInUp">
          {actions.map((action, index) => (
            <button
              key={action.id}
              onClick={() => handleActionClick(action.id)}
              className="flex items-center gap-3 bg-white rounded-full shadow-lifted hover:shadow-strong transition-all pr-5 pl-4 py-3 group"
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${action.color} flex items-center justify-center text-2xl shadow-soft group-hover:scale-110 transition-transform`}>
                {action.icon}
              </div>
              <span className="font-semibold text-gray-900 min-w-[90px] text-left">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-20 right-6 z-50 md:bottom-8 md:right-8 w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-secondary-500 to-secondary-600 text-white shadow-lifted hover:shadow-strong active:scale-95 transition-all flex items-center justify-center ${
          isOpen ? "rotate-45" : ""
        }`}
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
