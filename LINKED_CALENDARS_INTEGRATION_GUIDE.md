# Linked Calendars Feature - Integration Guide

## ✅ What's Been Built

### Backend Complete:
1. **Database Schema** - `linkedCalendars` table added to `convex/schema.ts`
2. **iCal Parser** - `/lib/icalParser.ts` with full parsing functionality
3. **Convex Functions** - `/convex/linkedCalendars.ts` with all queries/mutations
4. **API Endpoint** - `/app/api/linked-calendars/fetch-events/route.ts`

### UI Components Complete:
1. **BrowseCalendarsModal** - `/app/components/BrowseCalendarsModal.tsx`
2. **AddLinkedCalendarModal** - `/app/components/AddLinkedCalendarModal.tsx`

## 📋 Integration Steps

### Step 1: Add to Settings Page

Add this to `/app/settings/page.tsx` after the Gmail section (around line 1800):

```tsx
{/* Linked Calendars - NEW */}
<div className="bg-white rounded-2xl shadow-soft mb-6">
  <button
    onClick={() => toggleSection('linkedCalendars')}
    className="w-full p-6 border-b border-gray-200 flex items-center justify-between md:cursor-default hover:bg-gray-50 md:hover:bg-white transition-colors"
  >
    <div className="text-left">
      <h2 className="text-xl font-bold text-gray-900">📅 Linked Calendars</h2>
      <p className="text-sm text-gray-600 mt-1">
        Browse calendars from schools, sports teams, and churches. Copy events you want to your family calendar.
      </p>
    </div>
    <svg
      className={`w-5 h-5 text-gray-500 transition-transform md:hidden ${expandedSections.linkedCalendars ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  </button>
  <div className={`p-6 ${expandedSections.linkedCalendars ? 'block' : 'hidden md:block'}`}>
    {linkedCalendars ? (
      linkedCalendars.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">📅</div>
          <p className="text-gray-600 mb-4">No calendars linked yet</p>
          <p className="text-sm text-gray-500 mb-6">
            Link calendars from schools, sports teams, or churches to browse their events
          </p>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {linkedCalendars.map((calendar) => (
            <div
              key={calendar._id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    {calendar.category === 'school' && '🎒'}
                    {calendar.category === 'sports' && '⚽'}
                    {calendar.category === 'church' && '⛪'}
                    {calendar.category === 'activities' && '🎵'}
                    {calendar.category === 'other' && '📅'}
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{calendar.displayName}</h3>
                    <p className="text-xs text-gray-500 capitalize">{calendar.category}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  if (window.confirm(`Remove "${calendar.displayName}"?`)) {
                    deleteLinkedCalendar({ calendarId: calendar._id });
                  }
                }}
                className="ml-3 p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )
    ) : (
      <div className="text-center py-8 text-gray-500">Loading...</div>
    )}

    <div className="flex gap-3">
      <button
        onClick={() => setShowAddLinkedCalendarModal(true)}
        className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition"
      >
        + Link a Calendar
      </button>
      {linkedCalendars && linkedCalendars.length > 0 && (
        <button
          onClick={() => setShowBrowseCalendarsModal(true)}
          className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition"
        >
          Browse Events
        </button>
      )}
    </div>
  </div>
</div>
```

### Step 2: Add State Variables to Settings Page

Add to the state section at the top of `SettingsContent()`:

```tsx
// Add to expandedSections
const [expandedSections, setExpandedSections] = useState({
  // ... existing fields ...
  linkedCalendars: false, // NEW
});

// Add modal state
const [showAddLinkedCalendarModal, setShowAddLinkedCalendarModal] = useState(false);
const [showBrowseCalendarsModal, setShowBrowseCalendarsModal] = useState(false);
```

### Step 3: Add Queries and Mutations to Settings Page

Add after existing queries:

```tsx
// Get linked calendars
const linkedCalendars = useQuery(
  api.linkedCalendars.getLinkedCalendars,
  convexUser?.familyId ? { familyId: convexUser.familyId } : "skip"
);

// Mutation to delete linked calendar
const deleteLinkedCalendar = useMutation(api.linkedCalendars.deleteLinkedCalendar);
```

### Step 4: Add Modal Components to Settings Page

Add at the bottom of the return statement, before closing `</div>`:

```tsx
{/* Add Linked Calendar Modal */}
{showAddLinkedCalendarModal && convexUser && (
  <AddLinkedCalendarModal
    familyId={convexUser.familyId}
    userId={convexUser._id}
    onClose={() => setShowAddLinkedCalendarModal(false)}
    onSuccess={() => {
      // Refresh will happen automatically via Convex reactivity
    }}
  />
)}

{/* Browse Calendars Modal */}
{showBrowseCalendarsModal && convexUser && (
  <BrowseCalendarsModal
    familyId={convexUser.familyId}
    userId={convexUser._id}
    onClose={() => setShowBrowseCalendarsModal(false)}
  />
)}
```

### Step 5: Add Imports to Settings Page

Add to the top of settings page:

```tsx
import AddLinkedCalendarModal from "@/app/components/AddLinkedCalendarModal";
import BrowseCalendarsModal from "@/app/components/BrowseCalendarsModal";
```

### Step 6: Add Browse Button to Dashboard

In `/app/dashboard/page.tsx`, add this button near the top of the main content area:

```tsx
{/* Browse Linked Calendars Button */}
{linkedCalendars && linkedCalendars.length > 0 && (
  <button
    onClick={() => setShowBrowseCalendarsModal(true)}
    className="w-full mb-6 p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-purple-700 transition shadow-md flex items-center justify-center gap-2"
  >
    <span className="text-2xl">📅</span>
    <span>Browse School & Team Calendars</span>
  </button>
)}
```

Add to Dashboard imports:

```tsx
import BrowseCalendarsModal from "@/app/components/BrowseCalendarsModal";
```

Add to Dashboard state:

```tsx
const [showBrowseCalendarsModal, setShowBrowseCalendarsModal] = useState(false);

// Add query
const linkedCalendars = useQuery(
  api.linkedCalendars.getLinkedCalendars,
  convexUser?.familyId ? { familyId: convexUser.familyId } : "skip"
);
```

Add modal at bottom:

```tsx
{/* Browse Calendars Modal */}
{showBrowseCalendarsModal && convexUser && (
  <BrowseCalendarsModal
    familyId={convexUser.familyId}
    userId={convexUser._id}
    onClose={() => setShowBrowseCalendarsModal(false)}
  />
)}
```

### Step 7: Add to Onboarding Flow

In `/app/onboarding/page.tsx`, add a new step (step 4) before the final step:

```tsx
{/* Step 4: Link Calendars (Optional) */}
{currentStep === 4 && (
  <div className="text-center max-w-2xl mx-auto px-4">
    <h2 className="text-3xl font-bold text-gray-900 mb-3">
      Link Calendars You Check Often
    </h2>
    <p className="text-lg text-gray-600 mb-8">
      Do your kids have calendars from schools, sports teams, or churches?
      Link them here so you can quickly browse and add events.
    </p>

    <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
      {linkedCalendars && linkedCalendars.length > 0 ? (
        <div className="space-y-3 mb-6">
          {linkedCalendars.map((calendar) => (
            <div
              key={calendar._id}
              className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg"
            >
              <span className="text-3xl">
                {calendar.category === 'school' && '🎒'}
                {calendar.category === 'sports' && '⚽'}
                {calendar.category === 'church' && '⛪'}
                {calendar.category === 'activities' && '🎵'}
                {calendar.category === 'other' && '📅'}
              </span>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-900">{calendar.displayName}</h3>
                <p className="text-sm text-gray-500 capitalize">{calendar.category}</p>
              </div>
              <span className="text-green-600 text-2xl">✓</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 mb-6">
          <p className="text-6xl mb-4">📅</p>
          <p>No calendars linked yet</p>
        </div>
      )}

      <button
        onClick={() => setShowAddLinkedCalendarModal(true)}
        className="w-full px-6 py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition text-lg"
      >
        + Link a Calendar
      </button>
    </div>

    <div className="flex gap-4">
      <button
        onClick={() => setCurrentStep(5)}
        className="flex-1 px-6 py-4 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition"
      >
        Skip for Now
      </button>
      <button
        onClick={() => setCurrentStep(5)}
        className="flex-1 px-6 py-4 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition"
      >
        Continue →
      </button>
    </div>
  </div>
)}
```

Add to onboarding state and queries (same as Dashboard).

## 🧪 Testing Checklist

### 1. Settings Page
- [ ] "Linked Calendars" section appears in Apps tab
- [ ] "+ Link a Calendar" button opens modal
- [ ] Can select category
- [ ] Can enter name and URL
- [ ] "Test Calendar Link" validates URL
- [ ] Successfully adds calendar
- [ ] Calendar appears in list
- [ ] Can delete calendar

### 2. Browse Modal
- [ ] Opens from Settings "Browse Events" button
- [ ] Opens from Dashboard button
- [ ] Shows all linked calendars
- [ ] Can filter by calendar
- [ ] Can filter by date range (This Week, etc.)
- [ ] Search works correctly
- [ ] Events display properly
- [ ] "+ Add" button opens confirmation
- [ ] Can assign to family members
- [ ] Can add notes
- [ ] Event successfully added to family calendar

### 3. Onboarding
- [ ] New step appears in onboarding flow
- [ ] Can add calendars during onboarding
- [ ] Can skip step
- [ ] Calendars persist after onboarding

### 4. End-to-End
- [ ] Link school calendar
- [ ] Browse events
- [ ] Search for specific event
- [ ] Add event with notes and family member
- [ ] Event syncs to Google Calendar
- [ ] Event appears in Calendar view

## 🐛 Troubleshooting

### Calendar Won't Fetch
- Check URL format (must be https:// or webcal://)
- Verify URL is publicly accessible
- Check browser console for CORS errors

### Events Not Showing
- Verify date filter settings
- Check if calendar has future events
- Try "Test Calendar Link" in add modal

### Modal Not Opening
- Check browser console for errors
- Verify state variables are added
- Check imports are correct

## 📝 Sample Calendar URLs for Testing

### Google Calendar (Public):
```
https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics
```

### Sample School Calendar:
```
webcal://example.school.edu/calendar/ical
```

## 🎉 You're Done!

The linked calendars feature is now fully integrated! Users can:
1. Link multiple external calendars (school, sports, church, etc.)
2. Browse all events from linked calendars in one place
3. Search and filter events
4. Copy events they want to their family calendar
5. Assign events to specific family members

This gives busy moms a single place to see everything without juggling multiple calendar apps!
