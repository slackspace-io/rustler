# Testing Dark Mode Functionality

This document provides guidance on how to test the dark mode functionality that has been implemented in the Rustler application.

## Testing Steps

### 1. Basic Functionality

1. **Start the application**:
   ```bash
   # In the project root
   cd frontend
   npm install  # Install any new dependencies
   npm run dev
   ```

2. **Verify the theme toggle button**:
   - Look for the moon/sun icon in the header
   - The initial theme should match your system preference (light/dark)
   - Click the toggle button to switch between light and dark modes
   - Verify that the icon changes (moon to sun or vice versa)

3. **Visual inspection**:
   - In light mode, the application should have a light background with dark text
   - In dark mode, the application should have a dark background with light text
   - All components should be properly styled in both themes
   - Check for any elements that don't change color appropriately

### 2. Theme Persistence

1. **Set a theme preference**:
   - Toggle to your preferred theme (light or dark)
   - Refresh the page
   - Verify that the theme persists after refresh

2. **Check localStorage**:
   - Open browser developer tools (F12 or right-click > Inspect)
   - Go to the Application tab
   - Select "Local Storage" in the left sidebar
   - Verify that there's a "theme" key with a value of "light" or "dark"

3. **Clear localStorage and test system preference**:
   - Clear the "theme" entry from localStorage
   - Refresh the page
   - Verify that the application defaults to your system preference

### 3. Component-Specific Testing

Test the following components in both light and dark modes:

1. **Dashboard**:
   - Check that cards, charts, and summary sections are properly themed

2. **Account Management**:
   - Verify account list, account details, and forms are properly themed

3. **Transactions**:
   - Check transaction list, filters, and forms
   - Verify that positive/negative amounts maintain their color distinction

4. **Forms and Inputs**:
   - Test all form inputs to ensure they're readable in both themes
   - Check that focus states are visible in both themes

5. **Tables**:
   - Verify that table headers and rows are properly themed
   - Check hover states on table rows

### 4. Responsive Testing

1. **Mobile view**:
   - Resize the browser to mobile dimensions or use browser dev tools to simulate mobile
   - Verify that all elements maintain proper theming in responsive layouts

2. **Different browsers**:
   - Test in Chrome, Firefox, Safari, and Edge if possible
   - Verify consistent appearance across browsers

## Reporting Issues

If you encounter any issues with the dark mode implementation:

1. Note the specific component or element that has styling issues
2. Take a screenshot showing the problem
3. Note the browser and device you're using
4. Create an issue in the repository with these details

## Expected Behavior

- All text should be readable in both themes
- There should be sufficient contrast between text and backgrounds
- Interactive elements should be clearly distinguishable
- The theme should apply consistently across all pages and components
- Transitions between themes should be smooth (not jarring)
- No elements should "flash" or briefly show the wrong theme during page loads
