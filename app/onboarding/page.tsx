"use client";

import Link from "next/link";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [familyName, setFamilyName] = useState("");
  const [primaryEmail, setPrimaryEmail] = useState("");
  const [familyMembers, setFamilyMembers] = useState<Array<{ name: string; birthdate: string; relationship: string }>>([
    { name: "", birthdate: "", relationship: "Child" }
  ]);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionMessage, setCompletionMessage] = useState("");
  const { user: clerkUser } = useUser();
  const router = useRouter();

  // Get current user to access familyId
  const currentUser = useQuery(api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );

  // Mutations
  const updateFamilyName = useMutation(api.families.createFamily);
  const saveFamilyMember = useMutation(api.familyMembers.addFamilyMember);

  const totalSteps = 3;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    router.push("/dashboard");
  };

  const handleComplete = async () => {
    if (!currentUser?.familyId) {
      alert("Unable to save data. Please try again.");
      return;
    }

    setIsCompleting(true);
    setCompletionMessage("Saving your family information...");

    try {
      // Save family members
      const validMembers = familyMembers.filter(m => m.name.trim() !== "");

      for (const member of validMembers) {
        await saveFamilyMember({
          familyId: currentUser.familyId,
          name: member.name.trim(),
          birthdate: member.birthdate || undefined,
          relationship: member.relationship || undefined,
          nicknames: "", // Empty for now, can be added later in settings
          interests: "", // Empty for now, can be added later in settings
          color: undefined, // Will be auto-assigned in settings
        });
      }

      setCompletionMessage("✓ Family members saved! Redirecting to Gmail connection...");

      // Wait a moment to show success message
      setTimeout(() => {
        // Redirect to Gmail OAuth
        window.location.href = "/api/auth/google?returnUrl=/dashboard?onboarding_complete=true";
      }, 1500);

    } catch (error) {
      console.error("Error saving onboarding data:", error);
      alert("Failed to save your information. Please try again.");
      setIsCompleting(false);
      setCompletionMessage("");
    }
  };

  const addFamilyMember = () => {
    setFamilyMembers([...familyMembers, { name: "", birthdate: "", relationship: "Child" }]);
  };

  const removeFamilyMember = (index: number) => {
    setFamilyMembers(familyMembers.filter((_, i) => i !== index));
  };

  const updateFamilyMember = (index: number, field: string, value: string) => {
    const updated = [...familyMembers];
    updated[index] = { ...updated[index], [field]: value };
    setFamilyMembers(updated);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="text-2xl font-bold text-primary-600">
            Our Daily Family
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-200 ${
                    step === currentStep
                      ? "bg-primary-600 text-white scale-110 shadow-medium"
                      : step < currentStep
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {step < currentStep ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step
                  )}
                </div>
                {step < 3 && (
                  <div
                    className={`h-1 flex-1 mx-2 transition-all duration-200 ${
                      step < currentStep ? "bg-green-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm">
            <span className={currentStep === 1 ? "text-primary-600 font-medium" : "text-gray-500"}>
              Welcome
            </span>
            <span className={currentStep === 2 ? "text-primary-600 font-medium" : "text-gray-500"}>
              Family Members
            </span>
            <span className={currentStep === 3 ? "text-primary-600 font-medium" : "text-gray-500"}>
              Connect Gmail
            </span>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-strong p-8">
          {/* Step 1: Welcome */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Our Daily Family!</h1>
                <p className="text-gray-600">Let's get your family calendar set up in just a few minutes.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Family Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., The Johnsons"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">This helps personalize your experience</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Email
                </label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={primaryEmail}
                  onChange={(e) => setPrimaryEmail(e.target.value)}
                  defaultValue={clerkUser?.primaryEmailAddress?.emailAddress}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">We'll use this for important notifications</p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="font-semibold text-blue-900 text-sm">What's next?</h4>
                    <p className="text-sm text-blue-800 mt-1">
                      We'll help you add family members and connect your Gmail to automatically find all your kids' activities.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Family Members */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Add Your Family Members</h1>
                <p className="text-gray-600">Tell us about the people whose schedules you want to track.</p>
              </div>

              <div className="space-y-4">
                {familyMembers.map((member, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-gray-900">Family Member {index + 1}</h3>
                      {familyMembers.length > 1 && (
                        <button
                          onClick={() => removeFamilyMember(index)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                        <input
                          type="text"
                          placeholder="e.g., Emma"
                          value={member.name}
                          onChange={(e) => updateFamilyMember(index, "name", e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Birthdate (Optional)</label>
                        <input
                          type="date"
                          value={member.birthdate}
                          onChange={(e) => updateFamilyMember(index, "birthdate", e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Relationship</label>
                      <select
                        value={member.relationship}
                        onChange={(e) => updateFamilyMember(index, "relationship", e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="Child">Child</option>
                        <option value="Parent">Parent</option>
                        <option value="Spouse">Spouse</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={addFamilyMember}
                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 font-medium hover:border-primary-400 hover:text-primary-600 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Another Family Member
              </button>

              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h4 className="font-semibold text-purple-900 text-sm mb-2">Why add family members?</h4>
                <ul className="text-sm text-purple-800 space-y-1 list-disc list-inside">
                  <li>Organize events by person</li>
                  <li>Get personalized activity recommendations</li>
                  <li>Track everyone's schedule in one place</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 3: Connect Gmail */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {isCompleting ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{completionMessage}</h2>
                  <p className="text-gray-600">Please wait while we set everything up...</p>
                </div>
              ) : (
                <>
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                      </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Ready to Connect Gmail!</h1>
                    <p className="text-gray-600">We'll save your family info and connect your email to find activities automatically.</p>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-6 text-white">
                      <h3 className="font-bold text-lg mb-2">What we'll do:</h3>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-3">
                          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Scan your email for school schedules, sports practices, and activities</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Extract event details like dates, times, and locations</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Organize everything into your family calendar automatically</span>
                        </li>
                      </ul>
                    </div>

                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="flex gap-3">
                        <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <div>
                          <h4 className="font-semibold text-green-900 text-sm">Your privacy is protected</h4>
                          <p className="text-sm text-green-800 mt-1">
                            We only read emails related to schedules and activities. We never store your email content.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-8 border-t border-gray-200 mt-8">
            <button
              onClick={handleSkip}
              disabled={isCompleting}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Skip for now
            </button>

            <div className="flex gap-3">
              {currentStep > 1 && !isCompleting && (
                <button
                  onClick={handleBack}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
              )}
              {currentStep < totalSteps ? (
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={handleComplete}
                  disabled={isCompleting}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isCompleting ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    "Save & Connect Gmail"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
