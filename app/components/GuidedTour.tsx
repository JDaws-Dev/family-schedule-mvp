"use client";

import { useEffect, useState } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export function useGuidedTour() {
  const [hasSeenTour, setHasSeenTour] = useState(true); // Default to true, will check localStorage

  useEffect(() => {
    // Check if user has seen the tour before
    const seen = localStorage.getItem("hasSeenGuidedTour");
    setHasSeenTour(seen === "true");
  }, []);

  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      showButtons: ["next", "previous", "close"],
      steps: [
        {
          element: "#welcome-section",
          popover: {
            title: "Welcome to Our Daily Family! 👋",
            description: "Let's take a quick tour to show you how to never miss a kid's activity again. This will only take a minute!",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#scan-button",
          popover: {
            title: "🔍 Discover Events",
            description: "Click here to scan your connected email accounts for schedules, practices, and events. We'll automatically find soccer games, piano lessons, field trips, and more!",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#review-link",
          popover: {
            title: "✅ Events",
            description: "Add new events or review events found in your emails. You can edit, approve, or decline each one.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#calendar-link",
          popover: {
            title: "📅 View Your Calendar",
            description: "Your Calendar page shows all confirmed events. You can view them in month/week/day/list view, sync to Google Calendar, and manage everything in one place!",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#upcoming-events",
          popover: {
            title: "📌 Upcoming Events",
            description: "See your next events at a glance right here on the dashboard. Never miss what's coming up!",
            side: "top",
            align: "start",
          },
        },
        {
          popover: {
            title: "🎉 You're All Set!",
            description: "That's it! Start by connecting your Gmail account in Settings, then scan your emails to discover events. You can restart this tour anytime from your profile menu.",
          },
        },
      ],
      onDestroyStarted: () => {
        localStorage.setItem("hasSeenGuidedTour", "true");
        setHasSeenTour(true);
        driverObj.destroy();
      },
    });

    driverObj.drive();
  };

  const resetTour = () => {
    localStorage.removeItem("hasSeenGuidedTour");
    setHasSeenTour(false);
  };

  return {
    startTour,
    resetTour,
    hasSeenTour,
  };
}

// Component for showing a "Start Tour" button
export function GuidedTourButton() {
  const { startTour } = useGuidedTour();

  return (
    <button
      onClick={startTour}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Take a Tour
    </button>
  );
}
