"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import MobileNav from "@/app/components/MobileNav";
import { useToast } from "@/app/components/Toast";
import { useSearchParams } from "next/navigation";

function SettingsContent() {
  const searchParams = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'family' | 'integrations'>('profile');

  // Update tab based on URL parameters after mount
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (tabParam === 'integrations' || tabParam === 'family') {
      setActiveTab(tabParam);
    } else if (success === 'gmail_connected') {
      setActiveTab('integrations');
    }

    // Show feedback messages
    if (success === 'gmail_connected') {
      showToast('Gmail account connected successfully!', 'success');
      // Clear URL parameters after showing message
      window.history.replaceState({}, '', '/settings?tab=integrations');
    }

    if (error === 'oauth_failed') {
      showToast('Failed to connect Gmail account. Please try again.', 'error');
      window.history.replaceState({}, '', '/settings?tab=integrations');
    }

    if (error === 'missing_params' || error === 'missing_user') {
      showToast('Authentication error. Please try connecting again.', 'error');
      window.history.replaceState({}, '', '/settings?tab=integrations');
    }
  }, [searchParams, showToast]);
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const { showToast } = useToast();

  // Get user from Convex
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );

  // Get family details
  const family = useQuery(
    api.families.getFamilyById,
    convexUser?.familyId ? { familyId: convexUser.familyId } : "skip"
  );

  // Get family members
  const familyMembers = useQuery(
    api.families.getFamilyMembers,
    convexUser?.familyId ? { familyId: convexUser.familyId } : "skip"
  );

  // Get tracked family members
  const trackedMembers = useQuery(
    api.familyMembers.getFamilyMembers,
    convexUser?.familyId ? { familyId: convexUser.familyId } : "skip"
  );

  // Get Gmail accounts for the family
  const gmailAccounts = useQuery(
    api.gmailAccounts.getFamilyGmailAccounts,
    convexUser?.familyId ? { familyId: convexUser.familyId } : "skip"
  );

  // Get email filters
  const emailFilters = useQuery(
    api.emailProcessing.getEmailFilters,
    convexUser?.familyId ? { familyId: convexUser.familyId } : "skip"
  );

  const [inviteEmail, setInviteEmail] = useState("");
  const [showInviteSuccess, setShowInviteSuccess] = useState(false);

  // Email filter state
  const [newFilterEmail, setNewFilterEmail] = useState("");

  // Family member modal state
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState("#6366f1"); // Default indigo

  // Email scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");

  // Phone number state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // Google Calendar state
  const [availableCalendars, setAvailableCalendars] = useState<any[]>([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [showCreateCalendar, setShowCreateCalendar] = useState(false);
  const [newCalendarName, setNewCalendarName] = useState("");
  const [creatingCalendar, setCreatingCalendar] = useState(false);

  // Validate phone number (E.164 format)
  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone) return true; // Optional field
    // E.164 format: +[country code][number] (6-15 digits total)
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phone);
  };

  // Update phone number when user data loads
  useEffect(() => {
    if (convexUser?.phoneNumber) {
      setPhoneNumber(convexUser.phoneNumber);
    }
  }, [convexUser]);

  // Update selected color when editing a member
  useEffect(() => {
    if (editingMember && trackedMembers) {
      const member = trackedMembers.find(m => m._id === editingMember);
      setSelectedColor(member?.color || "#6366f1");
    } else {
      setSelectedColor("#6366f1");
    }
  }, [editingMember, trackedMembers]);

  // Mutations
  const removeGmailAccount = useMutation(api.gmailAccounts.removeGmailAccount);
  const addFamilyMember = useMutation(api.familyMembers.addFamilyMember);
  const updateFamilyMember = useMutation(api.familyMembers.updateFamilyMember);
  const deleteFamilyMember = useMutation(api.familyMembers.deleteFamilyMember);
  const addToWhitelist = useMutation(api.emailProcessing.addToWhitelist);
  const addToBlacklist = useMutation(api.emailProcessing.addToBlacklist);
  const updateUserPhoneNumber = useMutation(api.users.updatePhoneNumber);
  const updateSelectedCalendar = useMutation(api.families.updateSelectedCalendar);

  const handleDisconnectAccount = async (accountId: string, gmailEmail: string) => {
    if (!confirm(`Disconnect ${gmailEmail}? You can reconnect it anytime from this page.`)) {
      return;
    }

    try {
      await removeGmailAccount({ accountId });
      showToast("Gmail account disconnected successfully", "success");
    } catch (error) {
      console.error("Error disconnecting account:", error);
      showToast("Unable to disconnect account. Please try again.", "error");
    }
  };

  const handleSaveFamilyMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!convexUser?.familyId) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const birthdate = formData.get("birthdate") as string;
    const relationship = formData.get("relationship") as string;
    const nicknames = formData.get("nicknames") as string;
    const interests = formData.get("interests") as string;
    const color = formData.get("color") as string;

    // Validate required field
    if (!name || name.trim() === "") {
      showToast("Please enter a name for the family member", "error");
      return;
    }

    try {
      if (editingMember) {
        await updateFamilyMember({
          memberId: editingMember as any,
          name,
          birthdate: birthdate || undefined,
          relationship: relationship || undefined,
          nicknames,
          interests,
          color: color || undefined,
        });
      } else {
        await addFamilyMember({
          familyId: convexUser.familyId,
          name,
          birthdate: birthdate || undefined,
          relationship: relationship || undefined,
          nicknames,
          interests,
          color: color || undefined,
        });
      }
      setShowAddMemberModal(false);
      setEditingMember(null);
      showToast(`${editingMember ? 'Updated' : 'Added'} family member successfully`, "success");
    } catch (error) {
      console.error("Error saving family member:", error);
      showToast("Unable to save family member. Please check all fields and try again.", "error");
    }
  };

  const handleDeleteFamilyMember = async (memberId: string, name: string) => {
    if (!confirm(`Remove ${name} from your tracked family members?`)) {
      return;
    }

    try {
      await deleteFamilyMember({ memberId: memberId as any });
    } catch (error) {
      console.error("Error deleting family member:", error);
      alert("Failed to delete family member. Please try again.");
    }
  };

  // Get user notification preferences
  const userPreferences = useQuery(
    api.notifications.getUserPreferences,
    convexUser?._id ? { userId: convexUser._id } : "skip"
  );

  // Get reminder history
  const reminderHistory = useQuery(
    api.notifications.getUserReminderHistory,
    convexUser?._id ? { userId: convexUser._id, limit: 10 } : "skip"
  );

  const updatePreferences = useMutation(api.notifications.updateUserPreferences);

  const [preferences, setPreferences] = useState({
    emailReminders: true,
    emailReminderHoursBefore: 24,
    weeklyDigest: false,
    weeklyDigestDay: "Sunday",
    smsReminders: false,
    smsReminderHoursBefore: 1,
    dailySmsDigest: false,
    dailySmsDigestTime: "07:00",
  });

  // Update local preferences when Convex data loads
  useEffect(() => {
    if (userPreferences) {
      setPreferences({
        emailReminders: userPreferences.emailRemindersEnabled,
        emailReminderHoursBefore: userPreferences.emailReminderHoursBefore || 24,
        weeklyDigest: userPreferences.weeklyDigestEnabled,
        weeklyDigestDay: userPreferences.weeklyDigestDay,
        smsReminders: userPreferences.smsRemindersEnabled,
        smsReminderHoursBefore: userPreferences.smsReminderHoursBefore || 1,
        dailySmsDigest: userPreferences.dailySmsDigestEnabled || false,
        dailySmsDigestTime: userPreferences.dailySmsDigestTime || "07:00",
      });
    }
  }, [userPreferences]);


  const handleSendInvite = () => {
    if (inviteEmail) {
      // TODO: Implement actual invite logic with Convex
      setShowInviteSuccess(true);
      setInviteEmail("");
      setTimeout(() => setShowInviteSuccess(false), 3000);
    }
  };

  const handleSavePreferences = async () => {
    if (!convexUser?._id) return;

    // Validate phone number before saving
    if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
      setPhoneError("Please enter a valid phone number with country code (e.g., +12345678900)");
      alert("Please fix the phone number format before saving.");
      return;
    }

    try {
      // Save phone number if changed
      if (phoneNumber !== (convexUser.phoneNumber || "")) {
        await updateUserPhoneNumber({
          userId: convexUser._id,
          phoneNumber: phoneNumber,
        });
      }

      // Save preferences
      await updatePreferences({
        userId: convexUser._id,
        emailRemindersEnabled: preferences.emailReminders,
        emailReminderHoursBefore: preferences.emailReminderHoursBefore,
        weeklyDigestEnabled: preferences.weeklyDigest,
        weeklyDigestDay: preferences.weeklyDigestDay,
        smsRemindersEnabled: preferences.smsReminders,
        smsReminderHoursBefore: preferences.smsReminderHoursBefore,
        dailySmsDigestEnabled: preferences.dailySmsDigest,
        dailySmsDigestTime: preferences.dailySmsDigestTime,
      });
      alert("Preferences saved successfully!");
    } catch (error) {
      console.error("Error saving preferences:", error);
      alert("Failed to save preferences. Please try again.");
    }
  };

  const handleTestReminder = async () => {
    if (!convexUser?._id) return;

    try {
      const response = await fetch("/api/test-reminder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: convexUser._id,
          userEmail: convexUser.email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Test reminder sent! Check your email.");
      } else {
        alert(`Failed to send test reminder: ${data.error}`);
      }
    } catch (error) {
      console.error("Error sending test reminder:", error);
      alert("Failed to send test reminder. Please try again.");
    }
  };

  const handleScanAllAccounts = async () => {
    if (!gmailAccounts || gmailAccounts.length === 0) {
      setScanMessage("Please connect a Gmail account first");
      return;
    }

    setIsScanning(true);
    setScanMessage("Scanning all accounts...");

    let totalEventsFound = 0;
    let totalMessagesScanned = 0;

    try {
      // Scan each Gmail account
      for (const account of gmailAccounts) {
        const response = await fetch("/api/scan-emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accountId: account._id,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          totalEventsFound += data.eventsFound || 0;
          totalMessagesScanned += data.messagesScanned || 0;
        }
      }

      setScanMessage(
        `Scan complete! Found ${totalEventsFound} event(s) from ${totalMessagesScanned} messages across ${gmailAccounts.length} account(s).`
      );
      setTimeout(() => setScanMessage(""), 8000);
    } catch (error) {
      console.error("Scan error:", error);
      setScanMessage("Failed to scan emails. Please try again.");
      setTimeout(() => setScanMessage(""), 5000);
    } finally {
      setIsScanning(false);
    }
  };

  const handleResetScanHistory = async () => {
    if (!gmailAccounts || gmailAccounts.length === 0) {
      setScanMessage("No accounts to reset");
      return;
    }

    if (!confirm("This will clear the scan history so you can re-scan all emails. Continue?")) {
      return;
    }

    setIsScanning(true);
    setScanMessage("Resetting scan history...");

    try {
      for (const account of gmailAccounts) {
        await fetch("/api/clear-scan-log", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accountId: account._id,
          }),
        });
      }

      setScanMessage("Scan history reset! You can now re-scan your emails.");
      setTimeout(() => setScanMessage(""), 5000);
    } catch (error) {
      console.error("Reset error:", error);
      setScanMessage("Failed to reset. Please try again.");
      setTimeout(() => setScanMessage(""), 5000);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFetchCalendars = async () => {
    if (!convexUser?.familyId) {
      console.error("[handleFetchCalendars] No familyId available");
      return;
    }

    console.log("[handleFetchCalendars] Starting calendar fetch for familyId:", convexUser.familyId);
    setLoadingCalendars(true);
    try {
      console.log("[handleFetchCalendars] Making fetch request to /api/google-calendars");
      const response = await fetch("/api/google-calendars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyId: convexUser.familyId }),
      });

      console.log("[handleFetchCalendars] Response status:", response.status);
      console.log("[handleFetchCalendars] Response ok:", response.ok);

      const data = await response.json();
      console.log("[handleFetchCalendars] Response data:", data);

      if (response.ok) {
        console.log("[handleFetchCalendars] Setting calendars:", data.calendars?.length || 0, "calendars");
        setAvailableCalendars(data.calendars || []);
        if (data.calendars && data.calendars.length > 0) {
          showToast(`Found ${data.calendars.length} calendars`, "success");
        } else {
          showToast("No calendars found", "info");
        }
      } else {
        console.error("[handleFetchCalendars] Error response:", data);
        showToast(data.error || "Failed to fetch calendars", "error");
      }
    } catch (error) {
      console.error("[handleFetchCalendars] Exception:", error);
      console.error("[handleFetchCalendars] Error stack:", error instanceof Error ? error.stack : "No stack");
      showToast("Failed to fetch calendars. Please try again.", "error");
    } finally {
      setLoadingCalendars(false);
      console.log("[handleFetchCalendars] Finished");
    }
  };

  const handleSelectCalendar = async (calendarId: string, calendarName: string) => {
    if (!convexUser?.familyId) return;

    try {
      await updateSelectedCalendar({
        familyId: convexUser.familyId,
        googleCalendarId: calendarId,
        calendarName,
      });
      showToast(`Selected "${calendarName}" for syncing family events`, "success");
    } catch (error) {
      console.error("Error selecting calendar:", error);
      showToast("Failed to save calendar selection. Please try again.", "error");
    }
  };

  const handleCreateCalendar = async () => {
    if (!convexUser?.familyId || !newCalendarName.trim()) {
      showToast("Please enter a calendar name", "error");
      return;
    }

    setCreatingCalendar(true);
    try {
      const response = await fetch("/api/create-google-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyId: convexUser.familyId,
          calendarName: newCalendarName.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast(`Created calendar "${newCalendarName}"`, "success");
        setShowCreateCalendar(false);
        setNewCalendarName("");
        // Refresh the calendar list
        handleFetchCalendars();
      } else {
        showToast(data.error || "Failed to create calendar", "error");
      }
    } catch (error) {
      console.error("Error creating calendar:", error);
      showToast("Failed to create calendar. Please try again.", "error");
    } finally {
      setCreatingCalendar(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-primary-600">
            Our Daily Family
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
            <Link href="/calendar" className="text-gray-600 hover:text-gray-900">Calendar</Link>
            <Link href="/review" className="text-gray-600 hover:text-gray-900">Review</Link>
            <Link href="/discover" className="text-gray-600 hover:text-gray-900">Discover</Link>
            <Link href="/settings" className="text-primary-600 font-medium">Settings</Link>
            <button
              onClick={() => signOut()}
              className="text-gray-600 hover:text-gray-900"
            >
              Log Out
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <button className="md:hidden text-2xl text-gray-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        <MobileNav
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          currentPage="settings"
        />
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-soft border border-gray-200 p-2 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                activeTab === 'profile'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('family')}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                activeTab === 'family'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Family & Events
            </button>
            <button
              onClick={() => setActiveTab('integrations')}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                activeTab === 'integrations'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Integrations
            </button>
          </div>
        </div>

        {/* Profile Tab - Account info + Notifications */}
        {activeTab === 'profile' && (
        <div>
        {/* Account Information */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Account Information</h2>
          </div>
          <div className="p-6">
            {!convexUser ? (
              <div className="text-center py-4 text-gray-500">Loading...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    defaultValue={convexUser.fullName || clerkUser?.fullName || ""}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    defaultValue={convexUser.email || clerkUser?.primaryEmailAddress?.emailAddress || ""}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value);
                      // Clear error when user starts typing
                      if (phoneError) setPhoneError("");
                    }}
                    onBlur={() => {
                      // Validate on blur
                      if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
                        setPhoneError("Please enter a valid phone number with country code (e.g., +12345678900)");
                      }
                    }}
                    placeholder="+12345678900"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                      phoneError
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-primary-500'
                    }`}
                  />
                  {phoneError ? (
                    <p className="text-xs text-red-600 mt-1">{phoneError}</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      Required for SMS notifications. Include country code (e.g., +1 for US)
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Type
                  </label>
                  <div className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 capitalize">
                    {convexUser.role === "primary" ? "Primary Account" : "Family Member"}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Notification Preferences</h2>
            <p className="text-sm text-gray-600 mt-1">
              Choose how you want to stay updated about your family's activities
            </p>
          </div>
          <div className="p-6 space-y-6">
            {/* Email Section */}
            <div className="border-l-4 border-blue-500 pl-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <span>📧</span> Email Notifications
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Detailed reminders with full event information and links
                  </p>
                </div>
              </div>

              <div className="space-y-3 ml-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Event Reminders</p>
                    <p className="text-xs text-gray-500">Get notified before each event</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.emailReminders}
                      onChange={(e) =>
                        setPreferences({ ...preferences, emailReminders: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {preferences.emailReminders && (
                  <div className="ml-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Send email
                    </label>
                    <select
                      value={preferences.emailReminderHoursBefore}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          emailReminderHoursBefore: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={24}>24 hours before (1 day)</option>
                      <option value={48}>48 hours before (2 days)</option>
                      <option value={72}>72 hours before (3 days)</option>
                    </select>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Weekly Digest</p>
                    <p className="text-xs text-gray-500">Summary of upcoming week</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.weeklyDigest}
                      onChange={(e) =>
                        setPreferences({ ...preferences, weeklyDigest: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* SMS Section */}
            <div className="border-l-4 border-green-500 pl-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <span>📱</span> SMS Notifications
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Quick text alerts for urgent reminders
                  </p>
                  {!phoneNumber && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ Add phone number above to enable
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3 ml-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Event Reminders</p>
                    <p className="text-xs text-gray-500">Last-minute text alerts</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.smsReminders}
                      onChange={(e) =>
                        setPreferences({ ...preferences, smsReminders: e.target.checked })
                      }
                      disabled={!phoneNumber}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                  </label>
                </div>

                {preferences.smsReminders && (
                  <div className="ml-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Send text
                    </label>
                    <select
                      value={preferences.smsReminderHoursBefore}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          smsReminderHoursBefore: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value={1}>1 hour before</option>
                      <option value={2}>2 hours before</option>
                      <option value={4}>4 hours before</option>
                    </select>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Daily Digest</p>
                    <p className="text-xs text-gray-500">One text with today's events</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.dailySmsDigest}
                      onChange={(e) =>
                        setPreferences({ ...preferences, dailySmsDigest: e.target.checked })
                      }
                      disabled={!phoneNumber}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                  </label>
                </div>

                {preferences.dailySmsDigest && (
                  <div className="ml-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Send at
                    </label>
                    <input
                      type="time"
                      value={preferences.dailySmsDigestTime}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          dailySmsDigestTime: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSavePreferences}
                className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
              >
                Save Preferences
              </button>
              <button
                onClick={handleTestReminder}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition"
              >
                Send Test Reminder
              </button>
            </div>
          </div>
        </div>
        </div>
        )}

        {/* Family Tab */}
        {activeTab === 'family' && (
        <div>
        {/* Family Members */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Family Members</h2>
            <p className="text-sm text-gray-600 mt-1">
              Share your family calendar with your spouse. One subscription, two logins.
            </p>
          </div>
          <div className="p-6">
            {/* Current Family Members */}
            {!familyMembers ? (
              <div className="text-center py-4 text-gray-500">Loading...</div>
            ) : (
              <>
                <div className="space-y-3 mb-6">
                  {familyMembers.map((member) => {
                    const memberGmailAccounts = gmailAccounts?.filter(
                      (acc) => acc.connectedByUserId === member._id
                    ) || [];
                    return (
                      <div
                        key={member._id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold">
                            {(member.fullName || member.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {member.fullName || member.email}
                              {member.role === "primary" && (
                                <span className="ml-2 text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded">
                                  Primary
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600">{member.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {memberGmailAccounts.length > 0 ? (
                            <span className="text-sm text-green-600 flex items-center gap-1">
                              ✓ Gmail Connected
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">No Gmail</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Invite Spouse */}
                {convexUser?.role === "primary" && familyMembers.length === 1 && (
                  <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Invite Your Spouse
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Send an invitation to share this calendar. They'll get full access at no extra charge.
                </p>
                <div className="flex gap-3">
                  <input
                    type="email"
                    placeholder="spouse@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleSendInvite}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition"
                  >
                    Send Invite
                  </button>
                </div>
                {showInviteSuccess && (
                  <div className="mt-3 p-3 bg-green-50 text-green-800 rounded-lg text-sm">
                    ✓ Invitation sent! They'll receive an email with instructions.
                  </div>
                )}
              </div>
            )}
          </>
        )}
          </div>
        </div>

        {/* Tracked Family Members */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Tracked Family Members</h2>
            <p className="text-sm text-gray-600 mt-1">
              Add family members whose calendars you want to track. This helps our AI identify and organize everyone's activities, appointments, and events.
            </p>
          </div>
          <div className="p-6">
            {/* Tracked Members List */}
            <div className="space-y-4 mb-6">
              {!trackedMembers || trackedMembers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-2">No family members added for tracking yet</p>
                  <p className="text-sm text-gray-500">
                    Add family members to help organize everyone's activities and events
                  </p>
                </div>
              ) : (
                trackedMembers.map((member) => {
                  // Calculate age if birthdate exists
                  const age = member.birthdate
                    ? Math.floor((Date.now() - new Date(member.birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                    : null;

                  return (
                    <div
                      key={member._id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                            style={{ backgroundColor: member.color || "#6366f1" }}
                          >
                            {member.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-gray-900 text-lg">{member.name}</h3>
                              {age && <span className="text-sm text-gray-600">• {age} years old</span>}
                              <div
                                className="w-6 h-6 rounded border-2 border-gray-300"
                                style={{ backgroundColor: member.color || "#6366f1" }}
                                title="Calendar color"
                              />
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              {member.relationship && <div><span className="font-medium">Relationship:</span> {member.relationship}</div>}
                              {member.nicknames?.length > 0 && (
                                <div><span className="font-medium">Also goes by:</span> {member.nicknames.join(", ")}</div>
                              )}
                              {member.interests?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {member.interests.map((interest: string, idx: number) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium"
                                    >
                                      {interest}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 self-start">
                          <button
                            onClick={() => {
                              setEditingMember(member._id);
                              setShowAddMemberModal(true);
                            }}
                            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteFamilyMember(member._id, member.name)}
                            className="px-4 py-2 text-sm bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add Member Button */}
            <button
              onClick={() => setShowAddMemberModal(true)}
              className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 font-medium hover:border-primary-400 hover:text-primary-600 transition flex items-center justify-center gap-2"
            >
              <span className="text-xl">+</span>
              Add Family Member to Track
            </button>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Why track family members?</h4>
                <p className="text-sm text-blue-800">
                  Adding family member details helps our AI:
                </p>
                <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside">
                  <li>Identify which events belong to which family member</li>
                  <li>Suggest relevant activities based on age and interests</li>
                  <li>Recognize nicknames and variations in emails</li>
                  <li>Filter and organize your calendar by person</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        </div>
        )}

        {/* Integrations Tab - Gmail & Calendar */}
        {activeTab === 'integrations' && (
        <div>
        {/* Google Calendar Selection */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Google Calendar</h2>
            <p className="text-sm text-gray-600 mt-1">
              Choose which Google Calendar to sync your family events to. You can use an existing calendar or create a new one.
            </p>
          </div>
          <div className="p-6">
            {/* Current Selection */}
            {family?.googleCalendarId && family?.calendarName && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">✓</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-900">Currently syncing to:</h3>
                    <p className="text-green-800 text-sm mt-1">{family.calendarName}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Select or Create Calendar */}
            {!gmailAccounts || gmailAccounts.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-900">
                  Connect a Gmail account first to enable Google Calendar sync.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <button
                    onClick={handleFetchCalendars}
                    disabled={loadingCalendars}
                    className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingCalendars ? "Loading..." : "Show My Calendars"}
                  </button>
                  <button
                    onClick={() => setShowCreateCalendar(!showCreateCalendar)}
                    className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
                  >
                    {showCreateCalendar ? "Cancel" : "Create New Calendar"}
                  </button>
                </div>

                {/* Create New Calendar Form */}
                {showCreateCalendar && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-3">Create New Calendar</h3>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCalendarName}
                        onChange={(e) => setNewCalendarName(e.target.value)}
                        placeholder="e.g., Johnson Family Schedule"
                        className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleCreateCalendar}
                        disabled={creatingCalendar || !newCalendarName.trim()}
                        className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {creatingCalendar ? "Creating..." : "Create"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Available Calendars List */}
                {availableCalendars.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Select a Calendar</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {availableCalendars.map((cal) => (
                        <div
                          key={cal.id}
                          className={`flex items-center justify-between p-3 border rounded-lg transition ${
                            family?.googleCalendarId === cal.id
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {cal.summary}
                              {cal.primary && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  Primary
                                </span>
                              )}
                            </div>
                            {cal.description && (
                              <div className="text-sm text-gray-600 mt-1">{cal.description}</div>
                            )}
                          </div>
                          <button
                            onClick={() => handleSelectCalendar(cal.id, cal.summary)}
                            className={`ml-3 px-4 py-2 rounded-lg font-medium transition ${
                              family?.googleCalendarId === cal.id
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {family?.googleCalendarId === cal.id ? 'Selected' : 'Select'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Gmail Connections - Multiple Accounts */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Email Integration</h2>
            <p className="text-sm text-gray-600 mt-1">
              Connect multiple email accounts to scan all family activity emails. Works with Gmail, Google Workspace, and any email that uses Google.
            </p>
          </div>
          <div className="p-6">
            {/* Connected Gmail Accounts */}
            {!gmailAccounts ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : gmailAccounts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No email accounts connected yet</p>
                <p className="text-sm text-gray-500">Connect your first email account to start scanning for events</p>
              </div>
            ) : (
              <div className="space-y-3 mb-6">
                {gmailAccounts.map((account) => (
                  <div
                    key={account._id}
                    className={`flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 ${!account.isActive ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-semibold text-gray-900">
                          {account.displayName || "Gmail Account"}
                        </div>
                        <div className="text-sm text-gray-600">{account.gmailEmail}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {account.lastSyncAt
                            ? `Last scan: ${new Date(account.lastSyncAt).toLocaleDateString()}`
                            : "Never scanned"}{" "}
                          • Connected by {account.connectedByName}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm flex items-center gap-1 ${account.isActive ? 'text-green-600' : 'text-gray-500'}`}
                      >
                        {account.isActive ? "Active" : "Paused"}
                      </span>
                      <button
                        onClick={() => handleDisconnectAccount(account._id, account.gmailEmail)}
                        className="px-3 py-1 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded font-medium transition"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Gmail Account */}
            <div className="border-t pt-6">
              {gmailAccounts && gmailAccounts.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900 mb-2">
                    <strong>Having permission issues?</strong> Before reconnecting:
                  </p>
                  <ol className="text-xs text-blue-800 ml-4 mb-2 list-decimal space-y-1">
                    <li>Click "Disconnect" above to remove the account from our app</li>
                    <li>Visit <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="underline font-medium">Google Permissions</a> and revoke access to this app</li>
                    <li>Then click "Connect Email Account" below to reconnect with fresh permissions</li>
                  </ol>
                </div>
              )}
              <button
                onClick={() => {
                  window.location.href = "/api/auth/google?returnUrl=/settings?tab=integrations";
                }}
                className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition flex items-center justify-center gap-2"
              >
                <span className="text-xl">+</span>
                Connect Email Account
              </button>
              <p className="text-xs text-gray-500 text-center mt-2">
                Works with Gmail, Google Workspace, and any email using Google authentication
              </p>
            </div>

            {/* Bulk Actions */}
            <div className="border-t mt-6 pt-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleScanAllAccounts}
                  disabled={isScanning || !gmailAccounts || gmailAccounts.length === 0}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isScanning ? "Scanning..." : "Scan All Active Accounts Now"}
                </button>
                <button
                  onClick={handleResetScanHistory}
                  disabled={isScanning || !gmailAccounts || gmailAccounts.length === 0}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset Scan History
                </button>
              </div>
              {scanMessage && (
                <div className="mt-3 text-sm text-center text-gray-600">
                  {scanMessage}
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
        )}

        {/* Notifications Tab - MOVED TO PROFILE TAB */}
        {false && activeTab === 'profile' && (
        <div>
        {/* Notification Preferences */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Notification Preferences</h2>
            <p className="text-sm text-gray-600 mt-1">
              Configure when and how you receive reminders about upcoming events
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Email Reminders</h3>
                <p className="text-sm text-gray-600">
                  Get email reminders before events
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.emailReminders}
                  onChange={(e) =>
                    setPreferences({ ...preferences, emailReminders: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">SMS Reminders</h3>
                <p className="text-sm text-gray-600">
                  Get text message reminders before events (coming soon)
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer opacity-50">
                <input
                  type="checkbox"
                  checked={preferences.smsReminders}
                  onChange={(e) =>
                    setPreferences({ ...preferences, smsReminders: e.target.checked })
                  }
                  disabled
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Weekly Digest</h3>
                <p className="text-sm text-gray-600">
                  Get a weekly summary of all upcoming events (coming soon)
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer opacity-50">
                <input
                  type="checkbox"
                  checked={preferences.weeklyDigest}
                  onChange={(e) =>
                    setPreferences({ ...preferences, weeklyDigest: e.target.checked })
                  }
                  disabled
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            {preferences.weeklyDigest && (
              <div>
                <label className="block font-semibold text-gray-900 mb-2">
                  Send Digest On
                </label>
                <select
                  value={preferences.weeklyDigestDay}
                  onChange={(e) =>
                    setPreferences({ ...preferences, weeklyDigestDay: e.target.value })
                  }
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent opacity-50"
                >
                  <option>Sunday</option>
                  <option>Monday</option>
                  <option>Tuesday</option>
                  <option>Wednesday</option>
                  <option>Thursday</option>
                  <option>Friday</option>
                  <option>Saturday</option>
                </select>
              </div>
            )}

            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSavePreferences}
                className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
              >
                Save Preferences
              </button>
              <button
                onClick={handleTestReminder}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition"
              >
                Send Test Reminder
              </button>
            </div>

            {/* Reminder History */}
            {reminderHistory && reminderHistory.length > 0 && (
              <div className="border-t pt-4 mt-4">
                <h3 className="font-semibold text-gray-900 mb-3">Recent Reminders</h3>
                <div className="space-y-2">
                  {reminderHistory.map((reminder) => (
                    <div
                      key={reminder._id}
                      className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${reminder.status === 'sent' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <span className="text-gray-700 capitalize">{reminder.reminderType}</span>
                      </div>
                      <div className="text-gray-500 text-xs">
                        {new Date(reminder.sentAt).toLocaleDateString()} {new Date(reminder.sentAt).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-1">How reminders work</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Automatic reminders are sent based on your timing preference</li>
                <li>RSVP alerts are sent 3 days before the deadline</li>
                <li>Our system checks for upcoming events every hour</li>
                <li>You'll only receive one reminder per event</li>
              </ul>
            </div>
          </div>
        </div>
        </div>
        )}

        {/* Billing Tab - HIDDEN UNTIL READY */}
        {false && (
        <div>
        {/* Subscription Management */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Subscription & Billing</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">Current Plan</h3>
                <p className="text-sm text-gray-600">Standard - $9.99/month</p>
                <p className="text-xs text-gray-500 mt-1">Or save 20% with annual: $95/year</p>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                Active
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Your free trial ends in 5 days. Your card will be charged on November 13, 2024.
            </p>

            {/* Coupon Code */}
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Have a coupon code?</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter coupon code"
                  className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition">
                  Apply
                </button>
              </div>
            </div>

            {/* Billing Options */}
            <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3">Switch to Annual Billing</h4>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-gray-700">Annual Plan - $95/year</p>
                  <p className="text-xs text-green-600">Save $25/year (20% off)</p>
                </div>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition text-sm">
                  Switch to Annual
                </button>
              </div>
              <p className="text-xs text-gray-500">
                You'll be charged $95 today and won't be billed again for a year
              </p>
            </div>

            <div className="flex gap-3">
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition">
                Update Payment Method
              </button>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to cancel your subscription? You can reactivate anytime.')) {
                    alert('Subscription cancelled. You\'ll have access until the end of your billing period.');
                  }
                }}
                className="px-4 py-2 text-red-600 hover:text-red-700 font-medium"
              >
                Cancel Subscription
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        {convexUser?.role === "primary" && (
          <div className="bg-white rounded-lg shadow border-2 border-red-200">
            <div className="p-6 border-b border-gray-200 bg-red-50">
              <h2 className="text-xl font-bold text-red-900">Danger Zone</h2>
            </div>
            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Delete Account</h3>
              <p className="text-sm text-gray-600 mb-4">
                Permanently delete your family account and all associated data. This action cannot be undone.
              </p>
              <button
                onClick={() => {
                  if (confirm('⚠️ WARNING: This will permanently delete your account and all data. This action CANNOT be undone. Are you absolutely sure?')) {
                    const confirmation = prompt('Type DELETE to confirm account deletion:');
                    if (confirmation === 'DELETE') {
                      alert('Account deletion initiated. You will receive a confirmation email.');
                    }
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
              >
                Delete Account
              </button>
            </div>
          </div>
        )}
        </div>
        )}
      </div>

      {/* Add/Edit Member Modal */}
      {(showAddMemberModal || editingMember) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingMember ? "Edit Family Member" : "Add Family Member"}
              </h2>
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setEditingMember(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
                aria-label="Close family member modal"
                title="Close"
              >
                ×
              </button>
            </div>
            <div className="p-4 sm:p-6">
              <form className="space-y-4" onSubmit={handleSaveFamilyMember}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="e.g., Emma Johnson"
                    defaultValue={editingMember ? trackedMembers?.find(c => c._id === editingMember)?.name : ""}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Birthdate (Optional)
                    </label>
                    <input
                      type="date"
                      name="birthdate"
                      defaultValue={editingMember ? trackedMembers?.find(c => c._id === editingMember)?.birthdate : ""}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Relationship (Optional)
                    </label>
                    <input
                      type="text"
                      name="relationship"
                      placeholder="e.g., Son, Daughter, Parent, etc."
                      defaultValue={editingMember ? trackedMembers?.find(c => c._id === editingMember)?.relationship : ""}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Choose a color to identify {editingMember ? trackedMembers?.find(c => c._id === editingMember)?.name || "this family member" : "this family member"}'s events
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    This color helps you quickly see who each event is for on the calendar
                  </p>

                  {/* Mini Calendar Preview */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">📅</div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                          Preview: How colors appear
                        </div>
                        <div className="space-y-1.5">
                          {/* Example events showing selected color */}
                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-1 h-8 rounded transition-colors" style={{ backgroundColor: selectedColor }}></div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 text-xs">Soccer Practice</div>
                              <div className="text-xs text-gray-500">Sat, Dec 14 • 3:00 PM</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm opacity-50">
                            <div className="w-1 h-8 rounded bg-pink-500"></div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 text-xs">Piano Recital</div>
                              <div className="text-xs text-gray-500">Sun, Dec 15 • 2:00 PM</div>
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 italic">
                          Each family member gets their own color for easy identification
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                    {[
                      { name: "Indigo", value: "#6366f1" },
                      { name: "Blue", value: "#3b82f6" },
                      { name: "Purple", value: "#a855f7" },
                      { name: "Pink", value: "#ec4899" },
                      { name: "Red", value: "#ef4444" },
                      { name: "Orange", value: "#f97316" },
                      { name: "Yellow", value: "#eab308" },
                      { name: "Green", value: "#22c55e" },
                      { name: "Teal", value: "#14b8a6" },
                      { name: "Cyan", value: "#06b6d4" },
                      { name: "Slate", value: "#64748b" },
                      { name: "Gray", value: "#6b7280" },
                    ].map((color) => (
                      <label
                        key={color.value}
                        className="relative flex flex-col items-center cursor-pointer group"
                      >
                        <input
                          type="radio"
                          name="color"
                          value={color.value}
                          checked={selectedColor === color.value}
                          onChange={(e) => setSelectedColor(e.target.value)}
                          className="sr-only peer"
                        />
                        <div
                          className="w-12 h-12 rounded-lg border-2 border-gray-300 peer-checked:border-gray-900 peer-checked:ring-2 peer-checked:ring-offset-2 peer-checked:ring-gray-900 group-hover:scale-110 transition-transform"
                          style={{ backgroundColor: color.value }}
                        />
                        <span className="text-xs text-gray-600 mt-1">{color.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nicknames / Alternate Names
                  </label>
                  <input
                    type="text"
                    name="nicknames"
                    placeholder="e.g., Em, Emmy (separate with commas)"
                    defaultValue={editingMember ? trackedMembers?.find(c => c._id === editingMember)?.nicknames.join(", ") : ""}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Help us recognize this person in emails even when nicknames are used
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interests & Activities
                  </label>
                  <input
                    type="text"
                    name="interests"
                    placeholder="e.g., Soccer, Piano, Dance (separate with commas)"
                    defaultValue={editingMember ? trackedMembers?.find(c => c._id === editingMember)?.interests.join(", ") : ""}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    We'll suggest relevant activities matching their interests
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
                  >
                    {editingMember ? "Save Changes" : "Add Family Member"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMemberModal(false);
                      setEditingMember(null);
                    }}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
