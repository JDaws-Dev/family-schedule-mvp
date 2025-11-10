"use client";

import { useEffect } from "react";

interface AddEventChoiceModalProps {
  onClose: () => void;
  onCheckEmails: () => void;
  onTypeManually: () => void;
  onSearchSpecific: () => void;
  onPasteText?: () => void;
  onUploadPhoto?: () => void;
  onVoiceRecord?: () => void;
  isGmailConnected: boolean;
}

export default function AddEventChoiceModal({
  onClose,
  onCheckEmails,
  onTypeManually,
  onSearchSpecific,
  onPasteText,
  onUploadPhoto,
  onVoiceRecord,
  isGmailConnected
}: AddEventChoiceModalProps) {
  // Block body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div
        className="bg-white rounded-2xl shadow-strong max-w-lg w-full transform transition-all my-8 overflow-y-auto"
        style={{ maxHeight: 'calc(90vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-6 rounded-t-2xl">
          <h2 className="text-2xl font-bold text-white mb-1">
            Add an Event
          </h2>
          <p className="text-primary-50">
            How would you like to add your event?
          </p>
        </div>

        {/* Options */}
        <div className="p-6 space-y-3">
          {/* Option 1: Check emails (recommended) */}
          <button
            onClick={() => {
              onClose();
              onCheckEmails();
            }}
            disabled={!isGmailConnected}
            className="w-full text-left p-5 bg-gradient-to-r from-primary-50 to-primary-100 hover:from-primary-100 hover:to-primary-200 border-2 border-primary-300 rounded-xl transition-all duration-200 shadow-soft hover:shadow-medium disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg text-gray-900">
                    Check my emails automatically
                  </h3>
                  <span className="px-2 py-0.5 bg-primary-500 text-white text-xs font-semibold rounded-full">
                    Recommended
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  We'll look through your recent emails and find any schedules for you. Easiest option!
                </p>
                {!isGmailConnected && (
                  <p className="text-xs text-red-600 mt-2 font-medium">
                    ⚠️ Connect your email in Settings first
                  </p>
                )}
              </div>
              <svg className="w-5 h-5 text-primary-500 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* Option 2: Upload/Take Photo of Flyer */}
          {onUploadPhoto && (
            <button
              onClick={() => {
                onClose();
                onUploadPhoto();
              }}
              className="w-full text-left p-5 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border-2 border-green-300 rounded-xl transition-all duration-200 shadow-soft hover:shadow-medium group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg text-gray-900">
                      Snap a picture of a flyer
                    </h3>
                    <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-semibold rounded-full">
                      Super Easy!
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Take a photo or upload a picture of any flyer, schedule, or invitation. We'll read it and extract all the details automatically!
                  </p>
                  <p className="text-xs text-green-700 mt-2 font-medium">
                    📸 Perfect for soccer schedules, birthday invitations, camp flyers
                  </p>
                </div>
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          )}

          {/* Option 3: Voice Record */}
          {onVoiceRecord && (
            <button
              onClick={() => {
                onClose();
                onVoiceRecord();
              }}
              className="w-full text-left p-5 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 border-2 border-blue-300 rounded-xl transition-all duration-200 shadow-soft hover:shadow-medium group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg text-gray-900">
                      Just say it out loud
                    </h3>
                    <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-semibold rounded-full">
                      Hands-free!
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Tap the microphone and describe your event. "Soccer practice Tuesday 4pm at Lincoln Field" - we'll capture everything!
                  </p>
                  <p className="text-xs text-blue-700 mt-2 font-medium">
                    🎤 Perfect when you're driving or multitasking
                  </p>
                </div>
                <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          )}

          {/* Option 4: Paste text */}
          {onPasteText && (
            <button
              onClick={() => {
                onClose();
                onPasteText();
              }}
              className="w-full text-left p-5 bg-gradient-to-r from-purple-50 to-violet-50 hover:from-purple-100 hover:to-violet-100 border-2 border-purple-300 rounded-xl transition-all duration-200 shadow-soft hover:shadow-medium group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg text-gray-900">
                      Copy & paste text
                    </h3>
                    <span className="px-2 py-0.5 bg-purple-500 text-white text-xs font-semibold rounded-full">
                      Quick!
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Copy an email or text message and paste it here. We'll automatically extract all the event details for you!
                  </p>
                  <p className="text-xs text-purple-700 mt-2 font-medium">
                    📋 Great for forwarded emails or text messages
                  </p>
                </div>
                <svg className="w-5 h-5 text-purple-500 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          )}

          {/* Option 5: Search for something specific */}
          <button
            onClick={() => {
              onClose();
              onSearchSpecific();
            }}
            disabled={!isGmailConnected}
            className="w-full text-left p-5 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border-2 border-amber-300 rounded-xl transition-all duration-200 shadow-soft hover:shadow-medium disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg text-gray-900">
                    Search for something specific
                  </h3>
                  <span className="px-2 py-0.5 bg-amber-500 text-white text-xs font-semibold rounded-full">
                    Powerful!
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Looking for a particular event? Tell us what to look for and we'll search your emails to find it!
                </p>
                <p className="text-xs text-amber-700 mt-2 font-medium">
                  🔍 "Find my daughter's dance recital" or "Search for soccer"
                </p>
                {!isGmailConnected && (
                  <p className="text-xs text-red-600 mt-2 font-medium">
                    ⚠️ Connect your email in Settings first
                  </p>
                )}
              </div>
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* Option 6: Type it in */}
          <button
            onClick={() => {
              onClose();
              onTypeManually();
            }}
            className="w-full text-left p-5 bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-primary-300 rounded-xl transition-all duration-200 shadow-soft hover:shadow-medium group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gray-100 group-hover:bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-all">
                <svg className="w-6 h-6 text-gray-600 group-hover:text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-900 mb-1">
                  Type it in myself
                </h3>
                <p className="text-sm text-gray-600">
                  Manually enter all the details for your event. Good if you already know exactly what you need.
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-primary-500 flex-shrink-0 mt-1 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
          >
            Never mind
          </button>
        </div>
      </div>
    </div>
  );
}
