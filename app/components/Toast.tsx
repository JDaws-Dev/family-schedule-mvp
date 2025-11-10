"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  undoAction?: () => void;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, undoAction?: () => void, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', undoAction?: () => void, duration: number = 5000) => {
    const id = Math.random().toString(36).substring(7);
    const newToast: Toast = { id, message, type, undoAction, duration };

    setToasts((prev) => [...prev, newToast]);

    // Auto-remove toast after specified duration
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container */}
      <div className="fixed bottom-24 md:bottom-4 right-0 z-50 p-4 space-y-3 max-w-md w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto transform transition-all duration-300 ease-in-out animate-slide-up"
            role="alert"
          >
            <div
              className={`rounded-lg shadow-strong p-4 flex items-start gap-3 ${
                toast.type === 'success'
                  ? 'bg-green-50 border-l-4 border-green-500'
                  : toast.type === 'error'
                  ? 'bg-red-50 border-l-4 border-red-500'
                  : toast.type === 'warning'
                  ? 'bg-amber-50 border-l-4 border-amber-500'
                  : 'bg-blue-50 border-l-4 border-blue-500'
              }`}
            >
              {/* Icon */}
              <div className="flex-shrink-0">
                {toast.type === 'success' && (
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {toast.type === 'error' && (
                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {toast.type === 'warning' && (
                  <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {toast.type === 'info' && (
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>

              {/* Message */}
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${
                    toast.type === 'success'
                      ? 'text-green-900'
                      : toast.type === 'error'
                      ? 'text-red-900'
                      : toast.type === 'warning'
                      ? 'text-amber-900'
                      : 'text-blue-900'
                  }`}
                >
                  {toast.message}
                </p>
              </div>

              {/* Undo Button */}
              {toast.undoAction && (
                <button
                  onClick={() => {
                    toast.undoAction!();
                    removeToast(toast.id);
                  }}
                  className={`flex-shrink-0 px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                    toast.type === 'success'
                      ? 'text-green-700 hover:bg-green-100'
                      : toast.type === 'error'
                      ? 'text-red-700 hover:bg-red-100'
                      : toast.type === 'warning'
                      ? 'text-amber-700 hover:bg-amber-100'
                      : 'text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  Undo
                </button>
              )}

              {/* Close Button */}
              <button
                onClick={() => removeToast(toast.id)}
                className={`flex-shrink-0 rounded-lg p-1 transition-colors ${
                  toast.type === 'success'
                    ? 'text-green-600 hover:bg-green-100'
                    : toast.type === 'error'
                    ? 'text-red-600 hover:bg-red-100'
                    : toast.type === 'warning'
                    ? 'text-amber-600 hover:bg-amber-100'
                    : 'text-blue-600 hover:bg-blue-100'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add animation styles */}
      <style jsx global>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </ToastContext.Provider>
  );
}
