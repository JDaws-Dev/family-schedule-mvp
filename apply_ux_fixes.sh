#!/bin/bash
set -e

echo "========================================="
echo "Applying All UX Fixes"
echo "========================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}1. Fixing modal heights to 80vh across all pages...${NC}"
sed -i '' 's/max-h-\[85vh\]/max-h-[80vh]/g' app/dashboard/page.tsx
sed -i '' 's/max-h-\[85vh\]/max-h-[80vh]/g' app/calendar/page.tsx
sed -i '' 's/max-h-\[85vh\]/max-h-[80vh]/g' app/review/page.tsx
echo -e "${GREEN}✓ Modal heights fixed${NC}"

echo -e "${BLUE}2. Adding Bible Verse to bottom of dashboard...${NC}"
# Check if Bible verse is already displayed at bottom
if ! grep -q "Bible Verse of the Day" app/dashboard/page.tsx; then
    echo "  Note: Bible verse component needs manual addition"
    echo "  The BIBLE_VERSES constant already exists in dashboard"
else
    echo -e "${GREEN}✓ Bible verse already present${NC}"
fi

echo -e "${BLUE}3. Checking settings page family members section...${NC}"
if grep -q "Tracked Family Members" app/settings/page.tsx; then
    echo -e "${GREEN}✓ Family members section exists${NC}"
else
    echo "  Note: Family members section uses current format"
fi

echo ""
echo "========================================="
echo "Manual fixes needed:"
echo "========================================="
echo "1. Calendar page: Add showAddEventModal state and modals"
echo "2. Calendar page: Change AddEventChoiceModal handlers"
echo "3. Review page: Add showAddEventModal state and modals"
echo "4. Dashboard: Change modal title based on tab"
echo "5. All pages: Move Quick Add AI button below text field"
echo "6. All pages: Add Search Email button/functionality"
echo ""
echo "These require more complex changes and will be done via direct file edits"
