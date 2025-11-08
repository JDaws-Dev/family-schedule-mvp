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
  const [familyMembers, setFamilyMembers] = useState<Array<{ name: string; birthdate: string; relationship: string; interests: string }>>([
    { name: "", birthdate: "", relationship: "Parent", interests: "" }
  ]);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionMessage, setCompletionMessage] = useState("");
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState("");
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("");
  const [calendarAction, setCalendarAction] = useState<"select" | "create">("select");
  const [newCalendarName, setNewCalendarName] = useState("Family Activities");
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [enableSms, setEnableSms] = useState(false);
  const [emailDigestFrequency, setEmailDigestFrequency] = useState<"none" | "daily" | "weekly">("daily");
  const { user: clerkUser } = useUser();
  const router = useRouter();

  // Get current user to access familyId
  const currentUser = useQuery(api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );

  // Get connected Gmail accounts
  const gmailAccounts = useQuery(
    api.gmailAccounts.getFamilyGmailAccounts,
    currentUser?.familyId ? { familyId: currentUser.familyId } : "skip"
  );

  // Mutations
  const updateFamilyName = useMutation(api.families.createFamily);
  const updateFamilyDetails = useMutation(api.families.updateFamilyDetails);
  const saveFamilyMember = useMutation(api.familyMembers.addFamilyMember);
  const setFamilyCalendar = useMutation(api.families.updateSelectedCalendar);

  const totalSteps = 6;

  const handleNext = async () => {
    if (currentStep < totalSteps) {
      // Show celebration for completing step 1
      if (currentStep === 1) {
        if (!familyName.trim()) {
          alert("Please enter your family name to continue.");
          return;
        }
        if (!primaryEmail.trim()) {
          alert("Please enter your email address to continue.");
          return;
        }
        setCelebrationMessage("Perfect! Nice to meet you! 🎉");
        setShowCelebration(true);
        setTimeout(() => {
          setShowCelebration(false);
          setCurrentStep(currentStep + 1);
        }, 1500);
      }
      // Show celebration for completing step 2 (family members)
      else if (currentStep === 2) {
        const membersAdded = familyMembers.filter(m => m.name.trim() !== "").length;
        if (membersAdded === 0) {
          alert("Please add at least one family member to continue.");
          return;
        }
        if (membersAdded > 0) {
          setCelebrationMessage(membersAdded === 1
            ? "Wonderful! Now let's learn what your family loves to do! 💝"
            : `Amazing! ${membersAdded} family members added! Now let's hear about your family's interests! 💝`);
        }
        setShowCelebration(true);
        setTimeout(() => {
          setShowCelebration(false);
          setCurrentStep(currentStep + 1);
        }, 2000);
      }
      // Show celebration for completing step 3 (interests) and save data
      else if (currentStep === 3) {
        const saved = await saveFamilyData();
        if (saved) {
          setCelebrationMessage("Perfect! Data saved! Now let's connect your email! 🎨⚽🎵");
          setShowCelebration(true);
          setTimeout(() => {
            setShowCelebration(false);
            setCurrentStep(currentStep + 1);
          }, 1500);
        }
      }
      // Move to step 5 and fetch calendars
      else if (currentStep === 4) {
        if (!gmailAccounts || gmailAccounts.length === 0) {
          alert("Please connect at least one Gmail account to continue.");
          return;
        }
        setCelebrationMessage("Great! Email connected! Loading calendars... 📧");
        setShowCelebration(true);
        setTimeout(async () => {
          setShowCelebration(false);
          setCurrentStep(currentStep + 1);
          await fetchCalendars();
        }, 1500);
      }
      // Move to step 6 (notifications)
      else if (currentStep === 5) {
        if (calendarAction === "select" && !selectedCalendarId) {
          alert("Please select a calendar to continue.");
          return;
        }
        if (calendarAction === "create" && !newCalendarName.trim()) {
          alert("Please enter a calendar name to continue.");
          return;
        }
        setCelebrationMessage("Perfect! Calendar set up! One last step... 📅");
        setShowCelebration(true);
        setTimeout(() => {
          setShowCelebration(false);
          setCurrentStep(currentStep + 1);
        }, 1500);
      }
      else {
        setCurrentStep(currentStep + 1);
      }
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

  // Save family data at step 3
  const saveFamilyData = async () => {
    if (!currentUser?.familyId) {
      alert("Unable to save data. Please try again.");
      return false;
    }

    try {
      // Save family name and primary email
      if (familyName.trim() || primaryEmail.trim()) {
        await updateFamilyDetails({
          familyId: currentUser.familyId,
          name: familyName.trim() || undefined,
          primaryEmail: primaryEmail.trim() || undefined,
        });
      }

      // Save family members
      const validMembers = familyMembers.filter(m => m.name.trim() !== "");

      for (const member of validMembers) {
        await saveFamilyMember({
          familyId: currentUser.familyId,
          name: member.name.trim(),
          birthdate: member.birthdate || undefined,
          relationship: member.relationship || undefined,
          nicknames: "", // Can be added later in settings
          interests: member.interests.trim() || "", // Save interests from onboarding
          color: undefined, // Will be auto-assigned in settings
        });
      }

      return true;
    } catch (error) {
      console.error("Error saving onboarding data:", error);
      alert("Failed to save your information. Please try again.");
      return false;
    }
  };

  // Fetch available Google Calendars
  const fetchCalendars = async () => {
    if (!currentUser?.familyId) return;

    setIsLoadingCalendars(true);
    try {
      const response = await fetch("/api/google-calendars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyId: currentUser.familyId }),
      });

      if (response.ok) {
        const data = await response.json();
        setCalendars(data.calendars || []);
      } else {
        console.error("Failed to fetch calendars");
      }
    } catch (error) {
      console.error("Error fetching calendars:", error);
    } finally {
      setIsLoadingCalendars(false);
    }
  };

  // Handle final completion with calendar setup
  const handleFinalComplete = async () => {
    if (!currentUser?.familyId) {
      alert("Unable to complete setup. Please try again.");
      return;
    }

    setIsCompleting(true);

    try {
      if (calendarAction === "create") {
        // Create new calendar
        setCompletionMessage("Creating your Family Activities calendar...");

        const response = await fetch("/api/create-calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            familyId: currentUser.familyId,
            calendarName: newCalendarName
          }),
        });

        if (response.ok) {
          const data = await response.json();
          await setFamilyCalendar({
            familyId: currentUser.familyId,
            googleCalendarId: data.calendarId,
            calendarName: newCalendarName || "Family Activities",
          });
          setCompletionMessage("✓ Calendar created successfully!");
        } else {
          throw new Error("Failed to create calendar");
        }
      } else if (selectedCalendarId) {
        // Use selected calendar
        setCompletionMessage("Setting up your calendar...");
        const selectedCal = availableCalendars?.find(cal => cal.id === selectedCalendarId);
        await setFamilyCalendar({
          familyId: currentUser.familyId,
          googleCalendarId: selectedCalendarId,
          calendarName: selectedCal?.summary || "Family Calendar",
        });
        setCompletionMessage("✓ Calendar connected successfully!");
      }

      // Save notification preferences
      setCompletionMessage("Saving your notification preferences...");
      await updateFamilyDetails({
        familyId: currentUser.familyId,
        phoneNumber: enableSms ? phoneNumber : undefined,
        enableSmsNotifications: enableSms,
        emailDigestFrequency: emailDigestFrequency,
      });
      setCompletionMessage("✓ All set! Redirecting to your dashboard...");

      // Redirect to dashboard
      setTimeout(() => {
        router.push("/dashboard?onboarding_complete=true");
      }, 1500);

    } catch (error) {
      console.error("Error completing setup:", error);
      alert("Failed to complete setup. Please try again.");
      setIsCompleting(false);
      setCompletionMessage("");
    }
  };

  const addFamilyMember = () => {
    setFamilyMembers([...familyMembers, { name: "", birthdate: "", relationship: "Child", interests: "" }]);
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
          <div className="flex items-start justify-between">
            {[
              { num: 1, label: "You" },
              { num: 2, label: "Family" },
              { num: 3, label: "Interests" },
              { num: 4, label: "Email" },
              { num: 5, label: "Calendar" },
              { num: 6, label: "Alerts" }
            ].map((step, index) => (
              <div key={step.num} className="flex flex-col items-center flex-1">
                <div className="flex items-center w-full">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-200 mx-auto ${
                      step.num === currentStep
                        ? "bg-primary-600 text-white scale-110 shadow-medium"
                        : step.num < currentStep
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {step.num < currentStep ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      step.num
                    )}
                  </div>
                </div>
                {index < 5 && (
                  <div
                    className={`h-1 absolute left-1/2 top-5 -translate-y-1/2 transition-all duration-200 ${
                      step.num < currentStep ? "bg-green-500" : "bg-gray-200"
                    }`}
                    style={{ width: 'calc(100% - 2.5rem)' }}
                  />
                )}
                <span className={`text-xs mt-2 text-center ${
                  currentStep === step.num
                    ? "text-primary-600 font-semibold"
                    : currentStep > step.num
                    ? "text-green-600 font-medium"
                    : "text-gray-500"
                }`}>
                  {currentStep > step.num ? `✓ ${step.label}` : step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-strong p-8">
          {/* Step 1: Welcome */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-4xl">👋</span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-3">Welcome! Let's start with you.</h1>
                <p className="text-lg text-gray-600 max-w-xl mx-auto">
                  We know how overwhelming it can be to keep track of everyone's schedules.
                  Before we dive into your family, let's get your info set up.
                </p>
                <p className="text-sm text-primary-600 font-medium mt-2">This will only take 2-3 minutes 💙</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={primaryEmail}
                  onChange={(e) => setPrimaryEmail(e.target.value)}
                  defaultValue={clerkUser?.primaryEmailAddress?.emailAddress}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                />
                <p className="text-xs text-gray-500 mt-1.5">We'll send you helpful reminders here (no spam, we promise!)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What should we call your family? <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., The Johnsons"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                />
                <p className="text-xs text-gray-500 mt-1.5">Makes the experience more personal - you can always change it later</p>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-5 border border-blue-200">
                <div className="flex gap-3">
                  <span className="text-2xl">✨</span>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">Coming up next...</h4>
                    <p className="text-sm text-gray-700">
                      We'll ask about your family members and their interests, then connect your emails,
                      and finally set up your calendar. We'll automatically find all those soccer practices,
                      piano lessons, and field trips - no more digging through your inbox!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Family Members */}
          {currentStep === 2 && (
            <div className="space-y-8">
              <div className="text-center mb-10">
                <div className="w-24 h-24 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-xl">
                  <span className="text-5xl">💖</span>
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">Tell us about your family!</h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                  Who are the amazing people whose schedules you're juggling?
                  Kids, spouse, yourself - anyone whose activities you're managing!
                </p>
                <div className="mt-4 inline-flex items-center gap-2 bg-gradient-to-r from-purple-100 to-pink-100 px-6 py-3 rounded-full border-2 border-purple-300">
                  <span className="text-2xl">✨</span>
                  <p className="text-base text-purple-900 font-semibold">
                    {familyMembers.filter(m => m.name.trim()).length === 0
                      ? "Start by adding your first family member below!"
                      : familyMembers.filter(m => m.name.trim()).length === 1
                      ? "Great start! Add more family members if you'd like 💙"
                      : `${familyMembers.filter(m => m.name.trim()).length} wonderful people added! 🎉`}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {familyMembers.map((member, index) => (
                  <div key={index} className="border-2 border-purple-200 bg-gradient-to-br from-white to-purple-50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-secondary-400 to-secondary-600 rounded-full flex items-center justify-center shadow-md">
                          <span className="text-2xl">
                            {member.relationship === "Child" ? "👶" : member.relationship === "Parent" ? "👨" : member.relationship === "Spouse" ? "💑" : "👤"}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">
                            {member.name.trim() ? member.name : index === 0 ? "You" : `Family Member ${index + 1}`}
                          </h3>
                          <p className="text-sm text-gray-600">{member.relationship}</p>
                        </div>
                      </div>
                      {familyMembers.length > 1 && (
                        <button
                          onClick={() => removeFamilyMember(index)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-base font-semibold text-gray-800 mb-2">
                            Name <span className="text-red-500">*</span>
                            {index === 0 && <span className="text-sm font-normal text-gray-600 ml-2">(Start with yourself!)</span>}
                          </label>
                          <input
                            type="text"
                            placeholder={index === 0 ? "e.g., Sarah, Mom, Your name" : "e.g., Emma, Michael, Dad"}
                            value={member.name}
                            onChange={(e) => updateFamilyMember(index, "name", e.target.value)}
                            className="w-full px-5 py-3 text-lg border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-base font-semibold text-gray-800 mb-2">Relationship</label>
                          <select
                            value={member.relationship}
                            onChange={(e) => updateFamilyMember(index, "relationship", e.target.value)}
                            className="w-full px-5 py-3 text-lg border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                          >
                            <option value="Child">Child</option>
                            <option value="Parent">Parent</option>
                            <option value="Spouse">Spouse</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-base font-semibold text-gray-800 mb-2">Birthdate (Optional)</label>
                        <input
                          type="date"
                          value={member.birthdate}
                          onChange={(e) => updateFamilyMember(index, "birthdate", e.target.value)}
                          className="w-full px-5 py-3 text-lg border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                        />
                        <p className="text-sm text-gray-600 mt-2 ml-1">We'll send you birthday reminders! 🎂</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={addFamilyMember}
                className="w-full px-6 py-5 border-3 border-dashed border-purple-400 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl text-purple-700 text-lg font-bold hover:border-purple-600 hover:from-purple-100 hover:to-pink-100 hover:text-purple-900 transition-all flex items-center justify-center gap-3 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
              >
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span>Add Another Family Member</span>
                <span className="text-2xl">💝</span>
              </button>

              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border-2 border-blue-200 shadow-md">
                <div className="flex gap-4">
                  <span className="text-3xl">👀</span>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg mb-2">Coming up next...</h4>
                    <p className="text-base text-gray-700">
                      We'll ask about each person's hobbies and interests! This helps us suggest relevant activities
                      and automatically find schedules in your emails for soccer, piano, dance, and more.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Interests and Hobbies */}
          {currentStep === 3 && (
            <div className="space-y-8">
              <div className="text-center mb-10">
                <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-xl">
                  <span className="text-5xl">🎨</span>
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">Now, what are they into?</h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                  Tell us about each person's hobbies and interests! This is KEY to helping you stay on top of schedules.
                  The more specific you are, the better we can help!
                </p>
                <p className="text-lg text-amber-600 font-semibold mt-3">
                  Soccer? Piano? Dance? Swimming? Robotics? Tell us everything! 🎵⚽🎭
                </p>
              </div>

              <div className="space-y-6">
                {familyMembers.filter(m => m.name.trim()).map((member, index) => (
                  <div key={index} className="border-3 border-amber-300 bg-gradient-to-br from-white to-amber-50 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-3xl">
                          {member.relationship === "Child" ? "👶" : member.relationship === "Parent" ? "👨" : member.relationship === "Spouse" ? "💑" : "👤"}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">{member.name}</h3>
                        <p className="text-base text-gray-600">{member.relationship}</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 border-2 border-amber-200">
                      <label className="block text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-2xl">✨</span>
                        What does {member.name.split(' ')[0]} love to do?
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., soccer, piano lessons, art class, dance, swimming, reading, robotics club, basketball..."
                        value={member.interests}
                        onChange={(e) => updateFamilyMember(index, "interests", e.target.value)}
                        className="w-full px-6 py-5 text-lg border-2 border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-white shadow-sm"
                      />
                      <div className="mt-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
                        <p className="text-sm text-amber-900 font-semibold flex items-start gap-2">
                          <span className="text-lg">💡</span>
                          <span>
                            <strong>Pro tip:</strong> Be specific! Instead of just "sports," try "soccer practice, basketball games, swim team."
                            We'll scan your emails for schedules related to these specific activities and automatically add them to your calendar!
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200 shadow-md">
                <div className="flex gap-4">
                  <span className="text-4xl">🎯</span>
                  <div>
                    <h4 className="font-bold text-gray-900 text-xl mb-3">Why this matters so much</h4>
                    <ul className="text-base text-gray-700 space-y-3">
                      <li className="flex items-start gap-3">
                        <span className="text-green-600 text-2xl font-bold">•</span>
                        <span><strong>Smart email scanning</strong> - We'll look for emails about "soccer practice" or "piano recital" and catch schedules you might have missed</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-green-600 text-2xl font-bold">•</span>
                        <span><strong>Activity suggestions</strong> - Based on their interests, we'll suggest local camps, classes, and events they might enjoy</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-green-600 text-2xl font-bold">•</span>
                        <span><strong>Never miss practice!</strong> - When your coach emails the updated practice schedule, we'll catch it and add it automatically</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Connect Email(s) */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-4xl">📧</span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-3">Connect your email accounts</h1>
                <p className="text-lg text-gray-600 max-w-xl mx-auto">
                  Connect all the email accounts where you might receive schedules and activity info -
                  work email, personal email, your spouse's email, anywhere!
                </p>
                <p className="text-sm text-blue-600 font-medium mt-2">The more emails you connect, the less you'll miss! 💙</p>
              </div>

              {/* Connected Accounts */}
              {gmailAccounts && gmailAccounts.length > 0 && (
                <div className="bg-white rounded-xl border-2 border-green-200 p-5">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Connected Accounts
                  </h3>
                  <div className="space-y-2">
                    {gmailAccounts.map((account) => (
                      <div key={account._id} className="flex items-center justify-between py-2 px-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">✓</span>
                          <span className="font-medium text-gray-900">{account.gmailEmail}</span>
                        </div>
                        <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">Connected</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Connect Gmail Button */}
              <Link
                href={`/api/auth/google?returnUrl=/onboarding`}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19" />
                </svg>
                {gmailAccounts && gmailAccounts.length > 0 ? "Connect Another Email" : "Connect Your First Email"}
              </Link>

              <div className="space-y-4">
                <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-6 text-white">
                  <h3 className="font-bold text-lg mb-2">What we'll scan for:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>School schedules, field trips, and permission slips</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Sports practices, games, and tournament schedules</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Music lessons, dance classes, and activity sign-ups</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-purple-50 rounded-xl p-5 border border-purple-200">
                  <div className="flex gap-3">
                    <span className="text-2xl">💡</span>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm mb-2">Pro tip: Connect them all!</h4>
                      <ul className="text-sm text-gray-700 space-y-1.5">
                        <li className="flex items-start gap-2">
                          <span className="text-purple-600">•</span>
                          <span>Kids' school newsletters might go to your work email</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-600">•</span>
                          <span>Sports league emails might go to your personal Gmail</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-600">•</span>
                          <span>Your spouse might receive practice schedule updates</span>
                        </li>
                      </ul>
                      <p className="text-blue-900 font-medium mt-3">
                        Connect all emails now - you can always add more or remove them later in Settings! ✨
                      </p>
                    </div>
                  </div>
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
            </div>
          )}

          {/* Step 5: Calendar Selection */}
          {currentStep === 5 && (
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
              ) : isLoadingCalendars ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Loading your calendars...</h2>
                  <p className="text-gray-600">This will only take a moment</p>
                </div>
              ) : (
                <>
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <span className="text-4xl">📅</span>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-3">Last step: Choose your calendar!</h1>
                    <p className="text-lg text-gray-600 max-w-xl mx-auto">
                      Where should we add your family events?
                    </p>
                    <p className="text-sm text-green-600 font-medium mt-2">One more step and you're all set! 🌟</p>
                  </div>

                  <div className="space-y-6">
                    {/* Calendar Action Selection */}
                    <div className="space-y-4">
                      {/* Option 1: Select Existing Calendar */}
                      <div
                        onClick={() => setCalendarAction("select")}
                        className={`border-2 rounded-xl p-5 cursor-pointer transition-all ${
                          calendarAction === "select"
                            ? "border-primary-500 bg-primary-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            checked={calendarAction === "select"}
                            onChange={() => setCalendarAction("select")}
                            className="mt-1 w-5 h-5 text-primary-600"
                          />
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900 text-lg mb-1">Use an existing calendar</h3>
                            <p className="text-sm text-gray-600 mb-3">
                              Select any calendar you already have. We'll add events to it (we won't delete or modify anything already there!)
                            </p>
                            {calendarAction === "select" && (
                              <select
                                value={selectedCalendarId}
                                onChange={(e) => setSelectedCalendarId(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              >
                                <option value="">Select a calendar...</option>
                                {calendars.map((cal) => (
                                  <option key={cal.id} value={cal.id}>
                                    {cal.summary} {cal.primary && "(Primary)"} - {cal.accountEmail}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Option 2: Create New Calendar */}
                      <div
                        onClick={() => setCalendarAction("create")}
                        className={`border-2 rounded-xl p-5 cursor-pointer transition-all ${
                          calendarAction === "create"
                            ? "border-primary-500 bg-primary-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            checked={calendarAction === "create"}
                            onChange={() => setCalendarAction("create")}
                            className="mt-1 w-5 h-5 text-primary-600"
                          />
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900 text-lg mb-1">Create a new calendar</h3>
                            <p className="text-sm text-gray-600 mb-3">
                              We'll make a fresh calendar just for these events. Your existing calendars stay exactly as they are.
                            </p>
                            {calendarAction === "create" && (
                              <input
                                type="text"
                                value={newCalendarName}
                                onChange={(e) => setNewCalendarName(e.target.value)}
                                placeholder="Calendar name..."
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                      <div className="flex gap-3">
                        <span className="text-2xl">✨</span>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm mb-2">Your calendars are 100% safe!</h4>
                          <p className="text-sm text-gray-700">
                            We'll only add new events - we'll never delete or modify your existing events. You're in complete control!
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-6 text-white">
                      <h3 className="font-bold text-lg mb-2">What happens next:</h3>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-3">
                          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>We'll scan your connected emails for activity-related messages</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Extract dates, times, and locations automatically</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Add them to your chosen calendar for easy viewing</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 6: Notification Preferences */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-4xl">🔔</span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-3">How should we keep you updated?</h1>
                <p className="text-lg text-gray-600 max-w-xl mx-auto">
                  Choose how you'd like to receive reminders about upcoming events and important actions.
                </p>
                <p className="text-sm text-purple-600 font-medium mt-2">You can always change these later! 💜</p>
              </div>

              <div className="space-y-6">
                {/* SMS Notifications */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-2 border-purple-200 p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">Text Message Alerts</h3>
                      <p className="text-sm text-gray-700 mb-4">
                        Get quick reminders sent to your phone about urgent action items and upcoming events.
                      </p>

                      <div className="flex items-center gap-3 mb-4">
                        <input
                          type="checkbox"
                          id="enableSms"
                          checked={enableSms}
                          onChange={(e) => setEnableSms(e.target.checked)}
                          className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                        />
                        <label htmlFor="enableSms" className="text-sm font-semibold text-gray-900 cursor-pointer">
                          Yes, send me text reminders
                        </label>
                      </div>

                      {enableSms && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Your phone number
                          </label>
                          <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="(555) 123-4567"
                            className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                          />
                          <p className="text-xs text-gray-600 mt-2">
                            We'll send you reminders 1 day before events and when actions are due soon.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Email Digest */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 p-6">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">Email Summary</h3>
                      <p className="text-sm text-gray-700 mb-4">
                        Get a convenient summary of your upcoming week delivered to your inbox.
                      </p>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          How often would you like to receive the summary?
                        </label>
                        <div className="space-y-3">
                          <label className="flex items-center gap-3 p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-white transition-all">
                            <input
                              type="radio"
                              name="emailDigest"
                              value="daily"
                              checked={emailDigestFrequency === "daily"}
                              onChange={() => setEmailDigestFrequency("daily")}
                              className="w-5 h-5 text-green-600"
                            />
                            <div className="flex-1">
                              <span className="block font-semibold text-gray-900">Daily</span>
                              <span className="block text-xs text-gray-600">Every morning at 7am</span>
                            </div>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                              Recommended
                            </span>
                          </label>

                          <label className="flex items-center gap-3 p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-white transition-all">
                            <input
                              type="radio"
                              name="emailDigest"
                              value="weekly"
                              checked={emailDigestFrequency === "weekly"}
                              onChange={() => setEmailDigestFrequency("weekly")}
                              className="w-5 h-5 text-green-600"
                            />
                            <div className="flex-1">
                              <span className="block font-semibold text-gray-900">Weekly</span>
                              <span className="block text-xs text-gray-600">Every Sunday at 7am</span>
                            </div>
                          </label>

                          <label className="flex items-center gap-3 p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-white transition-all">
                            <input
                              type="radio"
                              name="emailDigest"
                              value="none"
                              checked={emailDigestFrequency === "none"}
                              onChange={() => setEmailDigestFrequency("none")}
                              className="w-5 h-5 text-green-600"
                            />
                            <div className="flex-1">
                              <span className="block font-semibold text-gray-900">No email summaries</span>
                              <span className="block text-xs text-gray-600">I'll check the app myself</span>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                  <div className="flex gap-3">
                    <span className="text-2xl">💡</span>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm mb-2">Don't worry!</h4>
                      <p className="text-sm text-gray-700">
                        You can change these notification preferences anytime in Settings. We'll never spam you –
                        just helpful reminders to keep your family organized and on track! ✨
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-8 border-t border-gray-200 mt-8">
            <button
              onClick={handleSkip}
              disabled={isCompleting}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed underline"
            >
              I'll do this later
            </button>

            <div className="flex gap-3">
              {currentStep > 1 && !isCompleting && (
                <button
                  onClick={handleBack}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  ← Back
                </button>
              )}
              {currentStep < totalSteps ? (
                <button
                  onClick={handleNext}
                  className="px-8 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  {currentStep === 1 ? "Let's Go! →" : currentStep === 2 ? "Share Your Interests! →" : currentStep === 3 ? "Connect My Emails! →" : currentStep === 4 ? "Choose My Calendar! →" : currentStep === 5 ? "Set Up Notifications! →" : "Continue →"}
                </button>
              ) : (
                <button
                  onClick={handleFinalComplete}
                  disabled={isCompleting}
                  className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
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
                    <>
                      <span>Finish Setup!</span>
                      <span className="text-xl">🎉</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Celebration Modal */}
        {showCelebration && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl animate-scaleIn">
              <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-5xl">🎊</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{celebrationMessage}</h2>
              <p className="text-gray-600">Loading next step...</p>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
