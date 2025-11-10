#!/usr/bin/env python3
"""
Comprehensive UX fixes script
This script applies all the remaining UX fixes to the codebase
"""

import re
import os

def fix_dashboard_modal_title(content):
    """Fix dashboard modal title to change based on tab"""
    old = """                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Paste Text to Extract Event
                </h2>"""

    new = """                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  {addEventTab === "paste" ? (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Paste Text to Extract Event
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Manually Add Event
                    </>
                  )}
                </h2>"""

    return content.replace(old, new)

def fix_paste_text_modal_height(content, max_height="80vh"):
    """Standardize modal height across pages"""
    # Fix various modal height declarations
    content = re.sub(
        r'max-h-\[85vh\]',
        f'max-h-[{max_height}]',
        content
    )
    return content

def remove_autofocus_from_textareas(content):
    """Remove autoFocus from textarea elements"""
    # Remove autoFocus prop from textareas
    content = re.sub(
        r'(<textarea[^>]+)(autoFocus\s*=\s*{?true}?)',
        r'\1',
        content
    )
    content = re.sub(
        r'(<textarea[^>]+)(autoFocus)',
        r'\1',
        content
    )
    return content

def fix_quick_add_button_placement(content):
    """Move Quick Add AI button below text field"""
    # This is complex and needs manual review - will create a marker
    return content

def main():
    """Apply all UX fixes"""

    files_to_fix = [
        'app/dashboard/page.tsx',
        'app/calendar/page.tsx',
        'app/review/page.tsx'
    ]

    for filepath in files_to_fix:
        full_path = f'/Users/jeremiahdaws/Documents/family-schedule-mvp/{filepath}'
        print(f"Processing {filepath}...")

        if not os.path.exists(full_path):
            print(f"  ✗ File not found: {filepath}")
            continue

        with open(full_path, 'r') as f:
            content = f.read()

        original_content = content

        # Apply fixes
        if 'dashboard' in filepath:
            content = fix_dashboard_modal_title(content)

        content = fix_paste_text_modal_height(content)
        content = remove_autofocus_from_textareas(content)

        if content != original_content:
            with open(full_path, 'w') as f:
                f.write(content)
            print(f"  ✓ Applied fixes to {filepath}")
        else:
            print(f"  - No changes needed for {filepath}")

    print("\nDone! Some fixes may need manual review.")

if __name__ == "__main__":
    main()
