# Screen Scaling Fix

## Issue Description
The site wasn't properly scaling for the size of the screen. On desktop, it was centered but not taking up the entire screen width that it could compared to other sites.

## Solution
Modified the container class in the CSS to better utilize available screen space:

1. Changed the container from a fixed-width approach to a more flexible one:
   - Before: `max-width: 1200px`
   - After: `width: 95%; max-width: 1800px`

2. This change allows the content to:
   - Take up 95% of the available screen width on all screen sizes
   - Expand up to 1800px wide on large screens (50% more than before)
   - Maintain some margins on the sides (5% of screen width) for readability

## Files Changed
- `/frontend/src/App.css`: Modified the `.container` class to use more screen space

## Technical Details
The `.container` class is used throughout the application to control the width of content areas, including:
- The header navigation
- The main content area

By modifying this single class, we've improved the screen utilization across the entire application while maintaining a consistent design.

## Benefits
- Better utilization of available screen space on larger displays
- Improved user experience for users with wide screens
- Maintained responsive design principles for all screen sizes
