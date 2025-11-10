"use client";

import Link from "next/link";

interface ActionItemsCardProps {
  actionCount: number;
  unconfirmedCount: number;
}

export default function ActionItemsCard({ actionCount, unconfirmedCount }: ActionItemsCardProps) {
  const totalActions = actionCount + unconfirmedCount;

  if (totalActions === 0) {
    return null; // Don't show card if no actions needed
  }

  return (
    <div className="mb-6">
      <Link href="/review">
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-5 shadow-md hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-3xl">⚠️</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">📬 Inbox</h2>
                <p className="text-xs text-amber-50">Events need attention</p>
              </div>
            </div>
            <div className="bg-white rounded-full w-10 h-10 flex items-center justify-center">
              <span className="text-amber-600 font-bold text-lg">{totalActions}</span>
            </div>
          </div>

          {/* Breakdown */}
          <div className="mt-4 space-y-2">
            {unconfirmedCount > 0 && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center justify-between">
                <span className="text-white text-sm font-medium">Events to Approve</span>
                <span className="text-white font-bold">{unconfirmedCount}</span>
              </div>
            )}
            {actionCount > 0 && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center justify-between">
                <span className="text-white text-sm font-medium">RSVPs & Actions</span>
                <span className="text-white font-bold">{actionCount}</span>
              </div>
            )}
          </div>

          {/* Arrow indicator */}
          <div className="mt-3 flex items-center justify-end">
            <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </Link>
    </div>
  );
}
