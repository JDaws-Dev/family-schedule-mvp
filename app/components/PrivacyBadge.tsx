"use client";

interface PrivacyBadgeProps {
  variant?: "email" | "family" | "secure";
  compact?: boolean;
}

export default function PrivacyBadge({ variant = "email", compact = false }: PrivacyBadgeProps) {
  const badges = {
    email: {
      icon: (
        <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      title: "Your emails are private",
      description: "We only look for schedules and never store your email content"
    },
    family: {
      icon: (
        <svg className="w-5 h-5 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      title: "Only your family can see this",
      description: "Your events are completely private to your family account"
    },
    secure: {
      icon: (
        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: "Bank-level security",
      description: "Your data is encrypted and protected"
    }
  };

  const badge = badges[variant];

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 text-sm text-gray-600">
        {badge.icon}
        <span className="font-medium">{badge.title}</span>
      </div>
    );
  }

  return (
    <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {badge.icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-primary-900 mb-1">
            {variant === "email" && "🔒 "}
            {variant === "family" && "👨‍👩‍👧 "}
            {variant === "secure" && "✓ "}
            {badge.title}
          </p>
          <p className="text-sm text-primary-800">
            {badge.description}
          </p>
        </div>
      </div>
    </div>
  );
}
