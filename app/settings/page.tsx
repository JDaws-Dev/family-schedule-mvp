"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import MobileNav from "@/app/components/MobileNav";
import BottomNav from "@/app/components/BottomNav";
import { useToast } from "@/app/components/Toast";
import { useSearchParams } from "next/navigation";
import PrivacyBadge from "@/app/components/PrivacyBadge";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import LoadingSpinner, { ButtonSpinner } from "@/app/components/LoadingSpinner";

function SettingsContent() {
  const searchParams = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'account' | 'family' | 'apps'>('account');
  const [expandedSections, setExpandedSections] = useState({
    yourInfo: false,
    notifications: false,
    billing: false,
    familyDetails: false,
    familyMembers: false,
    trackedMembers: false,
    gmail: false,
    googleCalendar: false,
  });
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const { showToast } = useToast();

  // Update tab based on URL parameters after mount
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (tabParam === 'apps' || tabParam === 'family' || tabParam === 'account') {
      setActiveTab(tabParam as 'account' | 'family' | 'apps');
    } else if (tabParam === 'integrations') {
      setActiveTab('apps'); // Redirect old 'integrations' to new 'apps'
    } else if (success === 'gmail_connected') {
      setActiveTab('apps');
    }

    // Show feedback messages
    if (success === 'gmail_connected') {
      showToast('Gmail connected successfully!', 'success');
      // Clear URL parameters after showing message
      window.history.replaceState({}, '', '/settings?tab=apps');
    }

    if (error === 'oauth_failed') {
      showToast('Oops! Couldn\'t connect Gmail. Want to try again?', 'error');
      window.history.replaceState({}, '', '/settings?tab=apps');
    }

    if (error === 'missing_params' || error === 'missing_user') {
      showToast('Oops! Couldn\'t connect. Want to try again?', 'error');
      window.history.replaceState({}, '', '/settings?tab=apps');
    }
  }, [searchParams, showToast]);

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

  // Normalize and validate phone number (auto-add +1 for US numbers)
  const normalizePhoneNumber = (phone: string): string => {
    if (!phone) return "";

    // Remove all non-digit characters except leading +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // If it starts with +1, keep it as is
    if (cleaned.startsWith('+1')) {
      return cleaned;
    }

    // If it starts with 1 and is 11 digits, add +
    if (cleaned.startsWith('1') && cleaned.length === 11) {
      return '+' + cleaned;
    }

    // If it's 10 digits (US number without country code), add +1
    if (cleaned.length === 10 && /^\d{10}$/.test(cleaned)) {
      return '+1' + cleaned;
    }

    // Otherwise return as-is
    return cleaned.startsWith('+') ? cleaned : '+' + cleaned;
  };

  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone) return true; // Optional field
    const normalized = normalizePhoneNumber(phone);
    // E.164 format: +[country code][number] (6-15 digits total)
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(normalized);
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
  const updateFamilyDetails = useMutation(api.families.updateFamilyDetails);

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
      alert("Oops! Couldn't remove family member. Want to try again?");
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

    // Normalize phone number (auto-add +1 for US numbers)
    const normalizedPhone = phoneNumber ? normalizePhoneNumber(phoneNumber) : "";

    // Validate phone number before saving
    if (normalizedPhone && !validatePhoneNumber(normalizedPhone)) {
      setPhoneError("Please enter a valid 10-digit phone number (e.g., 555-123-4567)");
      alert("Please enter a valid phone number.");
      return;
    }

    try {
      // Save phone number if changed
      if (normalizedPhone !== (convexUser.phoneNumber || "")) {
        await updateUserPhoneNumber({
          userId: convexUser._id,
          phoneNumber: normalizedPhone,
        });
        // Update local state with normalized version
        setPhoneNumber(normalizedPhone);
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
      alert("Oops! Couldn't save preferences. Want to try again?");
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
        alert(`Oops! Couldn't send test reminder: ${data.error}`);
      }
    } catch (error) {
      console.error("Error sending test reminder:", error);
      alert("Oops! Couldn't send test reminder. Want to try again?");
    }
  };

  const handleTestSMS = async () => {
    if (!phoneNumber) {
      alert("Please add a phone number first to test text messages");
      return;
    }

    try {
      const response = await fetch("/api/test-sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Test SMS sent! Check your phone.");
      } else {
        alert(`Oops! Couldn't send test text: ${data.error}`);
      }
    } catch (error) {
      console.error("Error sending test SMS:", error);
      alert("Oops! Couldn't send test text. Want to try again?");
    }
  };

  const handleScanAllAccounts = async () => {
    if (!gmailAccounts || gmailAccounts.length === 0) {
      setScanMessage("Please connect a Gmail account first");
      return;
    }

    setIsScanning(true);
    setScanMessage("Checking all your emails for schedules...");

    let totalEventsFound = 0;
    let totalMessagesScanned = 0;

    try {
      // Check each Gmail account
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
        `✓ Done! Found ${totalEventsFound} event(s) from ${totalMessagesScanned} emails across ${gmailAccounts.length} account(s).`
      );
      setTimeout(() => setScanMessage(""), 8000);
    } catch (error) {
      console.error("Scan error:", error);
      setScanMessage("Oops! Couldn't check emails. Want to try again?");
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

    if (!confirm("This will clear the history so you can check all emails again. Continue?")) {
      return;
    }

    setIsScanning(true);
    setScanMessage("Resetting history...");

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

      setScanMessage("History reset! You can now check your emails again.");
      setTimeout(() => setScanMessage(""), 5000);
    } catch (error) {
      console.error("Reset error:", error);
      setScanMessage("Oops! Couldn't reset. Want to try again?");
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
        showToast(data.error || "Couldn't connect to calendars", "error");
      }
    } catch (error) {
      console.error("[handleFetchCalendars] Exception:", error);
      console.error("[handleFetchCalendars] Error stack:", error instanceof Error ? error.stack : "No stack");
      showToast("Oops! Couldn't connect to calendars. Want to try again?", "error");
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

      // Automatically setup calendar watch for push notifications
      try {
        const watchResponse = await fetch("/api/setup-calendar-watch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ familyId: convexUser.familyId }),
        });

        const watchData = await watchResponse.json();

        if (watchResponse.ok) {
          console.log("[handleSelectCalendar] Calendar watch enabled successfully");
          showToast(`Now syncing with "${calendarName}" - real-time updates enabled!`, "success");
        } else {
          console.error("[handleSelectCalendar] Calendar watch setup failed:", watchData);
          showToast(`Selected "${calendarName}" (real-time sync couldn't be enabled)`, "warning");
        }
      } catch (watchError) {
        console.error("[handleSelectCalendar] Error setting up calendar watch:", watchError);
        showToast(`Selected "${calendarName}" (real-time sync unavailable)`, "warning");
      }
    } catch (error) {
      console.error("Error selecting calendar:", error);
      showToast("Oops! Couldn't save calendar choice. Want to try again?", "error");
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
        showToast(data.error || "Couldn't create calendar", "error");
      }
    } catch (error) {
      console.error("Error creating calendar:", error);
      showToast("Oops! Couldn't create calendar. Want to try again?", "error");
    } finally {
      setCreatingCalendar(false);
    }
  };

  const toggleSection = (section: 'yourInfo' | 'notifications' | 'billing' | 'familyDetails' | 'familyMembers' | 'trackedMembers' | 'gmail' | 'googleCalendar') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-0">
      {/* Header */}
      <header className="bg-white border-b border-gray-200  shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-primary-600">
            Our Daily Family
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Home</Link>
            <Link href="/calendar" className="text-gray-600 hover:text-gray-900">Calendar</Link>
            <Link href="/review" className="text-gray-600 hover:text-gray-900">Events</Link>
            <Link href="/discover" className="text-gray-600 hover:text-gray-900">Find Activities</Link>
            <Link href="/settings" className="text-primary-600 font-medium">Settings</Link>
            <button
              onClick={() => signOut({ redirectUrl: '/' })}
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
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-3xl">⚙️</span>
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Settings
              </h1>
              <p className="text-gray-600 text-lg mt-1">
                Manage your account
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        {/* Tab Navigation with Descriptions */}
        <div className="bg-white rounded-lg shadow-soft border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={() => setActiveTab('account')}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                activeTab === 'account'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Your Info
            </button>
            <button
              onClick={() => setActiveTab('family')}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                activeTab === 'family'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Family Members
            </button>
            <button
              onClick={() => setActiveTab('apps')}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                activeTab === 'apps'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Email Connection
            </button>
          </div>

          {/* Tab Descriptions */}
          <div className="px-2">
            {activeTab === 'account' && (
              <p className="text-sm text-gray-600">
                Manage your personal information and account preferences
              </p>
            )}
            {activeTab === 'family' && (
              <p className="text-sm text-gray-600">
                Add and manage the people in your family to track their schedules
              </p>
            )}
            {activeTab === 'apps' && (
              <p className="text-sm text-gray-600">
                Connect your email so we can automatically find events for you
              </p>
            )}
          </div>
        </div>

        {/* My Account Tab - Account info + Notifications + Billing */}
        {activeTab === 'account' && (
        <div>
        {/* Your Info */}
        <div className="bg-white rounded-2xl shadow-soft mb-6">
          <button
            onClick={() => toggleSection('yourInfo')}
            className="w-full p-6 border-b border-gray-200 flex items-center justify-between md:cursor-default hover:bg-gray-50 md:hover:bg-white transition-colors"
          >
            <div className="text-left">
              <h2 className="text-xl font-bold text-gray-900">Your Info</h2>
              <p className="text-sm text-gray-600 mt-1">Your personal information and contact details</p>
            </div>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform md:hidden ${expandedSections.yourInfo ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div className={`p-6 ${expandedSections.yourInfo ? 'block' : 'hidden md:block'}`}>
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
                        setPhoneError("Please enter a valid 10-digit phone number");
                      }
                    }}
                    placeholder="(555) 123-4567"
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
                      Required for text notifications. Enter your 10-digit US phone number
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

        {/* Reminders & Notifications */}
        <div className="bg-white rounded-2xl shadow-soft mb-6">
          <button
            onClick={() => toggleSection('notifications')}
            className="w-full p-6 border-b border-gray-200 flex items-center justify-between md:cursor-default hover:bg-gray-50 md:hover:bg-white transition-colors"
          >
            <div className="text-left">
              <h2 className="text-xl font-bold text-gray-900">Reminders & Notifications</h2>
              <p className="text-sm text-gray-600 mt-1">
                Get reminders about upcoming events and important actions
              </p>
            </div>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform md:hidden ${expandedSections.notifications ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div className={`p-6 space-y-6 ${expandedSections.notifications ? 'block' : 'hidden md:block'}`}>
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
                    <span>📱</span> Text Notifications
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
                className="px-6 py-3 bg-blue-100 text-blue-700 rounded-lg font-semibold hover:bg-blue-200 transition"
                title="Send a test email reminder to verify email notifications are working"
              >
                📧 Test Email
              </button>
              <button
                onClick={handleTestSMS}
                className="px-6 py-3 bg-green-100 text-green-700 rounded-lg font-semibold hover:bg-green-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                title="Send a test text message to verify notifications are working"
                disabled={!phoneNumber}
              >
                📱 Test Text
              </button>
            </div>
          </div>
        </div>

        {/* Subscription & Payment */}
        <div className="bg-white rounded-2xl shadow-soft mb-6">
          <button
            onClick={() => toggleSection('billing')}
            className="w-full p-6 border-b border-gray-200 flex items-center justify-between md:cursor-default hover:bg-gray-50 md:hover:bg-white transition-colors"
          >
            <div className="text-left">
              <h2 className="text-xl font-bold text-gray-900">Subscription & Payment</h2>
              <p className="text-sm text-gray-600 mt-1">
                Manage your plan and billing
              </p>
            </div>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform md:hidden ${expandedSections.billing ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div className={`p-6 ${expandedSections.billing ? 'block' : 'hidden md:block'}`}>
            <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-semibold text-gray-900">Standard Plan</h3>
                <p className="text-sm text-gray-600">$9.99 per month</p>
                <p className="text-xs text-gray-500 mt-1">One subscription for your whole family</p>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                Active
              </span>
            </div>

            <div className="space-y-4">
              <button className="w-full sm:w-auto px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition">
                Update Payment Method
              </button>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2">
                  Need to make changes?
                </p>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to cancel? You can reactivate anytime.')) {
                      showToast('Subscription cancelled. Access continues until the end of your billing period.', 'info');
                    }
                  }}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Cancel Subscription
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Account Management */}
        {convexUser?.role === "primary" && (
          <div className="bg-white rounded-2xl shadow-soft border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Account Management</h2>
            </div>
            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Delete Account</h3>
              <p className="text-sm text-gray-600 mb-4">
                This will permanently delete your family account and all data. This cannot be undone.
              </p>
              <button
                onClick={() => {
                  if (confirm('⚠️ This will permanently delete your account and ALL data. Are you sure?')) {
                    const confirmation = prompt('Type DELETE to confirm:');
                    if (confirmation === 'DELETE') {
                      showToast('Account deletion initiated. Check your email for confirmation.', 'info');
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

        {/* Family Tab */}
        {activeTab === 'family' && (
        <div>
        {/* Family Details */}
        <div className="bg-white rounded-2xl shadow-soft mb-6">
          <button
            onClick={() => toggleSection('familyDetails')}
            className="w-full p-6 border-b border-gray-200 flex items-center justify-between md:cursor-default hover:bg-gray-50 md:hover:bg-white transition-colors"
          >
            <div className="text-left">
              <h2 className="text-xl font-bold text-gray-900">Family Details</h2>
              <p className="text-sm text-gray-600 mt-1">
                Basic family information
              </p>
            </div>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform md:hidden ${expandedSections.familyDetails ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div className={`p-6 ${expandedSections.familyDetails ? 'block' : 'hidden md:block'}`}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Family Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  defaultValue={family?.name || ""}
                  onBlur={async (e) => {
                    if (convexUser?.familyId && e.target.value.trim()) {
                      await updateFamilyDetails({
                        familyId: convexUser.familyId,
                        name: e.target.value.trim()
                      });
                      showToast("Family name updated", "success");
                    }
                  }}
                  placeholder="e.g., The Smiths"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">This will be displayed throughout the app</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Email
                </label>
                <input
                  type="email"
                  defaultValue={family?.primaryEmail || clerkUser?.primaryEmailAddress?.emailAddress || ""}
                  onBlur={async (e) => {
                    if (convexUser?.familyId && e.target.value.trim()) {
                      await updateFamilyDetails({
                        familyId: convexUser.familyId,
                        primaryEmail: e.target.value.trim()
                      });
                      showToast("Primary email updated", "success");
                    }
                  }}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">We'll send you reminders and digests here</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location (City or ZIP)
                </label>
                <input
                  type="text"
                  defaultValue={family?.location || ""}
                  onBlur={async (e) => {
                    if (convexUser?.familyId) {
                      await updateFamilyDetails({
                        familyId: convexUser.familyId,
                        location: e.target.value.trim()
                      });
                      showToast("Location updated", "success");
                    }
                  }}
                  placeholder="e.g., Atlanta, GA or 30319"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">For discovering local activities</p>
              </div>
            </div>
          </div>
        </div>

        {/* Family Members - Combined Section */}
        <div className="bg-white rounded-2xl shadow-soft mb-6">
          <button
            onClick={() => toggleSection('trackedMembers')}
            className="w-full p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between md:cursor-default hover:bg-gray-50 md:hover:bg-white transition-colors"
          >
            <div className="text-left">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Family Members</h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Manage account holders and track family members' schedules
              </p>
            </div>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform md:hidden ${expandedSections.trackedMembers ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div className={`p-4 sm:p-6 ${expandedSections.trackedMembers ? 'block' : 'hidden md:block'}`}>
            {/* Account Holders Section */}
            {!familyMembers ? (
              <div className="text-center py-4 text-gray-500">Loading...</div>
            ) : (
              <>
                <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">Account Holders</h3>
                <div className="space-y-2 sm:space-y-3 mb-6">
                  {familyMembers.map((member) => {
                    const memberGmailAccounts = gmailAccounts?.filter(
                      (acc) => acc.connectedByUserId === member._id
                    ) || [];
                    return (
                      <div
                        key={member._id}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                            {(member.fullName || member.email).charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                              {member.fullName || member.email}
                              {member.role === "primary" && (
                                <span className="ml-2 text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded">
                                  Primary
                                </span>
                              )}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600 truncate">{member.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:flex-shrink-0 pl-13 sm:pl-0">
                          {memberGmailAccounts.length > 0 ? (
                            <span className="text-xs sm:text-sm text-green-600 flex items-center gap-1">
                              ✓ Gmail Connected
                            </span>
                          ) : (
                            <span className="text-xs sm:text-sm text-gray-500">No Gmail</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Invite Spouse */}
                {convexUser?.role === "primary" && familyMembers.length === 1 && (
                  <div className="border-t pt-4 sm:pt-6 mb-6">
                    <h3 className="font-semibold text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">
                      Invite Your Spouse
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                      Send an invitation to share this calendar. They'll get full access at no extra charge.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="email"
                        placeholder="spouse@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleSendInvite}
                        className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition whitespace-nowrap"
                      >
                        Send Invite
                      </button>
                    </div>
                    {showInviteSuccess && (
                      <div className="mt-3 p-3 bg-green-50 text-green-800 rounded-lg text-xs sm:text-sm">
                        ✓ Invitation sent! They'll receive an email with instructions.
                      </div>
                    )}
                  </div>
                )}

                {/* Divider */}
                <div className="border-t pt-4 sm:pt-6 mt-2">
                  <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">Tracked Family Members</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mb-4">
                    Add the people in your family to track their schedules and activities
                  </p>
                </div>

                {/* Current Tracked Members */}
                {!trackedMembers ? (
                  <div className="text-center py-4 text-gray-500">Loading...</div>
                ) : (
                  <>
                    <div className="space-y-2 sm:space-y-3 mb-6">
                      {trackedMembers.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <p className="mb-2 text-sm">No family members added yet</p>
                          <p className="text-xs">Add your first family member to start tracking their schedules</p>
                        </div>
                      ) : (
                        trackedMembers.map((member) => (
                          <div
                            key={member._id}
                            className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg border-2 border-gray-200"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                                style={{ backgroundColor: member.color || "#6366f1" }}
                              >
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-900 text-sm sm:text-base">{member.name}</div>
                                <div className="text-xs sm:text-sm text-gray-600 truncate">
                                  {member.relationship && member.relationship}
                                  {member.birthdate && ` • Age ${Math.floor((new Date().getTime() - new Date(member.birthdate).getTime()) / (1000 * 60 * 60 * 24 * 365))}`}
                                </div>
                                {member.interests && member.interests.length > 0 && (
                                  <div className="text-xs text-gray-500 mt-1 truncate">
                                    Interests: {member.interests.join(", ")}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-13 sm:ml-0">
                              <button
                                onClick={() => {
                                  setEditingMember(member._id);
                                  setShowAddMemberModal(true);
                                }}
                                className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-primary-100 text-primary-700 rounded-lg font-medium hover:bg-primary-200 transition"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteFamilyMember(member._id, member.name)}
                                className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add New Member Button */}
                    <button
                      onClick={() => {
                        setShowAddMemberModal(true);
                        setEditingMember(null);
                      }}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Family Member
                    </button>

                    {/* Info Box */}
                    <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-1 flex items-center gap-2 text-sm sm:text-base">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Why track family members?
                      </h4>
                      <ul className="text-xs sm:text-sm text-blue-800 space-y-1 list-disc list-inside">
                        <li>Assign events to specific family members</li>
                        <li>Use color-coding to quickly identify whose events are whose</li>
                        <li>Get personalized activity suggestions based on their interests</li>
                        <li>Track ages and relationships for better event recommendations</li>
                      </ul>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        </div>
        )}

        {/* Connected Apps Tab - Gmail & Calendar */}
        {activeTab === 'apps' && (
        <div>
        {/* Google Calendar */}
        <div className="bg-white rounded-2xl shadow-soft mb-6">
          <button
            onClick={() => toggleSection('googleCalendar')}
            className="w-full p-6 border-b border-gray-200 flex items-center justify-between md:cursor-default hover:bg-gray-50 md:hover:bg-white transition-colors"
          >
            <div className="text-left">
              <h2 className="text-xl font-bold text-gray-900">Google Calendar</h2>
              <p className="text-sm text-gray-600 mt-1">
                Choose where to sync your events. They'll appear on your phone, computer, and anywhere else you use Google Calendar.
              </p>
            </div>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform md:hidden ${expandedSections.googleCalendar ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div className={`p-6 ${expandedSections.googleCalendar ? 'block' : 'hidden md:block'}`}>
            {/* Current Selection */}
            {family?.googleCalendarId && family?.calendarName && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">✓</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-900">Currently syncing to:</h3>
                    <p className="text-green-800 text-sm mt-1">{family.calendarName}</p>

                    {/* Calendar Push Notification Status */}
                    <div className="flex items-center gap-2 mt-3">
                      {family.calendarWebhookChannelId && family.calendarWebhookExpiration ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Real-time Sync Enabled
                          <span className="text-green-700">
                            (renews {new Date(family.calendarWebhookExpiration).toLocaleDateString()})
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Manual Sync Only
                        </span>
                      )}
                    </div>
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
                            {cal.accountEmail && (
                              <div className="text-xs text-gray-500 mt-1">
                                📧 {cal.accountEmail}
                              </div>
                            )}
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
        <div className="bg-white rounded-2xl shadow-soft mb-6">
          <button
            onClick={() => toggleSection('gmail')}
            className="w-full p-6 border-b border-gray-200 flex items-center justify-between md:cursor-default hover:bg-gray-50 md:hover:bg-white transition-colors"
          >
            <div className="text-left">
              <h2 className="text-xl font-bold text-gray-900">Gmail</h2>
              <p className="text-sm text-gray-600 mt-1">
                Connect your Gmail to automatically find events in your inbox - sports schedules, school emails, medical appointments, and more.
              </p>
            </div>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform md:hidden ${expandedSections.gmail ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div className={`p-6 ${expandedSections.gmail ? 'block' : 'hidden md:block'}`}>
            {/* Privacy Reassurance */}
            <div className="mb-6">
              <PrivacyBadge variant="email" />
            </div>
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
                    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 ${!account.isActive ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-900">
                          {account.displayName || "Gmail Account"}
                        </div>
                        <div className="text-sm text-gray-600 truncate">{account.gmailEmail}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {account.lastSyncAt
                            ? `Last checked: ${new Date(account.lastSyncAt).toLocaleDateString()}`
                            : "Not checked yet"}{" "}
                          • Connected by {account.connectedByName}
                        </div>
                        {/* Push Notification Status */}
                        <div className="flex items-center gap-2 mt-2">
                          {account.gmailPushEnabled ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Push Enabled
                              {account.gmailPushExpiration && (
                                <span className="text-green-700">
                                  (expires {new Date(account.gmailPushExpiration).toLocaleDateString()})
                                </span>
                              )}
                            </span>
                          ) : account.gmailPushError ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                              Push Failed: {account.gmailPushError.substring(0, 50)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                              Push Not Enabled
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={`text-sm flex items-center gap-1 ${account.isActive ? 'text-green-600' : 'text-gray-500'}`}
                      >
                        {account.isActive ? "Active" : "Paused"}
                      </span>
                      <button
                        onClick={() => handleDisconnectAccount(account._id, account.gmailEmail)}
                        className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 rounded-lg font-semibold transition shadow-sm"
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
                  {isScanning ? "Checking..." : "Check All Active Accounts Now"}
                </button>
                <button
                  onClick={handleResetScanHistory}
                  disabled={isScanning || !gmailAccounts || gmailAccounts.length === 0}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset History
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
        {false && activeTab === 'account' && (
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
          <div className="bg-white rounded-2xl shadow-strong max-w-2xl w-full max-h-[85vh] overflow-y-auto">
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

      {/* Bottom Navigation for Mobile */}
      <BottomNav />
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
