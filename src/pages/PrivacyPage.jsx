import React from 'react';
import { useNavigate } from 'react-router-dom';
import PremiumCopyright from '../components/PremiumCopyright';
import './LandingPage.css';
import SEO from '../seo/SEO';
import { WebPageSchema, BreadcrumbSchema } from '../seo/StructuredData';
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
const PrivacyHeroIcon = () => (
  <svg viewBox="0 0 30 30" width="30" height="30" fill="none" style={{display:'block'}}>
    <path d="M15 2.5L3.5 8v6.5C3.5 21 8 26.5 15 28c7-1.5 11.5-7 11.5-13.5V8L15 2.5z" stroke="white" strokeWidth="2.2" strokeLinejoin="round"/>
    <path d="M10 15l3.5 3.5L21 10.5" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
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

const MkIcon = (stops, body) => () => (
  <svg viewBox="0 0 26 26" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id={`pv-${stops[0]}`} x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor={stops[1]}/><stop offset="100%" stopColor={stops[2]}/>
    </linearGradient></defs>
    {body(stops[0])}
  </svg>
);

const icons = {
  collect: MkIcon(['ic1','#818cf8','#6366f1'], id => <>
    <circle cx="13" cy="9" r="5.5" fill={`url(#pv-${id})`} opacity=".9"/>
    <circle cx="13" cy="9" r="2.8" fill="white" opacity=".55"/>
    <path d="M3.5 23c0-5.2 4.3-9.5 9.5-9.5s9.5 4.3 9.5 9.5" stroke={`url(#pv-${id})`} strokeWidth="2.2" strokeLinecap="round"/>
  </>),
  anonymous: MkIcon(['ic2','#a78bfa','#7c3aed'], id => <>
    <circle cx="9" cy="10" r="4" fill={`url(#pv-${id})`} opacity=".9"/>
    <circle cx="17" cy="10" r="4" fill={`url(#pv-${id})`} opacity=".5"/>
    <path d="M3 22c0-4 2.7-7 6-7 1 0 2 .3 2.8.8M13 22c0-4 2.7-7 6-7s6 3 6 7" stroke={`url(#pv-${id})`} strokeWidth="2" strokeLinecap="round"/>
    <path d="M9 10h.01" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </>),
  encryption: MkIcon(['ic3','#34d399','#059669'], id => <>
    <path d="M13 2L3 7v6C3 19.4 7.3 24.6 13 26c5.7-1.4 10-6.6 10-13V7L13 2z" fill={`url(#pv-${id})`} opacity=".9"/>
    <path d="M13 2L3 7v6C3 19.4 7.3 24.6 13 26c5.7-1.4 10-6.6 10-13V7L13 2z" fill="white" opacity=".12"/>
    <rect x="8" y="11.5" width="10" height="7" rx="2" fill="white" opacity=".9"/>
    <path d="M10 11.5V9.5a3 3 0 1 1 6 0v2" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="13" cy="15" r="1.3" fill={`url(#pv-${id})`}/>
  </>),
  usage: MkIcon(['ic4','#a78bfa','#7c3aed'], id => <>
    <rect x="3" y="3" width="20" height="20" rx="4" fill={`url(#pv-${id})`} opacity=".85"/>
    <rect x="3" y="3" width="20" height="20" rx="4" fill="white" opacity=".1"/>
    <path d="M8 13h10M8 17h7M8 9h10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </>),
  sharing: MkIcon(['ic5','#f59e0b','#d97706'], id => <>
    <circle cx="13" cy="13" r="11" fill={`url(#pv-${id})`} opacity=".15"/>
    <circle cx="7" cy="13" r="3" fill={`url(#pv-${id})`} opacity=".9"/>
    <circle cx="19" cy="8" r="3" fill={`url(#pv-${id})`} opacity=".9"/>
    <circle cx="19" cy="18" r="3" fill={`url(#pv-${id})`} opacity=".9"/>
    <path d="M9.8 11.7l6.4-2.4M9.8 14.3l6.4 2.4" stroke={`url(#pv-${id})`} strokeWidth="2" strokeLinecap="round"/>
    <path d="M7 13h.01" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </>),
  retention: MkIcon(['ic6','#38bdf8','#0ea5e9'], id => <>
    <circle cx="13" cy="13" r="11" fill={`url(#pv-${id})`} opacity=".88"/>
    <circle cx="13" cy="13" r="11" fill="white" opacity=".1"/>
    <path d="M13 7v6.5l4 4" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
  </>),
  rights: MkIcon(['ic7','#ec4899','#db2777'], id => <>
    <path d="M13 2L3 6.5v5C3 18 7 23.2 13 24.5c6-1.3 10-6.5 10-13v-5L13 2z" fill={`url(#pv-${id})`} opacity=".88"/>
    <path d="M9 13h8M13 9v8" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
  </>),
  cookie: MkIcon(['ic8','#c084fc','#a855f7'], id => <>
    <circle cx="13" cy="13" r="11" fill={`url(#pv-${id})`} opacity=".88"/>
    <circle cx="13" cy="13" r="11" fill="white" opacity=".1"/>
    <circle cx="9.5" cy="11.5" r="1.6" fill="white" opacity=".9"/>
    <circle cx="15" cy="9.5" r="1.6" fill="white" opacity=".9"/>
    <circle cx="14" cy="16" r="1.6" fill="white" opacity=".9"/>
    <path d="M10 16.5l2-1.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity=".5"/>
  </>),
  children: MkIcon(['ic9','#fb923c','#f97316'], id => <>
    <circle cx="13" cy="10" r="5.5" fill={`url(#pv-${id})`} opacity=".9"/>
    <path d="M3.5 25c0-5.2 4.3-9.5 9.5-9.5s9.5 4.3 9.5 9.5" stroke={`url(#pv-${id})`} strokeWidth="2.2" strokeLinecap="round"/>
    <path d="M10 8l1.5 2.5L13 7l1.5 3L16 8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </>),
  contact: MkIcon(['ic10','#38bdf8','#0ea5e9'], id => <>
    <rect x="2" y="5" width="22" height="16" rx="4" fill={`url(#pv-${id})`} opacity=".9"/>
    <rect x="2" y="5" width="22" height="16" rx="4" fill="white" opacity=".1"/>
    <path d="M2 9l11 7.5L24 9" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </>),
};

const sections = [
  {
    icon: 'collect',
    title: 'Information We Collect',
    text: 'We collect only the minimum information required to operate TingleTap and provide you with the best experience. We are transparent about every category:',
    items: [
      'Account information: email address, display name, username, profile picture, age range, and gender (used for personalisation only, never sold)',
      'Chat data: messages you send in public rooms are visible to all participants in that room; private message content is end-to-end encrypted and inaccessible to us',
      'Voice & audio: live broadcast sessions stream in real time and are not stored permanently on our servers after a session ends',
      'Usage data: room join/leave activity and feature interactions — used only in anonymised, aggregated form to improve service reliability',
      'Device & security data: device fingerprint (browser characteristics, screen specs) and IP address — collected exclusively for account security, ban enforcement, and preventing platform fraud; never shared externally',
      'Transaction data: virtual coin purchases, gift logs, and earnings — stored solely for wallet integrity and dispute resolution',
      'Guest/anonymous data: when joining as a guest, only a temporary session identifier is generated; no personal information is required or stored',
    ]
  },
  {
    icon: 'anonymous',
    title: 'Anonymous Chat Feature',
    text: 'TingleTap is built with anonymity as a first-class feature, giving you the freedom to connect without revealing your real identity:',
    items: [
      'Guest Access: Join TingleTap without creating an account — no name, email address, or phone number required',
      'Anonymous Identity: Guest users receive a system-assigned display name. Your real identity remains completely hidden from other users and cannot be discovered through the platform',
      'No Persistent Tracking: Anonymous guest sessions are not linked to any personal identifier or any existing account on our system',
      'Temporary Sessions: All guest session data — including your assigned identity and chat history — is automatically cleared when your session expires or you close the application',
      'Public Visibility Notice: While your real identity is anonymous, messages you send in public rooms are visible to all participants in that room — TingleTap is a public community platform',
      'No Obligation to Upgrade: You may use TingleTap anonymously indefinitely. Creating a full account is optional and only needed to access premium features like coin gifting or saved preferences',
    ]
  },
  {
    icon: 'encryption',
    title: 'End-to-End Encryption & Data Security',
    text: 'Your privacy is protected by multiple layers of security. We take security seriously at every level of our platform:',
    items: [
      'End-to-End Encrypted Private Messages: Private conversations are secured with end-to-end encryption. Only you and your recipient can read private message content — not our servers, not our team, not anyone else',
      'Encrypted Transit (TLS 1.3): All data transmitted between your device and our infrastructure uses the latest transport encryption — the same standard used by major financial institutions and government services',
      'Encrypted at Rest: Stored data including your profile, settings, and wallet balance is encrypted within our secure database infrastructure using industry-standard encryption algorithms',
      'Server-Side Security Rules: All access to your data is governed by strict, auditable server-side security rules. Unauthorised access is blocked at the infrastructure level — not just application level',
      'Peer-to-Peer Voice Privacy: Live voice and audio connections use WebRTC peer-to-peer technology with built-in DTLS-SRTP encryption, meaning voice data travels directly between participants without passing through our central servers',
      'Zero Message Scanning: We do not scan, analyse, classify, or mine the content of your private messages for any purpose including advertising, training AI models, or profiling',
      'No Passwords Stored in Plain Text: User passwords are never stored. We use industry-standard cryptographic hashing for all authentication credentials',
    ]
  },
  {
    icon: 'usage',
    title: 'How We Use Your Data',
    text: 'Your data is used exclusively to operate, improve, and protect the TingleTap platform. We have strict internal controls on data use:',
    items: [
      'Core service delivery: enabling live chat, voice rooms, private messaging, anonymous guest access, coin gifting, broadcast features, and all platform functionality',
      'Account security: detecting suspicious activity, enforcing community bans, and preventing fraudulent or abusive behaviour',
      'Transaction processing: managing your coin wallet, processing virtual gift transactions, calculating RJ earnings, and ensuring financial accuracy',
      'Platform improvement: understanding which features are used most — using exclusively anonymised and aggregated data — to prioritise engineering improvements',
      'Community standards enforcement: reviewing reports submitted by users and taking appropriate action against verified policy violations',
      'Essential service communications: critical security alerts, account updates, and material policy changes. We do not send marketing emails without your explicit consent',
      'We never use your personal data to build advertising profiles, and we never sell or commercially share your data with any third party under any circumstances',
    ]
  },
  {
    icon: 'sharing',
    title: 'Data Sharing & Third Parties',
    text: 'TingleTap has a strict no-sale policy for personal data. Here is exactly who can and cannot access your information:',
    items: [
      'Absolute No-Sale Policy: TingleTap does not sell, rent, auction, license, or commercially exchange any personal information belonging to any user — ever, under any business model',
      'Infrastructure Providers: We use industry-standard cloud infrastructure (covered by data processing agreements) solely to host and operate the platform. These providers are contractually prohibited from using your data for their own purposes',
      'Legal Disclosure — Indian Law: We may disclose information when legally required by Indian law enforcement or judicial authorities under the Information Technology Act, 2000 and the IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021. We will notify users of such requests to the extent permitted by law',
      'Imminent Safety: We may share minimum necessary information to prevent imminent harm, serious injury, or death, as permitted under applicable law',
      'No Advertising Networks: No advertising networks, data brokers, analytics platforms, or social media companies receive your personal data from us',
      'Business Transfers: In the unlikely event of a corporate acquisition or merger, all user data would remain protected under equivalent or stronger privacy terms, with minimum 30 days advance notice to all users',
    ]
  },
  {
    icon: 'retention',
    title: 'Data Retention & Your Right to Deletion',
    text: 'We retain your data only for as long as necessary to provide the service and meet legal obligations. You have full control:',
    items: [
      'Active Accounts: Profile data, preferences, wallet balance, and settings are retained while your account remains active',
      'Account Deletion: Upon account deletion, all personal data is permanently and irreversibly erased within 30 days. Anonymised, non-identifiable aggregate analytics data may be retained for platform statistics',
      'Guest Sessions: Anonymous guest session data — including temporary identities and chat history — is automatically purged within 24 hours of session termination',
      'Public Chat Messages: Public room messages may remain visible to room participants until the room closes or you delete them. Private messages are deleted from our systems upon account deletion',
      'Financial Records: Coin transaction and earnings records are retained for up to 3 years as required by applicable Indian financial and tax regulations',
      'Security Logs: IP address and device logs used for ban enforcement and fraud prevention are retained for a maximum of 12 months',
      'Data Deletion Requests: You may request immediate deletion of your account and all associated data at any time. Submit requests to support@tingletap.com — all requests are processed within 30 days as required by IT Rules 2021',
    ]
  },
  {
    icon: 'rights',
    title: 'Your Rights Under Indian & International Law',
    text: 'As a TingleTap user, you are protected by the Information Technology Act, 2000, IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, and where applicable, international privacy frameworks:',
    items: [
      'Right to Access: Request a complete copy of all personal data we hold about you at any time — we will provide it within 30 days',
      'Right to Correction: Update or correct any inaccurate personal information directly through your account settings at any time',
      'Right to Deletion: Request permanent deletion of your account and all associated personal data — processed within 30 days',
      'Right to Grievance Redressal: As mandated by IT Rules 2021, we have appointed a Grievance Officer. All grievances are acknowledged within 24 hours and resolved within 15 days',
      'Right to Withdraw Consent: Withdraw consent for any data processing by deleting your account or updating your preferences — no penalty for withdrawal',
      'GDPR Rights (EEA Users): Users in the European Economic Area additionally hold rights under GDPR including data portability, right to restriction of processing, and right to object',
      'Non-Discrimination: Exercising any privacy right will not result in any downgrade or denial of core TingleTap services',
    ]
  },
  {
    icon: 'cookie',
    title: 'Cookies & Local Storage',
    text: 'We use only essential browser storage — no advertising or cross-site tracking cookies of any kind:',
    items: [
      'Session Authentication: Keeps you securely logged in during your browsing session and maintains your anonymous guest identity',
      'Preference Storage: Saves your selected theme, font, language, notification settings, and display preferences locally on your device',
      'Performance Cache: Caches non-sensitive display data such as username styles for instant loading and smoother experience',
      'No Third-Party Advertising Cookies: We do not deploy advertising cookies, social media pixel trackers, cross-site tracking cookies, or any cookies from third-party data networks',
      'Full User Control: You may clear all local storage data at any time via your browser or device settings. This will end your session and remove local preferences but will not delete your account or any data stored on our servers',
    ]
  },
  {
    icon: 'children',
    title: "Children's Privacy",
    text: 'TingleTap is a platform designed exclusively for adults. We take the protection of minors very seriously:',
    items: [
      'Minimum Age: You must be 18 years of age or older to use TingleTap. By accessing this platform, you confirm you meet this requirement',
      'No Collection from Minors: We do not knowingly collect, process, or store personal information from any person under the age of 18',
      'Immediate Termination: If we discover or receive credible notification that a user is under 18 years of age, the account will be immediately suspended and permanently deleted along with all associated data',
      'Parental Reporting: Parents or legal guardians who believe their minor child has accessed or created an account should contact us immediately at support@tingletap.com. We treat all such reports as urgent and respond within 24 hours',
    ]
  },
  {
    icon: 'contact',
    title: 'Grievance Officer, Policy Updates & Contact',
    text: 'As required by the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 (IT Rules 2021), TingleTap has designated a Grievance Officer:',
    items: [
      'Grievance Officer: Appointed by Adrashtra Inc. — reachable at support@tingletap.com with subject line "Privacy Grievance"',
      'Acknowledgement: All grievances acknowledged in writing within 24 hours of receipt',
      'Resolution Timeline: All privacy grievances resolved within 15 days of receipt, as mandated by IT Rules 2021',
      'General Privacy Queries: support@tingletap.com — for questions about data collection, usage, deletion, or any aspect of this policy',
      'Policy Updates: Material changes to this Privacy Policy will be communicated via in-app notification with a minimum of 30 days advance notice before taking effect. Continued use after the effective date constitutes acceptance',
      'Governing Law: This Privacy Policy is governed by the laws of India. Disputes are subject to the exclusive jurisdiction of courts in India',
      'Last Updated: July 2025 | Effective Date: July 1, 2025 | Version: 2.0',
    ]
  },
];

const SectionItem = ({ s }) => {
  const IconComp = icons[s.icon];
  return (
    <div className="lp-section-item" style={{alignItems:'flex-start'}}>
      <div className="lp-section-icon" style={{marginTop: 3}}><IconComp /></div>
      <div className="lp-section-content">
        <div className="lp-section-title">{s.title}</div>
        <div className="lp-section-text">{s.text}</div>
        {s.items && (
          <ul style={{
            marginTop: 10, paddingLeft: 0, listStyle: 'none',
            display: 'flex', flexDirection: 'column', gap: 7,
          }}>
            {s.items.map((item, i) => (
              <li key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 9,
                fontSize: 13.5, color: '#4b5563', lineHeight: 1.7,
              }}>
                <span style={{
                  flexShrink: 0, marginTop: 6, width: 6, height: 6,
                  borderRadius: '50%', background: 'linear-gradient(135deg,#818cf8,#6366f1)',
                  display: 'block',
                }}/>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const PrivacyPage = () => {
  const navigate = useNavigate();
  return (
    <div className="lp-root lp-lpage">
      <SEO
        title={PAGES.privacy.title}
        description={PAGES.privacy.description}
        keywords={PAGES.privacy.keywords}
        canonical={PAGES.privacy.canonical}
        robots={PAGES.privacy.robots}
        ogType={PAGES.privacy.ogType}
      />
      <WebPageSchema
        name="Privacy Policy — TingleTap"
        description={PAGES.privacy.description}
        url={PAGES.privacy.canonical}
      />
      <BreadcrumbSchema crumbs={[
        { name: 'Home', url: SITE.url },
        { name: 'Privacy Policy', url: PAGES.privacy.canonical },
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
              <span className="lp-brand-sub">Privacy</span>
            </div>
          </div>
          <nav className="lp-nav">
            <button className="lp-nav-ghost" onClick={() => navigate('/')}><BackIcon /><span>Back Home</span></button>
            <button className="lp-nav-solid" onClick={() => navigate('/login')}><LoginIcon /><span>Login</span></button>
          </nav>
        </div>
      </header>

      <main className="lp-main">
        <div className="lp-hero">
          <div className="lp-hero-icon"><PrivacyHeroIcon /></div>
          <h1 className="lp-hero-title">Privacy Policy</h1>
          <p className="lp-hero-sub">
            Your privacy is our highest commitment. We are fully transparent about every aspect of how we handle your data —
            compliant with the Information Technology Act, 2000 and IT Rules, 2021.
          </p>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:8, marginTop:12,
            background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)',
            borderRadius:10, padding:'8px 16px', fontSize:12.5, color:'#4f46e5', fontWeight:600,
          }}>
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
              <path d="M8 1L1.5 4v4C1.5 11.5 4.3 14.6 8 15c3.7-.4 6.5-3.5 6.5-7V4L8 1z" fill="#4f46e5" opacity=".15" stroke="#4f46e5" strokeWidth="1.3"/>
              <path d="M5.5 8l2 2L11 6.5" stroke="#4f46e5" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Compliant with India IT Act 2000 · IT Rules 2021 · GDPR-Aware
          </div>
        </div>

        <div className="lp-card">
          <div className="lp-section">
            {sections.map((s, i) => <SectionItem key={i} s={s} />)}
          </div>
        </div>

        <div className="lp-cta-row">
          <button className="lp-btn-primary" onClick={() => navigate('/signup')}>
            <ArrowRightIcon /><span>Join TingleTap</span>
          </button>
          <button className="lp-btn-secondary" onClick={() => navigate('/contact')}>
            <MailIcon /><span>Contact Support</span>
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

export default PrivacyPage;
