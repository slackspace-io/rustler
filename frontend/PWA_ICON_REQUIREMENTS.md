# PWA Icon Requirements for Rustler Finance

This document outlines the icon requirements for the Rustler Finance Progressive Web App (PWA). These icons are referenced in the web manifest and HTML files and need to be created for the PWA to function properly.

## Icon Directory Structure

All icons should be placed in the `/frontend/public/icons/` directory.

## Required Icons

### Standard Icons

These icons are used for app icons on various platforms:

1. **icon-192x192.png**
   - Size: 192x192 pixels
   - Format: PNG with transparency
   - Purpose: Used for Android home screen icons and general purpose

2. **icon-512x512.png**
   - Size: 512x512 pixels
   - Format: PNG with transparency
   - Purpose: Used for high-resolution displays and as the base for adaptive icons

3. **maskable-icon.png**
   - Size: 512x512 pixels
   - Format: PNG with transparency
   - Purpose: Designed for Android's adaptive icons system
   - Note: This icon should have padding around the main content (about 20% on each side) to allow for safe zone in adaptive icon shapes

### Apple Touch Icons

These icons are used specifically for iOS devices:

1. **apple-touch-icon-152x152.png**
   - Size: 152x152 pixels
   - Format: PNG (no transparency)
   - Purpose: iPad touch icon

2. **apple-touch-icon-167x167.png**
   - Size: 167x167 pixels
   - Format: PNG (no transparency)
   - Purpose: iPad Pro touch icon

3. **apple-touch-icon-180x180.png**
   - Size: 180x180 pixels
   - Format: PNG (no transparency)
   - Purpose: iPhone touch icon

### Splash Screen Images

These images are used for splash screens on iOS devices:

1. **splash-640x1136.png**
   - Size: 640x1136 pixels
   - Format: PNG
   - Purpose: iPhone 5/SE splash screen

2. **splash-750x1334.png**
   - Size: 750x1334 pixels
   - Format: PNG
   - Purpose: iPhone 6/7/8 splash screen

3. **splash-1125x2436.png**
   - Size: 1125x2436 pixels
   - Format: PNG
   - Purpose: iPhone X/XS/11 Pro splash screen

4. **splash-1242x2208.png**
   - Size: 1242x2208 pixels
   - Format: PNG
   - Purpose: iPhone 6+/7+/8+ splash screen

5. **splash-1536x2048.png**
   - Size: 1536x2048 pixels
   - Format: PNG
   - Purpose: iPad (portrait) splash screen

6. **splash-1668x2224.png**
   - Size: 1668x2224 pixels
   - Format: PNG
   - Purpose: iPad Pro 10.5" (portrait) splash screen

7. **splash-2048x2732.png**
   - Size: 2048x2732 pixels
   - Format: PNG
   - Purpose: iPad Pro 12.9" (portrait) splash screen

### Shortcut Icons

These icons are used for the app shortcuts defined in the web manifest:

1. **add-transaction.png**
   - Size: 192x192 pixels
   - Format: PNG with transparency
   - Purpose: Icon for the "Add Transaction" shortcut

2. **accounts.png**
   - Size: 192x192 pixels
   - Format: PNG with transparency
   - Purpose: Icon for the "View Accounts" shortcut

## Design Guidelines

When creating these icons, follow these guidelines:

1. **Consistency**: All icons should have a consistent design language and color scheme
2. **Simplicity**: Use simple, recognizable shapes that are identifiable at small sizes
3. **Color**: Use the app's primary color (#4a6da7) as the main color
4. **Contrast**: Ensure good contrast for visibility on different backgrounds
5. **Safe Zone**: For maskable icons, keep important content within the inner 80% of the image

## Testing Icons

After creating the icons, test them on various devices and platforms to ensure they display correctly:

1. **Android**: Test on different Android versions and device sizes
2. **iOS**: Test on different iOS versions and device sizes
3. **Desktop**: Test on Chrome, Firefox, and Safari

## Resources for Creating Icons

- [PWA Builder](https://www.pwabuilder.com/imageGenerator) - Online tool for generating PWA icons
- [Maskable.app](https://maskable.app/) - Tool for creating and testing maskable icons
- [App Icon Generator](https://appicon.co/) - Tool for generating app icons for different platforms
