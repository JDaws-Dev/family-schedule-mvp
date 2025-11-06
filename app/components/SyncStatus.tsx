"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

function formatTimeSince(timestamp: number | null | undefined): string {
  if (!timestamp) return "Never";

  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

interface SyncStatusProps {
  familyId: Id<"families">;
  onScanNow?: () => void;
  isScanning?: boolean;
}

export function SyncStatus({ familyId, onScanNow, isScanning }: SyncStatusProps) {
  const syncStatus = useQuery(api.syncStatus.getSyncStatus, { familyId });

  if (!syncStatus) {
    return (
      <div className="bg-white rounded-lg shadow p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  const gmailStatus = formatTimeSince(syncStatus.gmail.lastSyncAt);
  const calendarStatus = formatTimeSince(syncStatus.calendar.lastSyncAt);

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Sync Status</h3>
        {onScanNow && syncStatus.gmail.accountCount > 0 && (
          <button
            onClick={onScanNow}
            disabled={isScanning}
            className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-sm font-semibold rounded-lg shadow-soft hover:shadow-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:-translate-y-0.5 disabled:transform-none flex items-center gap-2"
          >
            {isScanning ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Scanning...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Scan Now
              </>
            )}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {/* Gmail Status */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-red-50 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">Gmail</p>
              {syncStatus.gmail.lastSyncAt && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  ✓ Synced
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {syncStatus.gmail.accountCount === 0 ? (
                "No accounts connected"
              ) : (
                <>
                  Last scanned {gmailStatus}
                  {syncStatus.gmail.accountCount > 1 && ` (${syncStatus.gmail.accountCount} accounts)`}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Google Calendar Status */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">Google Calendar</p>
              {syncStatus.calendar.isConnected && syncStatus.calendar.lastSyncAt && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  ✓ Synced
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {!syncStatus.calendar.isConnected ? (
                "Not connected"
              ) : (
                `Last synced ${calendarStatus}`
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Warning for stale data */}
      {syncStatus.gmail.lastSyncAt &&
       Date.now() - syncStatus.gmail.lastSyncAt > 24 * 60 * 60 * 1000 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Gmail hasn't been scanned in over 24 hours
          </p>
        </div>
      )}
    </div>
  );
}
