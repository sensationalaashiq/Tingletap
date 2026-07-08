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
const DisclaimerHeroIcon = () => (
  <svg viewBox="0 0 30 30" width="30" height="30" fill="none" style={{display:'block'}}>
    <path d="M15 3L2.5 26.5h25L15 3z" stroke="white" strokeWidth="2.2" strokeLinejoin="round"/>
    <path d="M15 12v6.5" stroke="white" strokeWidth="2.4" strokeLinecap="round"/>
    <circle cx="15" cy="22.5" r="1.7" fill="white"/>
  </svg>
);
const ArrowRightIcon = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" style={{display:'block',flexShrink:0}}>
    <path d="M4 9h10M10.5 5.5L14 9l-3.5 3.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const LockIcon = () => (
  <svg viewBox="0 0 18 18" width="16" height="16" fill="none" style={{display:'block',flexShrink:0}}>
    <rect x="3" y="8" width="12" height="8.5" rx="2.5" stroke="#4f46e5" strokeWidth="1.9"/>
    <path d="M6 8V6.5a3 3 0 0 1 6 0V8" stroke="#4f46e5" strokeWidth="1.9" strokeLinecap="round"/>
  </svg>
);

const MkIcon = (id, c1, c2, body) => () => (
  <svg viewBox="0 0 26 26" width="26" height="26" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor={c1}/><stop offset="100%" stopColor={c2}/>
    </linearGradient></defs>
    {body(id)}
  </svg>
);

const icons = {
  service: MkIcon('dc-1','#fbbf24','#f59e0b', id => <>
    <rect x="2" y="5" width="22" height="16" rx="4" fill={`url(#${id})`} opacity=".88"/>
    <rect x="2" y="5" width="22" height="16" rx="4" fill="white" opacity=".1"/>
    <path d="M7 13h12M7 17h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </>),
  intermediary: MkIcon('dc-2','#818cf8','#6366f1', id => <>
    <circle cx="13" cy="13" r="11" fill={`url(#${id})`} opacity=".15"/>
    <circle cx="13" cy="13" r="11" stroke={`url(#${id})`} strokeWidth="2"/>
    <path d="M9 9l8 4-8 4V9z" fill={`url(#${id})`}/>
  </>),
  user: MkIcon('dc-3','#fb923c','#f97316', id => <>
    <circle cx="13" cy="9" r="5.5" fill={`url(#${id})`} opacity=".9"/>
    <circle cx="13" cy="9" r="2.8" fill="white" opacity=".55"/>
    <path d="M3.5 25c0-5.2 4.3-9.5 9.5-9.5s9.5 4.3 9.5 9.5" stroke={`url(#${id})`} strokeWidth="2.2" strokeLinecap="round"/>
  </>),
  accuracy: MkIcon('dc-4','#34d399','#10b981', id => <>
    <circle cx="13" cy="13" r="11" fill={`url(#${id})`} opacity=".88"/>
    <circle cx="13" cy="13" r="11" fill="white" opacity=".1"/>
    <path d="M13 7v6.5l4 4" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
  </>),
  link: MkIcon('dc-5','#38bdf8','#6366f1', id => <>
    <circle cx="13" cy="13" r="11" fill={`url(#${id})`} opacity=".15"/>
    <path d="M11 15a5 5 0 0 0 7.07 0l3.54-3.54a5 5 0 0 0-7.07-7.07L13.06 5.87" stroke={`url(#${id})`} strokeWidth="2.2" strokeLinecap="round"/>
    <path d="M15 11a5 5 0 0 0-7.07 0L4.39 14.54a5 5 0 0 0 7.07 7.07L12.94 20.13" stroke={`url(#${id})`} strokeWidth="2.2" strokeLinecap="round"/>
  </>),
  copyright: MkIcon('dc-6','#a78bfa','#7c3aed', id => <>
    <circle cx="13" cy="13" r="11" fill={`url(#${id})`} opacity=".88"/>
    <circle cx="13" cy="13" r="11" fill="white" opacity=".1"/>
    <path d="M16 11a4 4 0 1 0 0 4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </>),
  warranty: MkIcon('dc-7','#f59e0b','#d97706', id => <>
    <path d="M13 2L3 6.5v5C3 18 7 23.2 13 24.5c6-1.3 10-6.5 10-13v-5L13 2z" fill={`url(#${id})`} opacity=".88"/>
    <path d="M13 9v5.5" stroke="white" strokeWidth="2.4" strokeLinecap="round"/>
    <circle cx="13" cy="18" r="1.6" fill="white"/>
  </>),
  age: MkIcon('dc-8','#c084fc','#9333ea', id => <>
    <circle cx="13" cy="13" r="11" fill={`url(#${id})`} opacity=".88"/>
    <circle cx="13" cy="13" r="11" fill="white" opacity=".1"/>
    <path d="M9 13h8M13 9v8" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
  </>),
  law: MkIcon('dc-9','#34d399','#059669', id => <>
    <path d="M13 2L3 7v6C3 19.4 7.3 24.6 13 26c5.7-1.4 10-6.6 10-13V7L13 2z" fill={`url(#${id})`} opacity=".9"/>
    <path d="M13 2L3 7v6C3 19.4 7.3 24.6 13 26c5.7-1.4 10-6.6 10-13V7L13 2z" fill="white" opacity=".12"/>
    <path d="M8.5 13l3 3L18 9" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
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
                <span style={{flexShrink:0,marginTop:6,width:6,height:6,borderRadius:'50%',background:'linear-gradient(135deg,#fbbf24,#f59e0b)',display:'block'}}/>
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
    icon: 'service',
    title: 'Nature of Service',
    text: 'TingleTap is a real-time communication platform operated by Adrashtra Inc. under the laws of India. It is important to understand the nature of what TingleTap is and is not:',
    items: [
      'TingleTap is an "intermediary" as defined under Section 2(w) of the Information Technology Act, 2000. We provide the technological infrastructure for communication; we do not create, control, endorse, verify, or guarantee any user-generated content',
      'TingleTap facilitates connections between users but is not a party to any conversation, relationship, transaction, or agreement formed between users on the platform',
      'The availability of any feature does not constitute an endorsement or recommendation of that feature\'s use for any particular purpose',
      'TingleTap does not provide professional, medical, legal, financial, or psychological advice. Content shared by users must not be treated as expert guidance of any kind',
    ]
  },
  {
    icon: 'intermediary',
    title: 'Intermediary Status & Safe Harbour',
    text: 'TingleTap operates under the safe harbour provisions of Indian law applicable to internet intermediaries:',
    items: [
      'Under Section 79 of the IT Act, 2000, TingleTap is not liable for third-party content hosted on its platform, provided we meet our due diligence obligations under IT Rules 2021',
      'We comply with IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 — including maintaining a Grievance Officer, publishing clear community policies, and actioning lawful takedown requests within prescribed timelines',
      'Upon receiving a court order or competent authority direction to remove content, TingleTap will act within the timeframes mandated by applicable law',
      'Safe harbour does not apply when TingleTap has been explicitly notified of specific unlawful content and fails to act within the legally required timeframe',
    ]
  },
  {
    icon: 'user',
    title: 'User Responsibility',
    text: 'Users of TingleTap bear full and sole responsibility for all of their activities on the platform:',
    items: [
      'You are legally responsible for all content you post, share, broadcast, or transmit on TingleTap',
      'Any harm, loss, or legal liability arising from your interactions with other users is your sole responsibility. TingleTap is not liable for disputes between users',
      'You must exercise independent judgment, caution, and common sense when sharing personal information or engaging with others on a public platform',
      'If you choose to meet any person you have interacted with on TingleTap in person, you do so entirely at your own risk. TingleTap takes no responsibility for offline meetings or interactions arising from platform use',
      'You are responsible for ensuring your use of the platform complies with all laws applicable in your jurisdiction',
    ]
  },
  {
    icon: 'accuracy',
    title: 'No Warranty on Content Accuracy',
    text: 'TingleTap makes no representations about the accuracy, reliability, or truthfulness of any content posted by users:',
    items: [
      'User-generated content — including text messages, voice broadcasts, and user profiles — is not verified, fact-checked, or endorsed by TingleTap',
      'Any information shared by users should not be relied upon for professional, medical, legal, financial, emergency, or safety-critical decisions',
      'TingleTap does not guarantee that content shared by other users is non-defamatory, legal, or free from errors',
      'Live broadcast and voice content is transmitted in real time and cannot be pre-screened. TingleTap is not liable for the content of live communications',
    ]
  },
  {
    icon: 'link',
    title: 'Third-Party Links & External Content',
    text: 'Content shared on TingleTap may include links or references to external websites and services:',
    items: [
      'TingleTap does not control, operate, or take responsibility for any third-party website, application, or service that may be linked or referenced by users on our platform',
      'Links to external sites do not constitute an endorsement, recommendation, or approval of those sites, their operators, or their content',
      'Third-party websites have their own privacy policies and terms of service, which are entirely separate from TingleTap\'s. You visit them at your own risk',
      'TingleTap is not responsible for any losses, damages, or negative experiences arising from your interaction with third-party services',
    ]
  },
  {
    icon: 'copyright',
    title: 'Copyright & Intellectual Property Notice',
    text: 'All original content, design, and technology comprising TingleTap is protected by intellectual property law:',
    items: [
      'The TingleTap name, logo, visual design, software, and all original platform content are the exclusive intellectual property of Adrashtra Inc., protected under Indian and international intellectual property laws',
      'Unauthorised copying, reproduction, distribution, modification, or commercial use of any TingleTap intellectual property is strictly prohibited and may result in legal action',
      'If you believe your copyright or intellectual property has been infringed on TingleTap, please contact our Grievance Officer at support@tingletap.com with full details of the alleged infringement',
      'TingleTap will respond to valid intellectual property notices in accordance with applicable law and IT Rules 2021',
    ]
  },
  {
    icon: 'warranty',
    title: 'Disclaimer of Warranties',
    text: 'TingleTap makes no warranties, express or implied, regarding the platform or its content:',
    items: [
      'The platform is provided strictly "as is" and "as available" without any warranty of any kind, whether express, implied, statutory, or otherwise',
      'TingleTap explicitly disclaims all implied warranties of merchantability, fitness for a particular purpose, title, non-infringement, and freedom from viruses or malicious code',
      'We do not warrant that the platform will operate error-free, uninterrupted, or free from defects at all times',
      'We do not warrant that the platform or any content thereon is appropriate for use in every jurisdiction. Users are responsible for ensuring compliance with local laws',
    ]
  },
  {
    icon: 'age',
    title: 'Age Restriction Notice',
    text: 'TingleTap is designed exclusively for users aged 18 and above:',
    items: [
      'Access to TingleTap by persons under 18 years of age is strictly prohibited and violates our Terms of Service',
      'Some areas of TingleTap (adult-designated rooms) contain content exclusively for users who have affirmed they are 18 years of age or older',
      'TingleTap is not responsible for any harm arising from misrepresentation of age by users accessing the platform or age-restricted areas',
      'Parents and legal guardians are responsible for monitoring and controlling minors\' access to internet services and ensuring minors do not use TingleTap',
    ]
  },
  {
    icon: 'law',
    title: 'Governing Law & Compliance',
    text: 'This Disclaimer and all related matters are governed by the laws of India:',
    items: [
      'This Disclaimer is issued under and governed by the Information Technology Act, 2000, the IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, and other applicable Indian laws',
      'Any disputes arising from or related to this Disclaimer shall be subject to the exclusive jurisdiction of competent courts in India',
      'TingleTap fully cooperates with Indian law enforcement and judicial authorities in matters requiring platform assistance under applicable legal processes',
      'If any provision of this Disclaimer is found to be invalid or unenforceable under applicable law, the remaining provisions shall continue in full force and effect',
      'Last Updated: July 2025 | Effective Date: July 1, 2025',
    ]
  },
];

const DisclaimerPage = () => {
  const navigate = useNavigate();
  return (
    <div className="lp-root lp-lpage">
      <SEO
        title={PAGES.disclaimer.title}
        description={PAGES.disclaimer.description}
        keywords={PAGES.disclaimer.keywords}
        canonical={PAGES.disclaimer.canonical}
        robots={PAGES.disclaimer.robots}
        ogType={PAGES.disclaimer.ogType}
      />
      <WebPageSchema
        name="Disclaimer — TingleTap Legal Notice, Liability & Content Policy"
        description={PAGES.disclaimer.description}
        url={PAGES.disclaimer.canonical}
        type="WebPage"
        speakable={true}
      />
      <BreadcrumbSchema crumbs={[
        { name: 'Home', url: SITE.url },
        { name: 'Disclaimer', url: PAGES.disclaimer.canonical },
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
              <span className="lp-brand-sub">Disclaimer</span>
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
          <div className="lp-hero-icon"><DisclaimerHeroIcon /></div>
          <h1 className="lp-hero-title">Disclaimer</h1>
          <p className="lp-hero-sub">
            Important legal notices regarding TingleTap's role as an internet intermediary, user responsibilities,
            and the limits of our liability under Indian law.
          </p>
          <div style={{
            display:'inline-flex',alignItems:'center',gap:8,marginTop:12,
            background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.25)',
            borderRadius:10,padding:'8px 16px',fontSize:12.5,color:'#92400e',fontWeight:600,
          }}>
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
              <path d="M8 1.5L1 14h14L8 1.5z" stroke="#92400e" strokeWidth="1.3" strokeLinejoin="round"/>
              <path d="M8 6v4" stroke="#92400e" strokeWidth="1.3" strokeLinecap="round"/>
              <circle cx="8" cy="12" r="0.8" fill="#92400e"/>
            </svg>
            Issued under IT Act, 2000 · IT Rules 2021 · Adrashtra Inc.
          </div>
        </div>

        <div className="lp-card">
          <div className="lp-section">
            {sections.map((s, i) => <SectionItem key={i} s={s} />)}
          </div>
        </div>

        <div className="lp-cta-row">
          <button className="lp-btn-primary" onClick={() => navigate('/terms')}>
            <ArrowRightIcon /><span>Read Full Terms</span>
          </button>
          <button className="lp-btn-secondary" onClick={() => navigate('/privacy')}>
            <LockIcon /><span>Privacy Policy</span>
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

export default DisclaimerPage;
