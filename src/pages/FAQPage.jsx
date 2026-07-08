import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PremiumCopyright from '../components/PremiumCopyright';
import './LandingPage.css';
import SEO from '../seo/SEO';
import { FAQSchema, BreadcrumbSchema } from '../seo/StructuredData';
import { PAGES, SITE } from '../seo/seoConfig';

const BackIcon = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" style={{display:'block',flexShrink:0}}>
    <path d="M13 9H5M9 5.5l-4 3.5 4 3.5" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const LoginIcon = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" style={{display:'block',flexShrink:0}}>
    <path d="M11 5.5l4 3.5-4 3.5M15 9H7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7.5 3H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity=".7"/>
  </svg>
);
const FAQHeroIcon = () => (
  <svg viewBox="0 0 30 30" width="30" height="30" fill="none" style={{display:'block'}}>
    <circle cx="15" cy="15" r="12" stroke="white" strokeWidth="2.2"/>
    <path d="M11.5 11.5a3.5 3.5 0 0 1 7 .5c0 2.5-3.5 3.2-3.5 6" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
    <circle cx="15" cy="22" r="1.6" fill="white"/>
  </svg>
);
const ArrowRightIcon = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" style={{display:'block',flexShrink:0}}>
    <path d="M4 9h10M10.5 5.5L14 9l-3.5 3.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const SupportIcon = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" style={{display:'block',flexShrink:0}}>
    <circle cx="9" cy="9" r="7.5" stroke="#4f46e5" strokeWidth="1.9"/>
    <path d="M6.5 8.5a2.5 2.5 0 0 1 5 .5c0 1.6-2.5 2.4-2.5 3.5" stroke="#4f46e5" strokeWidth="1.9" strokeLinecap="round"/>
    <circle cx="9" cy="14.5" r="1.1" fill="#4f46e5"/>
  </svg>
);

const CAT_ICONS = {
  general: (
    <svg viewBox="0 0 18 18" width="16" height="16" fill="none" style={{display:'block',flexShrink:0}}>
      <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M9 5v4.5l3 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  features: (
    <svg viewBox="0 0 18 18" width="16" height="16" fill="none" style={{display:'block',flexShrink:0}}>
      <rect x="2" y="2" width="14" height="14" rx="3.5" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M5 9h8M5 6h5M5 12h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  broadcast: (
    <svg viewBox="0 0 18 18" width="16" height="16" fill="none" style={{display:'block',flexShrink:0}}>
      <circle cx="9" cy="9" r="2.8" fill="currentColor" opacity=".2" stroke="currentColor" strokeWidth="1.7"/>
      <path d="M4.5 13.5a6.5 6.5 0 0 1 0-9M13.5 4.5a6.5 6.5 0 0 1 0 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
      <path d="M6.5 11.5a3.5 3.5 0 0 1 0-5M11.5 6.5a3.5 3.5 0 0 1 0 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".7"/>
    </svg>
  ),
  safety: (
    <svg viewBox="0 0 18 18" width="16" height="16" fill="none" style={{display:'block',flexShrink:0}}>
      <path d="M9 1.5L2 5v4C2 13 5 16.5 9 17c4-0.5 7-4 7-8V5L9 1.5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M6 9.5l2 2L12 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  account: (
    <svg viewBox="0 0 18 18" width="16" height="16" fill="none" style={{display:'block',flexShrink:0}}>
      <circle cx="9" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M2.5 16c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  coins: (
    <svg viewBox="0 0 18 18" width="16" height="16" fill="none" style={{display:'block',flexShrink:0}}>
      <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M9 5v1.5M9 11.5V13M6.5 8C6.5 6.9 7.6 6 9 6s2.5.9 2.5 2-1.1 2-2.5 2-2.5.9-2.5 2S7.6 14 9 14s2.5-.9 2.5-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
    </svg>
  ),
  technical: (
    <svg viewBox="0 0 18 18" width="16" height="16" fill="none" style={{display:'block',flexShrink:0}}>
      <rect x="2" y="4" width="14" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M6 8.5L4.5 10 6 11.5M12 8.5l1.5 1.5L12 11.5M8.5 12l1-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

const categories = [
  { key: 'all', label: 'All Questions' },
  { key: 'general', label: 'General' },
  { key: 'features', label: 'Features' },
  { key: 'broadcast', label: 'Broadcasts & RJ' },
  { key: 'safety', label: 'Safety & Moderation' },
  { key: 'account', label: 'Account & Profile' },
  { key: 'coins', label: 'Coins & Gifts' },
  { key: 'technical', label: 'Technical' },
];

const faqData = [
  {
    cat: 'general',
    question: 'What is TingleTap?',
    answer: 'TingleTap is India\'s premium real-time chat platform. It combines live public chat rooms, private encrypted messaging, RJ radio shows, live voice broadcasts, Broadcast Stage (a live mini-podcast feature), TingleBot AutoMod, auto translation, virtual gifting, emoji reactions, voice messages, GIF and sticker support, multiple radio channels, and rich profile customisation — all completely free. It is designed from the ground up for the Indian community, with cultural awareness built into every feature.',
  },
  {
    cat: 'general',
    question: 'Is TingleTap free to use?',
    answer: 'Yes — TingleTap is 100% free with no hidden charges. Every primary feature is available without paying anything: all chat rooms, voice messages, private messaging, auto translation, RJ broadcasts, TingleBot AutoMod protection, GIFs, stickers, emoji reactions, radio channels, and profile customisation. The only optional paid feature is purchasing virtual coins to send gifts to RJs during live broadcasts. Coins can also be earned through platform activity.',
  },
  {
    cat: 'general',
    question: 'Do I need to create an account to use TingleTap?',
    answer: 'No. TingleTap offers full Guest Access — you can join any public chat room, read messages, send messages, and experience the platform without creating an account or providing any personal information. Guests receive a system-assigned display name. Creating an account unlocks additional features like saved preferences, private messaging, coin wallets, profile customisation, and sending virtual gifts.',
  },
  {
    cat: 'general',
    question: 'What makes TingleTap different from WhatsApp, Telegram, or Discord?',
    answer: 'TingleTap is built specifically for community-style live chat — not personal messaging networks. Key differences: public chat rooms are open and discoverable (like a digital town square), RJ radio shows broadcast live voice with synced YouTube music to all listeners simultaneously, Broadcast Stage lets any listener speak live on-air, TingleBot AutoMod runs 24/7 context-aware moderation, auto translation breaks language barriers in real-time, and the virtual gift economy lets you directly support RJ creators. TingleTap is also Indian-built, India-law-compliant, and designed for Indian cultural norms.',
  },
  {
    cat: 'general',
    question: 'Is TingleTap available as a mobile app?',
    answer: 'TingleTap works fully in any modern mobile browser (Chrome, Safari, Firefox on Android and iOS) — no app download required. You can also install it as a Progressive Web App (PWA) for an app-like experience: tap "Add to Home Screen" in your browser menu to get an icon on your phone\'s home screen, offline capability, and faster load times on repeat visits.',
  },
  {
    cat: 'general',
    question: 'Who built TingleTap?',
    answer: 'TingleTap is built and operated by Adrashtra Inc., a team of passionate Indian developers and designers. The platform was created out of a belief that Indian users deserved a premium, culturally aware chat experience that truly understood their community — not a foreign product awkwardly adapted for India. Every feature is designed with the Indian user at the centre.',
  },
  {
    cat: 'features',
    question: 'What chat features are available in public rooms?',
    answer: 'Public chat rooms support: real-time text messages, voice messages (up to 60 seconds with waveform playback), image and media sharing, GIF search and sending, sticker packs, emoji reactions on messages (hover any message), YouTube video sharing with embedded playback, private user-to-user mentions, message reporting, and full TingleBot AutoMod protection. Messages display with custom username gradients and fonts set by each user.',
  },
  {
    cat: 'features',
    question: 'How does Auto Translation work?',
    answer: 'Auto Translation instantly translates any message in any chat room into your preferred language. It uses the MyMemory translation API with support for Hindi, English, Tamil, Telugu, Bengali, Gujarati, Marathi, Punjabi, Kannada, Malayalam, Urdu, and many more languages. You can enable it per-room or globally from your settings. Translation happens in real-time — you see the original message and the translated version side by side. TingleTap is one of the few Indian chat platforms with this built-in.',
  },
  {
    cat: 'features',
    question: 'How do voice messages work?',
    answer: 'Click the microphone icon in the message input bar, hold to record (up to 60 seconds), then release to send. Voice messages are delivered instantly to all room participants. Features include: waveform visualisation showing audio levels across the recording, playback speed control (0.5x, 1x, 1.5x, 2x), and auto-play option. Voice messages work in all public rooms and private chats. Your browser may ask for microphone permission the first time — this is required.',
  },
  {
    cat: 'features',
    question: 'Can I share YouTube videos in chat?',
    answer: 'Yes. Use the YouTube button in the message bar to search for any video by title or keywords. Results show thumbnail previews and video duration. Sharing embeds the video directly in the chat with a thumbnail, title, and playback controls that all room participants can use. RJs additionally get YouTube synchronisation for broadcasts — every listener hears the music at the exact same timestamp in real-time.',
  },
  {
    cat: 'features',
    question: 'What are Radio Channels?',
    answer: 'Radio Channels are curated live music and talk radio stations that stream continuously inside TingleTap. Choose from multiple genres and stations from the radio panel. The radio keeps playing in the background even when you switch between chat rooms or close the broadcast panel — you can chat and listen simultaneously. Channels update regularly with new stations based on community interest.',
  },
  {
    cat: 'features',
    question: 'How do emoji reactions work?',
    answer: 'Hover over any message (or long-press on mobile) to reveal the reaction button. Click it to open the emoji picker and select your reaction. Reactions appear immediately below the message for everyone in the room and update in real-time as more users react. Multiple reaction types are supported. Reaction counts update live without any page refresh needed.',
  },
  {
    cat: 'features',
    question: 'How does profile customisation work?',
    answer: 'TingleTap offers deep profile personalisation: custom username gradient colours (choose any two colours for a gradient effect), message font style selection (multiple font families), light and dark theme toggle, profile picture upload and crop, custom status message, display name, and gender verification badge. Changes to your username colours and fonts are applied instantly and visible to all users across all chat rooms in real-time — no refresh needed.',
  },
  {
    cat: 'broadcast',
    question: 'What is an RJ Radio Show?',
    answer: 'Verified RJs host live audio shows on TingleTap. As a listener, you join the broadcast and hear the RJ\'s voice in real-time via WebRTC peer-to-peer audio. RJs can simultaneously sync YouTube music so all listeners hear the same song at the exact same moment. Audio continues playing in the background even when you minimise the app or switch tabs — the show goes on uninterrupted. RJs can also manage a live song request queue from the audience.',
  },
  {
    cat: 'broadcast',
    question: 'What is Live Broadcast and who can use it?',
    answer: 'Any registered TingleTap user can start a Live Broadcast — a real-time audio show with optional password protection to control who can listen. Broadcast to everyone in a room or restrict it to specific listeners. Verified RJs get additional broadcast tools: YouTube music sync, a live song request queue, Broadcast Stage management for guest speakers, real-time announcements to all listeners, and a virtual gift/earnings dashboard. Basic broadcast is open to all users.',
  },
  {
    cat: 'broadcast',
    question: 'What is Broadcast Stage and how do I join as a speaker?',
    answer: 'Broadcast Stage is a live mini-podcast feature that runs during an RJ\'s show. As an audience member, you can request to join the stage as a speaker. If the RJ accepts your request, your microphone goes live and all listeners can hear both you and the RJ simultaneously — like a live radio call-in show. The RJ can mute individual speakers, remove speakers from the stage, or end the stage session at any time. You can request to join from the Stage tab in the broadcast panel.',
  },
  {
    cat: 'broadcast',
    question: 'Why does the RJ\'s audio cut out when I switch tabs?',
    answer: 'Browsers sometimes throttle or suspend audio contexts for background tabs to save battery and CPU. TingleTap has a visibility-change handler built in that automatically resumes the audio context when you return to the tab. If audio does not resume, tap anywhere on the page or click the broadcast panel once — this user gesture will unlock the audio in all browsers. This is a browser security restriction (not a TingleTap bug) that requires a user gesture to unlock audio contexts.',
  },
  {
    cat: 'broadcast',
    question: 'Can I listen to broadcasts while chatting in other rooms?',
    answer: 'Yes. The broadcast audio panel is separate from the chat rooms. Once you join a live broadcast, the audio continues playing as you navigate between rooms, visit profiles, or browse other sections of TingleTap. The mini-player remains active. You can leave the broadcast explicitly from the broadcast panel controls whenever you choose.',
  },
  {
    cat: 'safety',
    question: 'What is TingleBot AutoMod?',
    answer: 'TingleBot is TingleTap\'s built-in, always-on automated moderation system. It runs 24/7 across every chat room and monitors messages in real-time for: spam and flooding, abusive and threatening language, homoglyphs (using look-alike characters to bypass filters), personal information sharing (phone numbers, addresses), hate speech, scam patterns, coordinated harassment, and content inappropriate for the platform. TingleBot uses a context-aware engine — it understands casual Hindi/English slang and does not falsely flag normal conversation. Enforcement follows a Warning → Mute → Kick ladder; automatic banning is never done.',
  },
  {
    cat: 'safety',
    question: 'How do I report a user or message?',
    answer: 'Hover over any message (or long-press on mobile) to reveal the report button. Click it and select the appropriate reason: Spam, Harassment, Inappropriate Content, Hate Speech, Personal Information Sharing, Scam, or Other. Add optional context and submit. Your report goes directly to the moderation queue. Critical safety reports (threats, CSAM) are triaged within 1 hour. Other reports are reviewed within 24 hours. You will receive a notification when action is taken.',
  },
  {
    cat: 'safety',
    question: 'What happens when TingleBot takes action against me?',
    answer: 'TingleBot follows a proportional escalation system: first offence typically results in a Warning (private message explaining the violation). Repeated violations result in a temporary Mute (you cannot send messages for a set duration). Continued violations result in a Kick (you are removed from the room and must rejoin after a cooldown). Permanent bans are never automatic — they require review and action by a human moderator or platform administrator. If you believe an AutoMod action was a mistake, contact support.',
  },
  {
    cat: 'safety',
    question: 'What is the ban system — how does it work?',
    answer: 'TingleTap uses a dual-layer ban system for maximum effectiveness: IP bans block access from a specific internet connection, while device fingerprint bans use browser characteristics (screen resolution, WebGL renderer, canvas fingerprint, timezone, installed fonts) to identify a specific device regardless of IP address or account. This means simply changing IP address, using a VPN, or creating a new account does not bypass a device ban. Bans are applied only by human moderators after review.',
  },
  {
    cat: 'safety',
    question: 'Is TingleTap safe for adults? What content is allowed?',
    answer: 'TingleTap is an adult platform (18+ only). The community standards allow mature conversation between consenting adults within limits. Strictly prohibited in all circumstances: CSAM (child sexual abuse material), doxxing (sharing personal information to harm someone), coordinated harassment campaigns, content that incites violence or terrorism, hate speech targeting religion/caste/gender/ethnicity, and scam or fraud activity. Room-specific rules may set additional restrictions — check the room description. The TingleBot AutoMod is context-aware and distinguishes between casual adult conversation and genuine policy violations.',
  },
  {
    cat: 'safety',
    question: 'How does VPN detection work? Can I use a VPN?',
    answer: 'TingleTap\'s VPN detection system checks multiple signals to identify proxy and VPN connections. Legitimate VPN use for privacy is generally not blocked unless combined with other suspicious signals. The system specifically targets proxy abuse (users trying to evade bans or manipulate location data for room access). If you are a genuine VPN user and experience access issues, contact support — false positives are reviewed and corrected within 24 hours.',
  },
  {
    cat: 'account',
    question: 'How do I create a TingleTap account?',
    answer: 'Click "Sign Up" on the landing page or any login prompt. Enter your email address, choose a display name, set a password, and select your gender. You will receive a verification email — click the link to activate your account. Once verified, you can customise your profile, set username colours, choose a theme, upload a profile picture, and access all registered-user features. The entire process takes under two minutes.',
  },
  {
    cat: 'account',
    question: 'What are gender verification badges?',
    answer: 'Gender badges visually display a user\'s verified gender on their profile and in chat messages. They help create a more transparent community. Badge options include Male (Purush), Female (Stree), and Transgender (Navrang) — reflecting TingleTap\'s commitment to inclusive identity representation. Verification is optional. Contact support to request a verification review. Verified badges increase community trust and unlock priority support.',
  },
  {
    cat: 'account',
    question: 'Can I change my username or display name?',
    answer: 'Yes. Go to Settings → Profile to update your display name at any time. Username colour gradients and font styles can be changed from Settings → Customisation — changes apply instantly across all chat rooms without any refresh. Profile pictures can be uploaded and cropped directly in the settings panel using the built-in image crop tool.',
  },
  {
    cat: 'account',
    question: 'How do I delete my account?',
    answer: 'You have the right to delete your account and all associated data at any time. Go to Settings → Account → Delete Account, or send a deletion request to support@tingletap.com with subject "Account Deletion Request". All personal data — including your profile, messages, preferences, and coin wallet — is permanently and irreversibly erased within 30 days of the request, as required by IT Rules 2021. Coin balances are not refundable upon deletion.',
  },
  {
    cat: 'account',
    question: 'I forgot my password. How do I reset it?',
    answer: 'On the login page, click "Forgot Password" and enter your registered email address. You will receive a password reset link within a few minutes. If you do not see it, check your spam or promotions folder. The reset link expires after 24 hours — request a new one if needed. If you no longer have access to your registered email, contact support with proof of account ownership.',
  },
  {
    cat: 'account',
    question: 'What is the Friends system on TingleTap?',
    answer: 'You can send friend requests to any registered user from their profile or from the user list in chat rooms. Accepted friends appear in your friends list in the sidebar for quick access. The friend request modal shows the sender\'s current profile picture, name, and gender badge. You can accept or decline requests from the notifications panel. Friend connections enable faster private messaging initiation and appear as priority contacts in your list.',
  },
  {
    cat: 'coins',
    question: 'What are TingleTap Coins?',
    answer: 'TingleTap Coins are the platform\'s virtual currency. They are used exclusively to send virtual gifts to RJs during live broadcasts. Coins can be purchased through the Buy Coins page using standard payment methods, or earned through platform activity and achievements. Coins have no real-world monetary value and cannot be withdrawn as cash by regular users. RJ earnings from received gifts can be tracked in the RJ Earnings Dashboard.',
  },
  {
    cat: 'coins',
    question: 'How do I send a gift to an RJ?',
    answer: 'During any live RJ broadcast, open the Gifts tab in the broadcast panel. Browse the available virtual gifts (roses, crowns, diamonds, stars, and more) — each has a coin cost displayed. Select the gift you want to send and confirm. The gift appears as an animated overlay visible to all broadcast listeners, and the coin cost is deducted from your wallet instantly. RJs see a notification and the gift is recorded in their earnings dashboard.',
  },
  {
    cat: 'coins',
    question: 'How do RJs earn from TingleTap?',
    answer: 'When listeners send virtual gifts during a live broadcast, the gift\'s coin value is credited to the RJ\'s earnings balance. RJs can view their total earnings, gift breakdown by gift type, and transaction history in the RJ Earnings Dashboard. A live leaderboard shows top gift senders and top earning RJs. RJ withdrawal processes are handled through the RJ Withdrawal page — contact support for current withdrawal terms and minimum thresholds.',
  },
  {
    cat: 'coins',
    question: 'Can I get a refund on purchased coins?',
    answer: 'Coin purchases are generally non-refundable once the coins have been added to your wallet. If you believe there has been a payment error, unauthorised transaction, or technical issue with your purchase, contact support immediately at support@tingletap.com with your transaction details. Refund requests related to payment processing errors are reviewed within 5 business days. We do not refund coins that have already been spent on gifts.',
  },
  {
    cat: 'technical',
    question: 'Which browsers are supported?',
    answer: 'TingleTap works best on the latest versions of Chrome, Firefox, Safari, and Microsoft Edge. Chrome is recommended for the best voice and WebRTC performance. Mobile browsers are fully supported — Chrome on Android and Safari on iOS. Internet Explorer is not supported. For voice features (microphone, broadcasts), your browser must support WebRTC — all modern browsers do. If you encounter issues, try updating your browser to the latest version first.',
  },
  {
    cat: 'technical',
    question: 'The microphone or camera is not working. What should I do?',
    answer: 'First, check browser permissions: click the lock/info icon in the browser address bar and ensure Microphone access is set to "Allow" for TingleTap. On mobile, check your device settings → Apps → Browser → Permissions → Microphone. If permission is already allowed, try: refreshing the page, closing and reopening the browser, or trying Chrome instead of another browser. On iOS Safari, microphone access for WebRTC may require iOS 14.3 or later and a valid HTTPS connection.',
  },
  {
    cat: 'technical',
    question: 'Messages are not loading or are loading slowly. How do I fix this?',
    answer: 'TingleTap uses Firebase Realtime Database for instant message delivery. If messages are slow or not appearing: check your internet connection, try refreshing the page, clear your browser cache (Settings → Clear browsing data → Cached images and files), or try in a different browser. If the issue persists across browsers and networks, it may be a temporary Firebase service issue — check Firebase Status at status.firebase.google.com. Contact support if the problem continues.',
  },
  {
    cat: 'technical',
    question: 'Why does my username colour not show for others?',
    answer: 'Username colours are fetched from Firestore and cached in localStorage for performance. If another user does not see your updated colours: ask them to refresh the page (a hard refresh: Ctrl+Shift+R on desktop) to clear their cache. Styles typically propagate within 30–60 seconds. If you recently changed your colours and they are still not visible after a few minutes and a refresh, try setting them again from Settings → Customisation.',
  },
  {
    cat: 'technical',
    question: 'Is TingleTap a PWA? Can I install it?',
    answer: 'Yes. TingleTap is a full Progressive Web App (PWA). On Android (Chrome): tap the three-dot menu → "Add to Home Screen". On iOS (Safari): tap the Share button → "Add to Home Screen". Once installed, TingleTap launches in full-screen mode without browser chrome, loads faster on repeat visits, and can receive push notifications (where supported by your OS). The installed version updates automatically when new versions are deployed.',
  },
  {
    cat: 'technical',
    question: 'How is TingleTap\'s data protected? Is it secure?',
    answer: 'TingleTap uses multiple security layers: all traffic is encrypted with TLS 1.3 in transit, private messages use end-to-end encryption (only sender and recipient can read them), voice calls use WebRTC\'s built-in DTLS-SRTP encryption (peer-to-peer, not routed through our servers), all data at rest is encrypted within Firebase\'s secure infrastructure, and strict server-side Firestore security rules prevent any unauthorised data access at the infrastructure level. Device fingerprinting and IP-based systems protect against account abuse. See our Privacy Policy for the complete security architecture.',
  },
];

const FAQPage = () => {
  const navigate = useNavigate();
  const [active, setActive] = useState(null);
  const [activeCat, setActiveCat] = useState('all');

  const filtered = activeCat === 'all' ? faqData : faqData.filter(f => f.cat === activeCat);

  const bulletStyle = {
    marginTop: 12, paddingLeft: 0, listStyle: 'none',
    display: 'flex', flexDirection: 'column', gap: 8,
  };
  const bulletItemStyle = {
    display: 'flex', alignItems: 'flex-start', gap: 9,
    fontSize: 13.5, color: '#4b5563', lineHeight: 1.72,
  };
  const dotStyle = {
    flexShrink: 0, marginTop: 7, width: 6, height: 6,
    borderRadius: '50%', background: 'linear-gradient(135deg,#818cf8,#6366f1)', display: 'block',
  };

  return (
    <div className="lp-root lp-lpage">
      <SEO
        title={PAGES.faq.title}
        description={PAGES.faq.description}
        keywords={PAGES.faq.keywords}
        canonical={PAGES.faq.canonical}
        robots={PAGES.faq.robots}
        ogType={PAGES.faq.ogType}
      />
      <FAQSchema faqs={faqData.map(f => ({ question: f.question, answer: f.answer.replace(/\n/g, ' ') }))} />
      <BreadcrumbSchema crumbs={[
        { name: 'Home', url: SITE.url },
        { name: 'FAQ', url: PAGES.faq.canonical },
      ]} />
      <div className="lp-bg" aria-hidden="true">
        <div className="lp-orb lp-orb-1"/><div className="lp-orb lp-orb-2"/><div className="lp-orb lp-orb-3"/>
      </div>

      <header className="lp-header">
        <div className="lp-header-inner">
          <div className="lp-brand" onClick={() => navigate('/')} style={{cursor:'pointer'}}>
            <img src="/tingletap-logo.jpg" alt="TingleTap" className="lp-logo"/>
            <div className="lp-brand-text">
              <span className="lp-brand-name">TingleTap</span>
              <span className="lp-brand-sub">FAQ</span>
            </div>
          </div>
          <nav className="lp-nav">
            <button className="lp-nav-ghost" onClick={() => navigate('/')}><BackIcon /><span>Back Home</span></button>
            <button className="lp-nav-solid" onClick={() => navigate('/login')}><LoginIcon /><span>Login</span></button>
          </nav>
        </div>
      </header>

      <main className="lp-main">

        {/* Hero */}
        <div className="lp-hero">
          <div className="lp-hero-icon"><FAQHeroIcon /></div>
          <h1 className="lp-hero-title">Frequently Asked Questions</h1>
          <p className="lp-hero-sub">
            Everything you need to know about TingleTap — features, safety, accounts, coins, and technical help.
            Detailed answers, plain language. {faqData.length} questions answered.
          </p>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:8, marginTop:12,
            background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)',
            borderRadius:10, padding:'8px 16px', fontSize:12.5, color:'#4f46e5', fontWeight:600,
          }}>
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke="#4f46e5" strokeWidth="1.3"/>
              <path d="M5.5 8.5l2 2L11 6" stroke="#4f46e5" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Can't find an answer? Contact support — we respond within 24 hours
          </div>
        </div>

        {/* Category filter */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center',
          marginBottom: 8,
        }}>
          {categories.map(c => (
            <button
              key={c.key}
              onClick={() => { setActiveCat(c.key); setActive(null); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, transition: 'all 0.18s ease',
                background: activeCat === c.key
                  ? 'linear-gradient(135deg,#4f46e5,#7c3aed)'
                  : 'rgba(255,255,255,0.85)',
                color: activeCat === c.key ? '#fff' : '#4f46e5',
                boxShadow: activeCat === c.key
                  ? '0 4px 16px rgba(79,70,229,0.28)'
                  : '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              {c.key !== 'all' && (
                <span style={{color: activeCat === c.key ? '#fff' : '#7c3aed'}}>
                  {CAT_ICONS[c.key]}
                </span>
              )}
              {c.label}
              <span style={{
                marginLeft: 2, fontSize: 11, fontWeight: 700,
                background: activeCat === c.key ? 'rgba(255,255,255,0.25)' : 'rgba(99,102,241,0.12)',
                borderRadius: 6, padding: '1px 6px', lineHeight: '16px',
                color: activeCat === c.key ? '#fff' : '#6366f1',
              }}>
                {c.key === 'all' ? faqData.length : faqData.filter(f => f.cat === c.key).length}
              </span>
            </button>
          ))}
        </div>

        {/* FAQ accordion */}
        <div className="lp-card">
          <div className="lp-faq-list">
            {filtered.map((item, i) => {
              const globalIdx = `${activeCat}-${i}`;
              const isOpen = active === globalIdx;
              const lines = item.answer.split('\n');
              return (
                <div key={globalIdx} className={`lp-faq-item${isOpen ? ' lp-faq-open' : ''}`}>
                  <button
                    className="lp-faq-btn"
                    onClick={() => setActive(isOpen ? null : globalIdx)}
                  >
                    <span className="lp-faq-q">{item.question}</span>
                    <span className={`lp-faq-chevron${isOpen ? ' lp-faq-open' : ''}`}>
                      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" style={{display:'block',flexShrink:0}}>
                        <path d="M4 6l4 4 4-4" stroke="#7c3aed" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  </button>
                  {isOpen && (
                    <div className="lp-faq-answer">
                      {lines.length > 1 ? (
                        <>
                          <p style={{marginBottom: 8, color: '#374151', lineHeight: 1.72}}>{lines[0]}</p>
                          <ul style={bulletStyle}>
                            {lines.slice(1).map((line, li) => (
                              <li key={li} style={bulletItemStyle}>
                                <span style={dotStyle}/>
                                <span>{line}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <p style={{color: '#374151', lineHeight: 1.72, margin: 0}}>{item.answer}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{textAlign:'center', padding: '40px 0', color: '#9ca3af', fontSize: 15}}>
                No questions in this category yet.
              </div>
            )}
          </div>
        </div>

        {/* Still need help card */}
        <div className="lp-card" style={{textAlign:'center', padding: '32px 24px'}}>
          <div style={{
            width: 52, height: 52, borderRadius: 15, margin: '0 auto 16px',
            background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" fill="white" opacity=".9"/>
            </svg>
          </div>
          <h3 style={{fontSize: 20, fontWeight: 700, color: '#1e1b4b', marginBottom: 8}}>
            Still have a question?
          </h3>
          <p style={{fontSize: 14.5, color: '#6b7280', lineHeight: 1.7, maxWidth: 420, margin: '0 auto 20px'}}>
            Our support team responds to all queries within 24 hours. For urgent safety issues,
            use the in-app report button for priority triage.
          </p>
          <div style={{display:'flex', gap: 12, justifyContent:'center', flexWrap:'wrap'}}>
            <a
              href="mailto:support@tingletap.com"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 11, textDecoration: 'none',
                background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                color: '#fff', fontSize: 14, fontWeight: 600,
                boxShadow: '0 4px 16px rgba(79,70,229,0.3)',
              }}
            >
              <svg viewBox="0 0 18 18" width="15" height="15" fill="none" style={{display:'block'}}>
                <rect x="2" y="4" width="14" height="10" rx="2" stroke="white" strokeWidth="1.9"/>
                <path d="M2.5 6l6.5 4.5L15.5 6" stroke="white" strokeWidth="1.9" strokeLinecap="round"/>
              </svg>
              Email Support
            </a>
            <button
              onClick={() => navigate('/contact')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 11, border: '1.5px solid rgba(79,70,229,0.3)',
                background: 'rgba(255,255,255,0.9)', color: '#4f46e5', fontSize: 14, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Contact Page
            </button>
          </div>
        </div>

        <div className="lp-cta-row">
          <button className="lp-btn-primary" onClick={() => navigate('/signup')}>
            <ArrowRightIcon /><span>Join TingleTap Free</span>
          </button>
          <button className="lp-btn-secondary" onClick={() => navigate('/contact')}>
            <SupportIcon /><span>Contact Support</span>
          </button>
        </div>
      </main>

      <footer className="lp-footer">
        <nav className="lp-footer-nav">
          <button className="lp-footer-link" onClick={() => navigate('/about')}><span>About</span></button>
          <button className="lp-footer-link" onClick={() => navigate('/privacy')}><span>Privacy</span></button>
          <button className="lp-footer-link" onClick={() => navigate('/terms')}><span>Terms</span></button>
          <button className="lp-footer-link" onClick={() => navigate('/contact')}><span>Contact</span></button>
          <button className="lp-footer-link" onClick={() => navigate('/faq')}><span>FAQ</span></button>
          <button className="lp-footer-link" onClick={() => navigate('/disclaimer')}><span>Disclaimer</span></button>
        </nav>
      </footer>
      <PremiumCopyright />
    </div>
  );
};

export default FAQPage;
