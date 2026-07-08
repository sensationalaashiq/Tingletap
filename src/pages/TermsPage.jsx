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
const TermsHeroIcon = () => (
  <svg viewBox="0 0 30 30" width="30" height="30" fill="none" style={{display:'block'}}>
    <path d="M6 2.5h14l6 6V27a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M20 2.5v6h6" stroke="white" strokeWidth="1.6" strokeLinejoin="round" opacity=".6"/>
    <path d="M9 14h12M9 18h12M9 22h7" stroke="white" strokeWidth="1.9" strokeLinecap="round" opacity=".82"/>
  </svg>
);
const ArrowRightIcon = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" style={{display:'block',flexShrink:0}}>
    <path d="M4 9h10M10.5 5.5L14 9l-3.5 3.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const QuestionIcon = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" style={{display:'block',flexShrink:0}}>
    <circle cx="9" cy="9" r="7.5" stroke="#4f46e5" strokeWidth="1.9"/>
    <path d="M6.5 7a2.5 2.5 0 0 1 5 .5c0 1.6-2.5 2.2-2.5 3.8" stroke="#4f46e5" strokeWidth="1.9" strokeLinecap="round"/>
    <circle cx="9" cy="14" r="1.1" fill="#4f46e5"/>
  </svg>
);

const MkIcon = (id1, c1, c2, body) => () => (
  <svg viewBox="0 0 26 26" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id={id1} x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor={c1}/><stop offset="100%" stopColor={c2}/>
    </linearGradient></defs>
    {body(id1)}
  </svg>
);

const icons = {
  accept: MkIcon('tm-1','#34d399','#059669', id => <>
    <path d="M13 2L3 7v6C3 19.4 7.3 24.6 13 26c5.7-1.4 10-6.6 10-13V7L13 2z" fill={`url(#${id})`} opacity=".9"/>
    <path d="M13 2L3 7v6C3 19.4 7.3 24.6 13 26c5.7-1.4 10-6.6 10-13V7L13 2z" fill="white" opacity=".1"/>
    <path d="M8.5 13l3 3L18 9" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
  </>),
  eligibility: MkIcon('tm-2','#818cf8','#6366f1', id => <>
    <circle cx="13" cy="9" r="5.5" fill={`url(#${id})`} opacity=".9"/>
    <circle cx="13" cy="9" r="2.8" fill="white" opacity=".55"/>
    <path d="M3.5 25c0-5.2 4.3-9.5 9.5-9.5s9.5 4.3 9.5 9.5" stroke={`url(#${id})`} strokeWidth="2.2" strokeLinecap="round"/>
    <path d="M17 7l1.5 1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
  </>),
  account: MkIcon('tm-3','#a78bfa','#7c3aed', id => <>
    <rect x="3" y="3" width="20" height="20" rx="4" fill={`url(#${id})`} opacity=".88"/>
    <rect x="3" y="3" width="20" height="20" rx="4" fill="white" opacity=".1"/>
    <circle cx="13" cy="11" r="3" fill="white" opacity=".9"/>
    <path d="M7 21c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </>),
  conduct: MkIcon('tm-4','#f87171','#ef4444', id => <>
    <circle cx="13" cy="13" r="11" fill={`url(#${id})`} opacity=".15"/>
    <circle cx="13" cy="13" r="11" stroke={`url(#${id})`} strokeWidth="2"/>
    <path d="M9 9l8 8M17 9l-8 8" stroke={`url(#${id})`} strokeWidth="2.2" strokeLinecap="round"/>
  </>),
  content: MkIcon('tm-5','#a78bfa','#7c3aed', id => <>
    <path d="M5 2h12l5 5v18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" fill={`url(#${id})`} opacity=".88"/>
    <path d="M17 2v5h5" stroke="rgba(255,255,255,.4)" strokeWidth="1.5"/>
    <path d="M8 13h10M8 17h10M8 21h6" stroke="white" strokeWidth="1.9" strokeLinecap="round" opacity=".88"/>
  </>),
  ip: MkIcon('tm-6','#fbbf24','#f59e0b', id => <>
    <circle cx="13" cy="13" r="11" fill={`url(#${id})`} opacity=".15"/>
    <path d="M13 2L3 7v6C3 19.4 7.3 24.6 13 26c5.7-1.4 10-6.6 10-13V7L13 2z" fill={`url(#${id})`} opacity=".88"/>
    <path d="M13 9v5.5" stroke="white" strokeWidth="2.4" strokeLinecap="round"/>
    <circle cx="13" cy="18" r="1.6" fill="white"/>
  </>),
  governing: MkIcon('tm-7','#38bdf8','#6366f1', id => <>
    <circle cx="13" cy="13" r="11" fill={`url(#${id})`} opacity=".15"/>
    <path d="M3 13h20M13 3c-4 4-4 18 0 20M13 3c4 4 4 18 0 20" stroke={`url(#${id})`} strokeWidth="2" strokeLinecap="round"/>
    <circle cx="13" cy="13" r="10.5" stroke={`url(#${id})`} strokeWidth="2"/>
  </>),
  service: MkIcon('tm-8','#34d399','#10b981', id => <>
    <circle cx="13" cy="13" r="11" fill={`url(#${id})`} opacity=".88"/>
    <circle cx="13" cy="13" r="11" fill="white" opacity=".1"/>
    <path d="M13 7v6.5l4 4" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
  </>),
  liability: MkIcon('tm-9','#f87171','#ef4444', id => <>
    <path d="M13 2L3 6.5v5C3 18 7 23.2 13 24.5c6-1.3 10-6.5 10-13v-5L13 2z" fill={`url(#${id})`} opacity=".9"/>
    <path d="M13 9v5" stroke="white" strokeWidth="2.4" strokeLinecap="round"/>
    <circle cx="13" cy="17.5" r="1.6" fill="white"/>
  </>),
  changes: MkIcon('tm-10','#fb923c','#f59e0b', id => <>
    <circle cx="13" cy="13" r="11" fill={`url(#${id})`} opacity=".15"/>
    <path d="M5 13A8 8 0 0 1 20 8M21 13a8 8 0 0 1-15 5" stroke={`url(#${id})`} strokeWidth="2.2" strokeLinecap="round"/>
    <path d="M20 4v4h4M6 22v-4H2" stroke={`url(#${id})`} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </>),
};

const SectionItem = ({ s }) => {
  const IconComp = icons[s.icon];
  return (
    <div className="lp-section-item" style={{alignItems:'flex-start'}}>
      <div className="lp-section-icon" style={{marginTop:3}}><IconComp /></div>
      <div className="lp-section-content">
        <div className="lp-section-title">{s.title}</div>
        <div className="lp-section-text">{s.text}</div>
        {s.items && (
          <ul style={{marginTop:10,paddingLeft:0,listStyle:'none',display:'flex',flexDirection:'column',gap:7}}>
            {s.items.map((item,i) => (
              <li key={i} style={{display:'flex',alignItems:'flex-start',gap:9,fontSize:13.5,color:'#4b5563',lineHeight:1.7}}>
                <span style={{flexShrink:0,marginTop:6,width:6,height:6,borderRadius:'50%',background:'linear-gradient(135deg,#a78bfa,#7c3aed)',display:'block'}}/>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const sections = [
  {
    icon: 'accept',
    title: 'Acceptance of Terms',
    text: 'By accessing or using TingleTap in any way — including browsing as a guest, creating an account, or sending a message — you accept and agree to be bound by these Terms of Service and our Privacy Policy. These terms constitute a legally binding agreement under the laws of India:',
    items: [
      'These Terms are governed by the Information Technology Act, 2000 and the IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021',
      'If you do not agree to these terms in their entirety, you must immediately discontinue all use of TingleTap',
      'By continuing to use TingleTap after updates to these Terms are published, you accept the revised Terms',
      'TingleTap operates as an "intermediary" under the IT Act, 2000 — we are not responsible for user-generated content posted by third parties on our platform',
    ]
  },
  {
    icon: 'eligibility',
    title: 'Eligibility & Age Requirements',
    text: 'TingleTap is an adult platform. Strict age and eligibility requirements apply:',
    items: [
      'Minimum Age: You must be at least 18 years of age to use TingleTap. Some content categories (adult rooms) additionally require users to affirmatively confirm they are 18+',
      'Legal Capacity: By accepting these Terms, you represent that you have the legal capacity to enter into a binding contract in your jurisdiction',
      'Account Misrepresentation: Misrepresentation of age or identity during registration will result in immediate and permanent account termination without notice or refund of any coin balance',
      'Geographic Compliance: You are responsible for ensuring your use of TingleTap complies with local laws in your country, state, or territory',
      'Prohibited Users: Persons previously banned or suspended from TingleTap are not permitted to create new accounts or access the platform by any means',
    ]
  },
  {
    icon: 'account',
    title: 'User Account & Security',
    text: 'You are responsible for maintaining the security of your account and all activity that occurs under it:',
    items: [
      'Account Integrity: You must provide accurate information during registration and keep your account details up to date',
      'Password Security: You are solely responsible for maintaining the confidentiality of your login credentials. Use a strong, unique password and do not share it with anyone',
      'Unauthorised Access: You must immediately notify TingleTap at support@tingletap.com if you become aware of any unauthorised access to or use of your account',
      'One Account per Person: You may not create multiple accounts to circumvent bans, suspensions, or platform restrictions. Duplicate accounts will be terminated',
      'Account Non-Transferability: Your account is personal to you and may not be sold, transferred, or sublicensed to any third party',
      'Anonymous Guest Access: Guest access is permitted without registration; however, guest accounts have limited features and do not carry any earned privileges',
    ]
  },
  {
    icon: 'conduct',
    title: 'User Conduct & Community Standards',
    text: 'TingleTap is a community for respectful adults. The following conduct is strictly prohibited and may result in immediate account termination:',
    items: [
      'Harassment, bullying, stalking, threatening, or intimidating any other user in any manner',
      'Hate speech, discrimination, or content that dehumanises individuals or groups based on religion, caste, race, gender, sexual orientation, nationality, or disability',
      'Sharing, requesting, or distributing child sexual abuse material (CSAM) — this is illegal and will be immediately reported to law enforcement authorities',
      'Impersonating another person, organisation, or entity, including TingleTap staff',
      'Sending unsolicited commercial messages (spam), bulk communications, or automated messages',
      'Attempting to gain unauthorised access to other users\' accounts, our systems, or any connected networks',
      'Coordinating or participating in any illegal activity through the platform, including fraud, extortion, or money laundering',
      'Publishing personal information of other users without their explicit consent (doxxing)',
    ]
  },
  {
    icon: 'content',
    title: 'Content Guidelines & Intellectual Property',
    text: 'All content shared on TingleTap must comply with applicable Indian law and our community standards:',
    items: [
      'Content Ownership: You retain ownership of original content you create and share on TingleTap. By sharing content, you grant TingleTap a non-exclusive, royalty-free licence to display it within the platform for service delivery purposes only',
      'Prohibited Content: Illegal content, obscene material involving minors, content that violates others\' intellectual property rights, and content that incites violence or communal discord is strictly forbidden',
      'IT Act 2000 Compliance: Content must comply with Sections 66, 66A–F, 67, 67A, 67B, 69, 69A, and 79 of the Information Technology Act, 2000',
      'Copyright Respect: You must not share copyrighted material — including music, films, books, or images — without proper licences or permissions from the rights holder',
      'Platform Moderation: TingleTap uses both automated and human moderation. Reported content will be reviewed and actioned within timeframes required by IT Rules 2021',
      'Content Removal: TingleTap reserves the right to remove any content that violates these guidelines without prior notice',
    ]
  },
  {
    icon: 'ip',
    title: 'Coins, Virtual Gifts & Transactions',
    text: 'TingleTap\'s virtual economy is governed by strict rules to protect all users:',
    items: [
      'No Real-World Value: TingleTap coins and virtual gifts have no monetary value outside the platform and cannot be exchanged for real currency',
      'No Refunds: Coin purchases are final. Refunds are not available except where required by applicable consumer protection law',
      'RJ Earnings: Radio Jockey (RJ) earnings are calculated and paid by TingleTap per its stated earnings policy. Actual payouts may vary based on platform terms',
      'Transaction Disputes: For any coin or transaction disputes, contact support@tingletap.com within 7 days of the disputed transaction',
      'Fraudulent Transactions: Chargebacks, fraudulent purchases, or attempts to exploit the virtual economy will result in immediate account suspension and potential legal action',
    ]
  },
  {
    icon: 'governing',
    title: 'Governing Law & Jurisdiction',
    text: 'These Terms of Service are governed exclusively by Indian law:',
    items: [
      'Governing Law: These Terms are governed by and interpreted in accordance with the laws of India, including the Information Technology Act, 2000, the Indian Contract Act, 1872, and the Consumer Protection Act, 2019',
      'Jurisdiction: Any dispute arising out of or relating to these Terms shall be subject to the exclusive jurisdiction of the competent courts located in India',
      'Dispute Resolution: Before initiating legal proceedings, users are encouraged to contact TingleTap\'s Grievance Officer for resolution. We aim to resolve disputes within 15 days',
      'Intermediary Status: TingleTap operates as an intermediary under Section 79 of the IT Act, 2000, and complies with IT Rules 2021 including Grievance Officer appointment, takedown procedures, and reporting obligations',
    ]
  },
  {
    icon: 'service',
    title: 'Service Availability & Modifications',
    text: 'TingleTap aims for the highest possible service reliability, but we cannot guarantee uninterrupted access:',
    items: [
      'Best Effort Uptime: We target maximum availability but do not guarantee 100% uninterrupted service. Scheduled maintenance, infrastructure updates, and unforeseen events may cause temporary downtime',
      'Feature Changes: TingleTap may add, modify, suspend, or discontinue any feature at any time. We will provide reasonable notice for material changes where possible',
      'Real-Time Features: Live features including voice broadcasts, anonymous chat, and real-time messaging depend on network conditions and may experience interruptions',
      'No Liability for Downtime: TingleTap is not liable for any losses arising from service interruptions, maintenance windows, or platform modifications',
    ]
  },
  {
    icon: 'liability',
    title: 'Limitation of Liability & Indemnification',
    text: 'To the fullest extent permitted by applicable law, TingleTap\'s liability is strictly limited:',
    items: [
      '"As Is" Service: TingleTap is provided "as is" and "as available" without warranties of any kind, express or implied',
      'No Consequential Damages: TingleTap is not liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the platform',
      'User Indemnification: You agree to indemnify and hold harmless TingleTap, Adrashtra Inc., its officers, employees, and agents from any claims, damages, or expenses arising from your violation of these Terms or your use of the platform',
      'Third-Party Content: TingleTap is not responsible for the accuracy, legality, or appropriateness of user-generated content posted by third parties',
      'Limitation Cap: Where liability cannot be excluded under applicable law, our total aggregate liability shall not exceed the amount you paid to TingleTap in the 3 months preceding the claim',
    ]
  },
  {
    icon: 'changes',
    title: 'Changes to Terms & Termination',
    text: 'TingleTap reserves the right to update these Terms and to terminate accounts that violate them:',
    items: [
      'Policy Updates: We may update these Terms at any time. Material changes will be communicated via in-app notification with at least 30 days\' advance notice',
      'Continued Use = Acceptance: Your continued use of TingleTap after the effective date of any update constitutes your acceptance of the revised Terms',
      'Account Termination by User: You may delete your account at any time through account settings. Termination does not entitle you to a refund of any coin balance',
      'Account Termination by TingleTap: We reserve the right to suspend or permanently terminate any account that violates these Terms, with or without prior notice depending on severity',
      'Effect of Termination: Upon termination, your licence to use TingleTap ends immediately. Provisions that by their nature should survive termination — including liability, indemnification, and governing law — will survive',
      'Last Updated: July 2025 | Effective Date: July 1, 2025 | Governed by the laws of India',
    ]
  },
];

const TermsPage = () => {
  const navigate = useNavigate();
  return (
    <div className="lp-root lp-lpage">
      <SEO
        title={PAGES.terms.title}
        description={PAGES.terms.description}
        keywords={PAGES.terms.keywords}
        canonical={PAGES.terms.canonical}
        robots={PAGES.terms.robots}
        ogType={PAGES.terms.ogType}
      />
      <WebPageSchema
        name="Terms of Service — TingleTap User Agreement & Community Rules"
        description={PAGES.terms.description}
        url={PAGES.terms.canonical}
        type="WebPage"
        speakable={true}
      />
      <BreadcrumbSchema crumbs={[
        { name: 'Home', url: SITE.url },
        { name: 'Terms of Service', url: PAGES.terms.canonical },
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
              <span className="lp-brand-sub">Terms</span>
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
          <div className="lp-hero-icon"><TermsHeroIcon /></div>
          <h1 className="lp-hero-title">Terms of Service</h1>
          <p className="lp-hero-sub">
            Please read these terms carefully. They govern your use of TingleTap and are legally binding under Indian law.
            These Terms comply with the Information Technology Act, 2000 and IT Rules, 2021.
          </p>
          <div style={{
            display:'inline-flex',alignItems:'center',gap:8,marginTop:12,
            background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.2)',
            borderRadius:10,padding:'8px 16px',fontSize:12.5,color:'#4f46e5',fontWeight:600,
          }}>
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
              <rect x="2" y="2" width="12" height="14" rx="2" stroke="#4f46e5" strokeWidth="1.3"/>
              <path d="M5 6h6M5 9h6M5 12h4" stroke="#4f46e5" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            Governed by Indian Law · IT Act 2000 · IT Rules 2021 Compliant
          </div>
        </div>

        <div className="lp-card">
          <div className="lp-section">
            {sections.map((s, i) => <SectionItem key={i} s={s} />)}
          </div>
        </div>

        <div className="lp-cta-row">
          <button className="lp-btn-primary" onClick={() => navigate('/signup')}>
            <ArrowRightIcon /><span>I Accept — Join Now</span>
          </button>
          <button className="lp-btn-secondary" onClick={() => navigate('/contact')}>
            <QuestionIcon /><span>Questions?</span>
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

export default TermsPage;
