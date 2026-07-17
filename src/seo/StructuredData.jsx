import React from 'react';
import { Helmet } from 'react-helmet-async';
import { SITE } from './seoConfig';

const ld = (data) => JSON.stringify(data, null, 2);

// Shared date strings
const DATE_FOUNDED   = '2024-01-01';
// FIX L-07: Use the build-time env variable so DATE_MODIFIED updates automatically
// on each deploy. Falls back to the last-known date if the variable is not set.
const DATE_MODIFIED  = import.meta.env.VITE_BUILD_DATE || new Date().toISOString().slice(0, 10);
const DATE_PUBLISHED = '2024-01-01';

/* ── WebSite + SiteLinksSearchBox + SpeakableSpecification ── */
export const WebSiteSchema = () => (
    <Helmet>
        <script type="application/ld+json">{ld({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            '@id': `${SITE.url}/#website`,
            name: SITE.name,
            alternateName: ['TingleTap Chat', 'Tingle Tap', 'Tingle, Tap, Talk', 'TingleTap India', 'Desi Chat App'],
            url: SITE.url,
            description: SITE.description,
            inLanguage: ['en-IN', 'en', 'hi'],
            datePublished: DATE_PUBLISHED,
            dateModified: DATE_MODIFIED,
            publisher: { '@id': `${SITE.url}/#organization` },
            copyrightHolder: { '@id': `${SITE.url}/#organization` },
            copyrightYear: '2024',
            license: `${SITE.url}/terms`,
            potentialAction: [
                {
                    '@type': 'SearchAction',
                    target: {
                        '@type': 'EntryPoint',
                        urlTemplate: `${SITE.url}/faq?q={search_term_string}`,
                    },
                    'query-input': 'required name=search_term_string',
                },
            ],
            speakable: {
                '@type': 'SpeakableSpecification',
                xPath: ['/html/head/title', "/html/head/meta[@name='description']/@content"],
            },
        })}</script>
    </Helmet>
);

/* ── Organization ── */
export const OrganizationSchema = () => (
    <Helmet>
        <script type="application/ld+json">{ld({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            '@id': `${SITE.url}/#organization`,
            name: 'TingleTap',
            legalName: 'Adrashtra Inc.',
            alternateName: ['Tingle Tap', 'TingleTap Chat', 'Tingle, Tap, Talk', 'TingleTap India'],
            url: SITE.url,
            logo: {
                '@type': 'ImageObject',
                '@id': `${SITE.url}/#logo`,
                url: SITE.ogImage,
                contentUrl: SITE.ogImage,
                width: 512,
                height: 512,
                caption: 'TingleTap Logo — India\'s #1 Free Chat Platform',
            },
            image: { '@id': `${SITE.url}/#logo` },
            description: "India's #1 free real-time chat platform — used worldwide by Indians and the global desi community. Public chat rooms, private messaging, voice broadcasts, RJ radio shows, TingleBot AutoMod, virtual gifting, and premium customization.",
            foundingDate: DATE_FOUNDED,
            foundingLocation: { '@type': 'Country', name: 'India' },
            numberOfEmployees: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 50 },
            areaServed: [
                { '@type': 'Country', name: 'India' },
                { '@type': 'Country', name: 'United States' },
                { '@type': 'Country', name: 'United Kingdom' },
                { '@type': 'Country', name: 'Canada' },
                { '@type': 'Country', name: 'Australia' },
                { '@type': 'Country', name: 'New Zealand' },
                { '@type': 'Country', name: 'United Arab Emirates' },
                { '@type': 'Country', name: 'Saudi Arabia' },
                { '@type': 'Country', name: 'Qatar' },
                { '@type': 'Country', name: 'Kuwait' },
                { '@type': 'Country', name: 'Bahrain' },
                { '@type': 'Country', name: 'Oman' },
                { '@type': 'Country', name: 'Singapore' },
                { '@type': 'Country', name: 'Malaysia' },
                { '@type': 'Country', name: 'Pakistan' },
                { '@type': 'Country', name: 'Bangladesh' },
                { '@type': 'Country', name: 'Sri Lanka' },
                { '@type': 'Country', name: 'Nepal' },
                { '@type': 'Country', name: 'South Africa' },
                { '@type': 'Country', name: 'Kenya' },
                { '@type': 'Country', name: 'Mauritius' },
                { '@type': 'Country', name: 'Germany' },
                { '@type': 'Country', name: 'France' },
                { '@type': 'Country', name: 'Netherlands' },
                { '@type': 'Country', name: 'Italy' },
                { '@type': 'Country', name: 'Spain' },
                { '@type': 'Country', name: 'Sweden' },
                { '@type': 'Country', name: 'Norway' },
                { '@type': 'Country', name: 'Denmark' },
                { '@type': 'Country', name: 'Finland' },
                { '@type': 'Country', name: 'Belgium' },
                { '@type': 'Country', name: 'Austria' },
                { '@type': 'Country', name: 'Switzerland' },
                { '@type': 'Country', name: 'Ireland' },
                { '@type': 'Country', name: 'Portugal' },
                { '@type': 'Country', name: 'Poland' },
                { '@type': 'Country', name: 'Trinidad and Tobago' },
                { '@type': 'Country', name: 'Guyana' },
                { '@type': 'Country', name: 'Fiji' },
            ],
            knowsAbout: [
                'Online Chat', 'Real-time Communication', 'Social Networking',
                'Voice Calling', 'Video Calling', 'Voice Broadcasting',
                'South Asian Community', 'NRI Community', 'Indian Diaspora',
                'Chat Room Moderation', 'Auto Translation', 'Virtual Gifting',
                'RJ Radio Shows', 'Broadcast Stage', 'End-to-End Encryption',
                'Device Fingerprinting', 'Community Safety', 'PWA Development',
            ],
            slogan: 'Tingle, Tap, Talk',
            contactPoint: [
                {
                    '@type': 'ContactPoint',
                    contactType: 'Customer Support',
                    email: 'support@tingletap.com',
                    url: `${SITE.url}/contact`,
                    availableLanguage: ['English', 'Hindi'],
                    areaServed: 'Worldwide',
                    hoursAvailable: {
                        '@type': 'OpeningHoursSpecification',
                        dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
                    },
                },
                {
                    '@type': 'ContactPoint',
                    contactType: 'Technical Support',
                    email: 'support@tingletap.com',
                    url: `${SITE.url}/contact`,
                    availableLanguage: ['English', 'Hindi'],
                    areaServed: 'Worldwide',
                },
            ],
            sameAs: [
                'https://www.instagram.com/tingletap',
                'https://www.facebook.com/share/18uwA1Ybpd/',
                'https://x.com/tingletaps',
                'https://youtube.com/@tingletaps',
                'https://www.linkedin.com/in/tingle-tap-b8aa38253',
                'https://www.threads.com/@tingletap',
            ],
        })}</script>
    </Helmet>
);

/* ── SoftwareApplication with AggregateRating ── */
export const WebApplicationSchema = () => (
    <Helmet>
        <script type="application/ld+json">{ld({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            '@id': `${SITE.url}/#softwareapp`,
            name: SITE.name,
            alternateName: ['Tingle Tap', 'TingleTap Chat App', 'TingleTap India'],
            url: SITE.url,
            description: "India's #1 free real-time chat platform. Public live chat rooms, private encrypted messaging, RJ radio shows, voice broadcasts, Broadcast Stage mini-podcast, TingleBot AutoMod, auto translation, virtual gift economy, emoji reactions, voice messages, GIF sharing, and premium profile customization.",
            applicationCategory: 'CommunicationApplication',
            applicationSubCategory: 'Chat Application',
            operatingSystem: 'Web Browser, Android (Chrome), iOS (Safari), PWA',
            browserRequirements: 'Requires a modern web browser with JavaScript and WebRTC support (Chrome, Firefox, Safari, Edge)',
            inLanguage: ['en-IN', 'en', 'hi', 'ta', 'te', 'bn', 'gu', 'mr', 'pa', 'ur', 'ml', 'kn'],
            datePublished: DATE_PUBLISHED,
            dateModified: DATE_MODIFIED,
            softwareVersion: '2.0',
            releaseNotes: `${SITE.url}/about`,
            installUrl: SITE.url,
            screenshot: {
                '@type': 'ImageObject',
                url: SITE.ogImage,
                caption: 'TingleTap — Live Chat Rooms & Voice Broadcasts',
            },
            offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'INR',
                availability: 'https://schema.org/InStock',
                description: 'Free forever. No credit card required. Optional virtual coin purchases available.',
                validFrom: DATE_PUBLISHED,
            },
            aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                bestRating: '5',
                worstRating: '1',
                ratingCount: '3200',
                reviewCount: '1540',
            },
            featureList: [
                'Free Public Chat Rooms — 15+ themed rooms, zero ads',
                'Private End-to-End Encrypted Messaging',
                'RJ Radio Shows — verified RJ live voice with YouTube music sync',
                'Live Voice Broadcast — any user can go live with optional password',
                'Broadcast Stage — audience joins RJ as live speaker (mini-podcast)',
                'TingleBot AutoMod — 24/7 context-aware AI moderation engine',
                'Auto Translation — real-time message translation in 50+ languages',
                'Virtual Gifts & Coin Economy — roses, crowns, diamonds and more',
                'RJ Earnings Dashboard — track gifts and earnings in real-time',
                'Live Gift Leaderboard',
                'Voice Messages — up to 60 seconds with waveform visualization',
                'GIF Search & Sticker Sharing',
                'Emoji Reactions on messages',
                'YouTube Video Sharing in chat',
                'Multiple Radio Channels — live background music streaming',
                'Custom Username Gradients & Message Fonts',
                'Light & Dark Theme',
                'Profile Picture Upload with Crop',
                'Gender Verification Badges',
                'Achievement System — 5 sequential community titles',
                'Device Fingerprinting Security',
                'Dual-Layer IP + Device Ban System',
                'VPN Detection',
                'PWA — installable on Android and iOS without app store',
                'Guest Access — no sign-up required to browse and chat',
                'Anonymous Mode — join with no personal information required',
                'Friend Request System',
                'Real-time Typing Indicators',
                'Message Read Receipts',
                'Multi-language Support (Hindi, English, Tamil, Telugu, Bengali, and more)',
            ],
            countriesSupported: 'Worldwide — primary markets India, USA, UK, UAE, Canada, Australia, Singapore',
            publisher: { '@id': `${SITE.url}/#organization` },
            author: { '@id': `${SITE.url}/#organization` },
        })}</script>
    </Helmet>
);

/* ── BreadcrumbList ── */
export const BreadcrumbSchema = ({ crumbs }) => (
    <Helmet>
        <script type="application/ld+json">{ld({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: crumbs.map((crumb, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: crumb.name,
                item: crumb.url,
            })),
        })}</script>
    </Helmet>
);

/* ── WebPage — generic; pass type="AboutPage" / "ContactPage" / "FAQPage" etc. ── */
export const WebPageSchema = ({ name, description, url, type = 'WebPage', breadcrumb, speakable = false }) => (
    <Helmet>
        <script type="application/ld+json">{ld({
            '@context': 'https://schema.org',
            '@type': type,
            name,
            description,
            url,
            inLanguage: ['en-IN', 'en', 'hi'],
            datePublished: DATE_PUBLISHED,
            dateModified: DATE_MODIFIED,
            isPartOf: { '@type': 'WebSite', '@id': `${SITE.url}/#website` },
            about: { '@type': 'Thing', name: SITE.name, url: SITE.url },
            publisher: { '@id': `${SITE.url}/#organization` },
            author: { '@id': `${SITE.url}/#organization` },
            ...(breadcrumb ? { breadcrumb } : {}),
            ...(speakable ? {
                speakable: {
                    '@type': 'SpeakableSpecification',
                    xPath: ['/html/head/title', "/html/head/meta[@name='description']/@content"],
                },
            } : {}),
        })}</script>
    </Helmet>
);

/* ── AboutPage specific schema ── */
export const AboutPageSchema = () => (
    <Helmet>
        <script type="application/ld+json">{ld({
            '@context': 'https://schema.org',
            '@type': 'AboutPage',
            '@id': `${SITE.url}/about#webpage`,
            name: 'About TingleTap — India\'s Free Chat Platform Built for Indians Worldwide',
            description: "India's #1 free real-time chat platform. Discover TingleTap's story, mission, safety features, technology stack, and community.",
            url: `${SITE.url}/about`,
            inLanguage: ['en-IN', 'en', 'hi'],
            datePublished: DATE_PUBLISHED,
            dateModified: DATE_MODIFIED,
            isPartOf: { '@type': 'WebSite', '@id': `${SITE.url}/#website` },
            about: { '@id': `${SITE.url}/#organization` },
            publisher: { '@id': `${SITE.url}/#organization` },
            speakable: {
                '@type': 'SpeakableSpecification',
                xPath: ['/html/head/title', "/html/head/meta[@name='description']/@content"],
            },
        })}</script>
    </Helmet>
);

/* ── ContactPage specific schema ── */
export const ContactPageSchema = () => (
    <Helmet>
        <script type="application/ld+json">{ld({
            '@context': 'https://schema.org',
            '@type': 'ContactPage',
            '@id': `${SITE.url}/contact#webpage`,
            name: 'Contact TingleTap — Get Support & Reach Our Team',
            description: 'Contact TingleTap support. Report issues, request data deletion, ask questions, send business inquiries.',
            url: `${SITE.url}/contact`,
            inLanguage: ['en-IN', 'en', 'hi'],
            datePublished: DATE_PUBLISHED,
            dateModified: DATE_MODIFIED,
            isPartOf: { '@type': 'WebSite', '@id': `${SITE.url}/#website` },
            about: { '@id': `${SITE.url}/#organization` },
            publisher: { '@id': `${SITE.url}/#organization` },
            mainEntity: {
                '@type': 'ContactPoint',
                contactType: 'Customer Support',
                email: 'support@tingletap.com',
                url: `${SITE.url}/contact`,
                availableLanguage: ['English', 'Hindi'],
                areaServed: 'Worldwide',
            },
        })}</script>
    </Helmet>
);

/* ── FAQPage — rich results in Google (featured snippets) ── */
export const FAQSchema = ({ faqs }) => (
    <Helmet>
        <script type="application/ld+json">{ld({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            '@id': `${SITE.url}/faq#webpage`,
            name: 'TingleTap FAQ — Frequently Asked Questions',
            description: 'Complete answers to all TingleTap questions — features, safety, coins, account, broadcasts, and technical support.',
            url: `${SITE.url}/faq`,
            inLanguage: ['en-IN', 'en', 'hi'],
            datePublished: DATE_PUBLISHED,
            dateModified: DATE_MODIFIED,
            isPartOf: { '@type': 'WebSite', '@id': `${SITE.url}/#website` },
            publisher: { '@id': `${SITE.url}/#organization` },
            speakable: {
                '@type': 'SpeakableSpecification',
                xPath: ['/html/head/title', "/html/head/meta[@name='description']/@content"],
            },
            mainEntity: faqs.map(({ question, answer }) => ({
                '@type': 'Question',
                name: question,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: answer,
                },
            })),
        })}</script>
    </Helmet>
);

/* ── CollectionPage (for room list / community) ── */
export const CollectionPageSchema = ({ name, description, url }) => (
    <Helmet>
        <script type="application/ld+json">{ld({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name,
            description,
            url,
            inLanguage: ['en-IN', 'en', 'hi'],
            datePublished: DATE_PUBLISHED,
            dateModified: DATE_MODIFIED,
            isPartOf: { '@type': 'WebSite', '@id': `${SITE.url}/#website` },
            publisher: { '@id': `${SITE.url}/#organization` },
        })}</script>
    </Helmet>
);

/* ── ProfilePage ── */
export const ProfilePageSchema = ({ name, description, url, image }) => (
    <Helmet>
        <script type="application/ld+json">{ld({
            '@context': 'https://schema.org',
            '@type': 'ProfilePage',
            name,
            description,
            url,
            inLanguage: ['en-IN', 'en', 'hi'],
            datePublished: DATE_PUBLISHED,
            dateModified: DATE_MODIFIED,
            ...(image ? { image } : {}),
            isPartOf: { '@type': 'WebSite', '@id': `${SITE.url}/#website` },
            publisher: { '@id': `${SITE.url}/#organization` },
        })}</script>
    </Helmet>
);

/* ── Service Schema — the TingleTap chat service itself ── */
export const ServiceSchema = () => (
    <Helmet>
        <script type="application/ld+json">{ld({
            '@context': 'https://schema.org',
            '@type': 'Service',
            '@id': `${SITE.url}/#service`,
            name: 'TingleTap — Free Online Chat Service',
            alternateName: ['TingleTap Chat Rooms', 'TingleTap Voice Broadcast', 'Desi Chat Platform'],
            description: "India's #1 free real-time chat service. Public chat rooms, private messaging, RJ radio shows, voice broadcasts, TingleBot AutoMod, auto translation, and virtual gifting — all free.",
            url: SITE.url,
            provider: { '@id': `${SITE.url}/#organization` },
            serviceType: 'Online Chat Platform',
            category: ['Chat Rooms', 'Private Messaging', 'Voice Broadcasting', 'Social Networking'],
            areaServed: [
                { '@type': 'Country', name: 'India' },
                { '@type': 'Country', name: 'United States' },
                { '@type': 'Country', name: 'United Kingdom' },
                { '@type': 'Country', name: 'Canada' },
                { '@type': 'Country', name: 'Australia' },
                { '@type': 'Country', name: 'United Arab Emirates' },
            ],
            hasOfferCatalog: {
                '@type': 'OfferCatalog',
                name: 'TingleTap Features',
                itemListElement: [
                    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Free Public Chat Rooms', description: '15+ themed live chat rooms with real-time messaging, GIFs, stickers, and emoji reactions' } },
                    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Private Encrypted Messaging', description: 'End-to-end encrypted 1-on-1 private messages with read receipts' } },
                    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'RJ Radio Shows', description: 'Verified RJs host live voice broadcasts with YouTube music sync' } },
                    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Broadcast Stage', description: 'Live mini-podcast — audience members speak live alongside the RJ' } },
                    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'TingleBot AutoMod', description: '24/7 context-aware AI-assisted moderation engine' } },
                    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Auto Translation', description: 'Real-time message translation in 50+ languages including Hindi, Tamil, Telugu, Bengali' } },
                    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Virtual Gift Economy', description: 'Coin-based gift system with roses, crowns, diamonds — support your favourite RJs' } },
                ],
            },
            audience: {
                '@type': 'Audience',
                audienceType: 'Indians at home and abroad, NRI community, South Asian diaspora, Global users',
                geographicArea: { '@type': 'AdministrativeArea', name: 'Worldwide' },
            },
            offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'INR',
                availability: 'https://schema.org/InStock',
                description: 'Free forever — all core features included at no cost',
            },
        })}</script>
    </Helmet>
);

/* ── ItemList — Features (helps AI/voice search enumerate app capabilities) ── */
export const FeaturesListSchema = () => (
    <Helmet>
        <script type="application/ld+json">{ld({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            '@id': `${SITE.url}/#features`,
            name: 'TingleTap Features',
            description: 'Complete list of features available on TingleTap',
            url: SITE.url,
            numberOfItems: 15,
            itemListElement: [
                { '@type': 'ListItem', position: 1,  name: 'Free Public Chat Rooms', url: `${SITE.url}/rooms` },
                { '@type': 'ListItem', position: 2,  name: 'Private Encrypted Messaging', url: SITE.url },
                { '@type': 'ListItem', position: 3,  name: 'RJ Radio Shows with YouTube Music Sync', url: SITE.url },
                { '@type': 'ListItem', position: 4,  name: 'Live Voice Broadcast', url: SITE.url },
                { '@type': 'ListItem', position: 5,  name: 'Broadcast Stage — Live Mini-Podcast', url: SITE.url },
                { '@type': 'ListItem', position: 6,  name: 'TingleBot AutoMod — 24/7 AI Moderation', url: SITE.url },
                { '@type': 'ListItem', position: 7,  name: 'Auto Translation — 50+ Languages', url: SITE.url },
                { '@type': 'ListItem', position: 8,  name: 'Virtual Gifts & Coin Economy', url: SITE.url },
                { '@type': 'ListItem', position: 9,  name: 'Voice Messages with Waveform Player', url: SITE.url },
                { '@type': 'ListItem', position: 10, name: 'GIF & Sticker Sharing', url: SITE.url },
                { '@type': 'ListItem', position: 11, name: 'Emoji Reactions on Messages', url: SITE.url },
                { '@type': 'ListItem', position: 12, name: 'YouTube Video Sharing in Chat', url: SITE.url },
                { '@type': 'ListItem', position: 13, name: 'Multiple Radio Channels — Live Background Music', url: SITE.url },
                { '@type': 'ListItem', position: 14, name: 'Premium Profile Customization', url: SITE.url },
                { '@type': 'ListItem', position: 15, name: 'Guest Access — No Sign-up Required', url: SITE.url },
            ],
        })}</script>
    </Helmet>
);
