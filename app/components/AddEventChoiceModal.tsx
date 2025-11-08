"use client";

import { useState } from "react";

interface AddEventChoiceModalProps {
  onClose: () => void;
  onCheckEmails: () => void;
  onTypeManually: () => void;
  onSearchSpecific: () => void;
  onPasteText?: () => void;
  isGmailConnected: boolean;
}

export default function AddEventChoiceModal({
  onClose,
  onCheckEmails,
  onTypeManually,
  onSearchSpecific,
  onPasteText,
  isGmailConnected
}: AddEventChoiceModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-strong max-w-lg w-full transform transition-all">
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

          {/* Option 2: Type it in */}
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

          {/* Option 3: Paste text */}
          {onPasteText && (
            <button
              onClick={() => {
                onClose();
                onPasteText();
              }}
              className="w-full text-left p-5 bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-secondary-300 rounded-xl transition-all duration-200 shadow-soft hover:shadow-medium group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gray-100 group-hover:bg-secondary-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-all">
                  <svg className="w-6 h-6 text-gray-600 group-hover:text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">
                    Copy & paste text
                  </h3>
                  <p className="text-sm text-gray-600">
                    Copy an email or text message and paste it here. We'll automatically extract all the event details for you!
                  </p>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-secondary-500 flex-shrink-0 mt-1 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          )}

          {/* Option 4: Search for something specific */}
          <button
            onClick={() => {
              onClose();
              onSearchSpecific();
            }}
            disabled={!isGmailConnected}
            className="w-full text-left p-5 bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-accent-300 rounded-xl transition-all duration-200 shadow-soft hover:shadow-medium disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gray-100 group-hover:bg-accent-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-all">
                <svg className="w-6 h-6 text-gray-600 group-hover:text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-900 mb-1">
                  Search for something specific
                </h3>
                <p className="text-sm text-gray-600">
                  Looking for a particular event? We'll search your emails for exactly what you need.
                </p>
                {!isGmailConnected && (
                  <p className="text-xs text-red-600 mt-2 font-medium">
                    ⚠️ Connect your email in Settings first
                  </p>
                )}
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-accent-500 flex-shrink-0 mt-1 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
