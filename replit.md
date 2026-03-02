# Overview

TingleTap is a modern real-time chat application built with React that allows users to communicate through text, voice, and video. The platform features public chat rooms, private messaging, voice/video calls, media sharing, and advanced user customization options. The app includes comprehensive moderation tools, user profile management, and security features including VPN detection.

## Recent Changes (October 10, 2025)

✅ **Device Fingerprinting & Ban System Implementation**:
1. **Comprehensive Device Fingerprinting** (`src/utils/deviceFingerprint.js`):
   - Browser-based device ID generation using multiple fingerprinting techniques
   - Screen resolution, canvas fingerprint, WebGL renderer detection
   - Installed fonts enumeration, timezone, language, and platform detection
   - Generates unique, persistent device identifiers for tracking across sessions

2. **Device Ban System** (`src/utils/deviceBanSystem.js`):
   - Real-time device ban tracking with Firestore integration
   - Individual device ban capability independent of IP bans
   - Automatic device info capture (browser, OS, location, IP)
   - Ban persistence across browser sessions and IP changes
   - Integration with existing IP ban infrastructure

3. **Admin Panel Device Tracking Enhancements** (`src/pages/AdminPanelPage.jsx`):
   - Enhanced `getUserDeviceInfo()` function to display device fingerprint data
   - Real-time banned devices tracking with useEffect hook
   - **Device ID now displayed** in Location & IP column (first 12 chars with full ID on hover)
   - Device type, browser, OS displayed in Device Information column
   - Location and IP address displayed in Location & IP column
   - Banned devices statistics in admin dashboard
   - Device ban/unban functionality ready for implementation

4. **User Data Model Updates**:
   - Added `lastDeviceId` field to store device fingerprint
   - Added `lastDeviceInfo` object with browser, OS, and userAgent details
   - Device tracking integrated with Firebase Firestore user documents

✅ **Sidebar & Settings Design Restoration (FINAL FIX)**:
   - **Sidebar.css**: Increased `.user-status-list` from 0.5rem to 0.85rem (14px equivalent)
   - **SettingsSidebar.css**: Fixed all compact fonts from 8-9px to 13-14px
   - `.modern-nav-btn span`: 9px → 14px
   - `.modern-quick-btn`: 9px → 14px, span 8px → 13px  
   - `.action-btn`: 9px → 14px, span 8px → 13px
   - `.account-details p`: 9px → 13px
   - All buttons and text now use original larger design (13-16px)
   - Only HomePage retains compact styling via scoped CSS selectors

✅ **Admin Panel Ultra-Compact Luxurious Design (Mobile-First)**:
1. **Mobile-First Responsive Design**: Complete redesign with progressive enhancement
   - Stats grid: 140px min-width on mobile, scales to 220px on desktop
   - Compact padding: 50px/0.8rem on mobile, expands to 70px/2rem on desktop
   - Optimized gap spacing: 0.6rem mobile → 0.8rem tablet → 1rem desktop
   - All media queries follow mobile-first approach for better performance

✅ **HomePage CSS Scoping Fix**: 
   - Fixed global CSS rules in HomePage.css that were affecting all pages
   - Changed from universal `*` selector to `.homepage-container *` scope
   - Now only HomePage has compact styling, all other pages retain original design

✅ **Workflow Configuration**:
   - Successfully configured and verified Vite development server on port 5000
   - Ensured proper host binding (0.0.0.0) and allowedHosts configuration
   - Resolved port conflicts and confirmed error-free startup

## Previous Changes (January 5, 2025)

✅ **Fixed three critical UI/UX issues:**

1. **Username and Text Color Loading**: Improved immediate visibility of other users' username and text colors on site load
   - Reduced initialization delays from 1000ms to 100ms
   - Added cache-first loading approach with immediate style application
   - Enhanced Firebase permission error handling
   - Now loads 3 users' styles immediately from localStorage cache

2. **Private Message Window Optimization**: Reduced private message popup height and made contents more compact
   - Reduced maximum height from 320px to 240px
   - Reduced minimum height from 180px to 140px  
   - Decreased header height from 48px to 36px
   - Made all content elements smaller (fonts, padding, avatars) to prevent horizontal scrolling
   - Improved content density while maintaining readability

3. **Banned User Login Modal**: Fixed ban modal visibility for suspended accounts
   - Enhanced BanKickModal component to properly accept and use passed banInfo props
   - Improved login logic to better detect banned users and display appropriate warnings
   - Created simple inline modal with guaranteed visibility and proper z-index
   - Added test functionality for development (any email containing "banned" will trigger ban modal)
   - Modal shows clear suspension message with contact information and proper user acknowledgment

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework**: React 18 with Vite as the build tool, providing fast development and optimized production builds with Hot Module Reloading (HMR).

**Routing**: React Router DOM v7 for client-side navigation between landing page, main chat interface, and user profiles.

**State Management**: React hooks-based state management with local component state and context where needed. No external state management library is used, keeping the architecture simple.

**Component Structure**: Modular component architecture with dedicated components for chat interface, modals, sidebars, media players, and user interface elements. Each component has its own CSS file for styling isolation.

**Styling**: CSS-in-files approach with CSS variables for theming support (light/dark mode). Uses Google Fonts integration and CSS animations for enhanced user experience.

## Backend Architecture

**Database**: Firebase Firestore for real-time data synchronization and Firebase Realtime Database for live chat features. Firestore handles user profiles, friend requests, and persistent data while Realtime Database manages active chat sessions.

**Authentication**: Firebase Authentication for user management, registration, and login flows with email verification support.

**Real-time Communication**: 
- Firebase Realtime Database for instant messaging
- Agora SDK for voice/video calling capabilities
- WebRTC integration through lib-jitsi-meet for additional video conferencing features

**File Storage**: Firebase Storage (implied) for media file uploads including images, audio recordings, and profile pictures.

## Data Storage Solutions

**Primary Database**: Firebase Firestore with composite indexes defined in `firestore.indexes.json` for optimized queries on messages by timestamp, type, and auto-delete properties.

**Real-time Database**: Firebase Realtime Database for live chat synchronization and presence management.

**Local Storage**: Browser localStorage for caching user preferences (message styling, username styling, theme settings) to provide instant UI updates without server round-trips.

**Security Rules**: Comprehensive Firestore security rules for friend requests and user data access control, ensuring users can only access authorized data.

## Authentication and Authorization

**User Authentication**: Firebase Authentication with email/password flow and email verification via EmailJS integration.

**Access Control**: Firestore security rules controlling read/write access based on user authentication status and data ownership.

**Admin Features**: Role-based access control for admin functions including user banning, kick functionality, and announcement management.

**Security Features**: 
- VPN detection system using Abstract API to prevent proxy/VPN usage
- Device fingerprinting and tracking system for unique device identification
- Dual-layer ban system: IP-based bans and device-based bans
- Ban persistence across sessions, browser changes, and IP address changes
- Configurable security policies and IP whitelisting capabilities

## External Dependencies

**Communication Services**:
- Firebase (Firestore, Realtime Database, Authentication) - Primary backend infrastructure
- Agora RTC SDK - Voice and video calling functionality
- lib-jitsi-meet - Additional video conferencing capabilities
- EmailJS - Email verification and password reset functionality

**Media and Content**:
- Google Generative AI - AI chat bot integration (TingleBot)
- Giphy API - GIF and sticker integration for chat messages
- YouTube API - Music player and video search functionality
- React Image Crop - Profile picture editing capabilities

**Security and Validation**:
- Abstract API - IP geolocation and VPN detection services
- hCaptcha - Bot protection and spam prevention
- CryptoJS - Client-side encryption for sensitive data handling

**UI and Interaction**:
- React Toastify - User notification system
- Emoji Picker React - Emoji selection interface
- Google Fonts API - Typography and font customization

**Development Tools**:
- Vite - Build tool and development server
- TypeScript - Type checking and enhanced development experience

The architecture prioritizes real-time communication, user experience, and security while maintaining scalability through Firebase's managed services. The modular component design allows for easy feature additions and maintenance.