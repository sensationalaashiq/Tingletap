export const SITE = {
    name: 'TingleTap',
    tagline: 'Tingle, Tap, Talk',
    url: 'https://tingletap.com',
    description: "TingleTap is India's #1 free real-time chat platform — trusted by users worldwide. Join live chat rooms, send private messages, make voice & video calls, share GIFs, and connect with people across India and the globe — free forever.",
    ogImage: 'https://tingletap.com/tingletap-logo.jpg',
    ogImageAlt: "TingleTap — Free Chat Rooms, Voice & Video Calls",
    twitterHandle: '@tingletaps',
    locale: 'en_IN',
    language: 'en-IN',
    themeColor: '#7c3aed',
    author: 'TingleTap — Adrashtra Inc.',
    social: {
        instagram: 'https://www.instagram.com/tingletap',
        facebook:  'https://www.facebook.com/share/18uwA1Ybpd/',
        twitter:   'https://x.com/tingletaps',
        youtube:   'https://youtube.com/@tingletaps',
        linkedin:  'https://www.linkedin.com/in/tingle-tap-b8aa38253',
        threads:   'https://www.threads.com/@tingletap',
    },
};

// ── Shared keyword banks ──────────────────────────────────────────────────────

// India-specific keywords (primary audience)
const KW_INDIA = "TingleTap, Indian chat app, online chat India free, desi chat rooms, Hindi chat room online, free chatting India, live chat rooms India, voice chat India, video call India, chat with strangers India, best chat app India 2025, Indian chat community, chat online without registration India, free chat app India, online mitra chat, desi chatting, India chat platform, free voice chat India, Indian social chat, chat site India, random chat India, Indian dating chat, yaar dost chat";

// Global / diaspora keywords (secondary audience)
const KW_GLOBAL = "desi chat USA, desi chat UK, Indian chat USA, Indian chat UK, NRI chat app, Indian diaspora chat, South Asian chat app, desi chat abroad, Indian community chat USA, British Indian chat, Indian Americans chat, desi chat Canada, desi chat Australia, Indian chat online worldwide, free online chat rooms worldwide, chat with strangers online free, online chat rooms 2025, free online chat no registration, meet people online free, random chat online, free live chat rooms, talk to strangers online, make new friends online, free social chat app, global chat rooms, international chat rooms";

// Brand + feature keywords (universal)
const KW_BRAND = "TingleTap, Tingle Tap, TingleTap chat, TingleTap app, free chat rooms, live chat rooms, private messaging app, voice chat rooms, video call app, GIF chat, animated stickers chat, coin gifting chat, premium chat app";

// ── Page configs ──────────────────────────────────────────────────────────────

export const PAGES = {
    home: {
        title: "TingleTap — India's #1 Free Chat App | Chat Rooms, Voice & Video Calls",
        description: "Join TingleTap — India's most vibrant free chat platform, loved by Indians worldwide. Live chat rooms, private messaging, voice & video calls, GIF sharing. Connect with India and the global desi community. 100% free, no download required.",
        keywords: `${KW_INDIA}, ${KW_GLOBAL}, ${KW_BRAND}`,
        canonical: 'https://tingletap.com/',
        robots: 'index, follow, max-snippet:-1, max-image-preview:large',
        ogType: 'website',
    },
    landing: {
        title: "TingleTap — India's #1 Free Chat App | Chat Rooms, Voice & Video Calls",
        description: "Join TingleTap — India's most vibrant free chat platform, loved by Indians worldwide. Live chat rooms, private messaging, voice & video calls, GIF sharing. Connect with India and the global desi community. 100% free, no download required.",
        keywords: `${KW_INDIA}, ${KW_GLOBAL}, ${KW_BRAND}`,
        canonical: 'https://tingletap.com/',
        robots: 'index, follow, max-snippet:-1, max-image-preview:large',
        ogType: 'website',
    },
    about: {
        title: "About TingleTap — India's Chat Platform for the World",
        description: "Learn about TingleTap — built in India to connect people through real-time chat, voice & video calls. Used by Indians at home and across USA, UK, Canada, UAE, and 50+ countries. Discover our story, mission, and global community.",
        keywords: `about TingleTap, TingleTap story, Indian chat platform mission, Adrashtra Inc, who made TingleTap, best Indian chat community, TingleTap global, NRI chat community, desi app worldwide, ${KW_BRAND}`,
        canonical: 'https://tingletap.com/about',
        robots: 'index, follow',
        ogType: 'website',
    },
    contact: {
        title: "Contact TingleTap — Get Support & Reach Our Team",
        description: "Need help with TingleTap? Contact our support team for quick assistance. We support users from India, USA, UK, UAE, and worldwide. Report issues, share feedback, or ask questions — we respond within 24 hours.",
        keywords: `contact TingleTap, TingleTap support, TingleTap help, TingleTap customer service, report problem TingleTap, TingleTap email, TingleTap feedback, TingleTap international support`,
        canonical: 'https://tingletap.com/contact',
        robots: 'index, follow',
        ogType: 'website',
    },
    faq: {
        title: "FAQ — How to Use TingleTap | Help Center & Common Questions",
        description: "Everything you need to know about TingleTap. How to join chat rooms, use voice & video calls, manage your profile, earn coins, report users, and more. Your complete TingleTap guide — for users in India and worldwide.",
        keywords: `TingleTap FAQ, TingleTap help center, how to use TingleTap, TingleTap guide, TingleTap chat room help, TingleTap coins, TingleTap voice call, TingleTap tutorial India, TingleTap tutorial UK USA, TingleTap NRI guide`,
        canonical: 'https://tingletap.com/faq',
        robots: 'index, follow',
        ogType: 'website',
    },
    terms: {
        title: "Terms of Service — TingleTap User Agreement",
        description: "Read TingleTap's Terms of Service. Understand your rights and responsibilities as a TingleTap user, including community standards, prohibited content, and account policies — applicable globally.",
        keywords: `TingleTap terms of service, TingleTap user agreement, TingleTap rules, TingleTap community guidelines, TingleTap policies, chat app terms India, global chat platform terms`,
        canonical: 'https://tingletap.com/terms',
        robots: 'index, follow',
        ogType: 'website',
    },
    privacy: {
        title: "Privacy Policy — How TingleTap Protects Your Data",
        description: "TingleTap's Privacy Policy explains what data we collect, how we use it, and how we protect your personal information. GDPR-aware. Your privacy is our priority — for users in India, Europe, and worldwide.",
        keywords: `TingleTap privacy policy, TingleTap data protection, chat app privacy India, personal data TingleTap, GDPR TingleTap, user privacy chat India, data privacy international, UK GDPR TingleTap`,
        canonical: 'https://tingletap.com/privacy',
        robots: 'index, follow',
        ogType: 'website',
    },
    disclaimer: {
        title: "Disclaimer — TingleTap Legal Notice & Liability Statement",
        description: "TingleTap's official disclaimer: limitations of liability, user-generated content policies, and legal notices for the TingleTap global chat platform.",
        keywords: `TingleTap disclaimer, TingleTap legal notice, chat platform liability, TingleTap terms disclaimer, global chat disclaimer`,
        canonical: 'https://tingletap.com/disclaimer',
        robots: 'index, follow',
        ogType: 'website',
    },
    login: {
        title: "Login to TingleTap — Sign In to Your Account",
        description: "Sign in to TingleTap and rejoin your favourite chat rooms. Login with email and password. Trusted by users across India, USA, UK, UAE, and 50+ countries.",
        keywords: `TingleTap login, sign in TingleTap, TingleTap account login, chat app login India, online chat login`,
        canonical: 'https://tingletap.com/login',
        robots: 'index, follow',
        ogType: 'website',
    },
    signup: {
        title: "Join TingleTap Free — Create Your Chat Account",
        description: "Sign up for TingleTap in seconds — no credit card, no download required. Join thousands of Indians at home and abroad already chatting, calling, and connecting for free.",
        keywords: `TingleTap signup, join TingleTap, create TingleTap account, register TingleTap, free chat app signup India, desi chat register, NRI chat signup`,
        canonical: 'https://tingletap.com/signup',
        robots: 'index, follow',
        ogType: 'website',
    },
    rooms: {
        title: "Chat Rooms — Explore Live Rooms on TingleTap",
        description: "Browse all live chat rooms on TingleTap. Indian rooms, desi chat, Hindi rooms, topic-based rooms, and global rooms. Join free — connect with Indians and the global desi community in real-time.",
        keywords: `TingleTap chat rooms, live chat rooms India, desi chat rooms, Hindi chat rooms, Indian chat rooms online, public chat rooms free, global chat rooms, NRI chat rooms, Indian diaspora chat rooms`,
        canonical: 'https://tingletap.com/rooms',
        robots: 'index, follow',
        ogType: 'website',
    },
};
