---
name: Toast width, close button, and logout-toast flow
description: Root causes behind toasts covering too much of the screen, invisible/broken close buttons, and the logout toast appearing on the wrong page.
---

**Full-screen toasts:** react-toastify's own default CSS sets `--toastify-toast-width: 100%` and toast width `100vw` under its `@media (max-width: 480px)` breakpoint. On most phones this is the default screen width, so toasts stretch edge-to-edge unless explicitly capped. Fix: cap `.Toastify__toast-container` to a `max-width` (e.g. 380px) on desktop, and on the mobile breakpoint give it side margins (e.g. `calc(100vw - 24px)` with `left/right: 12px`) instead of true full-width, so it always reads as a floating card rather than a screen-covering banner.

**Close button not visible/working:** the default `.Toastify__close-button` renders with `color: inherit` and low opacity — on some premium gradient backgrounds or theme combinations this blends into the toast. Giving it its own small translucent circular background (independent of the toast's own background) guarantees contrast regardless of what color the toast body is, without having to special-case every gradient.

**Logout toast is fired on the wrong page:** this app uses a documented cross-page pattern — set `sessionStorage.setItem('tt_page_toast', JSON.stringify({type:'logout'}))` before leaving the page, then LoginPage.jsx reads and clears that key on mount to fire the actual toast. Any logout code path that instead calls `toast.success(...)`/`pt.logout(...)` directly and then navigates away breaks this: the toast either never renders (hard `window.location.href` reload wipes it) or renders on the current page instead of the login page. All logout call sites (Sidebar.jsx dropdown, SettingsSidebar.jsx, WelcomeDashboard.jsx) must go through the sessionStorage handoff and land on `/login`, never call the toast inline themselves.
