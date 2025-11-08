"use client";

import { useState } from "react";

interface WelcomePopupProps {
  onClose: () => void;
  userFirstName?: string;
}

export default function WelcomePopup({ onClose, userFirstName }: WelcomePopupProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-strong max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-8 text-white rounded-t-2xl">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">
                🎉 Welcome{userFirstName ? `, ${userFirstName}` : ""}!
              </h2>
              <p className="text-primary-50 text-lg">
                You're all set up! Here's what happens next...
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Step 1 */}
          <div className="mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">1️⃣</span>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  We're checking your emails right now
                </h3>
                <p className="text-gray-600 mb-3">
                  This usually takes 2-3 minutes. We're looking through your connected emails for schedules, activities, and events.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>💡 You can close this and come back!</strong> We'll keep working in the background and show you what we found on the <strong>"Review Events"</strong> page.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-accent-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">2️⃣</span>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Check back in 10 minutes
                </h3>
                <p className="text-gray-600 mb-3">
                  Go to <strong>"Review Events"</strong> to see what we found. You'll approve or dismiss each event (it only takes a few seconds!).
                </p>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    <strong>Why approve?</strong> We want to make sure we got the date and time right before adding it to your calendar.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">3️⃣</span>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Or add an event right now!
                </h3>
                <p className="text-gray-600 mb-3">
                  Want to see how it works? Type in an event yourself to add it to your calendar instantly.
                </p>
              </div>
            </div>
          </div>

          {/* Privacy reassurance */}
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-primary-900 mb-1">🔒 Your emails are private</p>
                <p className="text-sm text-primary-800">
                  We only look for schedules and never store your email content. Only your family can see your events.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors shadow-soft hover:shadow-medium"
            >
              Got it! Show me around
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              I'll explore on my own
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
