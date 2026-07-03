# Recent Changes (July 3, 2026) — Fix-It Prompt Implementation (Session 4)

Implemented all 7 items from the audit's "Fix-It Prompt" (see `TINGLETEST_AUDIT_REPORT.md` section 15). Zero visible UI/behavior/schema changes. Verified with `npm run build` + workflow restart + screenshot/console check.

✅ **Applied**:
1. XSS: `DOMPurify.sanitize()` now actually invoked in `HomePage.jsx`'s `ChatMessageTranslatedBody` on `mentionedHtml` before `dangerouslySetInnerHTML` (allowed tags: span/br/b/i/em/strong/u, allowed attr: class) — the import existed but was never called before this fix.
2. RTDB security rules — user deployed these themselves via Firebase Console; not touched in this session.
3. Presence heartbeat interval in `HomePage.jsx` changed 30s → 120s (RTDB `status/{uid}` writes).
4. Trust system write debounce — audit found this already implemented in `trustSystem.js` (5-min flush on `MESSAGE_SENT`); no change needed.
5. Team Members listener role filter — audit found `SettingsSidebar.jsx` already filters by `role in [...]`; no change needed.
6. Added `limit(500)` to `AdminPanelPage.jsx`'s `bannedIPs`, `bannedDevices`, and `rooms` (orderBy('order')) queries, and `limit(200)` to `HomePage.jsx`'s `privateMessages` participants-array-contains listener (no new `orderBy` added — avoided requiring an undeployable Firestore composite index on Spark plan without CLI access).
7. Code splitting via `React.lazy()` + `Suspense` in `App.jsx`: `AdminPanelPage`, `BuyCoinsPage`, `CoinWalletPage`, `Leaderboard`, `RJEarningsDashboard`, `RJWithdrawal` are now separate on-demand chunks instead of bundled into the main JS. Main bundle dropped from 3.07 MB to ~2.74 MB; Admin Panel alone is a 257 KB chunk that most users never download.

# Recent Changes (July 3, 2026) — Performance & Security Audit (Session 3)

Zero visible UI/behavior/schema changes; internal security hardening + query bounding only. Verified with a production build, workflow restart, and screenshot/console check.

✅ **Applied**:
- **RTDB security hole closed**: `broadcasts/rj` and `broadcasts/public/{id}` root `.write` rules in `database.rules.json` were `auth != null` (ANY authenticated user could hijack, overwrite, or delete a live broadcast, or push arbitrary YouTube/announcement state into someone else's session). Now gated to the actual live host via the existing `rjUid`/`hostUid` field — anyone can start a fresh session, but only that session's owner can write to it afterward. `youtube` and `announcements` sub-paths are now host-only writes (previously any authenticated user); `songQueue` allows a user to write only their own request or the host to manage any. **This requires deploying the updated `database.rules.json` via the Firebase Console or `firebase deploy --only database` — no Firebase CLI/credentials are available in this dev environment to do it automatically.**
- Added `limit(1000)` to three previously-unbounded `getDocs(collection(db, 'rooms'))` admin/bot bulk-action calls (HomePage.jsx bot broadcast, Sidebar.jsx bulk unkick, AdminPanelPage.jsx bulk unkick) and `limit(2000)` to the `collectionGroup('kickedUsers')` scan in AdminPanelPage — safety caps well above realistic data volume, so no visible truncation.

⏭️ **Investigated and intentionally left unchanged** (documented, not oversights):
- Possible leaked `onSnapshot` in `messageTextPreferences.js` — re-verified: `window._messageStylesUnsubscribes` is synchronously initialized before any listener is created, so this was a false positive from the earlier audit pass.
- Scoping the global RTDB `status` presence listener in HomePage.jsx to the current room (to fix O(N²) growth) — investigated but unsafe: `window.onlineUsers` (built from the full site-wide snapshot) also drives Sidebar's per-user online badges for users outside the current room and the site-wide online count, so scoping it would silently break those indicators. Left as documented future work requiring a Cloud Function presence aggregate.
- VPN admin-bypass flag — re-verified already sufficiently hardened (`enabled: false` by default, password sourced from an env var, not hardcoded).
- AdminPanelPage's always-on site-wide listeners — left as-is; justified by admins needing full visibility.

# Overview

TingleTap is a modern real-time chat application built with React that allows users to communicate through text, voice, and video. The platform features public chat rooms, private messaging, voice/video calls, media sharing, and advanced user customization options. The app includes comprehensive moderation tools, user profile management, and security features including VPN detection.

## Recent Changes (July 3, 2026) — Performance & Security Audit (Session 2)

Zero visible UI/behavior/schema changes; internal perf/security/cleanup only. Verified with a production build and a workflow restart.

✅ **Applied**:
- React.memo added to `GenderBadge`, `RoyalTrustBadge`, `PremiumImageMessage`, `TingleBotNotification` (plus pre-existing `ChatMessage`).
- `useMemo` added around Sidebar's online-user filter/sort/dedupe pipeline.
- Fixed a real `setInterval` leak in `WelcomeDashboard.jsx` (ban-modal polling interval now cleared on unmount).
- Leaderboard result + user-profile caching consolidated into a shared `src/utils/userProfileCache.js` (60s TTL, in-flight dedup) plus a 30s leaderboard-query cache to avoid loading flicker on tab switches.
- Added 5 Firestore composite indexes (`warnings_announcements`, `bannedIPs`, `bannedDevices`, `coinTransactions` x2) to `firestore.indexes.json`.
- `RJFollowSystem.jsx`: replaced persistent follower/following `onSnapshot` listeners with one-time `getCountFromServer` + optimistic local count updates; added `limit(50)` to the follower list modal query.
- Added a session-cached (`sessionStorage`, 1hr TTL) geolocation lookup helper in `RoomListPage.jsx`, replacing two duplicate `fetch` calls to the IP geolocation API.
- Wrapped `<BroadcastPanel>` in an `ErrorBoundary` in `HomePage.jsx` so a broadcast-panel crash no longer takes down the whole page.
- Fixed a `.info/connected` RTDB listener leak in `App.jsx` (subscription is now unsubscribed on cleanup).
- Hardened role-change logic in `AdminPanelPage.jsx` against privilege escalation: server-side re-check of the acting user's role, blocked self role-changes, blocked changing the owner's role, blocked assigning owner/superowner, and blocked admins from promoting/demoting other admins.

⏭️ **Intentionally deferred/skipped** (documented, not oversights):
- Memoizing Sidebar's individual "online user" list item was evaluated but skipped — the item has 25+ closures, a portal, and moderation actions wired to it, making extraction high-risk for a purely internal perf gain.
- Extracting `ChatInput`/`MessageList` out of `HomePage.jsx` (8,300+ lines) was evaluated but deferred — the file's size and tangled state make a safe, zero-behavior-change extraction a much larger, higher-risk effort than the other fixes in this pass.
- Ban-lockdown polling intervals in `LoginPage.jsx`, `SignupPage.jsx`, and `App.jsx` were audited and intentionally left as-is — they exist to keep enforcing an active ban screen and "fixing" them would change visible behavior.

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