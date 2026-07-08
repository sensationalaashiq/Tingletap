import React from 'react';
import { useNavigate } from 'react-router-dom';
import PremiumCopyright from '../components/PremiumCopyright';
import './LandingPage.css';
import SEO from '../seo/SEO';
import { AboutPageSchema, BreadcrumbSchema } from '../seo/StructuredData';
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
const ArrowRightIcon = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" style={{display:'block',flexShrink:0}}>
    <path d="M4 9h10M10.5 5.5L14 9l-3.5 3.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const MailIcon = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" style={{display:'block',flexShrink:0}}>
    <rect x="2" y="4" width="14" height="10" rx="2" stroke="#4f46e5" strokeWidth="1.9"/>
    <path d="M2.5 6l6.5 4.5L15.5 6" stroke="#4f46e5" strokeWidth="1.9" strokeLinecap="round"/>
  </svg>
);
const AboutHeroIcon = () => (
  <svg viewBox="0 0 30 30" width="30" height="30" fill="none" style={{display:'block'}}>
    <circle cx="15" cy="15" r="11.5" stroke="white" strokeWidth="2.2"/>
    <path d="M3.5 15h23M15 3.5c3.5 0 6.5 5 6.5 11.5S18.5 26.5 15 26.5 8.5 20.9 8.5 15 11.5 3.5 15 3.5z" stroke="white" strokeWidth="1.7" opacity=".78"/>
    <path d="M5.5 8.5h19M5.5 21.5h19" stroke="white" strokeWidth="1.1" strokeLinecap="round" opacity=".45"/>
  </svg>
);

const Mk = (stops, body) => () => (
  <svg viewBox="0 0 26 26" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id={`ab-${stops[0]}`} x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor={stops[1]}/><stop offset="100%" stopColor={stops[2]}/>
    </linearGradient></defs>
    {body(stops[0])}
  </svg>
);

const icons = {
  mission: Mk(['ms1','#c4b5fd','#7c3aed'], id => <>
    <path d="M13 2L3 7v5.5C3 19 7.3 24.2 13 25.5c5.7-1.3 10-6.5 10-13V7L13 2z" fill={`url(#ab-${id})`} opacity=".9"/>
    <path d="M13 2L3 7v5.5C3 19 7.3 24.2 13 25.5c5.7-1.3 10-6.5 10-13V7L13 2z" fill="white" opacity=".1"/>
    <path d="M9 13l2.5 2.5L17.5 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </>),
  vision: Mk(['vs1','#60a5fa','#6366f1'], id => <>
    <circle cx="13" cy="12" r="9" fill={`url(#ab-${id})`} opacity=".88"/>
    <circle cx="13" cy="12" r="9" fill="white" opacity=".1"/>
    <circle cx="13" cy="12" r="3.5" fill="white" opacity=".9"/>
    <path d="M3 23l6-7M23 23l-6-7" stroke={`url(#ab-${id})`} strokeWidth="2" strokeLinecap="round"/>
  </>),
  values: Mk(['vl1','#34d399','#059669'], id => <>
    <path d="M13 2L3 6.5v5C3 18 7 23.2 13 24.5c6-1.3 10-6.5 10-13v-5L13 2z" fill={`url(#ab-${id})`} opacity=".9"/>
    <path d="M8 12l4 4L18 9" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </>),
  story: Mk(['st1','#f59e0b','#d97706'], id => <>
    <circle cx="13" cy="13" r="11" fill={`url(#ab-${id})`} opacity=".88"/>
    <circle cx="13" cy="13" r="11" fill="white" opacity=".1"/>
    <path d="M8 9h10M8 13h7M8 17h9" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </>),
  community: Mk(['cm1','#f9a8d4','#ec4899'], id => <>
    <circle cx="9" cy="10" r="4" fill={`url(#ab-${id})`} opacity=".9"/>
    <circle cx="18" cy="10" r="4" fill={`url(#ab-${id})`} opacity=".6"/>
    <path d="M3 22c0-4 2.7-7 6-7s6 3 6 7M13 22c0-4 2.7-7 6-7s5 3 5 7" stroke={`url(#ab-${id})`} strokeWidth="2" strokeLinecap="round"/>
  </>),
  safety: Mk(['sf1','#34d399','#059669'], id => <>
    <path d="M13 2L3 7v6C3 19.4 7.3 24.6 13 26c5.7-1.4 10-6.6 10-13V7L13 2z" fill={`url(#ab-${id})`} opacity=".9"/>
    <path d="M13 2L3 7v6C3 19.4 7.3 24.6 13 26c5.7-1.4 10-6.6 10-13V7L13 2z" fill="white" opacity=".12"/>
    <rect x="8" y="12" width="10" height="7" rx="2" fill="white" opacity=".9"/>
    <path d="M10 12V10a3 3 0 1 1 6 0v2" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
  </>),
  features: Mk(['ft1','#818cf8','#6366f1'], id => <>
    <rect x="2" y="2" width="22" height="22" rx="5" fill={`url(#ab-${id})`} opacity=".85"/>
    <rect x="2" y="2" width="22" height="22" rx="5" fill="white" opacity=".1"/>
    <path d="M7 13h12M7 9h8M7 17h10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </>),
  india: Mk(['in1','#f97316','#dc2626'], id => <>
    <circle cx="13" cy="13" r="11" fill={`url(#ab-${id})`} opacity=".88"/>
    <circle cx="13" cy="13" r="11" fill="white" opacity=".1"/>
    <path d="M13 5c4.4 0 8 3.6 8 8s-3.6 8-8 8-8-3.6-8-8 3.6-8 8-8z" stroke="white" strokeWidth="1.5" opacity=".3"/>
    <circle cx="13" cy="13" r="3" fill="white" opacity=".9"/>
    <path d="M13 7v2M13 17v2M7 13H5M21 13h-2" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity=".6"/>
  </>),
  tech: Mk(['tc1','#38bdf8','#0ea5e9'], id => <>
    <rect x="2" y="5" width="22" height="16" rx="4" fill={`url(#ab-${id})`} opacity=".9"/>
    <rect x="2" y="5" width="22" height="16" rx="4" fill="white" opacity=".1"/>
    <path d="M8 13l-3 3 3 3M18 13l3 3-3 3M11 19l4-12" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
  </>),
  team: Mk(['tm1','#c084fc','#a855f7'], id => <>
    <circle cx="13" cy="9" r="4.5" fill={`url(#ab-${id})`} opacity=".9"/>
    <path d="M3 24c0-5.5 4.5-10 10-10s10 4.5 10 10" stroke={`url(#ab-${id})`} strokeWidth="2.2" strokeLinecap="round"/>
    <path d="M3 24c0-5.5 4.5-10 10-10s10 4.5 10 10" fill={`url(#ab-${id})`} opacity=".2"/>
  </>),
  trust: Mk(['tr1','#fbbf24','#f59e0b'], id => <>
    <path d="M13 2l3 8.5L25 11l-6.5 6 2 9L13 22l-7.5 4 2-9L1 11l9-.5L13 2z" fill={`url(#ab-${id})`} opacity=".9"/>
    <path d="M13 2l3 8.5L25 11l-6.5 6 2 9L13 22l-7.5 4 2-9L1 11l9-.5L13 2z" fill="white" opacity=".15"/>
    <circle cx="13" cy="13" r="2.5" fill="white" opacity=".9"/>
  </>),
  contact: Mk(['co1','#38bdf8','#0ea5e9'], id => <>
    <rect x="2" y="5" width="22" height="16" rx="4" fill={`url(#ab-${id})`} opacity=".9"/>
    <rect x="2" y="5" width="22" height="16" rx="4" fill="white" opacity=".1"/>
    <path d="M2 9l11 7.5L24 9" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </>),
};

const SectionItem = ({ icon, title, text, items }) => {
  const IconComp = icons[icon];
  return (
    <div className="lp-section-item" style={{alignItems:'flex-start'}}>
      <div className="lp-section-icon" style={{marginTop: 3}}><IconComp /></div>
      <div className="lp-section-content">
        <div className="lp-section-title">{title}</div>
        <div className="lp-section-text">{text}</div>
        {items && (
          <ul style={{marginTop: 10, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7}}>
            {items.map((item, i) => (
              <li key={i} style={{display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13.5, color: '#4b5563', lineHeight: 1.7}}>
                <span style={{flexShrink: 0, marginTop: 6, width: 6, height: 6, borderRadius: '50%', background: 'linear-gradient(135deg,#818cf8,#6366f1)', display: 'block'}}/>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const statStyle = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
  padding: '20px 28px', flex: 1, minWidth: 120,
};
const statNumStyle = {
  fontSize: 28, fontWeight: 800, lineHeight: 1,
  background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
};
const statLabelStyle = { fontSize: 12.5, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' };

const AboutPage = () => {
  const navigate = useNavigate();

  return (
    <div className="lp-root lp-lpage">
      <SEO
        title={PAGES.about.title}
        description={PAGES.about.description}
        keywords={PAGES.about.keywords}
        canonical={PAGES.about.canonical}
        robots={PAGES.about.robots}
        ogType={PAGES.about.ogType}
      />
      <AboutPageSchema />
      <BreadcrumbSchema crumbs={[
        { name: 'Home', url: SITE.url },
        { name: 'About', url: PAGES.about.canonical },
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
              <span className="lp-brand-sub">About Us</span>
            </div>
          </div>
          <nav className="lp-nav">
            <button className="lp-nav-ghost" onClick={() => navigate('/')}>
              <BackIcon /><span>Back Home</span>
            </button>
            <button className="lp-nav-solid" onClick={() => navigate('/login')}>
              <LoginIcon /><span>Login</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="lp-main">

        {/* Hero */}
        <div className="lp-hero">
          <div className="lp-hero-icon"><AboutHeroIcon /></div>
          <h1 className="lp-hero-title">About TingleTap</h1>
          <p className="lp-hero-sub">
            India's premium real-time chat platform — built to connect people through genuine conversations,
            live voice, music, and shared experiences. Not just a chat app. A community.
          </p>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:8, marginTop:12,
            background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)',
            borderRadius:10, padding:'8px 16px', fontSize:12.5, color:'#4f46e5', fontWeight:600,
          }}>
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke="#4f46e5" strokeWidth="1.3"/>
              <path d="M5 8.5l2 2L11 6" stroke="#4f46e5" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Made in India · Designed for Indians · Trusted by Real Users
          </div>
        </div>

        {/* Stats bar */}
        <div className="lp-card" style={{padding: '0 8px', marginBottom: 0}}>
          <div style={{display:'flex', flexWrap:'wrap', justifyContent:'space-around', gap: 0}}>
            {[
              { num: '15+', label: 'Chat Rooms' },
              { num: '24/7', label: 'Live Broadcasts' },
              { num: '100%', label: 'Free to Use' },
              { num: '0', label: 'Ads, Ever' },
              { num: '2024', label: 'Est. India' },
            ].map((s, i, arr) => (
              <div key={i} style={{
                ...statStyle,
                borderRight: i < arr.length - 1 ? '1px solid rgba(99,102,241,0.1)' : 'none',
              }}>
                <span style={statNumStyle}>{s.num}</span>
                <span style={statLabelStyle}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Mission / Vision / Values */}
        <div className="lp-cards-grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))'}}>
          <div className="lp-grid-card">
            <div className="lp-grid-card-icon">
              <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
                <defs><linearGradient id="mv1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#c4b5fd"/><stop offset="100%" stopColor="#7c3aed"/></linearGradient></defs>
                <path d="M14 2L4 7v5.5C4 19 8.3 24.2 14 25.5c5.7-1.3 10-6.5 10-13V7L14 2z" fill="url(#mv1)" opacity=".9"/>
                <path d="M9.5 14l3 3L18.5 11" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="lp-grid-card-title">Our Mission</div>
            <div className="lp-grid-card-text">
              To create India's most inclusive, feature-rich, and safest real-time chat community —
              where every person, regardless of language or background, can connect, express, and belong.
              We believe meaningful human connection should be free, private, and joyful.
            </div>
          </div>
          <div className="lp-grid-card">
            <div className="lp-grid-card-icon">
              <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
                <defs><linearGradient id="mv2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#60a5fa"/><stop offset="100%" stopColor="#6366f1"/></linearGradient></defs>
                <circle cx="14" cy="12" r="9" fill="url(#mv2)" opacity=".88"/>
                <circle cx="14" cy="12" r="9" fill="white" opacity=".1"/>
                <circle cx="14" cy="12" r="3.5" fill="white" opacity=".9"/>
                <path d="M4 22l5.5-6.5M24 22l-5.5-6.5" stroke="url(#mv2)" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="lp-grid-card-title">Our Vision</div>
            <div className="lp-grid-card-text">
              To become India's most trusted and beloved chat platform — a space where real conversations
              happen between real people. We envision a future where TingleTap powers millions of genuine
              connections across every corner of India and beyond.
            </div>
          </div>
          <div className="lp-grid-card">
            <div className="lp-grid-card-icon">
              <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
                <defs><linearGradient id="mv3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#34d399"/><stop offset="100%" stopColor="#059669"/></linearGradient></defs>
                <path d="M14 2l3 8.5L26 11l-6.5 6 2 9L14 22l-7.5 4 2-9L2 11l9-.5L14 2z" fill="url(#mv3)" opacity=".9"/>
                <circle cx="14" cy="14" r="2.5" fill="white" opacity=".9"/>
              </svg>
            </div>
            <div className="lp-grid-card-title">Our Values</div>
            <div className="lp-grid-card-text">
              Safety above all. Privacy without compromise. Innovation that serves people, not algorithms.
              Community that is radically inclusive. Transparency in everything we build. These are not
              marketing words — they are the principles every engineering decision is measured against.
            </div>
          </div>
        </div>

        {/* Our Story + Full Details */}
        <div className="lp-card">
          <div className="lp-section">

            <SectionItem
              icon="story"
              title="Our Story — How TingleTap Began"
              text="TingleTap was born out of a simple observation: Indian users deserved a premium, homegrown chat experience that truly understood their culture, languages, and social dynamics — not a watered-down adaptation of a foreign product."
              items={[
                'Founded in India with a clear goal: build a chat platform that feels native to the Indian experience — from multi-language support to culturally aware moderation',
                'We started with the core belief that real human connection should never be behind a paywall. Every primary feature on TingleTap is completely free',
                'Early builds focused on getting real-time performance right — fast message delivery, stable voice connections, and smooth media sharing even on slower Indian mobile networks',
                'The TingleBot AutoMod system was designed from day one as a safety-first feature, understanding that Indian community norms required nuanced, context-aware moderation — not blunt keyword banning',
                'Our team is composed of passionate builders who use the product themselves daily — every feature added solves a real problem our own community has raised',
                'TingleTap is proudly independent — no VC pressure to monetise user data, no advertising business model, no compromises on user privacy',
              ]}
            />

            <SectionItem
              icon="features"
              title="A Platform Built for Real Connections"
              text="TingleTap packs an industry-leading feature set — all free, all in one place. Here is what sets us apart from every other chat platform:"
              items={[
                'Live Chat Rooms — multiple themed public rooms with real-time text, voice messages, GIFs, stickers, emoji reactions, and media sharing',
                'RJ Radio Shows — verified RJs host live voice broadcasts synced with YouTube music. Listeners hear the RJ\'s voice and music together in perfect real-time sync, even switching tabs',
                'Broadcast Stage — a live mini-podcast feature: audience members can request to speak live alongside the RJ. Like a live call-in show, all in the browser',
                'TingleBot AutoMod — a 24/7 AI-assisted, rule-based moderation engine that understands context, casual slang, and Hindi/English mixed speech. No blunt banning, intelligent escalation only',
                'Auto Translation — every message in every room can be instantly translated into your preferred language, removing language barriers across India\'s linguistic diversity',
                'Virtual Gifts & Coin Economy — send roses, crowns, diamonds, and more to your favourite RJs. A transparent coin wallet, gift log, and RJ earnings dashboard built-in',
                'Private Encrypted Messaging — end-to-end encrypted 1-on-1 conversations with read receipts and live typing indicators',
                'Voice Messages with Waveform Player — record up to 60 seconds, send instantly. Playback speed control, waveform visualisation, and auto-play support',
                'Radio Channels — multiple curated live music and talk radio stations streaming in real-time, playable in the background while you chat',
                'Rich Profile Customisation — username gradients, message fonts, themes, profile pictures, custom status messages, and gender verification badges',
              ]}
            />

            <SectionItem
              icon="india"
              title="Built with Love for India"
              text="Every decision we make — every feature we ship, every policy we write — is made with the Indian user at the centre. TingleTap is not localised for India. It was designed for India from the ground up."
              items={[
                'Multi-language awareness: TingleBot understands Hindi, Hinglish, and regional slang without falsely flagging casual conversation',
                'Cultural sensitivity in moderation: the platform applies nuanced, context-aware rules that understand the difference between casual banter and genuine harassment',
                'Regional themed rooms give users a sense of place and belonging within the broader national community',
                'Guest access with no sign-up required means TingleTap is accessible to users who are not comfortable sharing personal details online — a real concern across India',
                'Designed for mid-range devices and varying network speeds — smooth performance on 4G connections common across Tier 2 and Tier 3 cities',
                'Support communications available in English and Hindi. We are continually expanding regional language support across the platform',
                'Compliance with India\'s Information Technology Act, 2000 and IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 is built into our architecture — not an afterthought',
              ]}
            />

            <SectionItem
              icon="safety"
              title="Safety & Trust — Our Non-Negotiables"
              text="A safe community is not a feature — it is a foundation. TingleTap has invested deeply in building multi-layered protection that keeps every user safe without being intrusive."
              items={[
                'TingleBot AutoMod runs 24/7 in every room, automatically detecting spam, coordinated abuse, homoglyphs, phone number sharing, threats, and hate speech in real-time',
                'Intelligent escalation: AutoMod follows a Warning → Mute → Kick ladder. Automatic banning is never done — a human moderator always reviews before any permanent action',
                'Owner-only exemption: platform owners are never subject to automated moderation actions, eliminating any risk of accidental censorship of platform administrators',
                'Dual-layer ban system: IP bans and device fingerprint bans together, so evading a ban by changing IP address alone is not possible',
                'VPN detection prevents proxy abuse while still respecting the privacy of legitimate VPN users through an intelligent multi-signal detection approach',
                'End-to-end encryption on all private messages — not readable by our team, our infrastructure providers, or any third party',
                'Grievance Officer appointed as required by IT Rules 2021 — all reports acknowledged within 24 hours and resolved within 15 days',
                'Zero tolerance for CSAM, doxxing, coordinated harassment, and hate speech. These categories trigger immediate escalation to human review regardless of AutoMod state',
              ]}
            />

            <SectionItem
              icon="tech"
              title="Built for Speed, Scale & Security"
              text="Under the hood, TingleTap is engineered to the same standard as world-class consumer platforms — delivering instant, reliable, encrypted experiences regardless of your device or connection:"
              items={[
                'Sub-second message delivery — every chat message, reaction, and status update reaches all room members in real-time, with no perceptible delay',
                'Crystal-clear live voice — RJ broadcasts and stage calls use direct peer-to-peer encrypted audio pipelines, eliminating server-side audio degradation and achieving near-zero latency',
                'Always-on AI moderation — TingleBot runs its full intelligence engine locally in your browser, making moderation decisions in real-time without a single server round-trip',
                'Instant-load architecture — the platform loads the chat experience first and defers everything else, keeping the core product fast even on mid-range phones and 4G networks',
                'Military-grade encrypted private messages — private conversations are end-to-end encrypted and cannot be read by our team, our servers, or any third party',
                'Smart identity protection — sophisticated multi-signal security prevents ban evasion and fake accounts without ever storing biometric data or compromising user privacy',
                'Reliable connections everywhere — dual-path audio infrastructure ensures voice calls and broadcasts stay stable even when network conditions fluctuate',
                'AI-assisted features — conversational intelligence powers TingleBot\'s assistant mode, smart auto-moderation classification, and contextual content understanding',
                'Always up, always fast — our infrastructure is engineered for continuous availability with no scheduled downtime and automatic failover for all critical services',
              ]}
            />

            <SectionItem
              icon="community"
              title="Our Community — The Heart of TingleTap"
              text="TingleTap is nothing without the people who choose to spend their time here. We take our responsibility to our community extraordinarily seriously."
              items={[
                'Every room has dedicated moderators — real humans who know the community and can apply judgment that automated systems cannot',
                'Users can report any message instantly with one tap. Reports go to our moderation queue with priority routing for severe cases',
                'The RJ ecosystem gives talented voice creators a platform to build audiences, earn through virtual gifts, and host professional-quality radio shows without expensive equipment',
                'Achievement and trust systems reward positive, long-term community participation — not just activity volume',
                'Guest access means anyone can join and experience the community before committing to an account — lowering the barrier to belonging',
                'We read every piece of feedback submitted through the platform. Feature requests from the community directly shape our roadmap',
                'No ads, no algorithm-driven feed, no engagement-maximisation dark patterns — TingleTap shows you what your community is actually saying, in chronological order',
              ]}
            />

            <SectionItem
              icon="trust"
              title="Why Trust TingleTap?"
              text="Trust is earned through consistent action, not marketing promises. Here is our commitment to you, in plain language:"
              items={[
                'We will never sell your personal data — to anyone, under any business model, ever. This is not a policy we will revise when we need revenue',
                'We will never put ads inside the chat experience. TingleTap is funded by the optional coin economy, not by monetising your attention',
                'We will always be transparent about incidents — if there is ever a data breach or security event, affected users will be notified promptly and honestly',
                'We will never remove core free features and move them behind a paywall. The features that exist for free today will remain free',
                'We will always operate in compliance with Indian law and respect users\' right to access, correct, and delete their data at any time',
                'We will maintain a functioning Grievance Officer and respond to all privacy and safety complaints within the legally mandated timelines',
                'We will continuously improve TingleTap — driven by community feedback, not investor pressure',
              ]}
            />

            <SectionItem
              icon="contact"
              title="Get in Touch"
              text="We want to hear from you — whether you have a feature idea, a safety concern, a partnership inquiry, or just want to say hello."
              items={[
                'General Support: support@tingletap.com — all queries responded to within 24–48 hours',
                'Privacy & Data Requests: support@tingletap.com with subject line "Privacy Request" — processed within 30 days as required by IT Rules 2021',
                'Safety & Abuse Reports: Use the in-app report button on any message for the fastest response. Critical safety issues are triaged within 1 hour',
                'Media & Press Inquiries: support@tingletap.com with subject line "Press"',
                'Partnership & Business: support@tingletap.com with subject line "Partnership"',
                'Grievance Officer (IT Rules 2021): support@tingletap.com with subject line "Grievance" — acknowledged within 24 hours, resolved within 15 days as mandated by law',
                'Instagram: @tingletap · Facebook: TingleTap · X: @tingletaps · YouTube: @tingletaps',
              ]}
            />

          </div>
        </div>

        <div className="lp-cta-row">
          <button className="lp-btn-primary" onClick={() => navigate('/rooms')}>
            <ArrowRightIcon /><span>Join Our Community</span>
          </button>
          <button className="lp-btn-secondary" onClick={() => navigate('/contact')}>
            <MailIcon /><span>Contact Us</span>
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

export default AboutPage;
